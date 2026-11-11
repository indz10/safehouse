// ZombieSafeHouse · zsh-pay (Fase 9a-2) — pagamento degli sponsor con Stripe
// SPENTO finché su Supabase (Edge Functions → Secrets) mancano STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET.
// 1) action "checkout" (dal pannello del negozio, utente collegato al negozio): crea la pagina di pagamento Stripe
//    per un pacchetto del listino (tabella sponsor_prezzi) e restituisce l'indirizzo. Solo sponsor già approvati da INDZ.
// 2) webhook di Stripe (header "stripe-signature"): quando il pagamento è confermato chiama sponsor_pagato
//    (pacchetto, scadenza, in evidenza, abbonamento). La firma di Stripe viene verificata.
// Impostazioni della funzione: "Verify JWT" SPENTO (Stripe non manda il token dell'utente: lo controlliamo qui).
import { createClient } from "npm:@supabase/supabase-js@2";

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const sb = createClient(URL_SB, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const SITO = Deno.env.get("SITO_URL") || "https://safehousezombie.netlify.app";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function hmacHex(key: string, msg: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// firma Stripe: "t=…,v1=…" ; HMAC-SHA256 di "t.corpo" con il segreto del webhook; massimo 5 minuti di differenza
async function firmaValida(corpo: string, header: string, segreto: string) {
  const p = Object.fromEntries(header.split(",").map((x) => x.split("=")).map(([k, ...v]) => [k, v.join("=")]));
  const v1 = header.split(",").filter((x) => x.startsWith("v1=")).map((x) => x.slice(3));
  if (!p.t || !v1.length || Math.abs(Date.now() / 1000 - Number(p.t)) > 300) return false;
  const atteso = await hmacHex(segreto, `${p.t}.${corpo}`);
  return v1.some((s) => s.length === atteso.length && s === atteso);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const KEY = Deno.env.get("STRIPE_SECRET_KEY"), WH = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const corpo = await req.text();

  // --- conferma di pagamento da Stripe ---
  const firma = req.headers.get("stripe-signature");
  if (firma) {
    if (!WH || !(await firmaValida(corpo, firma, WH))) return json({ ok: false, msg: "firma non valida" }, 400);
    const ev = JSON.parse(corpo);
    if (ev.type === "checkout.session.completed" && ev.data?.object?.payment_status === "paid") {
      const s = ev.data.object, m = s.metadata || {};
      const { data, error } = await sb.rpc("sponsor_pagato", { p_sponsor: m.sponsor_id, p_package: m.package, p_stripe_id: s.id, p_eur: (s.amount_total || 0) / 100 });
      if (error) return json({ ok: false, msg: error.message }, 500);
      return json(data);
    }
    return json({ ok: true, msg: "evento ignorato" });
  }

  // --- richiesta di pagamento dal pannello del negozio ---
  let body: Record<string, string> = {};
  try { body = JSON.parse(corpo || "{}"); } catch { /* vuoto */ }
  if (body.action !== "checkout") return json({ ok: false, msg: "azione sconosciuta" }, 400);
  if (!KEY) return json({ ok: false, msg: "Pagamenti online non ancora attivi: per ora scrivi a INDZ." });
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u } = await sb.auth.getUser(token);
  if (!u?.user) return json({ ok: false, msg: "Accedi con l'account del negozio" }, 401);
  const { data: link } = await sb.from("sponsor_users").select("sponsor_id").eq("user_id", u.user.id).eq("sponsor_id", body.sponsor_id).maybeSingle();
  if (!link) return json({ ok: false, msg: "Questo account non gestisce questo negozio" }, 403);
  const { data: sp } = await sb.from("sponsors").select("id,name,stato").eq("id", body.sponsor_id).maybeSingle();
  if (!sp || sp.stato !== "attivo") return json({ ok: false, msg: "Il negozio deve prima essere approvato da INDZ" });
  const { data: pr } = await sb.from("sponsor_prezzi").select("*").eq("package", body.package).eq("attivo", true).maybeSingle();
  if (!pr) return json({ ok: false, msg: "Pacchetto non disponibile" });

  const f = new URLSearchParams();
  f.set("mode", "payment");
  f.set("success_url", `${SITO}/negozio.html?pagato=1`);
  f.set("cancel_url", `${SITO}/negozio.html?annullato=1`);
  f.set("customer_email", u.user.email || "");
  f.set("line_items[0][quantity]", "1");
  f.set("line_items[0][price_data][currency]", "eur");
  f.set("line_items[0][price_data][unit_amount]", String(Math.round(Number(pr.prezzo_eur) * 100)));
  f.set("line_items[0][price_data][product_data][name]", `ZombieSafeHouse · ${pr.nome} · ${sp.name}`);
  f.set("metadata[sponsor_id]", sp.id);
  f.set("metadata[package]", pr.package);
  f.set("invoice_creation[enabled]", "true");
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST", headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/x-www-form-urlencoded" }, body: f,
  });
  const d = await r.json();
  if (!r.ok || !d.url) return json({ ok: false, msg: "Stripe: " + (d.error?.message || "errore") });
  return json({ ok: true, url: d.url });
});

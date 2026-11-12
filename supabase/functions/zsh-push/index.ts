// ZombieSafeHouse · zsh-push
// Invia le notifiche push: 30 minuti prima dell'orda, all'orda, e le novità personali.
// In più legge (e aggiorna ogni 90 minuti) il METEO VERO all'ora della prossima orda e la PENDENZA intorno a ogni casa del mondo
// (Open-Meteo) e li salva in world_wx e world_terrain: il server li usa per calcolare l'attacco degli zombie.
// Le chiavi VAPID vengono create alla prima chiamata e salvate in public.push_keys.
// Impostazioni della funzione: "Verify JWT" SPENTO (la chiama l'orologio del database).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function keys() {
  let { data } = await sb.from("push_keys").select("*").eq("id", 1).maybeSingle();
  if (!data) {
    const k = webpush.generateVAPIDKeys();
    const ins = await sb.from("push_keys").insert({ id: 1, public_key: k.publicKey, private_key: k.privateKey, cron_secret: crypto.randomUUID() }).select().single();
    data = ins.data;
  }
  return data;
}
function romeNow() {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const p: Record<string, string> = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, h: +p.hour, m: +p.minute };
}
// deno-lint-ignore no-explicit-any
async function sendTo(s: any, payload: Record<string, string>) {
  try {
    await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600 });
    return 1;
  } catch (e) {
    // deno-lint-ignore no-explicit-any
    const code = (e as any)?.statusCode;
    if (code === 404 || code === 410) await sb.from("push_subs").delete().eq("endpoint", s.endpoint);
    return 0;
  }
}
async function once(slot: string, kind: string) {
  const { error } = await sb.from("push_log").insert({ slot, kind });
  return !error;
}


// ---------- meteo e terreno veri per ogni casa ----------
function nextSlot() {
  const t = romeNow(); let H = 9, add = 0;
  if (t.h < 9) H = 9; else if (t.h < 21) H = 21; else { H = 9; add = 1; }
  const mins = (H - t.h) * 60 - t.m + add * 24 * 60;
  const ts = new Date(Date.now() + mins * 60000);
  const d = new Date(Date.parse(t.date + "T12:00:00Z") + add * 86400000);
  const id = `${d.toISOString().slice(0, 10)}-${String(H).padStart(2, "0")}`;
  return { id, ts, mins, H };
}
function moonFull(ts: Date) {
  const age = (((ts.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000) % 29.530588853 + 29.530588853) % 29.530588853;
  return Math.abs(age - 14.77) < 1.5;
}
function evOf(c: number, pr: number, vis: number | null, g: number, night: boolean, full: boolean) {
  if (c >= 95 || g >= 60) return "blackout";
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return "neve";
  if (c === 45 || c === 48 || (vis != null && vis < 1000)) return "nebbia";
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || pr >= 0.2) return "pioggia";
  if (full && night) return "luna";
  return "calma";
}
async function myBuildings() {
  const a = await sb.from("world_homes").select("building_id,lat,lon");
  const b = await sb.from("world_buildings").select("building_id,lat,lon").not("owner", "is", null);
  const m = new Map<string, { bid: string; lat: number; lon: number }>();
  for (const r of [...(a.data || []), ...(b.data || [])]) if (r.building_id && r.lat != null) m.set(r.building_id, { bid: r.building_id, lat: r.lat, lon: r.lon });
  return [...m.values()];
}
async function wxTask(force = false) {
  const s = nextSlot(); if (!force && s.mins > 13 * 60) return { wx: 0 };
  const all = await myBuildings();
  // meteo già letto per questa orda e ancora fresco (meno di 90 minuti): non lo rileggo
  const fresh = new Date(Date.now() - 90 * 60000).toISOString();
  const have = await sb.from("world_wx").select("building_id").eq("slot_id", s.id).gt("updated_at", fresh);
  const got = new Set((have.data || []).map((r: { building_id: string }) => r.building_id));
  const miss = all.filter((b) => !got.has(b.bid)); if (!miss.length) return { wx: 0 };
  const cells = new Map<string, typeof miss>();
  for (const b of miss) { const k = b.lat.toFixed(1) + "," + b.lon.toFixed(1); if (!cells.has(k)) cells.set(k, []); cells.get(k)!.push(b); }
  const keys = [...cells.keys()].slice(0, 400); const rows: Record<string, unknown>[] = [];
  const hourIso = new Date(Math.round(s.ts.getTime() / 3600000) * 3600000).toISOString().slice(0, 13) + ":00";
  const full = moonFull(s.ts), night = s.H >= 18;
  for (let i = 0; i < keys.length; i += 40) {
    const part = keys.slice(i, i + 40); const la = part.map((k) => k.split(",")[0]).join(","), lo = part.map((k) => k.split(",")[1]).join(",");
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&hourly=weather_code,precipitation,visibility,wind_gusts_10m,temperature_2m&timezone=GMT&forecast_days=3`);
      let d = await r.json(); if (!Array.isArray(d)) d = [d];
      part.forEach((k, j) => {
        const x = d[j]; if (!x || !x.hourly) return; const ix = x.hourly.time.indexOf(hourIso); if (ix < 0) return;
        const ev = evOf(x.hourly.weather_code[ix], x.hourly.precipitation[ix] || 0, x.hourly.visibility ? x.hourly.visibility[ix] : null, x.hourly.wind_gusts_10m ? x.hourly.wind_gusts_10m[ix] : 0, night, full);
        for (const b of cells.get(k)!) rows.push({ building_id: b.bid, slot_id: s.id, ev, code: x.hourly.weather_code[ix], temp: x.hourly.temperature_2m[ix], updated_at: new Date().toISOString() });
      });
    } catch { /* riprova al giro dopo */ }
  }
  if (rows.length) await sb.from("world_wx").upsert(rows);
  return { wx: rows.length, slot: s.id };
}
async function terrainTask() {
  const all = await myBuildings();
  const have = await sb.from("world_terrain").select("building_id");
  const got = new Set((have.data || []).map((r: { building_id: string }) => r.building_id));
  const miss = all.filter((b) => !got.has(b.bid)).slice(0, 40); if (!miss.length) return { terrain: 0 };
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < miss.length; i += 20) {
    const part = miss.slice(i, i + 20); const pts: number[][] = [];
    for (const b of part) { const k = 111320 * Math.cos(b.lat * Math.PI / 180); const dl = 400 / 110540, dn = 400 / k;
      pts.push([b.lat, b.lon], [b.lat + dl, b.lon], [b.lat, b.lon + dn], [b.lat - dl, b.lon], [b.lat, b.lon - dn]); }
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${pts.map((p) => p[0].toFixed(5)).join(",")}&longitude=${pts.map((p) => p[1].toFixed(5)).join(",")}`);
      const d = await r.json(); const e: number[] = d.elevation || [];
      part.forEach((b, j) => { const v = e.slice(j * 5, j * 5 + 5); if (v.length < 5) return; const ring = (v[1] + v[2] + v[3] + v[4]) / 4;
        rows.push({ building_id: b.bid, elev: v[0], slope: Math.max(-0.12, Math.min(0.12, (v[0] - ring) / 400)), updated_at: new Date().toISOString() }); });
    } catch { /* riprova al giro dopo */ }
  }
  if (rows.length) await sb.from("world_terrain").upsert(rows);
  return { terrain: rows.length };
}

// NOVITÀ PERSONALI (migrazione 011): ogni novità con il suo titolo e la sua pagina; al massimo 3 notifiche
// per giro (la terza dice quante altre ce ne sono). La chiama il giro dei 10 minuti e, subito, il database
// (task "feed") quando arriva una novità per qualcuno con le notifiche attive.
const SHOUTS = ["", "👋 Ciao vicino!", "🛡️ Ti copro io stanotte", "🙏 Grazie dei rinforzi!", "🧟 Attento, arriva l’orda!", "🤝 Facciamo squadra?", "💪 Bella difesa!", "😈 Ci vediamo all’orda…", "🎁 Grazie del regalo!", "🏠 Bella casa!", "🆘 Mi serve aiuto!", "🔥 Che assalto!", "🌙 Buona guardia stanotte"];
// deno-lint-ignore no-explicit-any
function feedMsg(f: any, who: string, id: string): { title: string; body: string; url: string } {
  const so = "/?go=social", al = "/?go=social&tab=squadra";
  switch (f.kind) {
    case "dm": return { title: `💬 Messaggio da ${who}`, body: f.info ? `«${f.info}»` : "Ti ha scritto un messaggio", url: `/?go=social&dm=${id}` };
    case "ally_req": return { title: "🤝 Proposta di alleanza", body: `${who} ti propone un’alleanza: tocca per accettare`, url: al };
    case "ally": return { title: "🤝 Nuovo alleato", body: `${who} è ora tuo alleato`, url: al };
    case "house_req": return { title: "🏠 Richiesta di coinquilino", body: `${who} dice che vivete nella stessa casa: tocca per confermare`, url: so };
    case "house_ok": return { title: "🏠 Ora abitate insieme", body: `${who} ha confermato: siete coinquilini`, url: so };
    case "invite_join": return { title: "🎉 Il tuo invito ha funzionato", body: `${who} è entrato con il tuo link: ora siete alleati`, url: al };
    case "help": return { title: "🛡️ Rinforzi in arrivo", body: `${who} ti ha mandato rinforzi per l’orda`, url: "/?go=orda" };
    case "attack": return { title: "🧟 Ti hanno mandato un’orda!", body: `${who} ti ha mandato un’orda contro: prepara le case`, url: "/?go=orda" };
    case "curse": return { title: "😈 Dispetto!", body: `${who} ti ha fatto un dispetto: chiedi aiuto agli alleati`, url: "/?go=orda" };
    case "shield": return { title: "🛡️ Scudo ricevuto", body: `${who} ti ha dato uno scudo: +5 alla prossima orda`, url: "/?go=orda" };
    case "gift": return { title: "🎁 Regalo", body: `${who} ti ha ${f.info === "prestito" ? "prestato dei Mattoni" : "fatto un regalo"}`, url: so };
    case "ask_ally": return { title: "🆘 Un alleato chiede aiuto", body: `${who} chiede il tuo aiuto per la prossima orda`, url: so };
    case "shout": return { title: `📣 ${who}`, body: SHOUTS[+f.info] || "ti ha salutato", url: so };
    default: return { title: "🔔 ZombieSafeHouse", body: `${who} ti cerca`, url: so };
  }
}
// deno-lint-ignore no-explicit-any
async function feedFor(L: any[]): Promise<number> {
  let sent = 0;
  for (const s of L) {
    if (!s.user_id) continue;
    const { data: f } = await sb.from("world_feed").select("id,kind,actor,created_at,info").eq("target", s.user_id).gt("created_at", s.last_feed).order("created_at", { ascending: false }).limit(10);
    if (!f || !f.length) continue;
    // segna subito come avvisate, così il giro dei 10 minuti e la chiamata del database non mandano due volte
    await sb.from("push_subs").update({ last_feed: f[0].created_at }).eq("endpoint", s.endpoint);
    const show = f.slice(0, 3);
    for (let i = 0; i < show.length; i++) {
      const x = show[i];
      const { data: p } = await sb.from("profili_pubblici").select("nick").eq("user_id", x.actor).maybeSingle();
      const m = feedMsg(x, p?.nick ? "@" + p.nick : "Un superstite", x.actor || "");
      const more = i === show.length - 1 && f.length > show.length ? ` (+${f.length - show.length} novità)` : "";
      sent += await sendTo(s, { title: m.title, body: m.body + more, url: m.url, tag: "zsh-" + x.kind + "-" + x.id });
    }
  }
  return sent;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  // deno-lint-ignore no-explicit-any
  let body: any = {};
  try { body = await req.json(); } catch { /* vuoto */ }
  const K = await keys();
  if (!K) return json({ ok: false, msg: "chiavi non disponibili: esegui push.sql" }, 500);
  webpush.setVapidDetails("mailto:raschi.ale@gmail.com", K.public_key, K.private_key);

  if (body.task === "key") return json({ publicKey: K.public_key });
  if (body.task === "wx") { if (body.secret !== K.cron_secret) return json({ ok: false }, 401); return json({ ...(await wxTask(true)), ...(await terrainTask()) }); }

  if (body.task === "test") {
    const { data: s } = await sb.from("push_subs").select("*").eq("endpoint", body.endpoint).maybeSingle();
    if (!s) return json({ ok: false, msg: "telefono non iscritto" });
    const ok = await sendTo(s, { title: "✅ Notifiche attive", body: "Ti avviseremo 30 minuti prima di ogni orda e quando ti cercano.", url: "/?go=orda" });
    return json({ ok: !!ok });
  }

  if (body.task === "feed") {
    if (body.secret !== K.cron_secret) return json({ ok: false }, 401);
    const { data: subs } = await sb.from("push_subs").select("*").eq("user_id", body.user);
    return json({ ok: true, sent: await feedFor(subs || []) });
  }

  if (body.task === "tick") {
    if (body.secret !== K.cron_secret) return json({ ok: false }, 401);
    let geo: Record<string, unknown> = {};
    try { geo = { ...(await wxTask()), ...(await terrainTask()) }; } catch { /* non blocca le notifiche */ }
    const t = romeNow();
    const { data: subs } = await sb.from("push_subs").select("*");
    const L = subs || [];
    let sent = 0;
    for (const H of [9, 21]) {
      const hh = String(H).padStart(2, "0");
      const slot = `${t.date}-${hh}`;
      if (t.h === H - 1 && t.m >= 30 && await once(slot, "prep")) {
        for (const s of L) sent += await sendTo(s, { title: "🧟 Tra 30 minuti arriva l’orda!", body: "Prepara le case (+15 di difesa) e chiedi aiuto agli alleati.", url: "/?go=orda" });
      }
      if (t.h === H && t.m < 30 && await once(slot, "raid")) {
        for (const s of L) sent += await sendTo(s, { title: `🧟 L’orda delle ${hh}:00 sta attaccando!`, body: "Guarda l’assalto sulle tue case e riscatta i premi.", url: "/?assalto=last" });
      }
    }
    // novità personali: messaggi, alleanze, rinforzi, orde ricevute, regali, saluti, inviti (feedFor)
    sent += await feedFor(L);
    // messaggi della piazza (migrazione 007): al massimo un avviso ogni 30 minuti, con l'ultimo messaggio e quanti altri
    for (const s of L) {
      const mode = s.piazza || "zona";
      if (mode === "no" || !s.user_id) continue;
      const da = s.last_chat ? new Date(s.last_chat).getTime() : 0;
      if (Date.now() - da < 30 * 60 * 1000) continue;
      const { data: c, error: ce } = await sb.rpc("w_piazza_nuovi", { p_user: s.user_id, p_since: s.last_chat || new Date(Date.now() - 30 * 60 * 1000).toISOString(), p_mode: mode });
      if (ce || !c || !c.n) continue;
      const who = c.nick ? "@" + c.nick : "Un superstite";
      sent += await sendTo(s, { title: c.zona ? "💬 Piazza della tua zona" : "💬 Piazza del Mondo", body: `${who}: «${c.body}»` + (c.n > 1 ? ` (+${c.n - 1} messaggi)` : ""), url: "/?go=social&tab=piazza", tag: "piazza" });
      await sb.from("push_subs").update({ last_chat: new Date().toISOString() }).eq("endpoint", s.endpoint);
    }
    return json({ ok: true, sent, rome: t, iscritti: L.length, ...geo });
  }
  return json({ ok: false, msg: "task sconosciuto" }, 400);
});

// ZombieSafeHouse · funzione "zsh-api" (Supabase Edge Function)
// 1) action "vision": analisi delle foto con Claude (chiave ANTHROPIC_API_KEY)
// 2) action "chat":   Radio Operatore con Claude
// 3) action "place":  stato dell'attività su Google (aperta / chiusa definitivamente)
//                     (chiave GOOGLE_PLACES_KEY, facoltativa)
// Le chiavi restano qui sul server: nell'app non compaiono mai.
// Solo utenti registrati, massimo 40 richieste al giorno a testa.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "content-type": "application/json" } });
const uses = new Map<string, { d: string; n: number }>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: "Accedi per usare questa funzione" }, 401);
    const day = new Date().toISOString().slice(0, 10);
    const u = uses.get(user.id);
    const n = u && u.d === day ? u.n + 1 : 1;
    if (n > 40) return json({ error: "Limite giornaliero raggiunto" }, 429);
    uses.set(user.id, { d: day, n });

    const body = await req.json();
    if (body.action === "vision" || body.action === "chat") {
      const key = Deno.env.get("ANTHROPIC_API_KEY");
      if (!key) return json({ error: "Manca ANTHROPIC_API_KEY" }, 500);
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-5-5",
          max_tokens: 1000,
          system: String(body.system ?? "").slice(0, 6000),
          messages: body.messages,
        }),
      });
      return new Response(await r.text(), { status: r.status, headers: { ...CORS, "content-type": "application/json" } });
    }
    if (body.action === "place") {
      const key = Deno.env.get("GOOGLE_PLACES_KEY");
      if (!key) return json({ error: "Manca GOOGLE_PLACES_KEY" }, 500);
      const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "places.displayName,places.businessStatus,places.rating,places.userRatingCount,places.googleMapsUri,places.currentOpeningHours.openNow",
        },
        body: JSON.stringify({
          textQuery: String(body.name ?? "").slice(0, 120),
          languageCode: "it",
          maxResultCount: 1,
          locationBias: { circle: { center: { latitude: body.lat, longitude: body.lon }, radius: 300 } },
        }),
      });
      const d = await r.json();
      const p = d.places && d.places[0];
      if (!p) return json({ found: false });
      return json({
        found: true,
        name: p.displayName?.text,
        status: p.businessStatus,
        rating: p.rating,
        reviews: p.userRatingCount,
        url: p.googleMapsUri,
        openNow: p.currentOpeningHours?.openNow,
      });
    }
    return json({ error: "Azione sconosciuta" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

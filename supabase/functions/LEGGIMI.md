# Funzioni Edge (Supabase)

Due funzioni, una per cartella (`<nome>/index.ts`). Girano sul server di Supabase, non nell'app: le chiavi segrete stanno solo lì.

| funzione | cosa fa | chi la chiama | segreti necessari | "Verify JWT" |
|---|---|---|---|---|
| `zsh-push` | notifiche push (30 min prima dell'orda, all'orda, novità personali); ogni 90 min salva meteo vero e pendenza delle case (`world_wx`, `world_terrain`) usati nell'attacco | l'orologio del database ogni 10 min (`zsh-push-tick`, push_cron.sql); l'app per la chiave pubblica e la notifica di prova | nessuno da aggiungere (usa `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, già presenti); le chiavi VAPID le crea da sola in `push_keys` | **spento** |
| `zsh-api` | IA delle foto della casa e Radio Operatore (Claude), stato delle attività su Google | l'app (`functions.invoke('zsh-api')`), solo utenti registrati, max 40 richieste al giorno a testa | `ANTHROPIC_API_KEY`; facoltativo `GOOGLE_PLACES_KEY` | acceso |

Se una funzione manca l'app non si rompe: senza `zsh-api` le foto e la Radio usano le risposte di riserva; senza `zsh-push` niente notifiche e niente meteo vero (attacco con "calma").

## Pubblicare o aggiornare una funzione (dal sito di Supabase, niente programmi da installare)
1. supabase.com → progetto → a sinistra **Edge Functions**.
2. Se la funzione c'è già: aprila → scheda **Code** → seleziona tutto e incolla il nuovo `index.ts` → **Deploy**.
   Se non c'è: **Deploy a new function** → **Via Editor** → nome esatto (`zsh-push` o `zsh-api`) → incolla `index.ts` → **Deploy function**.
3. Nella funzione → **Details** (o Settings) → **Verify JWT with legacy secret**: spento per `zsh-push`, acceso per `zsh-api` → **Save**.
4. Segreti: **Edge Functions → Secrets** → **Add new secret** → nome (es. `ANTHROPIC_API_KEY`) e valore. Il valore si incolla solo lì: **mai in chat**.

## Controllare che funzionino
- Notifiche: SQL Editor → foglio nuovo → incolla `supabase/controllo/002_notifiche.sql` → Run (solo lettura): "chiamate dell'orologio" > 0 e "di cui fallite" 0; risposte `200`.
- Nell'app: menu ☰ → **Notifiche delle orde** → attiva → arriva la notifica di prova. Menu ☰ → **Radio Operatore** → una domanda → risposta di Claude.

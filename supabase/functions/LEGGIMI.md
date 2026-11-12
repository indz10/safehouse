# Funzioni Edge (Supabase)

Due funzioni, una per cartella (`<nome>/index.ts`). Girano sul server di Supabase, non nell'app: le chiavi segrete stanno solo lì.

| funzione | cosa fa | chi la chiama | segreti necessari | "Verify JWT" |
|---|---|---|---|---|
| `zsh-push` | notifiche push (30 min prima dell'orda, all'orda, novità personali **subito** — messaggi privati, alleanze, coinquilini, rinforzi, orde, regali, inviti, ognuna col suo titolo, massimo 3 per volta: serve la migrazione 011 —, messaggi della piazza al massimo ogni 30 min — serve la migrazione 007); ogni 90 min salva meteo vero e pendenza delle case (`world_wx`, `world_terrain`) usati nell'attacco | l'orologio del database ogni 10 min (`zsh-push-tick`, push_cron.sql); il database appena arriva una novità (task `feed`, migrazione 011); l'app per la chiave pubblica e la notifica di prova | nessuno da aggiungere (usa `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`, già presenti); le chiavi VAPID le crea da sola in `push_keys` | **spento** |
| `zsh-api` | IA delle foto della casa e Radio Operatore (Claude), stato delle attività su Google | l'app (`functions.invoke('zsh-api')`), solo utenti registrati, max 40 richieste al giorno a testa | `ANTHROPIC_API_KEY`; facoltativo `GOOGLE_PLACES_KEY` | acceso |

| `zsh-pay` | pagamento degli sponsor con Stripe (pannello del negozio → pagina di pagamento; conferma di Stripe → pacchetto, scadenza, in evidenza) — **pronta ma spenta** | pannello del negozio; Stripe (webhook) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; facoltativo `SITO_URL` | **spento** |

Se una funzione manca l'app non si rompe: senza `zsh-api` le foto e la Radio usano le risposte di riserva; senza `zsh-push` niente notifiche e niente meteo vero (attacco con "calma").

## Pubblicare o aggiornare una funzione (dal sito di Supabase, niente programmi da installare)
1. supabase.com → progetto → a sinistra **Edge Functions**.
2. Se la funzione c'è già: aprila → scheda **Code** → seleziona tutto e incolla il nuovo `index.ts` → **Deploy**.
   Se non c'è: **Deploy a new function** → **Via Editor** → nome esatto (`zsh-push` o `zsh-api`) → incolla `index.ts` → **Deploy function**.
3. Nella funzione → **Details** (o Settings) → **Verify JWT with legacy secret**: spento per `zsh-push`, acceso per `zsh-api` → **Save**.
4. Dopo il Deploy: **Logs** della funzione → non deve comparire `BOOT_ERROR`. Le librerie hanno la **versione fissa** (`supabase-js@2.45.4`, `web-push@3.6.7`): il 12/11 con `supabase-js@2` il Deploy ha preso una versione nuova e la funzione non partiva più (BOOT_ERROR, niente notifiche). Controllo: `supabase/controllo/003_notifiche_messaggi.sql`.
5. Segreti: **Edge Functions → Secrets** → **Add new secret** → nome (es. `ANTHROPIC_API_KEY`) e valore. Il valore si incolla solo lì: **mai in chat**.

## Accendere i pagamenti (quando ci sono partita IVA e account Stripe)
1. stripe.com → crea l'account con partita IVA e IBAN; resta in **modalità test** per le prove.
2. Supabase → Edge Functions → **Deploy a new function** → nome `zsh-pay` → incolla `supabase/functions/zsh-pay/index.ts` → Deploy; "Verify JWT" **spento**.
3. Stripe → Sviluppatori → Webhook → **Aggiungi endpoint**: `https://wmweptdpfworispqjhto.supabase.co/functions/v1/zsh-pay`, evento `checkout.session.completed` → copia il **segreto di firma** (whsec_…).
4. Supabase → Edge Functions → **Secrets**: `STRIPE_SECRET_KEY` (sk_test_… per le prove, poi sk_live_…) e `STRIPE_WEBHOOK_SECRET` (whsec_…). I valori si incollano solo lì, mai in chat.
5. Prova con la carta di test 4242 4242 4242 4242: nel pannello del negozio il pacchetto si attiva e in admin compare "pagato fino al…".
Prezzi: tabella `sponsor_prezzi` (SQL Editor: `update public.sponsor_prezzi set prezzo_eur = 350 where package = 'vetrina';`).

## Controllare che funzionino
- Notifiche: SQL Editor → foglio nuovo → incolla `supabase/controllo/002_notifiche.sql` → Run (solo lettura): "chiamate dell'orologio" > 0 e "di cui fallite" 0; risposte `200`.
- Nell'app: menu ☰ → **Notifiche delle orde** → attiva → arriva la notifica di prova. Menu ☰ → **Radio Operatore** → una domanda → risposta di Claude.

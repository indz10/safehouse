# Formule del gioco (una sola versione: server = app)

Il **server decide** (funzioni SQL in `supabase/schema.sql`); l'app **mostra** gli stessi numeri e li ricalcola solo nel simulatore (cosa succede se aggiungo una fortificazione) con le stesse formule.
Prova automatica: `node docs/strumenti/prova_formule.js <cartella>` dopo `docs/strumenti/db_locale.sh <cartella>` → deve dire **FORMULE UGUALI**.
Se cambi una formula: cambiala nell'SQL (nuova migrazione) **e** in `thrCalc` (p47_zombie.js), poi rilancia la prova.

## Livello del giocatore
`wl = 1 + floor(√(Mattoni guadagnati in tutto / 100))`, massimo 30 nei conti dell'orda — SQL `w_level`, `w_lvl_of`.

## Attacco dell'orda su una casa (ogni orda: 9:00 e 21:00)
SQL `w_attack3(orda, casa, wl)` — app `thrCalc` (p47).
- **Vaganti**: `(30 + 2·wl + r) × m(vagante) × (1 − 0,06·trappole)`, con `r` da 0 a 49 (diverso per ogni orda e casa) → intervallo mostrato da `30+2·wl` a `30+2·wl+49`.
- **Zombie speciali** (compaiono da un livello minimo, `w_ztypes`): `base × (1 + 0,03·wl) × m(tipo) × (1 − 0,3·fortificazione 1) × (1 − 0,15·fortificazione 2)` (livelli delle fortificazioni fino a 3).

| zombie | da liv. | base | ferma (−30%/liv.) | aiuta (−15%/liv.) |
|---|---|---|---|---|
| corridore | 2 | 4 | fossato | trappole |
| col casco | 3 | 4 | barricate | grate |
| strillone | 3 | 3 | sirena | cani |
| scavatore | 4 | 5 | fondamenta | pompa |
| bruto | 5 | 6 | barricate | recinto |
| ombra | 6 | 5 | fari | cani |
| capo | 8 | 9 | barricate | recinto |

- **m(tipo)** (`w_zm`, tra 0,3 e 1,8) = pendenza × meteo × ora:
  - pendenza `s` (−0,12…+0,12, casa in alto = positiva): corridore `1−4s`, bruto `1−3s`, capo `1−2s`, vagante/casco/ombra `1−s`, altri 1;
  - meteo vero all'ora dell'orda: pioggia (corridore 0,7 · vagante 0,9 · scavatore 1,3 · ombra 1,1), neve (corridore 0,5 · vagante 0,8 · scavatore 0,6 · bruto 0,8), nebbia (ombra 1,6 · corridore 0,9), blackout (ombra 1,6 · altri 1,05), luna piena (tutti 1,15);
  - ombra: ×1,2 alle 21, ×0,6 alle 9.

## Difesa di una casa
SQL `w_power3(livello, bonus, casa vera)` + `w_upower` + `w_condo_bonus` — app `thrCalc` (campo `def` dal server).
`difesa = 45 + 12·livello casa + (casa vera: 5 + difese del condominio) + presidi vicini + edificio + bonus`
- **edificio** (migrazione 014, `w_casa_extra`, campo `extra` di `w_threats_of`, già dentro `def`): per l'orda in cui arrivano, `min(18, assi) + min(24, difese degli alleati) − min(40, assalti)` su quella casa o presidio.
- **presidi vicini** (Fase 9b, `w_pres_bonus`): +3 per ogni presidio tenuto entro 500 m dalla casa (di chiunque sia), **+5 se tenuto da almeno 7 giorni** (migrazione 014), massimo +10; conta se era tenuto all'ora dell'orda (storia in `world_presidi_tenute`). Sta in `w_threats_of` (campo `pres`, già dentro `def`), `world_raid_status`, `world_raid_view`, `w_home_held`, `world_my_defense`.
- **difese del condominio** (solo casa vera): `3 × somma dei livelli` delle difese comuni (`w_condo_bonus`), **solo se hai versato nel condominio negli ultimi 30 giorni** (migrazione 013), altrimenti 0; **doppio (6 ×) per l'amministratore** (`w_condo_admin`: chi ha versato di più negli ultimi 30 giorni, migrazione 016), che riceve anche il 10% in 🧱 di ogni versamento degli altri;
- **bonus** (`w_upower`, per l'orda): case preparate +15 · Scudo della casa vera +2 per livello (max 5) · rinforzi col loro valore (max +24: mezzo a piedi +4 · bici +5 · moto +6 · auto +8 · fuoristrada +10, +1 per dotazione della valutazione: kit medico, radio, scorte) · scudi degli alleati +5 (max +10) · difesa di squadra +5 (almeno 3 alleati pronti) · coinquilini pronti +3 ciascuno (max +9) · **meno** malus dei rivali (orde mandate col loro valore, max −30; nebbia −5 max −10; sabotaggio −15 se avevi preparato; malus totale max −35).

## Risultato e % di tenere
- La casa **tiene** se `difesa ≥ attacco` (`world_raid_status`, `world_raid_view`, `w_home_held`: tutte con la stessa difesa dalla Fase 6c).
- **% mostrata** = `(difesa − attacco min + 1) / (attacco max − attacco min + 1)`, tra 0 e 100 (`w_threats_of` → `world_threats`; app `thrCalc`, `frChanceOf`). La usano fronte, pagina della casa, "Perché", Le mie case.
- Premi dell'orda: casa che tiene `8 + 4·livello` 🧱, sfondata 2 🧱; taglia 25 🧱 per ogni rivale a cui hai mandato un'orda e che non ha tenuto (`world_raid_status`).

## Mezzi, distanza e assalti dei rivali (migrazione 009)
SQL `w_mezzo`, `w_dist_km`, `w_atk_pts`, `world_send_help`, `world_send_attack` — app p71 (`mzRigaHTML`, Bottega).
- **Mezzo** = il migliore tra quello della valutazione (al massimo l'auto) e quello comprato (moto 300, auto 600, fuoristrada 1.200 Mattoni).
- **Portata**: a piedi 2 km, bici 5, moto 12, auto e fuoristrada 20. Aiuti e orde solo verso chi ha una casa entro la portata (distanza tra le case più vicine); orde mai oltre 20 km. I dispetti non hanno limite.
- **Viaggio**: minuti = distanza / velocità (5, 15, 40, 50, 45 km/h); vale per l'orda che arriva dopo l'arrivo.
- **Forza di un'orda di un rivale** = `max(3, (6 + 0,5·livello di chi attacca) × mezzo × (1 − min(0,6; 0,1·(barricate+recinto+fossato della casa attaccata))))`, mezzo ×0,8 / 0,9 / 1 / 1,2 / 1,3.

## Territorio: presenza, assalti, conquiste, carburante (migrazione 014)
SQL `w_custodita`, `world_presenza`, `w_azione`, `world_assalta`, `world_difendi`, `world_assi`, `world_saccheggia`, `w_assalti_tick`, `w_pres_tick` — app p78 (`trrSection`, `trrPresenza`).
- **Presenza**: la casa vera è intoccabile se `presente_at` (GPS entro 200 m + precisione fino a 100 m) è negli ultimi 7 giorni, o se la casa è in conferma. La prima presenza del giorno dà ⛽ 10.
- **Assalto** (case comprate, presidi tenuti, casa vera incustodita): costa 🥫 10 + carburante, max 3 al giorno; non agli alleati, ai nuovi arrivati (15 giorni di scudo), a chi ha più di 3 livelli meno di te. Forza `max(3, (6 + 0,5·livello) × mezzo × (1 − min(0,6; 0,1·(barricate+recinto+fossato dell'edificio))))` (presidi: senza fortificazioni). Gli assalti di più giocatori si sommano (max −40).
- **Difesa di un alleato** su un edificio: rinforzi del mezzo (+4…+10, +1 per dotazione), solo carburante (max +24); 🧱 10 (max 5 al giorno, insieme ai rinforzi). **Assi**: 🪵 20 = +6, max +18 per orda, dal padrone e dagli alleati.
- **Risultato** (dopo l'orda, `w_assalti_tick`): casa comprata che cade con almeno un assalto → passa a chi ha assaltato di più (se ha posto per una casa, `w_max`; altrimenti 🧱 40 + 🪵 20 di bottino); il vecchio padrone riceve metà di prezzo + migliorie pagate; chi ha assaltato insieme 🧱 20. Casa vera incustodita che cade → saccheggio: il primo prende il 25% di 🪵🥫⛽ (max 60 ciascuna) e il 10% dei 🧱 (max 50) della vittima. Presidio che cade con un assalto → a chi ha assaltato di più (se ne tiene meno di 3), altrimenti libero.
- **Carburante** di un viaggio: `ceil(km × 1 / 1,5 / 2)` per moto / auto / fuoristrada; a piedi e in bici 0. Senza carburante si va a piedi (in bici se è il mezzo della valutazione). Vale per rinforzi, orde, assalti, difese.
- **Affitto** di una casa comprata al giorno: `5 + 5·livello + prezzo della zona / 100` (`w_price`: 200–2.000, più alto dove ci sono più case comprate).

## Presidi entro 5 km (migrazione 016)
- Si scoprono (`world_presidi_seed`) e si occupano (`world_presidio_occupa`) se hai una casa entro **5 km**; per occupare si viaggia col proprio mezzo (portata e carburante come per gli assalti, `w_mz_eff`).

## Orda sui presidi (Fase 9b)
SQL `w_pres_attack`, `w_pres_def`, `w_pres_tick` — app p69 (`presChance`).
- Attacco: `50 + r`, con `r` da 0 a 49 (diverso per ogni orda e presidio).
- Difesa: `55 + 8 × mura + 12 × guardie` (massimo 5 guardie: chi lo tiene, alleati, coinquilini; valgono per una sola orda) + assi + difese − assalti (migrazione 014). **Fortificazioni fisse** (migrazione 017, `world_pres_defs`, `world_pres_fortifica`): 🧱 mura +8 per livello e 🗼 torretta −20% alla forza degli assalti dei rivali per livello (`w_fort('pres:…')` = 2 × torretta), livelli 0–3, costo 🧱 100 × livello; restano col presidio, −1 livello ciascuna quando cade.
- Tiene se `difesa ≥ attacco`; altrimenti torna libero. % mostrata = `(difesa − 50 + 1) / 50`, tra 0 e 100.

## Punteggio Superstite (classifica)
SQL `w_score` (ultimi 7 o 30 giorni) — l'app mostra i valori del server.
Difesa (case tenute, max 300) + Fortezza (fortificazioni e livelli, max 200) + Casa vera (indice, max 150) + Squadra (aiuti dati e alleati, max 150) + Costanza (giorni attivi, max 100) + Crescita (Mattoni guadagnati giocando, max 100).

## Risorse e ricompense (migrazione 012)
Risorse 🪵 Legno, 🥫 Cibo, ⛽ Carburante accanto ai 🧱 Mattoni; le dà solo il server (`w_res`), max **400 al giorno** per risorsa.
- Orda, casa che tiene: 🧱 **10 + 6 × livello** della casa, più 🪵 4 e 🥫 6; casa sfondata 🧱 3 (`world_raid_status`).
- Orda mandata a un rivale la cui casa cade: 🧱 **35** e ⛽ 10.
- Rinforzi a un alleato: 🧱 **10** e 🥫 5 (max 5 al giorno).
- Presidio tenuto a ogni orda (`w_pres_rendita`, raddoppiato nella migrazione 016): **40 + 4 × orde di fila (max +40)** della sua risorsa — parco/sport 🪵, piazza/centro/chiesa 🥫, stazione/polizia/pompieri ⛽; municipio/scuola/biblioteca/ospedale 🧱 **30 + 2 × orde di fila (max +30)**.
- Accesso del giorno: 🧱 20 + 🪵 10 🥫 10 ⛽ 5. Casa vera valutata: 🧱 200 + 🪵 50 🥫 50 ⛽ 30.
- 🔄 Mercato (`world_trade`): 20 di una risorsa = 🧱 10, max 🧱 100 al giorno.

## Il superstite che cresce (migrazione 020)
Solo nel server (`w_sped_calc` e dintorni); l'app (`supCalc` in p82) copia la formula solo per mostrare i numeri prima di partire.
- **Grado** = 1 + ⌊√(XP / 50)⌋ (max 50); XP del grado g = 50 × (g − 1)². **XP**: ogni accredito di Mattoni ⌊🧱 / 4⌋ (min 1, in `w_pay`); spedizione 10 + 6 × km (metà se va male); serie 10 × giorno; prima condivisione del giorno 20; amico entrato col link 50 (+ ⚡ 2 + 🪵 10 🥫 10 ⛽ 5), amico che valuta la casa 150 (+ 🪵 20 🥫 20 ⛽ 10).
- **Abilità**: punti = grado − 1, max 5 ciascuna. Esploratore +1 km e +10% bottino; Resistenza +1 ⚡ massima e −10 min di ricarica; Combattente −4% rischio; Cercatore +3% tesoro; Mercante +1 🧱 ogni 10 🧱 del Mercato.
- **Energia**: massima 10 + Resistenza, +1 ogni 120 − 10 × Resistenza minuti; con i premi al massimo massima + 5.
- **Raggio** = min(30, 3 + (grado − 1) + Esploratore) km dalla tua casa più vicina (casa vera o comprata; migrazione 021, prima 1,5 + 0,5 per grado). **⭐ Sponsor** (attività sponsor attiva entro 60 m): 🪵 e 🥫 metà del bottino, ⛽ un terzo, ⭐ +5; conta come visita (`sponsor_events` 'spedizione').
- **Spedizione** (km dal tuo posto più vicino, minimo 0,2): durata min(180, 10 + 14 × km) min; energia min(3, 1 + ⌊km / 2,5⌋); rischio % = tra 3 e 60 di 10 + 4 × km − 4 × Combattente − 5 × Arma (+10 di notte, 20–7, senza Torcia); bottino = min(25 + 15 × Zaino, (10 + 6 × km) × (1 + 0,1 × Esploratore)); tesoro % = 5 + 3 × Cercatore + 2 × Torcia (🧱 min(60, 15 + 5 × grado), max 5 al giorno). Cibo → 🥫 bottino; legno → 🪵 bottino; carburante → ⛽ 60%; farmacia → ⚡ 2 + 🥫 metà; altro → un terzo di ciascuna. Se va male (random < rischio): metà bottino e XP, farmacia ⚡ 1. Contemporanee 1 + Radio; stesso posto dopo 12 ore. Le risorse passano da `w_res` (max 400 al giorno).
- **Attrezzi** (livelli 1–3): livello n costa 🪵 30 × n + 🧱 50 × n.
- **Serie**: giorno g = ((giorni di fila − 1) mod 7) + 1 → 🪵 5g 🥫 5g ⛽ 3g, ⭐ 10g, ⚡ 1 (il 7° ⚡ 3 e 🧱 50).

## Caccia nella Lente (migrazione 021)
- Costo ⚡ 1, max 10 al giorno. Zombie: n = min(6, 3 + ⌊grado / 5⌋); ognuno bruto con probabilità min(0,4, 0,1 + 0,02 × grado) (4 colpi), altrimenti corridore 35% (2 colpi, 8 s per arrivare) o lento (2 colpi, 14 s); bruto 19 s. Danno a tocco 1 (2 con Arma ≥ 2).
- Fine (`world_caccia_fine`): abbattuti = min(dichiarati, n, ⌊(secondi − 3) / 1,2⌋), zero oltre 10 minuti. ⭐ = round(5 × abbattuti × (1 + 0,1 × Combattente)) + 10 se tutti. Scorta per zombie abbattuto: 3 (bruto 6) di 🥫 40% / 🪵 35% / ⛽ 25% (passa da `w_res`).

## Mattoni
Accrediti solo dal server (`w_pay`): premi del giorno con limiti (`world_earn`), premi vari max 300 al giorno (`world_reward`), spinta di recupero +50% sotto il livello medio della zona (`w_boost`), padrino +10% a chi ti ha invitato per 14 giorni.

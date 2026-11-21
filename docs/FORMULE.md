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

## Eventi dal vivo e sfida del quartiere (migrazione 022)
- Celle di 0,05° × 0,07° (~5 km) con giocatori visti negli ultimi 3 giorni: al massimo un evento attivo e uno nuovo ogni 40 min, a 0,3–1,5 km da una casa (⭐ sponsor: sul negozio, 15% se c'è uno sponsor entro 3 km); cassa 30%, salva 25%, nido 30%.
- Cassa (30 min): primi 3 → 24 / 14 / 8 di 🪵 🥫 ⛽, ⭐ 30 / 20 / 10. Salva (30 min): 🥫 5 → ⭐ 50, 🧱 20, ⛽ 10. Nido (60 min) e sponsor (45 min): vita = min(80, 20 + 10 × giocatori della cella); colpo = 5 + ⌊grado / 2⌋ + 2 × Combattente + 2 × Arma, ⭐ 5 a colpo, max 3 colpi a testa; quando cade a ognuno 10 + round(40 × danno suo / danno totale) di 🪵 e 🥫 (metà ⛽), ⭐ 20 + danno; 🧱 15 al colpo finale. Ogni mossa ⚡ 1, solo entro il raggio del superstite.
- Fase 46 (migrazione 038), tipi in `w_evt_stile`: probabilità sponsor 12% (se c'è) · cassa 14% · lancio 10% · auto 10% · farmacia 10% · salva 10% · scorta 8% · cani 10% · nido 9% · orda 7%. Lancio (40 min): primi 5 → q = 30/22/16/10/6, ⛽ q, 🪵 🥫 q/2. Auto: primi 2 → ⛽ 30/15. Farmacia: primi 3 → 🥫 ⛽ 30/18/10. ⭐ = max(10, 30 − 10 × (posto−1)). Scorta: ⛽ 5 → ⭐ 60, 🧱 25, 🥫 15. Cani (30 min): vita max(12, vita del nido × 0,6), premi × 0,7, 🧱 10 al colpo finale. Orda (90 min): vita min(200, vita del nido × 2), premi × 1,5, 🧱 25 al colpo finale.
- Sfida: punti = zombie abbattuti × 2 + spedizioni raccolte × 5 + mosse negli eventi × 10, settimana da lunedì (ora di Roma); quartiere = case entro 10 km; premi il lunedì ai primi 3 del proprio quartiere: 🧱 150 / 100 / 50.

## Zombie nel mondo vero (migrazione 025)
- Quadretti di 0,0014° × 0,0019° (~150 m); ogni ora (`w_zm_ora` = ore dal 1970) ogni quadretto ha uno zombie con probabilità 35% e una cassa con probabilità 7%, posizione e tipo da `hashtext` (uguali per tutti). Rarità: comune 60%, non comune 25%, raro 12%, leggendario 3%. `world_zombie_vicini` mostra la griglia ±4 quadretti.
- Lotta (`world_zombie_lotta`): entro 80 m, 🔋 1, max 40 al giorno; vita = vita del tipo + ⌊grado / 8⌋. Vinta (`world_zombie_fine`) solo se durata ≥ vita × 0,35 s e ≤ 300 s; esperienza 8 / 15 / 30 / 60 per rarità (+20 se tipo nuovo per la Zombipedia); scorte q = 4 / 7 / 12 / 20 di 🪵 e 🥫, q/2 di ⛽ (passa da `w_res`); 🧱 10 (raro) / 30 (leggendario).
- Cassa (`world_cassa_apri`): entro 40 m, una volta per giocatore; 🪵 e 🥫 6–15, ⛽ 3–8, esperienza 10; 15% 🧱 10–24; 10% 💣 bomba (max 5).

## Attacchi tra superstiti (migrazione 028) — regole in `w_pvp_cfg()`
- **Forza** di chi attacca (alla partenza): `(30 + 3 × min(livello, 30)) × (1 + 0,05 × Combattente) × mezzo` (a piedi 0,8 · bici 0,9 · moto 1 · auto 1,2 · fuoristrada 1,3; il mezzo dipende dal carburante, `w_mz_eff`).
- **Difesa** della casa (all'impatto): `(45 + 12 × livello + casa vera: 5 + condominio + bonus dell'orda + presidi + edificio) × (1 + 0,05 × Combattente del padrone) − danni`, minimo 10.
- **Combattente**: abilità 0–9, +5% a livello (max +45%).
- **Esito**: `R = attacco × (1 + c) / difesa`, con `c` tra −0,10 e +0,10 deciso dal server (`hashtext('pvp' || id)`). R < 1 respinto; < 1,25 di misura; < 1,6 normale; altrimenti schiacciante.
- **Perdite**: 10% / 20% / 30% di `scorta − protetta`, con protetta = max(minimo, 30% della scorta) — minimi 🪵 🥫 ⛽ 50, 🧱 100; massimo per attacco 🪵 🥫 ⛽ 150, 🧱 100. Nel PvP vanno all'attaccante.
- **Danni** alla difesa del vinto: −5 / −10 / −15 (massimo −30), finché non ripara con 🪵 2 a punto (`world_ripara`).
- **Viaggio**: fino a 1 km 5 min · 5 km 10 · 20 km 20 · 50 km 40 · 100 km 60 · oltre 90 (dalla tua casa più vicina). Costo: 🥫 10 + carburante del mezzo + 1 energia.
- **Limiti**: mai contro alleati, coinquilini o la tua alleanza (controllato alla partenza e all'impatto); scudo 15 giorni; chi ha 4+ livelli meno di te è protetto; casa vera custodita intoccabile; stessa coppia 1 volta ogni 12 ore; dopo una sconfitta 6 ore al sicuro; max 3 sconfitte al giorno per bersaglio; max 5 attacchi al giorno per attaccante.
- **Rinforzi** (migrazione 029, `w_rinf_tot`): ogni squadra vale `0,5 × forza d'attacco di chi la manda` (snapshot alla partenza, stessa formula della Forza); ordinate dalla più forte pesano 1 · 0,6 · 0,4 · 0,25 (dalla 4ª in poi); somma massima +60, massimo 6 squadre; contano solo quelle con `arrivo ≤ impatto`. Viaggio con `w_viaggio_min` dalla casa più vicina del soccorritore; costo 🥫 5 + carburante del mezzo; non parte se arriverebbe dopo l'impatto. Difesa all'impatto = `w_forza_dif + rinforzi`. Se l'attacco è respinto ogni squadra arrivata prende ⭐ 15 e 🥫 5; se è annullato il 🥫 torna. Chi è alleato anche dell'attaccante non può mandarli; la richiesta (`world_rinforzi_chiedi`) va una volta per attacco a max 30 alleati, i più vicini.
- **Attacchi d'alleanza** (migrazione 030, `w_squadra`): forza di ogni partecipante = Forza alla sua iscrizione (snapshot); ordinate dalla più forte pesano 1 · 0,6 · 0,4 · 0,25 (dalla 4ª in poi), massimo 10 partecipanti; contano solo quelli che all'impatto non sono alleati/coinquilini della vittima. Viaggio = il più lungo dei partecipanti (`w_viaggio_min`). Bottino (stesse percentuali, protetta e massimi) diviso in proporzione al peso `c` di ciascuno (arrotondato per difetto, il resto al primo). Costo per ognuno: 🥫 10 + carburante + 1 energia; annullato prima della partenza → 🥫 e ⛽ restituiti, dopo → 🥫. Anti-abuso: le partecipazioni contano nei 5 attacchi al giorno e nella regola delle 12 ore.
- **Integrità delle case comprate** (migrazione 031): 0–100; attacco vinto contro una casa comprata → −10 / −17 / −25 (esito 1/2/3, `integ` in `w_pvp_cfg`); a 0 crolla: niente affitto in `world_collect`, non attaccabile. Riparazione (`world_ripara`): 🪵 2 × danno + 🪵 1 × (100 − integrità) + 🧱 50 se crollata → integrità 100. Dopo 48 ore (`caduta_ore`) senza riparazione (`w_cadute_tick`): al vecchio padrone 🧱 round(0,5 × (pagato + migliorie)); la casa passa a `caduta_da` (chi l'ha abbattuta; nell'alleanza il contributo più alto) con integrità 50 se ha meno di `w_max(livello)` case, altrimenti torna libera. La casa vera non crolla.
- **Orde sul motore unico** (migrazione 032, `w_orde_tick`): la casa tiene se `w_power3 ≥ w_attack3` (invariato). Se cade: `r = attacco / (difesa × (1 + 0,05 × Combattente))`, esito `w_esito(r)` con le soglie 1 / 1,25 / 1,6 (nessun caso ±10%); esito 0 = il Combattente salva le scorte. Per giocatore e per orda, con l'esito peggiore tra le sue case: `w_bottino` (10/20/30% sopra la protetta, stessi minimi e massimi) e le scorte vengono distrutte. Casa vera caduta: danno +5/+10/+15 (max 30); casa comprata caduta: danno come sopra e integrità −10/−17/−25 (a 0 crollo, `caduta_da` vuoto → dopo 48 ore torna libera con metà della spesa). Scudo dei nuovi arrivati (`w_shielded`): nessuna perdita. Valgono solo le orde arrivate dopo l'installazione della 032 e nelle ultime 12 ore.
- **Mezzi e tempi** (migrazione 035, `w_viaggio_mz`): minuti = min(1440, max(3, 2 + ⌈km ÷ velocità × 60⌉)) con velocità a piedi 5, bici 15, moto 40, auto 60, fuoristrada 50 km/h (`velocita` in `w_pvp_cfg`); ⛽ = `w_mz_carb` (moto 1, auto 1,5, fuoristrada 2 a km). Mezzo usato `w_mz_eff`: lo scelto (`caps.mezzo_scelto`, solo se ≤ al migliore posseduto) o il migliore; senza ⛽ bici o piedi. `w_viaggio_min(km)` = tempo col mezzo di chi viaggia (auth.uid), per attacchi, rinforzi, raduni. Spedizioni: 2 × viaggio + 5 minuti, ⛽ di andata e ritorno, 🥫 2 + ⌈km⌉.
- **Cantieri** (035): `world_ripara` paga come prima e apre un cantiere di max(10, 3 × danno + 2 × (100 − integrità) + 240 se crollata) minuti (casa vera: max(10, 3 × danno)); uno alla volta; a fine lavori `w_cantieri_tick` azzera danno e integrità 100; durante i lavori `w_cadute_tick` non toglie la casa. Accelera: 🧱 max(5, ⌈minuti che mancano ÷ 5⌉).
- **Potenziamenti a tempo** (migrazione 036): `world_def_upgrade` costa come prima (🧱 80 × livello) e apre un cantiere 'potenzia' di 20 × livello minuti (`pot_min`); il livello conta anche quelli già in coda (max 3). Coda per casa: ogni lavoro (potenzia o ripara) inizia alla fine dell'ultimo della stessa casa. Una riparazione per casa alla volta. Danni in % nello stato (`world_case_stato`): casa vera 100 × danno ÷ (50 + 12 × livello), comprata 100 × danno ÷ (45 + 12 × livello), massimo 100.

## Il mondo vero (migrazione 027)
- Posto di persona (`world_posto_visita`): entro 0,05 km (GPS), ogni posto (chiave = round(lat × 2500):round(lon × 2000)) una volta ogni 12 ore, max 12 al giorno; niente energia né scorte. Bottino b = 15 + min(15, grado) (+8 sponsor), diviso per tipo come la spedizione (cibo → 🥫 b; legno → 🪵 b; carb → ⛽ round(0,6 b); farmaco → 🥫 b/2 e 🔋 +2; sponsor → 🪵 b/2, 🥫 b/2, ⛽ b/3; misto → b/3 ciascuno); esperienza 15 (+5 sponsor).
- Spedizione col superstite: oltre all'energia, costo di viaggio `w_sped_costo` = 🥫 2 + ⌈km⌉, ⛽ ⌈km / 3⌉ se km > 3.
- Zombie abbattuto: novità `zm_aiuto` a chi ha la casa vera entro 0,2 km dallo zombie (max una ogni 3 ore dallo stesso giocatore).
- "Apri la Lente" (`w_lente_tick`): tra le 10 e le 20 (Roma), al massimo ogni 8 ore, a chi ha le notifiche e zombie o casse non presi nei quadretti ±2 intorno a casa.
- Pacco da lontano (`world_aiuto_lontano`, solo alleati): 🥫 20, ⛽ 10 + min(40, ⌈km / 250⌉), 🧱 25; +6 alla difesa all'orda successiva a (adesso + 3 ore); max 2 al giorno. `world_send_help` lo propone quando la distanza supera la portata del proprio mezzo migliore.

## Difesa nella Lente e boss della settimana (migrazione 026)
- Difesa: entro 0,3 km dalla casa vera (`world_homes`), 🔋 1, max 6 al giorno. Torrette = 1 + min(2, torretta dell'Assedio); vite della casa = 5 + casa dell'Assedio. 3 ondate: zombie per ondata = min(8, 2 + ondata + ⌊grado / 6⌋); bruto con probabilità 0,1 + 0,06 × ondata (4 colpi), altrimenti corridore 35% / lento (2 colpi); ritardo = (ondata − 1) × 22 + (i − 1) × 2,4 + caso(0–1,5) s.
- Fine (`world_difar_fine`): abbattuti = min(dichiarati, n, ⌊(secondi − 2) / 0,8⌋), zero oltre 600 s; vinta se la casa ha vite e sono passati almeno i secondi dell'ultimo zombie. Esperienza 4 × abbattuti + 25 se vinta; scorte q = 2 × abbattuti + 10 se vinta (🪵 q, 🥫 q, ⛽ q/2); 🧱 15 alla prima vittoria del giorno.
- Boss: zona = cella 0,25° × 0,35°, settimana ISO (ora di Roma), finisce il lunedì alle 00:00; vita = min(4000, 300 + 150 × case della cella). Colpo: max 3 al giorno, 🔋 1; base = 1 + 1 (Arma ≥ 2) + ⌊Combattente / 2⌋; molt = min(2, 1 + 0,25 × alleati che l'hanno colpito oggi); colpi = min(dichiarati, 45, ⌊secondi / 0,45⌋), zero oltre 120 s; danno = round(colpi × base × molt) + grado; esperienza 5 + ⌊colpi / 3⌋.
- Caduta: a ognuno 🪵 e 🥫 25 + min(75, ⌊danno / 8⌋), ⛽ 10 + min(40, ⌊danno / 16⌋), esperienza 40 + min(80, ⌊danno / 5⌋); 🧱 40 / 25 / 15 ai primi 3 per danno.

## Difendi la casa (migrazione 023)
- Vite = min(8, livello della casa vera + 2) + 2 con 🛡️ scudo. Costo ⚡ 1 (prima partita del giorno gratis), max 15 al giorno. Velocità degli zombie × (1 + 0,04 × min(grado, 20)).
- Fine: abbattuti = min(dichiarati, ⌊secondi × 4⌋ + 12 × bombe usate, 260), zero oltre 5 minuti; casa salva solo se dichiarata e partita ≥ 40 s. ⭐ = 2 × abbattuti + 15 se salva; ⌊abbattuti / 2⌋ scorte da 2 (🥫 40% / 🪵 35% / ⛽ 25%); casa salva 🧱 5 (max 50 al giorno).
- Bottega (Mattoni): ⚡ +5 = 🧱 60 (2 al giorno, fino a energia massima + 5), 💣 = 🧱 25, 🛡️ = 🧱 25 (max 5 ciascuno).

## Assedio a livelli (migrazione 024)
- Livello L: zombie = min(60, 6 + 2L); corridori (1 colpo, veloci) dal 3°: min(35%, 10% + 2%·L); bruti (6 colpi) dal 5°: min(25%, 5% + 1,5%·L); colpi in più ⌊L/6⌋; provviste per le difese 60 + 5L; un nuovo zombie ogni max(0,6, 2,2 − 0,06L) s circa.
- Difese: barricata 20 (resistenza 6 + 3 × potenziamento), torretta 35 (danno 1 + potenziamento, ogni 0,9 s, raggio 2,6 caselle), mina 15 (danno 4 + 2 × potenziamento a chi è entro 1 casella). Casa: vita 10 + 2 × potenziamento (+3 con 🛡️ scudo); zombie che arriva −2 (bruto −3). +3 provviste a zombie abbattuto.
- Stelle: 3 casa intatta, 2 almeno metà vita, 1 vinta. Il server accetta la vittoria solo dopo almeno 8 + L secondi e con tutti gli zombie abbattuti (max 3 al secondo + 20 a bomba).
- Premi: per ogni stella nuova ⭐ 10 + 2L e 🪵 🥫 ⛽ 4 + L ciascuna; prima vittoria del livello 🧱 min(30, 5 + L); livello già fatto vinto di nuovo ⭐ 5 e 2 di ogni scorta; ⭐ 1 per zombie. Prima partita del giorno gratis, poi 1 energia; max 20 al giorno.
- Potenziamenti (1–3): 🪵 20 × n + 🧱 30 × n.

## Mattoni
Accrediti solo dal server (`w_pay`): premi del giorno con limiti (`world_earn`), premi vari max 300 al giorno (`world_reward`), spinta di recupero +50% sotto il livello medio della zona (`w_boost`), padrino +10% a chi ti ha invitato per 14 giorni.

## 🛡️ Danni alle singole difese (Fase 49, migrazione 040)
- Livello effettivo di una difesa = livello × (100 − danno) / 100 (`w_defe`), con 2 decimali. È quello che entra nell'attacco dell'orda (`w_attack3`), nella % di tenere (`w_threats_of` → `defe`, usato da `thrCalc` in p47 al posto di `defs`) e nella forza negli attacchi (`w_fort` = arrotondamento di barricate + recinto + fossato effettivi).
- Orda che sfonda (esito e = 1/2/3, senza scudo): per ogni tipo di zombie presente (livello ≥ `minl` di `w_ztypes`) la difesa principale `dk` perde 10 + 10·e %, la seconda `dk2` 5 + 5·e %; le trappole perdono 5·e % (vaganti). Solo difese con livello > 0, massimo 100%. Se la casa tiene: nessun danno.
- Restauro (`world_def_restaura`): 🪵 = max(5, ⌈danno × livello × 0,4⌉), minuti = max(5, ⌈danno × livello × 0,3⌉), in coda ai lavori della casa; a fine lavori danno = 0. Con danno > 0 il potenziamento è rifiutato.
- Usura quando la casa **tiene** (migrazione 044, `w_usura_difese` chiamata da `w_orde_tick`): r = attacco / difesa (sotto 0,5 niente usura); per ogni tipo di zombie dell'orda m = `w_zm` (pendenza, meteo, ora; 0,3–1,8); difesa principale del tipo ⌊12 × r × m / (1 + 0,5 × livello)⌋, secondaria ⌊6 × …⌋, trappole (vaganti) ⌊8 × …⌋; sotto 3 nessun danno. Si sommano i tipi che colpiscono la stessa difesa (es. barricate: caschi, bruti, boss). Con lo scudo niente.
- "Danni alle difese" della casa = il più alto tra i danni della casa e la media dei danni delle difese pesata sul livello (`w_difese_pct`).

## 🚗 Mezzi del superstite (Fase 50, migrazione 041)
| Mezzo | km/h | Energia a viaggio | ⛽ al km | Bottino × | Portata km | Bottega 🧱 |
| --- | --- | --- | --- | --- | --- | --- |
| a piedi | 5 | energia del viaggio (min 1) | 0 | 1 | 2 | — |
| bici | 15 | energia del viaggio + 1 | 0 | 1,2 | 5 | 100 |
| moto | 40 | 0 | 1 | 1,4 | 12 | 300 |
| auto | 60 | 0 | 1,5 | 1,8 | 20 | 600 |
| fuoristrada | 50 | 0 | 2 | 2,2 | 20 | 1.200 |
| furgone | 45 | 0 | 2,5 | 3 | 20 | 1.800 |

Tempo = 2 + ⌈km ÷ velocità × 60⌉ minuti (spedizioni: andata e ritorno + 5 di ricerca). Bottino della spedizione = bottino × capienza (`w_mz_cap`, salvata in `calc.cap` alla partenza). 🥫 10 = 🔋 1 (`world_energia_compra`, max 10 al giorno, fino al pieno).

## 💎 Gemme (Fase 51, migrazione 042 — valori PROVVISORI in `w_gem_cfg`)
| Cosa | Valore |
| --- | --- |
| Completa subito | max(1, ⌈minuti che mancano ÷ 6⌉) 💎; attacchi: arrivo spostato a fra 5 minuti, costo sui minuti tolti |
| Cambio | 1 💎 = 🥫 10 · 🪵 10 · ⛽ 8 · 🧱 15 (max 200 💎 per cambio) |
| Grado nuovo | 3 + grado 💎 (es. grado 4 → 7) |
| Traguardi | grado 5: 20 · 10: 50 · 15: 80 · 20: 120 · 30: 200 |
| Pacchetti | 60 💎 0,99 € · 330 💎 4,99 € · 700 💎 9,99 € · 1.500 💎 19,99 € (pagamenti spenti) |

## 🧑 Superstite: statistiche e sviluppi a tempo (Fase 52, migrazione 043 — PROVVISORI in `w_sup_cfg`)
Statistiche = base + crescita col grado + gradi di sviluppo: ❤️ vita 100 + 8·(grado−1) + 10·g · 💪 forza 10 + (grado−1) + 2·g · 🛡️ difesa 8 + (grado−1) + 2·g · 💨 agilità 8 + (grado−1) + 2·g.
Salire di grado con l'XP è immediato; gli sviluppi hanno un tempo fissato alla partenza (non cambia se sali di grado). Massimo 2 sviluppi insieme.

| Grado sviluppo (statistica) | Fascia | Grado del superstite richiesto | Durata | 🪵 | 🧱 |
| --- | --- | --- | --- | --- | --- |
| 1 | Introduzione | 1 | 30 s | 8 | 0 |
| 2 | Introduzione | 1 | 1 min | 26 | 0 |
| 3 | Primi | 2 | 5 min | 52 | 36 |
| 4 | Primi | 3 | 10 min | 84 | 61 |
| 5 | Primi | 4 | 15 min | 123 | 91 |
| 6 | Intermedi | 5 | 30 min | 168 | 126 |
| 7 | Intermedi | 6 | 1 h | 219 | 166 |
| 8 | Intermedi | 8 | 2 h | 274 | 211 |
| 9 | Avanzati | 10 | 4 h | 335 | 261 |
| 10 | Avanzati | 12 | 6 h | 401 | 315 |
| 11 | Avanzati | 14 | 8 h | 471 | 375 |
| 12 | Alto livello | 16 | 12 h | 547 | 438 |
| 13 | Alto livello | 18 | 16 h | 626 | 506 |
| 14 | Alto livello | 20 | 20 h | 710 | 578 |
| 15 | Alto livello | 22 | 24 h | 799 | 655 |

Abilità (punti come prima, 1 per grado): fascia = 2 × livello dell'abilità (es. Combattente 3 → fascia 6, 30 min), 🪵 10 × livello. Attrezzi livello 1/2/3: fascia 4/7/10 (10 min / 1 h / 6 h), grado richiesto 1/5/10, 🪵 30·lv + 🧱 50·lv (come prima). 💎 completa subito con la formula delle gemme.

## 🧟 Arena (Fase 53, migrazione 046 — provvisorio)
- Livello dello zombie = grado del superstite − 2 (facile), + 0 (equilibrato), + 2 (difficile), minimo 1.
- Zombie (`w_arena_zstats`): vita = 50 + hp del tipo × 8 + livello × 10; forza = 7 + round(livello × 1,2 + rarità × 2); difesa = 4 + livello + rarità; agilità = 5 + livello/2 (+4 corridore e cane, −2 bruto).
- Danno di un colpo (`w_arena_danno` = `arnDanno` in p107): max(1, round(forza × 1,5 − difesa × 0,6)), ±10% nell'app. Mosse (`ARN_MV`): 👊 pugno ×1 (portata 15), 🦵 calcio ×1,3 (20), 🔥 speciale ×3 (19, ricarica 8 s); zombie: graffio ×0,8, morso ×1,45, carica ×1,1, combo di due graffi; parata ×0,25. Al meglio di 3 round da 60 s (a tempo vince chi ha più vita in %); combo: 3° colpo entro 0,8 s dal precedente ×1,5; SUPER: +12 a colpo dato, +4 se parato, +6 a colpo subito, a 100 il 🔥 (×3); furia dello zombie sotto il 35% (velocità ×1,3, danno ×1,15, pause ×0,7).
- Di persona: entro 80 m + precisione GPS (max 50 m), 🔋 1. Col superstite: dalla casa di partenza col mezzo (`w_mz_eff`), tempo `w_viaggio_mz`, 🥫 1 + ⌈km⌉, ⛽ `w_mz_carb(mezzo, km)`, 🔋 `w_mz_en(mezzo, 1)`; lo zombie aspetta 30 min dall'arrivo; 💎 come gli altri lavori (1 ogni 6 min, minimo 1).
- Vittoria valida: colpi ≥ ⌈vita zombie / danno / 3⌉, tempo ≥ colpi necessari / 2,5 s e ≤ 300 s. Premi: XP = round((10 + 3 × livello + 6 × rarità) × 0,7 / 1 / 1,5) + 20 se tipo nuovo; 🪵 🥫 = 3 + livello/2 + rarità × 2, ⛽ la metà; 🧱 10 (raro) o 30 (leggendario).

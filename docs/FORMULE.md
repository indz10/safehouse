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
`difesa = 45 + 12·livello casa + (casa vera: 5 + difese del condominio) + presidi vicini + bonus`
- **presidi vicini** (Fase 9b, `w_pres_bonus`): +3 per ogni presidio tenuto entro 500 m dalla casa (di chiunque sia), massimo +6; conta se era tenuto all'ora dell'orda (storia in `world_presidi_tenute`). Sta in `w_threats_of` (campo `pres`, già dentro `def`), `world_raid_status`, `world_raid_view`, `w_home_held`, `world_my_defense`.
- **difese del condominio** (solo casa vera): `3 × somma dei livelli` delle difese comuni (`w_condo_bonus`), **solo se hai versato nel condominio negli ultimi 30 giorni** (migrazione 013), altrimenti 0;
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

## Orda sui presidi (Fase 9b)
SQL `w_pres_attack`, `w_pres_def`, `w_pres_tick` — app p69 (`presChance`).
- Attacco: `50 + r`, con `r` da 0 a 49 (diverso per ogni orda e presidio).
- Difesa: `55 + 12 × guardie` (massimo 5 guardie: chi lo tiene, alleati, coinquilini; valgono per una sola orda).
- Tiene se `difesa ≥ attacco`; altrimenti torna libero. % mostrata = `(difesa − 50 + 1) / 50`, tra 0 e 100.

## Punteggio Superstite (classifica)
SQL `w_score` (ultimi 7 o 30 giorni) — l'app mostra i valori del server.
Difesa (case tenute, max 300) + Fortezza (fortificazioni e livelli, max 200) + Casa vera (indice, max 150) + Squadra (aiuti dati e alleati, max 150) + Costanza (giorni attivi, max 100) + Crescita (Mattoni guadagnati giocando, max 100).

## Risorse e ricompense (migrazione 012)
Risorse 🪵 Legno, 🥫 Cibo, ⛽ Carburante accanto ai 🧱 Mattoni; le dà solo il server (`w_res`), max **400 al giorno** per risorsa.
- Orda, casa che tiene: 🧱 **10 + 6 × livello** della casa, più 🪵 4 e 🥫 6; casa sfondata 🧱 3 (`world_raid_status`).
- Orda mandata a un rivale la cui casa cade: 🧱 **35** e ⛽ 10.
- Rinforzi a un alleato: 🧱 **10** e 🥫 5 (max 5 al giorno).
- Presidio tenuto a ogni orda (`w_pres_rendita`): 20 + 2 × orde di fila (max +20) della sua risorsa — parco/sport 🪵, piazza/centro/chiesa 🥫, stazione/polizia/pompieri ⛽; municipio/scuola/biblioteca/ospedale 🧱 15 + orde di fila (max +15).
- Accesso del giorno: 🧱 20 + 🪵 10 🥫 10 ⛽ 5. Casa vera valutata: 🧱 200 + 🪵 50 🥫 50 ⛽ 30.
- 🔄 Mercato (`world_trade`): 20 di una risorsa = 🧱 10, max 🧱 100 al giorno.

## Mattoni
Accrediti solo dal server (`w_pay`): premi del giorno con limiti (`world_earn`), premi vari max 300 al giorno (`world_reward`), spinta di recupero +50% sotto il livello medio della zona (`w_boost`), padrino +10% a chi ti ha invitato per 14 giorni.

# Gioco v2 — piano (richiesta di Alessandro del 20/11/2026)

## Cosa c'è già e cosa si fa
| Parte | Oggi | Decisione |
| --- | --- | --- |
| Valutazione della casa | p16, p12, p20… | **Non si tocca** |
| Gemme | solo sul telefono (`G.gems`), nessun saldo sul server | **Sostituite** (Fase 51): saldo e registro sul server; le vecchie si annotano (`world_gemme_legacy`), nessuna conversione decisa |
| Mattoni 🧱 | moneta del gioco guadagnata giocando (non comprabile) | **Restano risorsa** (non premium); "accelera" passa dai 🧱 alle 💎 |
| Cibo | anche all'accesso del giorno e dai presidi | **Corretto** (Fase 51): niente cibo col tempo; restano spedizioni, casse, eventi, orde respinte, 💎 |
| Energia | si ricarica col tempo | **Resta** |
| Mappa: spedizioni, casse, rinforzi, aiuti, attacchi | già a tempo (Fasi 35–50) | **Restano**; + "completa subito" in 💎 (Fase 51) |
| Zombie sulla mappa | segnaposti; si combattono nella Lente | Fase 53: toccandoli si apre la Lente per raggiungerli (niente lotta a distanza) |
| Lente | fotocamera + mira e spara (`world_zombie_lotta/fine`) | Fase 53: esplorazione GPS (anche senza fotocamera), incontro solo da vicino (raggio + precisione GPS), arena laterale in orizzontale |
| Superstite | grado da XP, abilità ed attrezzi istantanei | Fase 52: creazione (nome, aspetto), statistiche, potenziamenti a tempo per fasce |
| Negozio | Bottega in 🧱 | Fase 51: negozio 💎 (pacchetti, cambio in risorse); pagamenti spenti finché non c'è Stripe |

## Fasi
1. **Fase 51 — Gemme** (migrazione 042): saldo vero, registro, regole in `w_gem_cfg`, gemme ai gradi e ai traguardi, 💎 → risorse, completa subito (cantieri, restauri, potenziamenti, spedizioni, rinforzi, attacchi), negozio, cibo senza ricariche.
2. **Fase 52 — Il superstite**: creazione dell'avatar per nuovi ed esistenti, statistiche (vita, forza, difesa, agilità), potenziamenti a tempo con fasce per grado, completa subito in 💎, schermate di potenziamento.
3. **Fase 53 — Lente e arena**: esplorazione GPS, scheda dello zombie con livello e difficoltà, transizione, arena laterale orizzontale giocabile (movimento, colpo, parata/schivata, speciale con ricarica, IA), statistiche fissate all'inizio, ricompense una sola volta con controlli del server.
4. **Fase 54 — Sezioni e missioni**: Casa · Mappa · Lente · Superstite · Negozio; pannello missioni attive con stato, meta, tempo, ora di fine, 💎 per finire subito.

## Decisioni ancora da prendere (valori provvisori in `w_gem_cfg`)
- Prezzi in euro dei pacchetti e numero di gemme.
- Cambio 💎 → risorse e costo di "completa subito" (oggi 1 💎 ogni 6 minuti).
- Gemme per grado e traguardi.
- Affitti delle case comprate e rendite dei presidi: oggi arrivano a ogni orda senza azioni. La richiesta dice che solo l'energia si ricarica col tempo: da decidere se trasformarle in attività da avviare.
- Le vecchie gemme del telefono (annotate in `world_gemme_legacy`).
- Funzioni vecchie che spendono le gemme del telefono (scudi agli alleati, raddoppio premio): da spostare sulle gemme del server o togliere (Fase 54).
- Pagamenti: punto di aggancio pronto (`world_gemme_ordini`, `w_gemme_pagato`), da collegare alla funzione Edge di Stripe.

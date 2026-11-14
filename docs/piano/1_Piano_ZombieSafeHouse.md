# 🧟 ZombieSafeHouse — Piano per un prodotto unico e redditizio

*Novembre 2026 · documento di lavoro di Alessandro (INDZ)*

## L'idea in una frase
**Il gioco che rende davvero più sicura la tua casa e più viva la tua zona.**

| Per chi | Cosa ottiene |
|---|---|
| 🎮 Il giocatore | Un gioco a fumetto nel suo quartiere vero, sfide con vicini e amici |
| 🏠 La famiglia | Una casa più sicura davvero, passo dopo passo |
| 🏪 Negozi e partner | Clienti veri della zona, misurati |

**Regola d'oro:** ogni funzione deve servire ad almeno una di queste tre cose. Se non serve, si toglie o si nasconde.

## Cosa ci rende unici
1. **La casa vera**: valutazione con foto e domande → la casa diventa un fumetto con la sua difesa.
2. **Il mondo vero**: mappa, negozi, presidi (scuola, farmacia, piazza…), meteo e pendenza veri.
3. **Le azioni vere** *(da costruire, Fase 15)*: migliori davvero la casa → lo dimostri con una foto → grande premio nel gioco.

Il ciclo che nessuno può copiare in fretta:
**gioco → azione vera → casa più sicura → premio nel gioco → voglia di fare la prossima azione.**

## Il giro del giocatore
- **Mattina** — guardi l'orda di stasera, prepari le case, leggi il consiglio vero del giorno.
- **Giorno** — conquisti un presidio vicino, aiuti un alleato, passi da un negozio sponsor (Lente).
- **Sera** — orda alle 21, guardi l'assalto, riscatti i premi.
- **Settimana** — un'azione vera sulla casa, con un grande premio.

## Come guadagna
| Chi paga | Per cosa | Quando |
|---|---|---|
| 🏪 Negozi della zona | Vetrina sulla mappa e nella Lente, offerte, codici sconto, contatti misurati | Subito (serve la partita IVA) |
| 🛡️ Installatori, ferramenta | Richieste di preventivo **con consenso** da chi ha un punto debole vero | Dopo 200–300 case valutate |
| 🏦 Assicurazioni | "Punteggio casa" verificato, sconti ai giocatori | Quando ci sono i numeri |
| ⭐ Giocatori | **Superstite+**: grafiche, statistiche, niente pubblicità (mai difesa a pagamento) | Quando c'è una comunità |

**Listino sponsor attuale** (modificabile da Supabase, tabella `sponsor_prezzi`):
Vetrina 290 €/anno · Vetrina Plus 590 €/anno (in evidenza) · Partner di categoria 1.490 €/anno (in evidenza, uno per categoria).

## Le fasi (una pull request ciascuna)
| Fase | Cosa | Stato |
|---|---|---|
| 12a | Risorse 🪵 🥫 ⛽ e ricompense nuove · alleati sulla mappa | ✅ fatta |
| 13a | 🌍 Mondo: Mappa + Orda in una scheda · attività vere visibili | ⏳ da unire (Merge) |
| 14 | **Pulizia**: un solo giro al giorno, un solo "🎁 premio del giorno" (ruota, gratta, barattolo insieme), prima apertura in 3 minuti | da fare |
| 15 | **Azioni vere**: "fai questa cosa a casa, mandaci la foto, prendi il bonus" | da fare |
| 16 | **Preventivi con consenso** per installatori e ferramenta | dopo 200–300 case |
| 17 | **Superstite+** (abbonamento) | quando c'è la comunità |
| — | Store (Google Play, App Store) | quando i numeri ci sono |

## I prossimi 3 mesi
| Settimane | Obiettivo | Numero da raggiungere |
|---|---|---|
| 1–2 | Merge Fase 13a · Fase 14 Pulizia | — |
| 2–4 | Partita IVA · commercialista · accendere Stripe | Stripe attivo |
| 3–6 | Giro dei negozi della tua zona (vedi la proposta) | **10 negozi** |
| 4–8 | Inviti, video brevi della Lente, cartelli in vetrina | **100 giocatori veri** |
| 6–10 | Fase 15 Azioni vere | 30 azioni vere fatte |
| 10–12 | Misurare e decidere se allargarsi ai paesi vicini | vedi sotto |

## I numeri da guardare ogni settimana
| Numero | Buono se… |
|---|---|
| Tornano il giorno dopo | almeno 4 su 10 |
| Tornano dopo una settimana | almeno 2 su 10 |
| Amici invitati per giocatore | almeno 0,5 |
| Case valutate | crescono ogni settimana |
| Contatti ai negozi (clic su telefono, mappa, codici) | almeno 20 al mese per negozio |

**Regola:** ci si allarga a una nuova zona solo quando quella di prima regge questi numeri.

## Chi deve giocare
Famiglie e proprietari di casa, **adulti 25–55 anni**. Tono: fumetto ironico, non horror. Niente bambini come pubblico (privacy più semplice, chi spende per la casa sono gli adulti).

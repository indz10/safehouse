# Database (Supabase) — inventario

Generato da `docs/strumenti/schema_sql.js` (Fase 6a) a partire dai 30 file `*.sql` alla radice, nell'ordine in cui sono stati eseguiti.
Lo stato ricostruito è in `supabase/schema.sql` (eseguendo i file su un Postgres di prova con `docs/strumenti/db_locale.sh`; documento, non va eseguito). Ogni cambio d'ora in poi: `supabase/migrazioni/NNN_nome.sql`.

- Tabelle: **42** · viste: **1** · indici: **11** · regole (policy): **41** · trigger: **11** · lavori programmati: **1**
- Funzioni: **121** (121 nomi); usate (direttamente o tramite altre funzioni): **121**; **non usate: 0**

## Funzioni non usate (candidate da togliere nella Fase 6b)
Nessuna chiamata dall'app (`p*.js`, admin, negozio), dalle funzioni Edge, da trigger, cron, regole o da altre funzioni usate.
- nessuna

## Tutte le funzioni
| funzione | app | Edge | trigger/cron/regole | chiamata da | versioni (file) |
|---|---|---|---|---|---|
| `admin_link_sponsor` | ✓ |  |  |  | 1: aggiornamento_ottobre |
| `admin_sponsor_accounts` | ✓ |  |  |  | 1: aggiornamento_ottobre |
| `admin_world_exclude` | ✓ |  |  |  | 1: mondo_unico |
| `delete_my_account` | ✓ |  |  |  | 1: aggiornamento_ottobre |
| `is_admin` |  |  | regole | admin_link_sponsor, admin_sponsor_accounts, admin_world_exclude, world_chat_report | 1: ZombieSafeHouse_backend_sponsor |
| `miei_invitati` | ✓ |  |  |  | 1: aggiornamento_ottobre |
| `my_sponsor` |  |  | regole | redeem_coupon | 1: ZombieSafeHouse_backend_sponsor |
| `push_subscribe` | ✓ |  |  |  | 1: push |
| `push_unsubscribe` | ✓ |  |  |  | 1: push |
| `redeem_coupon` | ✓ |  |  |  | 1: ZombieSafeHouse_backend_sponsor |
| `w_allies_of` |  |  |  | w_upower, w_tr_feed, world_allies, world_team_bonus, world_my_defense, world_allies_status … | 2: aiuto_alleati → alleanze2 |
| `w_are_allies` |  |  |  | world_quote, world_send_help, world_send_attack, world_give, world_feed_list, world_player … | 3: mondo_v4 → social → alleanze2 |
| `w_attack3` |  |  |  | world_raid_status, world_raid_view, w_home_held | 4: mondo_v3 → zombie → zombie_alleati → fortezze |
| `w_bad` |  |  |  | world_chat_send, world_dm_send | 1: chat |
| `w_boost` |  |  |  | w_pay, world_status_extra | 1: equita |
| `w_canon` |  |  |  | world_claim_home, world_quote, world_buy | 3: mondo_unico → mondo_unico_agg1 → abitazione |
| `w_cleanup` |  |  |  | world_buy | 1: mondo_unico |
| `w_coinq` |  |  |  | w_upower, w_are_allies, w_allies_of, world_allies, world_team_bonus, world_my_defense … | 1: alleanze2 |
| `w_condo_bonus` |  |  |  | w_home_held, w_threats_of, world_house_info | 1: abitazione |
| `w_condo_key` |  |  |  | w_condo_bonus, world_condo_give, world_house_info | 1: abitazione |
| `w_def` |  |  |  | w_attack3, world_def_upgrade, w_threats_of | 2: zombie → zombie_alleati |
| `w_feed_add` |  |  |  | w_tr_feed, w_tr_dm, world_house_invite, world_house_answer | 1: social |
| `w_home_held` |  |  |  | world_raid_status, w_score | 2: mondo_v3 → abitazione |
| `w_home_known` |  |  |  | world_view, world_quote, world_my_effects | 1: nome_casa |
| `w_is_npc` |  |  |  | world_quote, w_tr_feed | 1: mondo_v3 |
| `w_km` |  |  |  | w_canon, world_claim_home, world_view, world_quote, world_buy, w_price2 … | 1: mondo_unico |
| `w_league` |  |  |  | world_rank_lega, world_status_extra | 1: equita |
| `w_level` |  |  |  | world_quote, world_mine, world_raid_status, w_lvl_of, w_median_near, world_rank_lega | 1: mondo_unico |
| `w_lvl_of` |  |  |  | world_raid_view, w_home_held, world_help_list, world_send_attack, world_ally_pending, world_rank … | 1: mondo_v3 |
| `w_max` |  |  |  | world_quote, world_mine | 1: mondo_unico |
| `w_median_near` |  |  |  | w_boost, world_status_extra | 1: equita |
| `w_next_slot` |  |  |  | world_raid_status, world_prepare, world_ask_help, world_help_list, world_send_help, world_send_attack … | 1: orda_mondo |
| `w_nick` |  |  |  | world_view, world_quote, world_help_list, w_settle_loans, world_give, world_gifts_in … | 1: mondo_unico |
| `w_pay` |  |  |  | w_cleanup, world_earn, world_claim_home, w_settle, world_sell, world_collect … | 2: mondo_unico → equita |
| `w_power3` |  |  |  | world_raid_status, world_raid_view, w_home_held | 1: mondo_v3 |
| `w_prev_slot` |  |  |  | world_raid_status, world_raid_view | 1: orda_mondo |
| `w_price` |  |  |  | w_price2 | 1: mondo_unico |
| `w_price2` |  |  |  | world_quote | 2: mondo_v3 → equita |
| `w_radius` |  |  |  | world_mine | 1: mondo_unico |
| `w_raid_houses` |  |  |  | world_raid_status | 1: orda_mondo |
| `w_room` |  |  |  | world_chat_send, world_chat_list | 1: chat |
| `w_score` |  |  |  | world_rank, world_rank_lega, world_score | 1: classifica |
| `w_settle` |  |  |  | world_mine | 1: mondo_unico |
| `w_settle_loans` |  |  |  | world_mine2 | 2: mondo_v4 → migr. 001_funzioni_mancanti |
| `w_shielded` |  |  |  | world_send_attack, world_send_curse, world_welcome, world_status_extra, world_rivals | 1: equita |
| `w_slope` |  |  |  | w_attack3, w_threats_of | 2: zombie → zombie_alleati |
| `w_slot_id` |  |  |  | world_raid_status, world_prepare, world_raid_view, world_ask_help, world_help_list, world_send_help … | 1: orda_mondo |
| `w_threats_of` |  |  |  | world_threats, world_ally_view, world_allies_status | 4: alleati_sim → zombie_alleati → fortezze → abitazione |
| `w_tr_dm` |  |  | trigger |  | 1: assedio |
| `w_tr_feed` |  |  | trigger |  | 4: social → aiuto_alleati → dispetti → alleanze2 |
| `w_upower` |  |  |  | world_raid_status, world_raid_view, w_home_held, w_threats_of | 5: mondo_v3 → dispetti → alleanze2 → casavera → squadra_fix |
| `w_wallet` |  |  |  | w_pay, world_earn, world_claim_home, world_collect, world_mine, world_raid_status … | 1: mondo_unico |
| `w_wxev` |  |  |  | w_attack3, w_threats_of | 2: zombie → zombie_alleati |
| `w_zm` |  |  |  | w_attack3, w_threats_of | 2: zombie → zombie_alleati |
| `w_ztypes` |  |  |  | w_attack3, w_threats_of | 3: zombie → zombie_alleati → fortezze |
| `world_allies` | ✓ |  |  | world_ally_request | 3: mondo_v4 → social → alleanze2 |
| `world_allies_status` | ✓ |  |  |  | 2: alleati_sim → zombie_alleati |
| `world_ally_answer` | ✓ |  |  |  | 1: social |
| `world_ally_pending` | ✓ |  |  |  | 1: social |
| `world_ally_request` | ✓ |  |  |  | 1: social |
| `world_ally_shield` | ✓ |  |  |  | 1: alleanze2 |
| `world_ally_view` | ✓ |  |  |  | 2: alleati_sim → zombie_alleati |
| `world_ask_help` | ✓ |  |  |  | 1: mondo_v3 |
| `world_block` | ✓ |  |  |  | 1: chat |
| `world_buy` | ✓ |  |  |  | 4: mondo_unico → mondo_unico_agg1 → casa_abitata → nome_casa |
| `world_chat_list` | ✓ |  |  |  | 1: chat |
| `world_chat_report` | ✓ |  |  |  | 1: chat |
| `world_chat_send` | ✓ |  |  |  | 1: chat |
| `world_claim_home` | ✓ |  |  |  | 3: mondo_unico → mondo_unico_agg1 → abitazione |
| `world_collect` | ✓ |  |  |  | 1: mondo_unico |
| `world_condo_give` | ✓ |  |  |  | 1: abitazione |
| `world_coresidents` | ✓ |  |  |  | 1: residenti |
| `world_def_upgrade` | ✓ |  |  |  | 4: zombie → zombie_alleati → assedio → fortezze |
| `world_dm_list` | ✓ |  |  |  | 1: assedio |
| `world_dm_send` | ✓ |  |  |  | 1: assedio |
| `world_dm_threads` | ✓ |  |  |  | 1: assedio |
| `world_earn` | ✓ |  |  |  | 1: mondo_unico |
| `world_feed_list` | ✓ |  |  |  | 1: social |
| `world_find` | ✓ |  |  |  | 1: squadra_fix |
| `world_gift_claim` | ✓ |  |  |  | 2: mondo_v4 → migr. 001_funzioni_mancanti |
| `world_gifts_in` | ✓ |  |  |  | 2: mondo_v4 → migr. 001_funzioni_mancanti |
| `world_give` | ✓ |  |  |  | 2: mondo_v4 → alleanze2 |
| `world_help_list` | ✓ |  |  |  | 1: mondo_v3 |
| `world_home_vis` | ✓ |  |  |  | 1: nome_casa |
| `world_house_answer` | ✓ |  |  |  | 1: abitazione |
| `world_house_info` | ✓ |  |  |  | 1: abitazione |
| `world_house_invite` | ✓ |  |  |  | 1: abitazione |
| `world_house_leave` | ✓ |  |  |  | 1: abitazione |
| `world_house_log` | ✓ |  |  |  | 2: assedio → migr. 001_funzioni_mancanti |
| `world_inviter` | ✓ |  |  |  | 2: benvenuto → migr. 001_funzioni_mancanti |
| `world_loans` | ✓ |  |  |  | 2: mondo_v4 → migr. 001_funzioni_mancanti |
| `world_mine` | ✓ |  |  | world_mine2 | 1: mondo_unico |
| `world_mine2` | ✓ |  |  |  | 2: mondo_v4 → migr. 001_funzioni_mancanti |
| `world_my_defense` | ✓ |  |  |  | 2: casavera → squadra_fix |
| `world_my_effects` | ✓ |  |  |  | 3: assedio → casa_abitata → nome_casa |
| `world_player` | ✓ |  |  |  | 1: social |
| `world_prepare` | ✓ |  |  |  | 1: orda_mondo |
| `world_quote` | ✓ |  |  | world_buy | 5: mondo_unico → mondo_unico_agg1 → mondo_v3 → casa_abitata → nome_casa |
| `world_raid_claim` | ✓ |  |  |  | 2: orda_mondo → mondo_v3 |
| `world_raid_status` | ✓ |  |  | world_raid_claim | 2: orda_mondo → mondo_v3 |
| `world_raid_view` | ✓ |  |  |  | 2: orda_mondo → mondo_v3 |
| `world_rank` | ✓ |  |  |  | 2: social → classifica |
| `world_rank_lega` | ✓ |  |  |  | 2: equita → classifica |
| `world_reward` | ✓ |  |  |  | 1: premi |
| `world_rivals` | ✓ |  |  |  | 3: mondo_v3 → equita → alleanze2 |
| `world_score` | ✓ |  |  |  | 1: classifica |
| `world_seen` | ✓ |  |  |  | 1: mondo_unico |
| `world_sell` | ✓ |  |  |  | 1: mondo_unico |
| `world_send_attack` | ✓ |  |  |  | 3: mondo_v3 → equita → alleanze2 |
| `world_send_curse` | ✓ |  |  |  | 2: dispetti → equita |
| `world_send_help` | ✓ |  |  |  | 3: mondo_v3 → alleati_sim → zombie_alleati |
| `world_set_home` | ✓ |  |  |  | 1: abitazione |
| `world_set_realshield` | ✓ |  |  |  | 1: casavera |
| `world_shout` | ✓ |  |  |  | 1: social |
| `world_status_extra` | ✓ |  |  |  | 1: equita |
| `world_team_bonus` | ✓ |  |  |  | 1: alleanze2 |
| `world_threats` | ✓ |  |  |  | 3: zombie → alleati_sim → zombie_alleati |
| `world_upgrade` | ✓ |  |  |  | 1: mondo_unico |
| `world_view` | ✓ |  |  |  | 4: mondo_unico → residenti → casa_abitata → nome_casa |
| `world_welcome` | ✓ |  |  |  | 1: equita |
| `zsh_stats` | ✓ |  |  |  | 2: ZombieSafeHouse_backend_sponsor → community |

## Tabelle
| tabella | creata in | modifiche | RLS |
|---|---|---|---|
| `admins` | ZombieSafeHouse_backend_sponsor | 0 | ✓ |
| `coupons` | ZombieSafeHouse_backend_sponsor | 0 | ✓ |
| `custom_pois` | ZombieSafeHouse_backend_sponsor | 0 | ✓ |
| `hidden_pois` | ZombieSafeHouse_backend_sponsor | 0 | ✓ |
| `leads` | ZombieSafeHouse_backend_sponsor | 0 | ✓ |
| `offers` | ZombieSafeHouse_backend_sponsor | 0 | ✓ |
| `poi_reports` | ZombieSafeHouse_backend_sponsor | 0 | ✓ |
| `profili_pubblici` | ZombieSafeHouse_backend_sponsor | 1 | ✓ |
| `push_keys` | push | 0 | ✓ |
| `push_log` | push | 0 | ✓ |
| `push_subs` | push | 0 | ✓ |
| `reviews` | ZombieSafeHouse_backend_sponsor | 0 | ✓ |
| `salvataggi` | ZombieSafeHouse_backend_sponsor | 0 | ✓ |
| `sponsor_events` | ZombieSafeHouse_backend_sponsor | 0 | ✓ |
| `sponsor_users` | ZombieSafeHouse_backend_sponsor | 0 | ✓ |
| `sponsors` | ZombieSafeHouse_backend_sponsor | 0 | ✓ |
| `subscriptions` | ZombieSafeHouse_backend_sponsor | 0 | ✓ |
| `world_allies` | social | 0 | ✓ |
| `world_attack_given` | mondo_v3 | 0 | ✓ |
| `world_blocks` | chat | 0 | ✓ |
| `world_bonus` | mondo_unico | 0 | ✓ |
| `world_buildings` | mondo_unico | 0 | ✓ |
| `world_chat` | chat | 0 | ✓ |
| `world_chat_reports` | chat | 0 | ✓ |
| `world_condo` | abitazione | 0 | ✓ |
| `world_condo_gifts` | abitazione | 0 | ✓ |
| `world_curses` | dispetti | 0 | ✓ |
| `world_defs` | zombie | 2 | ✓ |
| `world_dm` | assedio | 0 | ✓ |
| `world_excluded` | mondo_unico | 0 | ✓ |
| `world_feed` | social | 0 | ✓ |
| `world_gifts` | mondo_v4 | 0 | ✓ |
| `world_help` | mondo_v3 | 0 | ✓ |
| `world_help_given` | mondo_v3 | 0 | ✓ |
| `world_homes` | mondo_unico | 8 | ✓ |
| `world_house_req` | abitazione | 0 | ✓ |
| `world_log` | mondo_unico | 0 | ✓ |
| `world_shields` | alleanze2 | 0 | ✓ |
| `world_shouts` | social | 0 | ✓ |
| `world_terrain` | zombie | 0 | ✓ |
| `world_wallet` | mondo_unico | 0 | ✓ |
| `world_wx` | zombie | 0 | ✓ |

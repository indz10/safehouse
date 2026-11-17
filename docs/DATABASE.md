# Database (Supabase) — inventario

Generato da `docs/strumenti/schema_sql.js` (Fase 6a) a partire dai 30 file `*.sql` alla radice, nell'ordine in cui sono stati eseguiti.
Lo stato ricostruito è in `supabase/schema.sql` (eseguendo i file su un Postgres di prova con `docs/strumenti/db_locale.sh`; documento, non va eseguito). Ogni cambio d'ora in poi: `supabase/migrazioni/NNN_nome.sql`.

- Tabelle: **76** · viste: **1** · indici: **39** · regole (policy): **42** · trigger: **16** · lavori programmati: **4**
- Funzioni: **315** (315 nomi); usate (direttamente o tramite altre funzioni): **307**; **non usate: 8**

## Funzioni non usate (candidate da togliere nella Fase 6b)
Nessuna chiamata dall'app (`p*.js`, admin, negozio), dalle funzioni Edge, da trigger, cron, regole o da altre funzioni usate.
- `w_alleanza_di` — definita in: migr. 018_alleanze_gruppi, migr. 019_alleanze_multiple
- `w_atk_pts` — definita in: migr. 009_mezzi_assalti
- `world_alleanza_chat` — definita in: migr. 018_alleanze_gruppi, migr. 019_alleanze_multiple
- `world_alleanza_crea` — definita in: migr. 018_alleanze_gruppi, migr. 019_alleanze_multiple
- `world_alleanza_esci` — definita in: migr. 018_alleanze_gruppi, migr. 019_alleanze_multiple
- `world_alleanza_info` — definita in: migr. 018_alleanze_gruppi
- `world_alleanza_invita` — definita in: migr. 018_alleanze_gruppi, migr. 019_alleanze_multiple
- `world_alleanza_scrivi` — definita in: migr. 018_alleanze_gruppi, migr. 019_alleanze_multiple

## Tutte le funzioni
| funzione | app | Edge | trigger/cron/regole | chiamata da | versioni (file) |
|---|---|---|---|---|---|
| `admin_link_sponsor` | ✓ |  |  |  | 1: aggiornamento_ottobre |
| `admin_sponsor_accounts` | ✓ |  |  |  | 1: aggiornamento_ottobre |
| `admin_sponsor_set` | ✓ |  |  |  | 1: migr. 004_sponsor_iscrizione |
| `admin_world_exclude` | ✓ |  |  |  | 1: mondo_unico |
| `delete_my_account` | ✓ |  |  |  | 1: aggiornamento_ottobre |
| `is_admin` |  |  | regole | admin_link_sponsor, admin_sponsor_accounts, admin_world_exclude, world_chat_report, sponsors_guard, admin_sponsor_set | 1: ZombieSafeHouse_backend_sponsor |
| `miei_invitati` | ✓ |  |  |  | 1: aggiornamento_ottobre |
| `my_sponsor` |  |  | regole | redeem_coupon | 1: ZombieSafeHouse_backend_sponsor |
| `push_piazza` | ✓ |  |  |  | 1: migr. 007_notifiche_piazza |
| `push_subscribe` | ✓ |  |  |  | 1: push |
| `push_unsubscribe` | ✓ |  |  |  | 1: push |
| `redeem_coupon` | ✓ |  |  |  | 1: ZombieSafeHouse_backend_sponsor |
| `sponsor_pagato` |  | ✓ |  |  | 1: migr. 005_sponsor_pagamenti |
| `sponsor_request` | ✓ |  |  |  | 1: migr. 004_sponsor_iscrizione |
| `sponsor_scadenze` |  |  | cron |  | 1: migr. 005_sponsor_pagamenti |
| `sponsors_guard` |  |  | trigger |  | 1: migr. 004_sponsor_iscrizione |
| `w_ab` |  |  |  | world_trade, w_en_max, w_en_ric, w_sup_raggio, w_sped_calc, world_sup_info … | 2: migr. 020_superstite → migr. 028_attacchi |
| `w_alleanza_chiudi` |  |  |  | world_alleanza_vota, world_alleanza_risposta, world_alleanza_info, world_alleanze_mie | 2: migr. 018_alleanze_gruppi → migr. 019_alleanze_multiple |
| `w_alleanza_di` |  |  |  | world_alleanza_esci, world_alleanza_info, world_alleanza_chat, world_alleanza_scrivi | 2: migr. 018_alleanze_gruppi → migr. 019_alleanze_multiple |
| `w_allies_of` |  |  |  | w_upower, w_tr_feed, world_allies, world_team_bonus, world_my_defense, world_allies_status … | 3: aiuto_alleati → alleanze2 → migr. 018_alleanze_gruppi |
| `w_ally_state` |  |  |  | world_favs_list, world_near_survivors | 1: migr. 010_trova_preferiti |
| `w_ancora` |  |  |  | w_vicino_alleanza, w_alleanza_chiudi | 1: migr. 019_alleanze_multiple |
| `w_are_allies` |  |  |  | world_quote, world_send_help, world_give, world_feed_list, world_player, world_send_curse … | 5: mondo_v4 → social → alleanze2 → migr. 013_condominio → migr. 018_alleanze_gruppi |
| `w_ass` |  |  |  | world_assedio_info, world_assedio_inizia, world_assedio_fine, world_assedio_potenzia | 1: migr. 024_assedio |
| `w_ass_piano` |  |  |  | world_assedio_inizia | 1: migr. 024_assedio |
| `w_ass_up` |  |  |  | world_assedio_inizia, world_assedio_potenzia, world_difar_inizia | 1: migr. 024_assedio |
| `w_assalti_tick` |  |  |  | world_raid_status, world_edificio_info, world_consigli | 1: migr. 014_territorio |
| `w_atk_b` |  |  |  | w_azione | 1: migr. 014_territorio |
| `w_atk_pts` |  |  |  |  | 1: migr. 009_mezzi_assalti |
| `w_attacchi_tick` |  |  | cron | world_attacchi_miei | 3: migr. 028_attacchi → migr. 029_rinforzi → migr. 030_attacchi_alleanza |
| `w_attacco_no` |  |  |  | world_attacco_info, world_attacca, w_raduno_no, world_raduno_crea | 2: migr. 028_attacchi → migr. 030_attacchi_alleanza |
| `w_attack3` |  |  |  | world_raid_status, world_raid_view, w_home_held, w_assalti_tick | 4: mondo_v3 → zombie → zombie_alleati → fortezze |
| `w_attivita` |  |  |  | w_votanti, world_alleanza_info, world_alleanza_esci2, world_alleanze_mie | 1: migr. 018_alleanze_gruppi |
| `w_azione` |  |  |  | world_edificio_info, world_assalta, world_difendi, world_assi, world_consigli | 2: migr. 014_territorio → migr. 017_presidi_fortificazioni |
| `w_bad` |  |  |  | world_chat_send, world_dm_send, world_alleanza_fonda, world_alleanza_scrivi2 | 1: chat |
| `w_bersaglio` |  |  |  | world_attacco_info, world_attacca, w_attacchi_tick, w_raduno_no, world_raduno_crea, w_raduni_tick | 1: migr. 028_attacchi |
| `w_boost` |  |  |  | w_pay, world_status_extra | 1: equita |
| `w_boss_cella` |  |  |  | w_boss_di | 1: migr. 026_difesa_lente_boss |
| `w_boss_di` |  |  |  | world_boss_info, world_boss_inizia | 1: migr. 026_difesa_lente_boss |
| `w_boss_molt` |  |  |  | world_boss_info, world_boss_inizia | 1: migr. 026_difesa_lente_boss |
| `w_boss_settimana` |  |  |  | w_boss_di | 1: migr. 026_difesa_lente_boss |
| `w_boss_tipi` |  |  |  | w_boss_di | 1: migr. 026_difesa_lente_boss |
| `w_bottino` |  |  |  | w_attacchi_tick | 1: migr. 028_attacchi |
| `w_canon` |  |  |  | world_claim_home, world_quote, world_buy, w_target | 3: mondo_unico → mondo_unico_agg1 → abitazione |
| `w_casa_extra` |  |  |  | world_raid_status, world_raid_view, w_home_held, world_my_defense, w_threats_of, w_pres_def … | 1: migr. 014_territorio |
| `w_casa_manca_tick` |  | ✓ |  |  | 1: migr. 021_caccia_condomini |
| `w_cella` |  |  |  | w_eventi_tick | 1: migr. 022_eventi_sfide |
| `w_cleanup` |  |  |  | world_buy | 1: mondo_unico |
| `w_coinq` |  |  |  | w_upower, w_are_allies, w_allies_of, world_allies, world_team_bonus, world_my_defense … | 2: alleanze2 → migr. 013_condominio |
| `w_comb_bonus` |  |  |  | w_forza_att, w_forza_dif | 1: migr. 028_attacchi |
| `w_combat` |  |  |  | world_attacco_info, w_attacchi_tick | 1: migr. 028_attacchi |
| `w_condo_admin` |  |  |  | w_condo_bonus, world_condo_give, world_condo_info | 1: migr. 016_presidi_guida |
| `w_condo_bonus` |  |  |  | world_raid_status, world_raid_view, w_home_held, world_my_defense, w_threats_of, world_house_info … | 3: abitazione → migr. 013_condominio → migr. 016_presidi_guida |
| `w_condo_key` |  |  |  | w_condo_bonus, world_condo_give, world_house_info, w_condo_vicini, world_condo_info | 1: abitazione |
| `w_condo_vicini` |  |  |  | world_condo_break, world_condo_info | 1: migr. 013_condominio |
| `w_custodita` |  |  |  | world_raid_status, world_player, w_azione, world_edificio_info, w_attacco_no, w_attacchi_tick … | 1: migr. 014_territorio |
| `w_def` |  |  |  | w_attack3, world_def_upgrade, w_threats_of, w_atk_pts, w_fort | 2: zombie → zombie_alleati |
| `w_dist_alleanza` |  |  |  | world_alleanze_vicine, w_zona_libera, w_ancora, w_perche_no | 1: migr. 019_alleanze_multiple |
| `w_dist_km` |  |  |  | world_send_help, world_player, world_consigli, world_alleanza_invita, world_alleanza_info, world_alleanze_mie … | 1: migr. 009_mezzi_assalti |
| `w_dist_pt` |  |  |  | world_presidio_occupa, w_azione, world_consigli, world_attacco_info, world_attacca, world_attacchi_miei … | 1: migr. 014_territorio |
| `w_dot` |  |  |  | world_send_help, world_player, world_mezzo, w_azione, world_consigli | 1: migr. 009_mezzi_assalti |
| `w_en_add` |  |  |  | w_sup_inviti, world_sped_raccogli, world_sup_serie, world_sup_share, world_posto_visita | 1: migr. 020_superstite |
| `w_en_max` |  |  |  | w_sup, w_en_add, world_sup_info, world_sped_parti, world_caccia_inizia, world_evento_azione … | 1: migr. 020_superstite |
| `w_en_ric` |  |  |  | w_sup, world_sup_info, world_sped_parti, world_caccia_inizia, world_evento_azione, world_difesa_inizia … | 1: migr. 020_superstite |
| `w_eq` |  |  |  | w_sped_calc, world_sup_info, world_sup_equip, world_sped_parti, world_caccia_inizia, world_evento_azione … | 1: migr. 020_superstite |
| `w_eventi_tick` |  | ✓ |  |  | 1: migr. 022_eventi_sfide |
| `w_feed_add` |  |  |  | w_tr_feed, w_tr_dm, world_house_invite, world_house_answer, w_pres_tick, w_assalti_tick … | 1: social |
| `w_fort` |  |  |  | world_player, w_atk_b, world_edificio_info, world_consigli | 2: migr. 014_territorio → migr. 017_presidi_fortificazioni |
| `w_forza_att` |  |  |  | world_attacco_info, world_attacca, world_rinforza, w_raduno_entra | 1: migr. 028_attacchi |
| `w_forza_dif` |  |  |  | world_attacco_info, w_attacchi_tick | 1: migr. 028_attacchi |
| `w_grado` |  |  |  | w_sup_raggio, world_sup_info, world_sup_abilita, world_sped_raccogli, world_caccia_inizia, world_caccia_fine … | 1: migr. 020_superstite |
| `w_grado_xp` |  |  |  | world_sup_info | 1: migr. 020_superstite |
| `w_home_held` |  |  |  | world_raid_status, w_score, w_assalti_tick | 4: mondo_v3 → abitazione → migr. 006_presidi → migr. 014_territorio |
| `w_home_known` |  |  |  | world_view, world_quote, world_my_effects, world_presidi_list, world_edificio_info | 1: nome_casa |
| `w_in_alleanza` |  |  |  | w_alleanza_chiudi, world_alleanze_vicine, world_rank_alleanze, w_perche_no, world_alleanza_invita2, world_alleanza_esci2 … | 1: migr. 019_alleanze_multiple |
| `w_is_npc` |  |  |  | world_quote, w_tr_feed | 1: mondo_v3 |
| `w_km` |  |  |  | w_canon, world_claim_home, world_view, world_quote, world_buy, w_price2 … | 1: mondo_unico |
| `w_league` |  |  |  | world_rank_lega, world_status_extra | 1: equita |
| `w_lente_tick` |  | ✓ |  |  | 1: migr. 027_mondo_vero |
| `w_level` |  |  |  | world_quote, world_mine, world_raid_status, w_lvl_of, w_median_near, world_rank_lega | 1: mondo_unico |
| `w_lontano_costo` |  |  |  | world_send_help, world_aiuto_lontano | 1: migr. 027_mondo_vero |
| `w_lvl_of` |  |  |  | world_raid_view, w_home_held, world_help_list, world_ally_pending, world_rank, world_player … | 1: mondo_v3 |
| `w_max` |  |  |  | world_quote, world_mine, w_assalti_tick | 1: mondo_unico |
| `w_median_near` |  |  |  | w_boost, world_status_extra | 1: equita |
| `w_mezzo` |  |  |  | world_send_help, world_player, world_presidio_occupa, w_atk_pts, world_mezzo, world_set_mezzo_vero … | 1: migr. 009_mezzi_assalti |
| `w_mz_atk` |  |  |  | world_player, w_atk_pts, world_mezzo, w_atk_b, w_forza_att | 1: migr. 009_mezzi_assalti |
| `w_mz_carb` |  |  |  | world_send_help, world_player, world_presidio_occupa, w_mz_eff, w_azione, world_consigli … | 1: migr. 014_territorio |
| `w_mz_eff` |  |  |  | world_send_help, world_player, world_presidio_occupa, w_azione, world_consigli, world_attacco_info … | 1: migr. 014_territorio |
| `w_mz_help` |  |  |  | world_send_help, world_player, world_mezzo, w_azione, world_consigli | 1: migr. 009_mezzi_assalti |
| `w_mz_nome` |  |  |  | world_send_help, world_presidio_occupa, w_azione, world_assalta, world_difendi, world_attacco_info … | 1: migr. 014_territorio |
| `w_mz_range` |  |  |  | world_send_help, world_player, world_presidio_occupa, world_mezzo, w_azione, world_consigli | 1: migr. 009_mezzi_assalti |
| `w_mz_rank` |  |  |  | w_mezzo, world_buy_mezzo | 1: migr. 009_mezzi_assalti |
| `w_mz_speed` |  |  |  | world_send_help, world_player, world_mezzo, w_azione | 1: migr. 009_mezzi_assalti |
| `w_next_slot` |  |  |  | world_raid_status, world_prepare, world_ask_help, world_help_list, world_send_help, world_player … | 1: orda_mondo |
| `w_nick` |  |  |  | world_view, world_quote, world_help_list, w_settle_loans, world_give, world_gifts_in … | 1: mondo_unico |
| `w_pay` |  |  |  | w_cleanup, world_earn, world_claim_home, w_settle, world_sell, world_collect … | 3: mondo_unico → equita → migr. 020_superstite |
| `w_perche_no` |  |  |  | world_ally_request, w_alleanza_chiudi, world_alleanza_chiedi, world_alleanza_risposta, world_alleanze_vicine, world_alleanza_invita2 … | 1: migr. 019_alleanze_multiple |
| `w_piazza_nuovi` |  | ✓ |  |  | 1: migr. 007_notifiche_piazza |
| `w_power3` |  |  |  | world_raid_status, world_raid_view, w_home_held, w_assalti_tick | 1: mondo_v3 |
| `w_pres_attack` |  |  |  | w_pres_tick | 1: migr. 006_presidi |
| `w_pres_bonus` |  |  |  | world_raid_status, world_raid_view, w_home_held, world_my_defense, w_threats_of, w_assalti_tick … | 2: migr. 006_presidi → migr. 014_territorio |
| `w_pres_def` |  |  |  | w_pres_tick, world_presidi_list, world_presidio_guardia | 3: migr. 006_presidi → migr. 014_territorio → migr. 017_presidi_fortificazioni |
| `w_pres_liv` |  |  |  | w_pres_def, world_presidi_list, w_fort, world_pres_fortifica | 1: migr. 017_presidi_fortificazioni |
| `w_pres_near` |  |  |  | world_presidi_seed, world_presidi_list, world_consigli | 1: migr. 006_presidi |
| `w_pres_rendita` |  |  |  | w_pres_tick | 2: migr. 012_risorse_ricompense → migr. 016_presidi_guida |
| `w_pres_tick` |  |  | cron | world_presidi_list, world_presidio_occupa, world_presidio_guardia, world_edificio_info, world_consigli | 4: migr. 006_presidi → migr. 012_risorse_ricompense → migr. 014_territorio → migr. 017_presidi_fortificazioni |
| `w_prev_slot` |  |  |  | world_raid_status, world_raid_view, w_pres_tick, world_presidio_occupa, w_assalti_tick, world_edificio_info | 1: orda_mondo |
| `w_price` |  |  |  | world_collect, w_price2, world_edificio_info, world_consigli | 1: mondo_unico |
| `w_price2` |  |  |  | world_quote | 2: mondo_v3 → equita |
| `w_pvp_cfg` |  |  |  | w_viaggio_min, w_comb_bonus, w_forza_att, w_combat, w_bottino, w_attacco_no … | 3: migr. 028_attacchi → migr. 029_rinforzi → migr. 030_attacchi_alleanza |
| `w_radius` |  |  |  | world_mine | 1: mondo_unico |
| `w_raduni_tick` |  |  |  | w_attacchi_tick, world_raduno_parti | 1: migr. 030_attacchi_alleanza |
| `w_raduno_entra` |  |  |  | world_raduno_crea, world_raduno_unisciti | 1: migr. 030_attacchi_alleanza |
| `w_raduno_no` |  |  |  | world_attacchi_miei, w_raduno_entra | 1: migr. 030_attacchi_alleanza |
| `w_raduno_rimborsa` |  |  |  | world_raduno_annulla, w_raduni_tick | 1: migr. 030_attacchi_alleanza |
| `w_raid_houses` |  |  |  | world_raid_status | 1: orda_mondo |
| `w_res` |  |  |  | world_earn, world_raid_claim, world_send_help, w_pres_rendita, w_assalti_tick, world_presenza … | 1: migr. 012_risorse_ricompense |
| `w_rift` |  |  |  | w_are_allies, w_allies_of, w_coinq, world_condo_break, world_condo_info | 1: migr. 013_condominio |
| `w_rinf_no` |  |  |  | world_rinforza | 1: migr. 029_rinforzi |
| `w_rinf_tot` |  |  |  | w_attacchi_tick, world_attacchi_miei, world_rinforzi_info | 1: migr. 029_rinforzi |
| `w_room` |  |  |  | world_chat_send, world_chat_list | 1: chat |
| `w_score` |  |  |  | world_rank, world_rank_lega, world_score, world_rank_alleanze | 1: classifica |
| `w_settimana` |  |  |  | world_sfida_quartiere, w_sfida_premi | 1: migr. 022_eventi_sfide |
| `w_settle` |  |  |  | world_mine | 1: mondo_unico |
| `w_settle_loans` |  |  |  | world_mine2 | 2: mondo_v4 → migr. 001_funzioni_mancanti |
| `w_sfida_premi` |  | ✓ |  |  | 1: migr. 022_eventi_sfide |
| `w_sfida_punti` |  |  |  | world_sfida_quartiere, w_sfida_premi | 1: migr. 022_eventi_sfide |
| `w_shielded` |  |  |  | world_player, world_send_curse, world_welcome, world_status_extra, world_rivals, w_azione … | 2: equita → migr. 014_territorio |
| `w_slope` |  |  |  | w_attack3, w_threats_of | 2: zombie → zombie_alleati |
| `w_slot_id` |  |  |  | world_raid_status, world_prepare, world_raid_view, world_ask_help, world_help_list, world_send_help … | 1: orda_mondo |
| `w_slot_t` |  |  |  | w_pres_bonus | 1: migr. 006_presidi |
| `w_sped_calc` |  |  |  | world_sped_parti | 1: migr. 020_superstite |
| `w_sped_costo` |  |  |  | world_sped_parti | 1: migr. 027_mondo_vero |
| `w_sped_km` |  |  |  | world_sped_parti, world_eventi_vicini, world_evento_azione | 1: migr. 020_superstite |
| `w_sped_tick` |  | ✓ |  |  | 1: migr. 020_superstite |
| `w_squadra` |  |  |  | w_attacchi_tick, world_attacchi_miei, w_raduni_tick | 1: migr. 030_attacchi_alleanza |
| `w_sup` |  |  |  | w_en_add, w_sup_inviti, world_sup_info, world_sup_abilita, world_sup_equip, world_sped_parti … | 1: migr. 020_superstite |
| `w_sup_inviti` |  |  |  | world_sup_info | 1: migr. 020_superstite |
| `w_sup_raggio` |  |  |  | world_sup_info, world_sped_parti, world_eventi_vicini, world_evento_azione | 2: migr. 020_superstite → migr. 021_caccia_condomini |
| `w_target` |  |  |  | w_azione, world_edificio_info | 1: migr. 014_territorio |
| `w_threats_of` |  |  |  | world_threats, world_ally_view, world_allies_status | 7: alleati_sim → zombie_alleati → fortezze → abitazione → migr. 002_formule_uguali → migr. 006_presidi → migr. 014_territorio |
| `w_tr_casa_pos` |  |  | trigger |  | 1: migr. 015_posizione_casa |
| `w_tr_dm` |  |  | trigger |  | 1: assedio |
| `w_tr_feed` |  |  | trigger |  | 4: social → aiuto_alleati → dispetti → alleanze2 |
| `w_tr_feed_push` |  |  | trigger |  | 1: migr. 011_notifiche_subito |
| `w_tr_invite_join` |  |  | trigger |  | 1: migr. 011_notifiche_subito |
| `w_tr_pos_casa` |  |  | trigger |  | 1: migr. 015_posizione_casa |
| `w_upower` |  |  |  | world_raid_status, world_raid_view, w_home_held, w_threats_of, w_assalti_tick, w_forza_dif | 6: mondo_v3 → dispetti → alleanze2 → casavera → squadra_fix → migr. 009_mezzi_assalti |
| `w_viaggio_min` |  |  |  | world_attacco_info, world_attacca, world_attacchi_miei, w_rinf_no, world_rinforzi_info, world_rinforza … | 1: migr. 028_attacchi |
| `w_vicino_alleanza` |  |  |  | w_perche_no | 2: migr. 018_alleanze_gruppi → migr. 019_alleanze_multiple |
| `w_votanti` |  |  |  | w_alleanza_chiudi, world_alleanza_chiedi, world_alleanza_info, world_alleanza_invita2, world_alleanze_mie | 1: migr. 018_alleanze_gruppi |
| `w_wallet` |  |  |  | w_pay, world_earn, world_claim_home, world_collect, world_mine, world_raid_status … | 1: mondo_unico |
| `w_wxev` |  |  |  | w_attack3, w_threats_of | 2: zombie → zombie_alleati |
| `w_xp` |  |  |  | w_pay, world_sped_raccogli, world_sup_serie, world_sup_share, world_caccia_fine, world_evento_azione … | 1: migr. 020_superstite |
| `w_zm` |  |  |  | w_attack3, w_threats_of | 2: zombie → zombie_alleati |
| `w_zm_ora` |  |  |  | world_zombie_vicini, w_zm_trova, w_lente_tick | 1: migr. 025_zombie_mondo |
| `w_zm_qua` |  |  |  | world_zombie_vicini, w_zm_trova, w_lente_tick | 1: migr. 025_zombie_mondo |
| `w_zm_tipi` |  |  |  | w_zm_qua, world_zombie_lotta, world_zombie_fine, world_zombipedia, w_lente_tick | 1: migr. 025_zombie_mondo |
| `w_zm_trova` |  |  |  | world_zombie_lotta, world_zombie_fine, world_cassa_apri | 1: migr. 025_zombie_mondo |
| `w_zona_libera` |  |  |  | w_ancora, world_alleanza_fonda | 1: migr. 019_alleanze_multiple |
| `w_ztypes` |  |  |  | w_attack3, w_threats_of | 3: zombie → zombie_alleati → fortezze |
| `world_aiuto_lontano` | ✓ |  |  |  | 1: migr. 027_mondo_vero |
| `world_alleanza_chat` |  |  |  |  | 2: migr. 018_alleanze_gruppi → migr. 019_alleanze_multiple |
| `world_alleanza_chat2` | ✓ |  |  | world_alleanza_chat | 1: migr. 019_alleanze_multiple |
| `world_alleanza_chiedi` | ✓ |  |  | world_ally_request | 2: migr. 018_alleanze_gruppi → migr. 019_alleanze_multiple |
| `world_alleanza_crea` |  |  |  |  | 2: migr. 018_alleanze_gruppi → migr. 019_alleanze_multiple |
| `world_alleanza_esci` |  |  |  |  | 2: migr. 018_alleanze_gruppi → migr. 019_alleanze_multiple |
| `world_alleanza_esci2` | ✓ |  |  | world_alleanza_esci | 1: migr. 019_alleanze_multiple |
| `world_alleanza_fonda` | ✓ |  |  | world_alleanza_crea | 1: migr. 019_alleanze_multiple |
| `world_alleanza_info` |  |  |  |  | 1: migr. 018_alleanze_gruppi |
| `world_alleanza_invita` |  |  |  |  | 2: migr. 018_alleanze_gruppi → migr. 019_alleanze_multiple |
| `world_alleanza_invita2` | ✓ |  |  | world_ally_request, world_alleanza_invita | 1: migr. 019_alleanze_multiple |
| `world_alleanza_risposta` | ✓ |  |  |  | 2: migr. 018_alleanze_gruppi → migr. 019_alleanze_multiple |
| `world_alleanza_scrivi` |  |  |  |  | 2: migr. 018_alleanze_gruppi → migr. 019_alleanze_multiple |
| `world_alleanza_scrivi2` | ✓ |  |  | world_alleanza_scrivi | 1: migr. 019_alleanze_multiple |
| `world_alleanza_vota` | ✓ |  |  |  | 1: migr. 018_alleanze_gruppi |
| `world_alleanze_mie` | ✓ |  |  |  | 1: migr. 019_alleanze_multiple |
| `world_alleanze_vicine` | ✓ |  |  |  | 2: migr. 018_alleanze_gruppi → migr. 019_alleanze_multiple |
| `world_allies` | ✓ |  |  |  | 3: mondo_v4 → social → alleanze2 |
| `world_allies_status` | ✓ |  |  |  | 2: alleati_sim → zombie_alleati |
| `world_ally_answer` | ✓ |  |  |  | 1: social |
| `world_ally_pending` | ✓ |  |  |  | 1: social |
| `world_ally_request` | ✓ |  |  |  | 3: social → migr. 018_alleanze_gruppi → migr. 019_alleanze_multiple |
| `world_ally_shield` | ✓ |  |  |  | 1: alleanze2 |
| `world_ally_view` | ✓ |  |  |  | 2: alleati_sim → zombie_alleati |
| `world_ask_help` | ✓ |  |  |  | 1: mondo_v3 |
| `world_assalta` | ✓ |  |  |  | 2: migr. 014_territorio → migr. 028_attacchi |
| `world_assedio_bomba` | ✓ |  |  |  | 1: migr. 024_assedio |
| `world_assedio_fine` | ✓ |  |  |  | 1: migr. 024_assedio |
| `world_assedio_info` | ✓ |  |  |  | 1: migr. 024_assedio |
| `world_assedio_inizia` | ✓ |  |  |  | 1: migr. 024_assedio |
| `world_assedio_potenzia` | ✓ |  |  |  | 1: migr. 024_assedio |
| `world_assi` | ✓ |  |  |  | 1: migr. 014_territorio |
| `world_attacca` | ✓ |  |  |  | 1: migr. 028_attacchi |
| `world_attacchi_miei` | ✓ |  |  |  | 3: migr. 028_attacchi → migr. 029_rinforzi → migr. 030_attacchi_alleanza |
| `world_attacco_info` | ✓ |  |  |  | 2: migr. 028_attacchi → migr. 030_attacchi_alleanza |
| `world_block` | ✓ |  |  |  | 1: chat |
| `world_boss_fine` | ✓ |  |  |  | 1: migr. 026_difesa_lente_boss |
| `world_boss_info` | ✓ |  |  |  | 1: migr. 026_difesa_lente_boss |
| `world_boss_inizia` | ✓ |  |  |  | 1: migr. 026_difesa_lente_boss |
| `world_bottega_compra` | ✓ |  |  |  | 1: migr. 023_difendi_casa |
| `world_buy` | ✓ |  |  |  | 4: mondo_unico → mondo_unico_agg1 → casa_abitata → nome_casa |
| `world_buy_mezzo` | ✓ |  |  |  | 1: migr. 009_mezzi_assalti |
| `world_caccia_fine` | ✓ |  |  |  | 1: migr. 021_caccia_condomini |
| `world_caccia_inizia` | ✓ |  |  |  | 1: migr. 021_caccia_condomini |
| `world_cassa_apri` | ✓ |  |  |  | 1: migr. 025_zombie_mondo |
| `world_chat_list` | ✓ |  |  |  | 1: chat |
| `world_chat_report` | ✓ |  |  |  | 1: chat |
| `world_chat_send` | ✓ |  |  |  | 1: chat |
| `world_claim_home` | ✓ |  |  |  | 3: mondo_unico → mondo_unico_agg1 → abitazione |
| `world_collect` | ✓ |  |  |  | 2: mondo_unico → migr. 014_territorio |
| `world_condo_break` | ✓ |  |  |  | 1: migr. 013_condominio |
| `world_condo_give` | ✓ |  |  |  | 2: abitazione → migr. 016_presidi_guida |
| `world_condo_info` | ✓ |  |  |  | 2: migr. 013_condominio → migr. 016_presidi_guida |
| `world_condo_peace` | ✓ |  |  |  | 1: migr. 013_condominio |
| `world_consigli` | ✓ |  |  |  | 1: migr. 016_presidi_guida |
| `world_coresidents` | ✓ |  |  |  | 1: residenti |
| `world_def_upgrade` | ✓ |  |  |  | 4: zombie → zombie_alleati → assedio → fortezze |
| `world_difar_fine` | ✓ |  |  |  | 1: migr. 026_difesa_lente_boss |
| `world_difar_inizia` | ✓ |  |  |  | 1: migr. 026_difesa_lente_boss |
| `world_difendi` | ✓ |  |  |  | 1: migr. 014_territorio |
| `world_difesa_bomba` | ✓ |  |  |  | 1: migr. 023_difendi_casa |
| `world_difesa_fine` | ✓ |  |  |  | 1: migr. 023_difendi_casa |
| `world_difesa_inizia` | ✓ |  |  |  | 1: migr. 023_difendi_casa |
| `world_dm_list` | ✓ |  |  |  | 1: assedio |
| `world_dm_send` | ✓ |  |  |  | 1: assedio |
| `world_dm_threads` | ✓ |  |  |  | 1: assedio |
| `world_earn` | ✓ |  |  |  | 2: mondo_unico → migr. 012_risorse_ricompense |
| `world_edificio_info` | ✓ |  |  |  | 2: migr. 014_territorio → migr. 017_presidi_fortificazioni |
| `world_eventi_vicini` | ✓ |  |  |  | 1: migr. 022_eventi_sfide |
| `world_evento_azione` | ✓ |  |  |  | 1: migr. 022_eventi_sfide |
| `world_fav_set` | ✓ |  |  |  | 1: migr. 010_trova_preferiti |
| `world_favs_list` | ✓ |  |  |  | 1: migr. 010_trova_preferiti |
| `world_feed_list` | ✓ |  |  |  | 1: social |
| `world_find` | ✓ |  |  |  | 1: squadra_fix |
| `world_gift_claim` | ✓ |  |  |  | 2: mondo_v4 → migr. 001_funzioni_mancanti |
| `world_gifts_in` | ✓ |  |  |  | 2: mondo_v4 → migr. 001_funzioni_mancanti |
| `world_give` | ✓ |  |  |  | 2: mondo_v4 → alleanze2 |
| `world_help_list` | ✓ |  |  |  | 1: mondo_v3 |
| `world_home_vis` | ✓ |  |  |  | 1: nome_casa |
| `world_house_answer` | ✓ |  |  |  | 1: abitazione |
| `world_house_info` | ✓ |  |  |  | 2: abitazione → migr. 008_cooperazione |
| `world_house_invite` | ✓ |  |  |  | 1: abitazione |
| `world_house_leave` | ✓ |  |  |  | 1: abitazione |
| `world_house_log` | ✓ |  |  |  | 2: assedio → migr. 001_funzioni_mancanti |
| `world_inviter` | ✓ |  |  |  | 2: benvenuto → migr. 001_funzioni_mancanti |
| `world_loans` | ✓ |  |  |  | 2: mondo_v4 → migr. 001_funzioni_mancanti |
| `world_mezzo` | ✓ |  |  |  | 1: migr. 009_mezzi_assalti |
| `world_mine` | ✓ |  |  | world_mine2 | 1: mondo_unico |
| `world_mine2` | ✓ |  |  |  | 2: mondo_v4 → migr. 001_funzioni_mancanti |
| `world_my_defense` | ✓ |  |  |  | 6: casavera → squadra_fix → migr. 002_formule_uguali → migr. 006_presidi → migr. 009_mezzi_assalti → migr. 014_territorio |
| `world_my_effects` | ✓ |  |  |  | 3: assedio → casa_abitata → nome_casa |
| `world_near_survivors` | ✓ |  |  |  | 1: migr. 010_trova_preferiti |
| `world_player` | ✓ |  |  |  | 3: social → migr. 009_mezzi_assalti → migr. 014_territorio |
| `world_posto_visita` | ✓ |  |  |  | 1: migr. 027_mondo_vero |
| `world_prepare` | ✓ |  |  |  | 1: orda_mondo |
| `world_pres_fortifica` | ✓ |  |  |  | 1: migr. 017_presidi_fortificazioni |
| `world_presenza` | ✓ |  |  |  | 1: migr. 014_territorio |
| `world_presidi_list` | ✓ |  |  |  | 2: migr. 006_presidi → migr. 017_presidi_fortificazioni |
| `world_presidi_seed` | ✓ |  |  |  | 2: migr. 006_presidi → migr. 016_presidi_guida |
| `world_presidio_guardia` | ✓ |  |  |  | 1: migr. 006_presidi |
| `world_presidio_lascia` | ✓ |  |  |  | 1: migr. 006_presidi |
| `world_presidio_occupa` | ✓ |  |  |  | 2: migr. 006_presidi → migr. 016_presidi_guida |
| `world_quote` | ✓ |  |  | world_buy | 5: mondo_unico → mondo_unico_agg1 → mondo_v3 → casa_abitata → nome_casa |
| `world_raduno_annulla` | ✓ |  |  |  | 1: migr. 030_attacchi_alleanza |
| `world_raduno_crea` | ✓ |  |  |  | 1: migr. 030_attacchi_alleanza |
| `world_raduno_parti` | ✓ |  |  |  | 1: migr. 030_attacchi_alleanza |
| `world_raduno_unisciti` | ✓ |  |  |  | 1: migr. 030_attacchi_alleanza |
| `world_raid_claim` | ✓ |  |  |  | 3: orda_mondo → mondo_v3 → migr. 012_risorse_ricompense |
| `world_raid_status` | ✓ |  |  | world_raid_claim | 6: orda_mondo → mondo_v3 → migr. 002_formule_uguali → migr. 006_presidi → migr. 012_risorse_ricompense → migr. 014_territorio |
| `world_raid_view` | ✓ |  |  |  | 5: orda_mondo → mondo_v3 → migr. 002_formule_uguali → migr. 006_presidi → migr. 014_territorio |
| `world_rank` | ✓ |  |  |  | 2: social → classifica |
| `world_rank_alleanze` | ✓ |  |  |  | 2: migr. 018_alleanze_gruppi → migr. 019_alleanze_multiple |
| `world_rank_lega` | ✓ |  |  |  | 2: equita → classifica |
| `world_resources` | ✓ |  |  |  | 1: migr. 012_risorse_ricompense |
| `world_reward` | ✓ |  |  |  | 1: premi |
| `world_rinforza` | ✓ |  |  |  | 1: migr. 029_rinforzi |
| `world_rinforzi_chiedi` | ✓ |  |  |  | 1: migr. 029_rinforzi |
| `world_rinforzi_info` | ✓ |  |  |  | 1: migr. 029_rinforzi |
| `world_ripara` | ✓ |  |  |  | 1: migr. 028_attacchi |
| `world_rivals` | ✓ |  |  |  | 3: mondo_v3 → equita → alleanze2 |
| `world_saccheggia` | ✓ |  |  |  | 2: migr. 014_territorio → migr. 028_attacchi |
| `world_score` | ✓ |  |  |  | 1: classifica |
| `world_seen` | ✓ |  |  |  | 1: mondo_unico |
| `world_sell` | ✓ |  |  |  | 1: mondo_unico |
| `world_send_attack` | ✓ |  |  |  | 6: mondo_v3 → equita → alleanze2 → migr. 009_mezzi_assalti → migr. 014_territorio → migr. 028_attacchi |
| `world_send_curse` | ✓ |  |  |  | 2: dispetti → equita |
| `world_send_help` | ✓ |  |  |  | 7: mondo_v3 → alleati_sim → zombie_alleati → migr. 009_mezzi_assalti → migr. 012_risorse_ricompense → migr. 014_territorio → migr. 027_mondo_vero |
| `world_set_home` | ✓ |  |  |  | 1: abitazione |
| `world_set_mezzo_vero` | ✓ |  |  |  | 1: migr. 009_mezzi_assalti |
| `world_set_realshield` | ✓ |  |  |  | 1: casavera |
| `world_sfida_quartiere` | ✓ |  |  |  | 1: migr. 022_eventi_sfide |
| `world_shape_get` | ✓ |  |  |  | 1: migr. 003_forme_edifici |
| `world_shape_put` | ✓ |  |  |  | 1: migr. 003_forme_edifici |
| `world_shout` | ✓ |  |  |  | 1: social |
| `world_sped_parti` | ✓ |  |  |  | 3: migr. 020_superstite → migr. 021_caccia_condomini → migr. 027_mondo_vero |
| `world_sped_raccogli` | ✓ |  |  |  | 2: migr. 020_superstite → migr. 021_caccia_condomini |
| `world_status_extra` | ✓ |  |  |  | 1: equita |
| `world_sup_abilita` | ✓ |  |  |  | 2: migr. 020_superstite → migr. 028_attacchi |
| `world_sup_equip` | ✓ |  |  |  | 1: migr. 020_superstite |
| `world_sup_extra` | ✓ |  |  |  | 1: migr. 023_difendi_casa |
| `world_sup_info` | ✓ |  |  |  | 1: migr. 020_superstite |
| `world_sup_serie` | ✓ |  |  |  | 1: migr. 020_superstite |
| `world_sup_share` | ✓ |  |  |  | 1: migr. 020_superstite |
| `world_team_bonus` | ✓ |  |  |  | 1: alleanze2 |
| `world_threats` | ✓ |  |  |  | 3: zombie → alleati_sim → zombie_alleati |
| `world_trade` | ✓ |  |  |  | 2: migr. 012_risorse_ricompense → migr. 020_superstite |
| `world_upgrade` | ✓ |  |  |  | 1: mondo_unico |
| `world_view` | ✓ |  |  |  | 4: mondo_unico → residenti → casa_abitata → nome_casa |
| `world_welcome` | ✓ |  |  |  | 1: equita |
| `world_zombie_fine` | ✓ |  |  |  | 2: migr. 025_zombie_mondo → migr. 027_mondo_vero |
| `world_zombie_lotta` | ✓ |  |  |  | 1: migr. 025_zombie_mondo |
| `world_zombie_vicini` | ✓ |  |  |  | 1: migr. 025_zombie_mondo |
| `world_zombipedia` | ✓ |  |  |  | 1: migr. 025_zombie_mondo |
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
| `push_subs` | push | 2 | ✓ |
| `reviews` | ZombieSafeHouse_backend_sponsor | 0 | ✓ |
| `salvataggi` | ZombieSafeHouse_backend_sponsor | 0 | ✓ |
| `sponsor_events` | ZombieSafeHouse_backend_sponsor | 4 | ✓ |
| `sponsor_prezzi` | supabase/migrazioni/005_sponsor_pagamenti | 0 | ✓ |
| `sponsor_users` | ZombieSafeHouse_backend_sponsor | 0 | ✓ |
| `sponsors` | ZombieSafeHouse_backend_sponsor | 8 | ✓ |
| `subscriptions` | ZombieSafeHouse_backend_sponsor | 0 | ✓ |
| `world_alleanze` | supabase/migrazioni/018_alleanze_gruppi | 0 | ✓ |
| `world_alleanze_chat` | supabase/migrazioni/018_alleanze_gruppi | 0 | ✓ |
| `world_alleanze_domande` | supabase/migrazioni/018_alleanze_gruppi | 0 | ✓ |
| `world_alleanze_membri` | supabase/migrazioni/018_alleanze_gruppi | 4 | ✓ |
| `world_allies` | social | 0 | ✓ |
| `world_assalti` | supabase/migrazioni/014_territorio | 0 | ✓ |
| `world_assalti_esiti` | supabase/migrazioni/014_territorio | 0 | ✓ |
| `world_assedio` | supabase/migrazioni/024_assedio | 0 | ✓ |
| `world_assedio_partite` | supabase/migrazioni/024_assedio | 0 | ✓ |
| `world_attacchi` | supabase/migrazioni/028_attacchi | 4 | ✓ |
| `world_attacchi_rinforzi` | supabase/migrazioni/029_rinforzi | 0 | ✓ |
| `world_attack_given` | mondo_v3 | 1 | ✓ |
| `world_blocks` | chat | 0 | ✓ |
| `world_bonus` | mondo_unico | 0 | ✓ |
| `world_boss` | supabase/migrazioni/026_difesa_lente_boss | 0 | ✓ |
| `world_boss_colpi` | supabase/migrazioni/026_difesa_lente_boss | 0 | ✓ |
| `world_buildings` | mondo_unico | 1 | ✓ |
| `world_cacce` | supabase/migrazioni/021_caccia_condomini | 0 | ✓ |
| `world_chat` | chat | 0 | ✓ |
| `world_chat_reports` | chat | 0 | ✓ |
| `world_condo` | abitazione | 0 | ✓ |
| `world_condo_gifts` | abitazione | 0 | ✓ |
| `world_condo_rifts` | supabase/migrazioni/013_condominio | 0 | ✓ |
| `world_curses` | dispetti | 0 | ✓ |
| `world_defs` | zombie | 2 | ✓ |
| `world_difar` | supabase/migrazioni/026_difesa_lente_boss | 0 | ✓ |
| `world_dm` | assedio | 0 | ✓ |
| `world_eventi` | supabase/migrazioni/022_eventi_sfide | 0 | ✓ |
| `world_eventi_azioni` | supabase/migrazioni/022_eventi_sfide | 0 | ✓ |
| `world_excluded` | mondo_unico | 0 | ✓ |
| `world_favs` | supabase/migrazioni/010_trova_preferiti | 0 | ✓ |
| `world_feed` | social | 0 | ✓ |
| `world_gifts` | mondo_v4 | 0 | ✓ |
| `world_help` | mondo_v3 | 0 | ✓ |
| `world_help_given` | mondo_v3 | 1 | ✓ |
| `world_homes` | mondo_unico | 11 | ✓ |
| `world_house_req` | abitazione | 0 | ✓ |
| `world_log` | mondo_unico | 0 | ✓ |
| `world_partite` | supabase/migrazioni/023_difendi_casa | 0 | ✓ |
| `world_posti_visite` | supabase/migrazioni/027_mondo_vero | 0 | ✓ |
| `world_pres_defs` | supabase/migrazioni/017_presidi_fortificazioni | 0 | ✓ |
| `world_presidi` | supabase/migrazioni/006_presidi | 0 | ✓ |
| `world_presidi_guardie` | supabase/migrazioni/006_presidi | 0 | ✓ |
| `world_presidi_tenute` | supabase/migrazioni/006_presidi | 0 | ✓ |
| `world_raduni` | supabase/migrazioni/030_attacchi_alleanza | 0 | ✓ |
| `world_raduni_membri` | supabase/migrazioni/030_attacchi_alleanza | 0 | ✓ |
| `world_sfide_fatte` | supabase/migrazioni/022_eventi_sfide | 0 | ✓ |
| `world_sfide_premi` | supabase/migrazioni/022_eventi_sfide | 0 | ✓ |
| `world_shapes` | supabase/migrazioni/003_forme_edifici | 0 | ✓ |
| `world_shields` | alleanze2 | 0 | ✓ |
| `world_shouts` | social | 0 | ✓ |
| `world_spedizioni` | supabase/migrazioni/020_superstite | 2 | ✓ |
| `world_superstite` | supabase/migrazioni/020_superstite | 2 | ✓ |
| `world_terrain` | zombie | 0 | ✓ |
| `world_wallet` | mondo_unico | 3 | ✓ |
| `world_wx` | zombie | 0 | ✓ |
| `world_zombie_lotte` | supabase/migrazioni/025_zombie_mondo | 0 | ✓ |
| `world_zombie_presi` | supabase/migrazioni/025_zombie_mondo | 0 | ✓ |

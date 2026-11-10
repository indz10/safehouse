-- ZombieSafeHouse · CONTROLLO NOTIFICHE (solo lettura, non cambia niente) — Fase 6d
-- Dice se l'orologio del database chiama zsh-push, se la funzione risponde e quante notifiche partono.
select 'telefoni iscritti alle notifiche' as cosa, count(*)::text as valore from public.push_subs
union all select 'di cui con account', count(*)::text from public.push_subs where user_id is not null
union all select 'chiavi delle notifiche create', count(*)::text from public.push_keys
union all select 'orologio zsh-push-tick', coalesce((select schedule || case when active then ' (attivo)' else ' (SPENTO)' end from cron.job where jobname = 'zsh-push-tick'), 'MANCA')
union all select 'chiamate dell''orologio nelle ultime 24 ore', (select count(*)::text from cron.job_run_details d join cron.job j on j.jobid = d.jobid where j.jobname = 'zsh-push-tick' and d.start_time > now() - interval '1 day')
union all select 'di cui fallite', (select count(*)::text from cron.job_run_details d join cron.job j on j.jobid = d.jobid where j.jobname = 'zsh-push-tick' and d.start_time > now() - interval '1 day' and d.status <> 'succeeded')
union all select 'risposte di zsh-push nelle ultime 24 ore (codice: quante)', coalesce((select string_agg(status_code::text || ': ' || n, ', ') from (select status_code, count(*) n from net._http_response where created > now() - interval '1 day' group by 1) x), 'nessuna')
union all select 'avvisi d''orda inviati negli ultimi 3 giorni', (select count(*)::text from public.push_log where created_at > now() - interval '3 days')
union all select 'ultimo avviso inviato', coalesce((select max(created_at)::text from public.push_log), 'mai')
union all select 'meteo vero salvato per la prossima orda (case)', (select count(*)::text from public.world_wx where slot_id = public.w_slot_id(public.w_next_slot(now())))
union all select 'pendenza salvata (case)', (select count(*)::text from public.world_terrain);

-- ZombieSafeHouse · CONTROLLO NOTIFICHE DEI MESSAGGI (solo lettura, non cambia niente) — migrazione 011
-- Per le ultime novità personali (messaggi, alleanze…) dice: a chi erano, se quel telefono è iscritto alle
-- notifiche, se il server le ha già avvisate; poi le ultime risposte della funzione zsh-push.
select * from (
  select 1 as n, to_char(f.created_at at time zone 'Europe/Rome','DD/MM HH24:MI:SS') as quando,
    f.kind || ' da @' || coalesce((select nick from public.profili_pubblici where user_id = f.actor),'?') || ' a @' || coalesce((select nick from public.profili_pubblici where user_id = f.target),'?') as cosa,
    'telefoni con notifiche: ' || (select count(*) from public.push_subs s where s.user_id = f.target)
      || ' · avvisata: ' || case when exists (select 1 from public.push_subs s where s.user_id = f.target and s.last_feed >= f.created_at) then 'sì' else 'no' end as stato
  from public.world_feed f where f.target is not null order by f.created_at desc limit 6) a
union all
select 2, '—', 'avviso subito (trigger world_feed_push)', case when exists (select 1 from pg_trigger where tgname = 'world_feed_push') then 'presente' else 'MANCA: esegui 011' end
union all
select * from (
  select 3, to_char(r.created at time zone 'Europe/Rome','DD/MM HH24:MI:SS'), 'risposta zsh-push: ' || coalesce(r.status_code::text, 'nessuna'),
    left(coalesce(r.content::text, r.error_msg, ''), 140)
  from net._http_response r order by r.created desc limit 6) b
order by 1, 2 desc;

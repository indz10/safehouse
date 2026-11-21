-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 045 — 🔔 NOTIFICHE SEMPRE ATTIVE (21/11)
-- Quando Apple/Google dicono che l'iscrizione di un telefono è scaduta, zsh-push la toglie dall'elenco.
-- Da ora l'app, a ogni apertura, si riscrive da sola (push_subscribe): la risposta dice se il telefono
-- era già in elenco ('nuovo' = false) o se era stato tolto ('nuovo' = true); in quel caso l'app chiede al
-- telefono un'iscrizione nuova e la salva. Le notifiche si spengono solo se lo decide il giocatore.
-- Si può eseguire più volte.
-- =====================================================================
create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text) returns json
language plpgsql security definer set search_path = public as $$
declare c boolean;
begin
  if auth.uid() is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  c := exists (select 1 from public.push_subs where endpoint = p_endpoint);
  insert into public.push_subs(endpoint, user_id, p256dh, auth) values (p_endpoint, auth.uid(), p_p256dh, p_auth)
    on conflict (endpoint) do update set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth;
  return json_build_object('ok', true, 'nuovo', not c);
end $$;
grant execute on function public.push_subscribe(text, text, text) to authenticated;

-- controllo: deve dire "notifiche pronte"
select case when pg_get_functiondef('public.push_subscribe(text,text,text)'::regprocedure) like '%nuovo%' then 'notifiche pronte' else 'qualcosa manca' end as esito;

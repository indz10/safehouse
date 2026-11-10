-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 001 — funzioni mancanti (Fase 6b)
-- Il controllo del 10/11/2026 (supabase/controllo/) ha trovato che nel database vero mancano 7 funzioni
-- che l'app usa (da mondo_v4.sql, assedio.sql e benvenuto.sql, eseguiti solo in parte):
--   world_gifts_in, world_gift_claim  → ritiro dei regali ricevuti dagli alleati
--   world_loans, w_settle_loans       → prestiti di Mattoni (elenco e restituzione dopo 3 giorni)
--   world_mine2                       → le mie case + restituzione dei prestiti scaduti
--   world_house_log                   → diario delle modifiche della casa
--   world_inviter                     → chi ti ha invitato (schermata di benvenuto)
-- Toglie anche 3 funzioni che nessuno usa più: w_attack, w_power (sostituite da w_attack3/w_power3), world_blocked.
-- Non tocca tabelle né dati. Si può eseguire più volte.
-- Le funzioni sono copiate identiche dall'ultima versione nei file (vedi supabase/schema.sql).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.w_settle_loans(p_user uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r record; bal int; take int;
begin
  for r in select * from public.world_gifts where kind = 'mattoni' and loan and left_due > 0 and due_at <= now()
             and (to_u = p_user or from_u = p_user) order by due_at limit 20 loop
    select mattoni into bal from public.world_wallet where user_id = r.to_u for update;
    take := least(coalesce(bal,0), r.left_due);
    if take > 0 then
      update public.world_wallet set mattoni = mattoni - take where user_id = r.to_u;
      insert into public.world_log(user_id, delta, reason, seen) values (r.to_u, -take, 'Prestito restituito a @' || public.w_nick(r.from_u), false);
      -- la restituzione non conta come guadagno: non fa salire di livello
      perform public.w_wallet(r.from_u);
      update public.world_wallet set mattoni = mattoni + take where user_id = r.from_u;
      insert into public.world_log(user_id, delta, reason) values (r.from_u, take, 'Prestito restituito da @' || public.w_nick(r.to_u));
      update public.world_gifts set left_due = left_due - take where id = r.id;
    end if;
  end loop;
end $function$

;

CREATE OR REPLACE FUNCTION public.world_gifts_in()
 RETURNS TABLE(id bigint, kind text, amount integer, nick text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select g.id, g.kind, g.amount, public.w_nick(g.from_u) from public.world_gifts g
  where g.to_u = auth.uid() and not g.claimed and g.kind <> 'mattoni' order by g.created_at limit 50;
$function$

;

CREATE OR REPLACE FUNCTION public.world_gift_claim(p_id bigint)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare g public.world_gifts;
begin
  update public.world_gifts set claimed = true where id = p_id and to_u = auth.uid() and not claimed returning * into g;
  if g.id is null then return json_build_object('ok',false); end if;
  return json_build_object('ok',true,'kind',g.kind,'amount',g.amount);
end $function$

;

CREATE OR REPLACE FUNCTION public.world_loans()
 RETURNS TABLE(dir text, nick text, amount integer, left_due integer, due_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select 'dato', public.w_nick(to_u), amount, left_due, due_at from public.world_gifts where from_u = auth.uid() and loan and left_due > 0
  union all
  select 'ricevuto', public.w_nick(from_u), amount, left_due, due_at from public.world_gifts where to_u = auth.uid() and loan and left_due > 0;
$function$

;

CREATE OR REPLACE FUNCTION public.world_mine2()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null then return null; end if;
  perform public.w_settle_loans(auth.uid());
  return public.world_mine();
end $function$

;

CREATE OR REPLACE FUNCTION public.world_house_log(p_bid text)
 RETURNS TABLE(reason text, delta integer, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select l.reason, l.delta, l.created_at from public.world_log l
  where l.user_id = auth.uid() and l.ref = p_bid order by l.created_at desc limit 30;
$function$

;

CREATE OR REPLACE FUNCTION public.world_inviter(p_code text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select nick from public.profili_pubblici where left(user_id::text, 8) = lower(left(coalesce(p_code,''), 8)) and nick is not null limit 1;
$function$

;

-- permessi (come nei file originali)
revoke all on function public.w_settle_loans(uuid) from public, anon, authenticated;
grant execute on function public.world_gifts_in() to authenticated;
grant execute on function public.world_gift_claim(bigint) to authenticated;
grant execute on function public.world_loans() to authenticated;
grant execute on function public.world_mine2() to authenticated;
grant execute on function public.world_house_log(text) to authenticated;
grant execute on function public.world_inviter(text) to anon, authenticated;

-- funzioni non più usate
drop function if exists public.w_attack(text, text);
drop function if exists public.w_power(integer, boolean, boolean);
drop function if exists public.world_blocked();

-- controllo: deve dire "7 funzioni a posto, 0 vecchie rimaste"
select (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
          and p.proname in ('w_settle_loans','world_gifts_in','world_gift_claim','world_loans','world_mine2','world_house_log','world_inviter')) || ' funzioni a posto, '
    || (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
          and p.proname in ('w_attack','w_power','world_blocked')) || ' vecchie rimaste' as esito;

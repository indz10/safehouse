-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 013 — il condominio con più giocatori (scelte di Alessandro, 14/11)
-- 1) DIFESE COMUNI SOLO A CHI PARTECIPA: il bonus delle difese del condominio (portone, cancello, telecamere:
--    +3 di difesa per livello alla casa vera) vale solo per chi ha versato almeno una volta negli ultimi 30 giorni.
-- 2) 🏅 AMMINISTRATORE: chi ha versato di più nel condominio negli ultimi 30 giorni (world_condo_info).
-- 3) VICINI CHE ROMPONO: due famiglie diverse dello stesso condominio partono alleate; ognuna può "rompere"
--    con un vicino (world_condo_break): da quel momento non sono più alleati (nemmeno per inviti o rinforzi passati),
--    e possono mandarsi orde e dispetti come rivali. Pace (world_condo_peace): chi ha rotto la toglie subito;
--    l'altro può proporla, e la rottura cade quando l'ha accettata anche chi ha rotto.
--    Chi vive nello stesso appartamento (stessa scala e interno, o casa condivisa) non può rompere.
-- Si può eseguire più volte.
-- =====================================================================

create table if not exists public.world_condo_rifts(
  a uuid not null,                 -- chi ha rotto
  b uuid not null,                 -- con chi
  b_wants_peace boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (a, b));
alter table public.world_condo_rifts enable row level security;

create or replace function public.w_rift(p_a uuid, p_b uuid) returns boolean
  language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.world_condo_rifts r where (r.a = p_a and r.b = p_b) or (r.a = p_b and r.b = p_a)); $$;
revoke all on function public.w_rift(uuid, uuid) from public, anon, authenticated;

-- coinquilini / condomini: non più se hanno rotto
create or replace function public.w_coinq(p_a uuid, p_b uuid) returns boolean
  language sql stable security definer set search_path to 'public' as $$
  select coalesce(p_a <> p_b and not public.w_rift(p_a, p_b) and exists (select 1 from public.world_homes a, public.world_homes b where a.user_id = p_a and b.user_id = p_b
    and (a.building_id = b.building_id or public.w_km(a.lat,a.lon,b.lat,b.lon) < 0.025)), false); $$;

-- alleati: una rottura tra condomini vale più di inviti, rinforzi e alleanze di prima
create or replace function public.w_are_allies(a uuid, b uuid) returns boolean
  language sql stable security definer set search_path to 'public' as $$
  select a <> b and not public.w_rift(a, b) and (
    exists (select 1 from public.world_allies x where x.status = 'ok' and ((x.requester = a and x.target = b) or (x.requester = b and x.target = a)))
    or exists (select 1 from public.world_help_given g where ((g.helper = a and g.target = b) or (g.helper = b and g.target = a)) and g.created_at > now() - interval '30 days')
    or exists (select 1 from public.profili_pubblici p where p.user_id = b and p.invitato_da = left(a::text,8))
    or exists (select 1 from public.profili_pubblici p where p.user_id = a and p.invitato_da = left(b::text,8))
    or public.w_coinq(a, b)); $$;

-- difese comuni: solo a chi ha versato negli ultimi 30 giorni
create or replace function public.w_condo_bonus(p_user uuid) returns integer
  language sql stable security definer set search_path to 'public' as $$
  with k as (select public.w_condo_key(p_user) as ck)
  select case when exists (select 1 from public.world_condo_gifts g, k where g.ckey = k.ck and g.user_id = p_user and g.created_at > now() - interval '30 days')
    then coalesce((select 3 * sum(c.level) from public.world_condo c, k where c.ckey = k.ck), 0)::int else 0 end; $$;

-- stesso condominio ma famiglie diverse (si può rompere)
create or replace function public.w_condo_vicini(p_a uuid, p_b uuid) returns boolean
  language sql stable security definer set search_path to 'public' as $$
  select p_a <> p_b and public.w_condo_key(p_a) is not null and public.w_condo_key(p_a) = public.w_condo_key(p_b)
    and coalesce((select lower(btrim(coalesce(h.unit,''))) from public.world_homes h where h.user_id = p_a), '') is distinct from
        coalesce((select lower(btrim(coalesce(h.unit,''))) from public.world_homes h where h.user_id = p_b), '')
    and coalesce((select lower(btrim(coalesce(h.unit,''))) from public.world_homes h where h.user_id = p_a), '') <> ''; $$;
revoke all on function public.w_condo_vicini(uuid, uuid) from public, anon, authenticated;

create or replace function public.world_condo_break(p_user uuid) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid();
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if not public.w_condo_vicini(me, p_user) then
    return json_build_object('ok',false,'msg','Si può rompere solo con un vicino di un altro appartamento dello stesso condominio (scala e interno diversi)'); end if;
  if public.w_rift(me, p_user) then return json_build_object('ok',false,'msg','Avete già rotto'); end if;
  insert into public.world_condo_rifts(a, b) values (me, p_user) on conflict do nothing;
  delete from public.world_allies where (requester = me and target = p_user) or (requester = p_user and target = me);
  return json_build_object('ok',true,'msg','Avete rotto: ora siete rivali. Puoi fare pace quando vuoi');
end $$;

create or replace function public.world_condo_peace(p_user uuid) returns json
  language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); r public.world_condo_rifts;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  select * into r from public.world_condo_rifts where (a = me and b = p_user) or (a = p_user and b = me);
  if r.a is null then return json_build_object('ok',false,'msg','Non avete rotto'); end if;
  if r.a = me then
    delete from public.world_condo_rifts where a = me and b = p_user;
    return json_build_object('ok',true,'peace',true,'msg','Pace fatta: siete di nuovo alleati');
  end if;
  update public.world_condo_rifts set b_wants_peace = true where a = p_user and b = me;
  return json_build_object('ok',true,'peace',false,'msg','Proposta di pace inviata: quando accetta tornate alleati');
end $$;

-- il condominio visto da me: amministratore, chi ha versato, se le difese mi proteggono, i vicini e le rotture
create or replace function public.world_condo_info() returns json
  language sql stable security definer set search_path to 'public' as $$
  with k as (select public.w_condo_key(auth.uid()) as ck),
  v as (select g.user_id, sum(g.amount)::int as tot from public.world_condo_gifts g, k where g.ckey = k.ck and g.created_at > now() - interval '30 days' and g.user_id is not null group by g.user_id),
  nb as (select distinct h.user_id, h.unit from public.world_homes h, k where k.ck is not null and h.kind = 'condominio' and h.user_id <> auth.uid()
           and public.w_condo_key(h.user_id) = k.ck)
  select case when auth.uid() is null or (select ck from k) is null then json_build_object('ok', false)
  else json_build_object('ok', true,
    'admin', (select json_build_object('user_id', v.user_id, 'nick', public.w_nick(v.user_id), 'tot', v.tot) from v order by v.tot desc, v.user_id limit 1),
    'versati', coalesce((select json_agg(json_build_object('nick', public.w_nick(v.user_id), 'tot', v.tot, 'me', v.user_id = auth.uid()) order by v.tot desc) from v), '[]'::json),
    'me_tot', coalesce((select tot from v where user_id = auth.uid()), 0),
    'bonus', public.w_condo_bonus(auth.uid()),
    'vicini', coalesce((select json_agg(json_build_object('user_id', nb.user_id, 'nick', public.w_nick(nb.user_id), 'unit', nb.unit,
        'rotto', public.w_rift(auth.uid(), nb.user_id),
        'rotto_da_me', exists (select 1 from public.world_condo_rifts r where r.a = auth.uid() and r.b = nb.user_id),
        'pace_chiesta', exists (select 1 from public.world_condo_rifts r where (r.a = auth.uid() and r.b = nb.user_id and r.b_wants_peace) or (r.a = nb.user_id and r.b = auth.uid() and r.b_wants_peace)),
        'puo_rompere', public.w_condo_vicini(auth.uid(), nb.user_id)) order by nb.unit) from nb), '[]'::json)) end; $$;

revoke all on function public.world_condo_break(uuid) from public, anon;
revoke all on function public.world_condo_peace(uuid) from public, anon;
revoke all on function public.world_condo_info() from public, anon;
grant execute on function public.world_condo_break(uuid) to authenticated;
grant execute on function public.world_condo_peace(uuid) to authenticated;
grant execute on function public.world_condo_info() to authenticated;

select 'condominio pronto' as fatto;

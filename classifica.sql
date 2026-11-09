-- =========================================================
-- ZombieSafeHouse · CLASSIFICA CON PUNTEGGIO SUPERSTITE (su 1000), non più solo Mattoni
--   🛡️ Difesa       300  orde tenute dalla casa vera (ultime 14 orde a settimana, 30 al mese)
--   🧱 Fortezza     200  fortificazioni e livelli di tutte le case
--   🏠 Casa vera    150  indice di sicurezza della casa vera (valutazione)
--   🤝 Squadra      150  aiuti dati (rinforzi e scudi) + alleati
--   📅 Costanza     100  giorni in cui hai giocato
--   📈 Crescita     100  Mattoni guadagnati giocando (regali e prestiti esclusi)
-- =========================================================

-- [K1] il punteggio di un giocatore -----------------------------------------------
create or replace function public.w_score(p_user uuid, p_week boolean) returns json
language plpgsql stable security definer set search_path = public as $$
declare n int := case when p_week then 14 else 30 end; days int := case when p_week then 7 else 30 end;
  base timestamptz := public.w_next_slot(now()); h public.world_homes; held int := 0; tot int := 0; g int; sid text;
  fort int; lvup int; ind numeric; helps int; al int; act int; earn bigint; since text;
  s_dif int; s_for int; s_casa int; s_sq int; s_cos int; s_cre int;
begin
  select * into h from public.world_homes where user_id = p_user;
  if h.user_id is not null and h.status = 'home' then
    for g in 1..n loop
      exit when base - make_interval(hours => 12*g) < coalesce(h.confirmed_at, h.first_at, now());
      sid := public.w_slot_id(base - make_interval(hours => 12*g)); tot := tot + 1;
      if coalesce(public.w_home_held(p_user, sid), false) then held := held + 1; end if;
    end loop;
  end if;
  s_dif := case when tot = 0 then 0 else round(300.0 * held / tot * least(1, tot / 4.0)) end;
  select coalesce(sum(d.level),0) into fort from public.world_defs d
   where d.building_id in (select building_id from public.world_homes where user_id = p_user union select building_id from public.world_buildings where owner = p_user);
  select coalesce(sum(greatest(b.level,1) - 1),0) into lvup from public.world_buildings b
   where b.owner = p_user or b.building_id = h.building_id;
  s_for := round(200 * least(1, (fort + 2 * lvup) / 30.0));
  select p.indice into ind from public.profili_pubblici p where p.user_id = p_user;
  s_casa := case when ind is null then 0 else round(150 * greatest(0, least(1, (10 - ind) / 10.0))) end;
  since := public.w_slot_id(now() - make_interval(days => days));
  helps := (select count(*) from public.world_help_given where helper = p_user and slot_id >= since)
         + (select count(*) from public.world_shields where giver = p_user and slot_id >= since);
  al := (select count(*) from public.w_allies_of(p_user));
  s_sq := round(100 * least(1, helps / (case when p_week then 5.0 else 20.0 end))) + round(50 * least(1, al / 5.0));
  select count(distinct (l.created_at at time zone 'Europe/Rome')::date) into act from public.world_log l
   where l.user_id = p_user and l.created_at > now() - make_interval(days => days);
  s_cos := round(100 * least(1, act::numeric / days));
  select coalesce(sum(l.delta),0) into earn from public.world_log l where l.user_id = p_user and l.delta > 0 and l.created_at > now() - make_interval(days => days)
    and l.reason not like 'Regalo%' and l.reason not like 'Prestito%' and l.reason not like 'Restituzione%' and l.reason not like 'Kit%' and l.reason not like 'Padrino%';
  s_cre := round(100 * least(1, earn / (case when p_week then 800.0 else 3000.0 end)));
  return json_build_object('tot', s_dif + s_for + s_casa + s_sq + s_cos + s_cre,
    'dif', s_dif, 'forte', s_for, 'casa', s_casa, 'squadra', s_sq, 'costanza', s_cos, 'crescita', s_cre,
    'held', held, 'orde', tot, 'fort', fort, 'lvup', lvup, 'indice', ind, 'helps', helps, 'alleati', al, 'giorni', act, 'giorni_max', days, 'mattoni', earn);
end $$;
revoke all on function public.w_score(uuid,boolean) from public, anon, authenticated;

-- [K2] le classifiche (zona/mondo e leghe) ordinate per Punteggio Superstite --------
create or replace function public.world_rank(p_scope text, p_period text) returns table(pos bigint, user_id uuid, nick text, wlevel int, punti bigint, comune text, me boolean)
language sql stable security definer set search_path = public as $$
  with mh as (select lat, lon from public.world_homes where user_id = auth.uid()),
  base as (
    select w.user_id, (public.w_score(w.user_id, p_period = 'settimana')->>'tot')::bigint as punti
    from public.world_wallet w
    where p_scope <> 'zona' or exists (select 1 from public.world_homes h, mh where h.user_id = w.user_id and h.lat between mh.lat - 0.3 and mh.lat + 0.3 and h.lon between mh.lon - 0.4 and mh.lon + 0.4)),
  r as (select row_number() over (order by punti desc, user_id) as pos, user_id, punti from base)
  select r.pos, r.user_id, public.w_nick(r.user_id), public.w_lvl_of(r.user_id), r.punti,
    (select case when p.visibile then p.comune end from public.profili_pubblici p where p.user_id = r.user_id), r.user_id = auth.uid()
  from r where r.pos <= 20 or r.user_id = auth.uid() order by r.pos;
$$;
create or replace function public.world_rank_lega(p_period text) returns table(pos bigint, user_id uuid, nick text, wlevel int, punti bigint, comune text, me boolean)
language sql stable security definer set search_path = public as $$
  with lg as (select public.w_league(public.w_lvl_of(auth.uid())) as l),
  base as (
    select w.user_id, (public.w_score(w.user_id, p_period = 'settimana')->>'tot')::bigint as punti
    from public.world_wallet w, lg where public.w_league(public.w_level(w.lifetime)) = lg.l),
  r as (select row_number() over (order by punti desc, user_id) as pos, user_id, punti from base)
  select r.pos, r.user_id, public.w_nick(r.user_id), public.w_lvl_of(r.user_id), r.punti,
    (select case when p.visibile then p.comune end from public.profili_pubblici p where p.user_id = r.user_id), r.user_id = auth.uid()
  from r where r.pos <= 20 or r.user_id = auth.uid() order by r.pos;
$$;
grant execute on function public.world_rank(text,text) to authenticated;
grant execute on function public.world_rank_lega(text) to authenticated;

-- [K3] il dettaglio del punteggio (mio o di un altro giocatore) ---------------------
create or replace function public.world_score(p_user uuid, p_period text) returns json
language sql stable security definer set search_path = public as $$
  select case when auth.uid() is null then null else public.w_score(coalesce(p_user, auth.uid()), p_period = 'settimana') end;
$$;
grant execute on function public.world_score(uuid,text) to authenticated;
notify pgrst, 'reload schema';

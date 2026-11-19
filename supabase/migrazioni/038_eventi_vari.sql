-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 038 — 🚨 EVENTI DEL VICINATO PIÙ VARI (19/11)
-- Ai 4 eventi di prima (📦 cassa, 🚑 ferito, 🧟 nido, ⭐ sponsor) se ne aggiungono 6, con le stesse 3 regole:
--   chi arriva prima prende di più: 🚁 lancio (5 posti, ⛽), 🚗 auto abbandonata (2 posti, solo ⛽), 💊 farmacia (3 posti, 🪵 no);
--   uno solo, con un costo: 🚐 famiglia da scortare (⛽ 5 → ⭐ 60, 🧱 25, 🥫 15);
--   si abbatte insieme: 🐕 cani rabbiosi (vita ×0,6, premi ×0,7), 🧟‍♂️ orda di passaggio (vita ×2, 90 min, premi ×1,5, 🧱 25 al colpo finale).
-- w_evt_stile(kind) dice a quale regola appartiene; w_eventi_tick e world_evento_azione riscritte (stessa firma).
-- Richiede la 022. Si può eseguire più volte.
-- =====================================================================
alter table public.world_eventi drop constraint if exists world_eventi_kind_check;
alter table public.world_eventi add constraint world_eventi_kind_check
  check (kind in ('cassa','salva','nido','sponsor','lancio','auto','farmacia','scorta','cani','orda'));

create or replace function public.w_evt_stile(p_kind text) returns text language sql immutable as $$
  select case when p_kind in ('cassa','lancio','auto','farmacia') then 'cassa' when p_kind in ('salva','scorta') then 'salva' else 'nido' end; $$;

create or replace function public.w_eventi_tick() returns int
language plpgsql security definer set search_path = public as $$
declare c record; h record; sp record; k text; r numeric; t numeric; la double precision; lo double precision; nid bigint; nuovi int := 0; att int; dur int; nm text;
begin
  update public.world_eventi set stato = 'finito' where stato = 'attivo' and end_at <= now();
  for c in
    select public.w_cella(hm.lat, hm.lon) as cella, count(*) as n
    from public.world_homes hm join public.profili_pubblici p on p.user_id = hm.user_id
    where p.seen_at > now() - interval '3 days'
    group by 1 order by random() limit 200
  loop
    continue when exists (select 1 from public.world_eventi e where e.cella = c.cella and (e.stato = 'attivo' or e.start_at > now() - interval '40 minutes'));
    select hm.lat, hm.lon into h from public.world_homes hm join public.profili_pubblici p on p.user_id = hm.user_id
      where p.seen_at > now() - interval '3 days' and public.w_cella(hm.lat, hm.lon) = c.cella order by random() limit 1;
    continue when h.lat is null;
    r := random();
    select s.id, s.name, s.lat, s.lon into sp from public.sponsors s
      where s.active and s.lat is not null and public.w_km(h.lat, h.lon, s.lat, s.lon) < 3 order by random() limit 1;
    k := case when sp.id is not null and r < 0.12 then 'sponsor' when r < 0.26 then 'cassa' when r < 0.36 then 'lancio' when r < 0.46 then 'auto'
              when r < 0.56 then 'farmacia' when r < 0.66 then 'salva' when r < 0.74 then 'scorta' when r < 0.84 then 'cani' when r < 0.93 then 'nido' else 'orda' end;
    if k = 'sponsor' then la := sp.lat; lo := sp.lon;
    else
      t := random() * 2 * pi(); r := 0.3 + random() * 1.2;
      la := h.lat + r * cos(t) / 111.0; lo := h.lon + r * sin(t) / (111.0 * cos(radians(h.lat)));
    end if;
    dur := case k when 'nido' then 60 when 'orda' then 90 when 'sponsor' then 45 when 'lancio' then 40 else 30 end;
    att := least(80, 20 + 10 * c.n::int);
    att := case k when 'cani' then greatest(12, round(att * 0.6)::int) when 'orda' then least(200, att * 2) else att end;
    nm := case k when 'cassa' then '📦 Rifornimento caduto' when 'lancio' then '🚁 Lancio dall’elicottero' when 'auto' then '🚗 Auto abbandonata'
               when 'farmacia' then '💊 Farmacia aperta' when 'salva' then '🚑 Superstite ferito' when 'scorta' then '🚐 Famiglia da scortare'
               when 'cani' then '🐕 Branco di cani rabbiosi' when 'nido' then '🧟 Nido di zombie' when 'orda' then '🧟‍♂️ Orda di passaggio'
               else '⭐ ' || left(sp.name, 40) || ' sotto assedio' end;
    insert into public.world_eventi(kind, nome, lat, lon, cella, end_at, hp, hp_max, posti, sponsor_id)
      values (k, nm, la, lo, c.cella, now() + make_interval(mins => dur),
              case when public.w_evt_stile(k) = 'nido' then att else 0 end, case when public.w_evt_stile(k) = 'nido' then att else 0 end,
              case k when 'cassa' then 3 when 'lancio' then 5 when 'auto' then 2 when 'farmacia' then 3 else 1 end, case when k = 'sponsor' then sp.id end)
      returning id into nid;
    nuovi := nuovi + 1;
    -- avviso a chi ha una casa entro 3 km (al massimo uno ogni 2 ore)
    insert into public.world_feed(kind, actor, target, info)
      select distinct 'evento', null::uuid, hm.user_id, k || '|' || nid from public.world_homes hm
      where public.w_km(la, lo, hm.lat, hm.lon) < 3
        and not exists (select 1 from public.world_feed f where f.target = hm.user_id and f.kind = 'evento' and f.created_at > now() - interval '2 hours');
  end loop;
  return nuovi;
end $$;

create or replace function public.world_evento_azione(p_id bigint) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); e public.world_eventi; st text; qa int[]; c1 int := 0; c2 int := 0; c3 int := 0; s public.world_superstite; w public.world_wallet; a public.world_eventi_azioni;
  km numeric; n int; q int; xp int; d int; g int; got json; mt int := 0; p record; tot int; fin boolean := false;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  select * into e from public.world_eventi where id = p_id for update;
  if e.id is null or e.stato <> 'attivo' or e.end_at <= now() then return json_build_object('ok', false, 'msg', 'L’evento è finito'); end if;
  s := public.w_sup(me); w := public.w_wallet(me); g := public.w_grado(s.xp);
  km := public.w_sped_km(me, e.lat, e.lon);
  if km is null then return json_build_object('ok', false, 'msg', 'Ti serve una casa nel mondo'); end if;
  if km > public.w_sup_raggio(s.xp, s.abil) then
    return json_build_object('ok', false, 'msg', format('È a %s km: il raggio del tuo superstite è %s km', km, public.w_sup_raggio(s.xp, s.abil)));
  end if;
  st := public.w_evt_stile(e.kind);
  select * into a from public.world_eventi_azioni where evento_id = e.id and user_id = me;
  if st in ('cassa','salva') and a.user_id is not null then return json_build_object('ok', false, 'msg', 'Ci sei già andato'); end if;
  if st = 'nido' and coalesce(a.colpi, 0) >= 3 then return json_build_object('ok', false, 'msg', 'Hai già dato 3 colpi: lascia spazio agli altri'); end if;
  if e.kind = 'salva' and w.cibo < 5 then return json_build_object('ok', false, 'msg', 'Servono 🥫 5 per curarlo'); end if;
  if e.kind = 'scorta' and w.carb < 5 then return json_build_object('ok', false, 'msg', 'Servono ⛽ 5 per scortarli'); end if;
  if st = 'cassa' and (select count(*) from public.world_eventi_azioni where evento_id = e.id) >= e.posti then
    update public.world_eventi set stato = 'finito' where id = e.id; return json_build_object('ok', false, 'msg', 'Arrivato tardi: la cassa è vuota');
  end if;
  if s.energia < 1 then return json_build_object('ok', false, 'msg', format('Serve ⚡ 1: si ricarica una ogni %s min', public.w_en_ric(s.abil))); end if;
  update public.world_superstite set energia = energia - 1,
    energia_at = case when energia >= public.w_en_max(abil) then now() else energia_at end where user_id = me;

  if st = 'cassa' then
    n := (select count(*) from public.world_eventi_azioni where evento_id = e.id);
    if n >= e.posti then update public.world_eventi set stato = 'finito' where id = e.id; return json_build_object('ok', false, 'msg', 'Arrivato tardi: è già tutto preso'); end if;
    -- quanto prende chi arriva 1°, 2°, … (per tipo)
    qa := case e.kind when 'lancio' then array[30,22,16,10,6] when 'auto' then array[30,15] when 'farmacia' then array[30,18,10] else array[24,14,8] end;
    q := qa[least(n + 1, array_length(qa, 1))]; xp := greatest(10, 30 - 10 * n);
    c1 := case e.kind when 'auto' then 0 when 'farmacia' then 0 when 'lancio' then q / 2 else q end;
    c2 := case e.kind when 'auto' then 0 when 'lancio' then q / 2 else q end;
    c3 := case e.kind when 'farmacia' then 0 else q end;
    got := public.w_res(me, c1, c2, c3); perform public.w_xp(me, xp);
    insert into public.world_eventi_azioni(evento_id, user_id, colpi, posto, premio) values (e.id, me, 1, n + 1, jsonb_build_object('legno', c1, 'cibo', c2, 'carb', c3, 'xp', xp));
    if n + 1 >= e.posti then update public.world_eventi set stato = 'finito' where id = e.id; end if;
    return json_build_object('ok', true, 'kind', e.kind, 'posto', n + 1, 'xp', xp, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int, 'carb', (got->>'carb')::int,
      'msg', format('%s Sei arrivato %s°: hai preso la tua parte', left(e.nome, 1), n + 1));
  elsif e.kind = 'salva' then
    update public.world_wallet set cibo = cibo - 5 where user_id = me;
    perform public.w_xp(me, 50); perform public.w_pay(me, 20, 'Evento: superstite salvato'); got := public.w_res(me, 0, 0, 10);
    insert into public.world_eventi_azioni(evento_id, user_id, colpi, posto, premio) values (e.id, me, 1, 1, '{"xp":50,"mattoni":20,"carb":10}'::jsonb);
    update public.world_eventi set stato = 'finito' where id = e.id;
    return json_build_object('ok', true, 'kind', e.kind, 'xp', 50, 'mattoni', 20, 'carb', (got->>'carb')::int, 'msg', '🚑 L’hai salvato! Ti ringrazia con quello che aveva');
  elsif e.kind = 'scorta' then
    update public.world_wallet set carb = carb - 5 where user_id = me;
    perform public.w_xp(me, 60); perform public.w_pay(me, 25, 'Evento: famiglia scortata'); got := public.w_res(me, 0, 15, 0);
    insert into public.world_eventi_azioni(evento_id, user_id, colpi, posto, premio) values (e.id, me, 1, 1, '{"xp":60,"mattoni":25,"cibo":15}'::jsonb);
    update public.world_eventi set stato = 'finito' where id = e.id;
    return json_build_object('ok', true, 'kind', e.kind, 'xp', 60, 'mattoni', 25, 'cibo', (got->>'cibo')::int, 'msg', '🚐 Famiglia al sicuro! Ti lasciano le loro provviste');
  end if;

  -- nido e sponsor: si abbatte insieme
  d := 5 + g / 2 + 2 * public.w_ab(s.abil, 'combattente') + 2 * public.w_eq(s.equip, 'arma');
  insert into public.world_eventi_azioni(evento_id, user_id, colpi, danno) values (e.id, me, 1, d)
    on conflict (evento_id, user_id) do update set colpi = public.world_eventi_azioni.colpi + 1, danno = public.world_eventi_azioni.danno + d, at = now();
  update public.world_eventi set hp = greatest(0, hp - d) where id = e.id returning * into e;
  perform public.w_xp(me, 5);
  if e.kind = 'sponsor' and e.sponsor_id is not null then
    begin insert into public.sponsor_events(sponsor_id, kind) values (e.sponsor_id, 'spedizione'); exception when others then null; end;
  end if;
  if e.hp <= 0 then
    fin := true;
    update public.world_eventi set stato = 'finito' where id = e.id;
    tot := greatest(1, (select sum(danno) from public.world_eventi_azioni where evento_id = e.id));
    for p in select * from public.world_eventi_azioni where evento_id = e.id loop
      q := round((10 + 40.0 * p.danno / tot) * case e.kind when 'orda' then 1.5 when 'cani' then 0.7 else 1 end);
      perform public.w_res(p.user_id, q, q, q / 2); perform public.w_xp(p.user_id, 20 + p.danno);
      update public.world_eventi_azioni set premio = jsonb_build_object('legno', q, 'cibo', q, 'carb', q / 2, 'xp', 20 + p.danno) where evento_id = e.id and user_id = p.user_id;
      if p.user_id <> me then insert into public.world_feed(kind, actor, target, info) values ('evento_vinto', me, p.user_id, e.nome); end if;
    end loop;
    mt := case e.kind when 'orda' then 25 when 'cani' then 10 else 15 end; perform public.w_pay(me, mt, 'Evento: colpo finale');
  end if;
  return json_build_object('ok', true, 'kind', e.kind, 'danno', d, 'hp', e.hp, 'hp_max', e.hp_max, 'finito', fin, 'mattoni', mt,
    'msg', case when fin then '💥 Abbattuto! Premi a tutti quelli che hanno colpito, e 🧱 ' || mt || ' a te per il colpo finale' else format('💥 −%s: ne restano %s', d, e.hp) end);
end $$;


-- controllo: deve dire "eventi pronti"
select case when public.w_evt_stile('orda') = 'nido' and public.w_evt_stile('lancio') = 'cassa' then 'eventi pronti' else 'qualcosa manca' end as esito;

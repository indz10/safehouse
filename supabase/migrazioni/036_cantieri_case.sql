-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 036 — 🏗️ POTENZIAMENTI A TEMPO e 📊 STATO DELLE CASE (18/11)
-- Stesso motore dei cantieri della 035 (world_cantieri, w_cantieri_tick, world_cantiere_accelera):
--  - world_def_upgrade non alza più il livello all'istante: paga come prima e mette in CODA un cantiere 'potenzia'
--    (20 min × livello: 20, 40, 60); ogni casa ha la sua coda (i lavori partono uno dopo l'altro), così ogni casa
--    mostra il suo tempo. A fine lavori w_cantieri_tick scrive il livello in world_defs (novità 'cantiere_ok').
--  - world_ripara: un cantiere di riparazione per casa (non più uno solo per giocatore), in coda dopo i potenziamenti.
--  - world_case_stato: per ogni tua casa danni in punti e in %, integrità, ultimi esiti (orda e attacchi) e i cantieri;
--    in più le case perse (conquistate o crollate) negli ultimi 30 giorni.
-- Richiede la 035. Si può eseguire più volte.
-- =====================================================================

-- ---------- 1) regole (le stesse + potenziamenti) ----------
create or replace function public.w_pvp_cfg() returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'comb_pct', 0.05, 'comb_max', 9,                                   -- Combattente: +5% attacco e difesa per livello (max 9 = +45%)
    'viaggio', jsonb_build_array(jsonb_build_array(1,5), jsonb_build_array(5,10), jsonb_build_array(20,20), jsonb_build_array(50,40), jsonb_build_array(100,60)),
    'viaggio_oltre', 90,                                               -- minuti oltre 100 km
    'soglie', jsonb_build_array(1, 1.25, 1.6),                         -- rapporto attacco/difesa per misura, normale, schiacciante
    'perc', jsonb_build_array(0, 0.10, 0.20, 0.30),                    -- scorte perse per esito
    'danni', jsonb_build_array(0, 5, 10, 15),                          -- punti di difesa danneggiati per esito
    'danni_max', 30,
    'prot_pct', 0.30,                                                  -- scorta protetta: il più alto tra il 30% e il minimo
    'prot_min', jsonb_build_object('legno', 50, 'cibo', 50, 'carb', 50, 'mattoni', 100),
    'cap', jsonb_build_object('legno', 150, 'cibo', 150, 'carb', 150, 'mattoni', 100),   -- massimo per attacco
    'caso', 0.10,                                                      -- variazione casuale ±10% decisa dal server
    'atk_base', 30, 'atk_lvl', 3,                                      -- forza = (30 + 3 × livello) × (1 + Combattente) × mezzo
    'costo_cibo', 10, 'energia', 1,
    'coppia_ore', 12, 'scudo_ore', 6, 'max_sconfitte', 3, 'max_attacchi', 5,
    'riparo_legno', 2,
    -- rinforzi (029)
    'rinf_quota', 0.5,
    'calo', jsonb_build_array(1, 0.6, 0.4, 0.25),                      -- dalla più forte: 1ª, 2ª, 3ª, dalla 4ª in poi (rinforzi e attacchi d'alleanza)
    'rinf_max', 60, 'rinf_max_n', 6,
    'rinf_cibo', 5, 'rinf_xp', 15, 'rinf_premio_cibo', 5,
    -- attacchi d'alleanza (030)
    'raduno_max', 10, 'raduno_minuti', jsonb_build_array(10, 20, 30),
    -- integrità delle case comprate (031)
    'integ', jsonb_build_array(0, 10, 17, 25),                         -- integrità persa per esito (di misura, normale, schiacciante)
    'caduta_ore', 48,                                                  -- ore per riparare una casa crollata prima di perderla
    'rip_integ_legno', 1, 'rip_caduta_mattoni', 50,                    -- riparare: 🪵 1 a punto di integrità, +🧱 50 se è crollata
    'integ_conquista', 50,
    -- orde sul motore unico (032)
    'orda_avvisi', jsonb_build_array(60, 15),
    -- mezzi e cantieri (035)
    'velocita', jsonb_build_object('piedi', 5, 'bici', 15, 'moto', 40, 'auto', 60, 'fuori', 50),   -- km/h
    'viaggio_base', 2,                                                 -- minuti per partire
    'sped_ricerca', 5,                                                 -- minuti di ricerca sul posto (spedizioni)
    'cant_danno', 3, 'cant_integ', 2, 'cant_crollo', 240, 'cant_min', 10,   -- minuti di cantiere
    'acc_min', 5,
    -- potenziamenti a tempo (036)
    'pot_min', 20);                                                    -- minuti per livello: 20, 40, 60                                                     -- accelerare: 🧱 1 ogni 5 minuti che mancano
  $$;

-- ---------- 2) cantieri di potenziamento ----------
alter table public.world_cantieri add column if not exists tipo text not null default 'ripara';
alter table public.world_cantieri add column if not exists def_kind text;
alter table public.world_cantieri add column if not exists def_level int;

create or replace function public.world_def_upgrade(p_bid text, p_kind text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); w public.world_wallet; lv int; cost int; mins int; home boolean; x public.world_cantieri;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_kind not in ('fossato','barricate','sirena','fondamenta','fari','trappole','grate','recinto','cani','pompa') then return json_build_object('ok',false,'msg','Difesa non valida'); end if;
  home := exists (select 1 from public.world_homes where building_id = p_bid and user_id = me);
  if not home and not exists (select 1 from public.world_buildings where building_id = p_bid and owner = me) then return json_build_object('ok',false,'msg','Non è una tua casa'); end if;
  -- il livello conta anche i lavori già in coda
  lv := greatest(public.w_def(p_bid, p_kind), coalesce((select max(def_level) from public.world_cantieri where bid = p_bid and def_kind = p_kind and stato = 'lavori'), 0));
  if lv >= 3 then return json_build_object('ok',false,'msg','Già al massimo (o già in lavorazione)'); end if;
  cost := 80 * (lv + 1); w := public.w_wallet(me);
  if w.mattoni < cost then return json_build_object('ok',false,'msg','Servono '||cost||' Mattoni'); end if;
  update public.world_wallet set mattoni = mattoni - cost where user_id = me;
  insert into public.world_log(user_id, delta, reason, ref, seen) values (me, -cost, 'Fortificazione: '||p_kind||' livello '||(lv+1), p_bid, true);
  mins := (public.w_pvp_cfg()->>'pot_min')::int * (lv + 1);
  insert into public.world_cantieri(user_id, bid, home, fine, mattoni, tipo, def_kind, def_level)
    values (me, p_bid, home, greatest(now(), coalesce((select max(fine) from public.world_cantieri where bid = p_bid and stato = 'lavori'), now())) + make_interval(mins => mins),
            cost, 'potenzia', p_kind, lv + 1) returning * into x;
  mins := ceil(extract(epoch from x.fine - now()) / 60);
  return json_build_object('ok',true,'level',lv+1,'cost',cost,'cantiere',x.id,'fine',x.fine,'minuti',mins,
    'msg',format('🏗️ Lavori: %s livello %s pronto fra %s', p_kind, lv+1, case when mins >= 60 then (mins / 60) || ' h ' || (mins % 60) || ' min' else mins || ' min' end));
end $$;

create or replace function public.w_cantieri_tick() returns int
language plpgsql security definer set search_path to 'public' as $$
declare c public.world_cantieri; n int := 0;
begin
  for c in select * from public.world_cantieri where stato = 'lavori' and fine <= now() order by fine limit 100 for update skip locked loop
    if c.tipo = 'potenzia' then
      insert into public.world_defs(building_id, kind, level) values (c.bid, c.def_kind, c.def_level)
        on conflict (building_id, kind) do update set level = greatest(public.world_defs.level, excluded.level);
    elsif c.home then update public.world_homes set danno = 0 where user_id = c.user_id;
    else update public.world_buildings set danno = 0, integrita = 100, caduta_at = null, caduta_da = null where building_id = c.bid and owner = c.user_id; end if;
    update public.world_cantieri set stato = 'finito' where id = c.id;
    perform public.w_feed_add('cantiere_ok', c.user_id, c.user_id, null, null, c.bid || '|' || case when c.home then 'casa' else 'comprata' end || '|' || c.tipo || '|' || coalesce(c.def_kind, ''));
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.world_ripara(p_bid text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); k jsonb := public.w_pvp_cfg(); d int; home boolean; b public.world_buildings; v_legno int; v_mat int := 0; mins int; hbid text; x public.world_cantieri;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  perform public.w_cantieri_tick(); perform public.w_cadute_tick();
  home := coalesce(p_bid, '') = '' or exists (select 1 from public.world_homes where user_id = me and building_id = p_bid);
  if home then
    select building_id, danno into hbid, d from public.world_homes where user_id = me;
    if d is null then return json_build_object('ok', false, 'msg', 'Non è casa tua'); end if;
    if d <= 0 then return json_build_object('ok', false, 'msg', 'Niente da riparare'); end if;
    v_legno := d * (k->>'riparo_legno')::int;
    mins := greatest((k->>'cant_min')::int, d * (k->>'cant_danno')::int);
  else
    select * into b from public.world_buildings where building_id = p_bid and owner = me for update;
    if b.building_id is null then return json_build_object('ok', false, 'msg', 'Non è casa tua (o l’hai già persa)'); end if;
    if b.danno <= 0 and b.integrita >= 100 and b.caduta_at is null then return json_build_object('ok', false, 'msg', 'Niente da riparare'); end if;
    v_legno := b.danno * (k->>'riparo_legno')::int + (100 - b.integrita) * (k->>'rip_integ_legno')::int;
    if b.caduta_at is not null then v_mat := (k->>'rip_caduta_mattoni')::int; end if;
    mins := greatest((k->>'cant_min')::int, b.danno * (k->>'cant_danno')::int + (100 - b.integrita) * (k->>'cant_integ')::int
      + case when b.caduta_at is not null then (k->>'cant_crollo')::int else 0 end);
    hbid := p_bid;
  end if;
  select * into x from public.world_cantieri where user_id = me and bid = hbid and tipo = 'ripara' and stato = 'lavori' limit 1;
  if x.id is not null then
    return json_build_object('ok', false, 'msg', format('🔨 Questa casa è già in riparazione: finisce fra %s min (⚡ accelera con 🧱)', greatest(1, ceil(extract(epoch from x.fine - now()) / 60)))); end if;
  update public.world_wallet w set legno = w.legno - v_legno, mattoni = w.mattoni - v_mat where w.user_id = me and w.legno >= v_legno and w.mattoni >= v_mat;
  if not found then return json_build_object('ok', false, 'msg', format('Servono 🪵 %s%s', v_legno, case when v_mat > 0 then ' e 🧱 ' || v_mat else '' end)); end if;
  if v_mat > 0 then insert into public.world_log(user_id, delta, reason, ref, seen) values (me, -v_mat, 'Cantiere: casa crollata da ricostruire', hbid, true); end if;
  insert into public.world_cantieri(user_id, bid, home, fine, legno, mattoni, tipo)
    values (me, hbid, home, greatest(now(), coalesce((select max(fine) from public.world_cantieri where bid = hbid and stato = 'lavori'), now())) + make_interval(mins => mins), v_legno, v_mat, 'ripara') returning * into x;
  mins := ceil(extract(epoch from x.fine - now()) / 60);
  return json_build_object('ok', true, 'id', x.id, 'minuti', mins, 'fine', x.fine,
    'msg', format('🔨 Cantiere aperto: lavori finiti fra %s · 🪵 −%s%s', case when mins >= 60 then (mins / 60) || ' h ' || (mins % 60) || ' min' else mins || ' min' end,
      v_legno, case when v_mat > 0 then ' 🧱 −' || v_mat else '' end));
end $$;

create or replace function public.world_cantieri_miei() returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid();
begin
  if me is null then return json_build_object('ok', false); end if;
  perform public.w_cantieri_tick();
  return json_build_object('ok', true, 'ora', now(), 'cantieri', coalesce((select json_agg(json_build_object('id', c.id, 'bid', c.bid, 'home', c.home, 'fine', c.fine,
      'inizio', c.inizio, 'tipo', c.tipo, 'def_kind', c.def_kind, 'def_level', c.def_level,
      'accelera', greatest(5, ceil(greatest(0, ceil(extract(epoch from c.fine - now()) / 60))::numeric / (public.w_pvp_cfg()->>'acc_min')::int))) order by c.fine)
    from public.world_cantieri c where c.user_id = me and c.stato = 'lavori'), '[]'::json));
end $$;

-- ---------- 3) lo stato delle tue case ----------
create or replace function public.world_case_stato() returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid();
begin
  if me is null then return json_build_object('ok', false); end if;
  perform public.w_cantieri_tick();
  return json_build_object('ok', true, 'ora', now(),
    'case', coalesce((select json_agg(z.x) from (
      select json_build_object('bid', h.building_id, 'home', true, 'danno', h.danno, 'integrita', 100,
        'danno_pct', least(100, round(100.0 * h.danno / greatest(1, 50 + 12 * coalesce((select level from public.world_buildings where building_id = h.building_id), 1))))) as x
        from public.world_homes h where h.user_id = me
      union all
      select json_build_object('bid', b.building_id, 'home', false, 'danno', b.danno, 'integrita', b.integrita, 'crollata', b.caduta_at is not null,
        'danno_pct', least(100, round(100.0 * b.danno / greatest(1, 45 + 12 * b.level)))) from public.world_buildings b where b.owner = me) z), '[]'::json),
    'orda', (select json_build_object('slot', o.slot_id, 'esito', o.esito, 'loot', o.loot, 'case', o.case_cadute) from public.world_orde_esiti o
             where o.user_id = me order by o.created_at desc limit 1),
    'attacchi', coalesce((select json_agg(json_build_object('bid', a.bid, 'quando', a.impatto, 'da', public.w_nick(a.attaccante), 'esito', (a.esito->>'esito')::int,
        'integ', (a.esito->>'integ')::int, 'danno', (a.esito->>'danno')::int) order by a.impatto desc)
      from (select * from public.world_attacchi where vittima = me and stato = 'risolto' order by impatto desc limit 10) a), '[]'::json),
    'perse', coalesce((select json_agg(json_build_object('kind', f.kind, 'da', case when f.kind = 'conquista' then public.w_nick(f.actor) end, 'quando', f.created_at) order by f.created_at desc)
      from (select * from public.world_feed where target = me and kind in ('conquista','casa_libera') and created_at > now() - interval '30 days' order by created_at desc limit 10) f), '[]'::json));
end $$;

revoke all on function public.w_cantieri_tick() from public, anon, authenticated;
revoke all on function public.world_def_upgrade(text, text) from public, anon;
revoke all on function public.world_ripara(text) from public, anon;
revoke all on function public.world_cantieri_miei() from public, anon;
revoke all on function public.world_case_stato() from public, anon;
grant execute on function public.w_cantieri_tick() to service_role;
grant execute on function public.world_def_upgrade(text, text) to authenticated;
grant execute on function public.world_ripara(text) to authenticated;
grant execute on function public.world_cantieri_miei() to authenticated;
grant execute on function public.world_case_stato() to authenticated;

-- controllo: deve dire "cantieri delle case pronti"
select case when exists (select 1 from pg_proc where proname = 'world_case_stato') then 'cantieri delle case pronti' else 'qualcosa manca' end as esito;

-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 047 — ⏳ MISSIONI E 💎 USI DELLE GEMME SUL SERVER (21/11)
-- 1) world_missioni(): tutte le attività a tempo in un elenco solo (cantieri, sviluppi del superstite,
--    spedizioni, attacchi e rinforzi in viaggio, superstite verso lo zombie, attacchi in arrivo) con
--    meta, inizio, fine, secondi che mancano, costo in 💎 per finire subito (null se non si può).
-- 2) Scudo a un alleato (💎 20) e dispetti nebbia (💎 15) e sabotaggio (💎 25) ora tolgono le gemme dal
--    saldo del server (prima solo dal telefono). Prezzi in w_gem_usi(). Il "raddoppia il premio" è tolto.
-- Si può eseguire più volte.
-- =====================================================================
create or replace function public.w_gem_usi() returns jsonb language sql immutable as $$
  select jsonb_build_object('scudo', 20, 'nebbia', 15, 'sabotaggio', 25); $$;

-- costo per finire subito (stessa regola di world_completa_subito): 1 💎 ogni min_per_gemma minuti, minimo subito_min
create or replace function public.w_gem_costo(p_fine timestamptz, p_nuova timestamptz) returns int language sql stable as $$
  select greatest((public.w_gem_cfg()->>'subito_min')::int,
    ceil(greatest(0, extract(epoch from p_fine - p_nuova) / 60.0) / (public.w_gem_cfg()->>'min_per_gemma')::numeric)::int); $$;

create or replace function public.world_missioni() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); k jsonb := public.w_gem_cfg(); L jsonb := '[]'::jsonb;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  perform public.w_cantieri_tick(); perform public.w_sup_lavori_tick(); perform public.w_scontri_tick(); perform public.w_attacchi_tick();
  -- 🔨 cantieri delle case
  L := L || coalesce((select jsonb_agg(jsonb_build_object('tipo','cantiere','id',c.id,'ic',case c.tipo when 'potenzia' then '🏗️' when 'restaura' then '🔧' else '🔨' end,
      'titolo', case c.tipo when 'potenzia' then 'Potenziamento ' || coalesce(c.def_kind,'') || ' → ' || coalesce(c.def_level::text,'') when 'restaura' then 'Restauro ' || coalesce(c.def_kind,'') else 'Riparazione' end,
      'meta', case when c.home then '❤️ Casa tua' else '🔑 Casa comprata' end, 'inizio', c.inizio, 'fine', c.fine,
      'secondi', greatest(0, extract(epoch from c.fine - now()))::int, 'gemme', public.w_gem_costo(c.fine, now()), 'bid', c.bid))
    from public.world_cantieri c where c.user_id = me and c.stato = 'lavori'), '[]'::jsonb);
  -- 🧑 sviluppi del superstite
  L := L || coalesce((select jsonb_agg(jsonb_build_object('tipo','sup','id',l.id,'ic','⬆️',
      'titolo', case l.tipo when 'stat' then 'Sviluppo ' || l.chiave when 'abil' then 'Abilità ' || l.chiave else 'Attrezzo ' || l.chiave end || ' · grado ' || l.grado,
      'meta', '🧑 Il tuo superstite', 'inizio', l.inizio, 'fine', l.fine, 'secondi', greatest(0, extract(epoch from l.fine - now()))::int, 'gemme', public.w_gem_costo(l.fine, now())))
    from public.world_sup_lavori l where l.user_id = me and l.stato = 'lavori'), '[]'::jsonb);
  -- 🎒 spedizioni (tornate = da raccogliere)
  L := L || coalesce((select jsonb_agg(jsonb_build_object('tipo','spedizione','id',p.id,'ic','🎒','titolo','Spedizione', 'meta', coalesce(p.nome,'') || ' · ' || p.km || ' km',
      'inizio', p.start_at, 'fine', p.end_at, 'secondi', greatest(0, extract(epoch from p.end_at - now()))::int, 'pronto', p.end_at <= now(),
      'gemme', case when p.end_at > now() then public.w_gem_costo(p.end_at, now()) end))
    from public.world_spedizioni p where p.user_id = me and p.stato = 'via'), '[]'::jsonb);
  -- 🧟 superstite verso lo zombie (arrivato = pronto per l'arena)
  L := L || coalesce((select jsonb_agg(jsonb_build_object('tipo','scontro','id',s.id,'ic',t.ic,'titolo','Verso ' || t.nome || ' · Lv ' || s.livello,
      'meta', '🎒 Superstite · ' || coalesce(s.km::text,'') || ' km', 'inizio', s.creato, 'fine', s.arrivo, 'scade', s.scade,
      'secondi', greatest(0, extract(epoch from s.arrivo - now()))::int, 'pronto', s.stato = 'pronto',
      'gemme', case when s.stato = 'viaggio' then public.w_gem_costo(s.arrivo, now()) end))
    from public.world_scontri s join public.w_zm_tipi() t on t.k = s.tipo where s.user_id = me and s.modo = 'superstite' and s.stato in ('viaggio','pronto')), '[]'::jsonb);
  -- ⚔️ i tuoi attacchi in viaggio (mai prima di 5 minuti dall'arrivo)
  L := L || coalesce((select jsonb_agg(jsonb_build_object('tipo','attacco','id',a.id,'ic','⚔️','titolo','Attacco a @' || coalesce(pp.nick,'?'),
      'meta', coalesce(a.km::text,'') || ' km', 'inizio', a.partenza, 'fine', a.impatto, 'secondi', greatest(0, extract(epoch from a.impatto - now()))::int,
      'gemme', case when a.impatto > now() + make_interval(mins => (k->>'attacco_min_rimasti')::int)
        then public.w_gem_costo(a.impatto, now() + make_interval(mins => (k->>'attacco_min_rimasti')::int)) end))
    from public.world_attacchi a left join public.profili_pubblici pp on pp.user_id = a.vittima where a.attaccante = me and a.stato = 'viaggio'), '[]'::jsonb);
  -- 🛡️ i tuoi rinforzi in viaggio
  L := L || coalesce((select jsonb_agg(jsonb_build_object('tipo','rinforzo','id',r.id,'ic','🛡️','titolo','Rinforzi per @' || coalesce(pp.nick,'?'),
      'meta', coalesce(r.km::text,'') || ' km', 'inizio', r.partenza, 'fine', r.arrivo, 'secondi', greatest(0, extract(epoch from r.arrivo - now()))::int,
      'gemme', public.w_gem_costo(r.arrivo, now())))
    from public.world_attacchi_rinforzi r join public.world_attacchi a on a.id = r.attacco_id left join public.profili_pubblici pp on pp.user_id = a.vittima
    where r.helper = me and r.arrivo > now() and a.stato = 'viaggio'), '[]'::jsonb);
  -- 🚨 attacchi in arrivo a te (solo da guardare: si risponde con Prepara e rinforzi)
  L := L || coalesce((select jsonb_agg(jsonb_build_object('tipo','arrivo','id',a.id,'ic','🚨','titolo','Attacco in arrivo da @' || coalesce(pp.nick,'?'),
      'meta', case when a.casa_vera then '❤️ Casa tua' else '🔑 Casa comprata' end, 'inizio', a.partenza, 'fine', a.impatto,
      'secondi', greatest(0, extract(epoch from a.impatto - now()))::int))
    from public.world_attacchi a left join public.profili_pubblici pp on pp.user_id = a.attaccante where a.vittima = me and a.stato = 'viaggio'), '[]'::jsonb);
  return json_build_object('ok', true, 'cfg', json_build_object('min_per_gemma', k->'min_per_gemma', 'subito_min', k->'subito_min'),
    'missioni', (select coalesce(jsonb_agg(x order by (x->>'pronto')::boolean desc nulls last, (x->>'fine')::timestamptz), '[]'::jsonb) from jsonb_array_elements(L) x));
end $$;
grant execute on function public.world_missioni() to authenticated;

create or replace function public.world_ally_shield(p_target uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now())); g int;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_target is null or p_target = me then return json_build_object('ok',false,'msg','Lo scudo si dà a un alleato'); end if;
  if not public.w_are_allies(me, p_target) then return json_build_object('ok',false,'msg','Solo agli alleati'); end if;
  if not exists (select 1 from public.world_homes where user_id = p_target) then return json_build_object('ok',false,'msg','Non ha una casa nel mondo'); end if;
  if (select count(*) from public.world_shields where target = p_target and slot_id = nid) >= 2 then return json_build_object('ok',false,'msg','Ha già 2 scudi per la prossima orda'); end if;
  if exists (select 1 from public.world_shields where giver = me and target = p_target and slot_id = nid) then return json_build_object('ok',false,'msg','Gli hai già dato uno scudo per questa orda'); end if;
  -- 💎 20 dal saldo del server (prima si toglievano solo sul telefono)
  g := public.w_gemme_add(me, -(public.w_gem_usi()->>'scudo')::int, 'Scudo a un alleato', p_target::text, 'scudo:' || p_target || ':' || nid);
  if g is null then return json_build_object('ok',false,'gemme_poche',true,'msg','Servono 💎 ' || (public.w_gem_usi()->>'scudo')); end if;
  insert into public.world_shields(giver, target, slot_id) values (me, p_target, nid) on conflict do nothing;
  return json_build_object('ok',true,'msg','Scudo dato: +5 alla sua difesa alla prossima orda');
end $$;

create or replace function public.world_send_curse(p_target uuid, p_kind text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); nid text := public.w_slot_id(public.w_next_slot(now())); lost boolean := false; g int;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_target is null or p_target = me then return json_build_object('ok',false,'msg','Non puoi fare dispetti a te stesso'); end if;
  if p_kind not in ('nebbia','sabotaggio') then return json_build_object('ok',false,'msg','Dispetto non valido'); end if;
  if not exists (select 1 from public.world_homes where user_id = p_target) then return json_build_object('ok',false,'msg','Non ha una casa nel mondo'); end if;
  if public.w_shielded(p_target) then return json_build_object('ok',false,'msg','È appena arrivato: ha lo scudo del nuovo arrivato'); end if;
  if public.w_are_allies(me, p_target) then return json_build_object('ok',false,'msg','È un tuo alleato: niente dispetti'); end if;
  if public.w_lvl_of(p_target) < public.w_lvl_of(me) - 3 then return json_build_object('ok',false,'msg','È molto più debole di te: è protetto'); end if;
  if (select count(*) from public.world_curses where attacker = me and created_at > now() - interval '1 day') >= 3 then return json_build_object('ok',false,'msg','Oggi hai già fatto 3 dispetti'); end if;
  if exists (select 1 from public.world_curses where attacker = me and target = p_target and slot_id = nid and kind = p_kind) then return json_build_object('ok',false,'msg','Questo dispetto gliel’hai già fatto per la prossima orda'); end if;
  -- 💎 dal saldo del server: nebbia 15, sabotaggio 25
  g := public.w_gemme_add(me, -(public.w_gem_usi()->>p_kind)::int, case when p_kind = 'nebbia' then 'Nebbia' else 'Sabotaggio' end, p_target::text, 'dispetto:' || p_kind || ':' || p_target || ':' || nid);
  if g is null then return json_build_object('ok',false,'gemme_poche',true,'msg','Servono 💎 ' || (public.w_gem_usi()->>p_kind)); end if;
  insert into public.world_curses(attacker, target, slot_id, kind) values (me, p_target, nid, p_kind) on conflict do nothing;
  if public.w_shielded(me) then lost := true; perform public.w_wallet(me); update public.world_wallet set caps = jsonb_set(caps, '{scudo_off}', '1') where user_id = me; end if;
  return json_build_object('ok',true,'msg', (case when p_kind = 'nebbia' then 'Nebbia mandata: −5 alla sua difesa alla prossima orda' else 'Sabotaggio riuscito: se aveva preparato le case, perde il bonus (−15)' end) || case when lost then '. Hai perso il tuo scudo del nuovo arrivato' else '' end);
end $$;

-- controllo: deve dire "missioni pronte"
select case when exists (select 1 from pg_proc where proname = 'world_missioni') then 'missioni pronte' else 'qualcosa manca' end as esito;

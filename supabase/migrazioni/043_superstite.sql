-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 043 — 🧑 IL SUPERSTITE: CREAZIONE, STATISTICHE E POTENZIAMENTI A TEMPO (21/11)
-- 1) Creazione (world_sup_crea): nome e aspetto (volto, colore, accessorio), per i nuovi e per chi gioca già
--    (niente si perde: XP, grado, abilità, attrezzi, scorte restano).
-- 2) Statistiche (w_sup_stats): ❤️ vita, 💪 forza, 🛡️ difesa, 💨 agilità = base del grado + gradi di potenziamento.
--    Salire di grado (XP) è immediato; i potenziamenti sbloccati dal grado hanno tempi di lavoro.
-- 3) Tutti gli sviluppi permanenti sono lavori a tempo (tabella world_sup_lavori): statistiche (gradi 1–15),
--    abilità (world_sup_abilita) e attrezzi (world_sup_equip). Costo e scadenza si fissano alla partenza: salire di
--    livello dopo non li cambia. Si continua a giocare, esplorare e combattere: il beneficio arriva a lavoro finito.
--    Massimo 2 lavori insieme, uno per sviluppo. Fasce di durata PROVVISORIE in w_sup_cfg().
-- 4) 💎 completa subito anche i lavori del superstite (world_completa_subito tipo 'sup').
-- 5) Il cibo non si spende nei potenziamenti (serve ai viaggi e alla vita): costano 🪵 e 🧱.
-- Si può eseguire più volte.
-- =====================================================================
alter table public.world_superstite add column if not exists nome text;
alter table public.world_superstite add column if not exists avatar jsonb not null default '{}'::jsonb;
alter table public.world_superstite add column if not exists stat jsonb not null default '{}'::jsonb;

create table if not exists public.world_sup_lavori (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('stat','abil','equip')),
  chiave text not null,
  grado int not null,
  inizio timestamptz not null default now(),
  fine timestamptz not null,
  costo jsonb not null default '{}'::jsonb,
  stato text not null default 'lavori' check (stato in ('lavori','finito'))
);
create index if not exists world_sup_lavori_u on public.world_sup_lavori(user_id, stato);
create unique index if not exists world_sup_lavori_uno on public.world_sup_lavori(user_id, tipo, chiave) where stato = 'lavori';
alter table public.world_sup_lavori enable row level security;
drop policy if exists sup_lavori_miei on public.world_sup_lavori;
create policy sup_lavori_miei on public.world_sup_lavori for select using (user_id = auth.uid());

-- ---------- regole (PROVVISORIE) ----------
-- fasce: grado di sviluppo 1–15 → durata in secondi e grado del superstite richiesto
--   introduzione 30 s–2 min (1–2) · primi 5–15 min (3–5) · intermedi 30 min–2 h (6–8) · avanzati 4–8 h (9–11) · alti 12–24 h (12–15)
create or replace function public.w_sup_cfg() returns jsonb language sql immutable as $$
  select jsonb_build_object('provvisorio', true, 'max_lavori', 2,
    'durata', jsonb_build_array(30, 90, 300, 600, 900, 1800, 3600, 7200, 14400, 21600, 28800, 43200, 57600, 72000, 86400),
    'richiesto', jsonb_build_array(1, 1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22),
    'stat_max', 15,
    'stat', jsonb_build_object('vita', 10, 'forza', 2, 'difesa', 2, 'agilita', 2),          -- beneficio per grado
    'base', jsonb_build_object('vita', 100, 'forza', 10, 'difesa', 8, 'agilita', 8),
    'per_grado', jsonb_build_object('vita', 8, 'forza', 1, 'difesa', 1, 'agilita', 1),     -- crescita col grado del superstite
    'abil_fascia', 2, 'equip_fascia', jsonb_build_array(4, 7, 10),
    'equip_richiesto', jsonb_build_array(1, 5, 10)); $$;

create or replace function public.w_sup_fascia(p_g int) returns int language sql immutable as $$ select least(15, greatest(1, coalesce(p_g, 1))); $$;
create or replace function public.w_sup_durata(p_fascia int) returns int language sql immutable as $$
  select (public.w_sup_cfg()->'durata'->>(public.w_sup_fascia(p_fascia) - 1))::int; $$;
create or replace function public.w_sup_richiesto(p_fascia int) returns int language sql immutable as $$
  select (public.w_sup_cfg()->'richiesto'->>(public.w_sup_fascia(p_fascia) - 1))::int; $$;
create or replace function public.w_sup_costo_stat(p_g int) returns jsonb language sql immutable as $$
  select jsonb_build_object('legno', round(8 * power(greatest(p_g,1), 1.7))::int, 'mattoni', case when p_g >= 3 then round(5 * power(p_g, 1.8))::int else 0 end); $$;

-- statistiche valide adesso (da fissare all'inizio di uno scontro)
create or replace function public.w_sup_stats(p_user uuid) returns jsonb
language sql stable security definer set search_path to 'public' as $$
  with s as (select coalesce(public.w_grado(x.xp), 1) as g, coalesce(x.stat, '{}'::jsonb) as st from public.world_superstite x where x.user_id = p_user),
       k as (select public.w_sup_cfg() as c)
  select jsonb_build_object('grado', s.g,
    'vita', (k.c->'base'->>'vita')::int + (k.c->'per_grado'->>'vita')::int * (s.g - 1) + (k.c->'stat'->>'vita')::int * coalesce((s.st->>'vita')::int, 0),
    'forza', (k.c->'base'->>'forza')::int + (k.c->'per_grado'->>'forza')::int * (s.g - 1) + (k.c->'stat'->>'forza')::int * coalesce((s.st->>'forza')::int, 0),
    'difesa', (k.c->'base'->>'difesa')::int + (k.c->'per_grado'->>'difesa')::int * (s.g - 1) + (k.c->'stat'->>'difesa')::int * coalesce((s.st->>'difesa')::int, 0),
    'agilita', (k.c->'base'->>'agilita')::int + (k.c->'per_grado'->>'agilita')::int * (s.g - 1) + (k.c->'stat'->>'agilita')::int * coalesce((s.st->>'agilita')::int, 0))
  from s, k; $$;

-- lavori finiti: il beneficio si applica qui (una volta sola)
create or replace function public.w_sup_lavori_tick() returns int
language plpgsql security definer set search_path to 'public' as $$
declare l public.world_sup_lavori; n int := 0;
begin
  for l in select * from public.world_sup_lavori where stato = 'lavori' and fine <= now() order by fine limit 200 for update skip locked loop
    if l.tipo = 'stat' then
      update public.world_superstite set stat = jsonb_set(stat, array[l.chiave], to_jsonb(greatest(coalesce((stat->>l.chiave)::int, 0), l.grado))) where user_id = l.user_id;
    elsif l.tipo = 'abil' then
      update public.world_superstite set abil = jsonb_set(abil, array[l.chiave], to_jsonb(greatest(public.w_ab(abil, l.chiave), l.grado))) where user_id = l.user_id;
    else
      update public.world_superstite set equip = jsonb_set(equip, array[l.chiave], to_jsonb(greatest(public.w_eq(equip, l.chiave), l.grado))) where user_id = l.user_id;
    end if;
    update public.world_sup_lavori set stato = 'finito' where id = l.id;
    perform public.w_feed_add('sup_lavoro', l.user_id, l.user_id, null, null, l.tipo || '|' || l.chiave || '|' || l.grado);
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.w_sup_lavoro_nuovo(p_user uuid, p_tipo text, p_chiave text, p_grado int, p_fascia int, p_costo jsonb) returns json
language plpgsql security definer set search_path to 'public' as $$
declare x public.world_sup_lavori; mins int; l int := coalesce((p_costo->>'legno')::int, 0); m int := coalesce((p_costo->>'mattoni')::int, 0);
begin
  if (select count(*) from public.world_sup_lavori where user_id = p_user and stato = 'lavori') >= (public.w_sup_cfg()->>'max_lavori')::int then
    return json_build_object('ok', false, 'msg', 'Hai già 2 sviluppi in corso: aspetta o completali con 💎'); end if;
  if exists (select 1 from public.world_sup_lavori where user_id = p_user and tipo = p_tipo and chiave = p_chiave and stato = 'lavori') then
    return json_build_object('ok', false, 'msg', 'Questo sviluppo è già in corso'); end if;
  update public.world_wallet set legno = legno - l, mattoni = mattoni - m where user_id = p_user and legno >= l and mattoni >= m;
  if not found then return json_build_object('ok', false, 'msg', format('Servono 🪵 %s%s', l, case when m > 0 then ' e 🧱 ' || m else '' end)); end if;
  if m > 0 then insert into public.world_log(user_id, delta, reason, seen) values (p_user, -m, 'Sviluppo del superstite: ' || p_chiave || ' ' || p_grado, true); end if;
  insert into public.world_sup_lavori(user_id, tipo, chiave, grado, fine, costo)
    values (p_user, p_tipo, p_chiave, p_grado, now() + make_interval(secs => public.w_sup_durata(p_fascia)), p_costo) returning * into x;
  mins := ceil(extract(epoch from x.fine - now()) / 60);
  return json_build_object('ok', true, 'id', x.id, 'fine', x.fine,
    'msg', format('⏳ Sviluppo avviato: pronto fra %s', case when mins >= 60 then (mins / 60) || ' h ' || (mins % 60) || ' min' else greatest(1, mins) || ' min' end));
exception when unique_violation then return json_build_object('ok', false, 'msg', 'Questo sviluppo è già in corso');
end $$;

-- ---------- creazione ----------
create or replace function public.world_sup_crea(p_nome text, p_avatar jsonb) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); n text := btrim(regexp_replace(coalesce(p_nome, ''), '[<>"]', '', 'g'));
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if length(n) < 2 or length(n) > 20 then return json_build_object('ok', false, 'msg', 'Il nome va da 2 a 20 lettere'); end if;
  perform public.w_sup(me);
  update public.world_superstite set nome = n,
    avatar = jsonb_build_object('v', least(greatest(coalesce((p_avatar->>'v')::int, 0), 0), 7), 'c', least(greatest(coalesce((p_avatar->>'c')::int, 0), 0), 5),
                                'a', least(greatest(coalesce((p_avatar->>'a')::int, 0), 0), 5))
    where user_id = me;
  return json_build_object('ok', true, 'msg', '🧑 ' || n || ' è pronto a sopravvivere');
end $$;

-- ---------- potenziare una statistica ----------
create or replace function public.world_sup_potenzia(p_stat text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); s public.world_superstite; g int; prossimo int; req int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_stat not in ('vita','forza','difesa','agilita') then return json_build_object('ok', false, 'msg', 'Statistica sconosciuta'); end if;
  perform public.w_sup_lavori_tick();
  s := public.w_sup(me); g := public.w_grado(s.xp);
  prossimo := coalesce((s.stat->>p_stat)::int, 0) + 1;
  if prossimo > (public.w_sup_cfg()->>'stat_max')::int then return json_build_object('ok', false, 'msg', 'Già al massimo'); end if;
  req := public.w_sup_richiesto(prossimo);
  if g < req then return json_build_object('ok', false, 'msg', format('Serve il grado %s (sei al %s)', req, g)); end if;
  return public.w_sup_lavoro_nuovo(me, 'stat', p_stat, prossimo, prossimo, public.w_sup_costo_stat(prossimo));
end $$;

-- abilità: stessi punti di prima (1 per grado), ora a tempo
create or replace function public.world_sup_abilita(p_k text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); s public.world_superstite; liberi int; a int; mx int; inc int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_k not in ('esploratore','resistenza','combattente','cercatore','mercante') then return json_build_object('ok', false, 'msg', 'Abilità sconosciuta'); end if;
  perform public.w_sup_lavori_tick();
  s := public.w_sup(me);
  inc := (select count(*) from public.world_sup_lavori where user_id = me and tipo = 'abil' and stato = 'lavori');
  liberi := (public.w_grado(s.xp) - 1) - inc - (select coalesce(sum(public.w_ab(s.abil, k)), 0) from unnest(array['esploratore','resistenza','combattente','cercatore','mercante']) k);
  a := public.w_ab(s.abil, p_k); mx := case when p_k = 'combattente' then 9 else 5 end;
  if liberi <= 0 then return json_build_object('ok', false, 'msg', 'Nessun punto libero: sali di grado con l’esperienza'); end if;
  if a >= mx then return json_build_object('ok', false, 'msg', format('Questa abilità è già al massimo (%s)', mx)); end if;
  return public.w_sup_lavoro_nuovo(me, 'abil', p_k, a + 1, (public.w_sup_cfg()->>'abil_fascia')::int * (a + 1), jsonb_build_object('legno', 10 * (a + 1)));
end $$;

-- attrezzi: stessi costi di prima, ora a tempo e con il grado richiesto
create or replace function public.world_sup_equip(p_k text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); s public.world_superstite; lv int; req int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_k not in ('zaino','torcia','arma','radio') then return json_build_object('ok', false, 'msg', 'Oggetto sconosciuto'); end if;
  perform public.w_sup_lavori_tick();
  s := public.w_sup(me);
  lv := public.w_eq(s.equip, p_k) + 1;
  if lv > 3 then return json_build_object('ok', false, 'msg', 'È già al livello massimo (3)'); end if;
  req := (public.w_sup_cfg()->'equip_richiesto'->>(lv - 1))::int;
  if public.w_grado(s.xp) < req then return json_build_object('ok', false, 'msg', format('Serve il grado %s', req)); end if;
  return public.w_sup_lavoro_nuovo(me, 'equip', p_k, lv, (public.w_sup_cfg()->'equip_fascia'->>(lv - 1))::int, jsonb_build_object('legno', 30 * lv, 'mattoni', 50 * lv));
end $$;

-- ---------- tutto per la scheda ----------
create or replace function public.world_sup_profilo() returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); s public.world_superstite; g int; k jsonb := public.w_sup_cfg();
begin
  if me is null then return json_build_object('ok', false); end if;
  perform public.w_sup_lavori_tick();
  s := public.w_sup(me); g := public.w_grado(s.xp);
  return json_build_object('ok', true, 'nome', s.nome, 'avatar', s.avatar, 'grado', g, 'xp', s.xp, 'xp_da', 50 * (g - 1) * (g - 1), 'xp_a', 50 * g * g,
    'stats', public.w_sup_stats(me), 'stat', s.stat, 'cfg', k, 'ora', now(),
    'prossimi', (select json_object_agg(z, json_build_object('grado', coalesce((s.stat->>z)::int, 0) + 1,
        'richiesto', public.w_sup_richiesto(coalesce((s.stat->>z)::int, 0) + 1), 'secondi', public.w_sup_durata(coalesce((s.stat->>z)::int, 0) + 1),
        'costo', public.w_sup_costo_stat(coalesce((s.stat->>z)::int, 0) + 1), 'beneficio', (k->'stat'->>z)::int,
        'max', coalesce((s.stat->>z)::int, 0) >= (k->>'stat_max')::int))
      from unnest(array['vita','forza','difesa','agilita']) z),
    'lavori', coalesce((select json_agg(json_build_object('id', l.id, 'tipo', l.tipo, 'chiave', l.chiave, 'grado', l.grado, 'inizio', l.inizio, 'fine', l.fine) order by l.fine)
      from public.world_sup_lavori l where l.user_id = me and l.stato = 'lavori'), '[]'::json));
end $$;

create or replace function public.world_completa_subito(p_tipo text, p_id bigint, p_costo_visto int) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); fine timestamptz; nuova timestamptz; costo int; s int; c public.world_cantieri; sp public.world_spedizioni;
  a public.world_attacchi; rf public.world_attacchi_rinforzi; sl public.world_sup_lavori; k jsonb := public.w_gem_cfg();
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_tipo = 'cantiere' then
    select * into c from public.world_cantieri where id = p_id and user_id = me for update;
    if c.id is null or c.stato <> 'lavori' then return json_build_object('ok', false, 'msg', 'Lavori già finiti'); end if;
    fine := c.fine; nuova := now();
  elsif p_tipo = 'sup' then
    select * into sl from public.world_sup_lavori where id = p_id and user_id = me for update;
    if sl.id is null or sl.stato <> 'lavori' then return json_build_object('ok', false, 'msg', 'Sviluppo già finito'); end if;
    fine := sl.fine; nuova := now();
  elsif p_tipo = 'spedizione' then
    select * into sp from public.world_spedizioni where id = p_id and user_id = me for update;
    if sp.id is null or sp.stato <> 'via' or sp.end_at <= now() then return json_build_object('ok', false, 'msg', 'Il superstite è già tornato'); end if;
    fine := sp.end_at; nuova := now();
  elsif p_tipo = 'attacco' then
    select * into a from public.world_attacchi where id = p_id and stato = 'viaggio' and attaccante = me for update;
    if a.id is null then return json_build_object('ok', false, 'msg', 'Attacco non più in viaggio'); end if;
    fine := a.impatto; nuova := now() + make_interval(mins => (k->>'attacco_min_rimasti')::int);
    if nuova >= fine then return json_build_object('ok', false, 'msg', 'Arriva già fra pochi minuti: non si può accelerare oltre'); end if;
  elsif p_tipo = 'rinforzo' then
    select * into rf from public.world_attacchi_rinforzi where id = p_id and helper = me for update;
    if rf.id is null or rf.arrivo <= now() then return json_build_object('ok', false, 'msg', 'I rinforzi sono già arrivati'); end if;
    fine := rf.arrivo; nuova := now();
  else return json_build_object('ok', false, 'msg', 'Attività non accelerabile'); end if;
  costo := greatest((k->>'subito_min')::int, ceil(greatest(0, extract(epoch from fine - nuova) / 60.0) / (k->>'min_per_gemma')::numeric)::int);
  if p_costo_visto is not null and costo > p_costo_visto then
    return json_build_object('ok', false, 'costo', costo, 'msg', format('Il costo ora è 💎 %s: conferma di nuovo', costo)); end if;
  s := public.w_gemme_add(me, -costo, 'Completa subito: ' || p_tipo, p_tipo || ':' || p_id, 'sub:' || p_tipo || ':' || p_id || ':' || to_char(fine, 'YYYYMMDDHH24MISS'));
  if s = -1 then return json_build_object('ok', true, 'gia', true, 'msg', 'Già completato'); end if;
  if s is null then return json_build_object('ok', false, 'costo', costo, 'msg', format('Servono 💎 %s', costo)); end if;
  if p_tipo = 'cantiere' then update public.world_cantieri set fine = nuova where id = p_id; perform public.w_cantieri_tick();
  elsif p_tipo = 'sup' then update public.world_sup_lavori set fine = nuova where id = p_id; perform public.w_sup_lavori_tick();
  elsif p_tipo = 'spedizione' then update public.world_spedizioni set end_at = nuova where id = p_id;
  elsif p_tipo = 'attacco' then
    update public.world_attacchi set impatto = nuova where id = p_id;
    perform public.w_feed_add('pvp_arrivo', me, a.vittima, a.lat, a.lon, a.id || '|' || (k->>'attacco_min_rimasti') || '|accelerato');
  elsif p_tipo = 'rinforzo' then
    update public.world_attacchi_rinforzi set arrivo = least(nuova, (select impatto from public.world_attacchi where id = rf.attacco_id)) where id = p_id;
  end if;
  return json_build_object('ok', true, 'costo', costo, 'gemme', s, 'msg', format('⚡ Fatto · 💎 −%s · ti restano 💎 %s', costo, s));
end $$;


revoke all on function public.w_sup_lavori_tick() from public, anon, authenticated;
grant execute on function public.w_sup_lavori_tick() to service_role;
revoke all on function public.w_sup_lavoro_nuovo(uuid, text, text, int, int, jsonb) from public, anon, authenticated;
revoke all on function public.w_sup_stats(uuid) from public, anon, authenticated;
revoke all on function public.world_sup_crea(text, jsonb) from public, anon;
revoke all on function public.world_sup_potenzia(text) from public, anon;
revoke all on function public.world_sup_profilo() from public, anon;
grant execute on function public.world_sup_crea(text, jsonb) to authenticated;
grant execute on function public.world_sup_potenzia(text) to authenticated;
grant execute on function public.world_sup_profilo() to authenticated;

-- ogni minuto: sviluppi del superstite finiti
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('zsh-sup-lavori') where exists (select 1 from cron.job where jobname = 'zsh-sup-lavori');
    perform cron.schedule('zsh-sup-lavori', '* * * * *', 'select public.w_sup_lavori_tick();');
  end if;
end $$;

-- controllo: deve dire "superstite pronto"
select case when exists (select 1 from pg_proc where proname = 'world_sup_profilo') then 'superstite pronto' else 'qualcosa manca' end as esito;

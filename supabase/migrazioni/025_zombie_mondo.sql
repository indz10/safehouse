-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 025 — 🧟 ZOMBIE NEL MONDO VERO, 📦 CASSE e 📖 ZOMBIPEDIA (scelta di Alessandro, 16/11)
-- Stile Pokémon GO con gli zombie, per la Lente:
--  - Gli zombie compaiono in punti VERI: il mondo è diviso in quadretti di ~150 m e ogni ora, in ognuno, può esserci uno
--    zombie (35%) e più raramente una cassa (7%). Sono uguali per tutti (stesso quadretto, stessa ora → stesso zombie):
--    li calcola il server, nessuna tabella da riempire. Si vedono sulla mappa e nella Lente.
--  - 12 tipi in 4 rarità: comuni (60%), non comuni (25%), rari (12%), leggendari (3%). Più sono rari, più colpi servono
--    e più premi danno. Ogni zombie abbattuto finisce nella 📖 Zombipedia (collezione).
--  - Per combattere devi essere a meno di 80 m (GPS) e costa 1 energia; per aprire una cassa a meno di 40 m (gratis).
--    Ogni zombie e ogni cassa si prendono una volta sola a testa.
-- Richiede le migrazioni 020–024. Si può eseguire più volte.
-- =====================================================================

create table if not exists public.world_zombie_presi (
  user_id uuid not null references auth.users(id) on delete cascade,
  zid text not null,
  tipo text not null,
  at timestamptz not null default now(),
  primary key (user_id, zid)
);
alter table public.world_zombie_presi enable row level security;
create index if not exists world_zombie_presi_tipo on public.world_zombie_presi(user_id, tipo);

create table if not exists public.world_zombie_lotte (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  zid text not null,
  tipo text not null,
  hp int not null,
  start_at timestamptz not null default now(),
  fine_at timestamptz,
  vinto boolean
);
alter table public.world_zombie_lotte enable row level security;
create index if not exists world_zombie_lotte_user on public.world_zombie_lotte(user_id, start_at desc);

-- i 12 tipi: codice, nome, emoji, rarità (1 comune … 4 leggendario), colpi, peso dentro la rarità
create or replace function public.w_zm_tipi() returns table(k text, nome text, ic text, rar int, hp int) language sql immutable as $$
  values ('vagante','Vagante','🧟',1,3),('corridore','Corridore','🧟‍♂️',1,3),('urlatrice','Urlatrice','🧟‍♀️',1,4),
         ('bruto','Bruto','💪',2,6),('sputatore','Sputatore','🤢',2,5),('cane','Cane zombie','🐕',2,5),('operaio','Operaio','👷',2,6),
         ('soldato','Soldato','🪖',3,9),('dottore','Dottore','🧑‍⚕️',3,8),('clown','Clown','🤡',3,9),
         ('re','Re dei morti','👑',4,14),('strega','Strega','🧙',4,13); $$;

-- lo zombie (o la cassa) di un quadretto in un'ora: sempre uguale, calcolato da un numero "a caso" fisso
create or replace function public.w_zm_qua(p_i int, p_j int, p_ora bigint) returns json language sql immutable as $$
  with h as (select abs(hashtext(p_i || ':' || p_j || ':' || p_ora)) as a, abs(hashtext('t' || p_i || ':' || p_j || ':' || p_ora)) as b,
                    abs(hashtext('c' || p_i || ':' || p_j || ':' || p_ora)) as c),
  r as (select a, b, c, case when b % 100 < 60 then 1 when b % 100 < 85 then 2 when b % 100 < 97 then 3 else 4 end as rar from h),
  t as (select r.*, (select x.k from public.w_zm_tipi() x where x.rar = r.rar order by x.k offset (r.b / 100) % (select count(*) from public.w_zm_tipi() y where y.rar = r.rar) limit 1) as k from r)
  select json_build_object(
    'zombie', a % 100 < 35, 'zid', 'z' || p_i || '_' || p_j || '_' || p_ora, 'tipo', k,
    'lat', (p_i + 0.15 + (a % 1000) / 1000.0 * 0.7) * 0.0014, 'lon', (p_j + 0.15 + (b % 997) / 997.0 * 0.7) * 0.0019,
    'cassa', c % 100 < 7, 'cid', 'c' || p_i || '_' || p_j || '_' || p_ora,
    'clat', (p_i + 0.2 + (c % 991) / 991.0 * 0.6) * 0.0014, 'clon', (p_j + 0.2 + ((c / 7) % 983) / 983.0 * 0.6) * 0.0019) from t; $$;

create or replace function public.w_zm_ora() returns bigint language sql stable as $$ select floor(extract(epoch from now()) / 3600)::bigint; $$;

-- zombie e casse entro ~1 km dal punto (di solito la tua posizione GPS)
create or replace function public.world_zombie_vicini(p_lat double precision, p_lon double precision) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); ci int; cj int; o bigint := public.w_zm_ora(); out json[] := '{}'; q json; i int; j int;
begin
  if me is null or p_lat is null or p_lon is null then return '[]'::json; end if;
  ci := floor(p_lat / 0.0014); cj := floor(p_lon / 0.0019);
  for i in ci - 4 .. ci + 4 loop for j in cj - 4 .. cj + 4 loop
    q := public.w_zm_qua(i, j, o);
    if (q->>'zombie')::boolean then
      out := out || json_build_object('k', 'zombie', 'id', q->>'zid', 'tipo', q->>'tipo', 'lat', (q->>'lat')::float, 'lon', (q->>'lon')::float,
        'preso', exists (select 1 from public.world_zombie_presi p where p.user_id = me and p.zid = q->>'zid'));
    end if;
    if (q->>'cassa')::boolean then
      out := out || json_build_object('k', 'cassa', 'id', q->>'cid', 'lat', (q->>'clat')::float, 'lon', (q->>'clon')::float,
        'preso', exists (select 1 from public.world_zombie_presi p where p.user_id = me and p.zid = q->>'cid'));
    end if;
  end loop; end loop;
  return json_build_object('ora', o, 'fine', to_timestamp((o + 1) * 3600), 'L', array_to_json(out));
end $$;

-- trova uno zombie/cassa valido dall'id (ora attuale o quella appena passata, per chi è a cavallo dell'ora)
create or replace function public.w_zm_trova(p_id text) returns json language plpgsql stable as $$
declare m text[]; q json; o bigint := public.w_zm_ora();
begin
  m := regexp_match(p_id, '^([zc])(-?\d+)_(-?\d+)_(\d+)$');
  if m is null then return null; end if;
  if m[4]::bigint not in (o, o - 1) then return null; end if;
  q := public.w_zm_qua(m[2]::int, m[3]::int, m[4]::bigint);
  if m[1] = 'z' and (q->>'zombie')::boolean then return json_build_object('k','zombie','tipo',q->>'tipo','lat',(q->>'lat')::float,'lon',(q->>'lon')::float); end if;
  if m[1] = 'c' and (q->>'cassa')::boolean then return json_build_object('k','cassa','lat',(q->>'clat')::float,'lon',(q->>'clon')::float); end if;
  return null;
end $$;

create or replace function public.world_zombie_lotta(p_id text, p_lat double precision, p_lon double precision) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); z json; s public.world_superstite; t record; nid bigint; w public.world_wallet; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); n int;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  z := public.w_zm_trova(p_id);
  if z is null or z->>'k' <> 'zombie' then return json_build_object('ok', false, 'msg', 'Questo zombie è sparito'); end if;
  if exists (select 1 from public.world_zombie_presi where user_id = me and zid = p_id) then return json_build_object('ok', false, 'msg', 'L’hai già abbattuto'); end if;
  if p_lat is null or public.w_km(p_lat, p_lon, (z->>'lat')::float, (z->>'lon')::float) > 0.08 then return json_build_object('ok', false, 'msg', 'Avvicinati: devi essere a meno di 80 m'); end if;
  w := public.w_wallet(me); n := coalesce((w.caps->>('lotte:' || day))::int, 0);
  if n >= 40 then return json_build_object('ok', false, 'msg', 'Oggi hai già combattuto 40 volte: riposati'); end if;
  s := public.w_sup(me);
  if s.energia < 1 then return json_build_object('ok', false, 'msg', format('Serve 1 energia: si ricarica da sola (1 ogni %s min)', public.w_en_ric(s.abil))); end if;
  update public.world_superstite set energia = energia - 1, energia_at = case when energia >= public.w_en_max(abil) then now() else energia_at end where user_id = me;
  update public.world_wallet set caps = jsonb_set(caps, array['lotte:' || day], to_jsonb(n + 1)) where user_id = me;
  select * into t from public.w_zm_tipi() x where x.k = z->>'tipo';
  update public.world_zombie_lotte set fine_at = now(), vinto = false where user_id = me and fine_at is null;
  insert into public.world_zombie_lotte(user_id, zid, tipo, hp) values (me, p_id, t.k, t.hp + public.w_grado(s.xp) / 8) returning id into nid;
  return json_build_object('ok', true, 'id', nid, 'tipo', t.k, 'nome', t.nome, 'ic', t.ic, 'rar', t.rar, 'hp', t.hp + public.w_grado(s.xp) / 8,
    'danno', 1 + case when public.w_eq(s.equip,'arma') >= 2 then 1 else 0 end, 'cuori', 3 + public.w_ab(s.abil, 'combattente') / 2);
end $$;

create or replace function public.world_zombie_fine(p_id bigint, p_vinto boolean) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); l public.world_zombie_lotte; t record; el numeric; v boolean; xp int := 0; q int := 0; mt int := 0; got json; nuovo boolean := false; g0 int; s public.world_superstite;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  select * into l from public.world_zombie_lotte where id = p_id and user_id = me for update;
  if l.id is null or l.fine_at is not null then return json_build_object('ok', false, 'msg', 'Lotta già chiusa'); end if;
  el := extract(epoch from (now() - l.start_at));
  v := coalesce(p_vinto, false) and el >= l.hp * 0.35 and el <= 300;
  select * into t from public.w_zm_tipi() x where x.k = l.tipo;
  update public.world_zombie_lotte set fine_at = now(), vinto = v where id = p_id;
  if v then
    nuovo := not exists (select 1 from public.world_zombie_presi where user_id = me and tipo = l.tipo);
    insert into public.world_zombie_presi(user_id, zid, tipo) values (me, l.zid, l.tipo) on conflict do nothing;
    s := public.w_sup(me); g0 := public.w_grado(s.xp);
    xp := case t.rar when 1 then 8 when 2 then 15 when 3 then 30 else 60 end + case when nuovo then 20 else 0 end;
    q := case t.rar when 1 then 4 when 2 then 7 when 3 then 12 else 20 end;
    got := public.w_res(me, q, q, q / 2); perform public.w_xp(me, xp);
    if t.rar >= 3 then mt := case t.rar when 3 then 10 else 30 end; perform public.w_pay(me, mt, 'Lente: ' || t.nome || ' abbattuto'); end if;
    s := public.w_sup(me);
    return json_build_object('ok', true, 'vinto', true, 'nome', t.nome, 'ic', t.ic, 'rar', t.rar, 'nuovo', nuovo, 'xp', xp,
      'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int, 'carb', (got->>'carb')::int, 'mattoni', mt, 'salito', public.w_grado(s.xp) > g0, 'grado', public.w_grado(s.xp));
  end if;
  return json_build_object('ok', true, 'vinto', false, 'nome', t.nome, 'msg', 'È scappato: riprova (resta lì fino alla fine dell’ora)');
end $$;

create or replace function public.world_cassa_apri(p_id text, p_lat double precision, p_lon double precision) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); z json; r numeric; l int; f int; k int; mt int := 0; got json;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  z := public.w_zm_trova(p_id);
  if z is null or z->>'k' <> 'cassa' then return json_build_object('ok', false, 'msg', 'La cassa non c’è più'); end if;
  if p_lat is null or public.w_km(p_lat, p_lon, (z->>'lat')::float, (z->>'lon')::float) > 0.04 then return json_build_object('ok', false, 'msg', 'Avvicinati: devi essere a meno di 40 m'); end if;
  if exists (select 1 from public.world_zombie_presi where user_id = me and zid = p_id) then return json_build_object('ok', false, 'msg', 'L’hai già aperta'); end if;
  insert into public.world_zombie_presi(user_id, zid, tipo) values (me, p_id, 'cassa');
  r := random(); l := 6 + floor(random() * 10); f := 6 + floor(random() * 10); k := 3 + floor(random() * 6);
  got := public.w_res(me, l, f, k); perform public.w_xp(me, 10);
  if r < 0.15 then mt := 10 + floor(random() * 15); perform public.w_pay(me, mt, 'Lente: cassa con mattoni'); end if;
  if r > 0.9 then update public.world_superstite set bombe = least(5, bombe + 1) where user_id = me; end if;
  return json_build_object('ok', true, 'legno', (got->>'legno')::int, 'cibo', (got->>'cibo')::int, 'carb', (got->>'carb')::int, 'mattoni', mt, 'bomba', r > 0.9, 'xp', 10);
end $$;

create or replace function public.world_zombipedia() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('tipi', (select json_agg(json_build_object('k', t.k, 'nome', t.nome, 'ic', t.ic, 'rar', t.rar, 'hp', t.hp,
      'presi', (select count(*) from public.world_zombie_presi p where p.user_id = auth.uid() and p.tipo = t.k)) order by t.rar, t.k) from public.w_zm_tipi() t),
    'casse', (select count(*) from public.world_zombie_presi p where p.user_id = auth.uid() and p.tipo = 'cassa')); $$;

revoke all on function public.world_zombie_vicini(double precision, double precision) from public, anon;
revoke all on function public.world_zombie_lotta(text, double precision, double precision) from public, anon;
revoke all on function public.world_zombie_fine(bigint, boolean) from public, anon;
revoke all on function public.world_cassa_apri(text, double precision, double precision) from public, anon;
revoke all on function public.world_zombipedia() from public, anon;
grant execute on function public.world_zombie_vicini(double precision, double precision) to authenticated;
grant execute on function public.world_zombie_lotta(text, double precision, double precision) to authenticated;
grant execute on function public.world_zombie_fine(bigint, boolean) to authenticated;
grant execute on function public.world_cassa_apri(text, double precision, double precision) to authenticated;
grant execute on function public.world_zombipedia() to authenticated;

-- controllo: deve dire "zombie nel mondo pronti"
select case when exists (select 1 from pg_proc where proname = 'world_zombie_lotta') and exists (select 1 from pg_proc where proname = 'world_zombipedia')
       then 'zombie nel mondo pronti' else 'qualcosa manca' end as esito;

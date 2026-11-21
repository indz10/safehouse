-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 042 — 💎 GEMME: UNICA VALUTA PREMIUM, DECISA DAL SERVER (20/11)
-- 1) Saldo vero: world_wallet.gemme (mai sotto zero) + registro world_gemme_mov (ogni movimento, con chiave
--    unica: un doppio tocco o una richiesta ripetuta non spende e non premia due volte).
-- 2) Le vecchie gemme dell'app (salvate solo sul telefono) NON diventano gemme vere: si annota quante erano
--    (world_gemme_legacy) per decidere dopo. Nessuna conversione inventata.
-- 3) Regole in un posto solo: w_gem_cfg() — costo di "completa subito", cambi gemme → risorse, gemme ai livelli e
--    ai traguardi, pacchetti in vendita. Valori PROVVISORI da bilanciare.
-- 4) Gemme guadagnate giocando: a ogni livello nuovo del superstite (w_xp) e ai traguardi, una volta sola.
-- 5) 💎 → risorse (world_gemme_converti); niente risorse → gemme.
-- 6) "Completa subito" (world_completa_subito) per cantieri, restauri e potenziamenti, spedizioni, rinforzi in
--    viaggio e attacchi in viaggio: il lavoro finisce con le regole normali (nessun esito regalato). Gli attacchi
--    non possono arrivare prima di 5 minuti dall'accelerazione (la vittima deve poter reagire) e la vittima riceve
--    l'avviso col nuovo orario. Il prezzo dipende dai minuti che mancano e scende con l'attesa.
-- 7) Acquisti: tabella world_gemme_ordini e w_gemme_pagato (solo dal server dei pagamenti, quando sarà acceso);
--    acquisti di PROVA solo per l'amministratore, segnati 'test' nel registro.
-- 8) 🥫 Il cibo non arriva più "col tempo": niente cibo all'accesso del giorno, i presidi piazza/centro/chiesa danno
--    legno invece di cibo. Il cibo già posseduto resta. L'energia continua a ricaricarsi.
-- Si può eseguire più volte.
-- =====================================================================
alter table public.world_wallet add column if not exists gemme int not null default 0;
alter table public.world_wallet drop constraint if exists world_wallet_gemme_check;
alter table public.world_wallet add constraint world_wallet_gemme_check check (gemme >= 0);

create table if not exists public.world_gemme_mov (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta int not null,
  saldo int not null,
  motivo text not null,
  ref text,
  chiave text unique,
  test boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists world_gemme_mov_u on public.world_gemme_mov(user_id, created_at desc);
alter table public.world_gemme_mov enable row level security;
drop policy if exists gemme_mov_mie on public.world_gemme_mov;
create policy gemme_mov_mie on public.world_gemme_mov for select using (user_id = auth.uid());

create table if not exists public.world_gemme_legacy (
  user_id uuid primary key references auth.users(id) on delete cascade,
  n int not null,
  at timestamptz not null default now()
);
alter table public.world_gemme_legacy enable row level security;

create table if not exists public.world_gemme_ordini (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  pacchetto text not null,
  gemme int not null,
  prezzo_cent int not null,
  stato text not null default 'creato' check (stato in ('creato','pagato','annullato')),
  rif_pagamento text unique,
  created_at timestamptz not null default now(),
  pagato_at timestamptz
);
alter table public.world_gemme_ordini enable row level security;

-- ---------- regole (PROVVISORIE) ----------
create or replace function public.w_gem_cfg() returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'provvisorio', true,
    -- completa subito: 1 💎 ogni 'min_per_gemma' minuti che mancano (arrotondato in su), minimo 1
    'min_per_gemma', 6, 'subito_min', 1,
    'attacco_min_rimasti', 5,                     -- un attacco accelerato arriva comunque fra almeno 5 minuti
    -- 1 💎 = …
    'cambio', jsonb_build_object('cibo', 10, 'legno', 10, 'carb', 8, 'mattoni', 15),
    'cambio_max', 200,                            -- 💎 massime per singolo cambio
    -- gemme a ogni livello nuovo del superstite: base + per_livello × livello
    'livello_base', 3, 'livello_per', 1,
    'traguardi', jsonb_build_array(
      jsonb_build_object('id','liv5','liv',5,'gemme',20,'nome','Grado 5: Sopravvissuto vero'),
      jsonb_build_object('id','liv10','liv',10,'gemme',50,'nome','Grado 10: Veterano'),
      jsonb_build_object('id','liv15','liv',15,'gemme',80,'nome','Grado 15: Esperto'),
      jsonb_build_object('id','liv20','liv',20,'gemme',120,'nome','Grado 20: Comandante'),
      jsonb_build_object('id','liv30','liv',30,'gemme',200,'nome','Grado 30: Leggenda')),
    'pacchetti', jsonb_build_array(
      jsonb_build_object('id','p1','gemme',60,'prezzo_cent',99),
      jsonb_build_object('id','p2','gemme',330,'prezzo_cent',499),
      jsonb_build_object('id','p3','gemme',700,'prezzo_cent',999),
      jsonb_build_object('id','p4','gemme',1500,'prezzo_cent',1999)),
    'pagamenti_attivi', false); $$;

create or replace function public.w_gemme_costo(p_fine timestamptz) returns int language sql stable as $$
  select greatest((public.w_gem_cfg()->>'subito_min')::int,
    ceil(greatest(0, extract(epoch from p_fine - now()) / 60.0) / (public.w_gem_cfg()->>'min_per_gemma')::numeric)::int); $$;

-- movimento atomico e senza doppioni: con la stessa chiave non fa niente e risponde col saldo di allora
create or replace function public.w_gemme_add(p_user uuid, p_delta int, p_motivo text, p_ref text, p_chiave text, p_test boolean default false) returns int
language plpgsql security definer set search_path to 'public' as $$
declare s int;
begin
  if p_user is null or coalesce(p_delta, 0) = 0 then return null; end if;
  perform public.w_wallet(p_user);
  if p_chiave is not null and exists (select 1 from public.world_gemme_mov where chiave = p_chiave) then return -1; end if;
  update public.world_wallet set gemme = gemme + p_delta where user_id = p_user and gemme + p_delta >= 0 returning gemme into s;
  if s is null then return null; end if;
  insert into public.world_gemme_mov(user_id, delta, saldo, motivo, ref, chiave, test) values (p_user, p_delta, s, left(p_motivo, 120), p_ref, p_chiave, coalesce(p_test, false));
  return s;
exception when unique_violation then
  raise exception 'gemme_doppione';
end $$;

-- le gemme dei livelli e dei traguardi (una volta sola per livello / traguardo)
create or replace function public.w_gemme_livello(p_user uuid, p_da int, p_a int) returns void
language plpgsql security definer set search_path to 'public' as $$
declare k jsonb := public.w_gem_cfg(); g int; t jsonb;
begin
  if p_a <= p_da then return; end if;
  for g in (p_da + 1)..p_a loop
    perform public.w_gemme_add(p_user, (k->>'livello_base')::int + (k->>'livello_per')::int * g, 'Grado ' || g || ' raggiunto', null, 'liv:' || p_user || ':' || g);
    for t in select * from jsonb_array_elements(k->'traguardi') loop
      if (t->>'liv')::int = g then
        perform public.w_gemme_add(p_user, (t->>'gemme')::int, 'Traguardo: ' || (t->>'nome'), t->>'id', 'trg:' || p_user || ':' || (t->>'id'));
      end if;
    end loop;
  end loop;
end $$;

create or replace function public.w_xp(p_user uuid, p_n integer) returns integer
language plpgsql security definer set search_path to 'public' as $$
declare x int; prima int;
begin
  if p_user is null or coalesce(p_n,0) <= 0 then return 0; end if;
  select xp into prima from public.world_superstite where user_id = p_user for update;
  insert into public.world_superstite(user_id, xp) values (p_user, p_n)
    on conflict (user_id) do update set xp = public.world_superstite.xp + excluded.xp returning xp into x;
  perform public.w_gemme_livello(p_user, public.w_grado(coalesce(prima, 0)), public.w_grado(x));
  return x;
end $$;

-- ---------- 💎 → risorse ----------
create or replace function public.world_gemme_converti(p_ris text, p_gemme int, p_chiave text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); k jsonb := public.w_gem_cfg(); r int; n int; s int; got json;
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_ris not in ('cibo','legno','carb','mattoni') then return json_build_object('ok', false, 'msg', 'Risorsa non valida'); end if;
  n := coalesce(p_gemme, 0);
  if n < 1 or n > (k->>'cambio_max')::int then return json_build_object('ok', false, 'msg', 'Da 1 a ' || (k->>'cambio_max') || ' 💎 per volta'); end if;
  r := n * (k->'cambio'->>p_ris)::int;
  s := public.w_gemme_add(me, -n, 'Cambio in ' || p_ris, p_ris, case when coalesce(p_chiave,'') <> '' then 'cmb:' || me || ':' || p_chiave end);
  if s = -1 then return json_build_object('ok', true, 'gia', true, 'msg', 'Cambio già fatto'); end if;
  if s is null then return json_build_object('ok', false, 'msg', 'Gemme insufficienti'); end if;
  if p_ris = 'mattoni' then perform public.w_pay(me, r, 'Cambio: 💎 ' || n);
  else update public.world_wallet set legno = legno + case when p_ris = 'legno' then r else 0 end, cibo = cibo + case when p_ris = 'cibo' then r else 0 end,
         carb = carb + case when p_ris = 'carb' then r else 0 end where user_id = me; end if;
  return json_build_object('ok', true, 'ricevi', r, 'ris', p_ris, 'gemme', s, 'msg', format('💎 −%s → %s +%s · ti restano 💎 %s', n,
    case p_ris when 'cibo' then '🥫' when 'legno' then '🪵' when 'carb' then '⛽' else '🧱' end, r, s));
end $$;

-- ---------- completa subito ----------
create or replace function public.world_completa_subito(p_tipo text, p_id bigint, p_costo_visto int) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); fine timestamptz; nuova timestamptz; costo int; s int; c public.world_cantieri; sp public.world_spedizioni;
  a public.world_attacchi; rf public.world_attacchi_rinforzi; k jsonb := public.w_gem_cfg();
begin
  if me is null then return json_build_object('ok', false, 'msg', 'Accedi'); end if;
  if p_tipo = 'cantiere' then
    select * into c from public.world_cantieri where id = p_id and user_id = me for update;
    if c.id is null or c.stato <> 'lavori' then return json_build_object('ok', false, 'msg', 'Lavori già finiti'); end if;
    fine := c.fine; nuova := now();
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
  elsif p_tipo = 'spedizione' then update public.world_spedizioni set end_at = nuova where id = p_id;
  elsif p_tipo = 'attacco' then
    update public.world_attacchi set impatto = nuova where id = p_id;
    perform public.w_feed_add('pvp_arrivo', me, a.vittima, a.lat, a.lon, a.id || '|' || (k->>'attacco_min_rimasti') || '|accelerato');
  elsif p_tipo = 'rinforzo' then
    update public.world_attacchi_rinforzi set arrivo = least(nuova, (select impatto from public.world_attacchi where id = rf.attacco_id)) where id = p_id;
  end if;
  return json_build_object('ok', true, 'costo', costo, 'gemme', s, 'msg', format('⚡ Fatto · 💎 −%s · ti restano 💎 %s', costo, s));
end $$;

-- il vecchio "accelera" dei cantieri ora usa le gemme
create or replace function public.world_cantiere_accelera(p_id bigint) returns json
language sql security definer set search_path to 'public' as $$ select public.world_completa_subito('cantiere', p_id, null); $$;

-- ---------- negozio e saldo ----------
create or replace function public.world_gemme_info() returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); k jsonb := public.w_gem_cfg(); g int; xp int;
begin
  if me is null then return json_build_object('ok', false); end if;
  perform public.w_wallet(me);
  select coalesce(s.xp, 0) into xp from public.world_superstite s where s.user_id = me; xp := coalesce(xp, 0); g := public.w_grado(xp);
  return json_build_object('ok', true, 'gemme', (select gemme from public.world_wallet where user_id = me), 'cfg', k - 'pagamenti_attivi',
    'pagamenti', (k->>'pagamenti_attivi')::boolean, 'admin', public.is_admin(), 'grado', g, 'xp', xp,
    'xp_prossimo', 50 * g * g, 'prossimo_livello', (k->>'livello_base')::int + (k->>'livello_per')::int * (g + 1),
    'traguardi', (select json_agg(json_build_object('id', t->>'id', 'liv', (t->>'liv')::int, 'gemme', (t->>'gemme')::int, 'nome', t->>'nome',
        'preso', exists (select 1 from public.world_gemme_mov m where m.chiave = 'trg:' || me || ':' || (t->>'id')))) from jsonb_array_elements(k->'traguardi') t),
    'movimenti', coalesce((select json_agg(json_build_object('delta', m.delta, 'saldo', m.saldo, 'motivo', m.motivo, 'test', m.test, 'at', m.created_at) order by m.id desc)
      from (select * from public.world_gemme_mov where user_id = me order by id desc limit 20) m), '[]'::json),
    'legacy', (select n from public.world_gemme_legacy where user_id = me));
end $$;

-- le vecchie gemme del telefono: si annotano una volta, non si accreditano
create or replace function public.world_gemme_legacy_segna(p_n int) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid();
begin
  if me is null or coalesce(p_n, 0) <= 0 then return json_build_object('ok', false); end if;
  insert into public.world_gemme_legacy(user_id, n) values (me, least(p_n, 100000)) on conflict (user_id) do nothing;
  return json_build_object('ok', true);
end $$;

-- pagamento confermato dal server dei pagamenti (funzione Edge, mai dall'app)
create or replace function public.w_gemme_pagato(p_ordine bigint, p_rif text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare o public.world_gemme_ordini; s int;
begin
  select * into o from public.world_gemme_ordini where id = p_ordine for update;
  if o.id is null then return json_build_object('ok', false, 'msg', 'ordine?'); end if;
  if o.stato = 'pagato' then return json_build_object('ok', true, 'gia', true); end if;
  update public.world_gemme_ordini set stato = 'pagato', rif_pagamento = p_rif, pagato_at = now() where id = o.id;
  s := public.w_gemme_add(o.user_id, o.gemme, 'Acquisto ' || o.pacchetto, o.id::text, 'ord:' || o.id);
  return json_build_object('ok', true, 'gemme', s);
end $$;

-- acquisto di PROVA: solo l'amministratore, segnato 'test' (per provare il negozio senza pagamenti veri)
create or replace function public.world_gemme_prova(p_pacchetto text, p_chiave text) returns json
language plpgsql security definer set search_path to 'public' as $$
declare me uuid := auth.uid(); p jsonb; s int;
begin
  if me is null or not public.is_admin() then return json_build_object('ok', false, 'msg', 'I pagamenti non sono ancora attivi'); end if;
  select x into p from jsonb_array_elements(public.w_gem_cfg()->'pacchetti') x where x->>'id' = p_pacchetto;
  if p is null then return json_build_object('ok', false, 'msg', 'Pacchetto?'); end if;
  s := public.w_gemme_add(me, (p->>'gemme')::int, 'PROVA acquisto ' || p_pacchetto, null, 'prova:' || me || ':' || coalesce(p_chiave, ''), true);
  if s = -1 then return json_build_object('ok', true, 'gia', true, 'msg', 'Già fatto'); end if;
  return json_build_object('ok', true, 'gemme', s, 'msg', format('🧪 PROVA: +💎 %s (solo test, nessun pagamento)', p->>'gemme'));
end $$;

create or replace function public.world_earn(p_reason text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare me uuid := auth.uid(); w public.world_wallet; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
  k text; n int; lim int; amt int; got int := 0; c int; done int;
begin
  if me is null then return json_build_object('ok',false,'msg','accedi'); end if;
  w := public.w_wallet(me);
  if p_reason in ('notte','missione','login') then
    lim := case p_reason when 'notte' then 5 when 'missione' then 3 else 1 end;
    amt := case p_reason when 'notte' then 10 when 'missione' then 15 else 20 end;
    k := p_reason || ':' || day;
    n := coalesce((w.caps->>k)::int, 0);
    if n >= lim then return json_build_object('ok',false,'msg','limite di oggi raggiunto','mattoni',w.mattoni); end if;
    update public.world_wallet set caps = jsonb_set(caps, array[k], to_jsonb(n+1)) where user_id = me;
    perform public.w_pay(me, amt, case p_reason when 'notte' then 'Notte vinta' when 'missione' then 'Missione del giorno' else 'Accesso del giorno' end);
    got := amt;
    -- (042) niente più risorse all'accesso del giorno: il cibo non arriva col tempo
  elsif p_reason = 'verifica' then
    -- valutazione della casa (una volta)
    if coalesce((w.caps->>'valutazione')::int,0) = 0 and exists (select 1 from public.profili_pubblici where user_id = me and indice is not null) then
      update public.world_wallet set caps = jsonb_set(caps, '{valutazione}', '1') where user_id = me;
      perform public.w_pay(me, 200, 'Casa vera valutata'); got := got + 200;
      perform public.w_res(me, 50, 50, 30);
    end if;
    -- codici sconto usati davvero in negozio
    select count(*) into c from public.coupons where user_id = me and redeemed_at is not null;
    done := coalesce((w.caps->>'codici')::int,0);
    if c > done then
      update public.world_wallet set caps = jsonb_set(caps, '{codici}', to_jsonb(c)) where user_id = me;
      perform public.w_pay(me, (c-done)*100, 'Codice sconto usato in negozio'); got := got + (c-done)*100;
    end if;
    -- amici invitati che hanno valutato la casa
    select count(*) into c from public.profili_pubblici where invitato_da = left(me::text,8) and user_id <> me and indice is not null;
    done := coalesce((w.caps->>'inviti')::int,0);
    if c > done then
      update public.world_wallet set caps = jsonb_set(caps, '{inviti}', to_jsonb(c)) where user_id = me;
      perform public.w_pay(me, (c-done)*150, 'Amico invitato ha valutato la casa'); got := got + (c-done)*150;
    end if;
  end if;
  select * into w from public.world_wallet where user_id = me;
  return json_build_object('ok', got > 0, 'got', got, 'mattoni', w.mattoni);
end $$;

create or replace function public.w_pres_rendita(p_user uuid, p_kind text, p_record integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare r int := greatest(coalesce(p_record,1),1); a int := 40 + least(40, 4 * greatest(coalesce(p_record,1),1));
begin
  if p_user is null then return; end if;
  if p_kind in ('parco','sport') then perform public.w_res(p_user, a, 0, 0);
  elsif p_kind in ('piazza','centro','chiesa') then perform public.w_res(p_user, a, 0, 0);   -- (042) legno, non cibo
  elsif p_kind in ('stazione','polizia','pompieri') then perform public.w_res(p_user, 0, 0, a);
  else perform public.w_pay(p_user, 30 + least(30, 2 * r), 'Presidio tenuto'); end if;
end $$;

revoke all on function public.w_gemme_add(uuid, int, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.w_gemme_livello(uuid, int, int) from public, anon, authenticated;
revoke all on function public.w_gemme_pagato(bigint, text) from public, anon, authenticated;
grant execute on function public.w_gemme_pagato(bigint, text) to service_role;
revoke all on function public.world_gemme_converti(text, int, text) from public, anon;
revoke all on function public.world_completa_subito(text, bigint, int) from public, anon;
revoke all on function public.world_gemme_info() from public, anon;
revoke all on function public.world_gemme_legacy_segna(int) from public, anon;
revoke all on function public.world_gemme_prova(text, text) from public, anon;
grant execute on function public.world_gemme_converti(text, int, text) to authenticated;
grant execute on function public.world_completa_subito(text, bigint, int) to authenticated;
grant execute on function public.world_gemme_info() to authenticated;
grant execute on function public.world_gemme_legacy_segna(int) to authenticated;
grant execute on function public.world_gemme_prova(text, text) to authenticated;

-- controllo: deve dire "gemme pronte"
select case when exists (select 1 from pg_proc where proname = 'world_completa_subito') then 'gemme pronte' else 'qualcosa manca' end as esito;

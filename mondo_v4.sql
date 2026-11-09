-- =========================================================
-- ZombieSafeHouse · ALLEATI: REGALI E PRESTITI
-- Alleati = chi ti ha aiutato o hai aiutato negli ultimi 30 giorni,
--           chi hai invitato e chi ti ha invitato.
-- Mattoni: regalo o prestito (il prestito torna da solo dopo 3 giorni).
-- Monete e materiali: regalo (arrivano nella casella dell'alleato). Le gemme non si regalano.
-- Tetti giornalieri contro chi fa il furbo.
-- =========================================================
create table if not exists public.world_gifts(
  id bigserial primary key,
  from_u uuid references auth.users(id) on delete cascade,
  to_u uuid references auth.users(id) on delete cascade,
  kind text not null,
  amount int not null check (amount > 0),
  loan boolean not null default false,
  due_at timestamptz,
  left_due int not null default 0,
  claimed boolean not null default false,
  created_at timestamptz not null default now());
create index if not exists world_gifts_to on public.world_gifts(to_u, claimed);
create index if not exists world_gifts_from on public.world_gifts(from_u);
alter table public.world_gifts enable row level security;
drop policy if exists wg_sel on public.world_gifts;
create policy wg_sel on public.world_gifts for select using (from_u = auth.uid() or to_u = auth.uid());

-- sono alleati?
create or replace function public.w_are_allies(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select a <> b and (
    exists (select 1 from public.world_help_given g where ((g.helper = a and g.target = b) or (g.helper = b and g.target = a)) and g.created_at > now() - interval '30 days')
    or exists (select 1 from public.profili_pubblici p where p.user_id = b and p.invitato_da = left(a::text,8))
    or exists (select 1 from public.profili_pubblici p where p.user_id = a and p.invitato_da = left(b::text,8)));
$$;

-- i miei alleati
create or replace function public.world_allies() returns table(user_id uuid, nick text, wlevel int, dist_km numeric)
language sql stable security definer set search_path = public as $$
  with me as (select * from public.world_homes where user_id = auth.uid()),
  ids as (
    select g.target as u from public.world_help_given g where g.helper = auth.uid() and g.created_at > now() - interval '30 days'
    union select g.helper from public.world_help_given g where g.target = auth.uid() and g.created_at > now() - interval '30 days'
    union select p.user_id from public.profili_pubblici p where p.invitato_da = left(auth.uid()::text,8)
    union select q.user_id from public.profili_pubblici p, public.profili_pubblici q where p.user_id = auth.uid() and p.invitato_da is not null and left(q.user_id::text,8) = p.invitato_da)
  select ids.u, public.w_nick(ids.u), public.w_lvl_of(ids.u),
    (select round(public.w_km(me.lat,me.lon,h.lat,h.lon)::numeric,0) from me, public.world_homes h where h.user_id = ids.u)
  from ids where ids.u is not null and ids.u <> auth.uid() limit 50;
$$;

-- restituzione automatica dei prestiti scaduti (dal saldo di chi ha ricevuto)
create or replace function public.w_settle_loans(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
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
end $$;

-- regalare o prestare
create or replace function public.world_give(p_to uuid, p_kind text, p_amount int, p_loan boolean) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); w public.world_wallet; day text := to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD');
  lim int; sent int; recv int;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi'); end if;
  if p_amount is null or p_amount < 1 then return json_build_object('ok',false,'msg','Quantità non valida'); end if;
  if p_kind not in ('mattoni','monete','cibo','legno','metallo','batterie','medicine') then return json_build_object('ok',false,'msg','Cosa non valida (le gemme non si regalano)'); end if;
  if p_loan and p_kind <> 'mattoni' then return json_build_object('ok',false,'msg','Si prestano solo i Mattoni'); end if;
  if not public.w_are_allies(me, p_to) then return json_build_object('ok',false,'msg','Potete scambiarvi cose solo da alleati: aiutatevi in un’orda o invitatevi'); end if;
  if (select created_at from auth.users where id = me) > now() - interval '3 days' then return json_build_object('ok',false,'msg','Account troppo nuovo: potrai regalare tra qualche giorno'); end if;
  lim := case p_kind when 'mattoni' then 300 when 'monete' then 300 else 10 end;
  select coalesce(sum(amount),0) into sent from public.world_gifts where from_u = me and kind = p_kind and created_at > now() - interval '1 day';
  if sent + p_amount > lim then return json_build_object('ok',false,'msg','Limite di oggi: '||lim||' '||p_kind||' (ne hai già dati '||sent||')'); end if;
  select coalesce(sum(amount),0) into recv from public.world_gifts where to_u = p_to and kind = p_kind and created_at > now() - interval '1 day';
  if recv + p_amount > lim * 2 then return json_build_object('ok',false,'msg','Il tuo alleato ha già ricevuto il massimo di oggi'); end if;
  if p_kind = 'mattoni' then
    w := public.w_wallet(me);
    if w.mattoni < p_amount then return json_build_object('ok',false,'msg','Mattoni insufficienti'); end if;
    update public.world_wallet set mattoni = mattoni - p_amount where user_id = me;
    insert into public.world_log(user_id, delta, reason, seen) values (me, -p_amount, (case when p_loan then 'Prestito a @' else 'Regalo a @' end) || public.w_nick(p_to), true);
    perform public.w_wallet(p_to);
    update public.world_wallet set mattoni = mattoni + p_amount where user_id = p_to;
    insert into public.world_log(user_id, delta, reason) values (p_to, p_amount, (case when p_loan then 'Prestito da @' else 'Regalo da @' end) || public.w_nick(me) || (case when p_loan then ' (torna fra 3 giorni)' else '' end));
    insert into public.world_gifts(from_u, to_u, kind, amount, loan, due_at, left_due, claimed)
      values (me, p_to, p_kind, p_amount, p_loan, case when p_loan then now() + interval '3 days' end, case when p_loan then p_amount else 0 end, true);
  else
    insert into public.world_gifts(from_u, to_u, kind, amount) values (me, p_to, p_kind, p_amount);
  end if;
  return json_build_object('ok',true,'msg', case when p_loan then 'Prestito fatto: torna da solo fra 3 giorni' else 'Regalo inviato' end);
end $$;

-- casella dei regali (monete, gemme, materiali) da ritirare
create or replace function public.world_gifts_in() returns table(id bigint, kind text, amount int, nick text)
language sql stable security definer set search_path = public as $$
  select g.id, g.kind, g.amount, public.w_nick(g.from_u) from public.world_gifts g
  where g.to_u = auth.uid() and not g.claimed and g.kind <> 'mattoni' order by g.created_at limit 50;
$$;
create or replace function public.world_gift_claim(p_id bigint) returns json
language plpgsql security definer set search_path = public as $$
declare g public.world_gifts;
begin
  update public.world_gifts set claimed = true where id = p_id and to_u = auth.uid() and not claimed returning * into g;
  if g.id is null then return json_build_object('ok',false); end if;
  return json_build_object('ok',true,'kind',g.kind,'amount',g.amount);
end $$;

-- i miei prestiti aperti
create or replace function public.world_loans() returns table(dir text, nick text, amount int, left_due int, due_at timestamptz)
language sql stable security definer set search_path = public as $$
  select 'dato', public.w_nick(to_u), amount, left_due, due_at from public.world_gifts where from_u = auth.uid() and loan and left_due > 0
  union all
  select 'ricevuto', public.w_nick(from_u), amount, left_due, due_at from public.world_gifts where to_u = auth.uid() and loan and left_due > 0;
$$;

-- i prestiti scaduti si restituiscono quando uno dei due apre l'app
create or replace function public.world_mine2() returns json
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return null; end if;
  perform public.w_settle_loans(auth.uid());
  return public.world_mine();
end $$;

revoke all on function public.w_settle_loans(uuid) from public, anon, authenticated;
revoke all on function public.w_are_allies(uuid,uuid) from public, anon, authenticated;
grant execute on function public.world_allies() to authenticated;
grant execute on function public.world_give(uuid,text,int,boolean) to authenticated;
grant execute on function public.world_gifts_in() to authenticated;
grant execute on function public.world_gift_claim(bigint) to authenticated;
grant execute on function public.world_loans() to authenticated;
grant execute on function public.world_mine2() to authenticated;

-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 015 — il superstite sulla mappa sta sempre vicino a CASA SUA (segnalazione di Alessandro, 14/11)
-- Prima la posizione approssimata pubblica (profili_pubblici.lat_r/lon_r, ~200 m) veniva dal posto dell'ultima
-- valutazione: chi aggiornava la casa da un'altra zona compariva due volte (a casa e là).
-- Ora, per chi ha la casa nel mondo, il server la ricalcola SEMPRE dalla casa vera (stessa griglia di ~200 m dell'app),
-- anche se l'app manda un altro punto; e se la casa cambia, la posizione segue. Chi ha scelto di nascondersi resta nascosto.
-- Si può eseguire più volte.
-- =====================================================================

create or replace function public.w_tr_pos_casa() returns trigger
  language plpgsql security definer set search_path to 'public' as $$
declare h record;
begin
  if new.lat_r is null or new.lon_r is null then return new; end if;
  select lat, lon into h from public.world_homes where user_id = new.user_id and status in ('home','pending');
  if found then
    new.lat_r := round((round(h.lat / 0.002) * 0.002)::numeric, 4);
    new.lon_r := round((round(h.lon / 0.0028) * 0.0028)::numeric, 4);
  end if;
  return new;
end $$;
revoke all on function public.w_tr_pos_casa() from public, anon, authenticated;
drop trigger if exists profili_pos_casa on public.profili_pubblici;
create trigger profili_pos_casa before insert or update of lat_r, lon_r on public.profili_pubblici
  for each row execute function public.w_tr_pos_casa();

-- quando la casa cambia, il superstite si sposta con lei
create or replace function public.w_tr_casa_pos() returns trigger
  language plpgsql security definer set search_path to 'public' as $$
begin
  update public.profili_pubblici set lat_r = lat_r where user_id = new.user_id and lat_r is not null;
  return new;
end $$;
revoke all on function public.w_tr_casa_pos() from public, anon, authenticated;
drop trigger if exists world_homes_pos on public.world_homes;
create trigger world_homes_pos after insert or update of lat, lon, status on public.world_homes
  for each row execute function public.w_tr_casa_pos();

-- sistema subito chi è già nel posto sbagliato
update public.profili_pubblici p set lat_r = lat_r
  where p.lat_r is not null and exists (select 1 from public.world_homes h where h.user_id = p.user_id);

-- controllo: deve dire "posizioni sistemate" e 0 superstiti lontani da casa
select 'posizioni sistemate' as fatto,
  (select count(*) from public.profili_pubblici p join public.world_homes h on h.user_id = p.user_id
    where p.lat_r is not null and h.status in ('home','pending') and public.w_km(p.lat_r, p.lon_r, h.lat, h.lon) > 0.3) as lontani_da_casa;

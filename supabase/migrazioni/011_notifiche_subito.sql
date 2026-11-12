-- =====================================================================
-- ZombieSafeHouse · MIGRAZIONE 011 — notifiche SUBITO per messaggi, richieste e inviti (richiesta di Alessandro, 12/11)
-- Prima le novità personali (messaggi privati, proposte di alleanza, rinforzi, orde, regali, richieste di
-- coinquilino…) partivano solo al giro dell'orologio, ogni 10 minuti, tutte con lo stesso titolo.
-- 1) Appena arriva una novità per qualcuno che ha le notifiche attive, il database chiama subito zsh-push
--    (task "feed", con la stessa chiave segreta dell'orologio): la notifica parte in pochi secondi.
--    Se la chiamata non riesce, ci pensa comunque il giro dei 10 minuti (niente si perde).
-- 2) INVITI: quando chi hai invitato entra (si collega al tuo codice), ti arriva "🎉 @nome è entrato con il
--    tuo invito" (novità 'invite_join').
-- Si può eseguire più volte. Va pubblicata anche la funzione zsh-push aggiornata (vedi functions/LEGGIMI.md).
-- =====================================================================

-- 1) novità → notifica subito
create or replace function public.w_tr_feed_push() returns trigger
  language plpgsql security definer set search_path to 'public' as $$
declare s text;
begin
  if new.target is null or new.target = new.actor then return new; end if;
  if not exists (select 1 from public.push_subs where user_id = new.target) then return new; end if;
  begin
    select cron_secret into s from public.push_keys where id = 1;
    if s is null then return new; end if;
    perform net.http_post(
      url := 'https://wmweptdpfworispqjhto.supabase.co/functions/v1/zsh-push',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object('task','feed','user',new.target,'secret',s));
  exception when others then null; -- mai bloccare l'azione del giocatore: ci pensa il giro dei 10 minuti
  end;
  return new;
end $$;
revoke all on function public.w_tr_feed_push() from public;

drop trigger if exists world_feed_push on public.world_feed;
create trigger world_feed_push after insert on public.world_feed
  for each row execute function public.w_tr_feed_push();

-- 2) chi hai invitato è entrato
create or replace function public.w_tr_invite_join() returns trigger
  language plpgsql security definer set search_path to 'public' as $$
declare inv uuid;
begin
  if new.invitato_da is null or (tg_op = 'UPDATE' and old.invitato_da is not distinct from new.invitato_da) then return new; end if;
  select u.id into inv from auth.users u where left(u.id::text, 8) = new.invitato_da and u.id <> new.user_id limit 1;
  if inv is null then return new; end if;
  insert into public.world_feed(kind, actor, target, info) values ('invite_join', new.user_id, inv, null);
  return new;
end $$;
revoke all on function public.w_tr_invite_join() from public;

drop trigger if exists profili_invite_join on public.profili_pubblici;
create trigger profili_invite_join after insert or update of invitato_da on public.profili_pubblici
  for each row execute function public.w_tr_invite_join();

select 'notifiche subito pronte' as fatto;

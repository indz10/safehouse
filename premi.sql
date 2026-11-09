-- =========================================================
-- ZombieSafeHouse · PREMI IN MATTONI (ruota, gratta e vinci, premio del giorno, missioni, barattolo, zombie d'oro)
-- Al massimo 60 per premio e 300 al giorno, deciso dal server.
-- =========================================================
create or replace function public.world_reward(p_amount int, p_reason text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); w public.world_wallet; k text; n int; give int;
begin
  if me is null then return json_build_object('ok',false,'msg','Accedi','got',0); end if;
  w := public.w_wallet(me); k := 'premi:' || to_char(now() at time zone 'Europe/Rome','YYYY-MM-DD'); n := coalesce((w.caps->>k)::int,0);
  give := least(greatest(coalesce(p_amount,0),0), 60, 300 - n);
  if give <= 0 then return json_build_object('ok',false,'msg','Hai già preso il massimo dei premi di oggi (300 Mattoni)','got',0); end if;
  update public.world_wallet set caps = jsonb_set(caps, array[k], to_jsonb(n + give)) where user_id = me;
  perform public.w_pay(me, give, 'Premio: ' || left(coalesce(p_reason,'fortuna'), 40));
  return json_build_object('ok',true,'got',give);
end $$;
grant execute on function public.world_reward(int,text) to authenticated;
notify pgrst, 'reload schema';

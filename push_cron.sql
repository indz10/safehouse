-- [3] OROLOGIO AUTOMATICO: ogni 10 minuti chiama la funzione zsh-push
-- (da eseguire DOPO aver creato la funzione zsh-push e averla aperta una volta)
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('zsh-push-tick') where exists (select 1 from cron.job where jobname = 'zsh-push-tick');
select cron.schedule('zsh-push-tick', '*/10 * * * *', $$
  select net.http_post(
    url := 'https://wmweptdpfworispqjhto.supabase.co/functions/v1/zsh-push',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('task','tick','secret',(select cron_secret from public.push_keys where id = 1)));
$$);

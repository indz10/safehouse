-- ZombieSafeHouse · CONTROLLO (solo lettura, non cambia niente)
-- Restituisce UNA cella di testo: un'impronta per ogni funzione e per ogni tabella del database.
-- Serve a confrontare il database vero con quello ricostruito dai file *.sql (Fase 6a).
select
  'FUNZIONI' || E'\n' ||
  (select string_agg(p.proname || '(' || oidvectortypes(p.proargtypes) || ') ' || left(md5(p.prosrc), 10), E'\n' order by p.proname, oidvectortypes(p.proargtypes))
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e'))
  || E'\nTABELLE\n' ||
  (select string_agg(c.relname || ' ' || left(md5(
          (select string_agg(a.attname || ':' || format_type(a.atttypid, a.atttypmod), ',' order by a.attname)
             from pg_attribute a where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped)), 8), E'\n' order by c.relname)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v'))
  || E'\nREGOLE\n' ||
  (select string_agg(tablename || ' ' || policyname, E'\n' order by tablename, policyname) from pg_policies where schemaname = 'public')
  || E'\nCRON\n' ||
  coalesce((select string_agg(jobname || ' ' || schedule, E'\n' order by jobname) from cron.job), '')
  as impronte;

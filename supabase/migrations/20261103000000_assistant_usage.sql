-- Plumb assistant: daily usage counters for the AI chat.
-- Keeps OpenAI costs bounded: a limit per signed-in user, per demo visitor and for the whole app.
--
-- Runs in the "plumb" schema (the schema the app's Supabase client uses).
-- No policy is created on the table: only the function below can read or write it.

create table if not exists plumb.assistant_usage (
  bucket text not null,          -- 'user:<uuid>', 'demo:<hash>' or 'global'
  day date not null,
  count integer not null default 0,
  primary key (bucket, day)
);

alter table plumb.assistant_usage enable row level security;

-- Returns true and counts one message when every limit still has room, false otherwise.
-- Limits (messages per day, UTC):
--   signed-in user  100
--   demo visitor     10
--   whole app       300
-- Change them here if needed.
create or replace function plumb.assistant_consume(p_demo_key text default null)
returns boolean
language plpgsql
security definer
set search_path = plumb, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_bucket text;
  v_limit integer;
  v_today date := (now() at time zone 'utc')::date;
  v_used integer;
  v_global integer;
begin
  if v_uid is not null then
    v_bucket := 'user:' || v_uid::text;
    v_limit := 100;
  elsif p_demo_key is not null and char_length(p_demo_key) between 8 and 128 then
    v_bucket := 'demo:' || p_demo_key;
    v_limit := 10;
  else
    return false;
  end if;

  -- Lock both rows for this day so concurrent requests cannot overshoot.
  insert into assistant_usage (bucket, day, count) values (v_bucket, v_today, 0), ('global', v_today, 0)
  on conflict (bucket, day) do nothing;

  select count into v_global from assistant_usage where bucket = 'global' and day = v_today for update;
  select count into v_used from assistant_usage where bucket = v_bucket and day = v_today for update;

  if v_used >= v_limit or v_global >= 300 then
    return false;
  end if;

  update assistant_usage set count = count + 1 where day = v_today and bucket in (v_bucket, 'global');
  return true;
end;
$$;

revoke all on function plumb.assistant_consume(text) from public;
grant execute on function plumb.assistant_consume(text) to anon, authenticated;

-- Plumb · remove all journal data of ONE user (keeps the login and the account).
-- Supabase → SQL Editor → paste → change the email → Run.
do $$
declare
  v_email text := 'ereanass@gmail.com';
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(v_email);
  if uid is null then raise exception 'No user with email %', v_email; end if;
  delete from public.trades  where user_id = uid;
  delete from public.setups  where user_id = uid;
  delete from public.reviews where user_id = uid;
  update public.accounts set starting_balance = 10000 where user_id = uid;
  raise notice 'Journal emptied for %', v_email;
end $$;

-- =====================================================================
-- Plumb · sample data for ONE user
--
-- How to use: Supabase → SQL Editor → New query → paste → Run.
-- 1. Sign up in the app first (the user must exist).
-- 2. Change v_email below if you signed up with another address.
--
-- WARNING: this REPLACES the user's trades, setups, rules and reviews
-- with ~3 months of realistic sample trades. Run cleanup.sql to empty them.
-- =====================================================================

do $$
declare
  v_email text := 'ereanass@gmail.com';   -- <-- the email you signed up with

  uid uuid;
  acc uuid;
  st uuid[];                               -- setup ids
  st_check text[][] := array[
    array['H4 trend is clear', 'Pullback reached the 20 EMA', 'Rejection candle closed', 'No red news in the next hour'],
    array['Range defined (first 30 min)', 'Close outside the range', 'Volume above average', ''],
    array['At least two touches on each side', 'Divergence or stall at the edge', 'Target is the opposite side', ''],
    array['Obvious previous high/low', 'Sweep and reclaim within 3 candles', 'Stop beyond the sweep', '']
  ];
  -- per setup: win probability and planned reward:risk range
  st_p   numeric[] := array[0.55, 0.44, 0.50, 0.47];
  st_rr1 numeric[] := array[1.6, 1.8, 1.5, 1.7];
  st_rr2 numeric[] := array[2.4, 3.0, 1.9, 2.6];

  -- instruments: symbol, market, price, min/max stop distance, point value, size step, fee per lot
  sym  text[]    := array['EURUSD','GBPUSD','XAUUSD','NAS100','US500','GER40','BTCUSD'];
  mkt  text[]    := array['forex','forex','commodities','indices','indices','indices','crypto'];
  px   numeric[] := array[1.1642, 1.3418, 3412.5, 24380, 6612, 24150, 112400];
  dmin numeric[] := array[0.0011, 0.0013, 3.2, 28, 9, 22, 550];
  dmax numeric[] := array[0.0028, 0.0032, 8.5, 75, 22, 55, 1400];
  pv   numeric[] := array[100000, 100000, 100, 1, 1, 1, 1];
  stp  numeric[] := array[0.01, 0.01, 0.01, 0.1, 0.1, 0.1, 0.001];
  fee  numeric[] := array[7, 7, 9, 1.2, 0.6, 1, 0];

  notes_win  text[] := array['Waited for the close this time. Clean entry, let it run to target.', 'Followed the checklist line by line. Boring, and it worked.'];
  notes_loss text[] := array['Setup was valid, market just didn''t follow. Nothing to change.', 'Clean loss. Stop where it should be.', 'News spike took the stop. Should check the calendar earlier.'];
  notes_rev  text[] := array['Wanted the morning loss back. Doubled the size without thinking.', 'Entered right after the stop-out. No setup, just frustration.'];
  notes_late text[] := array['Couldn''t sleep, opened the chart. Thin market, bad fill.', 'Trading after dinner again. Tired, rushed the entry.'];
  notes_mov  text[] := array['Moved the stop "just a bit". It cost me 60% more than planned.', 'Gave it more room instead of accepting the loss.'];
  calm_set text[] := array['calm','calm','focused','confident','focused','nervous','impatient','bored'];

  balance numeric := 10000;
  off int; d date; n int; k int; h int; m int;
  losses_today int; prev_loss boolean;
  i int; si int; dir int; direction text;
  revenge boolean; late boolean; low_rr boolean; win boolean; moved boolean;
  emo text; emo_after text; p_win numeric;
  entry numeric; dist numeric; risk_pct numeric; size numeric; rr numeric;
  stop_ numeric; target_ numeric; final_stop numeric; r_out numeric; exit_ numeric;
  hold numeric; opened timestamptz; closed timestamptz; fees numeric; net numeric;
  note text; lesson text; tags text[]; checks text[]; setup_id uuid;
begin
  select id into uid from auth.users where lower(email) = lower(v_email);
  if uid is null then
    raise exception 'No user with email %. Sign up in the app first, or change v_email.', v_email;
  end if;

  -- account
  select id into acc from public.accounts where user_id = uid order by created_at limit 1;
  if acc is null then
    insert into public.accounts (user_id, name) values (uid, 'Demo account') returning id into acc;
  end if;
  update public.accounts
     set name = 'Demo account', kind = 'demo', currency = 'EUR', starting_balance = 10000,
         risk_per_trade_pct = 1, timezone = 'Europe/Paris'
   where id = acc;

  -- start clean
  delete from public.trades  where user_id = uid;
  delete from public.setups  where user_id = uid;
  delete from public.reviews where user_id = uid;
  delete from public.rules   where user_id = uid;

  insert into public.rules (user_id, kind, params, active) values
    (uid, 'max_risk_pct',       '{"value": 1}', true),
    (uid, 'require_stop',       '{}', true),
    (uid, 'min_rr',             '{"value": 1.5}', true),
    (uid, 'max_trades_per_day', '{"value": 3}', true),
    (uid, 'max_losses_per_day', '{"value": 2}', true),
    (uid, 'no_stop_widening',   '{}', true),
    (uid, 'trading_hours',      '{"start": "08:00", "end": "21:00"}', true);

  -- playbook
  with ins as (
    insert into public.setups (user_id, name, description, checklist, color) values
      (uid, 'Trend pullback', 'Price pulls back to the 20 EMA in an established H4 trend, entry on a rejection candle.',
        array['H4 trend is clear','Pullback reached the 20 EMA','Rejection candle closed','No red news in the next hour'], '#2F6B4F'),
      (uid, 'Opening range breakout', 'Break and close outside the first 30-minute range of the session, with volume.',
        array['Range defined (first 30 min)','Close outside the range','Volume above average'], '#8C6A87'),
      (uid, 'Range fade', 'Fade the edge of a clear intraday range when momentum stalls.',
        array['At least two touches on each side','Divergence or stall at the edge','Target is the opposite side'], '#A26C1F'),
      (uid, 'Liquidity sweep', 'Price takes the previous high/low then reclaims it. Entry on the reclaim.',
        array['Obvious previous high/low','Sweep and reclaim within 3 candles','Stop beyond the sweep'], '#4B3350')
    returning id, name
  )
  select array_agg(id order by case name when 'Trend pullback' then 1 when 'Opening range breakout' then 2 when 'Range fade' then 3 else 4 end)
    into st from ins;

  perform setseed(0.42);

  -- ~3 months of trading days
  for off in reverse 92..1 loop
    d := current_date - off;
    continue when extract(isodow from d) > 5;
    continue when random() < 0.22;                       -- day off

    n := 1 + floor(random() * 3)::int;
    if random() < 0.08 then n := n + 2; end if;          -- overtrading day
    losses_today := 0; prev_loss := false;
    h := 8 + floor(random() * 3)::int;

    for k in 1..n loop
      i  := 1 + floor(random() * 7)::int;
      si := 1 + floor(random() * 4)::int;
      dir := case when random() < 0.55 then 1 else -1 end;
      direction := case when dir = 1 then 'long' else 'short' end;

      revenge := prev_loss and random() < 0.42;
      late := (not revenge) and random() < 0.11;
      emo := calm_set[1 + floor(random() * 8)::int];
      if revenge then emo := (array['frustrated','frustrated','impatient'])[1 + floor(random() * 3)::int]; end if;
      if late then emo := (array['tired','bored'])[1 + floor(random() * 2)::int]; end if;

      if late then
        h := 21 + floor(random() * 2)::int;
      else
        h := least(20, h + floor(random() * 3)::int);
      end if;
      m := floor(random() * 59)::int;
      opened := (d + make_time(h, m, 0)) at time zone 'Europe/Paris';

      entry := px[i] * (1 + (random() * 0.07 - 0.035));
      dist := dmin[i] + random() * (dmax[i] - dmin[i]);
      risk_pct := case when revenge then 1.8 + random() * 0.8 else 0.85 + random() * 0.15 end;
      size := greatest(stp[i], floor((balance * risk_pct / 100) / (dist * pv[i]) / stp[i]) * stp[i]);
      low_rr := random() < 0.07;
      rr := case when low_rr then 0.9 + random() * 0.4 else st_rr1[si] + random() * (st_rr2[si] - st_rr1[si]) end;
      stop_ := entry - dir * dist;
      target_ := entry + dir * dist * rr;

      p_win := st_p[si];
      if emo in ('calm','focused') then p_win := p_win + 0.07; end if;
      if emo in ('impatient','fomo') then p_win := p_win - 0.14; end if;
      if emo in ('nervous','bored') then p_win := p_win - 0.06; end if;
      if revenge then p_win := 0.28; end if;
      if late then p_win := 0.27; end if;

      win := random() < p_win;
      moved := false;
      final_stop := stop_;
      if win then
        r_out := case when random() < 0.75 then rr else 0.4 + random() * (rr - 0.4) end;
      elsif random() < 0.14 then
        moved := true;
        final_stop := entry - dir * dist * 1.65;
        r_out := -1.65;
      else
        r_out := case when random() < 0.15 then -0.6 + random() * 0.4 else -1 end;
      end if;
      exit_ := entry + dir * dist * r_out;

      hold := case when win then 18 + random() * 132 when moved then 160 + random() * 260 else 40 + random() * 220 end;
      closed := opened + make_interval(mins => hold::int);
      fees := round(case when fee[i] > 0 then fee[i] * size else size * entry * 0.0006 end, 2);
      net := (exit_ - entry) * dir * size * pv[i] - fees;
      balance := balance + net;

      note := null; lesson := null; tags := '{}';
      if moved then note := notes_mov[1 + floor(random() * 2)::int];
      elsif revenge then note := notes_rev[1 + floor(random() * 2)::int];
      elsif late then note := notes_late[1 + floor(random() * 2)::int];
      elsif random() < 0.35 then
        note := case when win then notes_win[1 + floor(random() * 2)::int] else notes_loss[1 + floor(random() * 3)::int] end;
      end if;
      if moved or revenge then
        lesson := (array['After a stop-out, close the platform for 30 minutes.', 'No entries after 21:00.', 'The stop is part of the plan, not a suggestion.'])[1 + floor(random() * 3)::int];
      end if;
      if revenge then tags := tags || 'revenge'::text; end if;
      if moved then tags := tags || 'moved stop'::text; end if;
      if late then tags := tags || 'late'::text; end if;

      checks := array(select x from unnest(st_check[si:si][1:4]) with ordinality as t(x, o) where x <> '' order by o);
      if revenge or late then checks := checks[1:1];
      elsif random() > 0.8 then checks := checks[1:array_length(checks, 1) - 1];
      end if;
      setup_id := case when revenge and random() < 0.5 then null else st[si] end;

      insert into public.trades (
        user_id, account_id, setup_id, status, symbol, market, direction, point_value,
        planned_entry, initial_stop, target, planned_size, checklist_done,
        entry_price, exit_price, final_stop, size, fees, opened_at, closed_at,
        emotion_before, emotion_after, notes, lesson, tags
      ) values (
        uid, acc, setup_id, 'closed', sym[i], mkt[i], direction, pv[i],
        entry, stop_, target_, size, coalesce(checks, '{}'),
        entry, exit_, final_stop, size, fees, opened, closed,
        emo,
        case when win then (array['calm','confident','focused'])[1 + floor(random() * 3)::int]
             else (array['frustrated','calm','nervous','frustrated'])[1 + floor(random() * 4)::int] end,
        note, lesson, tags
      );

      prev_loss := net < 0;
      if net < 0 then losses_today := losses_today + 1; end if;
      exit when losses_today >= 3;
      h := h + 1;
    end loop;
  end loop;

  -- today: one open trade and one written plan
  insert into public.trades (user_id, account_id, setup_id, status, symbol, market, direction, point_value,
    planned_entry, initial_stop, target, planned_size, reason, checklist_done, entry_price, final_stop, size,
    opened_at, emotion_before)
  values
    (uid, acc, st[1], 'open', 'NAS100', 'indices', 'long', 1, 24412, 24362, 24512, 2,
     'Clean pullback into the H1 20 EMA after the open.',
     array['H4 trend is clear','Pullback reached the 20 EMA','Rejection candle closed','No red news in the next hour'],
     24414, 24362, 2, (current_date + time '10:12') at time zone 'Europe/Paris', 'focused');

  insert into public.trades (user_id, account_id, setup_id, status, symbol, market, direction, point_value,
    planned_entry, initial_stop, target, planned_size, reason, checklist_done, opened_at, emotion_before)
  values
    (uid, acc, st[4], 'planned', 'EURUSD', 'forex', 'short', 100000, 1.1668, 1.1686, 1.1622, 0.55,
     'If price sweeps yesterday''s high and reclaims, short back to mid-range.',
     array['Obvious previous high/low'], (current_date + time '13:12') at time zone 'Europe/Paris', 'calm');

  -- last week's review
  insert into public.reviews (user_id, week_start, went_well, to_improve, focus_next) values
    (uid, date_trunc('week', current_date)::date - 7,
     'Trend pullbacks: plan followed, no moved stops.',
     'Two trades in the evening after 21:00, both losers.',
     'Close the platform after the 2nd loser.');

  raise notice 'Done: % trades for %', (select count(*) from public.trades where user_id = uid), v_email;
end $$;

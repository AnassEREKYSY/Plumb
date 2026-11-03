# Plumb

**Your trading, measured against your own plan.**

Plumb is a private trading journal built around discipline. You write a plan before each trade,
Plumb checks every trade against the rules *you* wrote, and shows what breaking them really costs.

> The app is a mirror, not an advisor. It only shows traders their own data and their own rules.
> It never tells them what to trade.

![Landing](docs/screenshots/landing.jpg)

| Overview (light) | Overview (dark) |
| --- | --- |
| ![](docs/screenshots/dashboard-light.jpg) | ![](docs/screenshots/dashboard-dark.jpg) |

## What's in this version (MVP)

- **Trade planner**: entry, stop, target, reason, setup checklist and emotion. Position size, amount at risk and
  reward:risk are computed from the account's own risk setting. The plan is checked live against your rules.
- **Plan vs. reality**: every trade keeps its *initial* stop (R is always measured against it). A moved stop, a changed
  size or a different entry are shown side by side, with a price ladder.
- **Personal rules engine**: max risk per trade, always a stop, minimum R:R, trades per day, stop after N losses,
  never widen the stop, trading hours. Each rule shows how often it was broken and what it cost.
- **Cost of mistakes and clean equity**: money lost on rule-breaking trades, rule by rule, and the equity curve you
  would have with only the trades that respected your plan.
- **Limit reminders** in your own words (“You set a limit of 2 losing trades per day. You've reached it.”).
- **Behaviour statistics**: discipline score, results by emotion, after a loss, by hour, by setup, R distribution,
  and a sample size indicator on every number.
- **Descriptive insights** computed from the journal (no AI, no advice), each ending with an open question.
- **Journal** (list + calendar), **Playbook** (setups with checklists and real stats), **Weekly review**.
- **PDF export of the journal**: key figures, equity vs. clean equity, cost of mistakes, insights, breakdowns,
  the trade list, notes and lessons, weekly reviews (per account and period, EN / FR).
- Multiple accounts (demo / live / prop), CSV export, **EN / FR**, **light / dark / system** themes.
- **Demo mode** with a realistic sample journal, available without an account.
- **Ask Plumb**: a chat assistant that answers questions about your own journal (see below).

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16 (App Router, React 19, TypeScript), Server Actions, Node.js runtime |
| Data / Auth / Storage | Supabase (Postgres + Row Level Security, Supabase Auth via `@supabase/ssr`) |
| Hosting | Vercel (functions in `cdg1`, Paris) |
| UI | Tailwind CSS v4, custom SVG charts, Lucide icons, self-hosted Inter font |
| Validation | Zod |

Colour palette: white pages, plum ink `#4B3350`, dusty mauve `#8C6A87`, sage green `#2F6B4F` (gains).
Losses are shown in plum, not red, with an explicit sign: the journal describes, it doesn't judge.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional: without it the app runs in demo mode
npm run dev
```

Open http://localhost:3000. Without Supabase variables every app page runs on the demo journal.

### 1. Create the Supabase project

1. Create a project on [supabase.com](https://supabase.com) (choose an EU region, e.g. Paris or Frankfurt).
2. Open **SQL Editor** and run [`supabase/migrations/20261005000000_init.sql`](supabase/migrations/20261005000000_init.sql)
   (or `supabase db push` with the Supabase CLI).
   It creates the tables, Row Level Security policies, and a trigger that gives every new user a profile,
   a demo account and the default rule templates.
3. **Authentication → URL Configuration**: set the Site URL to your Vercel URL and add
   `https://<your-domain>/auth/confirm` (and `http://localhost:3000/auth/confirm`) to the redirect URLs.
4. Copy the project URL and the publishable (or anon) key into `.env.local`.

### Sample data (optional)

To see the app filled with ~3 months of realistic trades, sign up first, then run
[`supabase/seed/demo-data.sql`](supabase/seed/demo-data.sql) in the SQL Editor (change the email at the top).
It replaces that user's trades, setups, rules and reviews. [`cleanup.sql`](supabase/seed/cleanup.sql) empties the journal again.

### 2. Deploy on Vercel

1. Import the GitHub repository in Vercel (framework preset: Next.js).
2. Add the environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Optional, for the assistant: add `OPENAI_API_KEY` (and `OPENAI_MODEL` to change the model).
4. Deploy.

Notes: the Vercel Hobby plan is for non-commercial use, move to Pro before charging users.
Supabase free projects pause after a period of inactivity.

## Ask Plumb (AI assistant)

A chat panel, available on every page of the app, where the trader asks questions about their own journal:
"How did my week go?", "Which rule costs me the most?", "Do I trade better in the morning?".

How it works:

1. The question goes to `POST /api/assistant` with the conversation history.
2. The model (OpenAI, `gpt-4o-mini` by default, through the Vercel AI SDK) decides which data it needs and calls tools:
   `get_stats`, `get_breakdown`, `list_trades`, `get_rules` (`src/lib/assistant/tools.ts`).
3. The tools compute every number in code with the same functions as the rest of Plumb (`calc.ts`), scoped to the
   signed-in user's data and the selected account. The model never calculates anything itself.
4. The model turns the results into a short answer, streamed to the panel.

Guardrails (`src/lib/assistant/instructions.ts`): describes the past only, never gives trading advice, says when the
sample is too small, answers in the app's language, ignores instructions found inside trade notes.

Cost limits (`supabase/migrations/20261103000000_assistant_usage.sql`): a daily cap per signed-in user (100 messages),
per demo visitor (10) and for the whole app (300), counted atomically in Postgres. Each answer is capped at 700 tokens
and the last 20 messages are sent as history. Set a monthly spending limit in the OpenAI dashboard as well.

Without `OPENAI_API_KEY` the panel shows that the assistant is not configured, and the rest of the app works as before.

## Project structure

```
src/
  app/
    page.tsx              landing page
    (auth)/               login, signup
    (app)/                dashboard, plan, journal, journal/[id], rules, analytics, playbook, review, settings
    actions.ts            server actions (auth, trades, rules, accounts, setups, reviews, preferences)
    api/export/           CSV export
    api/assistant/        Ask Plumb chat endpoint
    auth/confirm/         email confirmation
  components/
    app/                  app shell and feature components
    charts/               equity curve, trade ladder, bars, heatmap, tick strip (SVG)
    marketing/            landing visuals
    ui/                   primitives (button, card, field, badge, toast…)
  lib/
    calc.ts               trade maths, rules engine, statistics
    insights.ts           descriptive “mirror” insights
    assistant/            Ask Plumb: tools and instructions for the model
    demo.ts               deterministic demo journal
    data.ts               workspace loader (Supabase or demo)
    i18n/                 EN / FR dictionaries
    supabase/             server client and session proxy
  proxy.ts                session refresh and route protection
supabase/migrations/      database schema
```

## Roadmap

- **V2**: broker CSV import, screenshots (Supabase Storage), limit notifications, readiness tracker.
- **V3**: prop firm challenge mode, Monte Carlo risk illustration, voice journaling, mentor sharing.

## Disclaimer

For journaling and educational purposes only. Not investment advice.

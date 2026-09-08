# The Movement Coaching — Client Dashboard

A Next.js 14 + Supabase dashboard for a personal training business, styled dark + gold.

## Features

- **Multi-role accounts**: a single profile can hold any combination of `owner`, `trainer`, `client` (e.g. you can be Owner *and* Trainer).
- **Landing page** = login only, with "remember me" (stores email locally). Register page requires a valid **token**.
- **Trainer dashboard**: KPIs (clients, plans, sessions this week, expiring memberships), mini calendar, personal notes.
- **Client dashboard**: this week's schedule, active goals, latest notes from their PT.
- **Clients tab** (trainer): table of *only their own* clients (name / email / description / expiration), each opening into a detail view with tabs — Program, Nutrition, Check-ups, Goals, Notes, Messages, Details.
- **Training Plans**: build reusable day-by-day plans (exercises, sets, reps, weight, notes) and assign them to clients.
- **Schedule/Program tab** (client): monthly calendar of their daily training plan.
- **PDF export**: training plans, goals, check-up history, and monthly schedule all export via jsPDF.
- **PT Admin**: generate registration tokens (auto-assigns the new client to that PT), manage own client roster.
- **Owner dashboard**: invite/manage trainer accounts, disable/enable PT accounts (disabled = can log in but everything is locked out via RLS + a `disabled` flag check on login).
- **Settings** (owner only): toggle public registration on/off, toggle the "require email verification" preference.

## 1. Supabase setup

1. Create a new project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor → New query**, paste the entire contents of `supabase/schema.sql`, and run it.
   This creates all tables, the `account_type` enum, RLS policies, and the `redeem_register_token` function.
3. Go to **Authentication → Sign In / Providers → Email** and decide whether "Confirm email" is on or off
   (the in-app Settings toggle is a preference flag for your own reference — flip the real switch here too).
4. Grab your **Project URL** and **anon public key** from **Project Settings → API**.

### Creating your own Owner account

After signing up normally in the app (you'll need a token — see below for a bootstrap trick), promote yourself:

```sql
-- Run once in the SQL editor, after you've registered your first account normally
-- (you'll need a temporary token first — see "Bootstrapping" below)
insert into public.account_types (profile_id, type)
values ('YOUR-USER-UUID-HERE', 'owner')
on conflict do nothing;

insert into public.account_types (profile_id, type)
values ('YOUR-USER-UUID-HERE', 'trainer')
on conflict do nothing;
```

Find your UUID in **Authentication → Users** after signing up.

### Bootstrapping your first registration token

The register page always requires a token. To create the very first one before any UI exists, run:

```sql
insert into public.register_tokens (token, role, max_uses, expires_at)
values ('TMC-FIRST-SETUP', 'client', 1, now() + interval '7 days');
```

Use `role` = `'trainer'` if you want the first account to register directly as a trainer instead. Then
register through the app UI with that token, and use the SQL above to also grant yourself `owner`.

## 2. Local setup

```bash
npm install
cp .env.local.example .env.local
# edit .env.local with your Supabase URL + anon key
npm run dev
```

Visit `http://localhost:3000`.

## 3. Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in [Vercel](https://vercel.com/new).
3. Add the two environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in
   **Project Settings → Environment Variables**.
4. Deploy. That's it — no server/API routes are required since all data access goes through
   Supabase directly from the browser, protected by Row Level Security.

## Project structure

```
supabase/schema.sql        -- run this in Supabase SQL editor
src/
  middleware.ts             -- session refresh + route protection
  lib/
    supabase/client.ts       -- browser client
    supabase/server.ts       -- server client (for future server components)
    useSession.ts            -- hook: current user, profile, roles
    types.ts                 -- shared TS types
    pdf.ts                   -- jsPDF export helpers
  components/
    MiniCalendar.tsx, StatCard.tsx, NotesPanel.tsx,
    TrainerOverview.tsx, ClientOverview.tsx
  app/
    page.tsx                 -- login (landing page)
    register/page.tsx        -- token-gated registration
    dashboard/
      layout.tsx              -- role-aware sidebar
      page.tsx                 -- routes to Trainer or Client overview
      clients/page.tsx          -- clients table (own clients only)
      clients/[id]/page.tsx     -- client detail: Program/Nutrition/Check-ups/Goals/Notes/Messages
      programs/page.tsx         -- training plan builder
      admin/page.tsx            -- PT admin: tokens + roster
      schedule/page.tsx         -- client: calendar of assigned sessions
      goals/page.tsx            -- client: goals list
      owner/page.tsx            -- owner: manage trainers
      settings/page.tsx         -- owner: registration & verification toggles
```

## Notes & things you'll likely want to extend

- **Assigning a training plan** currently links a plan to a client with a start date; turning that into
  actual per-day `schedule_events` entries (so it shows on the client's calendar) is a good next step —
  e.g. a small function that expands a plan's days across a date range into `schedule_events` rows.
  The `schedule_events` table is already built for this.
- The register token flow assigns `role = 'client'` and (optionally) auto-links to a PT. Owner-generated
  tokens use `role = 'trainer'`. You can add more nuanced roles (e.g. multi-role tokens) later.
- The **"require email verification"** toggle is stored for reference in `app_settings`, but Supabase's
  actual email-confirmation requirement is a project-level Auth setting — see the note on the Settings page.
- Row Level Security is doing the heavy lifting for the "Ryan can't see Joe if Joe belongs to Tim" rule —
  every clients/notes/schedule/goals query is automatically scoped to `pt_id = auth.uid()` (or the owner).
- Styling lives in `tailwind.config.ts` (`base` = dark neutrals, `gold` = accent) and `globals.css`
  (`.card`, `.btn-primary`, `.input-field`, etc.) — tweak those two files to adjust the whole look.

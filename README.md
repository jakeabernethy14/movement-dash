# The Movement Coaching — Client Dashboard

A Next.js 14 + Supabase dashboard for a personal training business, styled dark + gold.

## Features

- **Multi-role accounts**: a single profile can hold any combination of `owner`, `trainer`, `client` (e.g. you can be Owner *and* Trainer).
- **Landing page** = login only, with "remember me" and login by **email or username**. Register page requires a valid **token**, and now validates the token *before* creating the auth account (fixes a bug where a dead token could still leave behind an empty account).
- **Trainer dashboard**: KPIs (clients, plans, sessions this week, expiring memberships), mini calendar you can add personal events to (classes/calls), personal notes.
- **Client dashboard**: this week's schedule, active goals, latest notes from their PT (now shown with the author's name).
- **Clients tab** (trainer): table of *only their own* clients (name / email / description / expiration), each opening into a detail view with tabs — Program, Sessions, Daily Log, Nutrition, Check-ups, Goals, Notes, Messages, Details.
- **Sessions**: PT schedules sessions per client; clients log a result/note against each one from their Schedule page, and the PT's Sessions tab highlights responded sessions in green.
- **Daily Log**: clients log calories/macros/mood/training notes per day; PTs see it read-only per client.
- **Training Plans**: build reusable day-by-day plans (exercises, sets, reps, weight, notes), assign to clients for a specific start/end period.
- **Schedule/Program tab** (client): monthly calendar of their daily training plan.
- **Account tab** (all roles): profile picture (Supabase Storage), bio, username, self-service password change.
- **PDF export**: training plans, goals, check-up history, and monthly schedule all export via jsPDF.
- **Account access & expiry**: registration tokens grant a configurable number of days of client access on redemption. When access expires, the account is **frozen, not deleted** — login is blocked with a clear message until a PT/owner extends it.
- **PT Admin**: generate registration tokens (auto-assigns the new client to that PT + sets their access duration), manage own client roster.
- **Owner dashboard**: invite/manage trainer accounts, view **every client across every trainer**, and edit **any** account (name, username, password, access expiration) via a service-role-backed admin API route.
- **Settings** (owner only): toggle public registration on/off, toggle the "require email verification" preference.
- **News & Notices**: a shared board on every dashboard — owner/trainers post, everyone sees who posted and when.
- **Daily Check-ins** (PT): a table of every client's daily logs, mood color-coded, with a detail view.
- **Sessions & Classes** (PT): one place to log/delete any upcoming session or personal class/call across all clients.
- **Calendar** (client): a full month view of everything their trainer has programmed.
- **Messages**: a proper chat tab — PTs get a client list + thread, clients chat directly with their PT, with avatars shown throughout.
- **Timezone**: each account picks their own timezone (Account page), shown as a live clock in the sidebar.

## 1. Supabase setup

1. Create a new project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor → New query**, paste the entire contents of `supabase/schema.sql`, and run it.
3. Then run `supabase/migration_002.sql` the same way — it adds usernames, account access expiry, PT personal calendar events, session responses, daily logs, profile pictures/bio, and the safer token-validation flow.
   It also creates a public `avatars` Storage bucket with the right policies (skip the `insert into storage.buckets` line and create the bucket manually via **Storage → New bucket** if you'd rather do it through the dashboard — just make sure it's named exactly `avatars` and set to Public).
4. Then run `supabase/migration_003.sql` — adds the news/notice board, per-account timezones, and lets people delete their own notes.
5. (Optional but recommended) Turn on **Realtime** for the `messages` table so chats update live without a refresh: **Database → Replication** in the Supabase dashboard, find `messages`, and toggle it on. Without this, messages still send/receive fine — the other person just needs to reopen or revisit the Messages page to see new ones instead of seeing them appear instantly.
6. Go to **Authentication → Sign In / Providers → Email** and decide whether "Confirm email" is on or off
   (the in-app Settings toggle is a preference flag for your own reference — flip the real switch here too).
7. Grab your **Project URL** and **Publishable key** from **Project Settings → API Keys**
   (the newer `sb_publishable_...` key — Supabase's current recommended replacement for the older
   `anon` key; the app also accepts a legacy `anon` key if that's what your project has under
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
8. Also grab your **service_role** key (same page, "Reveal" next to `service_role`) — this is needed
   for the admin API route that lets PTs/owners reset a client's password or edit their account.
   **Keep this secret** — it must never be prefixed with `NEXT_PUBLIC_` or shipped to the browser.

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
insert into public.register_tokens (token, role, max_uses, access_days, expires_at)
values ('TMC-FIRST-SETUP', 'client', 1, 30, now() + interval '7 days');
```

Use `role` = `'trainer'` if you want the first account to register directly as a trainer instead (in
which case `access_days` is ignored). Then register through the app UI with that token, and use the
SQL above to also grant yourself `owner`.

## 2. Local setup

```bash
npm install
cp .env.local.example .env.local
# edit .env.local with your Supabase URL + publishable key + service role key
npm run dev
```

Visit `http://localhost:3000`.

## 3. Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in [Vercel](https://vercel.com/new).
3. Add three environment variables in **Project Settings → Environment Variables** — do this
   **before** your first deploy if possible:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only — do **not** prefix with `NEXT_PUBLIC_`, or it will be
     exposed to every visitor's browser)

   `NEXT_PUBLIC_*` vars are baked into the app at build time, so if you add or change them after a
   deploy, you need to trigger a new deployment (Vercel → Deployments → "..." → Redeploy) for the
   change to take effect.
4. Deploy. Every page still runs client-side against Supabase directly (protected by RLS), except the
   one admin route (`/api/admin/update-user`), which is a small server function that uses the service
   role key to reset passwords and edit accounts on a PT/owner's behalf.

> The build is safe even if these env vars are briefly missing (e.g. your very first deploy before
> wiring up Supabase) — it'll fall back to placeholder values rather than crashing the build. The app
> just won't be able to talk to Supabase at runtime until the real values are set and you redeploy.

## Project structure

```
supabase/schema.sql        -- run this first in Supabase SQL editor
supabase/migration_002.sql -- run this second (usernames, expiry, calendar, daily logs, avatars)
src/
  middleware.ts             -- session refresh + route protection
  lib/
    supabase/client.ts       -- browser client
    supabase/server.ts       -- server client (used by the admin API route)
    useSession.ts            -- hook: current user, profile, roles
    types.ts                 -- shared TS types
    pdf.ts                   -- jsPDF export helpers
  components/
    MiniCalendar.tsx, StatCard.tsx, NotesPanel.tsx,
    TrainerOverview.tsx, ClientOverview.tsx
  app/
    page.tsx                 -- login (landing page), email or username
    register/page.tsx        -- token-gated registration
    api/admin/update-user/route.ts  -- service-role route: password reset, account edits
    dashboard/
      layout.tsx              -- role-aware sidebar
      page.tsx                 -- routes to Trainer or Client overview
      clients/page.tsx          -- clients table (own clients only)
      clients/[id]/page.tsx     -- client detail: Program/Sessions/Daily Log/Nutrition/Check-ups/Goals/Notes/Messages/Details
      programs/page.tsx         -- training plan builder (table view)
      admin/page.tsx            -- PT admin: tokens (with access duration) + roster
      schedule/page.tsx         -- client: calendar of assigned sessions + result logging
      dailylog/page.tsx         -- client: daily calories/macros/mood log
      goals/page.tsx            -- client: goals list
      account/page.tsx          -- all roles: avatar, bio, username, password
      owner/page.tsx             -- owner: manage trainers + ALL clients, edit any account
      settings/page.tsx         -- owner: registration & verification toggles
```

## Notes & things you'll likely want to extend

- **Assigning a training plan** links a plan to a client with a start/end date; turning that into
  actual per-day `schedule_events` entries (so it shows on the client's calendar automatically) is a
  good next step — right now PTs add sessions to a client's calendar separately from the Sessions tab.
- The register token flow assigns `role = 'client'` and (optionally) auto-links to a PT, granting
  `access_days` of account access. Owner-generated tokens use `role = 'trainer'` and ignore `access_days`.
- The **"require email verification"** toggle is stored for reference in `app_settings`, but Supabase's
  actual email-confirmation requirement is a project-level Auth setting — see the note on the Settings page.
- **Password resets and cross-account edits** (a PT changing a client's password, or the owner editing
  any account) go through `/api/admin/update-user`, the one server-side route in the app. It checks the
  caller's role from their session cookie before using the service-role key — a trainer can only touch
  their own clients, an owner can touch anyone. Editing your *own* password/profile (Account tab) doesn't
  need this route at all — it uses `supabase.auth.updateUser()` directly, which works with your own session.
- Row Level Security is doing the heavy lifting for the "Ryan can't see Joe if Joe belongs to Tim" rule —
  every clients/notes/schedule/goals/daily-log query is automatically scoped to `pt_id = auth.uid()`
  (or the owner, who can see everything).
- There's a small residual race condition in registration: `validate_register_token` checks a token is
  still valid right before signup, but two people redeeming the very last use of a token at the exact
  same instant could still both succeed. Fine at studio scale; if you ever need it airtight, move
  registration into a single service-role-backed API route that does the check-and-consume atomically.
- Styling lives in `tailwind.config.ts` (`base` = dark neutrals, `gold` = brighter accent with glow
  utilities baked into `.btn-primary` / `.badge-gold` / `.nav-link-active`) and `globals.css` — tweak
  those two files to adjust the whole look.

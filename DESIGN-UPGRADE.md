# Design and functionality upgrade

## Visual direction

The original charcoal/black and gold palette is retained, including #d4af37 and
#f2c94c. Gold is concentrated on primary actions, progress and navigation rather than
used everywhere. The interface adds restrained gradients, a custom vector M mark,
more breathing room, consistent form controls, clearer headings and softer card borders.
No font files or stock images are bundled. Typography uses the available system font.

The new layout includes a grouped desktop sidebar, breadcrumb/header, account access,
mobile navigation, in-flow footer, keyboard focus states and reduced-motion support.

## Rebuilt screens

- Sign in, invitation-token registration, forgotten password and password reset.
- Shared dashboard shell for clients, trainers and owners.
- Coach overview: client/plan/session/renewal metrics, seven-day training activity,
  completion summary, date-selectable sessions, needs-attention list and quick actions.
- Client overview: current plan, training completion, check-ins, PB counts, goals,
  upcoming sessions, coaching notes and daily-log prompts.
- Client roster: status tabs, name/email/description search, sorting, pagination,
  activity indicators and export of all filtered results.

Other management pages, including programmes, progress, nutrition, messaging, owner
management and account settings, remain available on their original routes. They
inherit the new shell and shared form/card/button styles; they have not all been
rewritten as new screens. Existing PDF exports and database migrations are retained.

## Added tools

1. Ctrl/Cmd+K page and client search. Results respect the current role and trainer's
   own loaded client roster. It is navigation search, not a server-wide content index.
2. A rest timer with presets, start/pause/reset and a wall-clock deadline. It keeps
   counting when closed or when moving between dashboard routes. A full reload,
   tab closure or leaving the dashboard clears it. It does not send push alerts.
3. In-app notifications for unread messages, today's outstanding sessions and
   account renewals. Refreshed on route changes, window focus and opening the panel;
   these are not new real-time, background, push or email notification services.
4. CSV export for filtered clients. Downloads locally on request, includes Unicode,
   escapes quotation marks and neutralises formula-like prefixes. Exports may contain
   personal information and should be stored/shared carefully.
5. Password visibility controls and recovery screens, with callback configuration
   described in START-HERE.md. Invitation-token registration remains intact.
6. Error/success feedback, empty states, loading skeletons and accessible modal
   controls with focus trapping, Escape and focus restoration.

## Data and correctness fixes

- Overview expiry/renewal metrics use profiles.access_expires_at, not the obsolete
  separate membership-expiration field. Paused/disabled accounts remain distinguishable.
- The client's current programme excludes assignments that have already ended.
- Training completion compares completed client training against scheduled client
  training; personal events, rest days and notes do not count as workouts.
- Client counts, goals, PB totals and logging days are read from actual records in
  live mode. Fictional preview data is isolated from authenticated dashboard routes.
- Upcoming-session counts exclude rest and note entries.
- New personal calendar events validate title and time order; failed saves keep input.
- Deleting overview events requires confirmation and stays scoped to the trainer.
- Notes and notices report save failures instead of clearing drafts silently.
- New personal self-notes use pt_only visibility rather than shared visibility.

## Preserved boundaries

No new SQL migration, subscription billing, payment integration, AI-generated programmes,
push service or external analytics/tracking was added. Existing RLS and auth/session
mechanisms are retained, not replaced or claimed as newly audited. No live database
writes, account changes, deployment or email deliveries were performed.

The dashboard day/date calculations follow the browser's local date. The existing
sidebar clock displays the profile timezone. This is not a full timezone-engine rewrite.

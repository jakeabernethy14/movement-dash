# Verification and release checklist

## Completed in this environment

- Syntax transpilation of all 62 TypeScript/TSX source files: no syntax diagnostics.
  This is not a full TypeScript semantic/type check.
- Browser interaction checks against the standalone preview built from the actual
  new React components and styles: roster name search, expired/renewal filters,
  filtered CSV download, command palette search and Escape, timer start/pause/reset,
  notifications, password visibility, recovery page/error feedback and mobile menu.
- Responsive overflow checks at 320, 390, 768, 1024 and 1440 pixels for the coach view;
  client and sign-in mobile views were also inspected visually.
- No page-level JavaScript errors in that preview test run.
- Unit tests in tests/csv.test.cjs cover quoting, null/zero/boolean handling,
  formula-prefix protection, tabs/newlines, Unicode and CSV encoding/line endings.

## Preview limitations

The offline browser harness uses locally available React 18.2 and compiled Tailwind 4
styles, with small router/date/icon/auth adapters. It renders the actual new interface
components but does not reproduce Next.js server rendering or Supabase. Some icon
shapes and utility details may differ slightly from production. Production dependencies
remain the original React 18.3 / Next 14 / Tailwind 3 declarations from your upload.
The standalone preview is not the production build output.

`npm ci` was attempted but registry access failed with EAI_AGAIN in this environment.
Consequently a complete dependency install, production Next.js build, full typecheck,
production SSR/hydration check and live database integration test were NOT completed.
No live credentials were provided. Do not treat preview screenshots as verification
of live authentication, authorisation, data writes or password-recovery email delivery.

## Run before release

1. Run npm ci, npm run typecheck, npm test and npm run build with your normal environment.
2. Start a Vercel preview deployment. Check the live layouts and original management
   pages using test trainer, client and owner accounts, on phone and desktop.
3. Verify that a trainer can see only the appropriate client records, a client can
   see only their own records, and expired/disabled accounts retain the expected
   lockout flow. This is a smoke test, not a substitute for an RLS/security review.
4. Compare dashboard totals, date selections, unread messages and renewal dates to
   known test records. Test empty data, loading, permission errors and network errors.
5. Create and delete a test personal session. Verify time validation and confirmation.
6. Create a personal note and a shared client note. Verify their intended visibility
   using separate accounts. Test notice posting/deletion and failure feedback.
7. Test invitation-token registration and settings as before. Test email/username
   sign-in, sign-out, expiry unlocking and forgotten-password delivery/end-to-end reset.
8. Verify expired/reused recovery links show a recoverable message, and passwords
   cannot be changed without an authenticated session.
9. Test real client search, all roster filters/sorts, pagination and filtered export.
10. Check original programme assignments, messages, progress, nutrition, account
    settings, owner tools and PDF exports for regressions before merging to production.

Source-level changes and original SQL are included for review. No secrets, node_modules,
font files or prebuilt deployment output are included in the archive.

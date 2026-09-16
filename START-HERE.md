# The Movement Coaching - design upgrade

Your original black-and-gold identity, with a rebuilt interface and useful coaching tools.

## See it first

Open `preview/movement-preview.html` in a modern browser. It is self-contained and uses
fictional sample data. Switch between Coach dashboard, Client dashboard and Client roster.
Try search, filters, sorting, CSV export, Ctrl/Cmd+K, notifications and the rest timer.
The sign-in screen is available from the preview banner.

This standalone file is a visual/interaction preview, not the deployable application.
It cannot sign anyone in, send email, save programmes or connect to your database.
Most preview links to other management screens show a sample-mode message or remain
on the preview. The full source keeps the real routes.

## Update your existing site

1. Back up the current repository. Review these changes on a new branch before merging.
2. Copy this project into your existing repository, preserving your real `.env.local`
   and existing Vercel environment variables. No real credentials are included here.
3. Use your existing Supabase project. This upgrade needs **no new SQL migration**.
   Do not rerun `schema.sql` over your live project just for this redesign.
4. Install and check locally (commands below). Review the live smoke-test checklist in
   `TESTING.md` before publishing to your production domain.
5. Commit the changes to your existing connected repository and use a Vercel preview
   deployment first. This remains a Next.js app: use the Next.js framework preset,
   `npm run build`, and its default output directory, not a `public` output override.

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

The package versions and lockfile from your upload have been retained. No new runtime
package is required. `typecheck` and `test` scripts have been added. A dependency/security
audit and production build remain your pre-deployment checks, not completed certifications.

## One configuration step for password recovery

The new recovery flow sends users to `/auth/callback`, exchanges the recovery code for
a session, then opens `/reset-password`. In your existing Supabase Authentication URL
configuration, allow your exact deployed callback URL, for example:

`https://YOUR-DOMAIN/auth/callback`

For local testing, also allow `http://localhost:3000/auth/callback`. Keep the Site URL
set to your actual site. Existing email templates/provider settings must support password
recovery. Test delivery, expiration and the same-browser PKCE flow with a test account.
A customised recovery email template may need adjustment to honour this callback.

Documentation: https://supabase.com/docs/guides/auth/passwords
and https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail

Continue using `NEXT_PUBLIC_SUPABASE_URL` and your existing publishable or anon public key.
Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never give it a `NEXT_PUBLIC_` prefix.

## What changed

See `DESIGN-UPGRADE.md` for the feature list and implementation boundaries. See
`TESTING.md` for what was actually verified and what still needs your live environment.
The original setup guide is retained in `README.md` for fresh installs; its database
bootstrap steps are not an instruction to reset an existing installation.

# Mind Islands Public Beta Security/Auth Hardening

Last reviewed: 2026-06-04

## Beta Gate

Do not open the public beta until `/api/ready` returns `{"ok":true}` in production.

Required production environment:

```bash
NODE_ENV=production
COOKIE_SECURE=true
APP_ORIGIN=https://yourdomain.com
DATABASE_URL=postgresql://...
JWT_SECRET=<long random secret, 32+ chars>
DATA_ENCRYPTION_KEY=<different long random secret, 32+ chars>
GEMINI_API_KEY=...
SMTP_HOST=...
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM=Mind Islands <no-reply@yourdomain.com>
```

Generate secrets with:

```bash
openssl rand -base64 48
```

## Implemented In This Pass

- Email verification is server-enforced for new registrations. Users must request a 6-digit code, and `/api/auth/register` rejects registrations without a valid unexpired code.
- Existing users are migrated to `email_verified_at = created_at` so current accounts are not locked out.
- Auth, registration, logout, verification-code send, and AI endpoints have in-memory rate limits.
- Production mutating `/api/*` requests enforce trusted `Origin` when browsers send one.
- Security response headers are set globally: `nosniff`, `DENY` framing, strict referrer policy, limited browser permissions, and HSTS when secure cookies are enabled.
- New writes for sensitive user data use application-layer AES-256-GCM encryption when `DATA_ENCRYPTION_KEY` is configured:
  - `user_states.state_ciphertext`
  - `user_memory_events.content_ciphertext`
  - `user_memory_events.fields_ciphertext`
  - `user_memory_events.source_message_ciphertext`
  - `user_profile_facts.value_ciphertext`
  - `user_profile_summaries.summary_ciphertext`
- Profile fact deduplication uses an HMAC lookup hash so encrypted values can still be matched.
- Old plaintext rows remain readable for zero-downtime deployment.
- `npm run backup:db` creates a gzipped `pg_dump` plus SHA-256 checksum and can upload to S3 when `BACKUP_S3_URI` is set.

## Remaining Must-Do Before Invites

1. Configure HTTPS and set `COOKIE_SECURE=true`.
2. Configure `APP_ORIGIN` to the exact production origin. If multiple origins are needed, use a comma-separated list.
3. Configure SMTP and test signup with a real email address.
4. Configure `DATA_ENCRYPTION_KEY`; store it in the deployment secret manager, not in git.
5. Run a production smoke test:

```bash
curl https://yourdomain.com/api/health
curl https://yourdomain.com/api/ready
```

6. Enable automated database backups:

```bash
BACKUP_S3_URI=s3://mind-islands-prod-backups npm run backup:db
```

7. Restore-test one backup into a temporary database before launch:

```bash
gunzip -c backups/mind-islands-<timestamp>.sql.gz | psql "$RESTORE_DATABASE_URL"
```

8. Backfill encryption for existing plaintext rows after the new code has been deployed and verified. Until then, old rows remain readable but not retroactively encrypted.

## Data Isolation

Current API isolation model:

- Every persisted user object has `user_id`.
- Authenticated endpoints derive `user_id` from the signed HTTP-only cookie.
- Memory, profile, and state reads/writes filter by `user_id`.
- Object update/delete endpoints check both object id and `user_id`.

Recommended beta posture:

- Keep the server-side API as the only database access path; do not expose PostgREST/direct DB credentials to the browser.
- Use a private RDS database security group that only allows inbound PostgreSQL from the EC2 security group.
- Add a quarterly query audit for every SQL statement touching user-owned tables.
- If migrating to Supabase client-side APIs later, implement real Row Level Security policies before exposing anon/service keys.

RLS note: turning on `FORCE ROW LEVEL SECURITY` inside this current Express app would require refactoring all user queries to run inside request-scoped transactions with `SET LOCAL app.current_user_id`. That is worthwhile later, but risky as a last-minute beta change.

## Encryption Policy

`DATA_ENCRYPTION_KEY` protects user-generated text and compact profile data at the application layer. Database-level encryption from the cloud provider is still required, but it does not protect against a logical dump leak. App-layer encryption reduces that risk.

Key rotation plan:

1. Add `DATA_ENCRYPTION_KEY_NEXT`.
2. Write new rows with the next key while still reading old envelopes.
3. Backfill old envelopes in batches.
4. Promote the next key and retire the old key after restore tests pass.

## Backup Policy

Minimum public beta policy:

- Automated nightly logical backup with `npm run backup:db`.
- Store backups outside the database provider account when possible, such as S3 with versioning and lifecycle rules.
- Keep 14 daily backups and 3 monthly backups.
- Restore-test at least once before public beta, then monthly.
- Store `DATA_ENCRYPTION_KEY` backups separately from database backups; without the key, encrypted fields cannot be restored usefully.

## Supabase / Lower-Cost Migration Assessment

Sources reviewed on 2026-06-04:

- Supabase pricing and billing FAQ: https://supabase.com/pricing and https://supabase.com/docs/guides/platform/billing-faq
- Neon pricing: https://neon.com/pricing
- AWS RDS for PostgreSQL pricing: https://aws.amazon.com/rds/postgresql/pricing/

Recommendation for public beta: stay on the current Express + Postgres architecture and keep RDS if it is already running. The app already owns auth, email verification, encryption, and data access rules; a Supabase Auth migration before beta would add risk without much immediate product benefit.

Options:

| Option | Fit | Cost Shape | Security/Auth Impact |
| --- | --- | --- | --- |
| Current EC2 + RDS PostgreSQL | Best for beta if already deployed | Free tier may cover new AWS accounts for 12 months; otherwise pay instance, storage, backup, and transfer | Lowest code churn; keep private DB; use current app auth |
| Supabase Pro | Good if you want managed Auth, dashboard, Storage, Realtime later | Pro organization base plus project compute and overages; billing FAQ notes extra projects add compute charges | Requires migration to Supabase Auth or dual-auth plan; RLS needed before browser DB access |
| Neon Postgres | Good low-cost managed Postgres replacement | Free tier for small/intermittent load; usage-based launch plan | Minimal app changes if only swapping `DATABASE_URL`; still need separate SMTP/auth/app server |
| Self-managed Postgres on EC2 | Cheapest cash cost, highest ops burden | One EC2 instance plus volume snapshots | Not recommended for mental-health-adjacent beta data unless someone owns patching, backups, restore drills |

Practical path:

1. Beta now: current Express app + RDS private subnet/security group.
2. Cost reduction experiment: create a Neon project and run staging against it by changing `DATABASE_URL`.
3. Supabase only when you explicitly need managed Auth, Storage, Realtime, or admin workflows. Do not expose Supabase client access until RLS policies are designed and tested.

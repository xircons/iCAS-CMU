# Migrate MySQL/MariaDB → Supabase Postgres

This app’s canonical schema dump lives at [`.sql/icas_cmu_hub.sql`](../.sql/icas_cmu_hub.sql). Tables used only at runtime (email OTP + reminders) are in [`../.sql/postgres/supplementary.sql`](../.sql/postgres/supplementary.sql).

## 1. Branch & env

- Work on a branch such as `chore/db-postgres-supabase`.
- Copy [`.env.example`](../.env.example) to `backend/.env` and fill **`DATABASE_URL`** from Supabase **Project Settings → Database** (URI usually includes `sslmode=require`).
- After pgloader, application tables live in schema **`icas_cmu_hub`** (not `public`). Add **`PG_SEARCH_PATH=icas_cmu_hub, public`** to `backend/.env` so unqualified SQL (`SELECT * FROM events`) resolves correctly.

Recommended check:

```bash
cd backend && npm run test:db
```

## 2. Restore dump into a temporary MySQL-compatible server

`pgloader` reads from a live MySQL-compatible server, not from the raw `.sql` text alone.

From the repo root, start the helper service (MariaDB on host port `3307`):

```bash
docker compose -f docker-compose.db-migrate.yml up -d maria_restore
```

Wait until MariaDB finishes applying `docker-entrypoint-initdb.d` scripts (check container logs).

## 3. Run pgloader → Supabase Postgres

Install [pgloader](https://github.com/dimitri/pgloader) locally, then (adjust credentials from Supabase):

```bash
pgloader \
  "mysql://root:localroot@127.0.0.1:3307/icas_cmu_hub" \
  "postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require"
```

Use the **database password** from Supabase (not the anon key). Try **Transaction pooler** (`6543`) first; if pgloader dislikes pooling, use the **direct** `5432` URI from the dashboard instead.

The second argument must be the URI only (no `DATABASE_URL=` prefix).

If pgloader reports `SSL verify error` / `X509_V_ERR_SELF_SIGNED_CERT_IN_CHAIN` (common on school or corporate networks with TLS inspection):

1. **Combine** `--no-ssl-cert-verification` with **`sslmode=allow`** on the Postgres URI (not `sslmode=require`). Homebrew/pgloader builds sometimes ignore the flag unless this pair is used ([pgloader#768](https://github.com/dimitri/pgloader/issues/768), [pgloader#1360](https://github.com/dimitri/pgloader/issues/1360)):

```bash
pgloader --no-ssl-cert-verification \
  "mysql://root:localroot@127.0.0.1:3307/icas_cmu_hub" \
  "postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=allow"
```

If that still fails, the local `pgloader` binary may be ignoring the flag. Then try: run **pgloader inside Docker** (Linux image, e.g. `dimitri/pgloader`) with the same URLs (use `host.docker.internal:3307` for MySQL from the container); run the migration from a **Wi-Fi hotspot** or network without HTTPS inspection; or install your network’s **intercept root CA** so verification succeeds.

Do not use skipped certificate verification in production app services; fixing trust (e.g. `NODE_EXTRA_CA_CERTS` / system CA) is preferred when possible.

## 4. Apply supplementary SQL (OTP + reminders)

In the **Supabase SQL editor** or via `psql`:

```bash
psql "$DATABASE_URL" -f backend/.sql/postgres/supplementary.sql
```

This adds `icas_cmu_hub.email_otps` and `icas_cmu_hub.event_reminders` (foreign key to **`icas_cmu_hub.events`**) with **`UNIQUE(event_id)`** so `ON CONFLICT (event_id)` works for reminder tracking.

If `event_reminders` already exists from MySQL with a different unique index, see comments at the bottom of `supplementary.sql`.

## 5. Verify

- Compare per-table row counts between MariaDB and Postgres.
- Spot-check Thai text and timestamp fields.
- With `backend/.env` pointing at Supabase: `npm run test:db:full`.

## 6. Security

- Do not commit `.env` with secrets.
- Prefer short-lived credentials; rotate the DB password after migration if it was shared.

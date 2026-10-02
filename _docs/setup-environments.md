# First-time setup: development + production environments

Step-by-step guide for wiring up the two environments. Read the design in
[`environments.md`](environments.md) for *why*; this file is the *do this, in
this order* version.

**Order matters.** Production does not exist yet, and its deploy hook URL is
created by Render — so Part 1 comes before anything GitHub-related.

> Never commit a deploy hook or paste it into a tracked file. A deploy hook is a
> password: anyone who has it can redeploy your app. Keep it only in Render and
> in the GitHub secret.

---

## The end result

| | Development | Production |
| --- | --- | --- |
| Render service | `sports-league-scoreboard` (exists) | `sports-league-scoreboard-production` (to create) |
| URL | `https://sports-league-scoreboard.onrender.com` | shown by Render after Part 1 |
| Database | its own | its own (`scoreboard-production-db`) |
| Deploys | automatically on push to `main` | only when you approve a manual run |
| GitHub Environment | `development` | `production` (+ required reviewer) |

Each GitHub Environment holds exactly two values:

| Name | Kind | Value |
| --- | --- | --- |
| `BASE_URL` | Variable (visible) | that environment's public URL |
| `RENDER_DEPLOY_HOOK_URL` | Secret (hidden) | that service's Render deploy hook |

---

## Part 1 — Create production on Render (manual, free resources)

Do this by hand in the Render dashboard. It creates the same service and
database that `render.yaml` describes, without the Blueprint flow (which may ask
for a payment method). `render.yaml` stays in the repo as documentation of the
intended settings.

### 1a. Create the production database (recommended)

1. Render dashboard → **New** → **Postgres**.
2. Fill in:
   - **Name**: `scoreboard-production-db`
   - **Database**: `scoreboard`
   - **User**: `scoreboard`
   - **Region**: the same region as your dev service (keeps things fast)
   - **Plan**: **Free**
3. Click **Create Database** and wait until it is available.
4. Open it and copy the **Internal Database URL** (used by services in the same
   Render region). It looks like
   `postgresql://scoreboard:...@dpg-xxxx-a/scoreboard`.

> Free Postgres is **deleted after 30 days**. That is fine for getting the flow
> working, but production data will not survive. When you are ready, upgrade it
> to a paid plan. A free external Postgres (for example Neon or Supabase) is
> another option that does not expire — put its connection string in
> `DATABASE_URL` instead.

### 1b. If you cannot create a database

Render's Docker image is configured to fall back to SQLite at `/data/league.db`,
so the service will still start without `DATABASE_URL`. Be aware this data is
**lost on every redeploy** because free services have no persistent disk. Only
use this to try the flow; use 1a for anything real.

### 1c. Create the production web service

1. Render dashboard → **New** → **Web Service** → **Build and deploy from a Git
   repository** → connect `gwaribe/sports-league-scoreboard`.
2. Fill in:
   - **Name**: `sports-league-scoreboard-production`
   - **Region**: same as the database
   - **Branch**: `main`
   - **Language / Runtime**: **Docker**
   - **Dockerfile Path**: `./Dockerfile`
   - **Instance Type**: **Free**
   - **Auto-Deploy**: **No** ← important, CI must be the only deployer
   - **Health Check Path**: `/api/health`
3. Under **Environment Variables**, add:
   - `DATABASE_URL` = the Internal Database URL from 1a (skip if you used 1b)
4. Click **Create Web Service** and wait for the first deploy to finish and the
   health check to pass.
5. Copy two values somewhere temporary:
   - the service **URL** (Render may add a suffix; use whatever it shows)
   - the **Deploy Hook** URL under *Settings → Deploy Hook → Copy*

Production will not redeploy on its own: you set **Auto-Deploy = No**, so CI is
the only path to a production deploy.

## Part 2 — Turn off auto-deploy on the dev service

Open the **development** service (the existing one) → **Settings** → *Build &
Deploy* → set **Auto-Deploy** to **No**.

This is important: otherwise Render redeploys dev on every push, on its own,
before the tests finish. CI must be the only thing that deploys.

## Part 3 — Create the two GitHub Environments

In the repository: **Settings** → **Environments** → **New environment**.

1. Create `development`.
   - Leave protection rules off.
2. Create `production`.
   - Enable **Required reviewers** and add yourself. This is the approval gate.
   - Recommended: under **Deployment branches**, allow only `main`.

The names must be exactly `development` and `production` — the workflow matches
them.

## Part 4 — Fill in the values

Do this once inside `development`, then again inside `production`.

Open an environment and add:

1. **Add environment variable**
   - Name: `BASE_URL`
   - Value: that environment's URL
2. **Add secret**
   - Name: `RENDER_DEPLOY_HOOK_URL`
   - Value: that service's deploy hook URL

| Environment | `BASE_URL` | `RENDER_DEPLOY_HOOK_URL` |
| --- | --- | --- |
| `development` | dev URL | dev service's hook |
| `production` | prod URL (from Part 1) | prod service's hook (from Part 1) |

Secrets cannot be read back after saving — that is normal. Re-enter the value if
you need to change it.

### CLI alternative

After `gh auth login`:

```sh
# Development
gh variable set BASE_URL --env development --body "https://sports-league-scoreboard.onrender.com"
gh secret set RENDER_DEPLOY_HOOK_URL --env development   # prompts for the value

# Production (use the URL and hook from Part 1)
gh variable set BASE_URL --env production --body "<paste the production URL>"
gh secret set RENDER_DEPLOY_HOOK_URL --env production    # prompts for the value
```

Run `gh secret set` without `--body` so the hook is typed at a prompt and never
lands in your shell history.

## Part 5 — Verify

1. Push a trivial change to `main`.
   - Tests run, then **Deploy development** runs, then goes green once
     `/api/health` reports the pushed commit.
2. Open the dev URL and click around.
3. In GitHub: **Actions** → **CI/CD** → **Run workflow** → choose
   `deploy = production` → **Run**.
4. The run pauses on **Deploy production** waiting for approval. Approve it.
5. The job goes green once `/api/health` on the production URL reports the
   commit.

## Part 6 — Optional cleanup

The old repository-level `E2E_BASE_URL` and `RENDER_DEPLOY_HOOK_URL` still work
as a fallback for dev, so nothing breaks while you migrate. Once both
environments are filled in, delete the repository-level copies so there is a
single source of truth:

**Settings** → **Secrets and variables** → **Actions** → remove the old
repository-level entries.

---

## What free tier means for "always available"

Without a payment method, Render's free instances:
- **spin down after ~15 minutes idle** and cold-start on the next request, and
- the **free database is deleted after 30 days**.

So production will be reachable, but not instantly always-on, and its data has
an expiry. If/when you are ready, the two fixes are:
- upgrade the production web service to `plan: starter` (always on), and
- use a paid or non-expiring database.

---

## Troubleshooting

- **Deploy job fails at "Require deployment configuration"** — that environment
  is missing `BASE_URL` or `RENDER_DEPLOY_HOOK_URL`. Redo Part 4 for it.
- **Production deploy says "Waiting for ... commit ..." and times out** — the
  deploy hook shipped a different commit than the run. Always start the manual
  run from `main`, and make sure auto-deploy is off so Render is not racing CI.
- **Two deploys appear on every push** — auto-deploy is still on in Render
  (Part 2).
- **Render asks for a payment method even for a free web service** — try 1b
  (no database) first; if the web service itself still requires a card, the
  alternative is to host the second copy elsewhere (another free host) using the
  same Docker image.

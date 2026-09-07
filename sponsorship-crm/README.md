# Sponsorship Ledger

A small private CRM for tracking sponsorship contacts and outreach. One user,
one passphrase, one SQLite file. Flask on the back, plain HTML/CSS/JS on the
front — no build step, no framework, no external services.

Built to live on a cheap host so it is reachable from your phone anywhere, and
to be added to your phone's home screen so it opens like an app.

## What it does

- **Contacts** — name, company/organisation, email, phone, an optional deal
  value, and a status of Prospect / Contacted / In Talks / Committed /
  Declined.
- **Interaction log** — dated free-text entries against a contact, newest
  first (flip to oldest-first on the contact page).
- **Logging is two taps** — the `+` on any row in the list opens a sheet with
  today's date already filled in and the cursor in the notes box. Type, tap
  Save. On a contact's page the same action sits in a bar pinned to the bottom
  of the screen, in thumb reach.
- **List view** — sortable by recent activity, name, or longest untouched.
- **Search and filter** — by name or organisation, and by status.
- **Commission** — set a deal value on a contact and the app shows your 50%
  share beside it. A panel at the top of the list keeps the running totals:
  committed value and commission earned, across every contact marked
  Committed. Values on contacts that are not committed are kept but not
  counted.
- **Needs follow-up** — a second tab on the list showing everything still in
  play that has gone quiet for more than 10 days, most overdue first, with
  the number of days beside each name. Committed and Declined contacts are
  never chased. A contact with nothing logged against it counts from the day
  it was added, so a contact added this morning is not immediately overdue.
- **Export** — every contact and every interaction as one CSV.

## Run it locally

```bash
cd sponsorship-crm
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python3 app.py
```

Open <http://localhost:5000>. In local dev the passphrase is `sponsor` unless
you set `CRM_PASSWORD`. The database is written to `data/crm.db`.

Run the test suite with `python3 test_app.py` (66 end-to-end checks against the
API, no pytest needed).

## Deploy it — Render

Render is the shortest path: connect the repo, set three environment
variables, done. **Use a paid instance type if you want to keep your data** —
Render's free instances have an ephemeral filesystem, so the SQLite file is
wiped on every deploy and every restart. A persistent disk needs a paid plan.

1. Push this repo to GitHub (it already is, if you are reading this there).
2. Go to <https://dashboard.render.com> → **New** → **Web Service**.
3. Connect your GitHub account and pick this repository, then pick the branch.
4. Fill in the settings:
   - **Name** — anything; it becomes `<name>.onrender.com`.
   - **Root Directory** — `sponsorship-crm`
   - **Language / Runtime** — Python 3
   - **Build Command** — `pip install -r requirements.txt`
   - **Start Command** —
     `gunicorn "app:create_app()" --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 60`
   - **Instance Type** — Starter or above (required for the disk in step 6)
5. Under **Environment Variables**, add:

   | Key | Value |
   | --- | --- |
   | `CRM_PASSWORD` | the passphrase you will type to unlock the app |
   | `CRM_SECRET_KEY` | a long random string — `python3 -c "import secrets;print(secrets.token_hex(32))"` |
   | `CRM_DB_PATH` | `/var/data/crm.db` |

6. Under **Advanced** → **Add Disk**: name `ledger-data`, mount path
   `/var/data`, size 1 GB. This is what makes the data survive deploys.
7. Set **Health Check Path** to `/login`.
8. **Create Web Service**. The first build takes a couple of minutes.
9. Open `https://<name>.onrender.com` on your phone and sign in.

To redeploy later, push to the branch — Render rebuilds automatically.

*Trying it out on the free instance type instead?* It works, but skip step 6,
leave `CRM_DB_PATH` unset, and know that your contacts disappear on every
restart. Export the CSV before you rely on anything.

## Deploy it — Fly.io

Fly costs a little more to set up and a little less to run, and gives you a
proper volume for the database. Machines sleep when idle and wake on the next
request, so the first hit after a quiet spell takes an extra second.

1. Install `flyctl` (<https://fly.io/docs/flyctl/install/>) and run
   `fly auth login` (or `fly auth signup`).
2. `cd sponsorship-crm`
3. Edit `fly.toml`: change `app` to a name unique across Fly, and
   `primary_region` to the region nearest you (`fly platform regions` lists
   them).
4. Create the app and its volume:

   ```bash
   fly apps create <your-app-name>
   fly volumes create ledger_data --size 1 --region <your-region> --app <your-app-name>
   ```

5. Set the secrets:

   ```bash
   fly secrets set \
     CRM_PASSWORD='your passphrase here' \
     CRM_SECRET_KEY="$(python3 -c 'import secrets;print(secrets.token_hex(32))')" \
     --app <your-app-name>
   ```

6. `fly deploy`
7. Open `https://<your-app-name>.fly.dev` on your phone and sign in.

Redeploy after changes with `fly deploy`. Back up the database with
`fly ssh sftp get /data/crm.db ./crm-backup.db`.

## Add it to your phone's home screen

The app ships a web manifest, icons, and the iOS meta tags, so it installs as
a standalone app with no browser chrome.

- **iPhone / iPad (Safari)** — open the site, tap the Share button, scroll to
  **Add to Home Screen**, tap **Add**. Safari only offers this from Safari
  itself, not from Chrome on iOS.
- **Android (Chrome)** — open the site, tap the ⋮ menu, tap **Install app**
  or **Add to Home screen**.

Sign-in survives for 90 days, so you will rarely see the passphrase screen
after the first time.

## Data, backups, and safety

- Everything lives in one SQLite file (`CRM_DB_PATH`). Copy that file and you
  have copied the whole ledger.
- **Export CSV** in the header downloads every contact and interaction as one
  file — one row per interaction, plus a row for contacts with none yet, with
  the deal value and commission on each. That is the simplest backup and the
  easiest thing to open in a spreadsheet.
- The gate is a single passphrase, held in a signed, HTTP-only, `Secure`
  session cookie. Failed sign-ins are rate-limited to 10 per 15 minutes per
  IP. That is proportionate for a personal tool on a URL nobody is looking
  for — it is not an account system, and it is not meant to protect anything
  regulated. Choose a passphrase you do not use elsewhere.
- Always deploy behind HTTPS (both Render and Fly do this for you).

## Configuration

| Variable | Default | What it does |
| --- | --- | --- |
| `CRM_PASSWORD` | *(required in production)* | The passphrase that unlocks the app. The server refuses to start without it. |
| `CRM_SECRET_KEY` | generated and stored next to the database | Signs the session cookie. Set it explicitly so sessions survive a redeploy. |
| `CRM_DB_PATH` | `./data/crm.db` | Where the SQLite file lives. Point it at your mounted disk. |
| `CRM_COOKIE_SECURE` | `1` in production, `0` in dev | Set to `0` only to test over plain HTTP. |
| `CRM_DEV` | unset | Enables the dev passphrase and relaxes the cookie flag. Never set in production. |
| `PORT` | `5000` local, `8080` in Docker | Port to bind. |

## Layout

```
sponsorship-crm/
├── app.py                  Flask routes, auth gate, CSV export
├── db.py                   SQLite schema and queries, totals, follow-up rule
├── test_app.py             end-to-end API checks
├── static/
│   ├── index.html          app shell + Add-to-Home-Screen meta tags
│   ├── app.css             the whole design system
│   ├── app.js              views, routing, sheets — plain JS, no framework
│   ├── sw.js               small offline shell
│   ├── manifest.webmanifest
│   └── icons/              monogram, SVG + PNG
├── scripts/make_icons.py   regenerates the PNG icons (standard library only)
├── Dockerfile, fly.toml    Fly.io deploy
├── render.yaml, Procfile   Render deploy
└── requirements.txt
```

## Deliberately not here

No multi-user accounts, no email sending, no integrations, no reminders or
notifications, no dashboards, no native app. Two tables, one passphrase.

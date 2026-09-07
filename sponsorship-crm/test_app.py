"""End-to-end checks for the ledger API. Run with: python3 test_app.py"""

import io
import os
import sqlite3
import tempfile
from datetime import date, timedelta

os.environ["CRM_PASSWORD"] = "test-pass"
os.environ["CRM_COOKIE_SECURE"] = "0"
_tmp = tempfile.mkdtemp()
os.environ["CRM_DB_PATH"] = os.path.join(_tmp, "test.db")

import app as app_module  # noqa: E402

app = app_module.create_app()
app.config["TESTING"] = True
client = app.test_client()

checks = []


def check(name, condition):
    checks.append((name, bool(condition)))
    print(("  ok   " if condition else "  FAIL ") + name)


# --- auth gate --------------------------------------------------------------
check("api is locked when signed out", client.get("/api/contacts").status_code == 401)
check("browser hits are redirected to login", client.get("/").status_code == 302)
check("wrong passphrase is rejected",
      client.post("/login", data={"password": "nope"}).status_code == 401)
check("correct passphrase signs in",
      client.post("/login", data={"password": "test-pass"}).status_code == 302)
check("app shell loads once signed in", client.get("/").status_code == 200)

# --- contacts ---------------------------------------------------------------
created = client.post("/api/contacts", json={
    "name": "Marguerite Vance", "company": "Vance & Co", "email": "mv@example.com",
    "phone": "+1 555 0142", "status": "In Talks"})
check("contact is created", created.status_code == 201)
contact_id = created.get_json()["contact"]["id"]

check("name is required", client.post("/api/contacts", json={"name": "  "}).status_code == 400)
check("status is validated",
      client.post("/api/contacts", json={"name": "X", "status": "Bogus"}).status_code == 400)

client.post("/api/contacts", json={"name": "Aldous Finch", "company": "Finch Trust", "status": "Prospect"})

listing = client.get("/api/contacts").get_json()["contacts"]
check("both contacts are listed", len(listing) == 2)

by_name = client.get("/api/contacts?sort=name").get_json()["contacts"]
check("sorting by name works", [c["name"] for c in by_name] == ["Aldous Finch", "Marguerite Vance"])

check("search matches a name", len(client.get("/api/contacts?q=vance").get_json()["contacts"]) == 1)
check("search matches a company", len(client.get("/api/contacts?q=Finch+Trust").get_json()["contacts"]) == 1)
check("status filter works", len(client.get("/api/contacts?status=In+Talks").get_json()["contacts"]) == 1)

updated = client.put("/api/contacts/%d" % contact_id, json={
    "name": "Marguerite Vance", "company": "Vance & Co", "email": "mv@example.com",
    "phone": "+1 555 0142", "status": "Committed"})
check("contact is updated", updated.get_json()["contact"]["status"] == "Committed")
check("updating a missing contact 404s",
      client.put("/api/contacts/9999", json={"name": "Ghost"}).status_code == 404)

# --- interactions -----------------------------------------------------------
first = client.post("/api/contacts/%d/interactions" % contact_id,
                    json={"date": "2026-08-14", "notes": "Intro call.\nAsked for a one-pager."})
check("interaction is logged", first.status_code == 201)
client.post("/api/contacts/%d/interactions" % contact_id,
            json={"date": "2026-09-02", "notes": "Sent the deck."})

check("a note is required",
      client.post("/api/contacts/%d/interactions" % contact_id,
                  json={"date": "2026-09-02", "notes": " "}).status_code == 400)
check("a bad date is rejected",
      client.post("/api/contacts/%d/interactions" % contact_id,
                  json={"date": "2026-02-31", "notes": "x"}).status_code == 400)
check("logging against a missing contact 404s",
      client.post("/api/contacts/9999/interactions", json={"notes": "x"}).status_code == 404)

detail = client.get("/api/contacts/%d" % contact_id).get_json()
check("history comes back newest first",
      [i["occurred_on"] for i in detail["interactions"]] == ["2026-09-02", "2026-08-14"])
check("interaction count rolls up", detail["contact"]["interaction_count"] == 2)
check("last interaction rolls up", detail["contact"]["last_interaction"] == "2026-09-02")

recent = client.get("/api/contacts?sort=recent").get_json()["contacts"]
check("sorting by recent activity puts the logged contact first",
      recent[0]["name"] == "Marguerite Vance")

entry_id = first.get_json()["interaction"]["id"]
edited = client.put("/api/interactions/%d" % entry_id, json={"date": "2026-08-15", "notes": "Intro call, rescheduled."})
check("interaction is edited", edited.get_json()["interaction"]["occurred_on"] == "2026-08-15")
check("deleting an interaction works", client.delete("/api/interactions/%d" % entry_id).status_code == 200)
check("deleting it twice 404s", client.delete("/api/interactions/%d" % entry_id).status_code == 404)

# --- deal value and commission ----------------------------------------------
priced = client.post("/api/contacts", json={
    "name": "Cordelia Ash", "company": "Ash Holdings", "status": "Committed", "deal_value": 4500})
check("a committed contact takes a deal value", priced.status_code == 201)
priced_id = priced.get_json()["contact"]["id"]
check("the deal value is stored", priced.get_json()["contact"]["deal_value"] == 4500)

check("a negative deal value is rejected",
      client.post("/api/contacts", json={"name": "X", "deal_value": -5}).status_code == 400)
check("a non-numeric deal value is rejected",
      client.post("/api/contacts", json={"name": "X", "deal_value": "lots"}).status_code == 400)
check("an absurd deal value is rejected",
      client.post("/api/contacts", json={"name": "X", "deal_value": 1e15}).status_code == 400)
check("a blank deal value clears to null",
      client.post("/api/contacts", json={"name": "Blank Deal", "deal_value": ""})
      .get_json()["contact"]["deal_value"] is None)
check("a typed dollar amount is parsed",
      client.post("/api/contacts", json={"name": "Typed Deal", "status": "Committed",
                                         "deal_value": "$1,250.50"})
      .get_json()["contact"]["deal_value"] == 1250.50)

totals = client.get("/api/contacts").get_json()["summary"]
check("committed value totals only committed contacts", totals["committed_value"] == 5750.50)
check("the currency is labelled CAD", totals["currency"] == "CAD")
check("commission is half the committed value", totals["commission"] == 2875.25)
check("committed contacts are counted", totals["committed_count"] == 3)
check("the summary carries the whole-ledger total", totals["total"] == 5)

# A value on a contact that is not committed must not reach the totals.
client.put("/api/contacts/%d" % priced_id, json={
    "name": "Cordelia Ash", "company": "Ash Holdings", "status": "In Talks", "deal_value": 4500})
totals = client.get("/api/contacts").get_json()["summary"]
check("an uncommitted deal value is excluded from the totals", totals["committed_value"] == 1250.50)
check("the committed count drops with it", totals["committed_count"] == 2)

# Potential commission spans every contact carrying a value, whatever its status.
check("potential commission covers uncommitted deal values too",
      totals["pipeline_value"] == 5750.50 and totals["potential_commission"] == 2875.25)
check("potential commission is at least the earned commission",
      totals["potential_commission"] >= totals["commission"])
check("priced contacts are counted", totals["priced_count"] == 2)

declined_priced = client.post("/api/contacts", json={
    "name": "Lapsed Lead", "status": "Declined", "deal_value": 1000}).get_json()["contact"]
totals = client.get("/api/contacts").get_json()["summary"]
check("a declined contact with a value still counts as potential",
      totals["pipeline_value"] == 6750.50 and totals["potential_commission"] == 3375.25)
check("a declined contact never counts as earned", totals["committed_value"] == 1250.50)
client.delete("/api/contacts/%d" % declined_priced["id"])

check("contacts with no value are left out of the potential total",
      client.post("/api/contacts", json={"name": "No Value Yet"}).status_code == 201
      and client.get("/api/contacts").get_json()["summary"]["priced_count"] == 2)
check("the deal value survives the status change",
      client.get("/api/contacts/%d" % priced_id).get_json()["contact"]["deal_value"] == 4500)

# Filtering must not change the running totals.
filtered_totals = client.get("/api/contacts?q=zzzz").get_json()
check("filtering leaves the totals alone",
      filtered_totals["contacts"] == [] and filtered_totals["summary"]["committed_value"] == 1250.50)

client.delete("/api/contacts/%d" % priced_id)

# --- needs follow-up ---------------------------------------------------------
quiet = client.post("/api/contacts", json={"name": "Quiet Prospect", "status": "Prospect"}).get_json()["contact"]
client.post("/api/contacts/%d/interactions" % quiet["id"],
            json={"date": (date.today() - timedelta(days=40)).isoformat(), "notes": "Ages ago."})
recent_c = client.post("/api/contacts", json={"name": "Fresh Prospect", "status": "Contacted"}).get_json()["contact"]
client.post("/api/contacts/%d/interactions" % recent_c["id"],
            json={"date": (date.today() - timedelta(days=2)).isoformat(), "notes": "Spoke Tuesday."})
settled = client.post("/api/contacts", json={"name": "Signed Sponsor", "status": "Committed"}).get_json()["contact"]
client.post("/api/contacts/%d/interactions" % settled["id"],
            json={"date": (date.today() - timedelta(days=60)).isoformat(), "notes": "Signed."})
declined_c = client.post("/api/contacts", json={"name": "Old Refusal", "status": "Declined"}).get_json()["contact"]
client.post("/api/contacts/%d/interactions" % declined_c["id"],
            json={"date": (date.today() - timedelta(days=90)).isoformat(), "notes": "Passed."})

followup = client.get("/api/contacts?view=followup").get_json()
names = [c["name"] for c in followup["contacts"]]
check("a contact quiet for 40 days needs follow-up", "Quiet Prospect" in names)
check("a contact touched 2 days ago does not", "Fresh Prospect" not in names)
check("a committed contact is never chased", "Signed Sponsor" not in names)
check("a declined contact is never chased", "Old Refusal" not in names)

quiet_row = [c for c in followup["contacts"] if c["name"] == "Quiet Prospect"][0]
check("days since last contact is reported", quiet_row["days_since"] == 40)
check("the follow-up count matches the rows",
      followup["summary"]["followup_count"] == len(followup["contacts"]))
check("the follow-up threshold is reported", followup["summary"]["followup_days"] == 10)

gaps = [c["days_since"] for c in followup["contacts"]]
check("the most overdue contact sorts first", gaps == sorted(gaps, reverse=True))

# A contact added today has nothing logged against it but is not yet overdue.
brand_new = client.post("/api/contacts", json={"name": "Added Today"}).get_json()["contact"]
fresh_names = [c["name"] for c in client.get("/api/contacts?view=followup").get_json()["contacts"]]
check("a contact added today is not immediately overdue", "Added Today" not in fresh_names)

check("logging an interaction clears the follow-up",
      client.post("/api/contacts/%d/interactions" % quiet["id"],
                  json={"date": date.today().isoformat(), "notes": "Chased today."}).status_code == 201
      and "Quiet Prospect" not in
      [c["name"] for c in client.get("/api/contacts?view=followup").get_json()["contacts"]])

check("search still applies inside the follow-up view",
      client.get("/api/contacts?view=followup&q=nothingmatchesthis").get_json()["contacts"] == [])
check("an unknown view falls back to all contacts",
      len(client.get("/api/contacts?view=bogus").get_json()["contacts"]) > 1)

for temp in (quiet, recent_c, settled, declined_c, brand_new):
    client.delete("/api/contacts/%d" % temp["id"])

# --- export -----------------------------------------------------------------
export = client.get("/api/export.csv")
body = export.get_data().decode("utf-8-sig")
check("csv exports as an attachment",
      export.status_code == 200 and "attachment" in export.headers["Content-Disposition"])
check("csv has a header row", body.splitlines()[0].startswith("contact_id,name,company"))
check("csv names the currency in its money headers",
      "deal_value_cad,commission_cad" in body.splitlines()[0])
import csv as _csv
_money_cells = [(r["deal_value_cad"], r["commission_cad"])
                for r in _csv.DictReader(io.StringIO(body)) if r["deal_value_cad"]]
check("csv money columns stay plain numbers for spreadsheets",
      bool(_money_cells) and all(float(v) >= 0 and float(k) >= 0 for v, k in _money_cells))
check("csv includes contacts with no interactions", "Aldous Finch" in body)
check("csv includes interaction notes", "Sent the deck." in body)

# --- cascade + sign out -----------------------------------------------------
check("contact is deleted", client.delete("/api/contacts/%d" % contact_id).status_code == 200)
with app_module.db.connect() as conn:
    orphans = conn.execute("SELECT COUNT(*) FROM interactions WHERE contact_id = ?", (contact_id,)).fetchone()[0]
check("interactions are cascade-deleted", orphans == 0)

check("sign out works", client.post("/api/logout").status_code == 200)
check("api is locked again after signing out", client.get("/api/contacts").status_code == 401)

# --- migration of an existing ledger -----------------------------------------
legacy_path = os.path.join(_tmp, "legacy.db")
legacy = sqlite3.connect(legacy_path)
legacy.executescript("""
    CREATE TABLE contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
        company TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'Prospect',
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT, contact_id INTEGER NOT NULL REFERENCES contacts(id),
        occurred_on TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
    INSERT INTO contacts (name, status, created_at, updated_at)
        VALUES ('Pre-existing Contact', 'Committed', '2026-01-05T10:00:00+00:00', '2026-01-05T10:00:00+00:00');
""")
legacy.commit()
legacy.close()

os.environ["CRM_DB_PATH"] = legacy_path
app_module.db.init_db()
with app_module.db.connect() as conn:
    cols = {row["name"] for row in conn.execute("PRAGMA table_info(contacts)")}
    check("an existing ledger gains the deal_value column", "deal_value" in cols)
    rows = app_module.db.list_contacts(conn)
    check("existing contacts survive the migration",
          len(rows) == 1 and rows[0]["name"] == "Pre-existing Contact")
    check("an un-priced legacy contact reads as no deal value", rows[0]["deal_value"] is None)
    check("totals cope with null deal values",
          app_module.db.summary(conn)["committed_value"] == 0)

failed = [name for name, ok in checks if not ok]
print("\n%d checks, %d failed" % (len(checks), len(failed)))
raise SystemExit(1 if failed else 0)

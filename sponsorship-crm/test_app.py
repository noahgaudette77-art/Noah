"""End-to-end checks for the ledger API. Run with: python3 test_app.py"""

import os
import tempfile

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

# --- export -----------------------------------------------------------------
export = client.get("/api/export.csv")
body = export.get_data().decode("utf-8-sig")
check("csv exports as an attachment",
      export.status_code == 200 and "attachment" in export.headers["Content-Disposition"])
check("csv has a header row", body.splitlines()[0].startswith("contact_id,name,company"))
check("csv includes contacts with no interactions", "Aldous Finch" in body)
check("csv includes interaction notes", "Sent the deck." in body)

# --- cascade + sign out -----------------------------------------------------
check("contact is deleted", client.delete("/api/contacts/%d" % contact_id).status_code == 200)
with app_module.db.connect() as conn:
    orphans = conn.execute("SELECT COUNT(*) FROM interactions WHERE contact_id = ?", (contact_id,)).fetchone()[0]
check("interactions are cascade-deleted", orphans == 0)

check("sign out works", client.post("/api/logout").status_code == 200)
check("api is locked again after signing out", client.get("/api/contacts").status_code == 401)

failed = [name for name, ok in checks if not ok]
print("\n%d checks, %d failed" % (len(checks), len(failed)))
raise SystemExit(1 if failed else 0)

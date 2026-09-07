"""SQLite access layer for the sponsorship ledger.

Two tables only: contacts and interactions. Every helper takes/returns plain
dicts so the Flask layer can hand them straight to jsonify.
"""

import os
import sqlite3
from datetime import datetime, timezone

STATUSES = ["Prospect", "Contacted", "In Talks", "Committed", "Declined"]

# Commission is a flat share of a committed deal's value.
COMMISSION_RATE = 0.5
# Amounts are recorded and shown in Canadian dollars. This is a label, not a
# conversion — nothing here converts between currencies.
CURRENCY = "CAD"
# A contact needs following up once it has been quiet for longer than this.
FOLLOWUP_DAYS = 10
# Statuses that are settled, so they never need chasing.
SETTLED_STATUSES = ("Committed", "Declined")

SCHEMA = """
CREATE TABLE IF NOT EXISTS contacts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    company     TEXT NOT NULL DEFAULT '',
    email       TEXT NOT NULL DEFAULT '',
    phone       TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'Prospect',
    deal_value  REAL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS interactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id  INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    occurred_on TEXT NOT NULL,
    notes       TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_interactions_contact
    ON interactions(contact_id, occurred_on DESC, id DESC);
"""


def db_path():
    return os.environ.get("CRM_DB_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "crm.db"))


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect():
    path = db_path()
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    conn = sqlite3.connect(path, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA busy_timeout = 15000")
    return conn


def init_db():
    with connect() as conn:
        conn.executescript(SCHEMA)
        # Ledgers created before deal values existed pick the column up here.
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(contacts)")}
        if "deal_value" not in columns:
            conn.execute("ALTER TABLE contacts ADD COLUMN deal_value REAL")


# --- contacts ---------------------------------------------------------------

# A contact that has never been logged against falls back to the day it was
# added, so a contact created this morning is not immediately "overdue".
LAST_TOUCH = """
    COALESCE((SELECT MAX(i.occurred_on) FROM interactions i WHERE i.contact_id = c.id),
             date(c.created_at))
"""

DAYS_SINCE = "CAST(julianday(date('now')) - julianday(%s) AS INTEGER)" % LAST_TOUCH

NEEDS_FOLLOWUP = "c.status NOT IN ('%s') AND %s > ?" % ("', '".join(SETTLED_STATUSES), DAYS_SINCE)

CONTACT_ROLLUP = """
    SELECT c.*,
           (SELECT MAX(i.occurred_on) FROM interactions i WHERE i.contact_id = c.id) AS last_interaction,
           (SELECT COUNT(*)           FROM interactions i WHERE i.contact_id = c.id) AS interaction_count,
           %s AS days_since
      FROM contacts c
""" % DAYS_SINCE


def list_contacts(conn, query="", status="", sort="recent", view="all"):
    sql = CONTACT_ROLLUP
    where, params = [], []
    if view == "followup":
        where.append("(" + NEEDS_FOLLOWUP + ")")
        params.append(FOLLOWUP_DAYS)
    if query:
        where.append("(c.name LIKE ? OR c.company LIKE ?)")
        like = f"%{query}%"
        params += [like, like]
    if status:
        where.append("c.status = ?")
        params.append(status)
    if where:
        sql += " WHERE " + " AND ".join(where)
    if view == "followup":
        # The view is defined by its order: most overdue at the top.
        return [dict(r) for r in conn.execute(
            sql + " ORDER BY days_since DESC, c.name COLLATE NOCASE ASC", params)]
    if sort == "name":
        sql += " ORDER BY c.name COLLATE NOCASE ASC"
    elif sort == "oldest":
        # least recently touched first: never-contacted rows lead.
        sql += " ORDER BY last_interaction IS NOT NULL, last_interaction ASC, c.name COLLATE NOCASE ASC"
    else:
        sql += " ORDER BY last_interaction IS NULL, last_interaction DESC, c.name COLLATE NOCASE ASC"
    return [dict(r) for r in conn.execute(sql, params)]


def get_contact(conn, contact_id):
    row = conn.execute(CONTACT_ROLLUP + " WHERE c.id = ?", (contact_id,)).fetchone()
    return dict(row) if row else None


def create_contact(conn, fields):
    ts = now()
    cur = conn.execute(
        "INSERT INTO contacts (name, company, email, phone, status, deal_value, created_at, updated_at)"
        " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (fields["name"], fields["company"], fields["email"], fields["phone"], fields["status"],
         fields["deal_value"], ts, ts),
    )
    return get_contact(conn, cur.lastrowid)


def update_contact(conn, contact_id, fields):
    cur = conn.execute(
        "UPDATE contacts SET name = ?, company = ?, email = ?, phone = ?, status = ?,"
        " deal_value = ?, updated_at = ? WHERE id = ?",
        (fields["name"], fields["company"], fields["email"], fields["phone"], fields["status"],
         fields["deal_value"], now(), contact_id),
    )
    if cur.rowcount == 0:
        return None
    return get_contact(conn, contact_id)


def commission_on(value):
    return round((value or 0) * COMMISSION_RATE, 2)


def summary(conn):
    """Running totals for the list page.

    Two pairs of numbers: what is banked (committed deals only) and what is
    on the table (every contact carrying a deal value, whatever its status).
    """
    row = conn.execute(
        """
        SELECT (SELECT COUNT(*) FROM contacts) AS total,
               (SELECT COUNT(*) FROM contacts WHERE status = 'Committed') AS committed_count,
               (SELECT COALESCE(SUM(deal_value), 0) FROM contacts WHERE status = 'Committed')
                   AS committed_value,
               (SELECT COUNT(*) FROM contacts WHERE deal_value IS NOT NULL) AS priced_count,
               (SELECT COALESCE(SUM(deal_value), 0) FROM contacts WHERE deal_value IS NOT NULL)
                   AS pipeline_value
        """
    ).fetchone()
    followup_count = conn.execute(
        "SELECT COUNT(*) FROM contacts c WHERE " + NEEDS_FOLLOWUP, (FOLLOWUP_DAYS,)
    ).fetchone()[0]
    return {
        "total": row["total"],
        "committed_count": row["committed_count"],
        "committed_value": round(row["committed_value"], 2),
        "commission": commission_on(row["committed_value"]),
        "priced_count": row["priced_count"],
        "pipeline_value": round(row["pipeline_value"], 2),
        "potential_commission": commission_on(row["pipeline_value"]),
        "commission_rate": COMMISSION_RATE,
        "currency": CURRENCY,
        "followup_count": followup_count,
        "followup_days": FOLLOWUP_DAYS,
    }


def delete_contact(conn, contact_id):
    return conn.execute("DELETE FROM contacts WHERE id = ?", (contact_id,)).rowcount > 0


# --- interactions -----------------------------------------------------------

def list_interactions(conn, contact_id):
    rows = conn.execute(
        "SELECT * FROM interactions WHERE contact_id = ? ORDER BY occurred_on DESC, id DESC",
        (contact_id,),
    )
    return [dict(r) for r in rows]


def add_interaction(conn, contact_id, occurred_on, notes):
    cur = conn.execute(
        "INSERT INTO interactions (contact_id, occurred_on, notes, created_at) VALUES (?, ?, ?, ?)",
        (contact_id, occurred_on, notes, now()),
    )
    conn.execute("UPDATE contacts SET updated_at = ? WHERE id = ?", (now(), contact_id))
    row = conn.execute("SELECT * FROM interactions WHERE id = ?", (cur.lastrowid,)).fetchone()
    return dict(row)


def update_interaction(conn, interaction_id, occurred_on, notes):
    cur = conn.execute(
        "UPDATE interactions SET occurred_on = ?, notes = ? WHERE id = ?",
        (occurred_on, notes, interaction_id),
    )
    if cur.rowcount == 0:
        return None
    row = conn.execute("SELECT * FROM interactions WHERE id = ?", (interaction_id,)).fetchone()
    return dict(row)


def delete_interaction(conn, interaction_id):
    return conn.execute("DELETE FROM interactions WHERE id = ?", (interaction_id,)).rowcount > 0


def export_rows(conn):
    """Flat contact x interaction rows for the CSV export.

    Contacts with no interactions still get one row, so nothing is lost.
    """
    rows = [
        dict(r)
        for r in conn.execute(
            """
            SELECT c.id AS contact_id, c.name, c.company, c.email, c.phone, c.status,
                   c.deal_value, c.created_at AS contact_created_at,
                   i.occurred_on AS interaction_date, i.notes AS interaction_notes,
                   i.created_at AS interaction_logged_at
              FROM contacts c
              LEFT JOIN interactions i ON i.contact_id = c.id
             ORDER BY c.name COLLATE NOCASE ASC, i.occurred_on DESC, i.id DESC
            """
        )
    ]
    for row in rows:
        row["commission"] = None if row["deal_value"] is None else commission_on(row["deal_value"])
    return rows

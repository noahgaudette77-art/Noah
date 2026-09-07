"""Sponsorship Ledger - a single-user CRM for sponsorship outreach.

Flask + SQLite, no ORM, no build step. The whole UI is served from static/.
"""

import csv
import hmac
import io
import os
import re
import secrets
import time
from datetime import date, datetime

from flask import (
    Flask, Response, jsonify, redirect, render_template_string, request,
    send_from_directory, session, url_for,
)

import db

HERE = os.path.dirname(os.path.abspath(__file__))
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

MAX_TEXT = 200          # name / company / email / phone
MAX_NOTES = 20000       # a single interaction entry
MAX_DEAL_VALUE = 1e12   # a sanity ceiling, not a business rule

LOGIN_WINDOW = 15 * 60  # seconds
LOGIN_MAX_ATTEMPTS = 10
_login_attempts = {}    # ip -> [failures, first_failure_ts]


# --- helpers ----------------------------------------------------------------

def _truthy(value, default):
    if value is None:
        return default
    return value.strip().lower() not in ("0", "false", "no", "off", "")


def _secret_key():
    key = os.environ.get("CRM_SECRET_KEY")
    if key:
        return key
    # Fall back to a key persisted next to the database so sessions survive
    # a restart even when the host has no env var configured.
    path = os.path.join(os.path.dirname(db.db_path()) or HERE, "secret_key")
    os.makedirs(os.path.dirname(path) or HERE, exist_ok=True)
    if os.path.exists(path):
        with open(path) as fh:
            stored = fh.read().strip()
        if stored:
            return stored
    generated = secrets.token_hex(32)
    with open(path, "w") as fh:
        fh.write(generated)
    os.chmod(path, 0o600)
    return generated


def _clean(value, limit=MAX_TEXT):
    if value is None:
        return ""
    return str(value).strip()[:limit]


def _valid_date(value):
    if not DATE_RE.match(value or ""):
        return False
    try:
        datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        return False
    return True


def _deal_value(raw):
    """Parse the optional deal value. Returns (value_or_None, error)."""
    if raw is None:
        return None, None
    if isinstance(raw, str):
        # Tolerate what a phone keyboard produces: "$4,500".
        cleaned = raw.strip().replace("$", "").replace(",", "").replace(" ", "")
        if not cleaned:
            return None, None
        raw = cleaned
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return None, "Deal value must be a number."
    if value != value or value in (float("inf"), float("-inf")):
        return None, "Deal value must be a number."
    if value < 0:
        return None, "Deal value cannot be negative."
    if value > MAX_DEAL_VALUE:
        return None, "That deal value is implausibly large."
    return round(value, 2), None


def _contact_fields(payload):
    """Validate an incoming contact body. Returns (fields, error)."""
    if not isinstance(payload, dict):
        return None, "Expected a JSON object."
    name = _clean(payload.get("name"))
    if not name:
        return None, "Name is required."
    status = _clean(payload.get("status")) or "Prospect"
    if status not in db.STATUSES:
        return None, f"Status must be one of: {', '.join(db.STATUSES)}."
    deal_value, error = _deal_value(payload.get("deal_value"))
    if error:
        return None, error
    return {
        "name": name,
        "company": _clean(payload.get("company")),
        "email": _clean(payload.get("email")),
        "phone": _clean(payload.get("phone")),
        "status": status,
        "deal_value": deal_value,
    }, None


def _interaction_fields(payload):
    if not isinstance(payload, dict):
        return None, "Expected a JSON object."
    occurred_on = _clean(payload.get("date"), 10) or date.today().isoformat()
    if not _valid_date(occurred_on):
        return None, "Date must be a real date in YYYY-MM-DD form."
    notes = str(payload.get("notes") or "").strip()[:MAX_NOTES]
    if not notes:
        return None, "Add a note describing what happened."
    return {"date": occurred_on, "notes": notes}, None


def _rate_limited(ip):
    entry = _login_attempts.get(ip)
    if not entry:
        return False
    failures, first = entry
    if time.time() - first > LOGIN_WINDOW:
        _login_attempts.pop(ip, None)
        return False
    return failures >= LOGIN_MAX_ATTEMPTS


def _record_failure(ip):
    failures, first = _login_attempts.get(ip, [0, time.time()])
    if time.time() - first > LOGIN_WINDOW:
        failures, first = 0, time.time()
    _login_attempts[ip] = [failures + 1, first]


LOGIN_PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Sponsorship Ledger</title>
<link rel="icon" href="{{ url_for('static', filename='icons/icon.svg') }}">
<link rel="stylesheet" href="{{ url_for('static', filename='app.css') }}">
</head>
<body class="login-body">
  <main class="login-card">
    <p class="wordmark-mark" aria-hidden="true">SL</p>
    <h1 class="login-title">Sponsorship Ledger</h1>
    <p class="login-sub">Private outreach record</p>
    <form method="post" class="login-form">
      <label class="field">
        <span class="micro-label">Passphrase</span>
        <input class="input" type="password" name="password" autocomplete="current-password"
               autofocus required aria-describedby="login-error">
      </label>
      {% if error %}<p class="login-error" id="login-error" role="alert">{{ error }}</p>{% endif %}
      <button type="submit" class="btn btn-primary btn-block">Enter</button>
    </form>
  </main>
</body>
</html>
"""


def create_app():
    app = Flask(__name__, static_folder="static", static_url_path="/static")

    dev = _truthy(os.environ.get("CRM_DEV"), False)
    password = os.environ.get("CRM_PASSWORD")
    if not password:
        if not dev:
            raise RuntimeError(
                "CRM_PASSWORD is not set. Set it to the passphrase you want to "
                "unlock the app with before starting the server."
            )
        password = "sponsor"
        app.logger.warning("CRM_PASSWORD unset - using the dev passphrase 'sponsor'.")

    app.config.update(
        SECRET_KEY=_secret_key(),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=_truthy(os.environ.get("CRM_COOKIE_SECURE"), not dev),
        PERMANENT_SESSION_LIFETIME=60 * 60 * 24 * 90,  # stay signed in on the phone
        MAX_CONTENT_LENGTH=1024 * 1024,
        JSON_SORT_KEYS=False,
    )
    app.config["CRM_PASSWORD"] = password

    db.init_db()

    # --- auth ---------------------------------------------------------------

    @app.before_request
    def require_login():
        if request.endpoint in ("login", "static", "manifest", "service_worker"):
            return None
        if session.get("authed"):
            return None
        if request.path.startswith("/api/"):
            return jsonify(error="Signed out."), 401
        return redirect(url_for("login", next=request.path))

    @app.route("/login", methods=["GET", "POST"])
    def login():
        error = None
        if request.method == "POST":
            ip = request.headers.get("X-Forwarded-For", request.remote_addr or "?").split(",")[0].strip()
            if _rate_limited(ip):
                error = "Too many attempts. Try again in a few minutes."
            elif hmac.compare_digest(request.form.get("password", ""), app.config["CRM_PASSWORD"]):
                session.clear()
                session["authed"] = True
                session.permanent = True
                target = request.args.get("next", "/")
                return redirect(target if target.startswith("/") and not target.startswith("//") else "/")
            else:
                _record_failure(ip)
                error = "That passphrase was not recognised."
        elif session.get("authed"):
            return redirect("/")
        return render_template_string(LOGIN_PAGE, error=error), (401 if error else 200)

    @app.post("/api/logout")
    def logout():
        session.clear()
        return jsonify(ok=True)

    # --- shell --------------------------------------------------------------

    @app.get("/")
    def index():
        response = send_from_directory(app.static_folder, "index.html")
        response.headers["Cache-Control"] = "no-cache"
        return response

    @app.get("/manifest.webmanifest")
    def manifest():
        return send_from_directory(app.static_folder, "manifest.webmanifest",
                                   mimetype="application/manifest+json")

    @app.get("/sw.js")
    def service_worker():
        response = send_from_directory(app.static_folder, "sw.js", mimetype="text/javascript")
        response.headers["Cache-Control"] = "no-cache"
        return response

    @app.get("/api/meta")
    def meta():
        return jsonify(statuses=db.STATUSES, today=date.today().isoformat(),
                       commission_rate=db.COMMISSION_RATE, followup_days=db.FOLLOWUP_DAYS,
                       currency=db.CURRENCY)

    # --- contacts -----------------------------------------------------------

    @app.get("/api/contacts")
    def api_list_contacts():
        query = _clean(request.args.get("q"))
        status = _clean(request.args.get("status"))
        if status and status not in db.STATUSES:
            status = ""
        sort = request.args.get("sort", "recent")
        if sort not in ("recent", "name", "oldest"):
            sort = "recent"
        view = request.args.get("view", "all")
        if view not in ("all", "followup"):
            view = "all"
        with db.connect() as conn:
            return jsonify(contacts=db.list_contacts(conn, query, status, sort, view),
                           summary=db.summary(conn))

    @app.post("/api/contacts")
    def api_create_contact():
        fields, error = _contact_fields(request.get_json(silent=True))
        if error:
            return jsonify(error=error), 400
        with db.connect() as conn:
            return jsonify(contact=db.create_contact(conn, fields)), 201

    @app.get("/api/contacts/<int:contact_id>")
    def api_get_contact(contact_id):
        with db.connect() as conn:
            contact = db.get_contact(conn, contact_id)
            if not contact:
                return jsonify(error="Contact not found."), 404
            return jsonify(contact=contact, interactions=db.list_interactions(conn, contact_id))

    @app.put("/api/contacts/<int:contact_id>")
    def api_update_contact(contact_id):
        fields, error = _contact_fields(request.get_json(silent=True))
        if error:
            return jsonify(error=error), 400
        with db.connect() as conn:
            contact = db.update_contact(conn, contact_id, fields)
            if not contact:
                return jsonify(error="Contact not found."), 404
            return jsonify(contact=contact)

    @app.delete("/api/contacts/<int:contact_id>")
    def api_delete_contact(contact_id):
        with db.connect() as conn:
            if not db.delete_contact(conn, contact_id):
                return jsonify(error="Contact not found."), 404
        return jsonify(ok=True)

    # --- interactions -------------------------------------------------------

    @app.post("/api/contacts/<int:contact_id>/interactions")
    def api_add_interaction(contact_id):
        fields, error = _interaction_fields(request.get_json(silent=True))
        if error:
            return jsonify(error=error), 400
        with db.connect() as conn:
            if not db.get_contact(conn, contact_id):
                return jsonify(error="Contact not found."), 404
            entry = db.add_interaction(conn, contact_id, fields["date"], fields["notes"])
            return jsonify(interaction=entry, contact=db.get_contact(conn, contact_id)), 201

    @app.put("/api/interactions/<int:interaction_id>")
    def api_update_interaction(interaction_id):
        fields, error = _interaction_fields(request.get_json(silent=True))
        if error:
            return jsonify(error=error), 400
        with db.connect() as conn:
            entry = db.update_interaction(conn, interaction_id, fields["date"], fields["notes"])
            if not entry:
                return jsonify(error="Entry not found."), 404
            return jsonify(interaction=entry, contact=db.get_contact(conn, entry["contact_id"]))

    @app.delete("/api/interactions/<int:interaction_id>")
    def api_delete_interaction(interaction_id):
        with db.connect() as conn:
            if not db.delete_interaction(conn, interaction_id):
                return jsonify(error="Entry not found."), 404
        return jsonify(ok=True)

    # --- export -------------------------------------------------------------

    @app.get("/api/export.csv")
    def api_export():
        with db.connect() as conn:
            rows = db.export_rows(conn)
        buffer = io.StringIO()
        columns = ["contact_id", "name", "company", "email", "phone", "status",
                   "deal_value_cad", "commission_cad", "contact_created_at",
                   "interaction_date", "interaction_notes", "interaction_logged_at"]
        writer = csv.DictWriter(buffer, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        renamed = {"deal_value_cad": "deal_value", "commission_cad": "commission"}
        for row in rows:
            writer.writerow({
                key: ("" if row.get(renamed.get(key, key)) is None else row[renamed.get(key, key)])
                for key in columns
            })
        filename = f"sponsorship-ledger-{date.today().isoformat()}.csv"
        return Response(
            buffer.getvalue().encode("utf-8-sig"),
            mimetype="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    return app


if __name__ == "__main__":
    os.environ.setdefault("CRM_DEV", "1")
    application = create_app()
    application.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)

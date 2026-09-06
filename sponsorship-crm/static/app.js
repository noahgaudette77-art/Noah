/* Sponsorship Ledger — plain-JS single page app. No framework, no build step. */
(function () {
  "use strict";

  var STATUSES = ["Prospect", "Contacted", "In Talks", "Committed", "Declined"];
  var SORTS = [
    { value: "recent", label: "Recent activity" },
    { value: "name", label: "Name (A–Z)" },
    { value: "oldest", label: "Longest untouched" }
  ];

  var view = document.getElementById("view");
  var overlayRoot = document.getElementById("overlay-root");
  var toastEl = document.getElementById("toast");

  var state = {
    mode: null,          // "list" | "detail"
    contacts: [],
    total: 0,
    q: load("q", ""),
    status: load("status", ""),
    sort: load("sort", "recent"),
    historyOrder: load("historyOrder", "newest"),
    detail: null,        // { contact, interactions }
    lastFocus: null
  };

  var searchTimer = null;

  /* ---------- small helpers ---------- */

  function load(key, fallback) {
    try { var v = localStorage.getItem("ledger." + key); return v === null ? fallback : v; }
    catch (e) { return fallback; }
  }

  function save(key, value) {
    try { localStorage.setItem("ledger." + key, value); } catch (e) { /* private mode */ }
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  function parseDate(iso) {
    var parts = String(iso || "").split("-");
    if (parts.length !== 3) return null;
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return isNaN(d.getTime()) ? null : d;
  }

  function formatDate(iso, opts) {
    var d = parseDate(iso);
    if (!d) return "—";
    return d.toLocaleDateString(undefined, opts || { day: "numeric", month: "short", year: "numeric" });
  }

  function formatRecency(iso) {
    var d = parseDate(iso);
    if (!d) return "—";
    var today = parseDate(todayISO());
    var days = Math.round((today - d) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days > 1 && days < 7) return days + " days ago";
    var sameYear = d.getFullYear() === today.getFullYear();
    return d.toLocaleDateString(undefined,
      sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove("is-visible"); }, 2600);
  }

  function api(path, options) {
    var opts = options || {};
    var config = { method: opts.method || "GET", headers: {}, credentials: "same-origin" };
    if (opts.body !== undefined) {
      config.headers["Content-Type"] = "application/json";
      config.body = JSON.stringify(opts.body);
    }
    return fetch(path, config).then(function (response) {
      if (response.status === 401) {
        window.location.href = "/login";
        throw new Error("Signed out.");
      }
      return response.json().catch(function () { return {}; }).then(function (data) {
        if (!response.ok) throw new Error(data.error || "Something went wrong.");
        return data;
      });
    });
  }

  function badge(status) {
    return '<span class="badge" data-status="' + esc(status) + '">' + esc(status) + "</span>";
  }

  var PLUS_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" ' +
    'stroke-width="1.5" stroke-linecap="square"><path d="M8 2.5v11M2.5 8h11"/></svg>';

  /* ---------- list view ---------- */

  function listShell() {
    return '' +
      '<div class="page-head">' +
        '<div>' +
          '<h1 class="page-title">Contacts</h1>' +
          '<p class="page-count" id="count-line"></p>' +
        '</div>' +
        '<button class="btn btn-primary" type="button" data-action="new-contact">Add contact</button>' +
      '</div>' +
      '<div class="toolbar">' +
        '<div class="search-wrap">' +
          '<label class="visually-hidden" for="search">Search by name or organisation</label>' +
          '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">' +
            '<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>' +
          '<input class="input" id="search" type="search" placeholder="Search name or organisation" ' +
            'autocomplete="off" value="' + esc(state.q) + '">' +
        '</div>' +
        '<div>' +
          '<label class="visually-hidden" for="status-filter">Filter by status</label>' +
          '<select class="select" id="status-filter">' +
            '<option value="">All statuses</option>' +
            STATUSES.map(function (s) {
              return '<option value="' + esc(s) + '"' + (state.status === s ? " selected" : "") + ">" + esc(s) + "</option>";
            }).join("") +
          "</select>" +
        "</div>" +
        '<div>' +
          '<label class="visually-hidden" for="sort-by">Sort contacts</label>' +
          '<select class="select" id="sort-by">' +
            SORTS.map(function (s) {
              return '<option value="' + s.value + '"' + (state.sort === s.value ? " selected" : "") + ">" + esc(s.label) + "</option>";
            }).join("") +
          "</select>" +
        "</div>" +
      "</div>" +
      '<div id="list-body"><p class="loading">Loading contacts…</p></div>';
  }

  function rowsMarkup(contacts) {
    return '' +
      '<table class="ledger">' +
        "<thead><tr>" +
          "<th>Name</th><th>Organisation</th><th>Status</th><th>Last contact</th>" +
          '<th><span class="visually-hidden">Log interaction</span></th>' +
        "</tr></thead><tbody>" +
        contacts.map(function (c) {
          var count = c.interaction_count === 1 ? "1 entry" : c.interaction_count + " entries";
          return '<tr data-id="' + c.id + '">' +
            '<td class="cell-name"><a href="#/c/' + c.id + '">' + esc(c.name) + "</a></td>" +
            '<td class="cell-company">' + esc(c.company) + "</td>" +
            '<td class="cell-status">' + badge(c.status) + "</td>" +
            '<td class="cell-last">' + esc(formatRecency(c.last_interaction)) +
              '<span class="entry-count">' + count + "</span></td>" +
            '<td class="cell-action">' +
              '<button class="log-btn" type="button" data-action="log" data-id="' + c.id + '" ' +
                'title="Log an interaction with ' + esc(c.name) + '" ' +
                'aria-label="Log an interaction with ' + esc(c.name) + '">' + PLUS_ICON + "</button>" +
            "</td>" +
          "</tr>";
        }).join("") +
      "</tbody></table>";
  }

  function emptyMarkup() {
    var filtered = state.q || state.status;
    if (filtered) {
      return '<div class="empty"><h2>No matches</h2>' +
        "<p>Nothing here matches that search or status filter.</p>" +
        '<button class="btn btn-secondary" type="button" data-action="clear-filters">Clear filters</button></div>';
    }
    return '<div class="empty"><h2>The ledger is empty</h2>' +
      "<p>Add your first sponsorship contact to start keeping a record of every conversation.</p>" +
      '<button class="btn btn-primary" type="button" data-action="new-contact">Add contact</button></div>';
  }

  function renderListBody() {
    var body = document.getElementById("list-body");
    if (!body) return;
    body.innerHTML = state.contacts.length ? rowsMarkup(state.contacts) : emptyMarkup();

    var count = document.getElementById("count-line");
    if (count) {
      var shown = state.contacts.length;
      var filtered = state.q || state.status;
      count.innerHTML = filtered
        ? "Showing <b>" + shown + "</b> of " + state.total + (state.total === 1 ? " contact" : " contacts")
        : "<b>" + state.total + "</b>" + (state.total === 1 ? " contact" : " contacts") + " on record";
    }
  }

  function fetchContacts() {
    var params = new URLSearchParams();
    if (state.q) params.set("q", state.q);
    if (state.status) params.set("status", state.status);
    params.set("sort", state.sort);
    return api("/api/contacts?" + params.toString()).then(function (data) {
      state.contacts = data.contacts;
      if (!state.q && !state.status) state.total = data.contacts.length;
      renderListBody();
    }).catch(function (err) {
      var body = document.getElementById("list-body");
      if (body) body.innerHTML = '<p class="loading">' + esc(err.message) + "</p>";
    });
  }

  function fetchTotal() {
    if (!state.q && !state.status) return Promise.resolve();
    return api("/api/contacts").then(function (data) {
      state.total = data.contacts.length;
      renderListBody();
    }).catch(function () { /* count is cosmetic */ });
  }

  function renderList() {
    if (state.mode !== "list") {
      state.mode = "list";
      state.detail = null;
      view.innerHTML = listShell();
      wireListControls();
    }
    fetchContacts().then(fetchTotal);
  }

  function wireListControls() {
    var search = document.getElementById("search");
    search.addEventListener("input", function () {
      state.q = search.value.trim();
      save("q", state.q);
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { fetchContacts().then(fetchTotal); }, 220);
    });

    document.getElementById("status-filter").addEventListener("change", function (event) {
      state.status = event.target.value;
      save("status", state.status);
      fetchContacts().then(fetchTotal);
    });

    document.getElementById("sort-by").addEventListener("change", function (event) {
      state.sort = event.target.value;
      save("sort", state.sort);
      fetchContacts();
    });
  }

  /* ---------- detail view ---------- */

  function particular(label, value, href) {
    var inner = value
      ? (href ? '<a href="' + esc(href) + esc(value) + '">' + esc(value) + "</a>" : esc(value))
      : '<span class="blank">Not recorded</span>';
    return '<div class="particular"><span class="micro-label">' + esc(label) + "</span>" +
      '<div class="value">' + inner + "</div></div>";
  }

  function entryMarkup(entry) {
    return '<li class="entry" data-entry="' + entry.id + '">' +
      '<div class="entry-head">' +
        '<span class="entry-date">' + esc(formatDate(entry.occurred_on)) + "</span>" +
        '<span class="entry-tools">' +
          '<button class="btn btn-quiet" type="button" data-action="edit-entry" data-id="' + entry.id + '">Edit</button>' +
          '<button class="btn btn-quiet" type="button" data-action="delete-entry" data-id="' + entry.id + '">Delete</button>' +
        "</span>" +
      "</div>" +
      '<p class="entry-notes">' + esc(entry.notes) + "</p>" +
    "</li>";
  }

  function renderDetail(data) {
    state.mode = "detail";
    state.detail = data;
    var c = data.contact;
    var entries = data.interactions.slice();
    if (state.historyOrder === "oldest") entries.reverse();

    var history = entries.length
      ? '<ul class="timeline">' + entries.map(entryMarkup).join("") + "</ul>"
      : '<div class="history-empty">No entries logged yet. The first note you add will appear here.</div>';

    view.innerHTML = '' +
      '<a class="back-link" href="#/">&larr; All contacts</a>' +
      '<div class="detail-head">' +
        "<div>" +
          '<h1 class="detail-name">' + esc(c.name) + "</h1>" +
          (c.company ? '<p class="detail-org">' + esc(c.company) + "</p>" : "") +
        "</div>" +
        badge(c.status) +
      "</div>" +
      '<div class="detail">' +
        '<aside class="panel">' +
          '<div class="particulars">' +
            particular("Email", c.email, "mailto:") +
            particular("Phone", c.phone, "tel:") +
            '<div class="particular">' +
              '<label class="micro-label" for="quick-status">Status</label>' +
              '<select class="select" id="quick-status" data-quick-status>' +
                STATUSES.map(function (s) {
                  return '<option value="' + esc(s) + '"' + (c.status === s ? " selected" : "") + ">" + esc(s) + "</option>";
                }).join("") +
              "</select></div>" +
            particular("Added", formatDate((c.created_at || "").slice(0, 10))) +
          "</div>" +
          '<div class="panel-actions">' +
            '<button class="btn btn-secondary" type="button" data-action="edit-contact">Edit details</button>' +
            '<button class="btn btn-danger" type="button" data-action="delete-contact">Delete</button>' +
          "</div>" +
        "</aside>" +
        "<section>" +
          '<div class="history-head">' +
            '<h2 class="micro-label">Interaction history</h2>' +
            '<div class="history-tools">' +
              (entries.length > 1
                ? '<button class="btn btn-quiet" type="button" data-action="flip-order">' +
                  (state.historyOrder === "newest" ? "Newest first" : "Oldest first") + "</button>"
                : "") +
              '<button class="btn btn-primary" type="button" data-action="log" data-id="' + c.id + '">Log interaction</button>' +
            "</div>" +
          "</div>" +
          history +
        "</section>" +
      "</div>" +
      '<div class="sticky-log">' +
        '<button class="btn btn-primary btn-block" type="button" data-action="log" data-id="' + c.id + '">Log interaction</button>' +
      "</div>";
  }

  function loadDetail(id) {
    if (state.mode !== "detail") view.innerHTML = '<p class="loading">Loading…</p>';
    api("/api/contacts/" + id).then(renderDetail).catch(function (err) {
      view.innerHTML = '<a class="back-link" href="#/">&larr; All contacts</a>' +
        '<div class="empty"><h2>Not found</h2><p>' + esc(err.message) + "</p></div>";
      state.mode = "error";
    });
  }

  function refreshDetail() {
    if (state.detail) loadDetail(state.detail.contact.id);
  }

  /* ---------- overlays ---------- */

  function closeOverlay() {
    overlayRoot.innerHTML = "";
    document.body.style.overflow = "";
    if (state.lastFocus && document.contains(state.lastFocus)) state.lastFocus.focus();
    state.lastFocus = null;
  }

  function openOverlay(markup, onReady) {
    state.lastFocus = document.activeElement;
    overlayRoot.innerHTML = '<div class="overlay" role="dialog" aria-modal="true">' +
      '<div class="sheet">' + markup + "</div></div>";
    document.body.style.overflow = "hidden";

    var overlay = overlayRoot.firstChild;
    var sheet = overlay.firstChild;

    overlay.addEventListener("mousedown", function (event) {
      if (event.target === overlay) closeOverlay();
    });

    overlay.addEventListener("keydown", function (event) {
      if (event.key === "Escape") { event.preventDefault(); closeOverlay(); return; }
      if (event.key !== "Tab") return;
      var focusable = sheet.querySelectorAll("input, select, textarea, button, a[href]");
      if (!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });

    if (onReady) onReady(sheet);
  }

  function showError(sheet, message) {
    var slot = sheet.querySelector(".form-error");
    if (slot) { slot.textContent = message; slot.hidden = false; }
  }

  function busy(sheet, isBusy) {
    sheet.querySelectorAll("button").forEach(function (b) { b.disabled = isBusy; });
  }

  function contactSheet(contact) {
    var editing = !!contact;
    var c = contact || { name: "", company: "", email: "", phone: "", status: "Prospect" };

    openOverlay(
      '<form class="sheet-form" novalidate>' +
        '<div class="sheet-head">' +
          '<span class="micro-label">' + (editing ? "Edit contact" : "New contact") + "</span>" +
          "<h2>" + (editing ? esc(c.name) : "Add a contact") + "</h2>" +
        "</div>" +
        '<p class="form-error" hidden></p>' +
        '<label class="field"><span class="micro-label">Name</span>' +
          '<input class="input" name="name" value="' + esc(c.name) + '" required autocomplete="name"></label>' +
        '<label class="field"><span class="micro-label">Company / organisation</span>' +
          '<input class="input" name="company" value="' + esc(c.company) + '" autocomplete="organization"></label>' +
        '<div class="field-row">' +
          '<label class="field"><span class="micro-label">Email</span>' +
            '<input class="input" name="email" type="email" value="' + esc(c.email) + '" autocomplete="email" inputmode="email"></label>' +
          '<label class="field"><span class="micro-label">Phone</span>' +
            '<input class="input" name="phone" type="tel" value="' + esc(c.phone) + '" autocomplete="tel" inputmode="tel"></label>' +
        "</div>" +
        '<label class="field"><span class="micro-label">Status</span>' +
          '<select class="select" name="status">' +
            STATUSES.map(function (s) {
              return '<option value="' + esc(s) + '"' + (c.status === s ? " selected" : "") + ">" + esc(s) + "</option>";
            }).join("") +
          "</select></label>" +
        '<div class="sheet-actions">' +
          '<button class="btn btn-secondary" type="button" data-close>Cancel</button>' +
          '<button class="btn btn-primary" type="submit">' + (editing ? "Save changes" : "Add contact") + "</button>" +
        "</div>" +
      "</form>",
      function (sheet) {
        var form = sheet.querySelector("form");
        form.querySelector('[name="name"]').focus();

        form.addEventListener("submit", function (event) {
          event.preventDefault();
          var payload = {
            name: form.name.value.trim(),
            company: form.company.value.trim(),
            email: form.email.value.trim(),
            phone: form.phone.value.trim(),
            status: form.status.value
          };
          if (!payload.name) { showError(sheet, "A name is required."); return; }

          busy(sheet, true);
          var request = editing
            ? api("/api/contacts/" + c.id, { method: "PUT", body: payload })
            : api("/api/contacts", { method: "POST", body: payload });

          request.then(function (data) {
            closeOverlay();
            toast(editing ? "Contact updated." : "Contact added.");
            if (editing && state.mode === "detail") refreshDetail();
            else if (!editing) window.location.hash = "#/c/" + data.contact.id;
            else renderList();
          }).catch(function (err) {
            busy(sheet, false);
            showError(sheet, err.message);
          });
        });
      }
    );
  }

  function interactionSheet(contactId, contactName, entry) {
    var editing = !!entry;
    var date = editing ? entry.occurred_on : todayISO();
    var notes = editing ? entry.notes : "";

    openOverlay(
      '<form novalidate>' +
        '<div class="sheet-head">' +
          '<span class="micro-label">' + (editing ? "Edit entry" : "Log interaction") + "</span>" +
          "<h2>" + esc(contactName) + "</h2>" +
        "</div>" +
        '<p class="form-error" hidden></p>' +
        '<label class="field"><span class="micro-label">Date</span>' +
          '<input class="input" name="date" type="date" value="' + esc(date) + '" required></label>' +
        '<label class="field"><span class="micro-label">What happened</span>' +
          '<textarea class="textarea" name="notes" placeholder="Called to introduce the programme. Asked for a one-pager by Friday." ' +
            'required>' + esc(notes) + "</textarea></label>" +
        '<div class="sheet-actions">' +
          '<button class="btn btn-secondary" type="button" data-close>Cancel</button>' +
          '<button class="btn btn-primary" type="submit">Save entry</button>' +
        "</div>" +
      "</form>",
      function (sheet) {
        var form = sheet.querySelector("form");
        var textarea = form.querySelector('[name="notes"]');
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);

        form.addEventListener("submit", function (event) {
          event.preventDefault();
          var payload = { date: form.date.value, notes: textarea.value.trim() };
          if (!payload.notes) { showError(sheet, "Add a short note about what happened."); return; }

          busy(sheet, true);
          var request = editing
            ? api("/api/interactions/" + entry.id, { method: "PUT", body: payload })
            : api("/api/contacts/" + contactId + "/interactions", { method: "POST", body: payload });

          request.then(function () {
            closeOverlay();
            toast(editing ? "Entry updated." : "Interaction logged.");
            if (state.mode === "detail") refreshDetail();
            else fetchContacts();
          }).catch(function (err) {
            busy(sheet, false);
            showError(sheet, err.message);
          });
        });
      }
    );
  }

  function confirmSheet(options) {
    openOverlay(
      '<div class="sheet-head">' +
        '<span class="micro-label">' + esc(options.label) + "</span>" +
        "<h2>" + esc(options.title) + "</h2>" +
        "<p>" + esc(options.message) + "</p>" +
      "</div>" +
      '<div class="sheet-actions">' +
        '<button class="btn btn-secondary" type="button" data-close>Cancel</button>' +
        '<button class="btn btn-danger" type="button" data-confirm>' + esc(options.confirmLabel) + "</button>" +
      "</div>",
      function (sheet) {
        var confirmBtn = sheet.querySelector("[data-confirm]");
        sheet.querySelector("[data-close]").focus();
        confirmBtn.addEventListener("click", function () {
          busy(sheet, true);
          options.onConfirm().then(closeOverlay).catch(function (err) {
            busy(sheet, false);
            toast(err.message);
          });
        });
      }
    );
  }

  /* ---------- events ---------- */

  document.addEventListener("click", function (event) {
    var closer = event.target.closest("[data-close]");
    if (closer) { closeOverlay(); return; }

    var trigger = event.target.closest("[data-action]");
    if (trigger) {
      var action = trigger.dataset.action;
      var id = trigger.dataset.id;

      if (action === "new-contact") { contactSheet(null); return; }
      if (action === "edit-contact") { contactSheet(state.detail.contact); return; }
      if (action === "clear-filters") {
        state.q = ""; state.status = "";
        save("q", ""); save("status", "");
        var search = document.getElementById("search");
        var filter = document.getElementById("status-filter");
        if (search) search.value = "";
        if (filter) filter.value = "";
        fetchContacts().then(fetchTotal);
        return;
      }
      if (action === "log") {
        var name = state.detail
          ? state.detail.contact.name
          : (state.contacts.filter(function (c) { return String(c.id) === String(id); })[0] || {}).name;
        interactionSheet(id, name || "Contact", null);
        return;
      }
      if (action === "edit-entry" || action === "delete-entry") {
        var entry = state.detail.interactions.filter(function (e) { return String(e.id) === String(id); })[0];
        if (!entry) return;
        if (action === "edit-entry") {
          interactionSheet(entry.contact_id, state.detail.contact.name, entry);
        } else {
          confirmSheet({
            label: "Delete entry",
            title: formatDate(entry.occurred_on),
            message: "This log entry will be removed from the history. This cannot be undone.",
            confirmLabel: "Delete entry",
            onConfirm: function () {
              return api("/api/interactions/" + entry.id, { method: "DELETE" }).then(function () {
                toast("Entry deleted.");
                refreshDetail();
              });
            }
          });
        }
        return;
      }
      if (action === "delete-contact") {
        var contact = state.detail.contact;
        confirmSheet({
          label: "Delete contact",
          title: contact.name,
          message: "This removes the contact and all " + contact.interaction_count +
            " logged interaction" + (contact.interaction_count === 1 ? "" : "s") + ". This cannot be undone.",
          confirmLabel: "Delete contact",
          onConfirm: function () {
            return api("/api/contacts/" + contact.id, { method: "DELETE" }).then(function () {
              toast("Contact deleted.");
              state.mode = null;
              window.location.hash = "#/";
            });
          }
        });
        return;
      }
      if (action === "flip-order") {
        state.historyOrder = state.historyOrder === "newest" ? "oldest" : "newest";
        save("historyOrder", state.historyOrder);
        renderDetail(state.detail);
        return;
      }
      if (action === "sign-out") {
        api("/api/logout", { method: "POST" }).then(function () { window.location.href = "/login"; });
        return;
      }
    }

    // Whole ledger rows are tappable; the name link handles keyboard users.
    var row = event.target.closest(".ledger tbody tr");
    if (row && !event.target.closest("button, a")) {
      window.location.hash = "#/c/" + row.dataset.id;
    }
  });

  document.addEventListener("change", function (event) {
    var select = event.target.closest("[data-quick-status]");
    if (!select || !state.detail) return;
    var c = state.detail.contact;
    var previous = c.status;
    select.disabled = true;
    api("/api/contacts/" + c.id, {
      method: "PUT",
      body: { name: c.name, company: c.company, email: c.email, phone: c.phone, status: select.value }
    }).then(function () {
      toast("Status set to " + select.value + ".");
      refreshDetail();
    }).catch(function (err) {
      select.value = previous;
      select.disabled = false;
      toast(err.message);
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "/" || overlayRoot.firstChild) return;
    var tag = (document.activeElement.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    var search = document.getElementById("search");
    if (search) { event.preventDefault(); search.focus(); search.select(); }
  });

  /* ---------- routing ---------- */

  function route() {
    if (overlayRoot.firstChild) closeOverlay();
    var hash = window.location.hash || "#/";
    var match = hash.match(/^#\/c\/(\d+)/);
    if (match) loadDetail(match[1]);
    else renderList();
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", route);
  route();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () { /* offline shell is optional */ });
    });
  }
})();

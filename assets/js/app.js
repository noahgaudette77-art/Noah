/**
 * Hollis & Vane — storefront behaviour.
 *
 * Every page loads this one file. Each module below no-ops unless the markup
 * it needs is present, so there is nothing to wire up per page.
 */
(function () {
  "use strict";

  var CATALOGUE = window.CATALOGUE || [];
  var STORAGE_KEY = "hv.cart.v1";
  var SHIPPING_THRESHOLD = 300;
  var SHIPPING_FLAT = 18;

  /* --- helpers ---------------------------------------------------------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /* Single-file mode: the whole site lives in one document and navigates by
     hash (#/shop?category=outerwear). The multi-page build sets no data-spa
     attribute and keeps using real URLs, so both share this one file. */
  var SPA = document.documentElement.getAttribute("data-spa") === "true";

  function params() {
    if (!SPA) return new URLSearchParams(location.search);
    var h = location.hash.slice(1);
    var i = h.indexOf("?");
    return new URLSearchParams(i > -1 ? h.slice(i + 1) : "");
  }

  function routeName() {
    if (!SPA) return (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "");
    var h = location.hash.slice(1) || "/";
    return h.split("?")[0].replace(/^\//, "") || "index";
  }

  /** Build an href for a page, in whichever mode the document is running. */
  function href(page, qs) {
    if (SPA) return "#/" + (page === "index" ? "" : page) + (qs ? "?" + qs : "");
    return page + ".html" + (qs ? "?" + qs : "");
  }

  function money(n) {
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0 });
  }

  function byId(id) {
    for (var i = 0; i < CATALOGUE.length; i++) {
      if (CATALOGUE[i].id === id) return CATALOGUE[i];
    }
    return null;
  }

  /* The single-file build injects HV_IMAGES, mapping "<id>-<n>" to a data URI;
     the multi-page build has no such map and falls through to the real path. */
  function img(product, n) {
    var key = product.id + "-" + n;
    return (window.HV_IMAGES && window.HV_IMAGES[key]) || "assets/img/" + key + ".svg";
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* --- cart store ------------------------------------------------------- */
  var Cart = {
    items: [],

    load: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        var parsed = raw ? JSON.parse(raw) : [];
        // Drop anything that no longer exists in the archive.
        this.items = Array.isArray(parsed)
          ? parsed.filter(function (l) { return byId(l.id); })
          : [];
      } catch (e) {
        this.items = [];
      }
      return this.items;
    },

    save: function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
      } catch (e) {
        /* private mode — cart simply won't persist */
      }
      document.dispatchEvent(new CustomEvent("cart:change"));
    },

    key: function (id, size) { return id + "::" + (size || ""); },

    add: function (id, size, qty) {
      var product = byId(id);
      if (!product) return;
      var k = this.key(id, size);
      var line = null;
      for (var i = 0; i < this.items.length; i++) {
        if (this.key(this.items[i].id, this.items[i].size) === k) line = this.items[i];
      }
      var cap = product.stock || 1;
      if (line) {
        line.qty = Math.min(cap, line.qty + (qty || 1));
      } else {
        this.items.push({ id: id, size: size || "", qty: Math.min(cap, qty || 1) });
      }
      this.save();
    },

    setQty: function (id, size, qty) {
      var k = this.key(id, size);
      this.items = this.items.filter(function (l) {
        if (Cart.key(l.id, l.size) !== k) return true;
        var cap = (byId(l.id) || {}).stock || 1;
        l.qty = Math.max(0, Math.min(cap, qty));
        return l.qty > 0;
      });
      this.save();
    },

    remove: function (id, size) {
      var k = this.key(id, size);
      this.items = this.items.filter(function (l) { return Cart.key(l.id, l.size) !== k; });
      this.save();
    },

    count: function () {
      return this.items.reduce(function (n, l) { return n + l.qty; }, 0);
    },

    subtotal: function () {
      return this.items.reduce(function (n, l) {
        var p = byId(l.id);
        return n + (p ? p.price * l.qty : 0);
      }, 0);
    },

    shipping: function () {
      var s = this.subtotal();
      return s === 0 || s >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
    },
  };

  /* --- toast ------------------------------------------------------------ */
  var toastTimer;
  function toast(message) {
    var el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.setAttribute("data-open", "true");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.setAttribute("data-open", "false"); }, 2600);
  }

  /* --- cart drawer ------------------------------------------------------ */
  function initDrawer() {
    var drawer = $("#cart-drawer");
    var scrim = $("#scrim");
    if (!drawer || !scrim) return;

    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      drawer.setAttribute("data-open", "true");
      scrim.setAttribute("data-open", "true");
      drawer.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      var close = $(".drawer__close", drawer);
      if (close) close.focus();
    }

    function close() {
      drawer.setAttribute("data-open", "false");
      scrim.setAttribute("data-open", "false");
      drawer.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    $$("[data-cart-open]").forEach(function (b) {
      b.addEventListener("click", function (e) { e.preventDefault(); open(); });
    });
    $$("[data-cart-close]").forEach(function (b) { b.addEventListener("click", close); });
    scrim.addEventListener("click", close);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.getAttribute("data-open") === "true") close();
    });

    // Keep focus inside the drawer while it's open.
    drawer.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var f = $$(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        drawer
      ).filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0];
      var last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    document.addEventListener("cart:add", open);
  }

  function renderCart() {
    var body = $("#cart-body");
    var foot = $("#cart-foot");

    $$("[data-cart-count]").forEach(function (el) {
      var n = Cart.count();
      el.textContent = n;
      el.setAttribute("data-filled", n > 0 ? "true" : "false");
      el.setAttribute("aria-label", n + (n === 1 ? " item" : " items") + " in bag");
    });

    if (!body || !foot) return;

    if (!Cart.items.length) {
      body.innerHTML =
        '<div class="empty">' +
        '<p class="display d4">Your bag is empty.</p>' +
        "<p>Sixteen pieces are in the archive right now. Each one exists once.</p>" +
        '<a class="btn btn--ghost" href="' + href("shop") + '">Browse the archive</a>' +
        "</div>";
      foot.innerHTML = "";
      return;
    }

    body.innerHTML = Cart.items
      .map(function (line) {
        var p = byId(line.id);
        var sizeLabel = line.size ? "Size " + escapeHtml(line.size) : "One size";
        return (
          '<article class="line">' +
          '<a class="line__media" href="' + href("product", "id=" + p.id) + '">' +
          '<img src="' + img(p, 1) + '" alt="' + escapeHtml(p.name) + '" loading="lazy">' +
          "</a><div>" +
          '<p class="line__house">' + escapeHtml(p.house) + "</p>" +
          '<h3 class="line__name"><a href="' + href("product", "id=" + p.id) + '">' +
          escapeHtml(p.name) + "</a></h3>" +
          '<p class="line__opt">' + sizeLabel + " · " + escapeHtml(p.era) + "</p>" +
          '<div class="line__row">' +
          '<div class="qty">' +
          '<button type="button" data-qty="-1" data-id="' + p.id + '" data-size="' +
          escapeHtml(line.size) + '" aria-label="Decrease quantity">−</button>' +
          "<output>" + line.qty + "</output>" +
          '<button type="button" data-qty="1" data-id="' + p.id + '" data-size="' +
          escapeHtml(line.size) + '" aria-label="Increase quantity">+</button>' +
          "</div><span>" + money(p.price * line.qty) + "</span></div>" +
          '<div class="line__row">' +
          '<button type="button" class="line__remove" data-remove="' + p.id +
          '" data-size="' + escapeHtml(line.size) + '">Remove</button>' +
          "</div></div></article>"
        );
      })
      .join("");

    var sub = Cart.subtotal();
    var ship = Cart.shipping();
    var toFree = SHIPPING_THRESHOLD - sub;

    foot.innerHTML =
      '<div class="totals"><span>Subtotal</span><span>' + money(sub) + "</span></div>" +
      '<div class="totals"><span>Shipping</span><span>' +
      (ship === 0 ? "Complimentary" : money(ship)) + "</span></div>" +
      '<div class="totals totals--grand"><span>Total</span><span>' +
      money(sub + ship) + "</span></div>" +
      (toFree > 0
        ? '<p class="drawer__note">' + money(toFree) + " more for complimentary shipping.</p>"
        : "") +
      '<button class="btn btn--block" type="button" data-checkout>Proceed to checkout</button>' +
      '<p class="drawer__note">Every piece is inspected and pressed before it ships.</p>';

    $$("[data-qty]", body).forEach(function (b) {
      b.addEventListener("click", function () {
        var line = Cart.items.filter(function (l) {
          return l.id === b.dataset.id && (l.size || "") === b.dataset.size;
        })[0];
        if (!line) return;
        var next = line.qty + Number(b.dataset.qty);
        var cap = (byId(line.id) || {}).stock || 1;
        if (next > cap) { toast("Only one of these exists."); return; }
        Cart.setQty(b.dataset.id, b.dataset.size, next);
      });
    });

    $$("[data-remove]", body).forEach(function (b) {
      b.addEventListener("click", function () {
        Cart.remove(b.dataset.remove, b.dataset.size);
        toast("Removed from bag");
      });
    });

    var checkout = $("[data-checkout]", foot);
    if (checkout) {
      checkout.addEventListener("click", function () {
        toast("Checkout is not connected in this demo");
      });
    }
  }

  /* --- product cards ---------------------------------------------------- */
  function cardHtml(p, delay) {
    var flags = "";
    if (p.tags.indexOf("rare") > -1) flags += '<span class="flag flag--rare">Rare</span>';
    if (p.tags.indexOf("new") > -1) flags += '<span class="flag">Just in</span>';
    if (p.was) flags += '<span class="flag flag--sale">Reduced</span>';

    return (
      '<article class="card" data-reveal' + (delay ? ' data-delay="' + delay + '"' : "") + ">" +
      '<div class="card__media">' +
      (flags ? '<div class="card__flags">' + flags + "</div>" : "") +
      '<img src="' + img(p, 1) + '" alt="' + escapeHtml(p.name) + '" loading="lazy" width="800" height="1000">' +
      '<img src="' + img(p, 2) + '" alt="" aria-hidden="true" loading="lazy" width="800" height="1000">' +
      '<button class="card__quick" type="button" data-quick="' + p.id + '">Add to bag</button>' +
      "</div>" +
      '<p class="card__house">' + escapeHtml(p.house) + "</p>" +
      '<h3 class="card__name"><a href="' + href("product", "id=" + p.id) + '">' + escapeHtml(p.name) + "</a></h3>" +
      '<p class="card__meta"><span>' + money(p.price) + "</span>" +
      (p.was ? '<s class="card__was">' + money(p.was) + "</s>" : "") +
      '<span class="card__era">' + escapeHtml(p.era) + "</span></p>" +
      "</article>"
    );
  }

  function bindQuickAdd(root) {
    $$("[data-quick]", root).forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        var p = byId(b.dataset.quick);
        if (!p) return;
        Cart.add(p.id, p.sizes.length === 1 ? p.sizes[0] : p.sizes[0], 1);
        toast(p.name + " added to bag");
        document.dispatchEvent(new CustomEvent("cart:add"));
      });
    });
  }

  /* --- featured grid (home) --------------------------------------------- */
  function initFeatured() {
    var grid = $("#featured-grid");
    if (!grid) return;
    var ids = (grid.dataset.ids || "").split(",").filter(Boolean);
    var list = ids.length
      ? ids.map(byId).filter(Boolean)
      : CATALOGUE.slice(0, 8);
    grid.innerHTML = list.map(function (p, i) { return cardHtml(p, i % 4); }).join("");
    bindQuickAdd(grid);
  }

  /* --- shop ------------------------------------------------------------- */
  var shop = null; // set once initShop has run, so the router can re-sync it

  function initShop() {
    var grid = $("#shop-grid");
    if (!grid) return;
    if (shop) { shop.syncFromUrl(); return; } // already wired — just re-read the URL

    var state = { category: "all", era: "all", size: "all", sort: "featured" };

    function syncFromUrl() {
      var q = params();
      ["category", "era", "size", "sort"].forEach(function (k) {
        state[k] = q.get(k) || (k === "sort" ? "featured" : "all");
      });
      var sel = $("#shop-sort");
      if (sel) sel.value = state.sort;
      render();
    }

    var q = params();
    ["category", "era", "size", "sort"].forEach(function (k) {
      if (q.get(k)) state[k] = q.get(k);
    });

    function matches(p) {
      return (
        (state.category === "all" || p.category === state.category) &&
        (state.era === "all" || p.era === state.era) &&
        (state.size === "all" || p.sizes.indexOf(state.size) > -1)
      );
    }

    function sorted(list) {
      var out = list.slice();
      if (state.sort === "low") out.sort(function (a, b) { return a.price - b.price; });
      else if (state.sort === "high") out.sort(function (a, b) { return b.price - a.price; });
      else if (state.sort === "era") {
        out.sort(function (a, b) { return parseInt(a.era, 10) - parseInt(b.era, 10); });
      } else if (state.sort === "name") {
        out.sort(function (a, b) { return a.name.localeCompare(b.name); });
      }
      return out;
    }

    function buildFilter(container, key, values, labels) {
      container.innerHTML =
        "<li>" +
        ['<button type="button" data-key="' + key + '" data-value="all">All' +
          '<small>' + CATALOGUE.filter(function (p) {
            var saved = state[key]; state[key] = "all";
            var ok = matches(p); state[key] = saved; return ok;
          }).length + "</small></button>"]
          .concat(
            values.map(function (v) {
              var saved = state[key];
              state[key] = v;
              var n = CATALOGUE.filter(matches).length;
              state[key] = saved;
              return (
                '<button type="button" data-key="' + key + '" data-value="' + escapeHtml(v) + '">' +
                escapeHtml(labels ? labels(v) : v) + "<small>" + n + "</small></button>"
              );
            })
          )
          .join("</li><li>") +
        "</li>";

      $$("button", container).forEach(function (b) {
        var active = state[b.dataset.key] === b.dataset.value;
        b.setAttribute("aria-pressed", active ? "true" : "false");
        b.addEventListener("click", function () {
          state[b.dataset.key] = b.dataset.value;
          render();
        });
      });
    }

    var categories = [];
    var eras = [];
    var sizes = [];
    CATALOGUE.forEach(function (p) {
      if (categories.indexOf(p.category) === -1) categories.push(p.category);
      if (eras.indexOf(p.era) === -1) eras.push(p.era);
      p.sizes.forEach(function (s) { if (sizes.indexOf(s) === -1) sizes.push(s); });
    });
    categories.sort();
    eras.sort();

    function render() {
      var list = sorted(CATALOGUE.filter(matches));

      grid.innerHTML = list.length
        ? list.map(function (p, i) { return cardHtml(p, i % 4); }).join("")
        : '<div class="no-results"><p class="display d3">Nothing matches.</p>' +
          '<p class="lede" style="margin-top:1rem">Try loosening a filter — the archive is small by design.</p></div>';
      bindQuickAdd(grid);
      observeReveals(grid);

      var count = $("#shop-count");
      if (count) {
        count.textContent =
          list.length + (list.length === 1 ? " piece" : " pieces") + " in the archive";
      }

      var cf = $("#filter-category");
      var ef = $("#filter-era");
      var sf = $("#filter-size");
      if (cf) buildFilter(cf, "category", categories, function (v) {
        return v.charAt(0).toUpperCase() + v.slice(1);
      });
      if (ef) buildFilter(ef, "era", eras);
      if (sf) buildFilter(sf, "size", sizes);

      var clear = $("#filter-clear");
      if (clear) {
        var dirty = state.category !== "all" || state.era !== "all" || state.size !== "all";
        clear.hidden = !dirty;
      }

      var out = new URLSearchParams();
      ["category", "era", "size"].forEach(function (k) {
        if (state[k] !== "all") out.set(k, state[k]);
      });
      if (state.sort !== "featured") out.set("sort", state.sort);
      var qs = out.toString();
      history.replaceState(null, "", SPA ? href("shop", qs) : qs ? "?" + qs : location.pathname);
    }

    var sortSel = $("#shop-sort");
    if (sortSel) {
      sortSel.value = state.sort;
      sortSel.addEventListener("change", function () {
        state.sort = sortSel.value;
        render();
      });
    }

    var clearBtn = $("#filter-clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        state.category = state.era = state.size = "all";
        render();
      });
    }

    var toggle = $("#filters-toggle");
    var panel = $("#filters");
    if (toggle && panel) {
      toggle.addEventListener("click", function () {
        var open = panel.getAttribute("data-open") === "true";
        panel.setAttribute("data-open", open ? "false" : "true");
        toggle.setAttribute("aria-expanded", open ? "false" : "true");
        toggle.textContent = open ? "Filters +" : "Filters −";
      });
    }

    render();
    shop = { syncFromUrl: syncFromUrl };
  }

  /* --- product detail --------------------------------------------------- */
  function initProduct() {
    var root = $("#pdp");
    if (!root) return;

    var id = params().get("id");
    var p = byId(id) || CATALOGUE[0];
    if (!p) return;

    document.title = p.name + " — Hollis & Vane";
    var desc = $('meta[name="description"]');
    if (desc) desc.setAttribute("content", p.blurb);

    var rows = Object.keys(p.measurements)
      .map(function (k) {
        return "<tr><th>" + escapeHtml(k) + "</th><td>" + escapeHtml(p.measurements[k]) + "</td></tr>";
      })
      .join("");

    root.innerHTML =
      '<div class="gallery">' +
      '<div class="gallery__main"><img id="gallery-main" src="' + img(p, 1) +
      '" alt="' + escapeHtml(p.name) + '" width="800" height="1000"></div>' +
      '<div class="gallery__thumbs">' +
      [1, 2, 3]
        .map(function (n) {
          return (
            '<button class="thumb" type="button" data-src="' + img(p, n) +
            '" aria-pressed="' + (n === 1 ? "true" : "false") +
            '" aria-label="View image ' + n + '">' +
            '<img src="' + img(p, n) + '" alt="" loading="lazy"></button>'
          );
        })
        .join("") +
      "</div></div>" +
      '<div class="pdp__info">' +
      '<p class="pdp__house">' + escapeHtml(p.house) + " · " + escapeHtml(p.era) + "</p>" +
      '<h1 class="display d2">' + escapeHtml(p.name) + "</h1>" +
      '<p class="pdp__price"><span>' + money(p.price) + "</span>" +
      (p.was ? "<s>" + money(p.was) + "</s>" : "") + "</p>" +
      '<p class="pdp__blurb">' + escapeHtml(p.blurb) + "</p>" +
      '<p class="pdp__unit">One of one · ' + escapeHtml(p.condition.split("—")[0].trim()) + "</p>" +
      '<div class="field-label"><span>Size</span><button type="button" data-size-guide>Size guide</button></div>' +
      '<div class="sizes" role="group" aria-label="Select a size">' +
      p.sizes
        .map(function (s, i) {
          return (
            '<button class="size" type="button" data-size="' + escapeHtml(s) +
            '" aria-pressed="' + (i === 0 ? "true" : "false") + '">' + escapeHtml(s) + "</button>"
          );
        })
        .join("") +
      "</div>" +
      '<button class="btn btn--block" type="button" id="pdp-add" style="margin-top:2rem">Add to bag — ' +
      money(p.price) + "</button>" +
      '<p class="drawer__note" style="text-align:left;margin-top:1rem">Complimentary shipping over ' +
      money(SHIPPING_THRESHOLD) + " · 14-day returns · " + escapeHtml(p.origin) + "</p>" +
      '<div class="acc">' +
      accItem("The piece", "<p>" + escapeHtml(p.story) + "</p>", true) +
      accItem(
        "Fabric & condition",
        "<p><strong>Material.</strong> " + escapeHtml(p.material) +
          "<br><strong>Condition.</strong> " + escapeHtml(p.condition) +
          "<br><strong>Colour.</strong> " + escapeHtml(p.colour) +
          "<br><strong>Origin.</strong> " + escapeHtml(p.origin) + "</p>"
      ) +
      accItem("Measurements", "<table><tbody>" + rows + "</tbody></table>") +
      accItem(
        "Shipping & returns",
        "<p>Dispatched within two working days, wrapped in acid-free tissue. " +
          "Complimentary shipping on orders over " + money(SHIPPING_THRESHOLD) +
          "; a flat " + money(SHIPPING_FLAT) + " otherwise. Fourteen days to return anything " +
          "that does not fit the life you had in mind for it.</p>"
      ) +
      "</div></div>";

    var mainImg = $("#gallery-main", root);
    $$(".thumb", root).forEach(function (t) {
      t.addEventListener("click", function () {
        mainImg.src = t.dataset.src;
        $$(".thumb", root).forEach(function (o) { o.setAttribute("aria-pressed", "false"); });
        t.setAttribute("aria-pressed", "true");
      });
    });

    var chosen = p.sizes[0];
    $$(".size", root).forEach(function (b) {
      b.addEventListener("click", function () {
        chosen = b.dataset.size;
        $$(".size", root).forEach(function (o) { o.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
      });
    });

    $("#pdp-add", root).addEventListener("click", function () {
      Cart.add(p.id, chosen, 1);
      toast(p.name + " added to bag");
      document.dispatchEvent(new CustomEvent("cart:add"));
    });

    var guide = $("[data-size-guide]", root);
    if (guide) {
      guide.addEventListener("click", function () {
        var panelBtn = $$(".acc__btn", root)[2];
        if (panelBtn) {
          if (panelBtn.getAttribute("aria-expanded") !== "true") panelBtn.click();
          panelBtn.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }

    initAccordions(root);

    // Related: same category first, then anything else, never itself.
    var related = CATALOGUE.filter(function (o) {
      return o.id !== p.id && o.category === p.category;
    });
    CATALOGUE.forEach(function (o) {
      if (o.id !== p.id && related.indexOf(o) === -1) related.push(o);
    });
    var relGrid = $("#related-grid");
    if (relGrid) {
      relGrid.innerHTML = related.slice(0, 4).map(function (o, i) { return cardHtml(o, i % 4); }).join("");
      bindQuickAdd(relGrid);
      observeReveals(relGrid);
    }

    var crumb = $("#pdp-crumb");
    if (crumb) crumb.textContent = p.name;
  }

  function accItem(title, body, open) {
    return (
      '<div class="acc__item">' +
      '<button class="acc__btn" type="button" aria-expanded="' + (open ? "true" : "false") + '">' +
      "<span>" + title + "</span><span>+</span></button>" +
      '<div class="acc__panel" data-open="' + (open ? "true" : "false") + '"><div>' + body + "</div></div>" +
      "</div>"
    );
  }

  function initAccordions(root) {
    $$(".acc__btn", root || document).forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", open ? "false" : "true");
        var panel = btn.nextElementSibling;
        if (panel) panel.setAttribute("data-open", open ? "false" : "true");
      });
    });
  }

  /* --- header / nav ----------------------------------------------------- */
  function initNav() {
    var burger = $("#burger");
    var nav = $("#primary-nav");
    if (burger && nav) {
      burger.addEventListener("click", function () {
        var open = burger.getAttribute("aria-expanded") === "true";
        burger.setAttribute("aria-expanded", open ? "false" : "true");
        nav.setAttribute("data-open", open ? "false" : "true");
        document.body.style.overflow = open ? "" : "hidden";
      });
      $$("a", nav).forEach(function (a) {
        a.addEventListener("click", function () {
          burger.setAttribute("aria-expanded", "false");
          nav.setAttribute("data-open", "false");
          document.body.style.overflow = "";
        });
      });
    }

    markCurrentNav();
  }

  function markCurrentNav() {
    var here = routeName();
    $$(".nav__link").forEach(function (a) {
      var target = (a.getAttribute("href") || "").split("?")[0];
      target = SPA
        ? target.replace(/^#\//, "") || "index"
        : target.replace(/\.html$/, "");
      a.removeAttribute("aria-current");
      if (target === here) a.setAttribute("aria-current", "page");
    });
  }

  /* --- reveal on scroll ------------------------------------------------- */
  var revealObserver;
  function observeReveals(root) {
    var nodes = $$("[data-reveal]", root || document).filter(function (n) {
      return !n.classList.contains("is-in");
    });
    if (!("IntersectionObserver" in window)) {
      nodes.forEach(function (n) { n.classList.add("is-in"); });
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );
    }
    nodes.forEach(function (n) { revealObserver.observe(n); });
  }

  /* --- forms ------------------------------------------------------------ */
  function initForms() {
    $$("[data-demo-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var msg = $("[data-form-msg]", form);
        var email = $('input[type="email"]', form);
        if (email && !email.checkValidity()) {
          if (msg) msg.textContent = "Please enter a valid email address.";
          email.focus();
          return;
        }
        form.reset();
        var done = form.dataset.demoForm || "Thank you — we'll be in touch.";
        if (msg) msg.textContent = done;
        toast(done);
      });
    });
  }

  /* --- marquee ---------------------------------------------------------- */
  function initMarquee() {
    $$(".marquee__track").forEach(function (track) {
      // Duplicate the content so the -50% translate loops seamlessly.
      track.innerHTML += track.innerHTML;
    });
  }

  /* --- router (single-file build only) ---------------------------------- */
  function initRouter() {
    if (!SPA) return;

    var routes = $$("[data-route]");
    if (!routes.length) return;

    function show(firstRun) {
      var name = routeName();
      var matched = routes.filter(function (r) { return r.dataset.route === name; })[0];

      if (!matched) {                       // unknown hash → home, without a loop
        location.replace("#/");
        matched = routes.filter(function (r) { return r.dataset.route === "index"; })[0];
        name = "index";
        if (!matched) return;
      }

      routes.forEach(function (r) { r.hidden = r !== matched; });
      document.title = matched.dataset.title || "Hollis & Vane";
      markCurrentNav();

      // Only the active route's modules may run: every route's markup is in the
      // document at once, so an unguarded initShop() would re-render (and
      // rewrite the URL to #/shop) no matter which route is showing.
      if (name === "shop") initShop();
      if (name === "product") initProduct();
      observeReveals(matched);

      // Deep links into a section: #/journal?to=denim
      var to = params().get("to");
      var target = to && document.getElementById(to);
      if (target) {
        target.scrollIntoView({ behavior: firstRun ? "auto" : "smooth", block: "start" });
      } else if (!firstRun) {
        window.scrollTo(0, 0);
      }
    }

    window.addEventListener("hashchange", function () { show(false); });
    show(true);
  }

  /* --- boot ------------------------------------------------------------- */
  function boot() {
    Cart.load();
    initNav();
    initMarquee();
    initDrawer();
    initFeatured();
    if (SPA) {
      initRouter();       // shows one route, then inits shop/product for it
    } else {
      initShop();
      initProduct();
    }
    initAccordions(document);
    initForms();
    renderCart();
    observeReveals(document);

    document.addEventListener("cart:change", renderCart);

    // A second tab is the same bag.
    window.addEventListener("storage", function (e) {
      if (e.key === STORAGE_KEY) { Cart.load(); renderCart(); }
    });

    var year = $("#year");
    if (year) year.textContent = new Date().getFullYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.HV = { cart: Cart, catalogue: CATALOGUE };
})();

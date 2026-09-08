/* ==========================================================================
   CoolHub™ by Vortex — concept mockup
   Vanilla, no dependencies. Every animated behaviour checks the reduced-motion
   preference and degrades to an instant state change rather than switching off.
   ========================================================================== */
(function () {
  "use strict";

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* --- Internal notice ---------------------------------------------------- */
  (function notice() {
    var el = $("#notice"), btn = $("#notice-x");
    if (!el || !btn) return;
    try {
      if (localStorage.getItem("coolhub.notice") === "gone") { hide(true); }
    } catch (e) { /* private mode: just show it */ }

    function hide(instant) {
      el.classList.add("is-gone");
      document.documentElement.style.setProperty("--nh", "0px");
      if (instant) el.style.transition = "none";
      try { localStorage.setItem("coolhub.notice", "gone"); } catch (e) {}
    }
    btn.addEventListener("click", function () { hide(false); });
  })();

  /* --- Nav: stuck state, progress, active section, mobile menu ------------- */
  (function nav() {
    var nav = $("#nav"), prog = $("#prog"), burger = $("#burger"), links = $("#nav-links");
    if (!nav) return;

    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") === "true";
      burger.setAttribute("aria-expanded", String(!open));
      burger.setAttribute("aria-label", open ? "Open menu" : "Close menu");
      links.classList.toggle("is-open", !open);
      nav.classList.toggle("is-open-menu", !open);
    });
    links.addEventListener("click", function (e) {
      if (e.target.closest("a") && burger.getAttribute("aria-expanded") === "true") {
        burger.click();
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") burger.click();
    });

    var ticking = false;
    function frame() {
      var y = window.scrollY || 0;
      nav.classList.toggle("is-stuck", y > 40);
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (prog) prog.style.width = (max > 0 ? Math.min(1, y / max) * 100 : 0) + "%";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }, { passive: true });
    frame();

    // active link
    var map = {};
    // the CTA also points at a section, but it is a button, not a section link:
    // marking it "here" would repaint its label in ink on an ink ground.
    $$(".nav__links a[href^='#']:not(.btn)").forEach(function (a) {
      var id = a.getAttribute("href").slice(1);
      if (document.getElementById(id)) map[id] = a;
    });
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!map[en.target.id]) return;
        if (en.isIntersecting) {
          $$(".nav__links a").forEach(function (a) { a.classList.remove("is-here"); });
          map[en.target.id].classList.add("is-here");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(function (id) { seen.observe(document.getElementById(id)); });
  })();

  /* --- Scroll reveals, staggered among siblings ---------------------------- */
  (function reveals() {
    var items = $$("[data-reveal]");
    if (!items.length) return;
    if (reduced.matches || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var groups = new Map();
    items.forEach(function (el) {
      var sibs = groups.get(el.parentNode) || [];
      sibs.push(el); groups.set(el.parentNode, sibs);
    });
    groups.forEach(function (sibs) {
      sibs.forEach(function (el, i) {
        if (sibs.length > 1) el.style.setProperty("--d", (i * 90) + "ms");
      });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.06 });
    items.forEach(function (el) { io.observe(el); });
  })();

  /* --- Scroll-linked parallax --------------------------------------------- */
  (function parallax() {
    if (reduced.matches) return;
    var layers = [];
    var hero = $(".hero__media");
    if (hero) layers.push({ el: hero, rate: 0.16 });
    $$(".break__img").forEach(function (el) { layers.push({ el: el, rate: 0.13 }); });
    if (!layers.length) return;

    var ticking = false;
    function frame() {
      var vh = window.innerHeight;
      layers.forEach(function (l) {
        var r = l.el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var mid = r.top + r.height / 2 - vh / 2;
        l.el.style.transform = "translate3d(0," + (-mid * l.rate).toFixed(2) + "px,0)";
      });
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }, { passive: true });
    window.addEventListener("resize", frame);
    frame();
  })();

  /* --- Generic tablist: roving tabindex + arrow keys ----------------------- */
  function tablist(tabs, onPick) {
    if (!tabs.length) return;
    function pick(btn, focus) {
      tabs.forEach(function (t) {
        var on = t === btn;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
      });
      if (focus) btn.focus();
      onPick(btn);
    }
    tabs.forEach(function (t) {
      t.addEventListener("click", function () { pick(t, false); });
      t.addEventListener("keydown", function (e) {
        var i = tabs.indexOf(t), n = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") n = tabs[(i + 1) % tabs.length];
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === "Home") n = tabs[0];
        else if (e.key === "End") n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); pick(n, true); }
      });
    });
    return pick;
  }

  function swapPanels(panels, id) {
    panels.forEach(function (p) {
      var on = p.id === id;
      p.hidden = !on;
      p.classList.toggle("is-on", on);
      if (on && !reduced.matches) {
        p.classList.remove("is-fade");
        void p.offsetWidth;          // restart the animation
        p.classList.add("is-fade");
      }
    });
  }

  /* --- Health & Wellness product selector ---------------------------------- */
  (function products() {
    var tabs = $$(".prod__tabs [role='tab']");
    if (!tabs.length) return;
    var imgs = $$(".prod__img"), panels = $$(".prod__panel"), cap = $("#prod-cap");
    var caps = {
      abrio:   "Abrio — shade, seating and cooling in one footprint",
      glomist: "Glomist — a cloud that cools the space between the heads",
      aeris:   "Aeris — a fine mist released on a ninety-second cycle"
    };
    tablist(tabs, function (btn) {
      var k = btn.dataset.prod;
      imgs.forEach(function (im) { im.classList.toggle("is-on", im.dataset.prod === k); });
      swapPanels(panels, btn.getAttribute("aria-controls"));
      if (cap) cap.textContent = caps[k] || "";
    });
  })();

  /* --- Refreshing Play module swap ----------------------------------------- */
  (function modules() {
    var tabs = $$(".swap__btns [role='tab']");
    if (!tabs.length) return;
    var imgs = $$(".swap__img"), panels = $$(".swap__panel"), tag = $("#swap-var");
    var names = { panels: "MODULE — BLADES", spraypoint: "MODULE — SPRAYPOINT", basins: "MODULE — BASINS" };
    tablist(tabs, function (btn) {
      var k = btn.dataset.mod;
      imgs.forEach(function (im) { im.classList.toggle("is-on", im.dataset.mod === k); });
      swapPanels(panels, btn.getAttribute("aria-controls"));
      if (tag) tag.textContent = names[k] || "";
    });
  })();

  /* --- Persona switcher ---------------------------------------------------- */
  (function personas() {
    var tabs = $$(".who__tabs [role='tab']");
    if (!tabs.length) return;
    var panels = $$(".who__panel"), ink = $("#who-ink");

    function moveInk(btn) {
      if (!ink) return;
      var wrap = btn.parentNode.getBoundingClientRect(), r = btn.getBoundingClientRect();
      ink.style.width = r.width + "px";
      ink.style.transform = "translateX(" + (r.left - wrap.left) + "px)";
    }
    tablist(tabs, function (btn) {
      swapPanels(panels, btn.getAttribute("aria-controls"));
      moveInk(btn);
    });
    var cur = function () { return tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0] || tabs[0]; };
    window.addEventListener("resize", function () { moveInk(cur()); });
    window.addEventListener("load", function () { moveInk(cur()); });
    moveInk(cur());
  })();

  /* --- Before / after comparison ------------------------------------------- */
  (function beforeAfter() {
    var wrap = $("#ba"), range = $("#ba-range");
    if (!wrap || !range) return;
    function set() { wrap.style.setProperty("--x", range.value + "%"); }
    range.addEventListener("input", set);
    set();
  })();

  /* --- Spec drawings ------------------------------------------------------- */
  (function specs() {
    var tabs = $$(".spec__pick [role='tab']");
    if (!tabs.length) return;

    var S = 150 / 3.6;   // plan: px per metre, fixed so units compare honestly
    var V = 65;          // elevation: px per metre
    var CX = 190, CY = 190, GY = 320;

    var UNITS = {
      abrio:   { name: "Abrio — Canopy",       cat: "hw", foot: 0.42, spray: 4.60, clear: 6.00, h: 3.10, flow: "12 L/min", conn: "25 mm", cycle: "On demand", model: "VOR 3401", mastW: 14, capR: 74 },
      glomist: { name: "Glomist — Cloud",      cat: "hw", foot: 0.28, spray: 2.40, clear: 3.60, h: 2.60, flow: "4 L/min",  conn: "15 mm", cycle: "Push button, 120 s", model: "VOR 3210", mastW: 10, capR: 26 },
      aeris:   { name: "Aeris — Cloud Mist",   cat: "hw", foot: 0.32, spray: 3.20, clear: 4.60, h: 2.85, flow: "6 L/min",  conn: "20 mm", cycle: "Push button, 90 s", model: "VOR 3508", mastW: 12, capR: 46 },
      module:  { name: "Surface + Module",     cat: "rp", foot: 3.60, spray: 5.00, clear: 7.20, h: 2.70, flow: "45 L/min", conn: "40 mm", cycle: "Sequenced", model: "Working name", mastW: 34, capR: 20 }
    };

    var out = $("#spec-out");
    var el = {
      clear: $("#z-clear"), spray: $("#z-spray"), foot: $("#z-foot"),
      sprayLine: $("#d-spray-line"), sprayCap: $("#d-spray-cap"), sprayT: $("#d-spray-t"),
      clearLine: $("#d-clear-line"), clearT: $("#d-clear-t"),
      footSq: $("#z-foot-sq"), base: $("#u-base"),
      mast: $("#u-mast"), cap: $("#u-cap"), mist: $("#u-mist"),
      hLine: $("#d-h-line"), hCap: $("#d-h-cap"), hT: $("#d-h-t"),
      wLine: $("#d-w-line"), wCap1: $("#d-w-cap1"), wCap2: $("#d-w-cap2"), wT: $("#d-w-t"),
      name: $("#spec-name"),
      r: { height: $("#r-height"), spray: $("#r-spray"), clear: $("#r-clear"), foot: $("#r-foot"),
           flow: $("#r-flow"), conn: $("#r-conn"), cycle: $("#r-cycle"), model: $("#r-model") }
    };

    function m(v) { return v.toFixed(2) + " m"; }

    function render(k) {
      var u = UNITS[k];
      if (!u || !el.spray) return;
      out.setAttribute("data-cat", u.cat);

      var rClear = u.clear / 2 * S, rSpray = u.spray / 2 * S, rFoot = Math.max(3, u.foot / 2 * S);
      el.clear.setAttribute("r", rClear.toFixed(1));
      el.spray.setAttribute("r", rSpray.toFixed(1));

      // the modular surface is a square pad; the point products are round
      var square = u.foot >= 1.5;
      el.foot.style.display = square ? "none" : "";
      el.footSq.style.display = square ? "" : "none";
      el.foot.setAttribute("r", rFoot.toFixed(1));
      var side = u.foot * S;
      el.footSq.setAttribute("x", (CX - side / 2).toFixed(1));
      el.footSq.setAttribute("y", (CY - side / 2).toFixed(1));
      el.footSq.setAttribute("width", side.toFixed(1));
      el.footSq.setAttribute("height", side.toFixed(1));

      el.sprayLine.setAttribute("d", "M" + CX + " " + CY + "H" + (CX + rSpray).toFixed(1));
      el.sprayCap.setAttribute("d", "M" + (CX + rSpray).toFixed(1) + " " + (CY - 6) + "v12");
      el.sprayT.setAttribute("x", (CX + rSpray / 2).toFixed(1));
      el.sprayT.textContent = m(u.spray) + " Ø";

      var d = rClear / Math.SQRT2;
      el.clearLine.setAttribute("d", "M" + CX + " " + CY + "L" + (CX + d).toFixed(1) + " " + (CY + d).toFixed(1));
      el.clearT.setAttribute("x", (CX + d * 0.86).toFixed(1));
      el.clearT.setAttribute("y", (CY + d * 0.86 - 8).toFixed(1));
      el.clearT.textContent = m(u.clear);

      var top = GY - u.h * V;
      var baseW = Math.max(u.foot * S, u.mastW * 1.7);
      el.base.setAttribute("x", (CX - baseW / 2).toFixed(1));
      el.base.setAttribute("width", baseW.toFixed(1));
      el.mast.setAttribute("x", (CX - u.mastW / 2).toFixed(1));
      el.mast.setAttribute("width", u.mastW);
      el.mast.setAttribute("y", top.toFixed(1));
      el.mast.setAttribute("height", (GY - top).toFixed(1));
      el.cap.setAttribute("cy", top.toFixed(1));
      el.cap.setAttribute("rx", u.capR);
      el.mist.setAttribute("cx", CX);
      el.mist.setAttribute("cy", (top + (GY - top) * 0.52).toFixed(1));
      el.mist.setAttribute("rx", rSpray.toFixed(1));
      el.mist.setAttribute("ry", ((GY - top) * 0.26).toFixed(1));

      el.hLine.setAttribute("d", "M96 " + top.toFixed(1) + "V" + GY);
      el.hCap.setAttribute("d", "M90 " + top.toFixed(1) + "h12");
      el.hT.setAttribute("x", 88);
      el.hT.setAttribute("y", ((top + GY) / 2).toFixed(1));
      el.hT.textContent = m(u.h);

      var x1 = CX - rSpray, x2 = CX + rSpray;
      el.wLine.setAttribute("d", "M" + x1.toFixed(1) + " 344H" + x2.toFixed(1));
      el.wCap1.setAttribute("d", "M" + x1.toFixed(1) + " 338v12");
      el.wCap2.setAttribute("d", "M" + x2.toFixed(1) + " 338v12");
      el.wT.textContent = m(u.spray);

      el.name.textContent = u.name;
      el.r.height.textContent = m(u.h);
      el.r.spray.textContent  = m(u.spray) + " Ø";
      el.r.clear.textContent  = m(u.clear) + " Ø";
      el.r.foot.textContent   = m(u.foot) + (k === "module" ? " square" : " Ø");
      el.r.flow.textContent   = u.flow;
      el.r.conn.textContent   = u.conn;
      el.r.cycle.textContent  = u.cycle;
      el.r.model.textContent  = u.model;
    }

    tablist(tabs, function (btn) { render(btn.dataset.unit); });
    render("aeris");

    // hover / focus a dimension or a readout and the pair lights up together
    function light(k) {
      out.classList.toggle("is-hot", !!k);
      $$("[data-k]", out).forEach(function (n) {
        n.classList.toggle("is-lit", !!k && n.getAttribute("data-k") === k);
      });
    }
    $$("[data-k]", out).forEach(function (n) {
      var k = n.getAttribute("data-k");
      n.addEventListener("mouseenter", function () { light(k); });
      n.addEventListener("mouseleave", function () { light(null); });
      if (n.classList.contains("read")) {
        n.tabIndex = 0;
        n.addEventListener("focus", function () { light(k); });
        n.addEventListener("blur", function () { light(null); });
      }
    });
  })();

  /* --- Quote form ---------------------------------------------------------- */
  (function quote() {
    var form = $("#qform"), done = $("#qdone"), again = $("#qagain");
    if (!form) return;

    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function fieldOf(node) { return node.closest(".field"); }
    function err(key, msg) {
      var slot = $(".err[data-for='" + key + "']", form);
      if (!slot) return;
      slot.textContent = msg || "";
      slot.classList.toggle("is-on", !!msg);
    }
    function mark(input, msg) {
      var f = fieldOf(input);
      if (f) f.classList.toggle("is-bad", !!msg);
      err(input.id || input.name, msg);
    }

    function checkOne(input) {
      var v = (input.value || "").trim();
      if (input.hasAttribute("required") && !v) { mark(input, "Required"); return false; }
      if (input.type === "email" && v && !EMAIL.test(v)) { mark(input, "Enter a valid email address"); return false; }
      mark(input, "");
      return true;
    }

    var required = $$("input[required]", form);
    required.forEach(function (i) {
      i.addEventListener("blur", function () { checkOne(i); });
      i.addEventListener("input", function () {
        if (fieldOf(i) && fieldOf(i).classList.contains("is-bad")) checkOne(i);
      });
    });

    var cats = $$("input[name='cat']", form);
    function checkCats() {
      var any = cats.some(function (c) { return c.checked; });
      var f = cats.length ? cats[0].closest(".field") : null;
      if (f) f.classList.toggle("is-bad", !any);
      err("cat", any ? "" : "Choose at least one category");
      return any;
    }
    cats.forEach(function (c) { c.addEventListener("change", function () { if (err) checkCats(); }); });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      required.forEach(function (i) { if (!checkOne(i)) ok = false; });
      if (!checkCats()) ok = false;

      if (!ok) {
        var bad = $(".field.is-bad", form);
        if (bad) {
          var focusable = $("input, select, textarea", bad);
          if (focusable) focusable.focus();
          bad.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "center" });
        }
        return;
      }

      var picked = cats.filter(function (c) { return c.checked; })
                       .map(function (c) { return c.value; });
      $("#done-cat").textContent = picked.join(" and ");
      $("#done-email").textContent = $("#f-email").value.trim();
      $("#done-ref").textContent = "CH-" + String(Math.floor(100000 + Math.random() * 899999));

      form.hidden = true;
      done.hidden = false;
      done.setAttribute("tabindex", "-1");
      done.focus({ preventScroll: true });
      done.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "center" });
    });

    if (again) {
      again.addEventListener("click", function () {
        form.reset();
        $$(".field.is-bad", form).forEach(function (f) { f.classList.remove("is-bad"); });
        $$(".err", form).forEach(function (s) { s.textContent = ""; s.classList.remove("is-on"); });
        done.hidden = true;
        form.hidden = false;
        var first = $("#f-org");
        if (first) first.focus();
      });
    }
  })();
})();

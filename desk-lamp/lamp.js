/**
 * Desk Lamp — a study timer.
 *
 * The clock is a deadline, not a countdown: while a block runs we only ever
 * store the timestamp it ends at, so the display is correct after a throttled
 * background tab, a locked phone or a page reload. Everything drawn on screen
 * is derived from that one number.
 */
(function () {
  "use strict";

  /* --- constants -------------------------------------------------------- */
  var STORAGE_KEY = "lamp.v1";
  var QUIET_AFTER = 2600;          /* ms of stillness before focus mode clears */
  var FINALE_AT = 60000;           /* the lamp leans brighter for the last minute */
  var MINUTE = 60000;

  var DEFAULTS = {
    focus: 25,
    break: 5,
    long: 15,
    rounds: 4,
    auto: false,
    chime: true,
    awake: true,
    dim: false
  };

  var LIMITS = {
    focus: [1, 180],
    break: [1, 60],
    long: [1, 90],
    rounds: [2, 8]
  };

  var LABEL = { focus: "Focus", break: "Break", long: "Long break" };

  /* --- helpers ---------------------------------------------------------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
  function pad(n) { return n < 10 ? "0" + n : String(n); }

  var root = document.documentElement;
  var arc = $("#arc");
  var head = $("#head");
  var clock = $("#clock");
  var modeLabel = $("#mode");
  var cycleList = $("#cycle");
  var toggleBtn = $("#toggle");
  var skipBtn = $("#skip");
  var taskInput = $("#task");
  var panel = $("#settings");
  var scrim = $(".scrim");
  var settingsBtn = $('[data-action="settings"]');
  var immerseBtn = $('[data-action="immerse"]');
  var announcer = $("#announce");

  var CIRCUMFERENCE = 2 * Math.PI * arc.r.baseVal.value;

  /* --- state ------------------------------------------------------------ */
  var settings = {};
  var state = {
    mode: "focus",
    running: false,
    endsAt: 0,       /* absolute ms; only meaningful while running */
    left: 0,         /* ms; only meaningful while stopped */
    done: 0,         /* study blocks finished in this cycle */
    task: ""
  };

  var raf = 0;
  var alarm = 0;
  var quietTimer = 0;
  var saveTimer = 0;
  var lastClock = "";
  var lastReturn = null;
  var narrow = window.matchMedia("(max-width: 30rem)");

  function duration(mode) {
    if (mode === "break") return settings.break * MINUTE;
    if (mode === "long") return settings.long * MINUTE;
    return settings.focus * MINUTE;
  }

  function remaining() {
    return state.running ? Math.max(0, state.endsAt - Date.now()) : state.left;
  }

  function phase() {
    if (state.running) return "running";
    return state.left < duration(state.mode) ? "paused" : "idle";
  }

  /* --- persistence ------------------------------------------------------ */
  function load() {
    var stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (err) {
      stored = null;
    }
    stored = stored || {};

    var saved = stored.settings || {};
    for (var key in DEFAULTS) {
      if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) continue;
      if (typeof DEFAULTS[key] === "boolean") {
        settings[key] = typeof saved[key] === "boolean" ? saved[key] : DEFAULTS[key];
      } else {
        var n = Math.round(Number(saved[key]));
        settings[key] = isFinite(n) && n > 0
          ? clamp(n, LIMITS[key][0], LIMITS[key][1])
          : DEFAULTS[key];
      }
    }

    if (LABEL[stored.mode]) state.mode = stored.mode;
    state.done = clamp(Math.round(Number(stored.done)) || 0, 0, settings.rounds);
    state.task = typeof stored.task === "string" ? stored.task.slice(0, 60) : "";
    state.running = stored.running === true;
    state.endsAt = Number(stored.endsAt) || 0;
    state.left = Number(stored.left);
    if (!isFinite(state.left) || state.left < 0 || state.left > duration(state.mode)) {
      state.left = duration(state.mode);
    }
    if (state.running && !state.endsAt) state.running = false;
  }

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          settings: settings,
          mode: state.mode,
          done: state.done,
          task: state.task,
          running: state.running,
          endsAt: state.endsAt,
          left: state.running ? remaining() : state.left
        }));
      } catch (err) {
        /* private mode, or a full quota — the timer works without it. */
      }
    }, 120);
  }

  /* --- the clock -------------------------------------------------------- */
  function start() {
    if (state.running) return;
    if (state.left <= 0) state.left = duration(state.mode);
    state.endsAt = Date.now() + state.left;
    state.running = true;
    run();
  }

  function pause() {
    if (!state.running) return;
    state.left = remaining();
    state.running = false;
    run();
  }

  function reset() {
    var full = duration(state.mode);
    /* Already at the top of the block? Then the intent is to start the whole
       cycle over, not to restart a block that has not begun. */
    if (!state.running && state.left >= full && (state.done > 0 || state.mode !== "focus")) {
      state.mode = "focus";
      state.done = 0;
      say("Cycle restarted.");
    }
    state.running = false;
    state.endsAt = 0;
    state.left = duration(state.mode);
    run();
  }

  function skip() {
    advance(Date.now());
    settle(true);
  }

  /** Move to whatever comes after the block that ended at `endedAt`. */
  function advance(endedAt) {
    if (state.mode === "focus") {
      state.done = Math.min(state.done + 1, settings.rounds);
      state.mode = state.done >= settings.rounds ? "long" : "break";
    } else {
      if (state.mode === "long") state.done = 0;
      state.mode = "focus";
    }
    state.left = duration(state.mode);
    state.running = settings.auto;
    state.endsAt = settings.auto ? endedAt + state.left : 0;
  }

  /**
   * Roll forward past every block that finished while we were not looking —
   * a backgrounded tab stops getting frames, but the deadlines still passed.
   */
  function catchUp() {
    var moved = 0;
    while (state.running && remaining() <= 0 && moved < 64) {
      advance(state.endsAt);
      moved += 1;
    }
    return moved;
  }

  /** Announce and sound a change of block, then redraw. */
  function settle(skipped) {
    var name = LABEL[state.mode].toLowerCase();
    var mins = Math.round(duration(state.mode) / MINUTE);
    say((skipped ? "Skipped to " : "") + (skipped ? name : name + " — " + mins + " minutes") +
      (skipped ? ", " + mins + " minutes." : "."));
    chime(state.mode === "focus");
    run();
  }

  /* --- the loop --------------------------------------------------------- */
  function run() {
    render();
    save();
    wake();

    cancelAnimationFrame(raf);
    clearTimeout(alarm);
    raf = 0;
    alarm = 0;

    if (!state.running) return;

    /* Frames drive the ring; the alarm is the backstop for a tab that stops
       getting them. Both funnel into the same catch-up. */
    alarm = setTimeout(function () {
      if (catchUp()) settle(false); else run();
    }, remaining() + 60);

    raf = requestAnimationFrame(frame);
  }

  function frame() {
    if (!state.running) return;
    if (remaining() <= 0) {
      if (catchUp()) settle(false);
      return;
    }
    render();
    raf = requestAnimationFrame(frame);
  }

  /* --- rendering -------------------------------------------------------- */
  function render() {
    var total = duration(state.mode) || 1;
    var left = Math.min(remaining(), total);
    var gone = clamp(1 - left / total, 0, 1);

    var visible = CIRCUMFERENCE * (1 - gone);
    arc.style.strokeDasharray = visible + " " + CIRCUMFERENCE;
    arc.style.strokeDashoffset = String(-(CIRCUMFERENCE - visible));
    arc.style.opacity = left > 0 ? "" : "0";
    head.style.transform = "rotate(" + (gone * 360) + "deg)";

    var secs = Math.ceil(left / 1000);
    setClock(pad(Math.floor(secs / 60)) + ":" + pad(secs % 60));

    var mode = state.mode;
    var at = phase();
    if (root.getAttribute("data-mode") !== mode) root.setAttribute("data-mode", mode);
    if (root.getAttribute("data-state") !== at) root.setAttribute("data-state", at);

    var finale = state.running && left <= FINALE_AT ? "true" : "false";
    if (root.getAttribute("data-finale") !== finale) root.setAttribute("data-finale", finale);

    modeLabel.textContent = LABEL[mode];
    toggleBtn.textContent = at === "running" ? "Pause" : at === "paused" ? "Resume" : "Start";
    var skipTo = mode === "focus" ? "Skip to break" : "Skip to focus";
    skipBtn.textContent = narrow.matches ? "Skip" : skipTo;
    skipBtn.setAttribute("aria-label", skipTo);

    document.title = at === "idle" && !state.done
      ? "Desk Lamp"
      : lastClock + " " + LABEL[mode].toLowerCase() + " — Desk Lamp";

    renderCycle();
  }

  /**
   * Each digit keeps its own fixed slot, so the clock never shuffles sideways
   * as the numbers change — and only the digits that actually changed animate.
   */
  function setClock(text) {
    if (text === lastClock) return;
    var previous = lastClock;
    lastClock = text;
    clock.setAttribute("aria-label", spoken(text));

    if (previous.length !== text.length) {
      clock.textContent = "";
      for (var i = 0; i < text.length; i++) {
        var cell = document.createElement("span");
        if (text[i] === ":") cell.className = "colon";
        cell.textContent = text[i];
        clock.appendChild(cell);
      }
      return;
    }

    var cells = clock.children;
    for (var j = 0; j < text.length; j++) {
      if (cells[j].textContent === text[j]) continue;
      cells[j].textContent = text[j];
      cells[j].classList.remove("is-tick");
      void cells[j].offsetWidth;                 /* restart the animation */
      cells[j].classList.add("is-tick");
    }
  }

  function spoken(text) {
    var parts = text.split(":");
    var m = Number(parts[0]);
    var s = Number(parts[1]);
    var out = [];
    if (m) out.push(m + (m === 1 ? " minute" : " minutes"));
    if (s || !m) out.push(s + (s === 1 ? " second" : " seconds"));
    return out.join(" ") + " remaining";
  }

  function renderCycle() {
    var wanted = settings.rounds;
    while (cycleList.children.length > wanted) cycleList.removeChild(cycleList.lastChild);
    while (cycleList.children.length < wanted) cycleList.appendChild(document.createElement("li"));

    for (var i = 0; i < wanted; i++) {
      var dot = cycleList.children[i];
      dot.className = i < state.done ? "is-done"
        : i === state.done && state.mode === "focus" ? "is-now" : "";
    }
    cycleList.setAttribute("aria-label",
      "Round " + Math.min(state.done + 1, wanted) + " of " + wanted);
  }

  function say(message) {
    announcer.textContent = message;
  }

  /* --- chime ------------------------------------------------------------ */
  /* Two notes a fifth apart, rising back into work and falling into a break.
     Synthesised, so the app still makes no network requests. */
  var audio = null;

  function prime() {
    if (audio || !settings.chime) return;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try {
      audio = new Ctx();
    } catch (err) {
      audio = null;
    }
  }

  function chime(rising) {
    if (!settings.chime) return;
    prime();
    if (!audio) return;
    if (audio.state === "suspended" && audio.resume) audio.resume();

    var notes = rising ? [415.3, 622.25] : [622.25, 415.3];
    var filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2200;
    filter.connect(audio.destination);

    for (var i = 0; i < notes.length; i++) note(notes[i], audio.currentTime + i * 0.19, filter);
  }

  function note(freq, at, out) {
    var osc = audio.createOscillator();
    var gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.16, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.5);
    osc.connect(gain);
    gain.connect(out);
    osc.start(at);
    osc.stop(at + 1.6);
  }

  /* --- keeping the screen on -------------------------------------------- */
  var lock = null;
  var lockPending = false;

  function wake() {
    if (!navigator.wakeLock) return;
    var want = settings.awake && state.running && document.visibilityState === "visible";

    if (want && !lock && !lockPending) {
      lockPending = true;
      navigator.wakeLock.request("screen").then(function (granted) {
        lockPending = false;
        lock = granted;
        granted.addEventListener("release", function () { lock = null; });
        if (!(settings.awake && state.running)) wake();
      }, function () {
        lockPending = false;                     /* refused — nothing to report */
      });
    } else if (!want && lock) {
      var held = lock;
      lock = null;
      if (held.release) held.release().catch(function () {});
    }
  }

  /* --- focus mode ------------------------------------------------------- */
  function immersive() { return root.getAttribute("data-immersive") === "true"; }

  function setImmersive(on) {
    if (on) {
      root.setAttribute("data-immersive", "true");
      var enter = root.requestFullscreen || root.webkitRequestFullscreen;
      if (enter) {
        var pending = enter.call(root);
        if (pending && pending.catch) pending.catch(function () {});
      }
      stir();
    } else {
      root.removeAttribute("data-immersive");
      root.removeAttribute("data-quiet");
      clearTimeout(quietTimer);
      var leave = document.exitFullscreen || document.webkitExitFullscreen;
      if (leave && (document.fullscreenElement || document.webkitFullscreenElement)) {
        var closing = leave.call(document);
        if (closing && closing.catch) closing.catch(function () {});
      }
    }
    immerseBtn.setAttribute("aria-pressed", String(on));
  }

  /** Any sign of life brings the chrome back; stillness takes it away again. */
  function stir() {
    if (!immersive()) return;
    root.removeAttribute("data-quiet");
    clearTimeout(quietTimer);
    quietTimer = setTimeout(function () {
      if (!immersive() || panel.hidden === false) return;
      if (document.activeElement === taskInput) return;
      root.setAttribute("data-quiet", "true");
    }, QUIET_AFTER);
  }

  /* --- settings panel --------------------------------------------------- */
  function openPanel() {
    if (!panel.hidden) return;
    lastReturn = document.activeElement;
    scrim.hidden = false;
    panel.hidden = false;
    root.removeAttribute("data-quiet");
    clearTimeout(quietTimer);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        panel.setAttribute("data-open", "true");
        scrim.setAttribute("data-open", "true");
      });
    });
    settingsBtn.setAttribute("aria-expanded", "true");
    var first = focusable()[0];
    if (first) first.focus();
  }

  function closePanel() {
    if (panel.hidden) return;
    panel.removeAttribute("data-open");
    scrim.removeAttribute("data-open");
    settingsBtn.setAttribute("aria-expanded", "false");
    window.setTimeout(function () {
      panel.hidden = true;
      scrim.hidden = true;
    }, 400);
    if (lastReturn && lastReturn.focus) lastReturn.focus();
    stir();
  }

  function focusable() {
    return $$("button, input, [href]", panel).filter(function (el) {
      return !el.disabled && el.offsetParent !== null;
    });
  }

  function fillPanel() {
    $$("[data-setting]", panel).forEach(function (field) {
      var key = field.getAttribute("data-setting");
      if (field.type === "checkbox") field.checked = settings[key];
      else field.value = settings[key];
    });
    root.setAttribute("data-glow", settings.dim ? "low" : "full");
  }

  function readField(field) {
    var key = field.getAttribute("data-setting");
    var untouched = !state.running && state.left >= duration(state.mode);

    if (field.type === "checkbox") {
      settings[key] = field.checked;
      if (key === "dim") root.setAttribute("data-glow", settings.dim ? "low" : "full");
      if (key === "awake") wake();
      if (key === "chime" && field.checked) prime();
    } else {
      var n = Math.round(Number(field.value));
      if (!isFinite(n)) return;
      settings[key] = clamp(n, LIMITS[key][0], LIMITS[key][1]);
      if (key === "rounds") state.done = Math.min(state.done, settings.rounds);
      /* A length you change before the block starts should take effect now;
         one you change mid-block should not yank the clock. */
      if (untouched) state.left = duration(state.mode);
    }
    run();
  }

  /* --- events ----------------------------------------------------------- */
  function onAction(event) {
    var trigger = event.target.closest ? event.target.closest("[data-action]") : null;
    if (!trigger) return;
    var action = trigger.getAttribute("data-action");

    if (action === "toggle") {
      prime();
      if (state.running) pause(); else start();
    } else if (action === "reset") {
      reset();
    } else if (action === "skip") {
      prime();
      skip();
    } else if (action === "settings") {
      if (panel.hidden) openPanel(); else closePanel();
    } else if (action === "close") {
      closePanel();
    } else if (action === "immerse") {
      setImmersive(!immersive());
    } else if (action === "defaults") {
      for (var key in DEFAULTS) {
        if (Object.prototype.hasOwnProperty.call(DEFAULTS, key)) settings[key] = DEFAULTS[key];
      }
      state.done = Math.min(state.done, settings.rounds);
      if (!state.running) state.left = duration(state.mode);
      fillPanel();
      run();
      say("Settings restored to their defaults.");
    }
  }

  function onKey(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (event.key === "Escape") {
      if (!panel.hidden) { closePanel(); return; }
      if (immersive()) { setImmersive(false); return; }
      return;
    }

    if (!panel.hidden) {
      if (event.key === "Tab") trap(event);
      return;
    }

    /* Never steal a key from something the user is typing into. */
    var target = event.target;
    if (target && target.closest && target.closest("input, textarea, select, [contenteditable]")) return;

    var key = event.key.toLowerCase();
    if (event.key === " " || event.key === "Spacebar" || key === "k") {
      event.preventDefault();
      prime();
      if (state.running) pause(); else start();
    } else if (key === "f") {
      setImmersive(!immersive());
    } else if (key === "r") {
      reset();
    } else if (key === "s") {
      prime();
      skip();
    } else if (key === ",") {
      openPanel();
    }
  }

  function trap(event) {
    var items = focusable();
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function onVisible() {
    if (document.visibilityState !== "visible") { wake(); return; }
    if (catchUp()) settle(false); else run();
  }

  /* --- boot ------------------------------------------------------------- */
  function boot() {
    load();
    fillPanel();
    taskInput.value = state.task;
    catchUp();
    run();

    document.addEventListener("click", onAction);
    document.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);

    panel.addEventListener("change", function (event) {
      if (event.target.hasAttribute("data-setting")) readField(event.target);
    });
    panel.addEventListener("input", function (event) {
      if (event.target.type === "number" && event.target.value !== "") readField(event.target);
    });

    taskInput.addEventListener("input", function () {
      state.task = taskInput.value;
      save();
    });

    ["pointermove", "pointerdown", "wheel", "touchstart"].forEach(function (type) {
      document.addEventListener(type, stir, { passive: true });
    });
    document.addEventListener("keydown", stir);

    if (narrow.addEventListener) narrow.addEventListener("change", render);

    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("webkitfullscreenchange", onFullscreen);

    /* Another tab in the same browser is the same desk. Keep them in step. */
    window.addEventListener("storage", function (event) {
      if (event.key !== STORAGE_KEY) return;
      load();
      fillPanel();
      taskInput.value = state.task;
      catchUp();
      run();
    });
  }

  function onFullscreen() {
    var on = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (!on && immersive()) setImmersive(false);
  }

  boot();
})();

/* -------------------------------------------------------------
   ECG@RVHS Current Opportunities list
   Placed on a page with {% include opportunities.html %}.

   Where the listings come from:
   - The ECG team's Google Sheet ("ECG Current Opportunities (website
     feed)"), Public tab, published to the web as CSV. Its link is
     set as  opportunities_csv  in _config.yml.
   - If that link is empty, the sample file assets/data/
     opportunities-sample.csv is shown instead, with a notice.

   Rules:
   - A listing shows until 11:59 pm Singapore time on its closing
     date, then disappears. No closing date = "open until filled".
   - Columns are found by their heading (Title, Organiser, Type,
     Field, Open to, Closing date, Summary, Link, Posted), so their
     order doesn't matter. Rows without a title are skipped.
   - Only http(s) links are used. All text is inserted as text,
     never as HTML.
   Nothing the visitor types is saved or sent anywhere.

   Before changing the date or filter rules, run:
     node tests/opportunities.test.js
   ------------------------------------------------------------- */
(function (global) {
  "use strict";

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var SOON_DAYS = 7; // "Closing soon" when this many days or fewer are left
  var SG_OFFSET_MS = 8 * 60 * 60 * 1000; // Singapore is UTC+8 all year

  // Sheet heading (lower case) -> field name
  var HEADINGS = {
    "title": "title",
    "organiser": "organiser", "organizer": "organiser",
    "type": "type",
    "field": "field",
    "open to": "openTo",
    "closing date": "closing", "closes": "closing",
    "summary": "summary", "description": "summary",
    "link": "link",
    "posted": "posted", "date posted": "posted"
  };

  // Preferred order for filter options (anything else is added A-Z after these)
  var ORDER = {
    type: ["Internship", "Job", "Programme", "Talk or fair", "Scholarship", "Competition", "Other"],
    field: ["Business and finance", "Engineering and technology", "Science and health",
            "Law and public service", "Humanities and social sciences", "Arts and design",
            "Education", "Any field"],
    openTo: ["Graduates only", "Graduates and current students"]
  };

  /* ---------- CSV ---------- */

  // RFC 4180: quoted fields, doubled quotes, commas and line breaks inside quotes
  function parseCSV(text) {
    var rows = [], row = [], field = "", i = 0, q = false, c;
    text = String(text || "").replace(/^﻿/, "");
    while (i < text.length) {
      c = text[i];
      if (q) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          q = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"') { q = true; i++; continue; }
      if (c === ",") { row.push(field); field = ""; i++; continue; }
      if (c === "\r") { i++; continue; }
      if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
      field += c; i++;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  /* ---------- Dates (all as "YYYY-MM-DD" strings) ---------- */

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function validYMD(y, m, d) {
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    var t = new Date(Date.UTC(y, m - 1, d));
    if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null;
    return y + "-" + pad(m) + "-" + pad(d);
  }

  // Accepts 2026-10-31, 31/10/2026 (day first, as in Singapore), 31 Oct 2026
  function parseDate(s) {
    s = String(s || "").trim();
    if (!s) return null;
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (m) return validYMD(+m[1], +m[2], +m[3]);
    m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(s);
    if (m) return validYMD(+m[3], +m[2], +m[1]);
    m = /^(\d{1,2})\s+([A-Za-z]{3,})\.?,?\s+(\d{4})$/.exec(s);
    if (m) {
      var mi = MONTHS.indexOf(m[2].slice(0, 1).toUpperCase() + m[2].slice(1, 3).toLowerCase());
      if (mi !== -1) return validYMD(+m[3], mi + 1, +m[1]);
    }
    return null;
  }

  // Today's date in Singapore
  function todaySG(now) {
    var t = (now instanceof Date ? now.getTime() : (typeof now === "number" ? now : Date.now()));
    return new Date(t + SG_OFFSET_MS).toISOString().slice(0, 10);
  }

  function daysBetween(fromYMD, toYMD) {
    var a = fromYMD.split("-"), b = toYMD.split("-");
    return Math.round((Date.UTC(+b[0], b[1] - 1, +b[2]) - Date.UTC(+a[0], a[1] - 1, +a[2])) / 86400000);
  }

  // "2026-10-31" -> "31 Oct 2026" (the site's date style)
  function formatDate(ymd) {
    var p = ymd.split("-");
    return (+p[2]) + " " + MONTHS[+p[1] - 1] + " " + p[0];
  }

  /* ---------- Listings ---------- */

  function safeUrl(u) {
    u = String(u || "").trim();
    return /^https?:\/\/[^\s]+$/i.test(u) ? u : "";
  }

  // CSV rows -> listing objects (all fields present, as strings or null)
  function toItems(rows) {
    if (!rows.length) return [];
    var map = rows[0].map(function (h) { return HEADINGS[String(h).trim().toLowerCase()] || null; });
    var items = [];
    for (var r = 1; r < rows.length; r++) {
      var it = { title: "", organiser: "", type: "", field: "", openTo: "", closingRaw: "", summary: "", link: "", postedRaw: "" };
      rows[r].forEach(function (v, c) {
        var k = map[c];
        if (!k) return;
        v = String(v).trim();
        if (k === "closing") it.closingRaw = v;
        else if (k === "posted") it.postedRaw = v;
        else it[k] = v;
      });
      if (!it.title || it.title.charAt(0) === "#") continue; // empty rows, or a sheet error such as #N/A
      it.closing = parseDate(it.closingRaw);
      it.posted = parseDate(it.postedRaw);
      it.link = safeUrl(it.link);
      items.push(it);
    }
    return items;
  }

  // Still open on `today`? A closing date that couldn't be read is kept (shown as "see link")
  function isOpen(it, today) {
    return !it.closing || it.closing >= today;
  }

  function haystack(it) {
    return [it.title, it.organiser, it.type, it.field, it.openTo, it.summary].join(" ").toLowerCase();
  }

  // opts: { q, type, field, openTo } (empty string = any)
  function filterItems(items, opts) {
    opts = opts || {};
    var words = String(opts.q || "").toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter(function (it) {
      if (opts.type && it.type !== opts.type) return false;
      if (opts.field && it.field !== opts.field) return false;
      if (opts.openTo && it.openTo !== opts.openTo) return false;
      if (!words.length) return true;
      var h = haystack(it);
      return words.every(function (w) { return h.indexOf(w) !== -1; });
    });
  }

  function byTitle(a, b) { return a.title.localeCompare(b.title, "en", { sensitivity: "base" }); }

  // mode: "closing" (soonest first; open-until-filled last), "newest", "az"
  function sortItems(items, mode) {
    var out = items.slice();
    out.sort(function (a, b) {
      if (mode === "az") return byTitle(a, b);
      if (mode === "newest") {
        if (a.posted !== b.posted) {
          if (!a.posted) return 1;
          if (!b.posted) return -1;
          return a.posted < b.posted ? 1 : -1;
        }
        return byTitle(a, b);
      }
      if (a.closing !== b.closing) {
        if (!a.closing) return 1;
        if (!b.closing) return -1;
        return a.closing < b.closing ? -1 : 1;
      }
      return byTitle(a, b);
    });
    return out;
  }

  // Distinct values of a field, in the preferred order
  function options(items, key) {
    var seen = {}, list = [];
    items.forEach(function (it) { if (it[key] && !seen[it[key]]) { seen[it[key]] = true; list.push(it[key]); } });
    var pref = ORDER[key] || [];
    return list.sort(function (a, b) {
      var ia = pref.indexOf(a), ib = pref.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      return a.localeCompare(b);
    });
  }

  // Heading prefix, following the style sheet: [Closes 31 Oct 2026]
  function closingLabel(it, today) {
    if (it.closing) {
      var left = daysBetween(today, it.closing);
      return { text: "[Closes " + formatDate(it.closing) + "]",
               soon: left <= SOON_DAYS, badge: left === 0 ? "Closes today" : (left <= SOON_DAYS ? "Closing soon" : "") };
    }
    if (it.closingRaw) return { text: "[Closing date: see link]", soon: false, badge: "" };
    return { text: "[Open until filled]", soon: false, badge: "" };
  }

  var api = {
    parseCSV: parseCSV, parseDate: parseDate, todaySG: todaySG, formatDate: formatDate,
    daysBetween: daysBetween, safeUrl: safeUrl, toItems: toItems, isOpen: isOpen,
    filterItems: filterItems, sortItems: sortItems, options: options, closingLabel: closingLabel
  };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; }

  /* ---------- Page ---------- */

  function el(tag, props, children) {
    var node = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      if (k === "text") node.textContent = props[k];
      else if (k === "className") node.className = props[k];
      else if (k in node && k !== "list") node[k] = props[k];
      else node.setAttribute(k, props[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return node;
  }

  function timeNow() {
    var d = new Date(Date.now() + SG_OFFSET_MS);
    var h = d.getUTCHours(), m = d.getUTCMinutes();
    return ((h % 12) || 12) + ":" + pad(m) + (h < 12 ? " am" : " pm") + ", " + formatDate(d.toISOString().slice(0, 10));
  }

  var uid = 0;

  function init(root) {
    var url = root.getAttribute("data-src");
    var isSample = root.getAttribute("data-sample") === "true";
    var helpUrl = root.getAttribute("data-help") || "";
    var n = ++uid;
    root.innerHTML = "";

    var status = el("p", { className: "ecg-opp-status", role: "status", text: "Loading opportunities…" });
    root.appendChild(status);

    fetch(url, { cache: "no-cache" })
      .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.text(); })
      .then(function (text) {
        var today = todaySG();
        var all = toItems(parseCSV(text)).filter(function (it) { return isOpen(it, today); });
        build(all, today);
      })
      .catch(function () {
        root.innerHTML = "";
        var p = el("p", { className: "ecg-opp-error", role: "alert" }, [
          "We couldn't load the list just now. Please refresh the page in a few minutes."
        ]);
        if (helpUrl) {
          p.appendChild(document.createTextNode(" If it still doesn't load, "));
          p.appendChild(el("a", { href: helpUrl, text: "contact the ECG team" }));
          p.appendChild(document.createTextNode("."));
        }
        root.appendChild(p);
      });

    function select(id, label, values, anyText) {
      var s = el("select", { id: id });
      s.appendChild(el("option", { value: "", text: anyText }));
      values.forEach(function (v) { s.appendChild(el("option", { value: v, text: v })); });
      var wrap = el("div", { className: "ecg-opp-field" }, [el("label", { htmlFor: id, text: label }), s]);
      if (values.length < 2) wrap.hidden = true; // nothing to choose between
      return { wrap: wrap, sel: s };
    }

    function build(all, today) {
      root.innerHTML = "";
      if (isSample) {
        root.appendChild(el("p", { className: "ecg-opp-sample",
          text: "Sample listings for testing. The real list appears here once the ECG team's Google Sheet is connected." }));
      }
      if (!all.length) {
        root.appendChild(el("p", { className: "ecg-opp-empty",
          text: "No opportunities are open right now. New ones are added through the year, so check back soon." }));
        root.appendChild(el("p", { className: "ecg-opp-updated", text: "Checked " + timeNow() + "." }));
        return;
      }

      var form = el("form", { className: "ecg-opp-controls", role: "search", "aria-label": "Search and filter opportunities" });
      var qId = "ecg-opp-q-" + n;
      var q = el("input", { type: "search", id: qId, autocomplete: "off", placeholder: "e.g. engineering, research, NUS" });
      var type = select("ecg-opp-type-" + n, "Type", options(all, "type"), "All types");
      var field = select("ecg-opp-field-" + n, "Field", options(all, "field"), "All fields");
      var openTo = select("ecg-opp-open-" + n, "Open to", options(all, "openTo"), "Anyone");
      var sort = el("select", { id: "ecg-opp-sort-" + n });
      [["closing", "Closing soonest"], ["newest", "Newest first"], ["az", "A to Z"]].forEach(function (o) {
        sort.appendChild(el("option", { value: o[0], text: o[1] }));
      });
      var clear = el("button", { type: "button", className: "ecg-opp-clear", text: "Clear" });

      form.appendChild(el("div", { className: "ecg-opp-field ecg-opp-search" }, [el("label", { htmlFor: qId, text: "Search" }), q]));
      form.appendChild(type.wrap);
      form.appendChild(field.wrap);
      form.appendChild(openTo.wrap);
      form.appendChild(el("div", { className: "ecg-opp-field" }, [el("label", { htmlFor: sort.id, text: "Sort by" }), sort]));
      form.appendChild(el("div", { className: "ecg-opp-field ecg-opp-clear-wrap" }, [clear]));
      form.addEventListener("submit", function (e) { e.preventDefault(); });
      root.appendChild(form);

      var count = el("p", { className: "ecg-opp-count", role: "status", "aria-live": "polite" });
      var list = el("ul", { className: "ecg-opp-list" });
      root.appendChild(count);
      root.appendChild(list);
      root.appendChild(el("p", { className: "ecg-opp-updated",
        text: "Checked " + timeNow() + ". Listings close at 11:59 pm Singapore time on their closing date." }));

      function render() {
        var shown = sortItems(filterItems(all, { q: q.value, type: type.sel.value, field: field.sel.value, openTo: openTo.sel.value }), sort.value);
        list.innerHTML = "";
        var total = all.length + (all.length === 1 ? " opportunity" : " opportunities");
        if (!shown.length) {
          count.textContent = "Nothing matches your search. Try fewer words, or Clear. (" + total + " open.)";
          return;
        }
        count.textContent = shown.length === all.length ? total + " open" : "Showing " + shown.length + " of " + total;
        shown.forEach(function (it) { list.appendChild(card(it, today)); });
      }

      var timer;
      q.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(render, 150); });
      [type.sel, field.sel, openTo.sel, sort].forEach(function (s) { s.addEventListener("change", render); });
      clear.addEventListener("click", function () {
        q.value = ""; type.sel.value = ""; field.sel.value = ""; openTo.sel.value = ""; sort.value = "closing";
        render(); q.focus();
      });
      render();
    }
  }

  function card(it, today) {
    var lab = closingLabel(it, today);
    var h = el("h3", { className: "ecg-opp-title" }, [
      el("span", { className: "ecg-opp-close", text: lab.text }), " " + it.title
    ]);
    var head = el("div", { className: "ecg-opp-head" }, [h]);
    if (lab.badge) head.appendChild(el("span", { className: "ecg-opp-badge", text: lab.badge }));

    var meta = [it.organiser, it.type, it.field].filter(Boolean).join(" · ");
    var li = el("li", { className: "ecg-opp-card" + (lab.soon ? " ecg-opp-soon" : "") }, [head]);
    if (meta) li.appendChild(el("p", { className: "ecg-opp-meta", text: meta }));
    if (it.openTo) li.appendChild(el("p", { className: "ecg-opp-who", text: "Open to: " + it.openTo }));
    if (it.summary) li.appendChild(el("p", { className: "ecg-opp-summary", text: it.summary }));
    var foot = el("div", { className: "ecg-opp-foot" });
    if (it.link) {
      foot.appendChild(el("a", { className: "btn btn-primary ecg-opp-apply", href: it.link, rel: "noopener",
        text: "Apply", "aria-label": "Apply: " + it.title + " (organiser's website)" }));
    }
    if (it.posted) foot.appendChild(el("span", { className: "ecg-opp-posted", text: "Posted " + formatDate(it.posted) }));
    if (foot.childNodes.length) li.appendChild(foot);
    return li;
  }

  function start() {
    var roots = document.querySelectorAll(".ecg-opp[data-src]");
    for (var i = 0; i < roots.length; i++) init(roots[i]);
  }
  global.ECGOpportunities = api;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})(this);

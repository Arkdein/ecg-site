/*
 * Current Opportunities — reads the team's Google Sheet (published as CSV)
 * and lists open items, newest first, with the closing date in each heading.
 * Expired items disappear automatically on the day after they close.
 *
 * Sheet columns (first row, exact names): see templates/opportunities-template.csv
 *   Title | Organiser | Category | For | Added | Closes | Link | Details
 * Dates: YYYY-MM-DD (e.g. 2026-10-31). "Closes" may be blank for rolling items.
 */
(function (root) {
  "use strict";

  var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var SOON_DAYS = 7;

  function parseCSV(text) {
    var rows = [], row = [], field = "", i = 0, q = false;
    text = String(text).replace(/^﻿/, "");
    while (i < text.length) {
      var c = text[i];
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
    return rows.filter(function (r) { return r.some(function (v) { return v.trim() !== ""; }); });
  }

  function toObjects(rows) {
    if (!rows.length) return [];
    var head = rows[0].map(function (h) { return h.trim().toLowerCase(); });
    return rows.slice(1).map(function (r) {
      var o = {};
      head.forEach(function (h, k) { o[h] = (r[k] || "").trim(); });
      return o;
    });
  }

  // Accepts 2026-10-31, 31/10/2026 or 31 Oct 2026. Returns a day count or null.
  function dayNumber(s) {
    if (!s) return null;
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5;
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1]) / 864e5;
    m = /^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})$/.exec(s);
    if (m) {
      var mi = MONTHS.map(function (x) { return x.toLowerCase(); }).indexOf(m[2].toLowerCase());
      if (mi >= 0) return Date.UTC(+m[3], mi, +m[1]) / 864e5;
    }
    return null;
  }

  function fmt(day) {
    var d = new Date(day * 864e5);
    return d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear();
  }

  // Today in Singapore time, as a day count
  function todaySG(now) {
    var t = (now ? now.getTime() : Date.now()) + 8 * 3600e3;
    return Math.floor(t / 864e5);
  }

  function prepare(items, today) {
    return items
      .filter(function (o) { return o.title; })
      .map(function (o) {
        o._closes = dayNumber(o.closes);
        o._added = dayNumber(o.added);
        return o;
      })
      .filter(function (o) { return o._closes === null || o._closes >= today; })
      .sort(function (a, b) {
        var aa = a._added === null ? -Infinity : a._added;
        var bb = b._added === null ? -Infinity : b._added;
        if (bb !== aa) return bb - aa;
        var ac = a._closes === null ? Infinity : a._closes;
        var bc = b._closes === null ? Infinity : b._closes;
        return ac - bc;
      });
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function safeLink(u) {
    return /^https?:\/\//i.test(u) ? u : "";
  }

  function render(container, items, today) {
    var cats = [];
    items.forEach(function (o) { if (o.category && cats.indexOf(o.category) < 0) cats.push(o.category); });
    cats.sort();
    var latest = items.reduce(function (m, o) { return o._added !== null && o._added > m ? o._added : m; }, -Infinity);

    var html = "";
    html += '<p class="ecg-page-meta" id="ecg-opps-updated">' + items.length + " open " + (items.length === 1 ? "item" : "items") +
      (latest > -Infinity ? " · List updated " + fmt(latest) : "") + "</p>";
    html += '<div id="ecg-opps-controls">' +
      '<label>Type <select id="ecg-opps-cat"><option value="">All</option>' +
      cats.map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("") +
      '</select></label>' +
      '<label>Search <input id="ecg-opps-q" type="search" placeholder="e.g. NUS, medicine"></label></div>';
    html += '<div id="ecg-opps-list">';
    items.forEach(function (o, k) {
      var closes = o._closes === null ? "Rolling" : "Closes " + fmt(o._closes);
      var soon = o._closes !== null && o._closes - today <= SOON_DAYS;
      var link = safeLink(o.link);
      var title = link ? '<a href="' + esc(link) + '" rel="noopener">' + esc(o.title) + "</a>" : esc(o.title);
      html += '<div class="ecg-opp" data-cat="' + esc(o.category || "") + '" data-text="' +
        esc([o.title, o.organiser, o.category, o["for"], o.details].join(" ").toLowerCase()) + '">' +
        '<h3 id="opp-' + k + '"><span class="ecg-closes' + (soon ? " ecg-soon" : "") + '">[' + closes + "]</span> " + title + "</h3>" +
        '<p class="ecg-opp-meta">' + [o.organiser, o.category, o["for"] ? "For: " + o["for"] : ""].filter(Boolean).map(esc).join(" · ") + "</p>" +
        (o.details ? "<p>" + esc(o.details) + "</p>" : "") +
        "</div>";
    });
    html += "</div>";
    if (!items.length) html += "<p>No open opportunities right now. Check back soon.</p>";
    container.innerHTML = html;

    var sel = container.querySelector("#ecg-opps-cat");
    var q = container.querySelector("#ecg-opps-q");
    function apply() {
      var c = sel.value, t = q.value.trim().toLowerCase();
      container.querySelectorAll(".ecg-opp").forEach(function (el) {
        var ok = (!c || el.getAttribute("data-cat") === c) && (!t || el.getAttribute("data-text").indexOf(t) >= 0);
        el.hidden = !ok;
      });
    }
    sel.addEventListener("change", apply);
    q.addEventListener("input", apply);
  }

  function load(container) {
    var url = container.getAttribute("data-csv");
    if (!url) {
      container.innerHTML = '<p class="ecg-todo">The opportunities list is not connected yet. ' +
        "The editor needs to add the Google Sheet link in <code>_config.yml</code>.</p>";
      return;
    }
    fetch(url, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (text) {
        var today = todaySG();
        render(container, prepare(toObjects(parseCSV(text)), today), today);
      })
      .catch(function () {
        var fb = container.getAttribute("data-fallback");
        container.innerHTML = "<p>We couldn't load the list just now." +
          (fb ? ' <a href="' + esc(fb) + '">Open it as a spreadsheet</a> instead.' : " Please refresh the page.") + "</p>";
      });
  }

  var api = { parseCSV: parseCSV, toObjects: toObjects, dayNumber: dayNumber, fmt: fmt, todaySG: todaySG, prepare: prepare };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; }
  root.ECGOpportunities = api;
  document.addEventListener("DOMContentLoaded", function () {
    var el = document.getElementById("ecg-opportunities");
    if (el) load(el);
  });
})(this);

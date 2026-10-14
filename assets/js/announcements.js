/* -------------------------------------------------------------
   ECG@RVHS Key Announcements (Home page)
   Placed on a page with {% include announcements.html %}.
   Needs assets/js/opportunities.js loaded first: it shares that
   file's CSV and date rules, so both lists behave the same way.

   Where the announcements come from:
   - The Google Sheet "ECG Opportunities and Announcements (website
     feed)", tab "Announcements public", published to the web as
     CSV. Its link is  announcements_csv  in _config.yml.
   - The Sheet only publishes rows marked Approved = Yes that have a
     Remove after date.

   Rules:
   - An announcement shows from its Show from date (blank = straight
     away) until 11:59 pm Singapore time on its Remove after date.
     A row without a readable Remove after date never shows.
   - Newest Show from first; at most MAX_SHOWN at a time.
   - When nothing is current, or the Sheet can't be reached, the
     whole block stays hidden. Home works without it.
   - Link: an https:// address, or a page on this site written as
     /page-name (e.g. /results-and-applying).
   - All text is inserted as text, never as HTML.
   - Editors can add ?preview=announcements to the Home address to
     also see approved announcements that haven't started yet.

   Before changing the rules, run:
     node tests/announcements.test.js
   ------------------------------------------------------------- */
(function (global) {
  "use strict";

  var MAX_SHOWN = 4;

  var opp = (typeof module !== "undefined" && module.exports)
    ? require("./opportunities.js")
    : global.ECGOpportunities;

  // Sheet heading (lower case) -> field name
  var HEADINGS = {
    "headline": "headline", "title": "headline",
    "for": "audience",
    "message": "message",
    "link": "link",
    "button text": "button",
    "show from": "showFromRaw",
    "remove after": "removeAfterRaw"
  };

  // A page on this site ("/results-and-applying", "/get-help#moe-ecg"),
  // turned into a full address with the site's base path.
  function siteLink(u, base) {
    u = String(u || "").trim();
    if (/^\/(?!\/)[A-Za-z0-9\-._~\/#?=&%]*$/.test(u)) {
      return String(base || "").replace(/\/+$/, "") + u;
    }
    return opp.safeUrl(u);
  }

  // CSV rows -> announcement objects
  function toItems(rows, base) {
    if (!rows.length) return [];
    var map = rows[0].map(function (h) { return HEADINGS[String(h).trim().toLowerCase()] || null; });
    var items = [];
    for (var r = 1; r < rows.length; r++) {
      var it = { headline: "", audience: "", message: "", link: "", button: "", showFromRaw: "", removeAfterRaw: "" };
      rows[r].forEach(function (v, c) { if (map[c]) it[map[c]] = String(v).trim(); });
      if (!it.headline || it.headline.charAt(0) === "#") continue; // empty rows, or a sheet error such as #N/A
      it.showFrom = opp.parseDate(it.showFromRaw);
      it.removeAfter = opp.parseDate(it.removeAfterRaw);
      it.link = siteLink(it.link, base);
      items.push(it);
    }
    return items;
  }

  // "live": showing today. "upcoming": approved, starts later. "hidden": anything else.
  function state(it, today) {
    if (!it.removeAfter) return "hidden";                  // Remove after is required
    if (it.showFromRaw && !it.showFrom) return "hidden";   // a Show from date that couldn't be read
    if (it.removeAfter < today) return "hidden";           // expired
    if (it.showFrom && it.showFrom > today) return "upcoming";
    return "live";
  }

  // Newest Show from first (blank Show from counts as oldest), then soonest to be removed
  function sortItems(items) {
    return items.slice().sort(function (a, b) {
      var sa = a.showFrom || "", sb = b.showFrom || "";
      if (sa !== sb) return sa < sb ? 1 : -1;
      if (a.removeAfter !== b.removeAfter) return a.removeAfter < b.removeAfter ? -1 : 1;
      return a.headline.localeCompare(b.headline, "en", { sensitivity: "base" });
    });
  }

  // What the block shows on `today`
  function pick(items, today, preview) {
    var shown = items.filter(function (it) {
      var s = state(it, today);
      return s === "live" || (preview && s === "upcoming");
    });
    return sortItems(shown).slice(0, preview ? shown.length : MAX_SHOWN);
  }

  // Message text: blank lines start a new paragraph; single line breaks are kept
  function paragraphs(text) {
    return String(text || "").replace(/\r\n?/g, "\n").split(/\n[ \t]*\n+/)
      .map(function (p) { return p.split("\n").map(function (l) { return l.trim(); }).filter(Boolean); })
      .filter(function (lines) { return lines.length; });
  }

  var api = {
    MAX_SHOWN: MAX_SHOWN, siteLink: siteLink, toItems: toItems, state: state,
    sortItems: sortItems, pick: pick, paragraphs: paragraphs
  };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; }

  /* ---------- Page ---------- */

  function el(tag, props, children) {
    var node = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      if (k === "text") node.textContent = props[k];
      else if (k === "className") node.className = props[k];
      else node.setAttribute(k, props[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return node;
  }

  function card(it, today) {
    var li = el("li", { className: "ecg-ann-card" });
    var head = el("div", { className: "ecg-ann-head" }, [el("h3", { className: "ecg-ann-title", text: it.headline })]);
    if (it.audience) head.appendChild(el("span", { className: "ecg-ann-for", text: "For: " + it.audience }));
    li.appendChild(head);
    if (state(it, today) === "upcoming") {
      li.appendChild(el("p", { className: "ecg-ann-preview",
        text: "Preview: shows from " + opp.formatDate(it.showFrom) + " to " + opp.formatDate(it.removeAfter) + "." }));
    }
    paragraphs(it.message).forEach(function (lines) {
      var p = el("p", { className: "ecg-ann-msg" });
      lines.forEach(function (l, i) { if (i) p.appendChild(el("br")); p.appendChild(document.createTextNode(l)); });
      li.appendChild(p);
    });
    if (it.link) {
      var label = it.button || "Read more";
      li.appendChild(el("p", { className: "ecg-ann-foot" }, [
        el("a", { className: "btn ecg-ann-btn", href: it.link, "aria-label": label + ": " + it.headline, text: label })
      ]));
    }
    return li;
  }

  function init(root) {
    var url = root.getAttribute("data-src");
    var base = root.getAttribute("data-base") || "";
    var preview = /(?:^|[?&])preview=announcements(?:&|$)/.test(global.location ? global.location.search : "");
    var isSample = root.getAttribute("data-sample") === "true";
    if (!url || (isSample && !preview)) return;  // sample announcements only appear in preview mode

    fetch(url, { cache: "no-cache" })
      .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.text(); })
      .then(function (text) {
        var today = opp.todaySG();
        var items = pick(toItems(opp.parseCSV(text), base), today, preview);
        if (!items.length) return;                       // nothing current: the block stays hidden
        var headingId = "ecg-ann-heading";
        var list = el("ul", { className: "ecg-ann-list" });
        items.forEach(function (it) { list.appendChild(card(it, today)); });
        root.appendChild(el("h2", { id: headingId, className: "ecg-ann-heading", text: "Key announcements" }));
        if (preview) {
          root.appendChild(el("p", { className: "ecg-ann-preview",
            text: isSample
              ? "Preview mode with sample announcements: the Sheet's Announcements public tab isn't connected yet (announcements_csv in _config.yml)."
              : "Preview mode: approved announcements that haven't started yet are shown too. Visitors only see current ones." }));
        }
        root.appendChild(list);
        root.setAttribute("aria-labelledby", headingId);
        root.hidden = false;
      })
      .catch(function (e) {
        if (global.console) console.warn("Key announcements not loaded:", e && e.message);
      });
  }

  function start() {
    var roots = document.querySelectorAll(".ecg-ann[data-src]");
    for (var i = 0; i < roots.length; i++) init(roots[i]);
  }
  global.ECGAnnouncements = api;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})(this);

/**
 * ECG@RVHS Weekly Update — the Monday email
 * ------------------------------------------------------------------
 * Runs on Randall's MOE account (hoon_yao_tong_randall@moe.edu.sg).
 * The Google Group belongs to his personal account; the MOE address is
 * a Manager of the Group, so it may post to it. Subscribers see the MOE
 * address, never the personal one. Not part of the website. See
 * WEEKLY-UPDATE.md.
 *
 * Every Monday at about 7 am (Singapore) it:
 *   1. reads the two published CSVs the website already uses
 *      (Opportunities public, Announcements public),
 *   2. picks out what is NEW since the last email:
 *        - Key announcements showing on Home now
 *        - Current Opportunities listings that are still open
 *      plus "Closing this week": older listings that close in the
 *      next 7 days,
 *   3. sends ONE email to the Google Group's address, signed
 *      "The RVHS ECG Team". The Group delivers it to every member and
 *      adds its own unsubscribe link.
 *   No new items = no email that week (CONFIG.SEND_IF_ONLY_CLOSING).
 *
 * The script remembers what it has already sent (Script properties),
 * so nothing is sent twice and nothing posted on a Monday is missed.
 * It never reads the sign-up list: people join the Group themselves.
 *
 * Functions
 *   previewToMe()        Sends this week's email to YOU only. Doesn't
 *                        count as sent. Use it to check the layout.
 *   testToGroup()        Sends this week's email to the Group, marked
 *                        [Test]. Doesn't count as sent. Use it before
 *                        launch, while only test addresses have joined,
 *                        to check the MOE account can reach the Group.
 *   sendWeeklyUpdate()   The real send (the Monday trigger runs this).
 *   installTrigger()     Run once: Mondays, 7–8 am Singapore time.
 *   forgetSentItems()    Clears the memory of what was sent (the next
 *                        email then treats the last 7 days as new).
 *
 * How to install (about 10 minutes)
 *   1. In the Google Group (personal account): Members > Add members >
 *      hoon_yao_tong_randall@moe.edu.sg, "Directly add members" on,
 *      role Manager.
 *   2. Signed in to the MOE account: script.google.com > New project.
 *      Name it "ECG Weekly Update".
 *   3. Project Settings (gear) > tick "Show appsscript.json", and set
 *      "timeZone": "Asia/Singapore" in that file.
 *   4. Paste this whole file into Code.gs and save. (GROUP_EMAIL is
 *      already filled in.)
 *   5. Run previewToMe and allow access. Check the email in your MOE inbox.
 *   6. Run testToGroup. Check it arrives at your test addresses, and
 *      that nothing is waiting under the Group's "Pending" messages.
 *   7. At launch only: run installTrigger.
 * ------------------------------------------------------------------
 */

const CONFIG = {
  // The Google Group's address
  GROUP_EMAIL: "ecgrvhs-weekly-update@googlegroups.com",

  // Shown as the sender's name. The MOE address shows beside it.
  SENDER_NAME: "The RVHS ECG Team",

  // The same published CSV links as opportunities_csv / announcements_csv in _config.yml
  OPPORTUNITIES_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR5GulSl-PRYTpvAqoLXM_ohatOLSqggc7kzFniGNZZ-ACLOeag8pnM14APSZdwcF8xjcSbo5Y_9e5e/pub?gid=1427148673&single=true&output=csv",
  ANNOUNCEMENTS_CSV: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR5GulSl-PRYTpvAqoLXM_ohatOLSqggc7kzFniGNZZ-ACLOeag8pnM14APSZdwcF8xjcSbo5Y_9e5e/pub?gid=502&single=true&output=csv",

  SITE_URL: "https://arkdein.github.io/ecg-site",
  OPPORTUNITIES_PAGE: "/opportunities.html",
  GET_HELP_PAGE: "/get-help.html",
  SIGNUP_PAGE: "/weekly-update.html",

  // Email even when nothing is new but something closes this week?
  // Team decision (19 Oct 2026): no — skip weeks with nothing new.
  SEND_IF_ONLY_CLOSING: false,

  CLOSING_DAYS: 7,        // "Closing this week" = closes within this many days
  FIRST_RUN_DAYS: 7,      // first email: items posted in the last 7 days count as new
  MAX_AGE_DAYS: 30,       // never treat anything posted more than 30 days ago as new
  SUMMARY_CHARS: 280      // opportunity summaries are cut to about this length
};

const SENT_KEY = "sentItems"; // Script property: { key: "YYYY-MM-DD first sent" }

/* ================================================================
   Apps Script entry points
   ================================================================ */

function sendWeeklyUpdate() {
  if (!CONFIG.GROUP_EMAIL) throw new Error("Fill in CONFIG.GROUP_EMAIL first.");
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error("Another run is in progress.");
  try {
    const today = todaySG(new Date());
    const sent = loadSent_();
    const digest = buildDigest(fetchRows_(CONFIG.OPPORTUNITIES_CSV), fetchRows_(CONFIG.ANNOUNCEMENTS_CSV),
                               today, sent, CONFIG);
    if (!digest.send) {
      console.log("No email this week: " + digest.reason);
      saveSent_(markSent(sent, digest.silentKeys, today));
      return;
    }
    const email = renderEmail(digest, today, CONFIG);
    MailApp.sendEmail(CONFIG.GROUP_EMAIL, email.subject, email.text,
                      { htmlBody: email.html, name: CONFIG.SENDER_NAME });
    saveSent_(markSent(sent, digest.newKeys.concat(digest.silentKeys), today));
    console.log("Sent: " + email.subject + " (" + digest.newKeys.length + " new items)");
  } finally {
    lock.releaseLock();
  }
}

function previewToMe() {
  const me = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
  const today = todaySG(new Date());
  const digest = buildDigest(fetchRows_(CONFIG.OPPORTUNITIES_CSV), fetchRows_(CONFIG.ANNOUNCEMENTS_CSV),
                             today, loadSent_(), CONFIG);
  const email = renderEmail(digest, today, CONFIG);
  const note = digest.send ? "" : "[PREVIEW: this week would NOT be sent — " + digest.reason + "]\n\n";
  MailApp.sendEmail(me, "[Preview] " + email.subject, note + email.text,
                    { htmlBody: (note ? "<p><b>" + esc(note.trim()) + "</b></p>" : "") + email.html,
                      name: CONFIG.SENDER_NAME });
  console.log("Preview sent to " + me + (digest.send ? "" : " (would be skipped: " + digest.reason + ")"));
}

function testToGroup() {
  if (!CONFIG.GROUP_EMAIL) throw new Error("Fill in CONFIG.GROUP_EMAIL first.");
  const today = todaySG(new Date());
  const digest = buildDigest(fetchRows_(CONFIG.OPPORTUNITIES_CSV), fetchRows_(CONFIG.ANNOUNCEMENTS_CSV),
                             today, loadSent_(), CONFIG);
  const email = renderEmail(digest, today, CONFIG);
  const note = "[TEST from the ECG team: please ignore. Real weekly emails start after launch.]";
  MailApp.sendEmail(CONFIG.GROUP_EMAIL, "[Test] " + email.subject, note + "\n\n" + email.text,
                    { htmlBody: "<p><b>" + esc(note) + "</b></p>" + email.html, name: CONFIG.SENDER_NAME });
  console.log("Test sent to " + CONFIG.GROUP_EMAIL + ". Nothing was marked as sent.");
}

function installTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === "sendWeeklyUpdate"; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("sendWeeklyUpdate").timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(7).inTimezone("Asia/Singapore").create();
  console.log("Trigger set: Mondays between 7 and 8 am Singapore time.");
}

function forgetSentItems() {
  PropertiesService.getScriptProperties().deleteProperty(SENT_KEY);
  console.log("Cleared. The next email treats the last " + CONFIG.FIRST_RUN_DAYS + " days as new.");
}

function fetchRows_(url) {
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  if (res.getResponseCode() !== 200) throw new Error("Couldn't read " + url + " (HTTP " + res.getResponseCode() + ")");
  return parseCSV(res.getContentText("UTF-8"));
}

function loadSent_() {
  const raw = PropertiesService.getScriptProperties().getProperty(SENT_KEY);
  return raw ? JSON.parse(raw) : null; // null = first run
}

function saveSent_(sent) {
  PropertiesService.getScriptProperties().setProperty(SENT_KEY, JSON.stringify(sent));
}

/* ================================================================
   Pure logic (no Google services) — tested by
   node tests/weekly-update.test.js
   CSV and date rules match assets/js/opportunities.js.
   ================================================================ */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

function pad(n) { return (n < 10 ? "0" : "") + n; }

function validYMD(y, m, d) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  var t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null;
  return y + "-" + pad(m) + "-" + pad(d);
}

// 2026-10-31, 31/10/2026 (day first), 31 Oct 2026
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

function todaySG(now) {
  return new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
}

function addDays(ymd, n) {
  var p = ymd.split("-");
  return new Date(Date.UTC(+p[0], p[1] - 1, +p[2] + n)).toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  var x = a.split("-"), y = b.split("-");
  return Math.round((Date.UTC(+y[0], y[1] - 1, +y[2]) - Date.UTC(+x[0], x[1] - 1, +x[2])) / 86400000);
}

function formatDate(ymd) {
  var p = ymd.split("-");
  return (+p[2]) + " " + MONTHS[+p[1] - 1] + " " + p[0];
}

function safeUrl(u) {
  u = String(u || "").trim();
  return /^https?:\/\/[^\s]+$/i.test(u) ? u : "";
}

// "/results-and-applying" -> full site address (same rule as announcements.js)
function siteLink(u, siteUrl) {
  u = String(u || "").trim();
  if (/^\/(?!\/)[A-Za-z0-9\-._~\/#?=&%]*$/.test(u)) return String(siteUrl).replace(/\/+$/, "") + u;
  return safeUrl(u);
}

// Rows -> objects keyed by lower-case heading
function toRecords(rows) {
  if (!rows || !rows.length) return [];
  var heads = rows[0].map(function (h) { return String(h).trim().toLowerCase(); });
  return rows.slice(1).map(function (r) {
    var o = {};
    heads.forEach(function (h, i) { o[h] = String(r[i] == null ? "" : r[i]).trim(); });
    return o;
  });
}

function oneLine(s) { return String(s || "").replace(/\s+/g, " ").trim(); }

function shorten(s, n) {
  s = oneLine(s);
  if (s.length <= n) return s;
  var cut = s.slice(0, n);
  var sp = cut.lastIndexOf(" ");
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,.;:–-]+$/, "") + "…";
}

function opportunities(rows) {
  return toRecords(rows).map(function (o) {
    return {
      title: oneLine(o["title"]),
      organiser: oneLine(o["organiser"] || o["organizer"]),
      type: oneLine(o["type"]),
      openTo: oneLine(o["open to"]),
      closing: parseDate(o["closing date"] || o["closes"]),
      posted: parseDate(o["posted"] || o["date posted"]),
      summary: o["summary"] || o["description"] || "",
      link: safeUrl(o["link"])
    };
  }).filter(function (it) { return it.title && it.title.charAt(0) !== "#"; })
    .map(function (it) { it.key = "O|" + it.title.toLowerCase() + "|" + (it.posted || ""); return it; });
}

function announcements(rows, siteUrl) {
  return toRecords(rows).map(function (o) {
    var showRaw = o["show from"] || "";
    return {
      headline: oneLine(o["headline"] || o["title"]),
      audience: oneLine(o["for"]),
      message: o["message"] || "",
      link: siteLink(o["link"], siteUrl),
      button: oneLine(o["button text"]),
      showFromRaw: showRaw,
      showFrom: parseDate(showRaw),
      removeAfter: parseDate(o["remove after"])
    };
  }).filter(function (it) { return it.headline && it.headline.charAt(0) !== "#"; })
    .map(function (it) { it.key = "A|" + it.headline.toLowerCase() + "|" + (it.showFrom || ""); return it; });
}

// Same "showing on Home today" rule as announcements.js
function announcementLive(it, today) {
  if (!it.removeAfter) return false;
  if (it.showFromRaw && !it.showFrom) return false;
  if (it.showFrom && it.showFrom > today) return false;
  return it.removeAfter >= today;
}

function opportunityOpen(it, today) { return !it.closing || it.closing >= today; }

/**
 * Decide what goes in this week's email.
 * sent: { key: date } from earlier runs, or null on the first run.
 * Returns { send, reason, announcements[], newOpps[], closing[], newKeys[], silentKeys[] }
 *   silentKeys: items seen but not emailed (undated on the first run), so they
 *   are never announced later as "new".
 */
function buildDigest(oppRows, annRows, today, sent, cfg) {
  var first = !sent;
  sent = sent || {};
  var since = addDays(today, -(first ? cfg.FIRST_RUN_DAYS : cfg.MAX_AGE_DAYS));
  var silent = [];

  function isNew(key, date) {
    if (sent[key]) return false;
    if (!date) {                    // no date: new unless this is the first run
      if (first) { silent.push(key); return false; }
      return true;
    }
    if (date < since) { silent.push(key); return false; }
    return true;
  }

  var anns = announcements(annRows, cfg.SITE_URL)
    .filter(function (a) { return announcementLive(a, today); })
    .filter(function (a) { return isNew(a.key, a.showFrom); })
    .sort(function (a, b) { return (b.showFrom || "") < (a.showFrom || "") ? -1 : 1; });

  var opps = opportunities(oppRows).filter(function (o) { return opportunityOpen(o, today); });
  var newOpps = opps.filter(function (o) { return isNew(o.key, o.posted); })
    .sort(function (a, b) { return (a.closing || "9999") < (b.closing || "9999") ? -1 : 1; });
  var newSet = {};
  newOpps.forEach(function (o) { newSet[o.key] = true; });
  var horizon = addDays(today, cfg.CLOSING_DAYS - 1);
  var closing = opps.filter(function (o) { return !newSet[o.key] && o.closing && o.closing <= horizon; })
    .sort(function (a, b) { return a.closing < b.closing ? -1 : 1; });

  var newKeys = anns.map(function (a) { return a.key; }).concat(newOpps.map(function (o) { return o.key; }));
  var send = newKeys.length > 0 || (cfg.SEND_IF_ONLY_CLOSING && closing.length > 0);
  return {
    send: send,
    reason: send ? "" : (closing.length ? "nothing new (only items closing this week)" : "nothing new"),
    announcements: anns, newOpps: newOpps, closing: closing,
    newKeys: newKeys, silentKeys: silent
  };
}

// Add keys with today's date; drop entries older than 180 days so the store stays small
function markSent(sent, keys, today) {
  var out = {}, cutoff = addDays(today, -180);
  Object.keys(sent || {}).forEach(function (k) { if (sent[k] >= cutoff) out[k] = sent[k]; });
  keys.forEach(function (k) { if (!out[k]) out[k] = today; });
  return out;
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function closesText(o, today) {
  if (!o.closing) return "Open until filled";
  var d = daysBetween(today, o.closing);
  var when = d === 0 ? "today" : d === 1 ? "tomorrow" : "in " + d + " days";
  return "Closes " + formatDate(o.closing) + " (" + when + ")";
}

/* ---------- Email ---------- */

function renderEmail(dg, today, cfg) {
  var site = String(cfg.SITE_URL).replace(/\/+$/, "");
  var oppPage = site + cfg.OPPORTUNITIES_PAGE;
  var helpPage = site + cfg.GET_HELP_PAGE;
  var NAVY = "#082040", RED = "#D80020", GREY = "#5a6270";
  var subject = "ECG@RVHS weekly update · " + formatDate(today);

  var counts = [];
  if (dg.announcements.length) counts.push(dg.announcements.length + " announcement" + (dg.announcements.length > 1 ? "s" : ""));
  if (dg.newOpps.length) counts.push(dg.newOpps.length + " new opportunit" + (dg.newOpps.length > 1 ? "ies" : "y"));
  if (dg.closing.length) counts.push(dg.closing.length + " closing this week");
  var intro = "This week: " + (counts.length ? counts.join(", ") : "nothing new") + ".";

  var h = [], t = [];
  h.push('<div style="max-width:600px;margin:0 auto;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:16px;line-height:1.5;color:#1d2330">');
  h.push('<div style="border-top:4px solid ' + RED + ';padding:16px 0 4px"><div style="font-size:22px;font-weight:700;color:' + NAVY + '">ECG@RVHS weekly update</div>');
  h.push('<div style="color:' + GREY + '">' + esc(formatDate(today)) + '</div></div>');
  h.push('<p>' + esc(intro) + '</p>');
  t.push("ECG@RVHS weekly update · " + formatDate(today), "", intro, "");

  function heading(s) {
    h.push('<h2 style="font-size:18px;color:' + NAVY + ';border-bottom:1px solid #d9dde3;padding-bottom:4px;margin:28px 0 8px">' + esc(s) + '</h2>');
    t.push(s.toUpperCase(), "");
  }
  function button(href, label) {
    return '<a href="' + esc(href) + '" style="display:inline-block;background:' + NAVY + ';color:#ffffff;text-decoration:none;padding:8px 14px;border-radius:4px;font-size:15px">' + esc(label) + '</a>';
  }

  if (dg.announcements.length) {
    heading("Announcements");
    dg.announcements.forEach(function (a) {
      h.push('<div style="margin:0 0 18px"><div style="font-weight:700;color:' + NAVY + '">' + esc(a.headline) + '</div>');
      if (a.audience) h.push('<div style="color:' + GREY + ';font-size:14px">For: ' + esc(a.audience) + '</div>');
      h.push('<p style="margin:6px 0">' + esc(oneLine(a.message)) + '</p>');
      if (a.link) h.push('<p style="margin:6px 0">' + button(a.link, a.button || "Find out more") + '</p>');
      h.push('</div>');
      t.push(a.headline + (a.audience ? " (for " + a.audience + ")" : ""), oneLine(a.message));
      if (a.link) t.push((a.button || "Find out more") + ": " + a.link);
      t.push("");
    });
  }

  function oppBlock(o, withSummary) {
    var meta = [o.organiser, o.openTo].filter(Boolean).join(" · ");
    var href = o.link || oppPage;
    h.push('<div style="margin:0 0 18px"><div style="font-weight:700"><a href="' + esc(href) + '" style="color:' + NAVY + '">' + esc(o.title) + '</a></div>');
    if (meta) h.push('<div style="color:' + GREY + ';font-size:14px">' + esc(meta) + '</div>');
    h.push('<div style="font-size:14px;font-weight:700;color:' + NAVY + '">' + esc(closesText(o, today)) + '</div>');
    if (withSummary && o.summary) h.push('<p style="margin:6px 0">' + esc(shorten(o.summary, cfg.SUMMARY_CHARS)) + '</p>');
    h.push('</div>');
    t.push(o.title + (meta ? " — " + meta : ""), closesText(o, today));
    if (withSummary && o.summary) t.push(shorten(o.summary, cfg.SUMMARY_CHARS));
    t.push(href, "");
  }

  if (dg.newOpps.length) {
    heading("New opportunities");
    dg.newOpps.forEach(function (o) { oppBlock(o, true); });
  }
  if (dg.closing.length) {
    heading("Closing this week");
    dg.closing.forEach(function (o) { oppBlock(o, false); });
  }

  h.push('<p style="margin:28px 0 8px">' + button(oppPage, "See all current opportunities") + '</p>');
  h.push('<p>Always check the details on the organiser\'s own page before you apply. Questions? <a href="' + esc(helpPage) + '" style="color:' + NAVY + '">Ask the ECG team</a>.</p>');
  h.push('<p>The RVHS ECG Team</p>');
  h.push('<p style="color:' + GREY + ';font-size:13px;border-top:1px solid #d9dde3;padding-top:8px">You signed up for this weekly email on the ECG@RVHS website. To stop it, use the unsubscribe link below. Know someone who\'d like it? They can <a href="' + esc(site + cfg.SIGNUP_PAGE) + '" style="color:' + GREY + '">sign up here</a>.</p>');
  h.push('</div>');

  t.push("All current opportunities: " + oppPage, "",
         "Always check the details on the organiser's own page before you apply. Questions? " + helpPage, "",
         "The RVHS ECG Team", "",
         "You signed up for this weekly email on the ECG@RVHS website. To stop it, use the unsubscribe link below.",
         "Know someone who'd like it? They can sign up at " + site + cfg.SIGNUP_PAGE);

  return { subject: subject, html: h.join("\n"), text: t.join("\n") };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { CONFIG: CONFIG, parseCSV: parseCSV, parseDate: parseDate, todaySG: todaySG, addDays: addDays,
    buildDigest: buildDigest, markSent: markSent, renderEmail: renderEmail, shorten: shorten,
    announcementLive: announcementLive, siteLink: siteLink };
}

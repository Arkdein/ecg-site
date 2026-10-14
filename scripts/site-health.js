/* -------------------------------------------------------------
   ECG@RVHS site health check  (not part of the website)

   Reads every page of the site and writes four CSV files that the
   Webmaster's Dashboard (Google Sheet + Looker Studio) reads:

     pages.csv      one row per page: portfolio, review dates,
                    TODOs, hidden pages, Chinese page in step
     deadlines.csv  every date found in a {: .deadline } box
     links.csv      every link, with its status
     summary.csv    one row of totals for the top of the dashboard

   GitHub runs this every night and after every change
   (.github/workflows/site-health.yml) and puts the files on the
   "site-health" branch. Nobody needs to run it by hand.

   To try it yourself:
     node scripts/site-health.js --out site-health
     node scripts/site-health.js --out site-health --no-external
   ------------------------------------------------------------- */
"use strict";
var fs = require("fs");
var path = require("path");
var childProcess = require("child_process");

// ---- Settings ------------------------------------------------
var REVIEW_EVERY_MONTHS = 6;   // a page is due for review this long after "last_reviewed"
var DUE_SOON_DAYS = 30;        // "Review due soon" when this many days or fewer are left
var COMING_UP_DAYS = 14;       // a deadline box is "Coming up" when its next date is this close
var LINK_TIMEOUT_MS = 20000;
var LINK_CONCURRENCY = 6;
var SKIP_FILES = ["README.md", "EDITING.md", "STYLE.md", "MIGRATION.md", "DASHBOARD.md"];

var MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12
};
var MONTH_RE = "(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";

// ---- Small helpers -------------------------------------------
function pad(n) { return (n < 10 ? "0" : "") + n; }
function iso(y, m, d) { return y + "-" + pad(m) + "-" + pad(d); }
function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function monthNum(s) { return MONTHS[String(s).toLowerCase()] || 0; }
function daysBetween(fromIso, toIso) {
  return Math.round((Date.parse(toIso + "T00:00:00Z") - Date.parse(fromIso + "T00:00:00Z")) / 86400000);
}
// Today's date in Singapore
function todaySG(now) {
  var t = new Date((now || new Date()).getTime() + 8 * 3600 * 1000);
  return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

function csvCell(v) {
  if (v === null || v === undefined) return "";
  var s = String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function toCSV(header, rows) {
  var lines = [header.map(csvCell).join(",")];
  rows.forEach(function (r) { lines.push(header.map(function (h) { return csvCell(r[h]); }).join(",")); });
  return lines.join("\n") + "\n";
}

// ---- Front matter --------------------------------------------
function parseFrontMatter(text) {
  var m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return { data: {}, body: text };
  var data = {};
  m[1].split(/\r?\n/).forEach(function (line) {
    var kv = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (!kv) return;
    var v = kv[2].replace(/\s+#.*$/, "").trim();              // drop "# comments"
    v = v.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    if (v === "true") v = true; else if (v === "false") v = false;
    data[kv[1]] = v;
  });
  return { data: data, body: text.slice(m[0].length) };
}

// "Oct 2026" or "October 2026" or "2026-10" or "2026-10-12" -> { y, m }
function parseMonthYear(s) {
  if (!s) return null;
  s = String(s).trim();
  var a = /^([A-Za-z]+)\s+(\d{4})$/.exec(s);
  if (a && monthNum(a[1])) return { y: +a[2], m: monthNum(a[1]) };
  var b = /^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/.exec(s);
  if (b) return { y: +b[1], m: +b[2] };
  return null;
}
function addMonths(my, n) {
  var total = my.y * 12 + (my.m - 1) + n;
  return { y: Math.floor(total / 12), m: (total % 12) + 1 };
}

// Strip comments so TODOs and links inside them don't count
function stripComments(body) {
  return body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, "");
}

function countTodos(body) {
  var n = 0;
  stripComments(body).split(/\r?\n/).forEach(function (line) {
    if (/^\s*>?\s*TODO\b/.test(line)) n++;
  });
  return n;
}

// ---- Deadline boxes ------------------------------------------
// Returns [{ boxIndex, line, firstLine, items: [{ text, date, kind }] }]
function findDeadlineBoxes(body) {
  var lines = stripComments(body).split(/\r?\n/);
  var boxes = [];
  for (var i = 0; i < lines.length; i++) {
    if (!/^\s*\{:\s*\.deadline\s*\}\s*$/.test(lines[i])) continue;
    var j = i + 1, text = [];
    while (j < lines.length && /^\s*>/.test(lines[j])) { text.push(lines[j].replace(/^\s*>\s?/, "")); j++; }
    if (!text.length) continue;
    var joined = text.join("\n");
    var first = text[0].replace(/\*\*/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").trim();
    boxes.push({ boxIndex: boxes.length + 1, line: i + 1, firstLine: first.slice(0, 90), items: extractDates(joined) });
  }
  return boxes;
}

// Finds dates in free text. A range counts once, by its end date.
function extractDates(text) {
  var t = text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")   // [label](url) -> label
    .replace(/[*_`]/g, "")
    .replace(/ /g, " ");
  var items = [];
  var M = MONTH_RE, SEP = "\\s*(?:–|—|-|to|until)\\s*";
  var patterns = [
    // 21 Nov 2026 to 28 Feb 2027
    { re: new RegExp("\\b(\\d{1,2})\\s+" + M + ",?\\s+(\\d{4})" + SEP + "(\\d{1,2})\\s+" + M + ",?\\s+(\\d{4})\\b", "gi"),
      fn: function (g) { return { y: +g[6], m: monthNum(g[5]), d: +g[4], kind: "range" }; } },
    // 30 Sep to 20 Nov 2026
    { re: new RegExp("\\b(\\d{1,2})\\s+" + M + SEP + "(\\d{1,2})\\s+" + M + "\\s+(\\d{4})\\b", "gi"),
      fn: function (g) { return { y: +g[5], m: monthNum(g[4]), d: +g[3], kind: "range" }; } },
    // 16–22 Jul 2026
    { re: new RegExp("\\b(\\d{1,2})" + SEP + "(\\d{1,2})\\s+" + M + "\\s+(\\d{4})\\b", "gi"),
      fn: function (g) { return { y: +g[4], m: monthNum(g[3]), d: +g[2], kind: "range" }; } },
    // 15 Oct 2026
    { re: new RegExp("\\b(\\d{1,2})\\s+" + M + ",?\\s+(\\d{4})\\b", "gi"),
      fn: function (g) { return { y: +g[3], m: monthNum(g[2]), d: +g[1], kind: "date" }; } },
    // mid-March 2027, early Jan 2027, late Feb 2027
    { re: new RegExp("\\b(early|mid|late)[-\\s]+" + M + "\\s+(\\d{4})\\b", "gi"),
      fn: function (g) {
        var y = +g[3], m = monthNum(g[2]), w = g[1].toLowerCase();
        return { y: y, m: m, d: w === "early" ? 10 : w === "mid" ? 15 : daysInMonth(y, m), kind: "approximate" };
      } },
    // 12 December (no year)
    { re: new RegExp("\\b(\\d{1,2})\\s+" + M + "\\b(?!,?\\s+\\d{4})", "gi"),
      fn: function (g) { return { y: 0, m: monthNum(g[2]), d: +g[1], kind: "no year" }; } }
  ];
  patterns.forEach(function (p) {
    t = t.replace(p.re, function () {
      var g = Array.prototype.slice.call(arguments, 0, -2);
      var r = p.fn(g);
      if (r.m && r.d >= 1 && r.d <= 31) {
        items.push({ text: g[0], date: r.y ? iso(r.y, r.m, Math.min(r.d, daysInMonth(r.y, r.m))) : "", kind: r.kind });
      }
      return " ".repeat(g[0].length);   // so shorter patterns don't match it again
    });
  });
  return items;
}

function boxStatus(items, today) {
  var dated = items.filter(function (it) { return it.date; });
  if (!dated.length) return { status: "No dates to check", next: "", daysToNext: "" };
  var upcoming = dated.filter(function (it) { return it.date >= today; }).map(function (it) { return it.date; }).sort();
  var passed = dated.length - upcoming.length;
  if (!upcoming.length) return { status: "All dates passed", next: "", daysToNext: "" };
  var d = daysBetween(today, upcoming[0]);
  if (passed) return { status: "Some dates passed", next: upcoming[0], daysToNext: d };
  return { status: d <= COMING_UP_DAYS ? "Coming up" : "OK", next: upcoming[0], daysToNext: d };
}

// ---- Links and anchors ---------------------------------------
// GitHub-style heading ids (what kramdown's GFM parser produces)
function slugify(heading) {
  return heading
    .replace(/\{[:#][^}]*\}\s*$/, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[*_`]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

function collectAnchors(body) {
  var ids = {}, seen = {};
  var lines = stripComments(body).split(/\r?\n/);
  lines.forEach(function (line, i) {
    var h = /^#{1,6}\s+(.*?)\s*$/.exec(line);
    if (h) {
      var explicit = /\{#([\w-]+)\}\s*$/.exec(h[1]);
      if (explicit) { ids[explicit[1]] = true; return; }
      // Kramdown block attribute on the next line: "## Help from MOE" then "{: #moe-ecg }"
      var ial = /^\{:[^}]*#([\w-]+)[^}]*\}\s*$/.exec(lines[i + 1] || "");
      if (ial) { ids[ial[1]] = true; return; }
      var s = slugify(h[1]);
      if (seen[s] !== undefined) { seen[s]++; ids[s + "-" + seen[s]] = true; }
      else { seen[s] = 0; ids[s] = true; }
    }
  });
  var re = /\bid=["']([^"']+)["']/g, m;
  while ((m = re.exec(body))) ids[m[1]] = true;
  return ids;
}

function extractLinks(body) {
  var out = [];
  var lines = stripComments(body).split(/\r?\n/);
  lines.forEach(function (line, i) {
    var re = /!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g, m;
    while ((m = re.exec(line))) out.push({ url: m[1], line: i + 1 });
    var re2 = /\bhref=["']([^"']+)["']/g;
    while ((m = re2.exec(line))) out.push({ url: m[1], line: i + 1 });
  });
  return out;
}

function classifyLink(url) {
  if (/^mailto:|^tel:/i.test(url)) return "email";
  if (/^https?:\/\//i.test(url)) return "external";
  if (url.charAt(0) === "#") return "same page";
  if (/\{\{|\{%/.test(url)) return "template";
  return "internal";
}

// Checks one internal link against the files in the repository
function checkInternal(url, fromFile, root, anchorsByFile, baseurl) {
  var parts = url.split("#");
  var target = decodeURI(parts[0]);
  var anchor = parts[1] || "";
  var file;
  if (!target) file = fromFile;
  else {
    if (baseurl && target.indexOf(baseurl + "/") === 0) target = target.slice(baseurl.length + 1);
    target = target.replace(/^\//, "");
    var rel = path.normalize(path.join(path.dirname(fromFile), target));
    if (target === "" || /\/$/.test(target)) rel = path.join(rel, "index.md");
    var candidates = [rel, rel.replace(/\.html$/, ".md"), rel + ".md"];
    file = null;
    for (var i = 0; i < candidates.length; i++) {
      if (fs.existsSync(path.join(root, candidates[i])) && fs.statSync(path.join(root, candidates[i])).isFile()) { file = candidates[i]; break; }
    }
    if (!file && fs.existsSync(path.join(root, rel)) && fs.statSync(path.join(root, rel)).isDirectory()) return { status: "OK", detail: "folder" };
    if (!file) return { status: "Broken", detail: "No such page or file" };
  }
  if (anchor && /\.md$/.test(file)) {
    var ids = anchorsByFile[file];
    if (ids && !ids[anchor]) return { status: "Broken", detail: "No section #" + anchor };
  }
  return { status: "OK", detail: "" };
}

function fetchStatus(url) {
  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, LINK_TIMEOUT_MS);
  return fetch(url, {
    method: "GET",
    redirect: "follow",
    signal: ctrl.signal,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ECG-RVHS-link-check; +https://github.com/Arkdein/ecg-site)",
      "Accept": "text/html,application/pdf,*/*;q=0.8"
    }
  }).then(function (res) {
    clearTimeout(timer);
    try { if (res.body && res.body.cancel) res.body.cancel(); } catch (e) { /* ignore */ }
    return { code: res.status, finalUrl: res.url };
  }, function (err) {
    clearTimeout(timer);
    return { code: 0, error: err && err.name === "AbortError" ? "Timed out" : String((err && err.cause && err.cause.code) || (err && err.message) || err) };
  });
}

function externalVerdict(r) {
  if (r.code === 0) {
    if (/ENOTFOUND|EAI_AGAIN/.test(r.error)) return { status: "Broken", detail: "Website not found (" + r.error + ")" };
    return { status: "Check by hand", detail: r.error };
  }
  if (r.finalUrl && /accounts\.google\.com|login\.microsoftonline\.com/.test(r.finalUrl)) return { status: "Needs sign-in", detail: "Opens a sign-in page" };
  // Sites that send a missing page to their own "not found" page (MOE: /page-not-found)
  if (r.finalUrl && /\/(page-)?not-found\b|\/404(\.html?)?(?:[?#]|$)/i.test(r.finalUrl)) return { status: "Broken", detail: "Goes to a 'page not found' page" };
  // 202 = "accepted", not a loaded page. moe.gov.sg answers link checkers this way even for
  // pages that no longer exist, so it can't count as OK (found 14 Oct 2026).
  if (r.code === 202) return { status: "Check by hand", detail: "Site answered 202 (doesn't show the page to link checkers)" };
  if (r.code >= 200 && r.code < 400) return { status: "OK", detail: String(r.code) };
  if (r.code === 404 || r.code === 410) return { status: "Broken", detail: "Page not found (" + r.code + ")" };
  return { status: "Check by hand", detail: "Site answered " + r.code + " (may block link checkers)" };
}

function runPool(items, limit, worker) {
  var i = 0, results = new Array(items.length);
  function next() {
    if (i >= items.length) return Promise.resolve();
    var k = i++;
    return worker(items[k]).then(function (r) { results[k] = r; return next(); });
  }
  var starters = [];
  for (var n = 0; n < Math.min(limit, items.length); n++) starters.push(next());
  return Promise.all(starters).then(function () { return results; });
}

// ---- Git dates -----------------------------------------------
function lastChanged(root, file) {
  try {
    var out = childProcess.execFileSync("git", ["log", "-1", "--format=%cI", "--", file], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return out || "";
  } catch (e) { return ""; }
}

// ---- Main ----------------------------------------------------
function readConfig(root) {
  var cfg = {};
  try {
    fs.readFileSync(path.join(root, "_config.yml"), "utf8").split(/\r?\n/).forEach(function (line) {
      var kv = /^([a-z_]+):\s*"?([^"#]*)"?/.exec(line);
      if (kv) cfg[kv[1]] = kv[2].trim();
    });
  } catch (e) { /* no config */ }
  return cfg;
}

function pageUrl(file, baseurl) {
  var name = file.replace(/\.md$/, "");
  return (baseurl || "") + "/" + (name === "index" ? "" : name + ".html");
}

function analyse(root, options) {
  options = options || {};
  var today = options.today || todaySG();
  var cfg = readConfig(root);
  var baseurl = cfg.baseurl || "";
  var siteUrl = (cfg.url || "") + baseurl;

  var files = fs.readdirSync(root).filter(function (f) { return /\.md$/.test(f) && SKIP_FILES.indexOf(f) === -1; }).sort();
  var pages = files.map(function (f) {
    var text = fs.readFileSync(path.join(root, f), "utf8");
    var fm = parseFrontMatter(text);
    return { file: f, data: fm.data, body: fm.body };
  });
  var anchorsByFile = {};
  pages.forEach(function (p) { anchorsByFile[p.file] = collectAnchors(p.body); });
  var titleByFile = {};
  pages.forEach(function (p) { titleByFile[p.file] = p.data.title || p.file; });

  // Deadlines
  var deadlineRows = [];
  var boxSummaryByFile = {};
  pages.forEach(function (p) {
    findDeadlineBoxes(p.body).forEach(function (box) {
      var st = boxStatus(box.items, today);
      (boxSummaryByFile[p.file] = boxSummaryByFile[p.file] || []).push(st.status);
      var base = { page_title: titleByFile[p.file], file: p.file, box: box.boxIndex, box_starts: box.firstLine, box_status: st.status, box_next_date: st.next, box_days_to_next: st.daysToNext };
      if (!box.items.length) deadlineRows.push(Object.assign({}, base, { date_text: "", date: "", kind: "", date_status: "" }));
      box.items.forEach(function (it) {
        var ds = !it.date ? "Not checked (no year)" : it.date < today ? "Passed" : daysBetween(today, it.date) <= COMING_UP_DAYS ? "Coming up" : "Upcoming";
        deadlineRows.push(Object.assign({}, base, { date_text: it.text.trim(), date: it.date, kind: it.kind, date_status: ds, days_left: it.date ? daysBetween(today, it.date) : "" }));
      });
    });
  });

  // Links
  var linkRows = [];
  pages.forEach(function (p) {
    extractLinks(p.body).forEach(function (l) {
      var kind = classifyLink(l.url);
      var row = { page_title: titleByFile[p.file], file: p.file, line: l.line, link: l.url, kind: kind, status: "", detail: "" };
      if (kind === "internal" || kind === "same page") {
        var r = checkInternal(kind === "same page" ? l.url : l.url, p.file, root, anchorsByFile, baseurl);
        row.status = r.status; row.detail = r.detail;
      } else if (kind === "email" || kind === "template") {
        row.status = "Not checked";
      } else {
        row.status = options.noExternal ? "Not checked" : "pending";
      }
      linkRows.push(row);
    });
  });

  return { today: today, cfg: cfg, baseurl: baseurl, siteUrl: siteUrl, pages: pages, titleByFile: titleByFile, deadlineRows: deadlineRows, boxSummaryByFile: boxSummaryByFile, linkRows: linkRows };
}

function finish(root, a, outDir, now) {
  var today = a.today;
  var brokenByFile = {}, checkByFile = {};
  a.linkRows.forEach(function (l) {
    if (l.status === "Broken") brokenByFile[l.file] = (brokenByFile[l.file] || 0) + 1;
    if (l.status === "Check by hand") checkByFile[l.file] = (checkByFile[l.file] || 0) + 1;
  });

  var changed = {};
  a.pages.forEach(function (p) { changed[p.file] = lastChanged(root, p.file); });

  var pageRows = a.pages.map(function (p) {
    var d = p.data;
    var reviewed = parseMonthYear(d.last_reviewed);
    var due = reviewed ? addMonths(reviewed, REVIEW_EVERY_MONTHS) : null;
    var dueIso = due ? iso(due.y, due.m, daysInMonth(due.y, due.m)) : "";
    var reviewStatus = !reviewed ? "No review date" : dueIso < today ? "Review overdue" : daysBetween(today, dueIso) <= DUE_SOON_DAYS ? "Review due soon" : "OK";

    var translationFile = "", translationStatus = "";
    if (d.translation) {
      translationFile = String(d.translation).replace(/^\//, "").replace(/\.html$/, ".md");
      var mine = changed[p.file], theirs = changed[translationFile];
      if (!fs.existsSync(path.join(root, translationFile))) translationStatus = "Translation missing";
      else if (mine && theirs) {
        translationStatus = mine > theirs ? "Changed after " + (a.titleByFile[translationFile] || translationFile) : "In step";
      }
    }

    var boxes = a.boxSummaryByFile[p.file] || [];
    var deadlineStatus = !boxes.length ? "" :
      boxes.indexOf("All dates passed") > -1 ? "All dates passed" :
      boxes.indexOf("Some dates passed") > -1 ? "Some dates passed" :
      boxes.indexOf("Coming up") > -1 ? "Coming up" : "OK";

    var hidden = d.nav_exclude === true;
    var portfolio = d.portfolio || "";
    var flags = [];
    if (reviewStatus === "Review overdue" || reviewStatus === "No review date") flags.push(reviewStatus);
    if (/^To be assigned$/i.test(portfolio) || !portfolio) flags.push("No portfolio");
    if (/dates passed/.test(deadlineStatus)) flags.push("Deadline box: " + deadlineStatus.toLowerCase());
    if (brokenByFile[p.file]) flags.push(brokenByFile[p.file] + " broken link" + (brokenByFile[p.file] > 1 ? "s" : ""));
    if (/^Changed after/.test(translationStatus) || translationStatus === "Translation missing") flags.push(translationStatus);

    return {
      page_title: d.title || p.file,
      file: p.file,
      page_path: pageUrl(p.file, a.baseurl),
      page_url: a.siteUrl + pageUrl(p.file, "").replace(/^\//, "/"),
      section: d.grand_parent ? d.grand_parent + " › " + d.parent : (d.parent || ""),
      hidden: hidden ? "Yes" : "No",
      language: d.lang || "en",
      owner: d.owner || "",
      portfolio: portfolio,
      last_reviewed: d.last_reviewed || "",
      review_due: dueIso,
      review_status: reviewStatus,
      todo_count: countTodos(p.body),
      deadline_status: deadlineStatus,
      broken_links: brokenByFile[p.file] || 0,
      links_to_check_by_hand: checkByFile[p.file] || 0,
      translation_of: translationFile,
      translation_status: translationStatus,
      last_changed: changed[p.file] ? changed[p.file].slice(0, 10) : "",
      needs_action: flags.join("; ")
    };
  });

  var generated = (now || new Date()).toISOString();
  var summary = [{
    generated_at_utc: generated,
    checked_for_date_sgt: today,
    pages: pageRows.length,
    pages_needing_action: pageRows.filter(function (r) { return r.needs_action; }).length,
    todos: pageRows.reduce(function (s, r) { return s + r.todo_count; }, 0),
    reviews_overdue: pageRows.filter(function (r) { return r.review_status === "Review overdue"; }).length,
    reviews_due_soon: pageRows.filter(function (r) { return r.review_status === "Review due soon"; }).length,
    deadline_dates_passed: a.deadlineRows.filter(function (r) { return r.date_status === "Passed"; }).length,
    deadline_dates_coming_up: a.deadlineRows.filter(function (r) { return r.date_status === "Coming up"; }).length,
    broken_links: a.linkRows.filter(function (r) { return r.status === "Broken"; }).length,
    links_to_check_by_hand: a.linkRows.filter(function (r) { return r.status === "Check by hand"; }).length,
    translations_out_of_step: pageRows.filter(function (r) { return /^Changed after|missing/.test(r.translation_status); }).length,
    hidden_pages: pageRows.filter(function (r) { return r.hidden === "Yes"; }).length,
    site_draft_mode: a.cfg.draft === "true" ? "Yes" : "No"
  }];

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "pages.csv"), toCSV(Object.keys(pageRows[0]), pageRows));
  fs.writeFileSync(path.join(outDir, "deadlines.csv"), toCSV(
    ["page_title", "file", "box", "box_starts", "box_status", "box_next_date", "box_days_to_next", "date_text", "date", "kind", "date_status", "days_left"], a.deadlineRows));
  fs.writeFileSync(path.join(outDir, "links.csv"), toCSV(["page_title", "file", "line", "link", "kind", "status", "detail"], a.linkRows));
  fs.writeFileSync(path.join(outDir, "summary.csv"), toCSV(Object.keys(summary[0]), summary));
  return { pageRows: pageRows, summary: summary[0] };
}

function main() {
  var args = process.argv.slice(2);
  var outDir = "site-health", noExternal = false, today = null;
  for (var i = 0; i < args.length; i++) {
    if (args[i] === "--out") outDir = args[++i];
    else if (args[i] === "--no-external") noExternal = true;
    else if (args[i] === "--today") today = args[++i];
  }
  var root = path.resolve(__dirname, "..");
  var a = analyse(root, { noExternal: noExternal, today: today });

  var externals = {};
  a.linkRows.forEach(function (l) { if (l.status === "pending") externals[l.link] = true; });
  var urls = Object.keys(externals);
  return runPool(urls, LINK_CONCURRENCY, fetchStatus).then(function (results) {
    var verdict = {};
    urls.forEach(function (u, k) { verdict[u] = externalVerdict(results[k]); });
    a.linkRows.forEach(function (l) {
      if (l.status === "pending") { l.status = verdict[l.link].status; l.detail = verdict[l.link].detail; }
    });
    var res = finish(root, a, path.resolve(outDir));
    var s = res.summary;
    console.log("Site health for " + s.checked_for_date_sgt + ": " + s.pages + " pages, " +
      s.pages_needing_action + " need action, " + s.todos + " TODOs, " +
      s.deadline_dates_passed + " passed deadline dates, " + s.broken_links + " broken links, " +
      s.links_to_check_by_hand + " links to check by hand.");
  });
}

module.exports = {
  parseFrontMatter: parseFrontMatter, parseMonthYear: parseMonthYear, addMonths: addMonths,
  countTodos: countTodos, findDeadlineBoxes: findDeadlineBoxes, extractDates: extractDates,
  boxStatus: boxStatus, slugify: slugify, collectAnchors: collectAnchors, extractLinks: extractLinks,
  classifyLink: classifyLink, externalVerdict: externalVerdict, toCSV: toCSV, todaySG: todaySG,
  analyse: analyse, finish: finish
};

if (require.main === module) {
  main().catch(function (e) { console.error(e); process.exit(1); });
}

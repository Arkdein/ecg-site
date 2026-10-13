/**
 * ECG@RVHS Webmaster's Dashboard — data Sheet
 * ------------------------------------------------------------------
 * Builds and refreshes the Google Sheet that the Looker Studio
 * dashboard reads. Not part of the website. See DASHBOARD.md.
 *
 * What it does
 *   setup()        Run once. Creates the Sheet "ECG@RVHS Webmaster's
 *                  Dashboard (data)", adds Status / Assigned to /
 *                  Replied on columns to the "Send us a question"
 *                  responses, and refreshes the Sheet every hour.
 *   refresh()      Runs every hour by itself. Copies in:
 *                    - the nightly site check from GitHub (pages,
 *                      deadline boxes, links)
 *                    - "Was this page helpful?" answers
 *                    - "Send us a question": date, topic, status only
 *                      (never the question text, names or emails)
 *                    - Current Opportunities rows waiting for approval
 *                  and rebuilds the "Needs action" list.
 *   addQuestionAlert()  Optional. Emails ALERT_EMAILS when a question
 *                  comes in (date and topic only, plus a link).
 *
 * How to install (about 5 minutes, on the account that owns the forms)
 *   1. Go to script.google.com > New project. Name it
 *      "ECG Webmaster Dashboard".
 *   2. Delete what's there, paste this whole file, and save.
 *   3. Fill in QUESTIONS_SHEET_URL (and OPPORTUNITIES_SHEET_URL) below.
 *   4. Choose "setup" in the function menu and click Run. Allow access.
 *   5. Open Executions > the run's log for the new Sheet's link.
 * ------------------------------------------------------------------
 */

const CONFIG = {
  HUB_NAME: "ECG@RVHS Webmaster's Dashboard (data)",

  // Nightly site check, published by GitHub (.github/workflows/site-health.yml)
  SITE_HEALTH_URL: "https://raw.githubusercontent.com/Arkdein/ecg-site/site-health/",

  // "Was this page helpful?" responses Sheet
  FEEDBACK_SHEET_URL: "https://docs.google.com/spreadsheets/d/1Adyi1lBNARXOA7R7k3nrPYhNNlkjkHdN9ni3jTwJXu4/edit",

  // "Send us a question" responses Sheet (Get Help page)          ← EDIT
  // In the form: Responses > Link to Sheets, then paste that Sheet's address.
  QUESTIONS_SHEET_URL: "https://docs.google.com/spreadsheets/d/11FgLceOWVQPTzcZHJ9E_YD4a345jUl64V6JSGCboFTg/edit",

  // "ECG Current Opportunities (website feed)" Sheet (optional)   ← EDIT
  OPPORTUNITIES_SHEET_URL: "https://docs.google.com/spreadsheets/d/1gzyrknzt8X-IkyRL9M_a_gcOufVxfKbhiXqkvqGSru8/edit",

  // Who gets an email for each new question (addQuestionAlert).   ← EDIT
  // MOE addresses, separated by commas.
  ALERT_EMAILS: "",

  // Questions sent before this date only count as open if Status says so.
  // (Before the dashboard, replies were noted in the Timestamp cell, and not always.)
  TRACK_QUESTIONS_FROM: "2026-01-01",

  FEEDBACK_DAYS: 60,           // feedback shown in "Needs action" for this many days
  QUESTION_URGENT_DAYS: 3,     // an unanswered question becomes "high" after this many days
  CLOSING_SOON_DAYS: 7,        // a listing is "closing soon" this many days before it closes
};

const STATUS_CHOICES = ["New", "With someone", "Answered", "No reply needed"];
const CLOSED_STATUSES = ["Answered", "Answered (noted)", "No reply needed", "Not tracked"];
// How the team noted replies before the dashboard (in the Timestamp cell or the remarks column)
const ANSWERED_RE = /answered|replied|responded|spoken|followed up|met with|have met/i;
function isOpen_(q) { return CLOSED_STATUSES.indexOf(q.status) === -1; }
const WITHDRAWAL_RE = /withdraw|remove (?:my|me)|take (?:it |me |my )?(?:down|off)|alumni gallery|gallery wall/i;

// ===================================================================
// Setup
// ===================================================================
function setup() {
  const hub = getHub_(true);
  ensureTabs_(hub);
  if (CONFIG.QUESTIONS_SHEET_URL) prepareQuestionsSheet_();
  refresh();
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === "refresh")
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("refresh").timeBased().everyHours(1).create();
  Logger.log("Dashboard Sheet ready: " + hub.getUrl());
  Logger.log("It refreshes every hour. Next: connect it to Looker Studio (DASHBOARD.md).");
}

function getHub_(create) {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty("HUB_ID");
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) { /* deleted: make a new one */ }
  }
  if (!create) throw new Error("Run setup() first.");
  const ss = SpreadsheetApp.create(CONFIG.HUB_NAME);
  ss.setSpreadsheetTimeZone("Asia/Singapore");
  props.setProperty("HUB_ID", ss.getId());
  return ss;
}

const TABS = [
  "Read me", "Needs action", "Summary", "Pages", "Deadlines", "Links",
  "Feedback", "Questions", "Opportunities", "Launch checklist"
];

function ensureTabs_(ss) {
  TABS.forEach((name, i) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name, i);
  });
  const first = ss.getSheetByName("Sheet1");
  if (first && ss.getSheets().length > 1) ss.deleteSheet(first);

  const readMe = ss.getSheetByName("Read me");
  readMe.clear();
  readMe.getRange(1, 1, 13, 2).setValues([
    ["ECG@RVHS Webmaster's Dashboard (data)", ""],
    ["This Sheet feeds the Looker Studio dashboard. It refreshes itself every hour.", ""],
    ["Don't type in any tab except Launch checklist. The others are replaced on every refresh.", ""],
    ["", ""],
    ["Tab", "What it holds"],
    ["Needs action", "Everything that needs someone, most urgent first"],
    ["Summary", "Totals for the top of the dashboard, and when the data was last checked"],
    ["Pages / Deadlines / Links", "The nightly site check from GitHub (one row per page, deadline date, link)"],
    ["Feedback", "'Was this page helpful?' answers (no names are collected)"],
    ["Questions", "'Send us a question': date, topic and status only. Read and answer questions in the responses Sheet."],
    ["Opportunities", "Current Opportunities rows and whether they are waiting for approval"],
    ["Launch checklist", "Go-live tasks. Tick Done here; the dashboard shows what's left."],
    ["Made by", "scripts/dashboard-sheet.gs in the Arkdein/ecg-site repository"],
  ]);
  readMe.getRange("A1").setFontWeight("bold").setFontSize(14);
  readMe.getRange("A5:B5").setFontWeight("bold");
  readMe.setColumnWidth(1, 220).setColumnWidth(2, 640);

  const check = ss.getSheetByName("Launch checklist");
  if (check.getLastRow() < 2) {
    const rows = [
      ["Item", "Who", "Due", "Done", "Notes"],
      ["School approval to use the crest", "Randall", "", false, "Corporate Communications / School Leadership"],
      ["Official vector crest received", "Randall", "", false, ""],
      ["School OK for Google Analytics, and wording of the analytics note", "Randall", "", false, ""],
      ["Google Analytics: Google signals off, data retention 14 months", "Randall", "", false, ""],
      ["Alumni Gallery: retention period decided", "ECG Committee", "", false, ""],
      ["Go / no-go decision", "ECG Committee", new Date(2027, 0, 6), false, ""],
      ["Switch to the new site (draft: false in _config.yml)", "Randall", new Date(2027, 0, 11), false, "Turns off the draft banner and no-indexing"],
      ["'Moved' banners on the old Google Site", "Randall", new Date(2027, 0, 11), false, ""],
      ["Hand over dashboard, forms and Sheets to the ECG shared account", "Randall", "", false, ""],
    ];
    check.getRange(1, 1, rows.length, 5).setValues(rows);
    check.getRange(2, 4, 50, 1).insertCheckboxes();
    check.getRange(2, 3, 50, 1).setNumberFormat("d mmm yyyy");
    check.getRange("A1:E1").setFontWeight("bold");
    check.setFrozenRows(1);
    check.setColumnWidth(1, 420).setColumnWidth(5, 320);
  }
}

// Adds Status / Assigned to / Replied on to the question responses.
function prepareQuestionsSheet_() {
  const sh = formResponsesSheet_(SpreadsheetApp.openByUrl(CONFIG.QUESTIONS_SHEET_URL));
  const lastCol = sh.getLastColumn();
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  if (headers.indexOf("Status") > -1) return;
  const c = lastCol + 1;
  sh.getRange(1, c, 1, 3).setValues([["Status", "Assigned to", "Replied on"]])
    .setFontWeight("bold").setBackground("#fff2cc");
  sh.getRange(2, c, 999, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUS_CHOICES, true).setAllowInvalid(false).build());
  sh.getRange(2, c + 2, 999, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build())
    .setNumberFormat("d mmm yyyy");
  sh.getRange(1, c).setNote("Set to Answered once you have replied, and fill in Replied on. " +
    "Blank = New, unless the Timestamp or remarks already say answered/replied.");
}

// ===================================================================
// Refresh (every hour)
// ===================================================================
function refresh() {
  const hub = getHub_(false);
  const now = new Date();
  const notes = [];

  const site = {};
  ["summary", "pages", "deadlines", "links"].forEach(name => {
    try {
      site[name] = fetchCsv_(CONFIG.SITE_HEALTH_URL + name + ".csv");
      writeTable_(hub.getSheetByName(name.charAt(0).toUpperCase() + name.slice(1)), site[name]);
    } catch (e) {
      notes.push("Site check (" + name + ") not refreshed: " + e.message);
      site[name] = readTable_(hub.getSheetByName(name.charAt(0).toUpperCase() + name.slice(1)));
    }
  });

  let feedback = [], questions = [], opps = [];
  try { feedback = refreshFeedback_(hub); } catch (e) { notes.push("Feedback not refreshed: " + e.message); }
  if (CONFIG.QUESTIONS_SHEET_URL) {
    try { questions = refreshQuestions_(hub, now); } catch (e) { notes.push("Questions not refreshed: " + e.message); }
  } else notes.push("Questions: QUESTIONS_SHEET_URL is empty in the script.");
  if (CONFIG.OPPORTUNITIES_SHEET_URL) {
    try { opps = refreshOpportunities_(hub, now); } catch (e) { notes.push("Opportunities not refreshed: " + e.message); }
  }

  const checklist = readTable_(hub.getSheetByName("Launch checklist"));
  const actions = buildActions_(site, feedback, questions, opps, checklist, now);
  writeTable_(hub.getSheetByName("Needs action"), actions);

  // Summary: the site check's totals, plus this Sheet's own
  const sum = (site.summary && site.summary[0]) ? Object.assign({}, site.summary[0]) : {};
  sum.sheet_refreshed_at = now;
  sum.questions_open = questions.filter(isOpen_).length;
  sum.questions_oldest_waiting_days = questions.filter(isOpen_).reduce((m, q) => Math.max(m, q.days_waiting || 0), 0);
  sum.withdrawal_requests_open = questions.filter(q => q.type === "Alumni Gallery withdrawal" && isOpen_(q)).length;
  sum.feedback_last_30_days = feedback.filter(f => f.received && daysBetween_(f.received, now) <= 30).length;
  sum.feedback_no_last_30_days = feedback.filter(f => f.received && daysBetween_(f.received, now) <= 30 && f.answer === "No").length;
  sum.opportunities_awaiting_approval = opps.filter(o => o.status === "Awaiting approval").length;
  sum.checklist_left = checklist.filter(c => c["Item"] && c["Done"] !== true).length;
  sum.needs_action_high = actions.filter(a => a.priority === "1 High").length;
  sum.needs_action_total = actions.length;
  sum.refresh_notes = notes.join(" | ");
  writeTable_(hub.getSheetByName("Summary"), [sum]);
}

function refreshFeedback_(hub) {
  const sh = formResponsesSheet_(SpreadsheetApp.openByUrl(CONFIG.FEEDBACK_SHEET_URL));
  const values = sh.getDataRange().getValues();
  const head = values.shift().map(String);
  const col = re => head.findIndex(h => re.test(h));
  const cTime = col(/timestamp/i), cPage = col(/^page/i), cAns = col(/helpful|yes/i),
        cComment = col(/comment|tell us|why|improve/i), cWho = col(/i am|you are|role/i);
  const rows = values.filter(r => r[cTime]).map(r => ({
    received: r[cTime],
    page_title: cPage > -1 ? String(r[cPage]) : "",
    answer: cAns > -1 ? String(r[cAns]) : "",
    helpful_score: cAns > -1 ? ({ Yes: 1, Partly: 0.5, No: 0 })[String(r[cAns])] : "",
    comment: cComment > -1 ? String(r[cComment]) : "",
    visitor: cWho > -1 ? String(r[cWho]) : "",
  }));
  writeTable_(hub.getSheetByName("Feedback"), rows,
    ["received", "page_title", "answer", "helpful_score", "comment", "visitor"]);
  return rows;
}

function refreshQuestions_(hub, now) {
  const ss = SpreadsheetApp.openByUrl(CONFIG.QUESTIONS_SHEET_URL);
  const sh = formResponsesSheet_(ss);
  const values = sh.getDataRange().getValues();
  const head = values.shift().map(String);
  const cols = re => head.map((h, i) => re.test(h) ? i : -1).filter(i => i > -1);
  const first = (r, idx) => { for (const i of idx) { const v = String(r[i]).trim(); if (v) return v; } return ""; };

  // The form branches by who is asking (student / graduate / parent), so the
  // topic and question each appear in several columns: take whichever is filled.
  const cTime = head.findIndex(h => /timestamp/i.test(h));
  const cStatus = head.indexOf("Status"), cAssigned = head.indexOf("Assigned to"), cReplied = head.indexOf("Replied on");
  const topicCols = cols(/with regards to|topic|regarding|category/i);
  const whoCols = cols(/^i am/i);
  const remarkCols = cols(/remark/i);
  // The question text is read only to spot withdrawal requests. It is never copied.
  const textCols = cols(/my question:?$|^question|message/i);
  const trackFrom = toDate_(CONFIG.TRACK_QUESTIONS_FROM);
  const base = ss.getUrl().replace(/\/edit.*$/, "") + "/edit#gid=" + sh.getSheetId() + "&range=A";

  const rows = [];
  values.forEach((r, i) => {
    const stamp = parseStamp_(r[cTime]);
    if (!stamp.date) return;
    const notes = stamp.note + " " + remarkCols.map(c => String(r[c])).join(" ");
    let status;
    if (cStatus > -1 && String(r[cStatus]).trim()) status = String(r[cStatus]).trim();
    else if (ANSWERED_RE.test(notes)) status = "Answered (noted)";
    else if (trackFrom && stamp.date < trackFrom) status = "Not tracked";
    else status = "New";
    const q = {
      received: stamp.date,
      topic: first(r, topicCols),
      asked_by: shortWho_(first(r, whoCols)),
      type: WITHDRAWAL_RE.test(textCols.map(c => String(r[c])).join(" ")) ? "Alumni Gallery withdrawal" : "Question",
      status: status,
      assigned_to: cAssigned > -1 ? String(r[cAssigned]) : "",
      replied_on: cReplied > -1 && r[cReplied] ? r[cReplied] : "",
      days_waiting: "",
      open_in_sheet: base + (i + 2),
    };
    if (isOpen_(q)) q.days_waiting = daysBetween_(stamp.date, now);
    rows.push(q);
  });
  rows.sort((a, b) => b.received - a.received);
  writeTable_(hub.getSheetByName("Questions"), rows,
    ["received", "topic", "asked_by", "type", "status", "assigned_to", "replied_on", "days_waiting", "open_in_sheet"]);
  return rows;
}

// A Timestamp cell is a date, or (when someone typed a note into it) text
// such as "21/04/2023 23:28:28\n\nanswered: rachel".
function parseStamp_(v) {
  if (v instanceof Date) return { date: v, note: "" };
  const s = String(v || "");
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(s);
  if (!m) return { date: null, note: s };
  return {
    date: new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)),
    note: s.slice(m[0].length),
  };
}

function shortWho_(s) {
  if (/parent/i.test(s)) return "Parent";
  if (/graduated/i.test(s)) return "Recent graduate";
  if (/currently studying|current/i.test(s)) return "Current student";
  return s;
}

function refreshOpportunities_(hub, now) {
  const ss = SpreadsheetApp.openByUrl(CONFIG.OPPORTUNITIES_SHEET_URL);
  const sh = ss.getSheetByName("Entry") || ss.getSheets()[0];
  const values = sh.getDataRange().getValues();
  const head = values.shift().map(String);
  const col = re => head.findIndex(h => re.test(h));
  const cTitle = col(/^title/i), cClose = col(/closing|closes/i), cApproved = col(/approved/i), cPosted = col(/posted/i);
  const base = ss.getUrl().replace(/\/edit.*$/, "") + "/edit#gid=" + sh.getSheetId() + "&range=A";
  const today = startOfDay_(now);
  const rows = [];
  values.forEach((r, i) => {
    if (i === 0) return;                         // grey help row under the headings
    const title = cTitle > -1 ? String(r[cTitle]).trim() : "";
    if (!title) return;
    const approved = cApproved > -1 ? String(r[cApproved]).trim() : "";
    const closing = cClose > -1 ? toDate_(r[cClose]) : null;
    let status;
    if (closing && closing < today) status = "Closed (delete at end of term)";
    else if (approved === "No") status = "Not approved";
    else if (approved !== "Yes") status = "Awaiting approval";
    else if (closing && daysBetween_(today, closing) <= CONFIG.CLOSING_SOON_DAYS) status = "Live, closing soon";
    else status = "Live";
    rows.push({
      title: title,
      closing_date: closing || "",
      approved: approved,
      posted: cPosted > -1 ? r[cPosted] : "",
      status: status,
      open_in_sheet: base + (i + 2),
    });
  });
  writeTable_(hub.getSheetByName("Opportunities"), rows,
    ["title", "closing_date", "approved", "posted", "status", "open_in_sheet"]);
  return rows;
}

// One list of everything that needs someone, most urgent first.
function buildActions_(site, feedback, questions, opps, checklist, now) {
  const out = [];
  const add = (priority, area, item, todo, portfolio, date, link) =>
    out.push({ priority: priority, area: area, item: item, what_to_do: todo, portfolio: portfolio || "", date: date || "", link: link || "" });
  const pages = site.pages || [];
  const portfolioOf = {};
  const urlOf = {};
  pages.forEach(p => { portfolioOf[p.page_title] = p.portfolio; urlOf[p.page_title] = p.page_url; });

  questions.forEach(q => {
    if (!isOpen_(q)) return;
    if (q.type === "Alumni Gallery withdrawal") {
      add("1 High", "Questions", "Alumni Gallery withdrawal request", "Remove the profile from the gallery, then reply", "Webmaster", q.received, q.open_in_sheet);
    } else {
      const urgent = q.days_waiting >= CONFIG.QUESTION_URGENT_DAYS;
      add(urgent ? "1 High" : "2 Medium", "Questions", "Question" + (q.topic ? ": " + q.topic : ""),
        (q.status === "New" ? "Read and pass to the right person" : "Waiting for a reply from " + (q.assigned_to || "someone")) +
        " (" + q.days_waiting + " day" + (q.days_waiting === 1 ? "" : "s") + ")", "", q.received, q.open_in_sheet);
    }
  });

  (site.links || []).filter(l => l.status === "Broken").forEach(l =>
    add("1 High", "Links", l.page_title + ": " + l.link, "Fix or remove the link (" + l.detail + ", line " + l.line + " of " + l.file + ")",
      portfolioOf[l.page_title], "", urlOf[l.page_title]));

  (site.deadlines || []).filter(d => d.date_status === "Passed").forEach(d =>
    add(d.box_status === "All dates passed" ? "1 High" : "2 Medium", "Deadlines",
      d.page_title + ": " + d.date_text,
      d.box_status === "All dates passed" ? "Every date in this deadline box has passed. Update the box for next year." : "This date has passed. Remove it or update it.",
      portfolioOf[d.page_title], d.date, urlOf[d.page_title]));
  (site.deadlines || []).filter(d => d.date_status === "Coming up").forEach(d =>
    add("3 Low", "Deadlines", d.page_title + ": " + d.date_text, "Coming up in " + d.days_left + " days. Remove or update it after it passes.",
      portfolioOf[d.page_title], d.date, urlOf[d.page_title]));

  const cutoff = new Date(now.getTime() - CONFIG.FEEDBACK_DAYS * 86400000);
  feedback.filter(f => f.received >= cutoff && (f.answer === "No" || f.answer === "Partly") && f.comment).forEach(f =>
    add("2 Medium", "Feedback", f.page_title + " (" + f.answer + ")", "Read the comment: " + f.comment,
      portfolioOf[f.page_title], f.received, urlOf[f.page_title]));

  pages.forEach(p => {
    if (p.review_status === "Review overdue") add("2 Medium", "Pages", p.page_title, "Review the page and update last_reviewed", p.portfolio, p.review_due, p.page_url);
    if (p.review_status === "Review due soon") add("3 Low", "Pages", p.page_title, "Review due by " + p.review_due, p.portfolio, p.review_due, p.page_url);
    if (/^Changed after|missing/.test(p.translation_status)) add("2 Medium", "Pages", p.page_title, p.translation_status + ": make the same change on the other language", p.portfolio, p.last_changed, p.page_url);
    if (/^To be assigned$/i.test(p.portfolio) || !p.portfolio) add("3 Low", "Pages", p.page_title, "Assign a portfolio", "", "", p.page_url);
  });

  opps.forEach(o => {
    if (o.status === "Awaiting approval") add("2 Medium", "Opportunities", o.title, "Check the row and set Approved to Yes", "Internships", o.closing_date, o.open_in_sheet);
    if (/^Closed/.test(o.status)) add("3 Low", "Opportunities", o.title, "Closed: delete the row at the end of term", "Internships", o.closing_date, o.open_in_sheet);
  });

  const today = startOfDay_(now);
  checklist.forEach(c => {
    if (!c["Item"] || c["Done"] === true) return;
    const due = toDate_(c["Due"]);
    if (due && daysBetween_(today, due) <= 14) {
      add(due < today ? "1 High" : "2 Medium", "Launch", c["Item"], due < today ? "Overdue" : "Due soon", c["Who"], due, "");
    }
  });

  out.sort((a, b) => a.priority < b.priority ? -1 : a.priority > b.priority ? 1 :
    String(a.area).localeCompare(String(b.area)));
  return out;
}

// ===================================================================
// Optional: email when a question comes in
// ===================================================================
function addQuestionAlert() {
  if (!CONFIG.QUESTIONS_SHEET_URL || !CONFIG.ALERT_EMAILS) throw new Error("Fill in QUESTIONS_SHEET_URL and ALERT_EMAILS first.");
  const ss = SpreadsheetApp.openByUrl(CONFIG.QUESTIONS_SHEET_URL);
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === "onQuestion_")
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("onQuestion_").forSpreadsheet(ss).onFormSubmit().create();
  Logger.log("Done. " + CONFIG.ALERT_EMAILS + " will get an email for each new question.");
}

function onQuestion_(e) {
  const ss = SpreadsheetApp.openByUrl(CONFIG.QUESTIONS_SHEET_URL);
  const named = (e && e.namedValues) || {};
  const topicKey = Object.keys(named).find(k => /with regards to|topic|regarding|category/i.test(k) && named[k][0]);
  const text = Object.keys(named).map(k => (named[k] || []).join(" ")).join(" ");
  const withdrawal = WITHDRAWAL_RE.test(text);
  const subject = withdrawal ? "ECG website: Alumni Gallery withdrawal request" : "ECG website: new question" +
    (topicKey && named[topicKey][0] ? " (" + named[topicKey][0] + ")" : "");
  MailApp.sendEmail({
    to: CONFIG.ALERT_EMAILS,
    subject: subject,
    body: "A new message came in through \"Send us a question\" on the ECG website.\n\n" +
      "Open the responses Sheet to read it, then set Status and Assigned to:\n" + ss.getUrl() + "\n\n" +
      "(The question isn't copied into this email.)",
  });
}

// ===================================================================
// Helpers
// ===================================================================
function formResponsesSheet_(ss) {
  return ss.getSheets().find(s => { try { return !!s.getFormUrl(); } catch (e) { return false; } }) || ss.getSheets()[0];
}

function fetchCsv_(url) {
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { "Cache-Control": "no-cache" } });
  if (res.getResponseCode() !== 200) throw new Error("HTTP " + res.getResponseCode());
  const rows = Utilities.parseCsv(res.getContentText("UTF-8"));
  const head = rows.shift();
  return rows.filter(r => r.join("") !== "").map(r => {
    const o = {};
    head.forEach((h, i) => { o[h] = convert_(r[i]); });
    return o;
  });
}

function convert_(v) {
  if (v === undefined || v === "") return "";
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  if (/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(v)) return new Date(v);
  return v;
}

// Writes rows (objects) under a header row. Text columns are stored as
// plain text so values like "Oct 2026" don't turn into dates.
function writeTable_(sh, rows, header) {
  header = header || (rows.length ? Object.keys(rows[0]) : []);
  sh.clearContents();
  if (!header.length) return;
  const data = [header].concat(rows.map(r => header.map(h => r[h] === undefined || r[h] === null ? "" : r[h])));
  const range = sh.getRange(1, 1, data.length, header.length);
  header.forEach((h, c) => {
    const vals = rows.map(r => r[h]).filter(v => v !== "" && v !== undefined && v !== null);
    const col = sh.getRange(2, c + 1, Math.max(rows.length, 1), 1);
    if (vals.length && vals.every(v => v instanceof Date)) col.setNumberFormat(/_at|received/.test(h) ? "yyyy-mm-dd hh:mm" : "yyyy-mm-dd");
    else if (vals.length && vals.every(v => typeof v === "number")) col.setNumberFormat("0.##");
    else col.setNumberFormat("@");
  });
  range.setValues(data);
  sh.getRange(1, 1, 1, header.length).setFontWeight("bold");
  sh.setFrozenRows(1);
}

function readTable_(sh) {
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getDataRange().getValues();
  const head = values.shift().map(String);
  return values.filter(r => r.join("") !== "").map(r => {
    const o = {};
    head.forEach((h, i) => { o[h] = r[i]; });
    return o;
  });
}

function toDate_(v) {
  if (v instanceof Date) return v;
  if (!v) return null;
  const s = String(v).trim();
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);      // 31/10/2026 (day first)
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = /^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4})$/.exec(s);      // 31 Dec 2026
  const mon = m && ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(m[2].toLowerCase());
  if (m && mon > -1) return new Date(+m[3], mon, +m[1]);
  return null;
}

function startOfDay_(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function daysBetween_(a, b) { return Math.round((startOfDay_(b) - startOfDay_(a)) / 86400000); }

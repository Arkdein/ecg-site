/**
 * ECG@RVHS Weekly Update — sign-up Form and list
 * ------------------------------------------------------------------
 * Runs on Randall's MOE account (hoon_yao_tong_randall@moe.edu.sg).
 * Not part of the website. See WEEKLY-UPDATE.md.
 *
 * What it does
 *   setup()               Run once. Creates the Form "Sign up for the
 *                         ECG@RVHS weekly update" and its Sheet, adds
 *                         the tracking columns and the "To add" tab, and
 *                         sets the Monday reminder.
 *   mondayReminder()      Runs by itself on Mondays (8–9 am). If anyone
 *                         new has signed up, emails YOU (MOE inbox) the
 *                         addresses to paste into the Google Group.
 *                         Nothing is sent when there's nobody new.
 *   markPendingAsAdded()  After pasting them into the Group, run this
 *                         (or tick "Added to group" in the Sheet). It
 *                         ticks every row now listed on "To add".
 *
 * Nobody is approved or turned away: the particulars are kept so the
 * team knows who has signed up. The Google Group sends the email; this
 * script never emails students.
 *
 * How to install (about 5 minutes, signed in to your MOE account)
 *   1. script.google.com > New project. Name it
 *      "ECG Weekly Update sign-ups".
 *   2. Paste this whole file, fill in GROUP_MEMBERS_URL, and save.
 *   3. Choose "setup" and click Run. Allow access.
 *   4. Executions > the run's log: copy the Form's public link and the
 *      Sheet's link.
 *   5. Open the Form > Publish: check responders are "Anyone with the
 *      link" (not only Ministry of Education users).
 * ------------------------------------------------------------------
 */

const CONFIG = {
  FORM_TITLE: "Sign up for the ECG@RVHS weekly update",
  SHEET_NAME: "ECG@RVHS weekly update sign-ups (Sheet)",
  RESPONSES_TAB: "Sign-ups",
  TO_ADD_TAB: "To add",

  // The Google Group's Members page, e.g.
  // "https://groups.google.com/g/rvhs-ecg-weekly/members"           ← EDIT
  GROUP_MEMBERS_URL: "",

  SITE_URL: "https://arkdein.github.io/ecg-site",

  // Monday reminder hour (Singapore time). The Group email goes out at about 7 am.
  REMINDER_HOUR: 8
};

// Column headings in the Sign-ups tab, written by the Form (A–F)
const Q = {
  NAME: "Full name",
  EMAIL: "Personal email address",
  YEAR: "Year of graduation",
  CLASS: "Class",
  CONSENT: "Consent"
};
// Added by this script to the right of the Form's columns
const TRACK = ["Added to group", "Added on", "Notes"];

const CONSENT_TEXT = "I agree that the RVHS ECG Team may keep these details to send me the " +
  "ECG@RVHS weekly update by email, through a Google Group, and to see who has signed up. " +
  "I can unsubscribe at any time with the link at the bottom of every email.";

function setup() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty("FORM_ID")) {
    throw new Error("Already set up. Form: " + FormApp.openById(props.getProperty("FORM_ID")).getEditUrl());
  }

  /* ---- Form ---- */
  const form = FormApp.create(CONFIG.FORM_TITLE);
  form.setDescription(
    "Get one email each Monday with the week's new announcements and opportunities from the " +
    "RVHS Education and Career Guidance (ECG) team, plus anything closing that week.\n\n" +
    "Open to current students, graduates and parents. Please use a personal email address " +
    "(for example Gmail), not your students.edu.sg address: school accounts close after you leave RVHS.\n\n" +
    "Everything in the email is also on the ECG@RVHS website.");
  form.setCollectEmail(false);
  try { form.setRequireLogin(false); } catch (e) { console.log("setRequireLogin: " + e.message); }
  form.setLimitOneResponsePerUser(false);
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(false);
  form.setProgressBar(false);
  form.setConfirmationMessage(
    "Thank you! The ECG team adds new sign-ups to the mailing list every Monday.\n\n" +
    "You'll get an email from Google Groups. If your email address isn't a Google account, " +
    "it will be an invitation: accept it to start receiving the weekly update. " +
    "Check your spam folder if nothing arrives within a week.");

  form.addTextItem().setTitle(Q.NAME).setRequired(true)
    .setValidation(FormApp.createTextValidation().requireTextLengthLessThanOrEqualTo(80)
      .setHelpText("Up to 80 characters.").build());

  form.addTextItem().setTitle(Q.EMAIL).setRequired(true)
    .setHelpText("Where the weekly update will go. A personal address you'll keep, not students.edu.sg.")
    .setValidation(FormApp.createTextValidation().requireTextIsEmail()
      .setHelpText("Please enter a valid email address.").build());

  form.addTextItem().setTitle(Q.YEAR).setRequired(true)
    .setHelpText("The year you finish, or finished, at RVHS, e.g. 2027. Parents: your child's year.")
    .setValidation(FormApp.createTextValidation().requireNumberBetween(1960, 2040)
      .setHelpText("Please enter a year, e.g. 2027.").build());

  form.addTextItem().setTitle(Q.CLASS).setRequired(true)
    .setHelpText("For example 4A or 26J01. Graduates: your last class. Parents: your child's class.")
    .setValidation(FormApp.createTextValidation().requireTextLengthLessThanOrEqualTo(12)
      .setHelpText("Up to 12 characters.").build());

  form.addCheckboxItem().setTitle(Q.CONSENT).setRequired(true).setChoiceValues([CONSENT_TEXT]);

  try { form.setPublished(true); } catch (e) { /* older Forms: already live */ }

  /* ---- Sheet ---- */
  const ss = SpreadsheetApp.create(CONFIG.SHEET_NAME);
  ss.setSpreadsheetTimeZone("Asia/Singapore");
  ss.setSpreadsheetLocale("en_GB");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  SpreadsheetApp.flush();
  Utilities.sleep(2000);

  const responses = ss.getSheets().filter(function (s) { return s.getFormUrl(); })[0];
  if (!responses) throw new Error("The Form's responses tab didn't appear. Run finishSheet() in a minute.");
  responses.setName(CONFIG.RESPONSES_TAB);
  ss.getSheets().forEach(function (s) {
    if (s.getSheetId() !== responses.getSheetId() && s.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s);
  });

  props.setProperties({ FORM_ID: form.getId(), SHEET_ID: ss.getId() });
  finishSheet();

  /* ---- Monday reminder ---- */
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === "mondayReminder"; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("mondayReminder").timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(CONFIG.REMINDER_HOUR).inTimezone("Asia/Singapore").create();

  console.log("Form (edit):   " + form.getEditUrl());
  console.log("Form (public): " + form.getPublishedUrl());
  console.log("Sheet:         " + ss.getUrl());
  console.log("For the website (_config.yml):  weekly_update_signup: \"" + form.getPublishedUrl() + "\"");
}

/** Adds the tracking columns and the "To add" tab. Safe to run again. */
function finishSheet() {
  const ss = openSheet_();
  const sh = ss.getSheetByName(CONFIG.RESPONSES_TAB);
  const heads = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0].map(String);
  const col = colIndex_(heads);
  if (!col.email) throw new Error("No '" + Q.EMAIL + "' column yet in " + CONFIG.RESPONSES_TAB);

  // Tracking columns to the right of the Form's columns
  let added = heads.indexOf(TRACK[0]) + 1;
  if (!added) {
    added = sh.getLastColumn() + 1;
    sh.getRange(1, added, 1, TRACK.length).setValues([TRACK])
      .setBackground("#fff2cc").setFontWeight("bold");
  }
  sh.getRange(2, added, sh.getMaxRows() - 1, 1).insertCheckboxes();
  sh.getRange(2, added + 1, sh.getMaxRows() - 1, 1).setNumberFormat("d mmm yyyy");
  sh.setFrozenRows(1);

  // "To add" tab: who signed up but isn't in the Group yet
  const tab = ss.getSheetByName(CONFIG.TO_ADD_TAB) || ss.insertSheet(CONFIG.TO_ADD_TAB, 0);
  tab.clear();
  const R = "'" + CONFIG.RESPONSES_TAB + "'!";
  const E = R + letter_(col.email) + "2:" + letter_(col.email);
  const A = R + letter_(added) + "2:" + letter_(added);
  const pending = "FILTER(LOWER(TRIM(" + E + ")), " + E + "<>\"\", ISNA(MATCH(LOWER(TRIM(" + E + ")), " +
                  "IFERROR(FILTER(LOWER(TRIM(" + E + ")), " + A + "=TRUE), \"-none-\"), 0)))";
  tab.getRange("A1").setValue("New sign-ups to add to the Google Group").setFontWeight("bold").setFontSize(12);
  tab.getRange("A2").setFormula("=\"People to add: \"&IFERROR(ROWS(UNIQUE(" + pending + ")), 0)");
  tab.getRange("A3").setValue("Copy the addresses in A4 into the Group (Members > Add members), then tick " +
    "\"" + TRACK[0] + "\" in " + CONFIG.RESPONSES_TAB + " (or run markPendingAsAdded in the script).");
  tab.getRange("A4").setFormula("=IFERROR(TEXTJOIN(\", \", TRUE, UNIQUE(" + pending + ")), \"\")")
    .setWrap(true).setBackground("#f3f4f6");
  tab.getRange("A6").setValue("Each address is listed once, even if someone signed up twice. " +
    "People who unsubscribe leave the Group by themselves; this list doesn't know about that.")
    .setFontColor("#5a6270");
  tab.setColumnWidth(1, 720);
}

/** Monday: email Randall (MOE inbox) the addresses to add, if there are any. */
function mondayReminder() {
  const list = pendingEmails_();
  if (!list.length) { console.log("Nobody new to add."); return; }
  const ss = openSheet_();
  const me = Session.getEffectiveUser().getEmail();
  const body = [
    list.length + " new sign-up" + (list.length > 1 ? "s" : "") + " for the ECG@RVHS weekly update.",
    "",
    "1. Open the Google Group's members page (signed in to your PERSONAL account):",
    "   " + (CONFIG.GROUP_MEMBERS_URL || "(fill in GROUP_MEMBERS_URL in the script)"),
    "2. Add members > paste these addresses:",
    "",
    list.join(", "),
    "",
    "3. Tick \"" + TRACK[0] + "\" for them in the Sheet, or run markPendingAsAdded:",
    "   " + ss.getUrl(),
    "",
    "Addresses that aren't Google accounts get an invitation and join once they accept it."
  ].join("\n");
  MailApp.sendEmail(me, "ECG weekly update: " + list.length + " to add to the Google Group", body);
  console.log("Reminder sent to " + me + " (" + list.length + ")");
}

/** Ticks "Added to group" (with today's date) for every row whose address is on the "To add" list. */
function markPendingAsAdded() {
  const ss = openSheet_();
  const sh = ss.getSheetByName(CONFIG.RESPONSES_TAB);
  const values = sh.getDataRange().getValues();
  const col = colIndex_(values[0].map(String));
  const added = values[0].map(String).indexOf(TRACK[0]) + 1;
  const pending = {};
  pendingEmails_().forEach(function (e) { pending[e] = true; });
  let n = 0;
  for (let r = 1; r < values.length; r++) {
    const e = String(values[r][col.email - 1]).trim().toLowerCase();
    if (e && pending[e] && values[r][added - 1] !== true) {
      sh.getRange(r + 1, added, 1, 2).setValues([[true, new Date()]]);
      n++;
    }
  }
  console.log("Marked " + n + " row(s) as added.");
}

function pendingEmails_() {
  const sh = openSheet_().getSheetByName(CONFIG.RESPONSES_TAB);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const heads = values[0].map(String);
  const col = colIndex_(heads);
  const added = heads.indexOf(TRACK[0]);
  const inGroup = {}, out = [], seen = {};
  values.slice(1).forEach(function (row) {
    const e = String(row[col.email - 1]).trim().toLowerCase();
    if (e && added >= 0 && row[added] === true) inGroup[e] = true;
  });
  values.slice(1).forEach(function (row) {
    const e = String(row[col.email - 1]).trim().toLowerCase();
    if (e && !inGroup[e] && !seen[e]) { seen[e] = true; out.push(e); }
  });
  return out;
}

function openSheet_() {
  const id = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  if (!id) throw new Error("Run setup() first.");
  return SpreadsheetApp.openById(id);
}

function colIndex_(heads) {
  return { email: heads.indexOf(Q.EMAIL) + 1, name: heads.indexOf(Q.NAME) + 1 };
}

function letter_(n) {
  let s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

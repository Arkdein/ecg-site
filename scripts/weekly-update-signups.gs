/**
 * ECG@RVHS Weekly Update — sign-up Form
 * ------------------------------------------------------------------
 * Runs on Randall's MOE account (hoon_yao_tong_randall@moe.edu.sg).
 * Not part of the website. See WEEKLY-UPDATE.md.
 *
 * What it does
 *   setup()   Run once. Creates the Form "Sign up for the ECG@RVHS
 *             weekly update" and its Sheet. The Form's thank-you
 *             message sends people to the website's Weekly ECG update
 *             page to join the Google Group themselves.
 *
 * Nobody is approved or turned away, and nobody is added to the Group
 * by hand: people join it themselves (Group setting "Anyone can join").
 * The Form keeps a record of who signed up. This script never emails
 * anyone.
 *
 * How to install (about 5 minutes, signed in to your MOE account)
 *   1. script.google.com > New project. Name it
 *      "ECG Weekly Update sign-ups".
 *   2. Paste this whole file and save.
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

  // The website page with both ways to join the Google Group
  JOIN_PAGE_URL: "https://arkdein.github.io/ecg-site/weekly-update.html#join"
};

// Column headings in the Sign-ups tab, written by the Form (A–F)
const Q = {
  NAME: "Full name",
  EMAIL: "Personal email address",
  YEAR: "Year of graduation",
  CLASS: "Class",
  CONSENT: "Consent"
};

const CONSENT_TEXT = "I agree that the RVHS ECG Team may keep these details as a record of who has " +
  "signed up for the ECG@RVHS weekly update. I will join the mailing list (a Google Group) myself, " +
  "and can unsubscribe at any time with the link at the bottom of every email.";

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
    "Thank you! One last step: join the mailing list.\n\n" +
    "Open " + CONFIG.JOIN_PAGE_URL + " and follow Step 2, using the same email address. " +
    "You won't get the weekly update until you've joined.");

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
  if (!responses) throw new Error("The Form's responses tab didn't appear. Open the Sheet in a minute and rename the responses tab to " + CONFIG.RESPONSES_TAB + ".");
  responses.setName(CONFIG.RESPONSES_TAB);
  ss.getSheets().forEach(function (s) {
    if (s.getSheetId() !== responses.getSheetId() && s.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s);
  });

  responses.setFrozenRows(1);
  props.setProperties({ FORM_ID: form.getId(), SHEET_ID: ss.getId() });

  console.log("Form (edit):   " + form.getEditUrl());
  console.log("Form (public): " + form.getPublishedUrl());
  console.log("Sheet:         " + ss.getUrl());
  console.log("For the website (_config.yml):  weekly_update_signup: \"" + form.getPublishedUrl() + "\"");
}

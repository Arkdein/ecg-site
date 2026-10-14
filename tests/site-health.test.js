/* -------------------------------------------------------------
   Checks the site health script (scripts/site-health.js).
   Not part of the website.

   Run:  node tests/site-health.test.js
   ------------------------------------------------------------- */
"use strict";
var assert = require("assert");
var path = require("path");
var fs = require("fs");
var os = require("os");
var sh = require(path.join(__dirname, "..", "scripts", "site-health.js"));

// Front matter, with comments and quotes
var fm = sh.parseFrontMatter('---\ntitle: "For Parents"\nnav_exclude: true\ntranslation: /for-parents-zh.html   # Chinese version\n---\nBody');
assert.strictEqual(fm.data.title, "For Parents");
assert.strictEqual(fm.data.nav_exclude, true);
assert.strictEqual(fm.data.translation, "/for-parents-zh.html");
assert.strictEqual(fm.body, "Body");

// Review dates
assert.deepStrictEqual(sh.parseMonthYear("Oct 2026"), { y: 2026, m: 10 });
assert.deepStrictEqual(sh.parseMonthYear("October 2026"), { y: 2026, m: 10 });
assert.deepStrictEqual(sh.parseMonthYear("2026-10-12"), { y: 2026, m: 10 });
assert.strictEqual(sh.parseMonthYear("soon"), null);
assert.deepStrictEqual(sh.addMonths({ y: 2026, m: 10 }, 6), { y: 2027, m: 4 });

// TODOs: counted at the start of a line, not inside comments or mid-sentence
assert.strictEqual(sh.countTodos("TODO: a\nSee the TODO box\n<!-- TODO: hidden -->\n> TODO: in a box\n"), 2);

// Dates in deadline boxes; a range counts once, by its end date
function dates(s) { return sh.extractDates(s).map(function (d) { return d.date || "?" + d.text; }); }
assert.deepStrictEqual(dates("15 Oct 2026, 6pm UK time"), ["2026-10-15"]);
assert.deepStrictEqual(dates("Round 1 runs from 30 Sep to 20 Nov 2026"), ["2026-11-20"]);
assert.deepStrictEqual(dates("Round 2 from 21 Nov 2026 to 28 Feb 2027"), ["2027-02-28"]);
assert.deepStrictEqual(dates("Tentatively 19–23 Feb 2027"), ["2027-02-23"]);
assert.deepStrictEqual(dates("By 19 March 2027"), ["2027-03-19"]);
assert.deepStrictEqual(dates("close in mid-March 2027"), ["2027-03-15"]);
assert.deepStrictEqual(dates("**HSK 1–6:** 12 December. Register by 30 October."), ["?12 December", "?30 October"]);
assert.deepStrictEqual(dates("[UCAS](https://x.org/15-oct-2026) **13 Jan 2027**"), ["2027-01-13"]);

// Box status
var today = "2026-10-13";
assert.strictEqual(sh.boxStatus(sh.extractDates("15 Oct 2026 and 13 Jan 2027"), today).status, "Coming up");
assert.strictEqual(sh.boxStatus(sh.extractDates("1 Oct 2026 and 13 Jan 2027"), today).status, "Some dates passed");
assert.strictEqual(sh.boxStatus(sh.extractDates("16–22 Jul 2026"), today).status, "All dates passed");
assert.strictEqual(sh.boxStatus(sh.extractDates("13 Jan 2027"), today).status, "OK");
assert.strictEqual(sh.boxStatus(sh.extractDates("12 December"), today).status, "No dates to check");

// Finding deadline boxes
var boxes = sh.findDeadlineBoxes("Intro\n\n{: .deadline }\n> **2027 entry:**\n> - 15 Oct 2026\n\nAfter 1 Jan 2020\n");
assert.strictEqual(boxes.length, 1);
assert.strictEqual(boxes[0].items.length, 1);   // the date after the box isn't part of it
assert.strictEqual(boxes[0].firstLine, "2027 entry:");

// Heading ids (GitHub style)
assert.strictEqual(sh.slugify("JC1 & JC2 HECGS Day"), "jc1--jc2-hecgs-day");
assert.strictEqual(sh.slugify("1. Work out your University Admission Score"), "1-work-out-your-university-admission-score");
assert.strictEqual(sh.slugify("Before you apply: is a bond right for you?"), "before-you-apply-is-a-bond-right-for-you");
// Kramdown block attribute on the line after a heading sets that heading's id
var ialIds = sh.collectAnchors("## Help from MOE\n{: #moe-ecg }\n\nText\n## Secondary students\n{: .note #secondary }\n");
assert.ok(ialIds["moe-ecg"] && ialIds["secondary"], "IAL ids on the next line");
assert.ok(!ialIds["help-from-moe"], "an IAL id replaces the automatic one");
var ids = sh.collectAnchors("## Book a session\n## Book a session\n| <span id=\"uk\"></span>UK |\n## Custom {#my-id}\n");
assert.ok(ids["book-a-session"] && ids["book-a-session-1"] && ids.uk && ids["my-id"]);

// Links
var links = sh.extractLinks('[a](get-help.md#uk) ![p](assets/x.jpg) <a href="https://x.org">x</a>\n<!-- [hidden](nope.md) -->');
assert.deepStrictEqual(links.map(function (l) { return l.url; }), ["get-help.md#uk", "assets/x.jpg", "https://x.org"]);
assert.strictEqual(sh.classifyLink("mailto:a@moe.edu.sg"), "email");
assert.strictEqual(sh.classifyLink("https://x.org"), "external");
assert.strictEqual(sh.classifyLink("#top"), "same page");
assert.strictEqual(sh.classifyLink("{{ '/x' | relative_url }}"), "template");
assert.strictEqual(sh.classifyLink("china.md"), "internal");

// External link verdicts
assert.strictEqual(sh.externalVerdict({ code: 200, finalUrl: "https://x.org" }).status, "OK");
assert.strictEqual(sh.externalVerdict({ code: 404 }).status, "Broken");
assert.strictEqual(sh.externalVerdict({ code: 403 }).status, "Check by hand");
assert.strictEqual(sh.externalVerdict({ code: 202, finalUrl: "https://www.moe.gov.sg/x" }).status, "Check by hand");
assert.strictEqual(sh.externalVerdict({ code: 200, finalUrl: "https://www.moe.gov.sg/page-not-found" }).status, "Broken");
assert.strictEqual(sh.externalVerdict({ code: 200, finalUrl: "https://example.org/404" }).status, "Broken");
assert.strictEqual(sh.externalVerdict({ code: 200, finalUrl: "https://example.org/404-tips-for-students" }).status, "OK");
assert.strictEqual(sh.externalVerdict({ code: 0, error: "ENOTFOUND" }).status, "Broken");
assert.strictEqual(sh.externalVerdict({ code: 0, error: "Timed out" }).status, "Check by hand");
assert.strictEqual(sh.externalVerdict({ code: 200, finalUrl: "https://accounts.google.com/v3/signin" }).status, "Needs sign-in");

// CSV quoting
assert.strictEqual(sh.toCSV(["a", "b"], [{ a: 'x, "y"', b: 1 }]), 'a,b\n"x, ""y""",1\n');

// A small site: broken page link, broken section link, review overdue, passed deadline
var dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecg-sh-"));
fs.writeFileSync(path.join(dir, "_config.yml"), 'url: "https://example.org"\nbaseurl: "/ecg-site"\ndraft: true\n');
fs.writeFileSync(path.join(dir, "index.md"), "---\ntitle: Home\nportfolio: Editor\nlast_reviewed: Jan 2026\n---\n[x](gone.md) [y](help.md#nowhere) [z](help.md#ask)\n\n{: .deadline }\n> Closes 1 Oct 2026\n");
fs.writeFileSync(path.join(dir, "help.md"), "---\ntitle: Get Help\nportfolio: To be assigned\nlast_reviewed: Oct 2026\n---\n## Ask\nTODO: names\n");
var a = sh.analyse(dir, { noExternal: true, today: "2026-10-13" });
var res = sh.finish(dir, a, path.join(dir, "out"), new Date("2026-10-13T00:00:00Z"));
var home = res.pageRows.filter(function (r) { return r.file === "index.md"; })[0];
var help = res.pageRows.filter(function (r) { return r.file === "help.md"; })[0];
assert.strictEqual(home.page_path, "/ecg-site/");
assert.strictEqual(home.broken_links, 2);
assert.strictEqual(home.review_status, "Review overdue");     // Jan 2026 + 6 months = end of Jul 2026
assert.strictEqual(home.deadline_status, "All dates passed");
assert.ok(/Review overdue/.test(home.needs_action) && /2 broken links/.test(home.needs_action));
assert.strictEqual(help.todo_count, 1);
assert.strictEqual(help.needs_action, "No portfolio");
assert.strictEqual(res.summary.broken_links, 2);
assert.strictEqual(res.summary.site_draft_mode, "Yes");
["pages.csv", "deadlines.csv", "links.csv", "summary.csv"].forEach(function (f) {
  assert.ok(fs.existsSync(path.join(dir, "out", f)), f);
});

console.log("site-health: all checks passed");

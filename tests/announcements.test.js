/* -------------------------------------------------------------
   Checks the Key Announcements rules (assets/js/announcements.js).
   Not part of the website.

   Run:  node tests/announcements.test.js
   ------------------------------------------------------------- */
"use strict";
var assert = require("assert");
var path = require("path");
var fs = require("fs");
var opp = require(path.join(__dirname, "..", "assets", "js", "opportunities.js"));
var ann = require(path.join(__dirname, "..", "assets", "js", "announcements.js"));

var BASE = "/ecg-site";

// Links: own pages get the site's base path; other sites must be http(s)
assert.strictEqual(ann.siteLink("/results-and-applying", BASE), "/ecg-site/results-and-applying");
assert.strictEqual(ann.siteLink("/get-help#moe-ecg", BASE + "/"), "/ecg-site/get-help#moe-ecg");
assert.strictEqual(ann.siteLink("https://www.moe.gov.sg/national-exams-dates", BASE), "https://www.moe.gov.sg/national-exams-dates");
assert.strictEqual(ann.siteLink("//evil.example", BASE), "");
assert.strictEqual(ann.siteLink("javascript:alert(1)", BASE), "");
assert.strictEqual(ann.siteLink("results-and-applying", BASE), "");
assert.strictEqual(ann.siteLink("", BASE), "");

// Rows: headings found by name, empty and #N/A rows skipped
var csv = [
  "Headline,For,Message,Link,Button text,Show from,Remove after",
  "Results day,Graduates,Come to the hall.,/results-and-applying,See the arrangements,2027-02-01,2027-03-19",
  ",Graduates,No headline,,,,2027-03-19",
  "#N/A,,,,,,",
  "No end date,Graduates,Never shows,,,2027-01-01,",
  "Bad start,Graduates,Never shows,,,someday,2027-03-19",
  "Starts now,Parents,Blank Show from,,,,2027-02-28",
  "Later,Graduates,Starts in March,,,2027-03-01,2027-03-31"
].join("\n");
var items = ann.toItems(opp.parseCSV(csv), BASE);
assert.deepStrictEqual(items.map(function (i) { return i.headline; }), ["Results day", "No end date", "Bad start", "Starts now", "Later"]);
assert.strictEqual(items[0].link, "/ecg-site/results-and-applying");
assert.strictEqual(items[0].button, "See the arrangements");
assert.strictEqual(items[0].audience, "Graduates");

function byName(n) { return items.filter(function (i) { return i.headline === n; })[0]; }

// Show from / Remove after, in Singapore dates
assert.strictEqual(ann.state(byName("Results day"), "2027-01-31"), "upcoming");
assert.strictEqual(ann.state(byName("Results day"), "2027-02-01"), "live");
assert.strictEqual(ann.state(byName("Results day"), "2027-03-19"), "live");    // still shows on its last day
assert.strictEqual(ann.state(byName("Results day"), "2027-03-20"), "hidden");  // gone the day after
assert.strictEqual(ann.state(byName("No end date"), "2027-02-01"), "hidden");  // Remove after is required
assert.strictEqual(ann.state(byName("Bad start"), "2027-02-01"), "hidden");    // unreadable Show from
assert.strictEqual(ann.state(byName("Starts now"), "2020-01-01"), "live");     // blank Show from = straight away

// What shows: newest Show from first, blank Show from last
assert.deepStrictEqual(ann.pick(items, "2027-02-10", false).map(function (i) { return i.headline; }), ["Results day", "Starts now"]);
assert.deepStrictEqual(ann.pick(items, "2027-03-05", false).map(function (i) { return i.headline; }), ["Later", "Results day"]);
assert.deepStrictEqual(ann.pick(items, "2027-04-01", false), []);              // nothing current: block hidden
// Preview also shows approved ones that haven't started
assert.deepStrictEqual(ann.pick(items, "2027-01-15", false).map(function (i) { return i.headline; }), ["Starts now"]);
assert.deepStrictEqual(ann.pick(items, "2027-01-15", true).map(function (i) { return i.headline; }), ["Later", "Results day", "Starts now"]);

// At most four at a time
var many = [];
for (var d = 1; d <= 6; d++) many.push({ headline: "A" + d, showFrom: "2027-02-0" + d, showFromRaw: "x", removeAfter: "2027-03-31" });
assert.strictEqual(ann.pick(many, "2027-02-10", false).length, ann.MAX_SHOWN);
assert.strictEqual(ann.MAX_SHOWN, 4);
assert.strictEqual(ann.pick(many, "2027-02-10", false)[0].headline, "A6");

// Message paragraphs
assert.deepStrictEqual(ann.paragraphs("One\nline two\n\n  \nThree"), [["One", "line two"], ["Three"]]);
assert.deepStrictEqual(ann.paragraphs(""), []);

// The sample file parses, and only appears in preview (both rows end in 2099)
var sample = fs.readFileSync(path.join(__dirname, "..", "assets", "data", "announcements-sample.csv"), "utf8");
var sItems = ann.toItems(opp.parseCSV(sample), BASE);
assert.strictEqual(sItems.length, 2);
assert.ok(sItems.every(function (i) { return /^Sample/.test(i.headline) && i.removeAfter === "2099-12-31"; }));

console.log("announcements: all checks passed");

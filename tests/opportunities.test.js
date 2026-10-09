/* -------------------------------------------------------------
   Checks the Current Opportunities list rules
   (assets/js/opportunities.js). Not part of the website.

   Run:  node tests/opportunities.test.js
   ------------------------------------------------------------- */
"use strict";
var assert = require("assert");
var path = require("path");
var fs = require("fs");
var opp = require(path.join(__dirname, "..", "assets", "js", "opportunities.js"));

// CSV: quotes, commas and line breaks inside quotes, BOM, CRLF
var rows = opp.parseCSV('﻿Title,Summary\r\n"A, B","He said ""hi""\nthen left"\r\nC,\r\n');
assert.deepStrictEqual(rows, [["Title", "Summary"], ["A, B", 'He said "hi"\nthen left'], ["C", ""]]);

// Dates
assert.strictEqual(opp.parseDate("2026-10-31"), "2026-10-31");
assert.strictEqual(opp.parseDate("31/10/2026"), "2026-10-31");   // day first
assert.strictEqual(opp.parseDate("1/2/2027"), "2027-02-01");
assert.strictEqual(opp.parseDate("31 Oct 2026"), "2026-10-31");
assert.strictEqual(opp.parseDate("31 October 2026"), "2026-10-31");
assert.strictEqual(opp.parseDate("31/02/2027"), null);            // no such day
assert.strictEqual(opp.parseDate("rolling"), null);
assert.strictEqual(opp.parseDate(""), null);
assert.strictEqual(opp.formatDate("2026-11-05"), "5 Nov 2026");

// Singapore date: 15:59 UTC on 31 Oct is 11:59 pm on 31 Oct in Singapore; 16:00 UTC is 1 Nov
assert.strictEqual(opp.todaySG(Date.UTC(2026, 9, 31, 15, 59)), "2026-10-31");
assert.strictEqual(opp.todaySG(Date.UTC(2026, 9, 31, 16, 0)), "2026-11-01");

// Open until the end of the closing date
var it = { closing: "2026-10-31" };
assert.strictEqual(opp.isOpen(it, "2026-10-31"), true);
assert.strictEqual(opp.isOpen(it, "2026-11-01"), false);
assert.strictEqual(opp.isOpen({ closing: null }, "2030-01-01"), true);  // open until filled

// Links: only http(s)
assert.strictEqual(opp.safeUrl("https://example.com/a?b=1"), "https://example.com/a?b=1");
assert.strictEqual(opp.safeUrl("javascript:alert(1)"), "");
assert.strictEqual(opp.safeUrl("www.example.com"), "");

// Rows -> items: columns found by heading, blanks and sheet errors skipped
var items = opp.toItems(opp.parseCSV([
  "Link,Title,Closing date,Posted,Type,Field,Open to,Organiser,Summary,Extra",
  "https://a.example,Alpha,2026-11-01,2026-10-01,Job,Education,Graduates only,Org A,Teach things,x",
  ",,,,,,,,,",
  "#N/A,,,,,,,,,",
  "javascript:x,Beta,,2026-10-05,Internship,Arts and design,Graduates only,Org B,Draw things,",
  "https://c.example,Gamma,1 Nov 2026,,Internship,Education,Graduates and current students,Org C,Plan lessons,"
].join("\n")));
assert.strictEqual(items.length, 3);
assert.strictEqual(items[0].title, "Alpha");
assert.strictEqual(items[0].link, "https://a.example");
assert.strictEqual(items[1].link, "");
assert.strictEqual(items[1].closing, null);
assert.strictEqual(items[2].closing, "2026-11-01");

// Sorting
var names = function (list) { return list.map(function (x) { return x.title; }); };
assert.deepStrictEqual(names(opp.sortItems(items, "closing")), ["Alpha", "Gamma", "Beta"]); // tie A-Z, open-until-filled last
assert.deepStrictEqual(names(opp.sortItems(items, "newest")), ["Beta", "Alpha", "Gamma"]); // no posted date last
assert.deepStrictEqual(names(opp.sortItems(items, "az")), ["Alpha", "Beta", "Gamma"]);

// Filtering and search (every word must match, any field, any case)
assert.deepStrictEqual(names(opp.filterItems(items, { type: "Internship" })), ["Beta", "Gamma"]);
assert.deepStrictEqual(names(opp.filterItems(items, { field: "Education", openTo: "Graduates only" })), ["Alpha"]);
assert.deepStrictEqual(names(opp.filterItems(items, { q: "org  LESSONS" })), ["Gamma"]);
assert.deepStrictEqual(names(opp.filterItems(items, { q: "nothing-like-this" })), []);

// Filter options follow the sheet's dropdown order
assert.deepStrictEqual(opp.options(items, "type"), ["Internship", "Job"]);
assert.deepStrictEqual(opp.options(items, "openTo"), ["Graduates only", "Graduates and current students"]);

// Heading labels
assert.strictEqual(opp.closingLabel({ closing: "2026-12-01", closingRaw: "2026-12-01" }, "2026-10-09").text, "[Closes 1 Dec 2026]");
assert.strictEqual(opp.closingLabel({ closing: "2026-10-09", closingRaw: "x" }, "2026-10-09").badge, "Closes today");
assert.strictEqual(opp.closingLabel({ closing: "2026-10-16", closingRaw: "x" }, "2026-10-09").badge, "Closing soon");
assert.strictEqual(opp.closingLabel({ closing: "2026-10-17", closingRaw: "x" }, "2026-10-09").badge, "");
assert.strictEqual(opp.closingLabel({ closing: null, closingRaw: "" }, "2026-10-09").text, "[Open until filled]");
assert.strictEqual(opp.closingLabel({ closing: null, closingRaw: "TBC" }, "2026-10-09").text, "[Closing date: see link]");

// The sample file parses, and its closed example is hidden
var sample = opp.toItems(opp.parseCSV(fs.readFileSync(path.join(__dirname, "..", "assets", "data", "opportunities-sample.csv"), "utf8")));
assert.strictEqual(sample.length, 6);
var open = sample.filter(function (x) { return opp.isOpen(x, "2026-10-09"); });
assert.strictEqual(open.length, 5);
assert.ok(open.every(function (x) { return x.link && x.posted; }));

console.log("All Current Opportunities checks passed.");

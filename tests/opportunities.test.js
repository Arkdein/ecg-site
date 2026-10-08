const assert = require("assert");
const fs = require("fs");
const O = require("../assets/js/opportunities.js");
const csv = fs.readFileSync(__dirname + "/../templates/opportunities-template.csv", "utf8");
const objs = O.toObjects(O.parseCSV(csv));
assert.strictEqual(objs.length, 3);
assert.strictEqual(objs[0].details.includes("Commas are fine"), true);
assert.strictEqual(objs[1]["for"], "JC2, Parents");
const today = O.dayNumber("2026-10-08");
let out = O.prepare(objs, today);
assert.deepStrictEqual(out.map(o => o.organiser), ["A*STAR", "NUS", "PSC"]); // newest first
assert.strictEqual(O.fmt(out[0]._closes), "31 Oct 2026");
// expiry: day after closing removes it; closing day keeps it
assert.strictEqual(O.prepare(O.toObjects(O.parseCSV(csv)), O.dayNumber("2026-10-31")).length, 3);
assert.strictEqual(O.prepare(O.toObjects(O.parseCSV(csv)), O.dayNumber("2026-11-01")).length, 2);
// other date formats
assert.strictEqual(O.dayNumber("31/10/2026"), O.dayNumber("2026-10-31"));
assert.strictEqual(O.dayNumber("31 October 2026"), O.dayNumber("2026-10-31"));
assert.strictEqual(O.dayNumber("rubbish"), null);
// Singapore day boundary: 16:30 UTC on 8 Oct = 00:30 on 9 Oct in SG
assert.strictEqual(O.todaySG(new Date("2026-10-08T16:30:00Z")), O.dayNumber("2026-10-09"));
// CRLF, BOM, blank lines, header case
const messy = "﻿TITLE,Closes\r\nA,2026-12-01\r\n\r\n,\r\n";
assert.deepStrictEqual(O.prepare(O.toObjects(O.parseCSV(messy)), today).map(o=>o.title), ["A"]);
console.log("all opportunities tests passed");

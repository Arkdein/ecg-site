/* -------------------------------------------------------------
   Checks the University Admission Score calculator
   (assets/js/uas-calculator.js). Not part of the website.

   Run:  node tests/uas-calculator.test.js
   Or, to compare against an independent implementation's results:
         node tests/uas-calculator.test.js path/to/expected.json
   ------------------------------------------------------------- */
"use strict";
var assert = require("assert");
var path = require("path");
var fs = require("fs");
var uas = require(path.join(__dirname, "..", "assets", "js", "uas-calculator.js"));

function score(h2, gp, fourth, mtl) {
  return uas.compute({ h2: h2, gp: gp, fourth: fourth || null, mtl: mtl || null }).score;
}

// Hand-worked cases (points: H2 A20 B17.5 C15 D12.5 E10 S5 U0; H1 = half)
var cases = [
  // Best possible
  [["A", "A", "A"], "A", null, null, "70.00"],
  // An extra A adds nothing to a perfect score (80/80 x 70 = 70, not higher)
  [["A", "A", "A"], "A", { level: "H1", grade: "A" }, "A", "70.00"],
  // 20 + 17.5 + 15 + 8.75 = 61.25
  [["A", "B", "C"], "B", null, null, "61.25"],
  // + H1 MTL A: 71.25 / 80 x 70 = 62.34375
  [["A", "B", "C"], "B", null, "A", "62.34"],
  // + fourth H1 B as well: 4th alone ties (61.25), both = 80/90 x 70 = 62.22, so MTL only
  [["A", "B", "C"], "B", { level: "H1", grade: "B" }, "A", "62.34"],
  // Both extras help: B,B,B + GP B = 61.25; one A: 71.25/80 x 70 = 62.34;
  // both A: 81.25/90 x 70 = 63.194... (also checks rounding of a recurring decimal)
  [["B", "B", "B"], "B", { level: "H1", grade: "A" }, "A", "63.19"],
  // Four H2s: best three A,B,B + GP A = 65; weakest B at H1 = 8.75 lowers it (64.53)
  [["A", "B", "B"], "A", { level: "H2", grade: "B" }, null, "65.00"],
  // Fourth H2 better than one of the three: it moves into the base, C drops to H1 slot
  [["B", "B", "C"], "B", { level: "H2", grade: "A" }, "C", "63.75"],
  // Weak base: an H1 extra at C helps. D,D,D + GP D = 43.75; + 7.5 = 51.25/80 x 70 = 44.84375
  [["D", "D", "D"], "D", { level: "H1", grade: "C" }, null, "44.84"],
  // U grades score 0
  [["U", "U", "U"], "U", null, null, "0.00"]
];

cases.forEach(function (c, i) {
  assert.strictEqual(score(c[0], c[1], c[2], c[3]), c[4], "Case " + (i + 1) + " " + JSON.stringify(c));
});

// Bad input is rejected rather than silently scored
assert.throws(function () { uas.compute({ h2: ["A", "B"], gp: "A" }); });
assert.throws(function () { uas.compute({ h2: ["A", "B", "Z"], gp: "A" }); });
assert.throws(function () { uas.compute({ h2: ["A", "B", "C"], gp: "" }); });

console.log("Hand-worked cases: " + cases.length + " passed");

// Optional: compare with an independent implementation's results for every combination
var expectedFile = process.argv[2];
if (expectedFile) {
  var rows = JSON.parse(fs.readFileSync(expectedFile, "utf8"));
  var bad = 0;
  rows.forEach(function (r) {
    var res = uas.compute({ h2: r.h2, gp: r.gp, fourth: r.fourth, mtl: r.mtl });
    var parts = r.exact.split("/").map(Number);
    // Exact check: res.exact.num / res.exact.den === parts[0] / parts[1]
    var exactOk = res.exact.num * parts[1] === parts[0] * res.exact.den;
    if (res.score !== r.score2dp || !exactOk) {
      if (bad < 10) console.log("MISMATCH", JSON.stringify(r), "got", res.score, res.exact.num + "/" + res.exact.den);
      bad++;
    }
  });
  console.log("Independent comparison: " + rows.length + " combinations, " + bad + " mismatches");
  if (bad) process.exit(1);
}

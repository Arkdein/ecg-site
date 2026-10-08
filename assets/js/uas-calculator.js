/* -------------------------------------------------------------
   ECG@RVHS University Admission Score calculator
   Placed on a page with {% include uas-calculator.html %}.
   Nothing is saved or sent anywhere.

   Rules (for students who sat the A-Levels in 2025 or later):
   - H2 points: A 20, B 17.5, C 15, D 12.5, E 10, S 5, U 0
   - H1 points: half the H2 points (A 10 ... S 2.5, U 0)
   - Base, out of 70: three H2 content subjects + H1 General Paper
   - Extras, each counted only if it raises the score:
       a fourth content subject (H1, or a fourth H2 counted at H1
       points; with four H2s the best three form the base), and
       H1 Mother Tongue.
     One extra counted:  total / 80 x 70.  Both: total / 90 x 70.
   Sources: MOE and university FAQs linked on the page.
   Checked against an independent implementation for all 70,560
   grade combinations: see tests/uas-calculator.test.js.

   All arithmetic is done in whole quarter-points so there are no
   rounding errors; the score is only rounded (to 2 decimal places)
   for display.
   ------------------------------------------------------------- */
(function (global) {
  "use strict";

  var GRADES = ["A", "B", "C", "D", "E", "S", "U"];
  // Points x 4 (quarter-points), so every value is a whole number
  var H2Q = { A: 80, B: 70, C: 60, D: 50, E: 40, S: 20, U: 0 };
  var H1Q = { A: 40, B: 35, C: 30, D: 25, E: 20, S: 10, U: 0 };

  function isGrade(g) { return GRADES.indexOf(g) !== -1; }

  // Format quarter-points as ordinary points, e.g. 35 -> "8.75"
  function pts(q) {
    var s = (q / 4).toFixed(2);
    return s.replace(/\.?0+$/, "");
  }

  // Round num/den to 2 decimal places, half up, using whole numbers only
  function round2(num, den) {
    var hundredths = Math.floor((200 * num + den) / (2 * den));
    return (hundredths / 100).toFixed(2);
  }

  /*
    compute({ h2: ["A","B","C"], gp: "B",
              fourth: null | { level: "H1"|"H2", grade: "A" },
              mtl: null | "A" })
    returns {
      score: "62.34",            // 2 decimal places, for display
      exact: { num, den },        // score = num / den, exactly
      base:  [ {label, grade, level, q} ],   // always counted
      extras:[ {key, label, grade, level, q, counted, alone} ],
      totalQ, outOf,              // what was added up, and out of 70/80/90
      baseScore: "61.25",
      note                        // e.g. which H2 became the H1 subject
    }
  */
  function compute(input) {
    if (!input || !Array.isArray(input.h2) || input.h2.length !== 3) throw new Error("Need three H2 grades");
    input.h2.forEach(function (g) { if (!isGrade(g)) throw new Error("Bad H2 grade: " + g); });
    if (!isGrade(input.gp)) throw new Error("Bad General Paper grade");
    var fourth = input.fourth || null;
    if (fourth && (!isGrade(fourth.grade) || (fourth.level !== "H1" && fourth.level !== "H2"))) throw new Error("Bad fourth subject");
    var mtl = input.mtl || null;
    if (mtl && !isGrade(mtl)) throw new Error("Bad H1 Mother Tongue grade");

    var h2 = input.h2.map(function (g, i) { return { label: "H2 subject " + (i + 1), grade: g, level: "H2" }; });
    var note = null;
    var fourthItem = null;

    if (fourth && fourth.level === "H2") {
      h2.push({ label: "H2 subject 4", grade: fourth.grade, level: "H2" });
      // Best three H2 grades form the base; the weakest becomes the
      // fourth content subject, counted at H1 points. Stable sort keeps
      // the student's own order among equal grades.
      var order = h2.map(function (s, i) { return { s: s, i: i }; });
      order.sort(function (a, b) { return (H2Q[b.s.grade] - H2Q[a.s.grade]) || (a.i - b.i); });
      var weakest = order[3].s;
      h2 = order.slice(0, 3).map(function (o) { return o.s; });
      fourthItem = { key: "fourth", label: weakest.label + " (counted as an H1 subject)", name: weakest.label, grade: weakest.grade, level: "H1", q: H1Q[weakest.grade] };
      note = "With four H2 subjects, your best three count as H2s. Your weakest, " + weakest.label + " (" + weakest.grade + "), is treated as your fourth subject and scores H1 points.";
    } else if (fourth && fourth.level === "H1") {
      fourthItem = { key: "fourth", label: "Fourth subject (H1)", name: "your fourth subject", grade: fourth.grade, level: "H1", q: H1Q[fourth.grade] };
    }

    var base = h2.map(function (s) { return { label: s.label, grade: s.grade, level: "H2", q: H2Q[s.grade] }; });
    base.push({ label: "General Paper (H1)", grade: input.gp, level: "H1", q: H1Q[input.gp] });
    var baseQ = base.reduce(function (t, s) { return t + s.q; }, 0);

    var extras = [];
    if (fourthItem) extras.push(fourthItem);
    if (mtl) extras.push({ key: "mtl", label: "H1 Mother Tongue", name: "H1 Mother Tongue", grade: mtl, level: "H1", q: H1Q[mtl] });

    // Try every allowed combination; keep the highest score.
    // A combination replaces the current best only if it is strictly
    // higher ("counted only if it raises your score").
    // Score of a combination = (baseQ + extrasQ) / (4 * outOf) * 70
    var best = { mask: 0, totalQ: baseQ, outOf: 70 };
    for (var mask = 1; mask < (1 << extras.length); mask++) {
      var totalQ = baseQ, n = 0;
      for (var k = 0; k < extras.length; k++) {
        if (mask & (1 << k)) { totalQ += extras[k].q; n++; }
      }
      var outOf = 70 + 10 * n;
      // Compare totalQ/outOf with best.totalQ/best.outOf exactly
      if (totalQ * best.outOf > best.totalQ * outOf) best = { mask: mask, totalQ: totalQ, outOf: outOf };
    }

    extras.forEach(function (e, k) {
      e.counted = !!(best.mask & (1 << k));
      // What the score would be with this extra alone added to the base
      e.alone = round2((baseQ + e.q) * 70, 4 * 80);
      // +1 if this extra alone raises the base score, 0 if no change, -1 if it lowers it
      var d = (baseQ + e.q) * 70 - baseQ * 80;
      e.aloneVsBase = d > 0 ? 1 : (d < 0 ? -1 : 0);
    });

    // score = totalQ * 70 / (4 * outOf)
    var num = best.totalQ * 70, den = 4 * best.outOf;
    return {
      score: round2(num, den),
      exact: { num: num, den: den },
      base: base,
      extras: extras,
      totalQ: best.totalQ,
      outOf: best.outOf,
      baseScore: round2(baseQ * 70, 4 * 70),
      note: note
    };
  }

  var api = { compute: compute, GRADES: GRADES, pts: pts };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; }

  // ---------------- Page widget ----------------
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") node.textContent = attrs[k];
        else if (k === "className") node.className = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { if (c) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return node;
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  var uidN = 0;

  function gradeSelect(id, blankText) {
    var sel = el("select", { id: id });
    sel.appendChild(el("option", { value: "", text: blankText }));
    GRADES.forEach(function (g) { sel.appendChild(el("option", { value: g, text: g })); });
    return sel;
  }

  function field(id, labelText, control, hint) {
    var kids = [el("label", { "for": id, text: labelText }), control];
    if (hint) kids.push(el("span", { className: "ecg-uas-fieldhint", text: hint }));
    return el("div", { className: "ecg-uas-field" }, kids);
  }

  function init(root) {
    var uid = "uas" + (++uidN);
    root.innerHTML = "";

    root.appendChild(el("p", { className: "ecg-uas-scope", text: "For students who sat the A-Levels in 2025 or later." }));
    root.appendChild(el("p", { className: "ecg-uas-scope", text: "Nothing you enter is saved or sent anywhere." }));

    var form = el("form", { className: "ecg-uas-form", novalidate: "novalidate" });
    form.addEventListener("submit", function (e) { e.preventDefault(); });

    // Required: three H2s and GP
    var req = el("fieldset", { className: "ecg-uas-group" });
    req.appendChild(el("legend", { text: "Always counted" }));
    var grid = el("div", { className: "ecg-uas-grid" });
    var h2Sel = [1, 2, 3].map(function (i) {
      var s = gradeSelect(uid + "-h2-" + i, "Choose");
      grid.appendChild(field(uid + "-h2-" + i, "H2 subject " + i, s));
      return s;
    });
    var gpSel = gradeSelect(uid + "-gp", "Choose");
    grid.appendChild(field(uid + "-gp", "General Paper (H1)", gpSel));
    req.appendChild(grid);
    req.appendChild(el("p", { className: "ecg-uas-hint", text: "Taking H2 Knowledge and Inquiry? Enter it as one of your H2 subjects. It no longer replaces General Paper." }));
    form.appendChild(req);

    // Optional extras
    var opt = el("fieldset", { className: "ecg-uas-group" });
    opt.appendChild(el("legend", { text: "Counted only if they raise your score" }));
    var grid2 = el("div", { className: "ecg-uas-grid" });
    var levelSel = el("select", { id: uid + "-4l" });
    [["", "None"], ["H1", "H1"], ["H2", "H2"]].forEach(function (o) {
      levelSel.appendChild(el("option", { value: o[0], text: o[1] }));
    });
    var fourthSel = gradeSelect(uid + "-4g", "Choose");
    var fourthField = field(uid + "-4g", "Its grade", fourthSel);
    grid2.appendChild(field(uid + "-4l", "Fourth content subject", levelSel));
    grid2.appendChild(fourthField);
    var mtlSel = gradeSelect(uid + "-mtl", "Didn't take it");
    grid2.appendChild(field(uid + "-mtl", "H1 Mother Tongue", mtlSel));
    opt.appendChild(grid2);
    opt.appendChild(el("p", { className: "ecg-uas-hint", text: "Counting an O-Level Higher Mother Tongue grade instead of H1 Mother Tongue? This calculator can't convert it. Leave H1 Mother Tongue blank and ask the ECG Counsellor." }));
    form.appendChild(opt);

    var resetBtn = el("button", { type: "button", className: "btn ecg-uas-reset", text: "Clear" });
    form.appendChild(resetBtn);
    root.appendChild(form);

    var out = el("div", { className: "ecg-uas-result", "aria-live": "polite" });
    root.appendChild(out);

    function syncFourth() {
      var on = levelSel.value !== "";
      fourthField.hidden = !on;
      fourthSel.disabled = !on;
    }

    function render() {
      syncFourth();
      out.innerHTML = "";
      var h2 = h2Sel.map(function (s) { return s.value; });
      var missing = h2.filter(function (g) { return !g; }).length + (gpSel.value ? 0 : 1);
      if (missing) {
        out.appendChild(el("p", { className: "ecg-uas-waiting", text: "Choose grades for your three H2 subjects and General Paper to see your score." }));
        return;
      }
      if (levelSel.value && !fourthSel.value) {
        out.appendChild(el("p", { className: "ecg-uas-waiting", text: "Choose a grade for your fourth content subject, or set it to “None”." }));
        return;
      }
      var r = compute({
        h2: h2, gp: gpSel.value,
        fourth: levelSel.value ? { level: levelSel.value, grade: fourthSel.value } : null,
        mtl: mtlSel.value || null
      });

      out.appendChild(el("p", { className: "ecg-uas-score" }, [
        el("span", { className: "ecg-uas-score-label", text: "Your University Admission Score" }),
        el("span", { className: "ecg-uas-score-num" }, [el("strong", { text: r.score }), " out of 70"])
      ]));

      // The working
      var table = el("table", { className: "ecg-uas-working" });
      table.appendChild(el("thead", {}, [el("tr", {}, [
        el("th", { scope: "col", text: "Subject" }),
        el("th", { scope: "col", text: "Grade" }),
        el("th", { scope: "col", text: "Points" }),
        el("th", { scope: "col", text: "Counts?" })
      ])]));
      var tb = el("tbody");
      r.base.forEach(function (s) {
        tb.appendChild(el("tr", {}, [
          el("th", { scope: "row", text: s.label }), el("td", { text: s.grade }),
          el("td", { text: pts(s.q) + " / " + (s.level === "H2" ? "20" : "10") }), el("td", { text: "Yes" })
        ]));
      });
      r.extras.forEach(function (e) {
        tb.appendChild(el("tr", { className: e.counted ? "" : "ecg-uas-dropped" }, [
          el("th", { scope: "row", text: e.label }), el("td", { text: e.grade }),
          el("td", { text: pts(e.q) + " / 10" }), el("td", { text: e.counted ? "Yes" : "No" })
        ]));
      });
      tb.appendChild(el("tr", { className: "ecg-uas-sum" }, [
        el("th", { scope: "row", text: "Total" }), el("td", { text: "" }),
        el("td", { text: pts(r.totalQ) + " / " + r.outOf }), el("td", { text: "" })
      ]));
      table.appendChild(tb);
      out.appendChild(el("div", { className: "table-wrapper" }, [table]));

      var lines = [];
      if (r.note) lines.push(r.note);
      var added = r.extras.filter(function (e) { return e.counted; });
      if (r.outOf === 70) {
        lines.push("Your score is the total of your three H2 subjects and General Paper: " + pts(r.totalQ) + " out of 70.");
      } else {
        var addedNames = added.map(function (e) { return e.name; }).join(" and ");
        lines.push("Adding " + addedNames + " makes the total " + pts(r.totalQ) + " out of " + r.outOf + ". This is rescaled to 70: " + pts(r.totalQ) + " ÷ " + r.outOf + " × 70 = " + r.score + ". Without " + (added.length === 2 ? "them" : "it") + " you would have " + r.baseScore + ".");
      }
      r.extras.forEach(function (e) {
        if (e.counted) return;
        var what = cap(e.name) + " (grade " + e.grade + ") isn't added in: ";
        if (e.aloneVsBase > 0) lines.push(what + added[0].name + " raises your score more, and adding this as well would not raise it further.");
        else if (e.aloneVsBase === 0) lines.push(what + "it would leave your score unchanged.");
        else lines.push(what + "it would lower your score, to " + e.alone + ".");
      });
      var ul = el("ul", { className: "ecg-uas-explain" });
      lines.forEach(function (t) { ul.appendChild(el("li", { text: t })); });
      out.appendChild(ul);
      if ((r.exact.num * 100) % r.exact.den !== 0) {
        out.appendChild(el("p", { className: "ecg-uas-small", text: "Scores are shown to 2 decimal places." }));
      }
    }

    [h2Sel[0], h2Sel[1], h2Sel[2], gpSel, levelSel, fourthSel, mtlSel].forEach(function (s) { s.addEventListener("change", render); });
    resetBtn.addEventListener("click", function () {
      [h2Sel[0], h2Sel[1], h2Sel[2], gpSel, levelSel, fourthSel, mtlSel].forEach(function (s) { s.value = ""; });
      render();
      h2Sel[0].focus();
    });
    render();
  }

  function start() {
    var roots = document.querySelectorAll(".ecg-uas");
    for (var i = 0; i < roots.length; i++) init(roots[i]);
  }
  global.ECGUAS = api;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})(this);

/* -------------------------------------------------------------
   ECG@RVHS weighted decision table
   Placed on a page with {% include weighted-table.html %}.
   Everything stays in the student's own browser (localStorage);
   nothing is sent anywhere.
   ------------------------------------------------------------- */
(function () {
  "use strict";

  var STORE_KEY = "ecg-weighted-table-v1";
  var MAX_CONSIDERATIONS = 10;
  var MIN_CONSIDERATIONS = 1;
  var MAX_OPTIONS = 5;
  var MIN_OPTIONS = 2;
  var WEIGHT_LABELS = {
    1: "1 · Nice to have",
    2: "2",
    3: "3 · Important",
    4: "4",
    5: "5 · Essential"
  };

  var nextId = 1;
  function newId(prefix) { return prefix + (nextId++) + "-" + Math.random().toString(36).slice(2, 6); }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") node.textContent = attrs[k];
        else if (k === "className") node.className = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function splitList(s) {
    return (s || "").split("|").map(function (x) { return x.trim(); }).filter(Boolean);
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (s && Array.isArray(s.considerations) && Array.isArray(s.options) && s.ratings) return s;
    } catch (e) { /* storage blocked or corrupt: start fresh */ }
    return null;
  }

  function save(state) {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function freshState(root) {
    var cons = splitList(root.getAttribute("data-considerations"));
    var opts = splitList(root.getAttribute("data-options"));
    if (!cons.length) cons = [""];
    while (opts.length < MIN_OPTIONS) opts.push("");
    return {
      considerations: cons.slice(0, MAX_CONSIDERATIONS).map(function (n) { return { id: newId("c"), name: n, weight: 3 }; }),
      options: opts.slice(0, MAX_OPTIONS).map(function (n) { return { id: newId("o"), name: n }; }),
      ratings: {}
    };
  }

  function consName(c, i) { return c.name.trim() || "Consideration " + (i + 1); }
  function optName(o, i) { return o.name.trim() || "Option " + String.fromCharCode(65 + i); }

  function init(root) {
    var state = load() || freshState(root);
    var uid = newId("wt");

    root.innerHTML = "";
    var sec1 = el("section", { className: "ecg-wt-step", "aria-labelledby": uid + "-h1" });
    var sec2 = el("section", { className: "ecg-wt-step", "aria-labelledby": uid + "-h2" });
    var sec3 = el("section", { className: "ecg-wt-step", "aria-labelledby": uid + "-h3" });
    var sec4 = el("section", { className: "ecg-wt-step ecg-wt-results", "aria-labelledby": uid + "-h4" });
    root.appendChild(el("p", { className: "ecg-wt-privacy", text: "Your answers stay on this device. Nothing is sent to the school or anyone else." }));
    root.appendChild(sec1); root.appendChild(sec2); root.appendChild(sec3); root.appendChild(sec4);

    var actions = el("div", { className: "ecg-wt-actions" });
    var printBtn = el("button", { type: "button", className: "btn", text: "Print or save as PDF" });
    var clearBtn = el("button", { type: "button", className: "btn", text: "Clear my ratings" });
    var resetBtn = el("button", { type: "button", className: "btn", text: "Start again" });
    actions.appendChild(printBtn); actions.appendChild(clearBtn); actions.appendChild(resetBtn);
    root.appendChild(actions);

    printBtn.addEventListener("click", function () { window.print(); });
    clearBtn.addEventListener("click", function () {
      if (!window.confirm("Clear all your 1–10 ratings? Your list and options will stay.")) return;
      state.ratings = {};
      commit(); renderRatings(); renderResults();
    });
    resetBtn.addEventListener("click", function () {
      if (!window.confirm("Start again? This clears your list, options and ratings.")) return;
      state = freshState(root);
      commit(); renderAll();
    });

    function commit() { save(state); }

    function rating(cid, oid) {
      var r = state.ratings[cid] && state.ratings[cid][oid];
      return r >= 1 && r <= 10 ? r : null;
    }

    // ---------- Step 1: what matters ----------
    function renderConsiderations(focusId) {
      sec1.innerHTML = "";
      sec1.appendChild(el("h4", { id: uid + "-h1", text: "1. What matters to you?" }));
      sec1.appendChild(el("p", { className: "ecg-wt-hint", text: "List what you care about, then say how much each one matters (1 = nice to have, 5 = essential)." }));
      var list = el("ol", { className: "ecg-wt-list" });
      state.considerations.forEach(function (c, i) {
        var nameId = uid + "-cn-" + c.id, wId = uid + "-cw-" + c.id;
        var name = el("input", { type: "text", id: nameId, value: c.name, placeholder: "e.g. Internships", maxlength: "60", autocomplete: "off" });
        name.value = c.name;
        name.addEventListener("input", function () { c.name = name.value; commit(); renderRatings(); renderResults(); });

        var sel = el("select", { id: wId });
        [1, 2, 3, 4, 5].forEach(function (w) {
          var o = el("option", { value: String(w), text: WEIGHT_LABELS[w] });
          if (w === c.weight) o.selected = true;
          sel.appendChild(o);
        });
        sel.addEventListener("change", function () { c.weight = parseInt(sel.value, 10); commit(); renderRatings(); renderResults(); });

        var rm = el("button", { type: "button", className: "ecg-wt-remove", text: "Remove", "aria-label": "Remove " + consName(c, i) });
        if (state.considerations.length <= MIN_CONSIDERATIONS) rm.disabled = true;
        rm.addEventListener("click", function () {
          state.considerations.splice(i, 1);
          delete state.ratings[c.id];
          commit(); renderAll();
          var next = state.considerations[Math.min(i, state.considerations.length - 1)];
          focusById(uid + "-cn-" + next.id);
        });

        list.appendChild(el("li", { className: "ecg-wt-row" }, [
          el("div", { className: "ecg-wt-field ecg-wt-grow" }, [el("label", { "for": nameId, text: "Consideration " + (i + 1) }), name]),
          el("div", { className: "ecg-wt-field" }, [el("label", { "for": wId, text: "How much it matters" }), sel]),
          rm
        ]));
      });
      sec1.appendChild(list);
      var add = el("button", { type: "button", className: "btn ecg-wt-add", text: "+ Add a consideration" });
      if (state.considerations.length >= MAX_CONSIDERATIONS) { add.disabled = true; add.textContent = "Maximum of " + MAX_CONSIDERATIONS + " considerations"; }
      add.addEventListener("click", function () {
        var c = { id: newId("c"), name: "", weight: 3 };
        state.considerations.push(c);
        commit(); renderAll();
        focusById(uid + "-cn-" + c.id);
      });
      sec1.appendChild(add);
      if (focusId) focusById(focusId);
    }

    // ---------- Step 2: options ----------
    function renderOptions() {
      sec2.innerHTML = "";
      sec2.appendChild(el("h4", { id: uid + "-h2", text: "2. What are your options?" }));
      sec2.appendChild(el("p", { className: "ecg-wt-hint", text: "The courses or universities you are choosing between (2 to " + MAX_OPTIONS + ")." }));
      var list = el("ol", { className: "ecg-wt-list" });
      state.options.forEach(function (o, i) {
        var nameId = uid + "-on-" + o.id;
        var name = el("input", { type: "text", id: nameId, placeholder: "e.g. NTU Computer Science", maxlength: "60", autocomplete: "off" });
        name.value = o.name;
        name.addEventListener("input", function () { o.name = name.value; commit(); renderRatings(); renderResults(); });
        var rm = el("button", { type: "button", className: "ecg-wt-remove", text: "Remove", "aria-label": "Remove " + optName(o, i) });
        if (state.options.length <= MIN_OPTIONS) rm.disabled = true;
        rm.addEventListener("click", function () {
          state.options.splice(i, 1);
          Object.keys(state.ratings).forEach(function (cid) { delete state.ratings[cid][o.id]; });
          commit(); renderAll();
          var next = state.options[Math.min(i, state.options.length - 1)];
          focusById(uid + "-on-" + next.id);
        });
        list.appendChild(el("li", { className: "ecg-wt-row" }, [
          el("div", { className: "ecg-wt-field ecg-wt-grow" }, [el("label", { "for": nameId, text: "Option " + String.fromCharCode(65 + i) }), name]),
          rm
        ]));
      });
      sec2.appendChild(list);
      var add = el("button", { type: "button", className: "btn ecg-wt-add", text: "+ Add an option" });
      if (state.options.length >= MAX_OPTIONS) { add.disabled = true; add.textContent = "Maximum of " + MAX_OPTIONS + " options"; }
      add.addEventListener("click", function () {
        var o = { id: newId("o"), name: "" };
        state.options.push(o);
        commit(); renderAll();
        focusById(uid + "-on-" + o.id);
      });
      sec2.appendChild(add);
    }

    // ---------- Step 3: ratings ----------
    function renderRatings() {
      // Keep focus on the rating the student is using, if any
      var active = document.activeElement && root.contains(document.activeElement) && sec3.contains(document.activeElement) ? document.activeElement.id : null;
      sec3.innerHTML = "";
      sec3.appendChild(el("h4", { id: uid + "-h3", text: "3. Rate each option from 1 to 10" }));
      sec3.appendChild(el("p", { className: "ecg-wt-hint", text: "How well does each option do on each thing? 1 = very poorly, 10 = excellently. Higher is always better, so for cost the cheaper option gets the higher rating. Rate honestly, even if it hurts your favourite." }));
      state.considerations.forEach(function (c, ci) {
        var fs = el("fieldset", { className: "ecg-wt-rate" });
        fs.appendChild(el("legend", {}, [
          document.createTextNode(consName(c, ci) + " "),
          el("span", { className: "ecg-wt-weight", text: "matters " + c.weight + "/5" })
        ]));
        var grid = el("div", { className: "ecg-wt-rate-grid" });
        state.options.forEach(function (o, oi) {
          var sid = uid + "-r-" + c.id + "-" + o.id;
          var sel = el("select", { id: sid });
          sel.appendChild(el("option", { value: "", text: "–" }));
          for (var r = 1; r <= 10; r++) {
            var opt = el("option", { value: String(r), text: String(r) });
            if (rating(c.id, o.id) === r) opt.selected = true;
            sel.appendChild(opt);
          }
          sel.addEventListener("change", function () {
            if (!state.ratings[c.id]) state.ratings[c.id] = {};
            var v = parseInt(sel.value, 10);
            if (v >= 1 && v <= 10) state.ratings[c.id][o.id] = v; else delete state.ratings[c.id][o.id];
            commit(); renderResults();
          });
          var lab = el("label", { "for": sid }, [
            el("span", { className: "ecg-wt-optname", text: optName(o, oi) }),
            el("span", { className: "ecg-sr", text: " on " + consName(c, ci) })
          ]);
          grid.appendChild(el("div", { className: "ecg-wt-field" }, [lab, sel]));
        });
        fs.appendChild(grid);
        sec3.appendChild(fs);
      });
      if (active) focusById(active);
    }

    // ---------- Step 4: results ----------
    function renderResults() {
      sec4.innerHTML = "";
      sec4.appendChild(el("h4", { id: uid + "-h4", text: "4. Your totals" }));
      var live = el("div", { "aria-live": "polite" });
      sec4.appendChild(live);

      var maxTotal = state.considerations.reduce(function (s, c) { return s + c.weight * 10; }, 0);
      var missing = 0, anyRated = false;
      var rows = state.options.map(function (o, oi) {
        var total = 0;
        state.considerations.forEach(function (c) {
          var r = rating(c.id, o.id);
          if (r === null) missing++; else { anyRated = true; total += r * c.weight; }
        });
        return { o: o, name: optName(o, oi), total: total };
      });

      if (!anyRated) {
        live.appendChild(el("p", { className: "ecg-wt-hint", text: "Rate your options in step 3 and the totals will appear here." }));
        return;
      }

      var sorted = rows.slice().sort(function (a, b) { return b.total - a.total; });
      var top = sorted[0].total;
      var list = el("ul", { className: "ecg-wt-totals" });
      sorted.forEach(function (row) {
        var pct = maxTotal ? Math.round(row.total / maxTotal * 100) : 0;
        var isTop = row.total === top && top > 0;
        var head = el("div", { className: "ecg-wt-total-head" }, [
          el("span", { className: "ecg-wt-total-name", text: row.name }),
          isTop ? el("span", { className: "ecg-wt-badge", text: "Highest total" }) : null,
          el("span", { className: "ecg-wt-total-num", text: row.total + " out of " + maxTotal })
        ]);
        var bar = el("div", { className: "ecg-wt-bar", "aria-hidden": "true" }, [el("span", { style: "width:" + pct + "%" })]);
        list.appendChild(el("li", {}, [head, bar]));
      });
      live.appendChild(list);

      if (missing) {
        live.appendChild(el("p", { className: "ecg-wt-note", text: missing + (missing === 1 ? " rating is" : " ratings are") + " still blank and counted as 0. Fill them in for a fair comparison." }));
      }
      if (sorted.length > 1 && maxTotal && (sorted[0].total - sorted[1].total) <= maxTotal * 0.05) {
        live.appendChild(el("p", { className: "ecg-wt-note", text: "Your top two are very close. The numbers can't separate them, so the decision rests on something else: talk it through with someone you trust." }));
      }
      live.appendChild(el("p", { className: "ecg-wt-reflect", text: "Gut check: how do you feel about the result? If you're disappointed, that tells you something too. Something you care about may be missing from your list, or one of your weights may be off. Change them and see what moves." }));

      // The working, laid out like the paper table
      var det = el("details", { className: "ecg-wt-working" });
      det.appendChild(el("summary", { text: "See the working (rating × weight)" }));
      var table = el("table");
      var thead = el("thead"), hr = el("tr");
      hr.appendChild(el("th", { scope: "col", text: "Consideration (weight)" }));
      rows.forEach(function (row) { hr.appendChild(el("th", { scope: "col", text: row.name })); });
      thead.appendChild(hr); table.appendChild(thead);
      var tbody = el("tbody");
      state.considerations.forEach(function (c, ci) {
        var tr = el("tr");
        tr.appendChild(el("th", { scope: "row", text: consName(c, ci) + " (" + c.weight + ")" }));
        rows.forEach(function (row) {
          var r = rating(c.id, row.o.id);
          tr.appendChild(el("td", { text: r === null ? "–" : r + " × " + c.weight + " = " + r * c.weight }));
        });
        tbody.appendChild(tr);
      });
      var tt = el("tr", { className: "ecg-wt-sum" });
      tt.appendChild(el("th", { scope: "row", text: "Total" }));
      rows.forEach(function (row) { tt.appendChild(el("td", { text: String(row.total) })); });
      tbody.appendChild(tt);
      table.appendChild(tbody);
      det.appendChild(el("div", { className: "table-wrapper" }, [table]));
      sec4.appendChild(det);
    }

    function focusById(id) {
      var n = document.getElementById(id);
      if (n) n.focus();
    }

    function renderAll() { renderConsiderations(); renderOptions(); renderRatings(); renderResults(); }
    renderAll();
  }

  function start() {
    var roots = document.querySelectorAll(".ecg-wt");
    for (var i = 0; i < roots.length; i++) init(roots[i]);
    // Show the working when printing
    window.addEventListener("beforeprint", function () {
      var d = document.querySelectorAll(".ecg-wt-working");
      for (var j = 0; j < d.length; j++) d[j].open = true;
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

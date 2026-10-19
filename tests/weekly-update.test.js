// Tests for the Monday email logic in scripts/weekly-update-email.gs
// Run: node tests/weekly-update.test.js
"use strict";
const assert = require("assert");
const path = require("path");
const W = require(path.join(__dirname, "..", "scripts", "weekly-update-email.gs"));

const cfg = Object.assign({}, W.CONFIG, { GROUP_EMAIL: "test@googlegroups.com" });

const OPP_HEAD = ["Title", "Organiser", "Type", "Field", "Open to", "Closing date", "Summary", "Link", "Posted"];
const ANN_HEAD = ["Headline", "For", "Message", "Link", "Button text", "Show from", "Remove after"];
function opp(title, closing, posted, link) {
  return [title, "Org " + title, "Internship", "Any field", "Graduates only", closing, "Summary of " + title, link || "", posted];
}
function ann(h, from, until, link) { return [h, "Graduates", "Message " + h, link || "", "", from, until]; }

let n = 0;
function test(name, fn) { fn(); n++; console.log("ok - " + name); }

const today = "2026-10-19"; // a Monday

test("first run: only the last 7 days count as new; older items are silenced", () => {
  const opps = [OPP_HEAD, opp("Old", "2026-12-31", "2026-10-09"), opp("Recent", "2026-12-31", "2026-10-14"),
                opp("Today", "2026-12-31", "2026-10-19")];
  const d = W.buildDigest(opps, [ANN_HEAD], today, null, cfg);
  assert.deepStrictEqual(d.newOpps.map(o => o.title), ["Recent", "Today"]);
  assert.ok(d.silentKeys.some(k => k.indexOf("old") !== -1));
  assert.strictEqual(d.send, true);
});

test("later runs skip what was already sent", () => {
  const week1 = [OPP_HEAD, opp("Recent", "2026-12-31", "2026-10-14")];
  const first = W.buildDigest(week1, [ANN_HEAD], today, null, cfg);
  const sent = W.markSent({}, first.newKeys.concat(first.silentKeys), today);
  const week2 = week1.concat([opp("Newer", "2026-12-31", "2026-10-22")]);
  const next = W.buildDigest(week2, [ANN_HEAD], "2026-10-26", sent, cfg);
  assert.deepStrictEqual(next.newOpps.map(o => o.title), ["Newer"]);
});

test("an item posted on Monday after the email goes out is in the next email", () => {
  const before = [OPP_HEAD, opp("A", "2026-12-31", "2026-10-15")];
  const d1 = W.buildDigest(before, [ANN_HEAD], today, null, cfg);
  const sent = W.markSent({}, d1.newKeys, today);
  const after = [OPP_HEAD, opp("A", "2026-12-31", "2026-10-15"), opp("Monday later", "2026-12-31", "2026-10-19")];
  const d2 = W.buildDigest(after, [ANN_HEAD], "2026-10-26", sent, cfg);
  assert.deepStrictEqual(d2.newOpps.map(o => o.title), ["Monday later"]);
});

test("closed listings are left out; closing within 7 days goes under Closing this week", () => {
  const opps = [OPP_HEAD, opp("Closed", "2026-10-18", "2026-10-15"), opp("Closes Sunday", "2026-10-25", "2026-10-01"),
                opp("Closes next Monday", "2026-10-26", "2026-10-01"), opp("New and closing", "2026-10-20", "2026-10-17")];
  const sent = { "O|closes sunday|2026-10-01": "2026-10-05", "O|closes next monday|2026-10-01": "2026-10-05" };
  const d = W.buildDigest(opps, [ANN_HEAD], today, sent, cfg);
  assert.deepStrictEqual(d.newOpps.map(o => o.title), ["New and closing"]);
  assert.deepStrictEqual(d.closing.map(o => o.title), ["Closes Sunday"]);
});

test("no new items = no email, even if something closes this week", () => {
  const opps = [OPP_HEAD, opp("Closes Sunday", "2026-10-25", "2026-10-01")];
  const d = W.buildDigest(opps, [ANN_HEAD], today, { "O|closes sunday|2026-10-01": "2026-10-05" }, cfg);
  assert.strictEqual(d.send, false);
  assert.strictEqual(d.closing.length, 1);
  const d2 = W.buildDigest(opps, [ANN_HEAD], today, { "O|closes sunday|2026-10-01": "2026-10-05" },
                           Object.assign({}, cfg, { SEND_IF_ONLY_CLOSING: true }));
  assert.strictEqual(d2.send, true);
});

test("announcements: only those showing on Home today; scheduled ones wait", () => {
  const anns = [ANN_HEAD, ann("Live", "2026-10-19", "2027-03-19", "/results-and-applying"),
                ann("Scheduled", "2027-01-01", "2027-03-19"), ann("No remove date", "2026-10-15", ""),
                ann("Expired", "2026-09-01", "2026-10-01")];
  const d = W.buildDigest([OPP_HEAD], anns, today, {}, cfg);
  assert.deepStrictEqual(d.announcements.map(a => a.headline), ["Live"]);
  assert.strictEqual(d.announcements[0].link, "https://arkdein.github.io/ecg-site/results-and-applying");
  const later = W.buildDigest([OPP_HEAD], anns, "2027-01-04", W.markSent({}, d.newKeys, today), cfg);
  assert.deepStrictEqual(later.announcements.map(a => a.headline), ["Scheduled"]);
});

test("undated listing: silenced on the first run, new on later runs", () => {
  const opps = [OPP_HEAD, opp("Undated", "", "")];
  assert.strictEqual(W.buildDigest(opps, [ANN_HEAD], today, null, cfg).newOpps.length, 0);
  assert.strictEqual(W.buildDigest(opps, [ANN_HEAD], today, {}, cfg).newOpps.length, 1);
});

test("email: escapes text, keeps unsafe links out, falls back to the opportunities page", () => {
  const opps = [OPP_HEAD, opp("<b>Bold</b> & co", "2026-10-30", "2026-10-18", "javascript:alert(1)")];
  const d = W.buildDigest(opps, [ANN_HEAD], today, {}, cfg);
  const e = W.renderEmail(d, today, cfg);
  assert.ok(e.html.indexOf("&lt;b&gt;Bold&lt;/b&gt; &amp; co") !== -1);
  assert.ok(e.html.indexOf("javascript:") === -1);
  assert.ok(e.html.indexOf("https://arkdein.github.io/ecg-site/opportunities.html") !== -1);
  assert.ok(/Closes 30 Oct 2026 \(in 11 days\)/.test(e.text));
  assert.strictEqual(e.subject, "ECG@RVHS weekly update · 19 Oct 2026");
});

test("markSent drops entries older than 180 days", () => {
  const s = W.markSent({ old: "2026-01-01", keep: "2026-09-01" }, ["new"], today);
  assert.deepStrictEqual(Object.keys(s).sort(), ["keep", "new"]);
});

test("todaySG uses Singapore time", () => {
  assert.strictEqual(W.todaySG(new Date("2026-10-18T16:30:00Z")), "2026-10-19");
  assert.strictEqual(W.todaySG(new Date("2026-10-18T15:30:00Z")), "2026-10-18");
});

test("shorten cuts at a word and adds an ellipsis", () => {
  assert.strictEqual(W.shorten("one two three four", 9), "one two…");
  assert.strictEqual(W.shorten("short", 50), "short");
});

console.log(n + " tests passed");

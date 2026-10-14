/* -------------------------------------------------------------
   Checks the external-link rules (assets/js/external-links.js).
   Not part of the website.

   Run:  node tests/external-links.test.js
   ------------------------------------------------------------- */
"use strict";
var assert = require("assert");
var path = require("path");
var ext = require(path.join(__dirname, "..", "assets", "js", "external-links.js"));

var here = "https://arkdein.github.io/ecg-site/get-help.html";

// Other websites: new tab
assert.strictEqual(ext.isExternal("https://www.smu.edu.sg/admissions", here), true);
assert.strictEqual(ext.isExternal("http://www.ntu.edu.sg/", here), true);
assert.strictEqual(ext.isExternal("https://docs.google.com/forms/d/e/x/viewform", here), true);
assert.strictEqual(ext.isExternal("//www.moe.gov.sg/", here), true);              // no http(s) written
assert.strictEqual(ext.isExternal("https://arkdein.github.io.example.com/", here), true);

// This site: same tab
assert.strictEqual(ext.isExternal("/ecg-site/scholarships.html", here), false);
assert.strictEqual(ext.isExternal("scholarships.html", here), false);
assert.strictEqual(ext.isExternal("#book-a-session", here), false);
assert.strictEqual(ext.isExternal("https://arkdein.github.io/ecg-site/for-parents-zh.html", here), false);
assert.strictEqual(ext.isExternal("/ecg-site/assets/data/opportunities-sample.csv", here), false);

// Not web links: left alone
assert.strictEqual(ext.isExternal("mailto:daryl_lim_jun_wei@moe.edu.sg", here), false);
assert.strictEqual(ext.isExternal("tel:+6567691200", here), false);
assert.strictEqual(ext.isExternal("javascript:void(0)", here), false);
assert.strictEqual(ext.isExternal("", here), false);
assert.strictEqual(ext.isExternal(null, here), false);

// Screen-reader note in the page's language
assert.strictEqual(ext.noteFor("zh-Hans"), "（在新页中打开）");
assert.strictEqual(ext.noteFor("en"), "(opens in a new tab)");
assert.strictEqual(ext.noteFor(""), "(opens in a new tab)");

console.log("external-links: all checks passed");

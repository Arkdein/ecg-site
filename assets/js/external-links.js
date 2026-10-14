/* -------------------------------------------------------------
   ECG@RVHS external links: open in a new tab
   Loaded on every page by _includes/head_custom.html.
   Editors don't need to do anything: write links as usual.

   Rules:
   - A link to another website (http or https, a different
     address from this site) opens in a new tab.
   - It gets a small ↗ after the link text, and screen readers
     hear "(opens in a new tab)". On a Chinese page (lang: zh-Hans,
     or inside an element with lang="zh-…") they hear
     "（在新页中打开）".
   - Links on this site, email links (mailto:) and phone links
     (tel:) are left alone.
   - Links added later by other scripts (e.g. the Current
     Opportunities cards) are handled too.
   - To keep one external link in the same tab, give it the class
     ecg-same-tab, e.g.  [Name](https://…){: .ecg-same-tab }
   - Inside the "Was this page helpful?" box no ↗ is added, because
     the note there already says the form opens in a new tab.

   Before changing the rules, run:
     node tests/external-links.test.js
   ------------------------------------------------------------- */
(function (global) {
  "use strict";

  var DONE = "data-ecg-ext";           // marks a link already handled
  var NOTED = ".ecg-feedback";          // boxes that already say "opens in a new tab"
  var TEXT = { en: "(opens in a new tab)", zh: "（在新页中打开）" };

  // Is `href` a link to another website? `here` is this page's address.
  function isExternal(href, here) {
    if (!href) return false;
    var url;
    try { url = new URL(href, here); } catch (e) { return false; }
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return url.origin !== new URL(here).origin;
  }

  // Chinese text or English text for screen readers
  function noteFor(lang) {
    return /^zh/i.test(lang || "") ? TEXT.zh : TEXT.en;
  }

  var api = { isExternal: isExternal, noteFor: noteFor, TEXT: TEXT };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; }

  /* ---------- Page ---------- */

  var me = document.currentScript;
  var pageLang = (me && me.getAttribute("data-page-lang")) || document.documentElement.lang || "en";

  function langOf(a) {
    var holder = a.closest("[lang]");
    // The <html> element's lang is the site default; a page's own lang wins over it
    if (holder && holder !== document.documentElement) return holder.getAttribute("lang");
    return pageLang;
  }

  function handle(a) {
    if (a.hasAttribute(DONE)) return;
    a.setAttribute(DONE, "");
    if (a.classList.contains("ecg-same-tab") || a.hasAttribute("download")) return;
    if (!isExternal(a.getAttribute("href"), location.href)) return;

    a.target = "_blank";
    var rel = (a.getAttribute("rel") || "").split(/\s+/).filter(Boolean);
    if (rel.indexOf("noopener") < 0) rel.push("noopener");
    a.setAttribute("rel", rel.join(" "));

    if (a.closest(NOTED)) return;
    var note = noteFor(langOf(a));

    // An aria-label replaces the link text for screen readers, so add the note there
    var label = a.getAttribute("aria-label");
    if (label) a.setAttribute("aria-label", label + " " + note);
    else {
      var sr = document.createElement("span");
      sr.className = "ecg-sr-only";
      sr.textContent = (note === TEXT.zh ? "" : " ") + note; // Chinese brackets need no space
      a.appendChild(sr);
    }

    // The ↗ only when the link shows text (not for a link around a picture)
    if (a.textContent.replace(note, "").trim()) {
      var icon = document.createElement("span");
      icon.className = "ecg-ext-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = " ↗"; // no-break space keeps ↗ on the same line as the last word
      a.insertBefore(icon, a.querySelector(".ecg-sr-only"));
    }
  }

  function scan(root) {
    if (root.nodeType !== 1) return;
    if (root.matches("a[href]")) handle(root);
    var links = root.querySelectorAll("a[href]");
    for (var i = 0; i < links.length; i++) handle(links[i]);
  }

  function start() {
    scan(document.body);
    if (global.MutationObserver) {
      new MutationObserver(function (changes) {
        changes.forEach(function (c) { c.addedNodes.forEach(scan); });
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  global.ECGExternalLinks = api;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})(this);

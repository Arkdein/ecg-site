# ECG@RVHS website (draft)

The Education and Career Guidance website for River Valley High School, built with GitHub Pages and the [Just the Docs](https://just-the-docs.com/) theme.

**Status:** draft for the ECG team. A "draft" banner shows on every page and search engines are told not to list the site until `draft: false` is set in `_config.yml`.

## For the team

- **How to edit a page:** [EDITING.md](EDITING.md)
- **Style sheet:** [STYLE.md](STYLE.md)
- **New page templates:** [templates/](templates/)
- **Webmaster's Dashboard:** [DASHBOARD.md](DASHBOARD.md)

## What's where

| File | What it is |
|---|---|
| `index.md` … `for-parents.md` | The launch pages (council plan, 1 Oct 2026, as revised) |
| `_config.yml` | Site settings: address, draft switch, crest, Google Analytics ID |
| `_includes/` | Draft banner, sidebar crest and title, page owner and portfolio, and motto footer, "What next?" block, weighted table tool, University Admission Score calculator, Current Opportunities list |
| `assets/js/` | Scripts for the weighted table tool, the University Admission Score calculator and the Current Opportunities list (nothing visitors type is saved or sent) |
| `assets/data/` | Sample listings shown on Current Opportunities until the Google Sheet link is set |
| `tests/` | Checks for the scripts: `node tests/opportunities.test.js`, `node tests/uas-calculator.test.js`, `node tests/site-health.test.js` |
| `scripts/` | Not published. `site-health.js` (nightly page check for the dashboard) and `dashboard-sheet.gs` (Apps Script for the dashboard's data Sheet) |
| `.github/workflows/` | `site-health.yml`: runs the nightly page check and puts the results on the `site-health` branch |
| `_sass/` | School colours (`custom/setup.scss`), colour scheme, custom styles |
| `templates/` | Page templates (not published) |

## Current Opportunities feed

Listings for recent graduates come from the Google Sheet **ECG Opportunities and Announcements (website feed)** (owned by the ECG account that created it). The page reads the Sheet's **Opportunities public** tab, published to the web as CSV, each time it loads; nothing needs rebuilding when a teacher adds a row.

To connect it (once): in the Sheet, File > Share > Publish to web > choose **Opportunities public** and **Comma-separated values (.csv)** > Publish, then paste the link into `_config.yml` as `opportunities_csv`. If the school account doesn't allow publishing to the web, the Sheet has to be owned by an account that does. Google refreshes published sheets about every 5 minutes.

## Key Announcements feed (Home)

The same Sheet's **Announcements** tab feeds the Key announcements block on Home. Approved rows with a Remove after date fill the **Announcements public** tab; publish that tab to the web as CSV the same way and paste the link into `_config.yml` as `announcements_csv`. The block (`_includes/announcements.html`, `assets/js/announcements.js`) is hidden when nothing is current or the link is empty. Rules and tests: `node tests/announcements.test.js`.

## Publishing rule

Only the editor and deputy merge changes into `main`. Everyone else proposes changes, which the editor or deputy reviews before they go live.

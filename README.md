# ECG@RVHS website (draft)

The Education and Career Guidance website for River Valley High School, built with GitHub Pages and the [Just the Docs](https://just-the-docs.com/) theme.

**Status:** draft for the ECG team. A "draft" banner shows on every page and search engines are told not to list the site until `draft: false` is set in `_config.yml`.

## For the team

- **How to edit a page:** [EDITING.md](EDITING.md)
- **Style sheet:** [STYLE.md](STYLE.md)
- **New page templates:** [templates/](templates/)

## What's where

| File | What it is |
|---|---|
| `index.md` … `for-parents.md` | The launch pages (council plan, 1 Oct 2026, as revised) |
| `_config.yml` | Site settings: address, draft switch, crest |
| `_includes/` | Draft banner, sidebar crest and title, page owner and motto footer, "What next?" block, weighted table tool, University Admission Score calculator, Current Opportunities list |
| `assets/js/` | Scripts for the weighted table tool, the University Admission Score calculator and the Current Opportunities list (nothing visitors type is saved or sent) |
| `assets/data/` | Sample listings shown on Current Opportunities until the Google Sheet link is set |
| `tests/` | Checks for the scripts: `node tests/opportunities.test.js`, `node tests/uas-calculator.test.js` |
| `_sass/` | School colours (`custom/setup.scss`), colour scheme, custom styles |
| `templates/` | Page templates (not published) |

## Current Opportunities feed

Listings for recent graduates come from the Google Sheet **ECG Current Opportunities (website feed)** (owned by the ECG account that created it). The page reads the Sheet's **Public** tab, published to the web as CSV, each time it loads; nothing needs rebuilding when a teacher adds a row.

To connect it (once): in the Sheet, File > Share > Publish to web > choose **Public** and **Comma-separated values (.csv)** > Publish, then paste the link into `_config.yml` as `opportunities_csv`. If the school account doesn't allow publishing to the web, the Sheet has to be owned by an account that does. Google refreshes published sheets about every 5 minutes.

## Publishing rule

Only the editor and deputy merge changes into `main`. Everyone else proposes changes, which the editor or deputy reviews before they go live.

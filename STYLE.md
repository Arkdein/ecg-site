# ECG website style sheet

One page. Every contributor reads it once before drafting.

## Editorial rule

**Explain, then link out.** Our pages explain what something is and who it suits. Anything that changes yearly — dates, fees, cut-offs, quotas, income thresholds — is linked to the official source, not copied.

**Evergreen vs live.** Evergreen guidance goes on the page. Live items with closing dates go on Current Opportunities (via the Google Sheet), or in a dated "This year" box.

## Words

- **University Admission Score** — always in full. Never "UAS" (also means University of the Arts Singapore).
- **Six autonomous universities (AUs):** NUS, NTU, SMU, SUTD, SIT, SUSS. The University of the Arts Singapore is not an AU.
- **IGP** — spell out "Indicative Grade Profile" the first time on each page.
- **ECG**, **RVHS**, **JC1/JC2**, **Sec 1–4** — no need to spell out.
- Journey stages: TODO — the team's decision (Awareness / Exploration / Planning).

## Dates

- On the page: **31 Oct 2026** (day, short month, year). No ordinals ("31st").
- Closing dates in headings: **[Closes 31 Oct 2026] Title**.

## Buttons and links

- Button verbs: **Book**, **Apply**, **Read**, **Watch**, **Download**. One verb per button.
- Link text says where it goes: "[SMU admissions](…)", never "click here".
  - Exception (team decision, 9 Oct 2026): on Programmes, each programme's site button reads **Click here for details**. Give it an `aria-label` naming the programme so screen readers can tell the buttons apart, e.g. `{: .btn .btn-primary aria-label="Click here for details: HECGS Day site" }`.
- PDFs: say so in the link — "Briefing slides (PDF)".

## People and privacy

- Staff by role ("Scholarships portfolio"), with the teacher's name and MOE email (…@moe.edu.sg) beside it in the Get Help table, plus the team booking link or Form. Never a personal email.
- Students: no name + face + class together. Alumni stories need written consent (18+).

## Images

- Every image has alt text describing what it shows.
- No text inside images — put it on the page.
- **Photos only where they show something words can't:** Home, Get Help, and one per programme on Programmes. None on reference pages (Results, Scholarships, destinations).
- **Format:** landscape, cropped to 3:2 around the people and the activity, 1600 px wide, under 300 KB, saved in `assets/images/photos/` with a descriptive name (`hecgs-day-fair-2025.jpg`).
- **Caption** on the line under the photo, in italics: what and when, e.g. *HECGS Day fair, April 2025*.
- **Consent first:** identifiable students only with clearance from the team leader. Record each photo (source, consent, review date) in the Content Register and replace photos when they date.

## Design

- **School colours live in one file only:** `_sass/custom/setup.scss` (navy #082040, red #D80020). Never type colour codes into pages.
- **Red is an accent, not a fill:** thin bars (top of page, under page titles, current page in the sidebar). Large red areas read as warnings, and red also means "Important".
- **Styles live in** `_sass/custom/custom.scss`. Keep it short and commented; after any change, check Home, Singapore Universities and Current Opportunities at phone width.
- **No new classes for editors.** The only ones in pages are `.btn`, `.note`, `.important`, `.deadline`, `.tip` and `.ecg-todo`, plus the collapsible-row and row-label snippets in `templates/`.
- **Crest:** `assets/images/rvhs-crest.png`, set by `crest:` in `_config.yml`. Don't stretch, recolour or place it on navy. Its use needs the school's approval before go-live.
- **Theme version is pinned** (`remote_theme` in `_config.yml`). Upgrade on a branch and check the three pages above before merging.

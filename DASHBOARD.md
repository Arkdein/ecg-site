# ECG@RVHS Webmaster's Dashboard

A Data Studio report (Google renamed Looker Studio back to Data Studio) that answers one question: **what needs attention on the website this week?** It brings together page views, the "Was this page helpful?" answers, "Send us a question", and an automatic nightly check of every page.

Owner: ECG Webmaster RH. Everything below is set up once. After that, nothing needs feeding by hand.

## How the pieces fit

| Source | What it gives the dashboard | How it updates |
|---|---|---|
| **Google Analytics 4** | Views per page, phone or computer, where visitors came from | Looker Studio reads it directly |
| **Nightly site check** (GitHub) | Review dates, TODOs, deadline boxes with passed dates, broken links, Chinese For Parents out of step | Every night at 2 am and after every change to the site |
| **"Was this page helpful?"** responses | Yes / Partly / No and comments per page | Copied every hour |
| **"Send us a question"** responses | Date, topic, status, who it's with, days waiting. **Never the question text, names or emails.** | Copied every hour |
| **Current Opportunities** Sheet | Listings waiting for approval, closing soon, closed | Copied every hour |
| **Launch checklist** (a tab you tick) | Go-live tasks still open | When you tick them |

```
GitHub (site check) ─┐
Feedback form ───────┼─► "ECG@RVHS Webmaster's Dashboard (data)" Sheet ─┐
Question form ───────┤        (refreshes itself every hour)               ├─► Looker Studio report
Opportunities Sheet ─┘                                                    │
Google Analytics 4 ──────────────────────────────────────────────────────┘
```

## Part 1: Google Analytics 4 (about 10 minutes)

Check first that the school is happy for the site to use Google Analytics, and whether the site needs a short note about it (for example in the footer or on Get Help).

1. Go to [analytics.google.com](https://analytics.google.com) on the account that will own the dashboard. Click **Start measuring**.
2. Account name: `ECG@RVHS`. Property name: `ECG@RVHS website`. Time zone **Singapore**, currency **SGD**.
3. Business details: Education, small. Objective: *Understand web traffic*.
4. Platform: **Web**. Website address: `https://arkdein.github.io/ecg-site`. Stream name: `ECG website`. Leave enhanced measurement on.
5. Copy the **Measurement ID** (starts with `G-`).
6. In `_config.yml`, find the `ga_tracking` line, paste the ID between the quotes and delete the `#` at the start of the line. Publish the change. Views start showing in GA's **Realtime** report within a minute.

Then, in **Admin** (gear icon, bottom left):

| Setting | Where | Set to | Why |
|---|---|---|---|
| Google signals | Data collection and modification > Data collection | **Off** | Most visitors are under 18; it also stops GA hiding numbers on low-traffic pages |
| Granular location and device data | Same page | **Off** | Country-level is enough |
| Data retention | Data collection and modification > Data retention | **14 months** | Compare this results day with next year's |
| Reporting identity | Data display > Reporting identity | **Device-based** | Avoids hidden ("thresholded") numbers |

While the site is a draft, most visits are the team's own. When you build the report, set its default date range to start at go-live.

## Part 2: The data Sheet (about 10 minutes)

The script `scripts/dashboard-sheet.gs` creates the Sheet and keeps it up to date. Run it on the account that owns the forms.

1. Open the **"Send us a question"** form > **Responses** > **Link to Sheets**, and copy that Sheet's address. Do the same for **ECG Current Opportunities (website feed)** if you want listings on the dashboard.
2. Go to [script.google.com](https://script.google.com) > **New project**. Name it `ECG Webmaster Dashboard`.
3. Replace the code with the whole of `scripts/dashboard-sheet.gs`. At the top, paste the two addresses into `QUESTIONS_SHEET_URL` and `OPPORTUNITIES_SHEET_URL`. Save.
4. Choose **setup** in the function menu and click **Run**. Allow access when asked.
5. Open **Executions**, click the run, and copy the link to the new Sheet **ECG@RVHS Webmaster's Dashboard (data)**.

What `setup` changes outside the new Sheet: it adds three columns to the right of the question responses, **Status**, **Assigned to** and **Replied on**. When you answer a question, set Status to *Answered* and fill in Replied on, instead of typing a note into the Timestamp cell.

How the dashboard reads older rows: a blank Status counts as *Answered (noted)* if the Timestamp cell or the remarks column already says answered, replied or responded. Otherwise it counts as *New* if the question came in on or after `TRACK_QUESTIONS_FROM` (1 Jan 2026), or *Not tracked* if it's older.

**Email for new questions (recommended).** The dashboard is the overview, not the alarm: a worrying question can't wait for a weekly look. Either switch on the form's own notification (**Responses** > ⋮ > **Get email notifications for new responses**), or, to alert more than one person, fill in `ALERT_EMAILS` in the script and run **addQuestionAlert** once. Its emails give the topic and a link, never the question itself.

If the Sheet's **Summary** tab shows *refresh_notes*, something couldn't be read; the note says what.

## Part 3: The Data Studio report (about 45 minutes)

Go to [datastudio.google.com](https://datastudio.google.com) (lookerstudio.google.com also works) > **Blank report**. If your MOE account can't open Looker Studio, the school has switched it off; ask ICT, or build it on the account that will own the dashboard after handover.

### Data sources

Add these with **Add data** (one at a time):

| Name in the report | Connector | Pick |
|---|---|---|
| GA4 | Google Analytics | ECG@RVHS > ECG@RVHS website |
| Needs action | Google Sheets | data Sheet > **Needs action** |
| Summary | Google Sheets | data Sheet > **Summary** |
| Pages | Google Sheets | data Sheet > **Pages** |
| Deadlines | Google Sheets | data Sheet > **Deadlines** |
| Links | Google Sheets | data Sheet > **Links** |
| Feedback | Google Sheets | data Sheet > **Feedback** |
| Questions | Google Sheets | data Sheet > **Questions** |
| Opportunities | Google Sheets | data Sheet > **Opportunities** |
| Launch checklist | Google Sheets | data Sheet > **Launch checklist** |

For each Sheets source: **Resource** > **Manage added data sources** > **Edit** > **Data freshness**: **Every 1 hour**. For GA4, set it to every hour too.

### Page 1: This week

The page to open every Monday.

- **Scorecards** (source: Summary): *needs_action_high* ("Urgent"), *questions_open*, *questions_oldest_waiting_days* ("Oldest question, days"), *withdrawal_requests_open*, *broken_links*, *deadline_dates_passed*, *checklist_left*. Aggregation: **Max** (Summary has one row).
- **Text line** (Summary): *checked_for_date_sgt* labelled "Site checked on" and *sheet_refreshed_at* labelled "Data refreshed". If either stops moving, see Troubleshooting.
- **Table** (Needs action): priority, area, item, what_to_do, portfolio, date. Make *link* a hyperlink column (Dimension > Type > **URL**, show as link). Sort by priority, ascending. Rows per page: 25.
- **Conditional formatting** on the table: priority = `1 High` → light red background.
- **Drop-down filter** (Needs action): *portfolio*, so each portfolio owner sees only their items during the monthly check.

### Page 2: Traffic

Source: GA4. Add a **Date range control** (default: last 28 days).

- **Scorecards:** Views, Active users, with **Comparison: previous period**.
- **Time series:** Date × Views. Look for the peaks around HECGS Day, results day and UCAS deadlines.
- **Table:** Page title × Views, Active users, Average engagement time. Sort by Views.
- **Bar or pie:** Device category × Active users (are we right that most visitors use phones?).
- **Table:** Session source / medium × Sessions (Google Classroom, QR codes, bit.ly links, search).

### Page 3: Is it helping?

Joins page views with the feedback answers, so you can see which busy pages people don't find helpful.

1. **Resource** > **Manage blends** > **Add a blend**.
2. Table 1: **Pages**. Dimensions: *page_path*, *page_title*, *portfolio*.
3. Table 2: **GA4**. Dimension: *Page path and screen class*; metric: *Views*. Join: **Left outer**, *page_path* = *Page path and screen class*. Date range: last 90 days.
4. Table 3: **Feedback**. Dimension: *page_title*; metrics: *Record Count* (rename "Answers"), *helpful_score* (aggregation **Average**, rename "Helpful %", format percent). Join: **Left outer**, *page_title* = *page_title*.
5. Save the blend as `Views and feedback`.

Then add:

- **Table** (Views and feedback): page_title, portfolio, Views, Answers, Helpful %. Sort by Views. Conditional formatting: Helpful % below 60% → light red.
- **Scatter chart:** Views (x) against Helpful % (y), labelled by page title. Top-left (busy, not helpful) is the fix list. Pages with almost no views are candidates to merge or drop at the Term 2 review.
- **Table** (Feedback): received, page_title, answer, comment, filtered to answer ≠ Yes.

### Page 4: Content health

- **Table** (Pages): page_title, portfolio, review_status, review_due, todo_count, deadline_status, broken_links, translation_status, needs_action. Conditional formatting on review_status and deadline_status.
- **Table** (Deadlines): page_title, date_text, date, date_status, days_left. Filter: *date_status* is not "Not checked (no year)". Sort by date.
- **Table** (Links): page_title, link, status, detail, file, line. Filter: *status* is one of Broken, Check by hand, Needs sign-in.

### Page 5: Questions and opportunities

- **Table** (Questions): received, topic, type, status, assigned_to, days_waiting, open_in_sheet (as a link). Filter: status is not Answered or No reply needed. Sort by received, oldest first.
- **Bar** (Questions): topic × Record Count, last 90 days. Shows which pages aren't answering students' questions.
- **Table** (Opportunities): title, closing_date, status, open_in_sheet. Sort by status.
- **Table** (Launch checklist): Item, Who, Due, Done. Filter: Done is false.

### Look and sharing

- **Theme and layout** > colours: headings and scorecards in navy `#082040`; keep red `#D80020` for urgent items only, as on the site.
- **Share** > add people by email: the counsellor and portfolio owners as **Viewers**. Leave link sharing **Restricted** (the question log stays inside the team).
- Viewers can see the report without access to the underlying Sheets, as long as each data source's credentials are set to **Owner's credentials** (the default).

## Things the dashboard can't tell you

- A link that opens but goes to the **wrong page** (e.g. an SUTD link opening an SMU PDF) still shows as OK. Check links by eye when you review a page.
- Dates **without a year** in a deadline box (e.g. the HSK dates) aren't checked. Write `15 Oct 2026`, not `15 October`, wherever the year is known.
- "Check by hand" links are sites that block link checkers. Open them once to be sure.
- Views of the Chinese For Parents page and the feedback on it are counted separately from the English page.

## Troubleshooting

| You see | Do this |
|---|---|
| "Site checked on" is more than two days old | GitHub pauses the nightly check after 60 days with no changes to the site. In the repository: **Actions** > **Site health check** > **Enable workflow**, then **Run workflow**. |
| "Data refreshed" is more than two hours old | In the script project, **Triggers**: check the hourly `refresh` trigger exists; run **setup** again if not. |
| Summary shows *refresh_notes* | Read the note. Usually a Sheet address in the script is wrong, or the account lost access. |
| Traffic page is empty | Check `ga_tracking` in `_config.yml` has the right ID and no `#` in front. |

## Handing over

1. **Google Analytics:** Admin > Property access management > add the new owner as **Administrator**.
2. **Data Sheet and script:** share the Sheet and the script project, then make the new owner the owner of both (Share > ⋮ > Transfer ownership). Ask them to run **setup** once so the hourly refresh runs under their account, then delete the trigger on the old account (script project > Triggers).
3. **Looker Studio:** Share > ⋮ > **Transfer ownership**. Ask the new owner to reconnect each data source (Resource > Manage added data sources > Edit > **Reconnect**).
4. **GitHub:** nothing to do; the nightly check runs inside the repository.

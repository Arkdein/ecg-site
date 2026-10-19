# The weekly ECG update (email)

One email every Monday morning to everyone who signed up: the week's new **Key announcements** and **Current Opportunities**, plus listings that close that week. Weeks with nothing new get no email. Set up 19 Oct 2026 (team decisions: anyone can sign up with a personal email, no approval, sent through a Google Group, signed "The RVHS ECG Team").

## How it fits together

| Part | Account | What it does |
|---|---|---|
| Sign-up Form + Sheet ("ECG@RVHS weekly update sign-ups (Sheet)") | Randall's MOE account | Collects name, personal email, year of graduation, class, consent. Tab **To add** lists new addresses. |
| Script "ECG Weekly Update sign-ups" (`scripts/weekly-update-signups.gs`) | MOE account | Creates the Form and Sheet. Mondays 8–9 am: emails Randall's MOE inbox the new addresses, if any. |
| Google Group "ECG@RVHS Weekly Update" (`…@googlegroups.com`) | Randall's personal account | Holds the subscribers. Delivers the email and adds its own unsubscribe link. |
| Script "ECG Weekly Update" (`scripts/weekly-update-email.gs`) | Personal account | Mondays 7–8 am: reads the website's two published CSVs and sends one email to the Group. |
| Website box "Get the weekly ECG update" (`_includes/weekly-update.html`) | — | On Home and Current Opportunities, once `weekly_update_signup` is set in `_config.yml`. |

The two scripts never talk to each other. The email script reads only the public CSVs that the website already reads; it never sees the sign-up list.

## Why a Google Group

A script on a personal Gmail account can email at most 100 recipients a day and 50 per message (Google's Apps Script quotas). Sending to the Group counts as one recipient, so the Monday email goes out automatically however long the list gets. The cost: scripts can't add people to a personal-account Group, so new sign-ups are pasted in by hand each Monday.

## Setting up (once)

### 1. The Google Group (personal account)

1. Go to groups.google.com, signed in to your **personal** account. **Create group**.
2. Name **ECG@RVHS Weekly Update**. Group email, e.g. `rvhs-ecg-weekly`. Description: "Weekly ECG@RVHS update from the RVHS ECG Team."
3. Privacy:
   - Who can search for group: **Group members**
   - Who can join group: **Only invited users**
   - Who can view conversations: **Group managers**
   - Who can post: **Group managers** (so a reply can't go to everyone)
   - Who can view members: **Group managers** (subscribers can't see each other's emails)
4. Don't add members yet. **Create group**.
5. Group settings: keep email posting on (the script posts by email) and keep Google's email footer (it carries the unsubscribe link).
6. Optional: add a committee member as a second owner, so the list doesn't depend on one person.

### 2. The sign-up Form (MOE account)

1. script.google.com, signed in to the MOE account > New project "ECG Weekly Update sign-ups".
2. Paste `scripts/weekly-update-signups.gs`. Fill in `GROUP_MEMBERS_URL` (the Group's Members page, `https://groups.google.com/g/<group-name>/members`). Save.
3. Run **setup**, allow access. The log prints the Form's edit link, public link and the Sheet link.
4. Open the Form > **Publish**: responders must be **Anyone with the link**, not only Ministry of Education users.
5. Fill in the Form once with your own personal email to test.

### 3. The Monday email (personal account)

1. script.google.com, signed in to the **personal** account > New project "ECG Weekly Update".
2. Project Settings > tick "Show appsscript.json"; in that file set `"timeZone": "Asia/Singapore"`.
3. Paste `scripts/weekly-update-email.gs` into Code.gs. Fill in `GROUP_EMAIL`. Save.
4. Run **previewToMe**, allow access. Check the email in your personal inbox (it only goes to you).
5. Run **installTrigger** (Mondays, 7–8 am Singapore time).

### 4. The website

Put the Form's **public** link in `_config.yml` as `weekly_update_signup: "…"`. The box appears on Home and Current Opportunities about a minute after the change is live. Leave it empty to hide the box.

## Every Monday (about 2 minutes)

1. At 8–9 am an email arrives in the MOE inbox if anyone new signed up, with the addresses ready to paste. (No email = nobody new.)
2. Open the Group's Members page (personal account) > **Add members** > paste. Gmail addresses are added straight away; other addresses get an invitation and join when they accept.
3. Back in the Sheet, tick **Added to group** for them, or run **markPendingAsAdded** in the sign-ups script.

Google may hold a large batch of invitations for review. At launch, add people in smaller batches.

## What goes in the email

- **Announcements**: rows showing on Home today (approved, Show from reached, Remove after not passed) that haven't been emailed before.
- **New opportunities**: open listings not emailed before. Soonest closing first, with a short summary.
- **Closing this week**: listings emailed earlier that close in the next 7 days.
- The script remembers what it has sent (Script properties), so nothing goes twice and a listing posted on a Monday after 7 am goes the following Monday. On the very first run only items from the last 7 days count as new. Nothing posted more than 30 days ago is treated as new.
- A row whose title (or Posted / Show from date) changes counts as a new item.
- `SEND_IF_ONLY_CLOSING` (default `false`, per the team's decision) sends an email in weeks that only have closing reminders.

Change the logic only with the tests: `node tests/weekly-update.test.js`.

## If something goes wrong

- **Send the wrong thing / stop it this week**: in the email script, Triggers > delete the Monday trigger; run installTrigger again later.
- **Resend from scratch**: run **forgetSentItems**; the next email treats the last 7 days as new.
- **Someone wants their details deleted**: delete their row in the Sheet and remove them from the Group. Requests can come through Get Help's "Send us a question" form.
- **Hide the sign-up box**: empty `weekly_update_signup` in `_config.yml`.

## Still to decide

- Data protection wording: the consent line in the Form is the team's draft. Replace it with the school's standard personal-data wording when available (the same open item as the Alumni Gallery form), and decide how long sign-up details are kept.
- Sending from a personal account: the From line shows the personal Gmail address beside "The RVHS ECG Team". Check with School Leadership that this is acceptable before launch.

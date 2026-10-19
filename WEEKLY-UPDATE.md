# The weekly ECG update (email)

One email every Monday morning to everyone on the mailing list: the week's new **Key announcements** and **Current Opportunities**, plus listings that close that week. Weeks with nothing new get no email. Set up 19 Oct 2026 (team decisions: anyone can sign up with a personal email, no approval, sent through a Google Group that people join themselves, signed "The RVHS ECG Team").

## How it fits together

| Part | Account | What it does |
|---|---|---|
| Page **Weekly ECG update** (`weekly-update.md`, hidden from the sidebar) | — | Step 1: the sign-up Form. Step 2: two ways to join the Group (Google account, or a joining email from any address). |
| Box "Get the weekly ECG update" (`_includes/weekly-update.html`) | — | On Home and Current Opportunities; links to the page. Shows once `weekly_update_signup` and `weekly_update_group` are set in `_config.yml`. |
| Sign-up Form + Sheet ("ECG@RVHS weekly update sign-ups (Sheet)") | Randall's MOE account | Record of who signed up: name, personal email, year of graduation, class, consent. Made by `scripts/weekly-update-signups.gs`. |
| Google Group "ECG@RVHS Weekly Update" (`…@googlegroups.com`) | Randall's personal account | The mailing list. People join and leave it themselves. Delivers the email with Google's unsubscribe link. |
| Script "ECG Weekly Update" (`scripts/weekly-update-email.gs`) | Personal account | Mondays 7–8 am: reads the website's two published CSVs and sends one email to the Group. |

The Form and the Group are separate: someone can fill in the Form and not join, or join without the Form. The Group's member list is the mailing list; the Form is a record of interest.

## Why a Google Group

A script on a personal Gmail account can email at most 100 recipients a day and 50 per message (Google's Apps Script quotas). Sending to the Group counts as one recipient, so the Monday email goes out automatically however long the list gets. With "Anyone can join", nobody has to be added by hand, and Google confirms each address itself.

## Setting up (once)

### 1. The Google Group (personal account)

1. Go to groups.google.com, signed in to your **personal** account. **Create group**.
2. Name **ECG@RVHS Weekly Update**. Group email, e.g. `rvhs-ecg-weekly`. Description: "Weekly ECG@RVHS update from the RVHS ECG Team. Sign up: https://arkdein.github.io/ecg-site/weekly-update.html"
3. Privacy:
   - Who can search for group: **Anyone on the web** (so people can open the group page and click Join)
   - Who can join group: **Anyone can join** (no approval)
   - Who can view conversations: **Group managers**
   - Who can post: **Group managers** (so a reply can't go to everyone)
   - Who can view members: **Group managers** (subscribers can't see each other's emails)
4. **Create group**. Don't add anyone.
5. Group settings: keep email posting on (the script posts by email) and keep Google's email footer (it carries the unsubscribe link).
6. Optional: add a committee member as a second owner, so the list doesn't depend on one person.
7. Test both ways to join on the Weekly ECG update page: once with a Gmail address, once with a non-Google address (send the joining email, then reply to Google's confirmation). Check that both appear under **Members**.

### 2. The sign-up Form (MOE account)

1. script.google.com, signed in to the MOE account > New project "ECG Weekly Update sign-ups".
2. Paste `scripts/weekly-update-signups.gs` and save.
3. Run **setup**, allow access. The log prints the Form's edit link, public link and the Sheet link.
4. Open the Form > **Publish**: responders must be **Anyone with the link**, not only Ministry of Education users.

### 3. The Monday email (personal account)

1. script.google.com, signed in to the **personal** account > New project "ECG Weekly Update".
2. Project Settings > tick "Show appsscript.json"; in that file set `"timeZone": "Asia/Singapore"`.
3. Paste `scripts/weekly-update-email.gs` into Code.gs. Fill in `GROUP_EMAIL`. Save.
4. Run **previewToMe**, allow access. Check the email in your personal inbox (it only goes to you).
5. Run **installTrigger** (Mondays, 7–8 am Singapore time).

### 4. The website

In `_config.yml` set:

```yaml
weekly_update_signup: "<the Form's public link>"
weekly_update_group: "rvhs-ecg-weekly@googlegroups.com"
```

The box appears on Home and Current Opportunities, and the Weekly ECG update page shows both steps, about a minute after the change is live. Leave either line empty to hide the box (the page then says sign-up isn't open yet).

## Nothing to do each week

The email goes out by itself. To see who is subscribed, open the Group's **Members** page (personal account). To see who filled in the Form, open the Sheet.

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
- **Someone wants their details deleted**: delete their row in the Sheet and remove them from the Group's Members page. Requests can come through Get Help's "Send us a question" form.
- **Unwanted members or spam sign-ups**: remove them on the Members page; if it keeps happening, change "Who can join" to "Ask to join" (you then approve each request).
- **Hide the sign-up box**: empty `weekly_update_signup` in `_config.yml`.

## Still to decide

- Data protection wording: the consent line in the Form is the team's draft. Replace it with the school's standard personal-data wording when available (the same open item as the Alumni Gallery form), and decide how long sign-up details are kept.
- Sending from a personal account: the From line shows the personal Gmail address beside "The RVHS ECG Team". Check with School Leadership that this is acceptable before launch.

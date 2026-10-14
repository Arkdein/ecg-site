# How to edit the ECG website

You don't need to install anything. Everything happens in your web browser.

## Changing a page

1. Open the page on the website and scroll to the bottom.
2. Click **Suggest a change to this page**. Sign in to GitHub if asked.
3. Edit the text. The page is written in Markdown (plain text with a few symbols, explained below).
4. Click **Commit changes…** (green button, top right).
5. Write one line saying what you changed, e.g. *"Updated SMU prospectus link to 2027 edition"*.
6. Choose **Create a new branch … and start a pull request**, then **Propose changes**.
7. The editor or deputy checks it and publishes. You'll get an email when it's live.

The site updates about a minute after a change is published.

## Posting current opportunities

There are two places, for two groups of students:

- **Current RVHS students:** post in the **ECG Google Classroom**, as now. The Current Opportunities page sends current students there.
- **Recent graduates** (who can't use the Classroom): add the opportunity to the **Entry** tab of the Google Sheet **ECG Opportunities and Announcements (website feed)**. It appears on the Current Opportunities page within about 5 minutes. You don't need GitHub for this.

In the Sheet, on the **Entry** tab:

1. Use the first empty row. One opportunity per row. The grey row under the headings says what goes in each column.
2. Only add opportunities that recent graduates can apply for.
3. Type the closing date as a date (e.g. 31/10/2026), or leave it blank if it stays open until filled. The listing disappears by itself after 11:59 pm on that date.
4. Write the **Summary** the way you'd write the Classroom post. Line breaks are kept; a blank line starts a new paragraph, and lines starting with `- ` become bullet points. Web addresses typed in the text (e.g. a registration form) become clickable links. Long announcements show the first paragraph, with a "Show full announcement" button for the rest.
5. **Link** is optional. If you fill it, the card gets a **Read more** button to that page.
6. Images and attached flyers don't appear on the website. If the Classroom post says "scan the QR code in the flyer", paste the registration link into the Summary instead.
7. Columns A to I are public. Put contacts and internal remarks in **Team notes** only.
8. Leave **Approved** blank. Randall, Chitra or Rachel checks the row and chooses **Yes**; only then does it show on the website. (The Approved column is locked to those three.)

Don't add, move or rename columns, and don't type in the **Public** tab: it fills itself from Entry and is what the website reads. Each term, delete rows that have closed (the website reads the first 200 rows).

## Key announcements (Home page)

The Home page has a **Key announcements** block for things the school is telling students or parents: results-day arrangements, briefings for graduates, where to get help in the application window. It is hidden whenever nothing is current, which is most of the year.

Any committee member can post one, on the **Announcements** tab of the same Google Sheet (**ECG Opportunities and Announcements (website feed)**). No GitHub needed.

1. Use the first empty row. One announcement per row. The grey row under the headings says what goes in each column.
2. **Headline**: short and specific. **For**: pick from the list. **Message**: one to three sentences; put the full details on the website page you link to (results-day arrangements go on A-Level Results & Applying, through an edit request if you can't edit the page).
3. **Link**: a page on this site written as `/page-name` (e.g. `/results-and-applying`), or an official `https://` page. **Button text** is optional ("Read more" if blank).
4. **Show from**: the first day it shows (blank = as soon as it is approved). **Remove after**: required, the last day it shows. Dates day first, e.g. 31/3/2027. It disappears after 11:59 pm Singapore time on that day. A row without Remove after never shows.
5. Leave **Approved** blank. Randall, Chitra or Rachel checks it and chooses **Yes**.

Rules:

- **Announcement or opportunity?** If there is something to apply for, it is an opportunity (Entry tab), not an announcement. Never put the same item in both tabs; an announcement about an opportunity links to Current Opportunities instead.
- **Official channel first.** Post only what has already gone out through Parents Gateway or a school email, with the same wording and dates. Note where it was sent in **Team notes**.
- No student names, class lists or results.
- Up to four show at a time, newest **Show from** first.
- Exact dates and times are fine here, because every announcement removes itself. (Programme pages still use periods; see the style sheet.)
- English only for now: the block is not on 家长专区.

To check an approved announcement before its Show from date, open the Home page with `?preview=announcements` at the end of the address (e.g. `…/ecg-site/?preview=announcements`). Visitors never see that view.

## The accuracy line and "Last reviewed"

Every page ends with: *"Information on this page is accurate as of the date it was last reviewed. Please check the official university or agency website for the latest details."* (家长专区 has the Chinese version.) It points to the **Last reviewed** date on the line below it, which comes from `last_reviewed` in the page's front matter. When you check a page, update `last_reviewed` to the current month, even if nothing else changed, so the date stays honest.

## The Chinese version of For Parents

For Parents has a Chinese version (`for-parents-zh.md`), reached by the **中文** button at the top right of the page. It is a line-by-line translation. If you change For Parents, make the same change on the Chinese page, or ask the portfolio owner to, so the two don't drift apart.

## "Was this page helpful?"

The Yes / No buttons at the bottom of every page open a short Google Form. Answers go to the Google Sheet **ECG@RVHS website feedback (responses)**. The portfolio owner checks it once a month for their pages. The buttons are switched on by `feedback_form_prefill` in `_config.yml`.

## Requesting an edit (ECG Committee)

Committee members who are not editors ask for changes through the **request an edit to this page** link at the bottom of every page. It opens a Google Form with the page already filled in; only named committee members can submit it (MOE sign-in). Requests go to the Google Sheet **Edit requests for ECG@RVHS 2027 Website (Sheet)**, tab **Requests**. The Webmaster sets the Status (New, Query, Approved, Live, Declined) and notes questions there. Nothing goes live without the Webmaster's approval. The link is switched on by `edit_request_form_prefill` in `_config.yml`. To add or remove committee members, open the Form, click **Published**, and change the responders.

## The Webmaster's Dashboard

A Looker Studio report shows what needs attention: passed deadline dates, broken links, pages due for review, new feedback and questions. Portfolio owners can filter it to their own pages for the monthly check. How it works and how to set it up: [DASHBOARD.md](DASHBOARD.md).

## Markdown in one minute

| You type | You get |
|---|---|
| `## Heading` | a section heading |
| `**bold**` | **bold** |
| `- item` | a bullet point |
| `[SMU website](https://www.smu.edu.sg)` | a link to another website (opens in a new tab with ↗, automatically) |
| `[Scholarships](scholarships.md)` | a link to another page on our site |

A photo with a caption is written as (the photo file goes in `assets/images/photos/`; see the style sheet before adding one):

```
![What the photo shows, for screen readers](assets/images/photos/hecgs-day-fair-2025.jpg)
*HECGS Day fair, April 2025*
```

Grey boxes like this are written as:

```
{: .note }
> Your text here.
```

Other box types: `.important` (red), `.deadline` (yellow), `.tip` (green).

In a `.deadline` box, write each date with its year (`15 Oct 2026`, `30 Sep to 20 Nov 2026`). The Webmaster's Dashboard checks these every night and flags any date that has passed. Dates without a year aren't checked.

Use `.deadline` only for **external cut-offs** (UCAS, universities, scholarships, HSK, results day). For the school's own programmes, don't give exact dates: write the usual period in a `.note` box ("usually in April") and send students to the programme's site, or to the ECG Google Classroom for Horizon. See [STYLE.md](STYLE.md#dates).

Red **TODO** boxes are placeholders for content still to be written. Delete the TODO line and the `{: .ecg-todo }` line beneath it once the section is done.

## The lines at the top of each page

Every page starts with a block between two `---` lines. Leave `title`, `nav_order`, `parent` and `grand_parent` alone (they set the page's place in the sidebar). Leave `owner` alone too: every page is owned by ECG Webmaster RH. Update these when you review a page:

```
owner: ECG Webmaster RH
portfolio: Scholarships
last_reviewed: Jan 2027
```

`portfolio` is the ECG portfolio that looks after the page's content. They appear at the bottom of the page as *"Owner: ECG Webmaster RH · Portfolio: Scholarships · Last reviewed: Jan 2027"*.

## Rules (from the style sheet)

See [STYLE.md](STYLE.md). The short version: explain, then link out; never copy figures or deadlines that change yearly; write "University Admission Score" in full; staff by role, with name and MOE email in the Get Help table, never a personal email; no student name + face + class together.

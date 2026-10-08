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

## Updating Current Opportunities

Don't edit the website. Edit the **Current Opportunities Google Sheet** instead (link in the Content Register). Add one row per item:

| Column | What to type | Example |
|---|---|---|
| Title | Name of the opportunity | Research internship |
| Organiser | Who runs it | A\*STAR |
| Category | One word, from the list the team agrees | Internship |
| For | Levels it's open to | JC1, JC2 |
| Added | Today's date | 2026-10-08 |
| Closes | Closing date, or blank if rolling | 2026-10-31 |
| Link | Full web address starting https:// | https://… |
| Details | One or two sentences | Who should apply and why |

Dates must be written **YYYY-MM-DD**. The website hides an item automatically the day after it closes, and shows the newest items first. Delete old rows from the Sheet once a term to keep it tidy.

## Markdown in one minute

| You type | You get |
|---|---|
| `## Heading` | a section heading |
| `**bold**` | **bold** |
| `- item` | a bullet point |
| `[SMU website](https://www.smu.edu.sg)` | a link |
| `[Scholarships](scholarships.md)` | a link to another page on our site |

Grey boxes like this are written as:

```
{: .note }
> Your text here.
```

Other box types: `.important` (red), `.deadline` (yellow), `.tip` (green).

Red **TODO** boxes are placeholders for content still to be written. Delete the TODO line and the `{: .ecg-todo }` line beneath it once the section is done.

## The lines at the top of each page

Every page starts with a block between two `---` lines. Leave `title` and `nav_order` alone. Update these when you review a page:

```
owner: Scholarships
last_reviewed: Jan 2027
```

They appear at the bottom of the page as *"Owner: ECG (Scholarships) · Last reviewed: Jan 2027"*.

## Rules (from the style sheet)

See [STYLE.md](STYLE.md). The short version: explain, then link out; never copy figures or deadlines that change yearly; write "University Admission Score" in full; staff by role, never personal email; no student name + face + class together.

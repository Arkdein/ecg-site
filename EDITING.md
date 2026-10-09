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
- **Recent graduates** (who can't use the Classroom): add the opportunity to the Google Sheet **ECG Current Opportunities (website feed)**. It appears on the Current Opportunities page within about 5 minutes. You don't need GitHub for this.

In the Sheet, on the **Entry** tab:

1. Use the first empty row. One opportunity per row. The grey row under the headings says what goes in each column.
2. Only add opportunities that recent graduates can apply for.
3. Type the closing date as a date (e.g. 31/10/2026), or leave it blank if it stays open until filled. The listing disappears by itself after 11:59 pm on that date.
4. Write the **Summary** the way you'd write the Classroom post. Line breaks are kept; a blank line starts a new paragraph, and lines starting with `- ` become bullet points. Web addresses typed in the text (e.g. a registration form) become clickable links. Long announcements show the first paragraph, with a "Show full announcement" button for the rest.
5. **Link** is optional. If you fill it, the card gets a **Read more** button to that page.
6. Images and attached flyers don't appear on the website. If the Classroom post says "scan the QR code in the flyer", paste the registration link into the Summary instead.
7. Columns A to I are public. Put contacts and internal remarks in **Team notes** only.
8. Leave **Approved** blank. The editor or deputy checks the row and chooses **Yes**; only then does it show on the website.

Don't add, move or rename columns, and don't type in the **Public** tab: it fills itself from Entry and is what the website reads. Each term, delete rows that have closed (the website reads the first 200 rows).

## Markdown in one minute

| You type | You get |
|---|---|
| `## Heading` | a section heading |
| `**bold**` | **bold** |
| `- item` | a bullet point |
| `[SMU website](https://www.smu.edu.sg)` | a link |
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

Red **TODO** boxes are placeholders for content still to be written. Delete the TODO line and the `{: .ecg-todo }` line beneath it once the section is done.

## The lines at the top of each page

Every page starts with a block between two `---` lines. Leave `title` and `nav_order` alone. Update these when you review a page:

```
owner: Scholarships
last_reviewed: Jan 2027
```

They appear at the bottom of the page as *"Owner: ECG (Scholarships) · Last reviewed: Jan 2027"*.

## Rules (from the style sheet)

See [STYLE.md](STYLE.md). The short version: explain, then link out; never copy figures or deadlines that change yearly; write "University Admission Score" in full; staff by role, with name and MOE email in the Get Help table, never a personal email; no student name + face + class together.

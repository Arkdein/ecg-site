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

Internships, programmes, talks and jobs with closing dates are posted in the **ECG Google Classroom**, not on the website. The Current Opportunities page only explains where to find them and how to apply.

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

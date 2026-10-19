---
title: Weekly ECG update
nav_exclude: true
owner: ECG Webmaster RH
portfolio: Internships
last_reviewed: Oct 2026
description: Sign up for one email every Monday with the week's ECG announcements and opportunities.
---

# Weekly ECG update
{: .no_toc }

One email every Monday with the week's new announcements and opportunities, plus anything closing that week.
{: .fs-6 .fw-300 }

It's for current students, graduates and parents. Everything in it is also on this website. Weeks with nothing new get no email.

{%- assign wu_group = site.weekly_update_group | default: "" | strip -%}
{%- assign wu_name = wu_group | split: "@" | first -%}
{% if site.weekly_update_signup and site.weekly_update_signup != "" and wu_group != "" %}

## Step 1: Tell us who you are

A short form: your name, year of graduation, class and the email address you'd like the update sent to. Please use a personal email (for example Gmail), not your students.edu.sg address, because school accounts close after you leave RVHS.

[Fill in the form]({{ site.weekly_update_signup }}){: .btn .btn-primary }

## Step 2: Join the mailing list
{: #join }

The email is sent through a Google Group. Join it in one of these two ways, using the same email address as in the form.

**I have a Google account (Gmail, or another address you use to sign in to Google)**

[Join the Google Group](https://groups.google.com/g/{{ wu_name }}){: .btn .btn-primary }

Sign in if asked, then click **Join group**.

**Any other email address**

[Send a joining email](mailto:{{ wu_name }}+subscribe@googlegroups.com?subject=subscribe){: .btn .btn-primary }

This opens a ready-made email. Send it from the address you want the update sent to. Google will reply with a confirmation email: reply to that, or click its confirmation link, to finish. Check your spam folder if nothing arrives within a few minutes.

## Stopping the emails

Every email has an unsubscribe link at the bottom. You can also send any email to {{ wu_name }}+unsubscribe@googlegroups.com from the subscribed address.

Your details are seen only by the ECG team. Other subscribers can't see your email address. To have your form details deleted, [send us a question](get-help.md).

{% else %}

{: .note }
Sign-up for the weekly update isn't open yet. Until then, see [Current Opportunities](opportunities.md).

{% endif %}

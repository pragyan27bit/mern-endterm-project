# 3–5 Minute Demo Video Script — PacePilot

Record the **deployed application working**. Keep the browser zoom suitable for readability, and show your GitHub repository briefly at the end. The **demo account is shared**: never enter sensitive personal information.

## 0:00–0:30 — Introduce the problem

> "PacePilot is a student productivity app that solves a problem beyond basic to-do lists: we know what is due, but not whether the work fits into our available hours. PacePilot turns deadlines, priority and effort estimates into a realistic study schedule."

Show the sign-in screen and choose **Try the interactive demo**. A fresh sample workspace loads with representative coursework.

## 0:30–1:15 — Task management

Open **My tasks**. Highlight course tags, due dates, priorities, time estimates, search and filters. Open **Add a task** and create a real example due in the next three days. Open **Edit** to adjust its estimated effort. Point out that a task can depend on another task, and that this controls whether it can be scheduled and completed.

## 1:15–2:15 — Planning engine (main differentiator)

Open **Smart planner**. Show the daily study budget. Click **Generate my plan**, then scroll through the 7-day calendar and explain that each day's allocations respect capacity and task deadlines. If there are conflicts, open the warning and explain why unscheduled work is surfaced instead of overbooking. Change study capacity in **Settings**, return, regenerate, and show the difference.

## 2:15–3:10 — Focus workflow

Open **Focus room**. Choose an unfinished task and start the Pomodoro timer; demonstrate play/pause/reset. Since a full minute is needed to save a timed session, use **Log study time** for a fast example. Show how the task's recorded time changes.

## 3:10–3:50 — Analytics

Open **Study analytics**. Explain total minutes, streak, weekly focus chart, course completion, and recent sessions. Return to **My tasks** and mark a task complete. Show refreshed progress and any prerequisite unlocking.

## 3:50–4:30 — Architecture and reliability

Briefly show the repository: React UI, Express endpoints, Mongoose models, pure scheduling engine, and automated tests. Mention owner-scoped authorization, hashed passwords, HTTP-only sessions, and Render + MongoDB Atlas deployment.

## 4:30–5:00 — Closing

> "PacePilot helps students answer not just 'what needs to get done,' but 'what can I realistically work on today.' This is a working, deployed end-to-end software application, not a static mockup."

Display the live deployment URL and ensure the links are accessible without edit permissions.

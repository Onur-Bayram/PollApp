# PollApp

PollApp is a responsive web app for creating and answering surveys. Its desktop and mobile interfaces follow a Figma design. Surveys and votes are stored in Supabase, and results update in real time.

## Features

- Browse active and past surveys and filter them by category.
- See the three surveys ending soonest as highlighted cards.
- Create and publish surveys directly in an overlay.
- Add up to six questions with two to six answer options each.
- Allow single or multiple answers for each question.
- Optionally add a category, description, and end date.
- View a publishing confirmation and return to the home page when closing it.
- Submit answers with "Complete" and view the results as bar charts.
- Use "Vote again" to withdraw the saved submission and vote again.
- View past surveys and their results; voting is closed after the deadline.
- Expand and collapse mobile results with "See results" and "Close results".

## Tech Stack

- Angular 22 and TypeScript
- Separate HTML and CSS component files
- Angular Reactive Forms for form handling
- Supabase for database storage and real-time updates
- localStorage to remember saved submissions in the same browser
- Local images, icons, and fonts in `public/assets`

## Getting Started

Requirements: Node.js 22.22.3 or later within version 22, or Node.js 24.15.0 or later within version 24, and npm.

```sh
git clone https://github.com/Onur-Bayram/PollApp.git
cd PollApp
npm ci
npm start
```

Open **http://localhost:4200/** in your browser. Use `npm start` to run the Angular development server.

## Supabase

The browser connection is configured in `src/environments/environment.ts`. The current configuration connects the app to the existing project backend.

To use your own backend, create the `surveys`, `questions`, `answers`, and `votes` tables with their relationships. You also need appropriate access policies and real-time updates enabled for votes. Replacing the URL and public key alone does not create the required data model.

## Voting and "Vote again"

No user account is required. After a successful submission, the browser remembers the selected answers and the IDs of the saved vote records. This allows the app to recognize the submission when the same survey is reopened.

"Vote again" deletes the vote records associated with that submission before allowing another vote. This recognition only applies to the same browser. Using a different browser or clearing browser data can reset it, so the app does not guarantee one vote per person.

## Project Structure

```text
src/app/
  models/       Data models and shared limits
  pages/        Home, survey form, survey details, and confirmation
  services/     Supabase, surveys, results, and saved submissions
src/environments/
                Public Supabase connection configuration
public/assets/  Images, icons, and fonts
```

## Views

| Path | Content |
| --- | --- |
| `/` | Home page with surveys and filters |
| `/survey/:id` | Saved survey with voting and results |
| `/survey` | Separate design preview without real vote submission |
| `/thumbnail` | Static project preview |

The survey creation form opens as an overlay and has no dedicated route.

## Production Build

```sh
npm run build
```

Build output is generated in `dist/pollapp/`. When hosting the app, configure a fallback to `index.html` for Angular routes such as `/survey/11`.

## Design

The interface is based on the supplied "Poll App Design" Figma template. It uses the Nerko One, Mulish, and Nokora fonts alongside the provided graphics.

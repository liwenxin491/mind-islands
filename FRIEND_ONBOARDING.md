# Mind Islands Friend Onboarding

Welcome — this guide is the fastest way to get the project running locally.

## What This Project Is

Mind Islands is a reflective wellbeing app with:

- a mobile-first frontend
- a sea otter-centered home experience
- island-based journaling and reflection flows
- Quick Log, To-do, Insights, Inspiration, and Harbor sections

For most visual/frontend work, you do **not** need the full production stack.

## 1. Clone the Repo

```bash
git clone https://github.com/liwenxin491/mind-islands.git
cd mind-islands
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Choose Your Local Mode

### Option A: Easiest mode for UI work
This is the recommended starting point if you are working on frontend/layout/design.

```bash
npm run dev:offline
```

This mode:

- skips real auth/database requirements
- uses local/offline behavior for testing
- is the fastest way to work on UI

### Option B: Full local app mode
Use this if you specifically need auth, database, or server-backed flows.

Create a local env file:

```bash
cp .env.example .env.local
```

Then fill in the required values in `.env.local`.

At minimum for full mode, you will usually need:

- `GEMINI_API_KEY`
- `DATABASE_URL`
- `JWT_SECRET`

Then run:

```bash
npm run dev
```

## 4. Open the App

After starting the dev server, open the local URL shown in the terminal.

Usually it will be something like:

- `http://localhost:5173`

## 5. Most Useful Commands

Start offline UI mode:

```bash
npm run dev:offline
```

Start full local mode:

```bash
npm run dev
```

Production build check:

```bash
npm run build
```

Production server locally:

```bash
npm start
```

## 6. Project Structure

Main areas you will probably touch:

- `src/app/pages/Hub.tsx`
  - mobile-first home screen and navigation
- `src/app/components/AIChat.tsx`
  - Quick Log conversation UI
- `src/app/components/TodoPanel.tsx`
  - To-do panel UI
- `src/app/pages/Insights.tsx`
  - insights / summary page
- `src/app/pages/islands/*`
  - island pages
- `src/styles/theme.css`
  - global theme tokens
- `src/styles/index.css`
  - shared app-level styles and motion helpers

## 7. Assets

Important visual assets currently live in:

- `src/assets/background-new.png`
- `src/assets/sea-otter.png`
- `src/assets/bubble-filled.png`

## 8. How We Work in Git

Please do not work directly on `main`.

Typical flow:

```bash
git checkout main
git pull origin main
git checkout -b feature/your-branch-name
```

When your change is ready:

```bash
git add .
git commit -m "Describe your change"
git push -u origin feature/your-branch-name
```

Then open a Pull Request into `main`.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full workflow.

## 9. Before You Push

Please run:

```bash
npm run build
```

Also sanity check:

- home screen
- Quick Log
- To-do
- Settings
- Insights
- the page you changed

## 10. Notes on Production

Production is deployed on AWS and served from:

- [mind-island.com](https://mind-island.com)

You do not need AWS access for normal UI work.

## 11. If Something Fails

Common fixes:

- delete `node_modules` and reinstall
- make sure you are using a recent Node version
- if auth/database is blocking you, use `npm run dev:offline`
- if a page looks wrong, check whether the issue is in `Hub.tsx`, `SceneShell.tsx`, or shared styles

## 12. Ask for Context When Needed

If anything is unclear, the best thing to share is:

- what you were trying to do
- what command you ran
- what screen is affected
- a screenshot if it is visual

That usually makes debugging much faster.

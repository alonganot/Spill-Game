# CLAUDE.md — Spill

## Overview
**Spill** is a turn-based roguelite combat game built with TypeScript, React, and Vite. V1 is a PC game (a web build that also ships as a Windows app via Electron) that stays playable on a phone-sized window.
Players roll colored dice each turn, mix colors to create new colors, and combine/spend colors to trigger elemental attacks and effects across progressive stages/encounters.

## Source of Truth Docs
- `CLAUDE.md` — Tech stack, architecture boundaries, and engineering workflow.
- `PLAN.md` — Milestones, scope, and current progress.
- `RULES.md` — Core combat rules, color pool behavior, turn structure, and status mechanics.
- `DESIGN.md` — Visual design system ("Cosmic Paint Workshop"): color tokens, typography, borders, screen layouts, and sprite rules for `src/ui/` and UI sprites.

## Tech Stack & Architecture Rules
- **Language:** TypeScript (`strict: true`).
- **UI & Bundler:** React + Vite (mobile-first layout, touch-friendly).
- **Desktop App:** Electron + electron-builder (NSIS installer for Windows). The main process lives in `electron/` and only hosts the web build; the game never imports Electron.
- **Mobile Wrapper (post-V1):** Capacitor, wrapped behind clean interfaces in `src/mobile/` and isolated from core game rules. Mobile app builds are out of scope for V1.
- **Testing:** Vitest for unit and simulation tests.
- **Directory Boundaries:**
  - `src/engine/` — Pure TypeScript combat state, dice rolls, color mixing, attack/combo resolution, enemy turns, status effects, and stage/run state. **No React, DOM, or Capacitor imports.**
  - `src/data/` — Balance configs, color recipes, attack/skill definitions, enemy definitions, and stage/reward tables. Avoid hardcoded gameplay numbers inside `src/engine/`.
  - `src/ui/` — React views, touch controls, visual feedback, and screen flow. Consumes engine state and dispatches actions.
  - `src/mobile/` — Capacitor adapters (haptics, app lifecycle/pause, device capabilities). Empty in V1.
  - `src/desktop/` — The game's side of the Electron bridge (`window.spillDesktop`, update status types). No Electron imports; returns null in the browser.
  - `electron/` — Electron main process (`main.cjs`, incl. auto-updates), preload bridge (`preload.cjs`), dev launcher (`dev.mjs`), and app icon. No game rules here.

## Commands
- `npm run dev` — play in the browser (Vite dev server).
- `npm test` / `npm run typecheck` / `npm run build` — Vitest, `tsc -b`, and the production web build (`dist/`).
- `npm run test:balance` — the slow balance simulation (greedy bot over 200 seeded runs).
- `npm run electron:dev` — the game in an Electron window, against the Vite dev server.
- `npm run electron:start` — build, then run the production build in Electron.
- `npm run dist:win` — build the versioned Windows installer (`release/Spill-Setup-<version>.exe`) locally, without publishing.
- `npm run icon` — redraw `electron/icon.png` from the hero sprite.

## Releases (automatic)
Every push to `main` (a merged PR) runs `.github/workflows/release.yml`: it picks the next version, runs the tests, builds, tags `vX.Y.Z`, and publishes the Windows installer to GitHub Releases. Installed games see it on their next launch (update notice on the main menu, `src/ui/UpdateNotice.tsx`); the menu also shows the running version (`APP_VERSION`, injected from `package.json` by `vite.config.ts`).
- **Version source of truth: the `v*` git tags.** `package.json`'s `version` is set only inside the release job and isn't committed back, so in the repo it may lag behind the latest release. Don't bump it by hand.
- **Bump rules** (`scripts/release-version.mjs`, tested in `scripts/release-version.test.ts`), compared with the last tag:
  - No game files changed (only docs, CI, tests): no release.
  - **major**: the run save format changed (`SAVE_KEY` in `src/ui/runSave.ts`, old saves are dropped), or a commit says `BREAKING CHANGE`.
  - **minor**: new files under `src/` or `electron/`, or 400+ changed lines in game files.
  - **patch**: anything else.
  - A commit message marker overrides it: `[major]`, `[minor]`, `[patch]`, or `[skip release]`. Put it in the PR title so the merge commit carries it.
- If a release job fails after tagging, the next merge releases everything since (or delete the tag on GitHub and re-run the job).
- Testing an update locally without publishing: `npm run dist:win`, serve `release/` over HTTP, and start an installed game with `SPILL_UPDATE_URL=<that URL>`.

## Engineering & Collaboration Rules
- Read `CLAUDE.md`, `PLAN.md`, and `RULES.md` before starting work (and `DESIGN.md` before any UI work).
- Any UI, CSS, or sprite work must follow `DESIGN.md`. Update `DESIGN.md` when a token, utility, or visual rule changes.
- Work in small, atomic increments — one clear goal per task.
- Write/update Vitest unit tests alongside engine rules and bug fixes.
- Keep functions modular and typed; avoid over-engineering or speculative abstractions.
- Do not build out-of-scope features unless explicitly moved into the active milestone in `PLAN.md`.
- Keep `PLAN.md` updated as tasks/milestones progress, and update `RULES.md` if gameplay rules change.
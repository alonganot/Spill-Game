# CLAUDE.md — Spill

## Overview
**Spill** is a turn-based roguelite combat mobile game built with TypeScript, React, Vite, and Capacitor.
Players roll colored dice each turn, mix colors to create new colors, and combine/spend colors to trigger elemental attacks and effects across progressive stages/encounters.

## Source of Truth Docs
- `CLAUDE.md` — Tech stack, architecture boundaries, and engineering workflow.
- `PLAN.md` — Milestones, scope, and current progress.
- `RULES.md` — Core combat rules, color pool behavior, turn structure, and status mechanics.
- `DESIGN.md` — Visual design system ("Cosmic Paint Workshop"): color tokens, typography, borders, screen layouts, and sprite rules for `src/ui/` and UI sprites.

## Tech Stack & Architecture Rules
- **Language:** TypeScript (`strict: true`).
- **UI & Bundler:** React + Vite (mobile-first layout, touch-friendly).
- **Mobile Wrapper:** Capacitor (wrapped behind clean interfaces, isolated from core game rules).
- **Testing:** Vitest for unit and simulation tests.
- **Directory Boundaries:**
  - `src/engine/` — Pure TypeScript combat state, dice rolls, color mixing, attack/combo resolution, enemy turns, status effects, and stage/run state. **No React, DOM, or Capacitor imports.**
  - `src/data/` — Balance configs, color recipes, attack/skill definitions, enemy definitions, and stage/reward tables. Avoid hardcoded gameplay numbers inside `src/engine/`.
  - `src/ui/` — React views, touch controls, visual feedback, and screen flow. Consumes engine state and dispatches actions.
  - `src/mobile/` — Capacitor adapters (haptics, app lifecycle/pause, device capabilities).

## Engineering & Collaboration Rules
- Read `CLAUDE.md`, `PLAN.md`, and `RULES.md` before starting work (and `DESIGN.md` before any UI work).
- Any UI, CSS, or sprite work must follow `DESIGN.md`. Update `DESIGN.md` when a token, utility, or visual rule changes.
- Work in small, atomic increments — one clear goal per task.
- Write/update Vitest unit tests alongside engine rules and bug fixes.
- Keep functions modular and typed; avoid over-engineering or speculative abstractions.
- Do not build out-of-scope features unless explicitly moved into the active milestone in `PLAN.md`.
- Keep `PLAN.md` updated as tasks/milestones progress, and update `RULES.md` if gameplay rules change.
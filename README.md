# Spill-Game
Spill is a turn-based roguelite: roll paint dice, mix colors, and cast spells across a 15-fight run.

## Play
- Browser: `npm install`, then `npm run dev`.
- Windows app (development): `npm run electron:dev`.
- Windows installer: `npm run dist:win` builds `release/Spill-Setup-<version>.exe`.

## Releasing an update
Merge to `main`. A GitHub Action picks the next version (patch, minor, or major, from the size of the change), builds the Windows installer, and publishes it to GitHub Releases. Installed games show an "Update available" notice on the main menu and update in one click. Add `[major]`, `[minor]`, `[patch]`, or `[skip release]` to the PR title to override the choice.

See `CLAUDE.md` for the full command list and project layout.

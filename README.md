# Spill-Game
Spill is a turn-based roguelite: roll paint dice, mix colors, and cast spells across a 15-fight run.

## Play
- Browser: `npm install`, then `npm run dev`.
- Windows app (development): `npm run electron:dev`.
- Windows installer: `npm run dist:win` builds `release/Spill-Setup-<version>.exe`.

## Releasing an update
Bump `version` in `package.json`, set `GH_TOKEN`, run `npm run release:win`, then publish the draft release on GitHub. Installed games show an "Update available" notice on the main menu and update in one click.

See `CLAUDE.md` for the full command list and project layout.

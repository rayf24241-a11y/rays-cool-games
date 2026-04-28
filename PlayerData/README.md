# PlayerData — RAYS CREAT3R Save System

All player data is stored in the browser's `localStorage`. No server or account required.

## Storage Keys

| Key | Description |
|-----|-------------|
| `rc_user` | User profile (name, created date, avatar color) |
| `rc_session` | Session tracking (last visit, total play time, visit count) |
| `rc_achievements` | Unlocked achievements array |
| `rc_projects` | All creator game projects (JSON array) |
| `rc_published` | Published games visible on the homepage |
| `candyClickerSave` | Candy Clicker game save (encoded by AntiHack module) |

## Files In This Folder

| File | Purpose |
|------|---------|
| `README.md` | This file — system overview |
| `player_profile.schema.json` | Shape of the rc_user object |
| `game_saves.schema.json` | Shape of game save data |
| `session_tracker.schema.json` | Shape of session data |
| `achievements.schema.json` | All achievement definitions |
| `viewer.html` | Open in browser to view/export/reset your data |

## How Persistence Works

1. On first visit → Setup screen → name saved to `rc_user`
2. On every return visit → `rc_user` found in localStorage → skip login
3. Session data updated on every page load
4. Account Key (from profile dropdown) bundles ALL data into a portable string
5. Use the Key on any browser to restore everything instantly

## Key Format

The account key is base64-encoded JSON containing:
```json
{
  "ver": 3,
  "user": { ... },
  "session": { ... },
  "achievements": [ ... ],
  "candySave": "...(encoded)...",
  "projects": "...(JSON string)..."
}
```

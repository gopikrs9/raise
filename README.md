# Raise

Raise prepares Indian parents of 14 to 18 year olds for one conversation at a time with their teenager.
Airtribe AI-First Product Management capstone, 2026.

**Live app:** https://gopikrs9.github.io/raise/

## How it works

| Part | Job |
|---|---|
| **Make** (the factory) | Finds topics from research, writes each lesson, has an AI judge check every cited sentence against the paper, makes the cover image and the recorded voice. |
| **Supabase** (the warehouse) | Stores topics, research sources, lessons, judge results, covers and audio. Handles Google sign-in and each parent's saved progress. |
| **This app** (the shop window) | The 45 screens of the version 7 design. Reads lessons straight from Supabase, so new lessons appear without a new release. |

Free tools only: Gemini and Gemma (free tier), Europe PMC and OpenAlex (research), Cloudflare Workers AI (covers), Supabase (free plan), Make (free plan), GitHub Pages.

## Files

- `index.html` — the app (all screens, the app logic, and the live layer that talks to Supabase).
- `privacy.html` — privacy notice.
- `manifest.webmanifest`, `icon.svg` — lets parents add Raise to their phone's home screen.

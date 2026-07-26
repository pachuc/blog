# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Hugo static site blog using the `tui-nav` theme (a custom terminal-style theme). The site is configured at `config.toml` and outputs to `public/`.

## Common Commands

```bash
# Run local development server
hugo server

# Build the site
hugo

# Create a new post
hugo new posts/my-post-title.md

# Create a new project page
hugo new projects/my-project.md
```

## Content Structure

- `content/posts/` - Blog posts
- `content/projects/` - Project showcase pages
- `content/about.md` - About page
- `archetypes/default.md` - Template for new content

## Theme

The active theme is `tui-nav` (git submodule at `themes/tui-nav`). Theme customization is done via `[params.tuiNav]` in `config.toml`, including colors, fonts, and homepage navigation items.

## Scripts

### Spotify Top Artists (`scripts/fetch_spotify.py`)

Fetches top artists from Spotify API and generates static content for the about page.

```bash
# Set up credentials (from https://developer.spotify.com/dashboard)
cp scripts/.env.example scripts/.env
# Edit scripts/.env with your credentials

# Run the script (first run opens browser for OAuth)
cd scripts && uv run fetch_spotify.py
```

Outputs:
- `data/spotify/<YYYY-MM-DD>.json` - Dated snapshot of artist data (one per run day, older snapshots are kept)
- `static/images/artists/` - Downloaded artist images (keyed by artist ID, shared across snapshots)

Used by `{{< spotify-artists >}}` in `content/about.md` (renders the latest snapshot) and `{{< spotify-archive >}}` in `content/music-archive.md` (renders all snapshots, newest first).

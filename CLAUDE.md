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

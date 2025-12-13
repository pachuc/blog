#!/usr/bin/env python3
"""
Fetch top artists from Spotify and generate Hugo data file.

Setup:
1. Create a Spotify app at https://developer.spotify.com/dashboard
2. Set redirect URI to http://localhost:8888/callback in app settings
3. Copy .env.example to .env and fill in your credentials
"""

import json
import os
import sys
import urllib.request
from pathlib import Path

from dotenv import load_dotenv
import spotipy
from spotipy.oauth2 import SpotifyOAuth

# Load .env from script directory
load_dotenv(Path(__file__).parent / ".env")

SCRIPT_DIR = Path(__file__).parent
BLOG_ROOT = SCRIPT_DIR.parent
STATIC_DIR = BLOG_ROOT / "static" / "images" / "artists"
DATA_DIR = BLOG_ROOT / "data"
CACHE_PATH = SCRIPT_DIR / ".spotify_cache"

ARTIST_COUNT = 24 # makes an even grid
TIME_RANGE = "medium_term"  # short_term, medium_term, long_term


def get_spotify_client():
    """Create authenticated Spotify client."""
    client_id = os.environ.get("SPOTIFY_CLIENT_ID")
    client_secret = os.environ.get("SPOTIFY_CLIENT_SECRET")

    if not client_id or not client_secret:
        print("Error: Missing Spotify credentials")
        print("Copy .env.example to .env and fill in your credentials")
        print("Get them from https://developer.spotify.com/dashboard")
        sys.exit(1)

    return spotipy.Spotify(auth_manager=SpotifyOAuth(
        client_id=client_id,
        client_secret=client_secret,
        redirect_uri="http://127.0.0.1:8888/callback",
        scope="user-top-read",
        cache_path=str(CACHE_PATH),
    ))


def download_image(url: str, path: Path) -> bool:
    """Download image from URL to path."""
    try:
        urllib.request.urlretrieve(url, path)
        return True
    except Exception as e:
        print(f"  Failed to download image: {e}")
        return False


def fetch_top_artists(sp: spotipy.Spotify) -> list[dict]:
    """Fetch top artists and download their images."""
    print(f"Fetching top {ARTIST_COUNT} artists ({TIME_RANGE})...")

    results = sp.current_user_top_artists(limit=ARTIST_COUNT, time_range=TIME_RANGE)
    artists = []

    STATIC_DIR.mkdir(parents=True, exist_ok=True)

    for i, artist in enumerate(results["items"], 1):
        name = artist["name"]
        artist_id = artist["id"]
        print(f"  [{i}/{ARTIST_COUNT}] {name}")

        # Get largest image
        images = artist.get("images", [])
        image_url = images[0]["url"] if images else None
        local_image = None

        if image_url:
            # Use artist ID for filename to avoid issues with special characters
            ext = "jpg"
            image_path = STATIC_DIR / f"{artist_id}.{ext}"
            if download_image(image_url, image_path):
                local_image = f"/images/artists/{artist_id}.{ext}"

        artists.append({
            "name": name,
            "id": artist_id,
            "image": local_image,
            "url": artist["external_urls"].get("spotify"),
            "genres": artist.get("genres", [])[:3],
            "popularity": artist.get("popularity", 0),
        })

    return artists


def save_data(artists: list[dict]):
    """Save artists data to Hugo data file."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    data_path = DATA_DIR / "spotify.json"

    data = {
        "top_artists": artists,
        "time_range": TIME_RANGE,
    }

    with open(data_path, "w") as f:
        json.dump(data, f, indent=2)

    print(f"\nSaved data to {data_path}")


def main():
    sp = get_spotify_client()
    artists = fetch_top_artists(sp)
    save_data(artists)
    print(f"\nDone! {len(artists)} artists fetched.")


if __name__ == "__main__":
    main()

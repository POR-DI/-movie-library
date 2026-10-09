# CineShelf design reference

Reference: [Spotify Design & Branding Guidelines](https://developer.spotify.com/documentation/design).

CineShelf uses TMDB movie data and its own branding. It does not integrate Spotify metadata, audio, or account access. Spotify-specific attribution, artwork and playback requirements therefore describe Spotify integrations rather than TMDB content rules.

## Principles adapted for this project

- Keep movie titles legible. Cards allow two lines, retain the full title in accessible link text and a tooltip, and link to details for the complete metadata.
- Preserve poster proportions. Use rounded corners: 8px desktop and 4px mobile.
- Keep content in clear collections with a link to explore each category.
- Show clear active/disabled controls and loading, error and empty states.
- Keep the CineShelf brand and credit the actual providers: TMDB for movie metadata and Flaticon for Uicons.

The sidebar, central discovery view, selected-movie panel and trailer dock are a Spotify-inspired movie experience. This reference does not establish Spotify affiliation or certification.

## Typography

The user-provided Gotham Book (400), Medium (500), Bold (700), and Black (800) files are loaded locally through `next/font/local`. Thai text retains IBM Plex Sans Thai as a fallback. The original download notice is preserved in `src/app/fonts/SOURCE-NOTICE.txt`; it notes that some downloads may be trials or have embedding restrictions, so these files do not establish a redistribution or commercial-use license.

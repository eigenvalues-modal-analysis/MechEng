# Fundamentals of Mechanical Engineering — Personal Reference Library

A single-page static study dashboard: your PDF on screen, your MP3s in a floating
player. No backend, no build tools, no third-party streaming services. Everything
is served straight from your own files.

## Project structure
## Add more songs

Open `script.js` and edit the `PLAYLIST` array near the top:

```javascript
const PLAYLIST = [
  { title: "Track One",   src: "music/track1.mp3" },
  { title: "Track Two",   src: "music/track2.mp3" },
  { title: "My New Song", src: "music/mysong.mp3" }, // add a line like this
];
```

Drop the matching `.mp3` file into the `music/` folder. Order in the array is the
play order. Missing files are skipped automatically — the player never crashes.

## Replace the PDF

Put your PDF in `docs/` and point `PDF_PATH` at it in `script.js`:

```javascript
const PDF_PATH = "docs/fundamentals.pdf";
```

If the file is missing, a clean "Document not found" placeholder appears instead.

## Customize colors and branding

**Colors** live as CSS variables at the top of `style.css` under `:root`. Change a
few values and the whole site updates:

```css
--bg:     #0b0e14;  /* page background */
--accent: #3b82f6;  /* primary blue    */
```

**Title & subtitle** are plain text in `index.html`:

```html
<p class="eyebrow">Personal Reference Library</p>
<h1 class="title">Fundamentals of Mechanical Engineering</h1>
```

**Fonts** are loaded from Google Fonts in the `<head>` of `index.html`
(Inter + JetBrains Mono). Swap the link and the `--font-ui` / `--font-mono`
variables to rebrand.

## Deploy to GitHub Pages

1. Create a repository and upload all files, keeping the folder structure above.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*.
4. Choose the `main` branch and the `/ (root)` folder, then **Save**.
5. Wait a minute; your site goes live at
   `https://<your-username>.github.io/<repo-name>/`.

## Controls & shortcuts

| Action           | Control            | Keyboard |
|------------------|--------------------|----------|
| Play / Pause     | ▶ / ⏸ button       | `Space`  |
| Previous track   | ⏮ button           | `←`      |
| Next track       | ⏭ button           | `→`      |
| Mute / Unmute    | 🔊 button          | `M`      |
| Shuffle          | shuffle toggle     | —        |
| Repeat (off/all/one) | repeat toggle  | —        |
| Seek             | click/drag the bar | `←`/`→` (when bar focused) |

Your current song, playback position, volume, and shuffle/repeat modes are saved
in the browser and restored on your next visit.

## Local testing

Browsers block `fetch` on `file://`, so open the folder with a tiny local server
rather than double-clicking `index.html`:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

On GitHub Pages everything is served over HTTPS, so no server setup is needed.

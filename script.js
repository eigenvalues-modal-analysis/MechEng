/* =========================================================
   Personal Study Dashboard — player + document logic
   Vanilla JS, no dependencies.
   ========================================================= */

/* ---------------------------------------------------------
   1. CONFIG — edit these two blocks to make the site yours.
   --------------------------------------------------------- */

// Add / reorder / remove tracks here. `title` is what the UI shows.
const PLAYLIST = [
  { title: "Track One",   src: "track1.mp3" },
  { title: "Track Two",   src: "track2.mp3" },
  { title: "Track Three", src: "track3.mp3" },
  { title: "Track Four",  src: "track4.mp3" },
  { title: "Track Five",  src: "track5.mp3" },
  { title: "Track Six",   src: "track6.mp3" },
  { title: "Track Seven", src: "track7.mp3" },
  { title: "Track Eight", src: "track8.mp3" },
];

// Path to the PDF shown in the viewer.
const PDF_PATH = "fundamentalz.pdf";

// localStorage namespace (bump this to reset everyone's saved state).
const STORAGE_KEY = "study-dashboard-v1";

/* ---------------------------------------------------------
   2. STATE
   --------------------------------------------------------- */
const audio = new Audio();
audio.preload = "metadata";

const state = {
  index: 0,          // current track index in PLAYLIST
  shuffle: false,
  repeat: "none",    // "none" | "all" | "one"
  volume: 0.8,
  muted: false,
  position: 0,       // last known playback position (seconds)
};

let history = [];       // stack of played indices (for Previous while shuffling)
let failedTracks = new Set(); // indices whose MP3 failed to load
let seeking = false;    // true while dragging the progress bar

/* ---------------------------------------------------------
   3. ELEMENT REFERENCES
   --------------------------------------------------------- */
const el = {
  title:      document.getElementById("track-title"),
  status:     document.getElementById("track-status"),
  play:       document.getElementById("btn-play"),
  prev:       document.getElementById("btn-prev"),
  next:       document.getElementById("btn-next"),
  shuffle:    document.getElementById("btn-shuffle"),
  repeat:     document.getElementById("btn-repeat"),
  repeatOne:  document.getElementById("repeat-one"),
  mute:       document.getElementById("btn-mute"),
  volume:     document.getElementById("volume"),
  progress:   document.getElementById("progress"),
  fill:       document.getElementById("progress-fill"),
  knob:       document.getElementById("progress-knob"),
  timeNow:    document.getElementById("time-current"),
  timeTotal:  document.getElementById("time-total"),
  iconPlay:   document.querySelector(".icon-play"),
  iconPause:  document.querySelector(".icon-pause"),
  iconVol:    document.querySelector(".icon-vol"),
  iconMute:   document.querySelector(".icon-mute"),
};

/* ---------------------------------------------------------
   4. HELPERS
   --------------------------------------------------------- */

// Format seconds as m:ss (e.g. 3:07). Returns 0:00 for invalid input.
function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      index: state.index,
      shuffle: state.shuffle,
      repeat: state.repeat,
      volume: state.volume,
      muted: state.muted,
      position: audio.currentTime || state.position,
    }));
  } catch (_) { /* storage may be unavailable (private mode) — ignore */ }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === "object") Object.assign(state, saved);
  } catch (_) { /* corrupt or empty — keep defaults */ }

  // Clamp the saved index in case the playlist shrank since last visit.
  if (state.index < 0 || state.index >= PLAYLIST.length) state.index = 0;
}

/* ---------------------------------------------------------
   5. TRACK LOADING & PLAYBACK
   --------------------------------------------------------- */

// Load a track into the audio element. Optionally start playing.
function loadTrack(index, { autoplay = false } = {}) {
  if (PLAYLIST.length === 0) {
    el.title.textContent = "No tracks configured";
    return;
  }
  state.index = index;
  const track = PLAYLIST[index];

  audio.src = track.src;
  el.title.textContent = track.title;
  el.status.textContent = autoplay ? "Loading…" : "Ready";
  updateProgress(0, 0);
  saveState();

  if (autoplay) play();
}

function play() {
  // play() returns a promise that rejects if autoplay is blocked — that's fine,
  // the user just needs to press Play once.
  audio.play().then(() => {
    el.status.textContent = "Now playing";
  }).catch(() => {
    el.status.textContent = "Press play";
    setPlayingUI(false);
  });
}

function pause() {
  audio.pause();
}

function togglePlay() {
  if (audio.paused) play();
  else pause();
}

// Advance to the next track. `auto` = triggered by a track finishing.
function nextTrack(auto = false) {
  if (PLAYLIST.length === 0) return;

  // Remember where we were so Previous can retrace shuffled jumps.
  history.push(state.index);

  let next;
  if (state.shuffle && PLAYLIST.length > 1) {
    do { next = Math.floor(Math.random() * PLAYLIST.length); }
    while (next === state.index);
  } else {
    next = state.index + 1;
    if (next >= PLAYLIST.length) {
      // End of playlist.
      if (auto && state.repeat === "none") {
        // Stop cleanly at the end.
        loadTrack(0, { autoplay: false });
        setPlayingUI(false);
        return;
      }
      next = 0; // wrap for manual Next, or when repeat = "all"
    }
  }
  loadTrack(next, { autoplay: true });
}

function prevTrack() {
  if (PLAYLIST.length === 0) return;

  // If we're more than 3s into a track, restart it instead of skipping back.
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }

  let prev;
  if (history.length > 0) {
    prev = history.pop();
  } else {
    prev = state.index - 1;
    if (prev < 0) prev = PLAYLIST.length - 1;
  }
  loadTrack(prev, { autoplay: true });
}

/* ---------------------------------------------------------
   6. UI UPDATERS
   --------------------------------------------------------- */
function setPlayingUI(isPlaying) {
  el.iconPlay.hidden = isPlaying;
  el.iconPause.hidden = !isPlaying;
  el.play.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
}

function updateProgress(current, duration) {
  const pct = duration > 0 ? (current / duration) * 100 : 0;
  el.fill.style.width = `${pct}%`;
  el.knob.style.left = `${pct}%`;
  el.timeNow.textContent = formatTime(current);
  el.timeTotal.textContent = formatTime(duration);
  el.progress.setAttribute("aria-valuenow", Math.round(pct));
}

function updateVolumeUI() {
  el.volume.value = state.volume;
  const silent = state.muted || state.volume === 0;
  el.iconVol.hidden = silent;
  el.iconMute.hidden = !silent;
  el.mute.setAttribute("aria-label", silent ? "Unmute" : "Mute");
}

function updateShuffleUI() {
  el.shuffle.setAttribute("aria-pressed", String(state.shuffle));
}

function updateRepeatUI() {
  const on = state.repeat !== "none";
  el.repeat.setAttribute("aria-pressed", String(on));
  el.repeatOne.hidden = state.repeat !== "one";
  el.repeat.setAttribute(
    "aria-label",
    state.repeat === "one" ? "Repeat one" : on ? "Repeat all" : "Repeat off"
  );
}

/* ---------------------------------------------------------
   7. AUDIO EVENT WIRING
   --------------------------------------------------------- */
audio.addEventListener("play",  () => setPlayingUI(true));
audio.addEventListener("pause", () => { setPlayingUI(false); saveState(); });

audio.addEventListener("loadedmetadata", () => {
  updateProgress(audio.currentTime, audio.duration);
  // A track loaded successfully, so it isn't in the failed set.
  failedTracks.delete(state.index);
});

// Keep the UI + saved position in sync as the track plays.
let lastSave = 0;
audio.addEventListener("timeupdate", () => {
  if (seeking) return;
  updateProgress(audio.currentTime, audio.duration);
  state.position = audio.currentTime;
  // Throttle writes to localStorage to ~ once every 4s.
  if (Date.now() - lastSave > 4000) { saveState(); lastSave = Date.now(); }
});

// Auto-advance when a track ends.
audio.addEventListener("ended", () => {
  if (state.repeat === "one") {
    audio.currentTime = 0;
    play();
  } else {
    nextTrack(true);
  }
});

// Skip a track that fails to load (missing MP3, bad path, etc.).
audio.addEventListener("error", () => {
  failedTracks.add(state.index);
  el.status.textContent = "Track unavailable — skipping";

  // If every track has failed, stop instead of looping forever.
  if (failedTracks.size >= PLAYLIST.length) {
    el.title.textContent = "No playable tracks found";
    el.status.textContent = "Check your /music files";
    setPlayingUI(false);
    return;
  }
  nextTrack(true);
});

/* ---------------------------------------------------------
   8. CONTROL EVENT WIRING
   --------------------------------------------------------- */
el.play.addEventListener("click", togglePlay);
el.next.addEventListener("click", () => nextTrack(false));
el.prev.addEventListener("click", prevTrack);

el.shuffle.addEventListener("click", () => {
  state.shuffle = !state.shuffle;
  history = []; // reset retrace history when the mode changes
  updateShuffleUI();
  saveState();
});

el.repeat.addEventListener("click", () => {
  state.repeat = state.repeat === "none" ? "all"
              : state.repeat === "all"  ? "one"
              : "none";
  updateRepeatUI();
  saveState();
});

// Volume slider
el.volume.addEventListener("input", () => {
  state.volume = parseFloat(el.volume.value);
  state.muted = false;
  audio.muted = false;
  audio.volume = state.volume;
  updateVolumeUI();
  saveState();
});

// Mute toggle
el.mute.addEventListener("click", () => {
  state.muted = !state.muted;
  audio.muted = state.muted;
  updateVolumeUI();
  saveState();
});

/* ---------- Progress bar seeking (click + drag) ---------- */
function seekFromEvent(e) {
  const rect = el.progress.getBoundingClientRect();
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const ratio = Math.min(Math.max(x / rect.width, 0), 1);
  if (Number.isFinite(audio.duration)) {
    const t = ratio * audio.duration;
    updateProgress(t, audio.duration); // reflect instantly while dragging
    return t;
  }
  return null;
}

el.progress.addEventListener("pointerdown", (e) => {
  seeking = true;
  el.progress.setPointerCapture(e.pointerId);
  seekFromEvent(e);
});
el.progress.addEventListener("pointermove", (e) => {
  if (seeking) seekFromEvent(e);
});
el.progress.addEventListener("pointerup", (e) => {
  const t = seekFromEvent(e);
  if (t !== null) audio.currentTime = t;
  seeking = false;
  saveState();
});

// Keyboard access for the progress bar (arrow keys nudge ±5s).
el.progress.addEventListener("keydown", (e) => {
  if (!Number.isFinite(audio.duration)) return;
  if (e.key === "ArrowRight") { audio.currentTime = Math.min(audio.duration, audio.currentTime + 5); e.preventDefault(); }
  if (e.key === "ArrowLeft")  { audio.currentTime = Math.max(0, audio.currentTime - 5); e.preventDefault(); }
});

/* ---------------------------------------------------------
   9. GLOBAL KEYBOARD SHORTCUTS
   Space = play/pause · ← prev · → next · M mute
   Ignored while typing in a field.
   --------------------------------------------------------- */
document.addEventListener("keydown", (e) => {
  const tag = (e.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;

  switch (e.key) {
    case " ":       e.preventDefault(); togglePlay(); break;
    case "ArrowLeft":  prevTrack(); break;
    case "ArrowRight": nextTrack(false); break;
    case "m": case "M":
      state.muted = !state.muted;
      audio.muted = state.muted;
      updateVolumeUI();
      saveState();
      break;
  }
});

// Persist position when leaving the page.
window.addEventListener("beforeunload", saveState);

/* ---------------------------------------------------------
   10. PDF VIEWER
   --------------------------------------------------------- */
function showPdfPlaceholder() {
  const stage = document.getElementById("doc-stage");
  document.getElementById("doc-open").style.display = "none";
  stage.innerHTML = `
    <div class="doc-missing">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <path d="M14 2v6h6M9 15h6M9 12h2" fill="none" stroke="currentColor" stroke-width="1.5"/>
      </svg>
      <h2>Document not found</h2>
      <p>Add your file at <code>${PDF_PATH}</code> and refresh the page.</p>
    </div>`;
}

function embedPdf() {
  const stage = document.getElementById("doc-stage");
  // <object> renders the PDF; its inner markup shows if the browser can't display it.
  stage.innerHTML = `
    <object data="${PDF_PATH}#view=FitH" type="application/pdf" aria-label="PDF document">
      <div class="doc-missing">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke="currentColor" stroke-width="1.5"/>
          <path d="M14 2v6h6" fill="none" stroke="currentColor" stroke-width="1.5"/>
        </svg>
        <h2>Can't display inline</h2>
        <p>Your browser can't render PDFs here.
           <a href="${PDF_PATH}" target="_blank" rel="noopener" style="color:var(--accent-hi)">Open it in a new tab</a>.</p>
      </div>
    </object>`;
}
// Check whether the PDF exists before embedding.
function initPdf() {
  fetch(PDF_PATH, { method: "HEAD" })
    .then((res) => {
      // Only show the placeholder if the file is genuinely missing (404).
      // Some hosts return other statuses for HEAD even when the file exists,
      // so we embed in every non-404 case.
      if (res.status === 404) showPdfPlaceholder();
      else embedPdf();
    })
    // A thrown fetch usually means local file:// testing — embed anyway.
    .catch(() => embedPdf());
}

/* ---------------------------------------------------------
   11. INIT
   --------------------------------------------------------- */
function init() {
  loadState();

  // Apply restored audio settings.
  audio.volume = state.volume;
  audio.muted = state.muted;
  updateVolumeUI();
  updateShuffleUI();
  updateRepeatUI();

  // Load the saved track WITHOUT autoplay (browsers block that anyway).
  loadTrack(state.index, { autoplay: false });

  // Once metadata is ready, jump to the saved position — one time only.
  audio.addEventListener("loadedmetadata", function restore() {
    if (state.position > 0 && state.position < audio.duration) {
      audio.currentTime = state.position;
    }
    audio.removeEventListener("loadedmetadata", restore);
  });

  el.status.textContent = "Press play";
  initPdf();
}

init();

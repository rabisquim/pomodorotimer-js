const RING_CIRCUMFERENCE = 2 * Math.PI * 110;
const STORAGE_KEY = "pomodoro-settings";
const CUSTOM_STATION_ID = "custom";

const STATIONS = [
  { id: "lofi", label: "Lo-fi beats", category: "Lo-fi", videoId: "1tJ8sc8I4z0" },
  { id: "synthwave", label: "Synthwave", category: "Lo-fi", videoId: "4xDzrJKXOOY" },
  { id: "jazz", label: "Jazz lo-fi", category: "Jazz", videoId: "E2vONfzoyRI" },
  { id: "baroque", label: "Barroco (estudo)", category: "Clássica", videoId: "efWKRfVDMf0" },
  { id: "baroque60", label: "Barroco 60 BPM", category: "Clássica", videoId: "2A9ZBES9z2Y" },
  { id: "rain-yt", label: "Chuva (24/7)", category: "Ambient", videoId: "-OekvEFm1lo" },
];

const AMBIENCES = [
  { id: "rain", label: "Chuva" },
  { id: "white", label: "Ruído branco" },
  { id: "waves", label: "Ondas do mar" },
];

const AMBIENCE_CFG = {
  rain: { filters: [{ type: "highpass", freq: 400 }, { type: "lowpass", freq: 6000 }], gain: 0.3 },
  white: { filters: [], gain: 0.25 },
  waves: { filters: [{ type: "lowpass", freq: 700 }], gain: 0.4, lfo: 0.07 },
};

const DEFAULT_SETTINGS = {
  focus: 25,
  short: 5,
  long: 15,
  cycles: 4,
  autoStart: false,
  station: "lofi",
  customUrl: "",
  volume: 0.6,
};

const LABELS = { focus: "Foco", short: "Pausa curta", long: "Pausa longa" };

// DOM elements
const timeLeftEl = document.getElementById("time-left");
const sessionLabelEl = document.getElementById("session-label");
const ringProgressEl = document.getElementById("ring-progress");
const startBtnEl = document.getElementById("start-btn");
const skipBtnEl = document.getElementById("skip-btn");
const resetBtnEl = document.getElementById("reset-btn");
const cycleCountEl = document.getElementById("cycle-count");
const tabsEls = document.querySelectorAll(".tab");

const settingsBtnEl = document.getElementById("settings-btn");
const modalEl = document.getElementById("settings-modal");
const setFocusEl = document.getElementById("set-focus");
const setShortEl = document.getElementById("set-short");
const setLongEl = document.getElementById("set-long");
const setCyclesEl = document.getElementById("set-cycles");
const setAutoStartEl = document.getElementById("set-autostart");
const settingsSaveEl = document.getElementById("settings-save");
const settingsCancelEl = document.getElementById("settings-cancel");

const radioToggleEl = document.getElementById("radio-toggle");
const radioPlayerEl = document.getElementById("radio-player");
const radioStateEl = document.getElementById("radio-state");
const radioFallbackEl = document.getElementById("radio-fallback");
const radioStationEl = document.getElementById("radio-station");
const radioCustomEl = document.getElementById("radio-custom");
const radioCustomUrlEl = document.getElementById("radio-custom-url");
const radioCustomApplyEl = document.getElementById("radio-custom-apply");
const radioVolumeRowEl = document.getElementById("radio-volume-row");
const radioVolumeEl = document.getElementById("radio-volume");

const isFileProtocol = location.protocol === "file:";

const alarmSound = new Audio("assets/alarm-sound.mp3");

// State
let settings = loadSettings();

const state = {
  mode: "focus",
  running: false,
  remaining: settings.focus * 60,
  total: settings.focus * 60,
  endTime: 0,
  focusDone: 0,
  intervalId: null,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function persistSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable — ignore */
  }
}

function durationFor(mode) {
  return settings[mode] * 60;
}

function formatTime(totalSeconds) {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function render() {
  timeLeftEl.textContent = formatTime(state.remaining);
  sessionLabelEl.textContent = LABELS[state.mode];
  document.body.dataset.mode = state.mode;
  cycleCountEl.textContent = String(state.focusDone);

  const ratio = state.total > 0 ? state.remaining / state.total : 0;
  ringProgressEl.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - ratio));

  startBtnEl.textContent = state.running ? "Pausar" : "Iniciar";

  tabsEls.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.mode === state.mode);
  });
}

function setMode(mode) {
  state.mode = mode;
  state.total = durationFor(mode);
  state.remaining = durationFor(mode);
  render();
}

function tick() {
  const remaining = Math.max(0, (state.endTime - Date.now()) / 1000);
  state.remaining = remaining;
  if (remaining <= 0) {
    render();
    complete();
    return;
  }
  render();
}

function start() {
  if (state.running || state.remaining <= 0) return;
  state.running = true;
  state.endTime = Date.now() + state.remaining * 1000;
  state.intervalId = setInterval(tick, 200);
  render();
}

function pause() {
  if (!state.running) return;
  state.running = false;
  clearInterval(state.intervalId);
  state.intervalId = null;
  state.remaining = Math.max(0, (state.endTime - Date.now()) / 1000);
  render();
}

function toggle() {
  if (state.running) pause();
  else start();
}

function reset() {
  clearInterval(state.intervalId);
  state.intervalId = null;
  state.running = false;
  state.total = durationFor(state.mode);
  state.remaining = durationFor(state.mode);
  render();
}

function nextMode() {
  if (state.mode === "focus") {
    return state.focusDone > 0 && state.focusDone % settings.cycles === 0
      ? "long"
      : "short";
  }
  return "focus";
}

function complete() {
  clearInterval(state.intervalId);
  state.intervalId = null;
  state.running = false;

  if (state.mode === "focus") state.focusDone += 1;

  playAlarm();
  notify(LABELS[state.mode]);

  setMode(nextMode());

  if (settings.autoStart) start();
}

function skip() {
  clearInterval(state.intervalId);
  state.intervalId = null;
  state.running = false;
  setMode(nextMode());
}

function playAlarm() {
  try {
    alarmSound.currentTime = 0;
    alarmSound.play();
  } catch {
    /* autoplay blocked — ignore */
  }
}

function notify(finishedLabel) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification("Sessão finalizada", {
    body: `${finishedLabel} concluída. Hora da próxima etapa!`,
  });
}

// Settings modal
function openSettings() {
  setFocusEl.value = settings.focus;
  setShortEl.value = settings.short;
  setLongEl.value = settings.long;
  setCyclesEl.value = settings.cycles;
  setAutoStartEl.checked = settings.autoStart;
  modalEl.hidden = false;
}

function closeSettings() {
  modalEl.hidden = true;
}

function clampInt(value, min, max, fallback) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function applySettings() {
  settings.focus = clampInt(setFocusEl.value, 1, 120, settings.focus);
  settings.short = clampInt(setShortEl.value, 1, 60, settings.short);
  settings.long = clampInt(setLongEl.value, 1, 60, settings.long);
  settings.cycles = clampInt(setCyclesEl.value, 1, 12, settings.cycles);
  settings.autoStart = setAutoStartEl.checked;

  persistSettings();
  closeSettings();
  reset();
}

// Radio — YouTube stations + local ambience sounds
let radioPlayer = null;
let radioOpen = false;
let apiReady = false;
let loadedVideoId = null;

let audioCtx = null;
let ambienceNodes = null;

function isAmbience(id) {
  return AMBIENCES.some((a) => a.id === id);
}

function parseVideoId(url) {
  if (!url) return null;
  const value = url.trim();
  if (/^[\w-]{11}$/.test(value)) return value;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1).split("/")[0];
    return /^[\w-]{11}$/.test(id) ? id : null;
  }
  if (host.endsWith("youtube.com")) {
    const v = parsed.searchParams.get("v");
    if (v) return v;
    const match = parsed.pathname.match(/\/(?:embed|shorts|live|v)\/([^/?#]+)/);
    if (match) return match[1];
  }
  return null;
}

function currentVideoId() {
  if (settings.station === CUSTOM_STATION_ID) return parseVideoId(settings.customUrl);
  const station = STATIONS.find((s) => s.id === settings.station);
  return station ? station.videoId : null;
}

function buildStationSelect() {
  radioStationEl.replaceChildren();
  const categories = [...new Set(STATIONS.map((s) => s.category))];
  categories.forEach((category) => {
    const group = document.createElement("optgroup");
    group.label = category;
    STATIONS.filter((s) => s.category === category).forEach((s) => {
      group.appendChild(new Option(s.label, s.id));
    });
    radioStationEl.appendChild(group);
  });

  const localGroup = document.createElement("optgroup");
  localGroup.label = "Sons locais (offline)";
  AMBIENCES.forEach((a) => localGroup.appendChild(new Option(a.label, a.id)));
  radioStationEl.appendChild(localGroup);

  radioStationEl.appendChild(new Option("Link personalizado…", CUSTOM_STATION_ID));
}

function buildFallback() {
  const title = document.createElement("p");
  title.className = "radio__fallback-title";
  title.textContent = "Abrir no YouTube";
  radioFallbackEl.appendChild(title);
  STATIONS.forEach((s) => {
    const link = document.createElement("a");
    link.href = `https://www.youtube.com/watch?v=${s.videoId}`;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = s.label;
    radioFallbackEl.appendChild(link);
  });
}

function handlePlayerState(event) {
  if (!radioOpen || isAmbience(settings.station)) return;
  if (event.data === YT.PlayerState.PLAYING) radioStateEl.textContent = "tocando";
  else if (event.data === YT.PlayerState.PAUSED) radioStateEl.textContent = "pausado";
  else if (event.data === YT.PlayerState.BUFFERING) radioStateEl.textContent = "carregando…";
}

function playerPlay() {
  if (radioPlayer && typeof radioPlayer.playVideo === "function") radioPlayer.playVideo();
}

function playerPause() {
  if (radioPlayer && typeof radioPlayer.pauseVideo === "function") radioPlayer.pauseVideo();
}

function ensurePlayer(videoId) {
  if (!apiReady) return;
  if (!radioPlayer) {
    radioPlayer = new YT.Player("yt-player", {
      videoId,
      playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
      events: {
        onReady: () => {
          if (radioOpen && !isAmbience(settings.station)) playerPlay();
        },
        onStateChange: handlePlayerState,
      },
    });
    loadedVideoId = videoId;
    return;
  }
  if (videoId && videoId !== loadedVideoId) {
    loadedVideoId = videoId;
    if (typeof radioPlayer.loadVideoById === "function") radioPlayer.loadVideoById(videoId);
  }
}

function applyRadio() {
  const ambience = isAmbience(settings.station);
  radioCustomEl.hidden = settings.station !== CUSTOM_STATION_ID;
  radioVolumeRowEl.hidden = !ambience;
  radioStationEl.value = settings.station;

  if (ambience) {
    radioFallbackEl.hidden = true;
    playerPause();
    if (radioOpen) {
      startAmbience(settings.station);
      radioStateEl.textContent = "tocando";
    } else {
      stopAmbience();
      radioStateEl.textContent = "toca pra abrir";
    }
    return;
  }

  stopAmbience();

  if (isFileProtocol) {
    radioFallbackEl.hidden = !radioOpen;
    playerPause();
    radioStateEl.textContent = radioOpen ? "abrir no YouTube" : "toca pra abrir";
    return;
  }

  radioFallbackEl.hidden = true;

  const videoId = currentVideoId();
  if (!videoId) {
    radioStateEl.textContent = radioOpen ? "link inválido" : "toca pra abrir";
    return;
  }

  ensurePlayer(videoId);
  if (radioOpen) playerPlay();
  else playerPause();
  radioStateEl.textContent = radioOpen ? "carregando…" : "toca pra abrir";
}

function setStation(id) {
  settings.station = id;
  persistSettings();
  applyRadio();
}

function applyCustomUrl() {
  const value = radioCustomUrlEl.value.trim();
  if (!parseVideoId(value)) {
    radioCustomUrlEl.classList.add("is-invalid");
    return;
  }
  radioCustomUrlEl.classList.remove("is-invalid");
  settings.customUrl = value;
  settings.station = CUSTOM_STATION_ID;
  persistSettings();
  applyRadio();
}

function toggleRadio() {
  radioOpen = !radioOpen;
  radioPlayerEl.hidden = !radioOpen;
  radioToggleEl.setAttribute("aria-expanded", String(radioOpen));
  applyRadio();
}

function makeNoiseBuffer(ctx) {
  const length = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function startAmbience(id) {
  const cfg = AMBIENCE_CFG[id];
  if (!cfg) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch {
    return;
  }

  stopAmbience();

  const source = audioCtx.createBufferSource();
  source.buffer = makeNoiseBuffer(audioCtx);
  source.loop = true;

  let node = source;
  (cfg.filters || []).forEach((f) => {
    const biquad = audioCtx.createBiquadFilter();
    biquad.type = f.type;
    biquad.frequency.value = f.freq;
    node.connect(biquad);
    node = biquad;
  });

  const gain = audioCtx.createGain();
  node.connect(gain);
  gain.connect(audioCtx.destination);

  let lfo = null;
  let lfoGain = null;
  const base = settings.volume * cfg.gain;

  if (cfg.lfo) {
    lfo = audioCtx.createOscillator();
    lfo.frequency.value = cfg.lfo;
    lfoGain = audioCtx.createGain();
    lfoGain.gain.value = base * 0.5;
    gain.gain.value = base * 0.5;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
  } else {
    gain.gain.value = base;
  }

  source.start();
  ambienceNodes = { source, gain, lfo, lfoGain, id };
}

function stopAmbience() {
  if (!ambienceNodes) return;
  try {
    ambienceNodes.source.stop();
  } catch {
    /* already stopped */
  }
  try {
    ambienceNodes.source.disconnect();
    if (ambienceNodes.lfo) ambienceNodes.lfo.stop();
  } catch {
    /* ignore */
  }
  ambienceNodes = null;
}

function updateAmbienceVolume() {
  if (!ambienceNodes) return;
  const cfg = AMBIENCE_CFG[ambienceNodes.id];
  const base = settings.volume * cfg.gain;
  if (ambienceNodes.lfoGain) {
    ambienceNodes.gain.gain.value = base * 0.5;
    ambienceNodes.lfoGain.gain.value = base * 0.5;
  } else {
    ambienceNodes.gain.gain.value = base;
  }
}

function onYouTubeIframeAPIReady() {
  apiReady = true;
  if (isFileProtocol) return;
  if (radioOpen && !isAmbience(settings.station)) applyRadio();
}
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

// Events
startBtnEl.addEventListener("click", toggle);
skipBtnEl.addEventListener("click", skip);
resetBtnEl.addEventListener("click", reset);
settingsBtnEl.addEventListener("click", openSettings);
settingsSaveEl.addEventListener("click", applySettings);
settingsCancelEl.addEventListener("click", closeSettings);
modalEl.querySelector("[data-close]").addEventListener("click", closeSettings);
radioToggleEl.addEventListener("click", toggleRadio);
radioStationEl.addEventListener("change", () => setStation(radioStationEl.value));
radioCustomApplyEl.addEventListener("click", applyCustomUrl);
radioCustomUrlEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    applyCustomUrl();
  }
});
radioVolumeEl.addEventListener("input", () => {
  settings.volume = Number(radioVolumeEl.value) / 100;
  persistSettings();
  updateAmbienceVolume();
});

tabsEls.forEach((tab) => {
  tab.addEventListener("click", () => {
    clearInterval(state.intervalId);
    state.intervalId = null;
    state.running = false;
    setMode(tab.dataset.mode);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modalEl.hidden) closeSettings();
});

// Init
buildStationSelect();
buildFallback();
radioVolumeEl.value = String(Math.round(settings.volume * 100));

const stationKnown =
  isAmbience(settings.station) ||
  settings.station === CUSTOM_STATION_ID ||
  STATIONS.some((s) => s.id === settings.station);
if (!stationKnown) settings.station = "lofi";
radioStationEl.value = settings.station;

render();
applyRadio();

if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}

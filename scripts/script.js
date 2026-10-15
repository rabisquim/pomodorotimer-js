const RING_CIRCUMFERENCE = 2 * Math.PI * 110;
const STORAGE_KEY = "pomodoro-settings";
const RADIO_VIDEO_ID = "1tJ8sc8I4z0";

const DEFAULT_SETTINGS = {
  focus: 25,
  short: 5,
  long: 15,
  cycles: 4,
  autoStart: false,
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

// Radio (YouTube IFrame API)
let radioPlayer = null;
let radioOpen = false;

function onYouTubeIframeAPIReady() {
  if (isFileProtocol) return;
  radioPlayer = new YT.Player("yt-player", {
    videoId: RADIO_VIDEO_ID,
    playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
    events: {
      onStateChange: (event) => {
        if (!radioOpen) return;
        if (event.data === YT.PlayerState.PLAYING) radioStateEl.textContent = "tocando";
        else if (event.data === YT.PlayerState.PAUSED) radioStateEl.textContent = "pausado";
      },
    },
  });
}
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

function toggleRadio() {
  radioOpen = !radioOpen;
  radioPlayerEl.hidden = !radioOpen;
  radioToggleEl.setAttribute("aria-expanded", String(radioOpen));

  if (isFileProtocol) {
    radioFallbackEl.hidden = !radioOpen;
    radioStateEl.textContent = radioOpen ? "modo local" : "toca pra ouvir";
    return;
  }

  radioStateEl.textContent = radioOpen ? "tocando" : "toca pra ouvir";
  if (!radioPlayer) return;
  if (radioOpen) radioPlayer.playVideo();
  else radioPlayer.pauseVideo();
}

// Events
startBtnEl.addEventListener("click", toggle);
skipBtnEl.addEventListener("click", skip);
resetBtnEl.addEventListener("click", reset);
settingsBtnEl.addEventListener("click", openSettings);
settingsSaveEl.addEventListener("click", applySettings);
settingsCancelEl.addEventListener("click", closeSettings);
modalEl.querySelector("[data-close]").addEventListener("click", closeSettings);
radioToggleEl.addEventListener("click", toggleRadio);

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
render();

if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}

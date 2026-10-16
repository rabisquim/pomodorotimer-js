/* Internationalization (i18n) — PT-BR / EN
   Loaded before scripts/script.js. Exposes window.I18N. */
(function () {
  "use strict";

  const STORAGE_KEY = "pomodoro-lang";
  const DEFAULT_LANG = "pt-BR";
  const SUPPORTED = ["pt-BR", "en"];

  const TRANSLATIONS = {
    "pt-BR": {
      app: {
        title: "Pomodoro Timer",
        name: "Pomodoro",
      },
      header: {
        settingsAria: "Abrir configurações",
        langAria: "Mudar para inglês",
      },
      tabs: {
        aria: "Tipo de sessão",
      },
      mode: {
        focus: "Foco",
        short: "Pausa curta",
        long: "Pausa longa",
      },
      btn: {
        start: "Iniciar",
        pause: "Pausar",
        skip: "Pular",
        reset: "Reiniciar",
      },
      cycles: {
        done: "pomodoros concluídos",
      },
      radio: {
        name: "Rádio",
        station: "Estação",
        customPlaceholder: "Cole um link do YouTube",
        play: "Tocar",
        volume: "Volume",
        customOption: "Link personalizado…",
        localSounds: "Sons locais (offline)",
        fallbackTitle: "Abrir no YouTube",
        state: {
          playing: "tocando",
          paused: "pausado",
          loading: "carregando…",
          open: "toca pra abrir",
          fallback: "abrir no YouTube",
          invalid: "link inválido",
        },
      },
      station: {
        lofi: "Lo-fi beats",
        synthwave: "Synthwave",
        jazz: "Jazz lo-fi",
        baroque: "Barroco (estudo)",
        baroque60: "Barroco 60 BPM",
        rain: "Chuva (24/7)",
      },
      cat: {
        lofi: "Lo-fi",
        jazz: "Jazz",
        classical: "Clássica",
        ambient: "Ambient",
      },
      ambience: {
        rain: "Chuva",
        white: "Ruído branco",
        waves: "Ondas do mar",
      },
      settings: {
        title: "Configurações",
        focus: "Foco (min)",
        short: "Pausa curta (min)",
        long: "Pausa longa (min)",
        cycles: "Ciclos até pausa longa",
        autoStart: "Auto-iniciar próxima sessão",
        cancel: "Cancelar",
        save: "Salvar",
      },
      notify: {
        title: "Sessão finalizada",
        body: "{label} concluída. Hora da próxima etapa!",
      },
      footer: {
        developedBy: "Desenvolvido por",
      },
    },
    en: {
      app: {
        title: "Pomodoro Timer",
        name: "Pomodoro",
      },
      header: {
        settingsAria: "Open settings",
        langAria: "Switch to Portuguese",
      },
      tabs: {
        aria: "Session type",
      },
      mode: {
        focus: "Focus",
        short: "Short break",
        long: "Long break",
      },
      btn: {
        start: "Start",
        pause: "Pause",
        skip: "Skip",
        reset: "Reset",
      },
      cycles: {
        done: "pomodoros completed",
      },
      radio: {
        name: "Radio",
        station: "Station",
        customPlaceholder: "Paste a YouTube link",
        play: "Play",
        volume: "Volume",
        customOption: "Custom link…",
        localSounds: "Local sounds (offline)",
        fallbackTitle: "Open on YouTube",
        state: {
          playing: "playing",
          paused: "paused",
          loading: "loading…",
          open: "tap to open",
          fallback: "open on YouTube",
          invalid: "invalid link",
        },
      },
      station: {
        lofi: "Lo-fi beats",
        synthwave: "Synthwave",
        jazz: "Lo-fi jazz",
        baroque: "Baroque (study)",
        baroque60: "Baroque 60 BPM",
        rain: "Rain (24/7)",
      },
      cat: {
        lofi: "Lo-fi",
        jazz: "Jazz",
        classical: "Classical",
        ambient: "Ambient",
      },
      ambience: {
        rain: "Rain",
        white: "White noise",
        waves: "Sea waves",
      },
      settings: {
        title: "Settings",
        focus: "Focus (min)",
        short: "Short break (min)",
        long: "Long break (min)",
        cycles: "Cycles until long break",
        autoStart: "Auto-start next session",
        cancel: "Cancel",
        save: "Save",
      },
      notify: {
        title: "Session finished",
        body: "{label} completed. Time for the next step!",
      },
      footer: {
        developedBy: "Developed by",
      },
    },
  };

  let currentLang = detectLang();

  function detectLang() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED.includes(saved)) return saved;
    } catch {
      /* storage unavailable — ignore */
    }
    const nav = (navigator.language || "").toLowerCase();
    return nav.startsWith("pt") ? "pt-BR" : "en";
  }

  function resolve(lang, key) {
    return key
      .split(".")
      .reduce((acc, part) => (acc == null ? undefined : acc[part]), TRANSLATIONS[lang]);
  }

  function t(key, params) {
    let value = resolve(currentLang, key);
    if (typeof value !== "string") value = resolve(DEFAULT_LANG, key);
    if (typeof value !== "string") return key;
    if (params) {
      value = value.replace(/\{(\w+)\}/g, (match, name) =>
        Object.prototype.hasOwnProperty.call(params, name) ? params[name] : match
      );
    }
    return value;
  }

  function applyTranslations() {
    document.documentElement.lang = currentLang;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });

    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });

    updateLangButton();
  }

  function updateLangButton() {
    const btn = document.getElementById("lang-btn");
    if (!btn) return;
    const code = btn.querySelector("[data-lang-code]");
    if (code) code.textContent = currentLang === "pt-BR" ? "PT" : "EN";
  }

  function setLang(lang) {
    currentLang = SUPPORTED.includes(lang) ? lang : DEFAULT_LANG;
    try {
      localStorage.setItem(STORAGE_KEY, currentLang);
    } catch {
      /* storage unavailable — ignore */
    }
    applyTranslations();
    document.dispatchEvent(new CustomEvent("languagechange", { detail: { lang: currentLang } }));
  }

  function toggleLang() {
    setLang(currentLang === "pt-BR" ? "en" : "pt-BR");
  }

  window.I18N = {
    t,
    getLang: () => currentLang,
    setLang,
    toggleLang,
    applyTranslations,
  };

  // This script sits at the end of <body>, so the DOM is ready.
  applyTranslations();
})();

(() => {
  'use strict';

  const RULESET_TELEMETRY = 'gemini_telemetry_blocker';
  const RULESET_CACHE = 'gemini_static_cache';
  const RULESET_WEBFONTS = 'gemini_webfont_blocker';
  const RULESET_DECOR = 'gemini_decor_blocker';

  const PRESETS = {
    stealth: {
      blockTelemetry: true,
      forceStaticCache: true,
      noFx: false,
      flatUi: false,
      compactInput: false,
      wideChat: false,
      sysFonts: false,
      contentVisibility: true,
      hideDecor: false,
      foldOldTurns: false
    },
    'bare-metal': {
      blockTelemetry: true,
      forceStaticCache: true,
      noFx: true,
      flatUi: true,
      compactInput: true,
      wideChat: false,
      sysFonts: true,
      contentVisibility: true,
      hideDecor: true,
      foldOldTurns: true
    }
  };

  const I18N = {
    en: {
      masterEnable: 'Enable optimization',
      presetTitle: 'Mode (preset)',
      presetStealthBtn: 'Stealth',
      presetBareBtn: 'Bare-Metal',
      presetLabels: { stealth: 'Stealth', 'bare-metal': 'Bare-Metal', custom: 'Custom' },
      presetDescs: {
        stealth: '100% native Gemini look: blocks telemetry only, caches gstatic.com, and isolates off-screen rendering.',
        'bare-metal': 'Maximum speed: clean flat UI, system fonts, no heavy FX, and smart folding for old turns.',
        custom: 'Custom combination of toggles. Click a preset button above to restore a built-in profile.'
      },
      sectionInvisible: 'Invisible acceleration (zero visual changes)',
      optTelemetry: 'Block telemetry via C++ DNR (BotGuard/WAA safe)',
      optCache: 'Force 7-day SSD cache for gstatic.com static assets',
      optCv: 'Off-screen content-visibility: auto (last 4 turns protected)',
      optProtectRich: 'Protect turns with Canvas, video, audio & interactive widgets',
      sectionVisual: 'Visual stripping & Bare-Metal UI',
      optNoFx: 'Instant UI: no shadows, blur, gradients, or ripples (Angular-safe)',
      optFlatUi: 'Clean flat UI (6px corners, crisp 1px borders)',
      optCompact: 'Compact bottom input bar (hide footer disclaimer)',
      optWide: 'Wide chat layout (better for code blocks & tables)',
      optSysFonts: 'System fonts + block web fonts (icons & KaTeX intact)',
      optHideDecor: 'Hide decorative avatars, illustrations & Lottie animations',
      optFoldOld: 'Fold older turns into compact bars (content-visibility: hidden)',
      optKeepOpen: 'Keep expanded:',
      keep3: 'Last 3',
      keep6: 'Last 6',
      keep10: 'Last 10',
      keep15: 'Last 15',
      optUnfoldFind: 'Auto-expand folded turns on Ctrl+F search',
      btnRescan: 'Rescan',
      rescanTitle: 'Rescan active chat',
      reloadHint: 'Font/Lottie network rules changed — reload the tab (F5) to fully restore native assets.',
      footer: 'Alt+Shift+E — toggle history folding · 0 background processes.',
      openGeminiHint: 'Open gemini.google.com for live stats',
      dnrLine: (t, c, f) => `C++ DNR: Telemetry ${t ? 'ON' : 'OFF'} · Cache ${c ? 'ON' : 'OFF'} · Fonts ${f ? 'BLOCK' : 'NATIVE'}`,
      liveStats: (s) => {
        const modeDetail = s.foldedTurns > 0
          ? `folded ${s.foldedTurns}`
          : `isolated ${s.isolatedTurns || 0}`;
        const guardPart = s.protectedTurns > 0 ? ` · guarded ${s.protectedTurns}` : '';
        return `Turns: ${s.totalTurns} (${modeDetail}${guardPart}) · DOM: ${s.domNodes}`;
      }
    },
    uk: {
      masterEnable: 'Увімкнути оптимізацію',
      presetTitle: 'Режим роботи (пресет)',
      presetStealthBtn: 'Непомітний',
      presetBareBtn: 'Bare-Metal',
      presetLabels: { stealth: 'Непомітний', 'bare-metal': 'Bare-Metal', custom: 'Власний' },
      presetDescs: {
        stealth: '100% рідний вигляд Gemini: блокує лише телеметрію, кешує gstatic.com та ізолює позаекранний рендеринг.',
        'bare-metal': 'Максимальна швидкість: оголений плоский UI, системні шрифти, без ефектів і зі згортанням старих ходів.',
        custom: 'Індивідуальна комбінація параметрів. Натисніть кнопку вище, щоб повернутися до готового пресету.'
      },
      sectionInvisible: 'Невидиме прискорення (без зміни вигляду)',
      optTelemetry: 'Блокувати телеметрію в C++ DNR (BotGuard/WAA захищено)',
      optCache: 'Примусовий SSD-кеш статики gstatic.com (7 днів)',
      optCv: 'Ізоляція content-visibility: auto (4 останні ходи захищені)',
      optProtectRich: 'Захищати ходи з Canvas, відео, аудіо та інтерактивними елементами',
      sectionVisual: 'Візуальне спрощення та Bare-Metal UI',
      optNoFx: 'Миттєвий UI без тіней, блюру, градієнтів і риплів (Angular-safe)',
      optFlatUi: 'Охайний плоский UI (6px скруглень, тонкі рамки 1px)',
      optCompact: 'Компактна нижня панель вводу (без підпису внизу)',
      optWide: 'Широкий режим чату (зручніше для коду й таблиць)',
      optSysFonts: 'Системні шрифти + блок веб-шрифтів (іконки й KaTeX цілі)',
      optHideDecor: 'Приховати декоративні аватари, ілюстрації та Lottie',
      optFoldOld: 'Згортати старі повідомлення у плашки (content-visibility: hidden)',
      optKeepOpen: 'Залишати відкритими:',
      keep3: 'Останні 3',
      keep6: 'Останні 6',
      keep10: 'Останні 10',
      keep15: 'Останні 15',
      optUnfoldFind: 'Авто-розгортати при пошуку Ctrl+F',
      btnRescan: 'Оновити',
      rescanTitle: 'Пересканувати активний чат',
      reloadHint: 'Мережеві правила шрифтів/Lottie змінено — оновіть вкладку (F5), щоб повністю повернути рідні ресурси.',
      footer: 'Alt+Shift+E — розгорнути/згорнути історію · 0 фонових процесів.',
      openGeminiHint: 'Відкрийте gemini.google.com для метрик',
      dnrLine: (t, c, f) => `C++ DNR: Телеметрія ${t ? 'ON' : 'OFF'} · Кеш ${c ? 'ON' : 'OFF'} · Шрифти ${f ? 'БЛОК' : 'РІДНІ'}`,
      liveStats: (s) => {
        const modeDetail = s.foldedTurns > 0
          ? `згорн. ${s.foldedTurns}`
          : `ізол. ${s.isolatedTurns || 0}`;
        const guardPart = s.protectedTurns > 0 ? ` · зах. ${s.protectedTurns}` : '';
        return `Ходів: ${s.totalTurns} (${modeDetail}${guardPart}) · DOM: ${s.domNodes}`;
      }
    }
  };

  const DEFAULTS = Object.assign(
    {
      enabled: true,
      language: 'en',
      preset: 'bare-metal',
      protectRichTurns: true,
      unfoldOnFind: true,
      keepTurns: 6
    },
    PRESETS['bare-metal']
  );

  const checkboxes = [
    'enabled', 'blockTelemetry', 'forceStaticCache', 'contentVisibility',
    'protectRichTurns', 'noFx', 'flatUi', 'compactInput', 'wideChat',
    'sysFonts', 'hideDecor', 'foldOldTurns', 'unfoldOnFind'
  ];

  const optionsGroup = document.getElementById('options-group');
  const keepTurnsEl = document.getElementById('keepTurns');
  const foldSubGroup = document.getElementById('foldSubGroup');
  const dnrStatEl = document.getElementById('dnr-stat');
  const liveStatEl = document.getElementById('live-stat');
  const rescanBtn = document.getElementById('rescanBtn');
  const btnStealth = document.getElementById('btnStealth');
  const btnBareMetal = document.getElementById('btnBareMetal');
  const presetBadge = document.getElementById('presetBadge');
  const presetDesc = document.getElementById('presetDesc');
  const reloadHint = document.getElementById('reloadHint');
  const langEnBtn = document.getElementById('langEn');
  const langUkBtn = document.getElementById('langUk');

  let currentLang = 'en';
  let lastNetVisualState = null;
  let lastStats = null;
  let lastDnrFlags = { t: true, c: true, f: true };

  function normalizeLanguage(lang) {
    return lang === 'uk' ? 'uk' : 'en';
  }

  function getPack() {
    return currentLang === 'uk' ? I18N.uk : I18N.en;
  }

  function detectPreset(s) {
    const names = Object.keys(PRESETS);
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const tpl = PRESETS[name];
      const keys = Object.keys(tpl);
      let match = true;
      for (let j = 0; j < keys.length; j++) {
        const k = keys[j];
        if (Boolean(s[k]) !== Boolean(tpl[k])) {
          match = false;
          break;
        }
      }
      if (match) return name;
    }
    return 'custom';
  }

  function migrateStored(raw) {
    const merged = Object.assign({}, DEFAULTS, raw || {});
    if (raw && typeof raw.blockNetwork === 'boolean') {
      if (typeof raw.blockTelemetry !== 'boolean') merged.blockTelemetry = raw.blockNetwork;
      if (typeof raw.forceStaticCache !== 'boolean') merged.forceStaticCache = raw.blockNetwork;
    }
    merged.language = normalizeLanguage(merged.language);
    merged.preset = detectPreset(merged);
    return merged;
  }

  function applyTranslations(lang) {
    currentLang = normalizeLanguage(lang);
    document.documentElement.lang = currentLang;
    const pack = getPack();

    const nodes = document.querySelectorAll('[data-i18n]');
    for (let i = 0; i < nodes.length; i++) {
      const key = nodes[i].getAttribute('data-i18n');
      if (key && typeof pack[key] === 'string') {
        nodes[i].textContent = pack[key];
      }
    }

    if (rescanBtn) rescanBtn.title = pack.rescanTitle;
    if (langEnBtn) langEnBtn.classList.toggle('active', currentLang === 'en');
    if (langUkBtn) langUkBtn.classList.toggle('active', currentLang === 'uk');

    if (dnrStatEl) {
      dnrStatEl.textContent = pack.dnrLine(lastDnrFlags.t, lastDnrFlags.c, lastDnrFlags.f);
    }
    renderLiveStats(lastStats);
  }

  function syncDnrRulesets(state, isUserChange) {
    if (!chrome.declarativeNetRequest || !chrome.declarativeNetRequest.updateEnabledRulesets) return;
    const enableRulesetIds = [];
    const disableRulesetIds = [];

    const masterOn = Boolean(state.enabled);
    const wantTelemetry = Boolean(masterOn && state.blockTelemetry);
    const wantCache = Boolean(masterOn && state.forceStaticCache);
    const wantWebfonts = Boolean(masterOn && state.sysFonts);
    const wantDecor = Boolean(masterOn && state.hideDecor);

    (wantTelemetry ? enableRulesetIds : disableRulesetIds).push(RULESET_TELEMETRY);
    (wantCache ? enableRulesetIds : disableRulesetIds).push(RULESET_CACHE);
    (wantWebfonts ? enableRulesetIds : disableRulesetIds).push(RULESET_WEBFONTS);
    (wantDecor ? enableRulesetIds : disableRulesetIds).push(RULESET_DECOR);

    lastDnrFlags = { t: wantTelemetry, c: wantCache, f: wantWebfonts };

    const netVisualSig = `${wantWebfonts}:${wantDecor}`;
    if (isUserChange && lastNetVisualState !== null && lastNetVisualState !== netVisualSig) {
      if (reloadHint) reloadHint.classList.add('visible');
    }
    lastNetVisualState = netVisualSig;

    chrome.declarativeNetRequest.updateEnabledRulesets(
      { enableRulesetIds, disableRulesetIds },
      () => {
        if (dnrStatEl) {
          dnrStatEl.textContent = getPack().dnrLine(wantTelemetry, wantCache, wantWebfonts);
        }
      }
    );
  }

  function updatePresetUi(presetName) {
    const pack = getPack();
    const key = presetName === 'stealth' || presetName === 'bare-metal' ? presetName : 'custom';
    if (presetBadge) {
      presetBadge.textContent = pack.presetLabels[key];
      presetBadge.className = 'preset-pill' + (key === 'stealth' ? ' stealth' : key === 'bare-metal' ? ' bare-metal' : '');
    }
    if (presetDesc) {
      presetDesc.textContent = pack.presetDescs[key];
    }
    if (btnStealth) {
      btnStealth.classList.toggle('active-stealth', key === 'stealth');
    }
    if (btnBareMetal) {
      btnBareMetal.classList.toggle('active-bare', key === 'bare-metal');
    }
  }

  function readStateFromUi() {
    const state = {
      language: currentLang,
      keepTurns: Number(keepTurnsEl.value) || 6
    };
    checkboxes.forEach((id) => {
      const el = document.getElementById(id);
      state[id] = el ? Boolean(el.checked) : Boolean(DEFAULTS[id]);
    });
    state.preset = detectPreset(state);
    return state;
  }

  function syncUiState(state, isUserChange) {
    applyTranslations(state.language);
    checkboxes.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.checked = Boolean(state[id]);
    });
    keepTurnsEl.value = String(state.keepTurns || 6);
    optionsGroup.classList.toggle('disabled-group', !state.enabled);
    foldSubGroup.classList.toggle('disabled-group', !state.foldOldTurns);
    updatePresetUi(detectPreset(state));
    syncDnrRulesets(state, isUserChange);
  }

  function applyPreset(presetName) {
    const tpl = PRESETS[presetName];
    if (!tpl) return;
    const current = readStateFromUi();
    const next = Object.assign({}, current, tpl, {
      enabled: true,
      preset: presetName
    });
    chrome.storage.local.set(next, () => {
      syncUiState(next, true);
      setTimeout(() => queryActiveTab('GUL_GET_STATS'), 150);
    });
  }

  function setLanguage(lang) {
    const normalized = normalizeLanguage(lang);
    if (normalized === currentLang) return;
    applyTranslations(normalized);
    updatePresetUi(detectPreset(readStateFromUi()));
    chrome.storage.local.set({ language: normalized });
  }

  function renderLiveStats(stats) {
    lastStats = stats;
    if (!liveStatEl) return;
    const pack = getPack();
    if (!stats || typeof stats.totalTurns !== 'number') {
      liveStatEl.textContent = pack.openGeminiHint;
      return;
    }
    liveStatEl.textContent = pack.liveStats(stats);
  }

  function queryActiveTab(messageType) {
    if (!chrome.tabs || !chrome.tabs.query) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0];
      if (!tab || typeof tab.id !== 'number') {
        renderLiveStats(null);
        return;
      }
      chrome.tabs.sendMessage(tab.id, { type: messageType }, (resp) => {
        if (chrome.runtime.lastError || !resp) {
          renderLiveStats(null);
          return;
        }
        renderLiveStats(resp);
      });
    });
  }

  chrome.storage.local.get(null, (stored) => {
    const state = migrateStored(stored);
    syncUiState(state, false);
  });

  if (langEnBtn) langEnBtn.addEventListener('click', () => setLanguage('en'));
  if (langUkBtn) langUkBtn.addEventListener('click', () => setLanguage('uk'));
  if (btnStealth) btnStealth.addEventListener('click', () => applyPreset('stealth'));
  if (btnBareMetal) btnBareMetal.addEventListener('click', () => applyPreset('bare-metal'));

  checkboxes.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      const next = readStateFromUi();
      const payload = { preset: next.preset };
      payload[id] = el.checked;
      chrome.storage.local.set(payload, () => {
        optionsGroup.classList.toggle('disabled-group', !next.enabled);
        foldSubGroup.classList.toggle('disabled-group', !next.foldOldTurns);
        updatePresetUi(next.preset);
        syncDnrRulesets(next, true);
        setTimeout(() => queryActiveTab('GUL_GET_STATS'), 150);
      });
    });
  });

  keepTurnsEl.addEventListener('change', () => {
    chrome.storage.local.set({ keepTurns: Number(keepTurnsEl.value) || 6 }, () => {
      setTimeout(() => queryActiveTab('GUL_GET_STATS'), 150);
    });
  });

  if (rescanBtn) {
    rescanBtn.addEventListener('click', () => {
      queryActiveTab('GUL_RESCAN');
    });
  }

  queryActiveTab('GUL_GET_STATS');
})();

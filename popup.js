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

  const PRESET_META = {
    stealth: {
      label: 'Непомітний',
      desc: '100% рідний вигляд Gemini: блокує лише телеметрію, кешує gstatic.com та ізолює позаекранний рендеринг.'
    },
    'bare-metal': {
      label: 'Bare-Metal',
      desc: 'Максимальна швидкість: оголений плоский UI, системні шрифти, без ефектів і зі згортанням старих ходів.'
    },
    custom: {
      label: 'Власний',
      desc: 'Індивідуальна комбінація параметрів. Натисніть кнопку вище, щоб повернутися до готового пресету.'
    }
  };

  const DEFAULTS = Object.assign(
    {
      enabled: true,
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

  let lastNetVisualState = null;

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
    merged.preset = detectPreset(merged);
    return merged;
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

    const netVisualSig = `${wantWebfonts}:${wantDecor}`;
    if (isUserChange && lastNetVisualState !== null && lastNetVisualState !== netVisualSig) {
      if (reloadHint) reloadHint.classList.add('visible');
    }
    lastNetVisualState = netVisualSig;

    chrome.declarativeNetRequest.updateEnabledRulesets(
      { enableRulesetIds, disableRulesetIds },
      () => {
        if (dnrStatEl) {
          const t = wantTelemetry ? 'ON' : 'OFF';
          const c = wantCache ? 'ON' : 'OFF';
          const f = wantWebfonts ? 'БЛОК' : 'РІДНІ';
          dnrStatEl.textContent = `C++ DNR: Телеметрія ${t} · Кеш ${c} · Шрифти ${f}`;
        }
      }
    );
  }

  function updatePresetUi(presetName) {
    const meta = PRESET_META[presetName] || PRESET_META.custom;
    if (presetBadge) {
      presetBadge.textContent = meta.label;
      presetBadge.className = 'preset-pill' + (presetName === 'stealth' ? ' stealth' : presetName === 'bare-metal' ? ' bare-metal' : '');
    }
    if (presetDesc) {
      presetDesc.textContent = meta.desc;
    }
    if (btnStealth) {
      btnStealth.classList.toggle('active-stealth', presetName === 'stealth');
    }
    if (btnBareMetal) {
      btnBareMetal.classList.toggle('active-bare', presetName === 'bare-metal');
    }
  }

  function readStateFromUi() {
    const state = {
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

  function renderLiveStats(stats) {
    if (!liveStatEl) return;
    if (!stats || typeof stats.totalTurns !== 'number') {
      liveStatEl.textContent = 'Відкрийте gemini.google.com для метрик';
      return;
    }
    const modeDetail = stats.foldedTurns > 0
      ? `згорн. ${stats.foldedTurns}`
      : `ізол. ${stats.isolatedTurns || 0}`;
    const guardPart = stats.protectedTurns > 0 ? ` · зах. ${stats.protectedTurns}` : '';
    liveStatEl.textContent =
      `Ходів: ${stats.totalTurns} (${modeDetail}${guardPart}) · DOM: ${stats.domNodes}`;
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

  if (btnStealth) {
    btnStealth.addEventListener('click', () => applyPreset('stealth'));
  }
  if (btnBareMetal) {
    btnBareMetal.addEventListener('click', () => applyPreset('bare-metal'));
  }

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

(() => {
  'use strict';

  const STORAGE_KEY = 'gul_v53_settings';
  const LEGACY_KEYS = ['gul_v52_settings', 'gul_v51_settings', 'gul_v50_settings', 'gul_v46_settings'];
  const RECENT_UNCLIPPED_TURNS = 4;

  const I18N = {
    en: {
      clickToExpand: '(click to expand)',
      toolbarTitle: 'Alt+Shift+E — toggle folding older turns',
      collapseOld: (keep) => `Collapse old (keep ${keep})`,
      foldedCount: (count) => `Folded: ${count} (show all)`
    },
    uk: {
      clickToExpand: '(натисніть, щоб розгорнути)',
      toolbarTitle: 'Alt+Shift+E — перемкнути згортання старих повідомлень',
      collapseOld: (keep) => `Згорнути старі (залишити ${keep})`,
      foldedCount: (count) => `Згорнуто: ${count} (показати всі)`
    }
  };

  // Granular protection selectors (never matches standard Gemini action buttons like Copy/Edit/Like)
  const PROTECTED_MEDIA_SELECTOR = [
    'video',
    'audio',
    'iframe',
    'embed',
    'object',
    'youtube-player',
    '[data-test-id*="video"]',
    '[data-test-id*="audio"]'
  ].join(',');

  const PROTECTED_CANVAS_SELECTOR = [
    'canvas',
    'immersive-entry-chip',
    'artifact-card',
    'deep-research-confirmation',
    'editable-response',
    'code-execution-result',
    '[data-test-id*="canvas"]',
    '[data-test-id*="immersive"]',
    '[data-test-id*="artifact"]',
    '[class*="immersive-entry"]',
    '[class*="canvas-card"]',
    '[class*="artifact-card"]',
    '[role="application"]'
  ].join(',');

  const PROTECTED_INTERACTIVE_SELECTOR = [
    'details[open]',
    'form',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    '[contenteditable="true"]',
    '[role="slider"]',
    '[role="progressbar"]',
    '[role="spinbutton"]',
    'mat-progress-bar',
    'mat-spinner',
    'google-map',
    'map-card',
    'quiz-card',
    'flashcard-deck',
    'charts-card',
    '[data-test-id*="map"]',
    '[data-test-id*="quiz"]',
    '[data-test-id*="flashcard"]',
    '[data-test-id*="chart"]'
  ].join(',');

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

  let settings = loadCachedSettings();
  let domPassTimer = null;
  let observer = null;
  let observedTarget = null;
  let allExpandedManually = false;
  let deferredStarted = false;
  let lastPath = location.pathname;

  // Clean up any leftover v4.4/v4.5 SSD snapshots from localStorage
  try {
    const idxRaw = localStorage.getItem('gul_ssd_snap_index_v1');
    if (idxRaw) {
      const keys = JSON.parse(idxRaw);
      for (let i = 0; i < keys.length; i++) localStorage.removeItem(keys[i]);
      localStorage.removeItem('gul_ssd_snap_index_v1');
    }
  } catch (_) {}

  function getLangPack() {
    return settings.language === 'uk' ? I18N.uk : I18N.en;
  }

  function normalizeLanguage(lang) {
    return lang === 'uk' ? 'uk' : 'en';
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

  function migrateSettings(rawObj) {
    if (!rawObj || typeof rawObj !== 'object') return Object.assign({}, DEFAULTS);
    const merged = Object.assign({}, DEFAULTS, rawObj);
    if (typeof rawObj.blockNetwork === 'boolean') {
      if (typeof rawObj.blockTelemetry !== 'boolean') merged.blockTelemetry = rawObj.blockNetwork;
      if (typeof rawObj.forceStaticCache !== 'boolean') merged.forceStaticCache = rawObj.blockNetwork;
    }
    merged.language = normalizeLanguage(merged.language);
    merged.preset = detectPreset(merged);
    return merged;
  }

  function loadCachedSettings() {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        for (let i = 0; i < LEGACY_KEYS.length; i++) {
          raw = localStorage.getItem(LEGACY_KEYS[i]);
          if (raw) break;
        }
      }
      if (raw) return migrateSettings(JSON.parse(raw));
    } catch (_) {}
    return Object.assign({}, DEFAULTS);
  }

  function cacheSettings(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (_) {}
  }

  function applyRootClasses() {
    const root = document.documentElement;
    if (!root) return;
    const on = Boolean(settings.enabled);
    root.classList.toggle('gul-enabled', on);
    root.classList.toggle('gul-no-fx', Boolean(on && settings.noFx));
    root.classList.toggle('gul-flat', Boolean(on && settings.flatUi));
    root.classList.toggle('gul-compact', Boolean(on && settings.compactInput));
    root.classList.toggle('gul-wide', Boolean(on && settings.wideChat));
    root.classList.toggle('gul-sys-fonts', Boolean(on && settings.sysFonts));
    root.classList.toggle('gul-cv', Boolean(on && settings.contentVisibility));
    root.classList.toggle('gul-hide-decor', Boolean(on && settings.hideDecor));
  }

  // Only toggle root classes at document_start (<0.1ms, zero DOM traversal)
  applyRootClasses();

  // Prefer persistent <main> outlet so observer survives SPA chat switches
  // while excluding sidebar, header, and Angular Material cdk-overlay-container
  function findObserverScope() {
    return (
      document.querySelector('main') ||
      document.querySelector('chat-window') ||
      document.body
    );
  }

  function findChatScope() {
    return (
      document.querySelector('infinite-scroller.chat-history') ||
      document.querySelector('chat-window') ||
      document.querySelector('main') ||
      document.body
    );
  }

  function getTurnContainers() {
    const scope = findChatScope() || document;
    const turns = scope.querySelectorAll('.conversation-container');
    if (turns.length > 0) return Array.from(turns);
    return Array.from(scope.querySelectorAll('conversation-container, [data-test-id="conversation-turn"]'));
  }

  function isActivelyStreaming() {
    const stopBtn = document.querySelector(
      'button.stop-button, button[aria-label*="Stop generating"], button[aria-label*="Stop response"], button[aria-label*="Зупинити"], .send-button.stop'
    );
    return Boolean(stopBtn);
  }

  function optimizeImages(scope) {
    if (!settings.enabled || !scope) return;
    const imgs = scope.querySelectorAll('img:not([data-gul-opt])');
    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i];
      img.setAttribute('data-gul-opt', '1');
      if (!img.hasAttribute('loading')) img.loading = 'lazy';
      if (!img.hasAttribute('decoding')) img.decoding = 'async';
    }
  }

  // Detect turns containing Canvas/Artifacts, Video/Audio/Iframes, Interactive Widgets,
  // pending image loads, or active user focus/selection so they are NEVER folded or CV-clipped
  function getTurnProtectionReason(turnEl, activeEl, selAnchorNode) {
    if (!turnEl) return null;

    if (
      activeEl &&
      activeEl !== document.body &&
      activeEl !== document.documentElement &&
      !activeEl.classList.contains('gul-fold-bar') &&
      turnEl.contains(activeEl)
    ) {
      return 'focus';
    }

    if (selAnchorNode && turnEl.contains(selAnchorNode)) {
      return 'selection';
    }

    if (turnEl.querySelector(PROTECTED_MEDIA_SELECTOR)) {
      return 'media';
    }

    if (turnEl.querySelector(PROTECTED_CANVAS_SELECTOR)) {
      return 'canvas';
    }

    if (turnEl.querySelector(PROTECTED_INTERACTIVE_SELECTOR)) {
      return 'interactive';
    }

    const imgs = turnEl.querySelectorAll('img[src]');
    for (let i = 0; i < imgs.length; i++) {
      if (!imgs[i].complete) {
        return 'loading-media';
      }
    }

    return null;
  }

  function syncProtectedTurnMarkers(turns) {
    let protectedCount = 0;
    const shouldProtect = Boolean(settings.enabled && settings.protectRichTurns);
    const activeEl = shouldProtect ? document.activeElement : null;
    let selAnchorNode = null;
    if (shouldProtect) {
      try {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.anchorNode) {
          selAnchorNode = sel.anchorNode;
        }
      } catch (_) {}
    }

    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      if (!shouldProtect) {
        if (turn.classList.contains('gul-protected-turn')) {
          turn.classList.remove('gul-protected-turn');
          turn.removeAttribute('data-gul-protect');
        }
        continue;
      }

      const reason = getTurnProtectionReason(turn, activeEl, selAnchorNode);
      if (reason) {
        turn.classList.add('gul-protected-turn');
        turn.setAttribute('data-gul-protect', reason);
        protectedCount++;
      } else if (turn.classList.contains('gul-protected-turn')) {
        turn.classList.remove('gul-protected-turn');
        turn.removeAttribute('data-gul-protect');
      }
    }

    return protectedCount;
  }

  // Bounded TreeWalker avoids concatenating massive 100KB turn textContent strings
  function extractBoundedText(el, maxChars) {
    if (!el) return '';
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    let out = '';
    let node;
    while ((node = walker.nextNode())) {
      const chunk = node.nodeValue;
      if (!chunk) continue;
      out += chunk;
      if (out.length >= maxChars) break;
    }
    return out.replace(/\s+/g, ' ').trim();
  }

  function extractPreviewText(turnEl, index) {
    const queryEl = turnEl.querySelector('user-query .query-text, user-query, .query-text');
    const clean = extractBoundedText(queryEl || turnEl, 110);
    const snippet = clean.length > 76 ? clean.slice(0, 76) + '…' : clean;
    const suffix = getLangPack().clickToExpand;
    return `[+] #${index + 1}${snippet ? ': ' + snippet : ''} ${suffix}`;
  }

  function refreshFoldBarLabels() {
    const turns = getTurnContainers();
    for (let i = 0; i < turns.length; i++) {
      const bar = turns[i].querySelector(':scope > .gul-fold-bar');
      if (bar) {
        bar.textContent = extractPreviewText(turns[i], i);
      }
    }
  }

  function unfoldTurn(turnEl, markManual) {
    if (!turnEl) return;
    turnEl.classList.remove('gul-folded-turn');
    if (markManual) {
      turnEl.setAttribute('data-gul-manual-open', '1');
    }
    const bar = turnEl.querySelector(':scope > .gul-fold-bar');
    if (bar) bar.remove();
  }

  function clearAllFolding(removeManualFlags) {
    const folded = document.querySelectorAll('.gul-folded-turn');
    for (let i = 0; i < folded.length; i++) {
      unfoldTurn(folded[i], false);
    }
    if (removeManualFlags) {
      const manual = document.querySelectorAll('[data-gul-manual-open]');
      for (let i = 0; i < manual.length; i++) manual[i].removeAttribute('data-gul-manual-open');
    }
    const toolbar = document.getElementById('gul-fold-toolbar');
    if (toolbar) toolbar.remove();
  }

  function expandAllFoldedTurns() {
    allExpandedManually = true;
    const folded = document.querySelectorAll('.gul-folded-turn');
    for (let i = 0; i < folded.length; i++) {
      unfoldTurn(folded[i], true);
    }
    updateToolbar(0, getTurnContainers().length);
  }

  function collapseOldTurns() {
    allExpandedManually = false;
    const manual = document.querySelectorAll('[data-gul-manual-open]');
    for (let i = 0; i < manual.length; i++) manual[i].removeAttribute('data-gul-manual-open');
    runDomPass();
  }

  function updateToolbar(foldedCount, totalTurns) {
    let toolbar = document.getElementById('gul-fold-toolbar');
    const keep = Math.max(1, Number(settings.keepTurns) || 6);
    const shouldShow =
      settings.enabled &&
      settings.foldOldTurns &&
      totalTurns > keep &&
      (foldedCount > 0 || allExpandedManually);

    if (!shouldShow) {
      if (toolbar) toolbar.remove();
      return;
    }

    const t = getLangPack();

    if (!toolbar) {
      toolbar = document.createElement('button');
      toolbar.id = 'gul-fold-toolbar';
      toolbar.type = 'button';
      document.body.appendChild(toolbar);
    }

    toolbar.title = t.toolbarTitle;
    toolbar.textContent = allExpandedManually
      ? t.collapseOld(keep)
      : t.foldedCount(foldedCount);
  }

  function syncRecentTurnMarkers(turns) {
    const recentStart = Math.max(0, turns.length - RECENT_UNCLIPPED_TURNS);
    for (let i = 0; i < turns.length; i++) {
      turns[i].classList.toggle('gul-recent-turn', i >= recentStart);
    }
  }

  function ensureScopedObserver() {
    if (!document.body) return;
    const desired = findObserverScope();
    if (observer && observedTarget === desired && observedTarget && observedTarget.isConnected) {
      return;
    }
    if (observer) {
      observer.disconnect();
    }
    observedTarget = desired || document.body;
    observer = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes.length > 0 || mutations[i].removedNodes.length > 0) {
          scheduleDomPass();
          return;
        }
      }
    });
    observer.observe(observedTarget, { childList: true, subtree: true });
  }

  function runDomPass() {
    if (!document.body) return;

    // Detect SPA chat switch and reset manual-expand state
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      allExpandedManually = false;
    }

    ensureScopedObserver();
    optimizeImages(findChatScope());

    const turns = getTurnContainers();

    // Always maintain protected markers (protects both folding AND content-visibility: auto)
    syncProtectedTurnMarkers(turns);

    // Maintain viewport-safe recent turn markers when CV is enabled
    if (settings.enabled && settings.contentVisibility) {
      syncRecentTurnMarkers(turns);
    }

    if (!settings.enabled || !settings.foldOldTurns) {
      clearAllFolding(true);
      return;
    }

    if (allExpandedManually) {
      updateToolbar(0, turns.length);
      return;
    }

    const keep = Math.max(1, Number(settings.keepTurns) || 6);
    const foldUntil = turns.length - keep;
    let foldedCount = 0;

    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      const isProtected = settings.protectRichTurns && turn.classList.contains('gul-protected-turn');

      if (i < foldUntil && !isProtected) {
        if (turn.getAttribute('data-gul-manual-open') === '1') continue;
        if (!turn.classList.contains('gul-folded-turn')) {
          turn.classList.add('gul-folded-turn');
          let bar = turn.querySelector(':scope > .gul-fold-bar');
          if (!bar) {
            bar = document.createElement('div');
            bar.className = 'gul-fold-bar';
            bar.setAttribute('role', 'button');
            bar.setAttribute('tabindex', '0');
            bar.textContent = extractPreviewText(turn, i);
            turn.prepend(bar);
          }
        }
        foldedCount++;
      } else if (turn.classList.contains('gul-folded-turn')) {
        unfoldTurn(turn, false);
      }
    }

    updateToolbar(foldedCount, turns.length);
  }

  function scheduleDomPass() {
    if (domPassTimer !== null) return;
    const delay = isActivelyStreaming() ? 1500 : 650;
    domPassTimer = setTimeout(() => {
      domPassTimer = null;
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(runDomPass, { timeout: 1200 });
      } else {
        runDomPass();
      }
    }, delay);
  }

  // Zero-leak event delegation: NO per-turn listeners or DOM-array closures
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    if (target.id === 'gul-fold-toolbar') {
      if (allExpandedManually) {
        collapseOldTurns();
      } else {
        expandAllFoldedTurns();
      }
      return;
    }

    const bar = target.closest('.gul-fold-bar');
    if (bar && bar.parentElement && bar.parentElement.classList.contains('gul-folded-turn')) {
      e.stopPropagation();
      unfoldTurn(bar.parentElement, true);
      updateToolbar(document.querySelectorAll('.gul-folded-turn').length, getTurnContainers().length);
    }
  });

  // Refresh protection markers when user focuses inside a turn or toggles <details>
  document.addEventListener('focusin', (e) => {
    if (!settings.enabled || !settings.protectRichTurns) return;
    const target = e.target;
    if (target instanceof Element && target.closest('.conversation-container')) {
      scheduleDomPass();
    }
  }, { passive: true });

  document.addEventListener('toggle', (e) => {
    if (!settings.enabled || !settings.protectRichTurns) return;
    const target = e.target;
    if (target instanceof Element && target.tagName === 'DETAILS' && target.closest('.conversation-container')) {
      scheduleDomPass();
    }
  }, true);

  // Keyboard support: Ctrl+F smart unfold + Alt+Shift+E toggle + Enter/Space on fold bar
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target instanceof Element && e.target.classList.contains('gul-fold-bar')) {
      const parent = e.target.parentElement;
      if (parent && parent.classList.contains('gul-folded-turn')) {
        e.preventDefault();
        unfoldTurn(parent, true);
        updateToolbar(document.querySelectorAll('.gul-folded-turn').length, getTurnContainers().length);
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.code === 'KeyF') {
      if (settings.enabled && settings.foldOldTurns && settings.unfoldOnFind && !allExpandedManually) {
        if (document.querySelector('.gul-folded-turn')) {
          expandAllFoldedTurns();
        }
      }
      return;
    }

    if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyE') {
      if (settings.enabled && settings.foldOldTurns) {
        e.preventDefault();
        if (allExpandedManually) {
          collapseOldTurns();
        } else {
          expandAllFoldedTurns();
        }
      }
    }
  });

  // Native Chromium Navigation API (zero-polling SPA route change detection)
  if (typeof window.navigation !== 'undefined' && typeof window.navigation.addEventListener === 'function') {
    window.navigation.addEventListener('navigatesuccess', () => {
      allExpandedManually = false;
      scheduleDomPass();
    });
  } else {
    window.addEventListener('popstate', () => {
      allExpandedManually = false;
      scheduleDomPass();
    });
  }

  function collectStats() {
    const turns = getTurnContainers();
    const folded = document.querySelectorAll('.gul-folded-turn').length;
    const protectedTurns = document.querySelectorAll('.gul-protected-turn').length;
    let isolated = 0;
    if (settings.enabled && settings.contentVisibility) {
      const recentStart = Math.max(0, turns.length - RECENT_UNCLIPPED_TURNS);
      for (let i = 0; i < recentStart; i++) {
        if (!turns[i].classList.contains('gul-protected-turn')) {
          isolated++;
        }
      }
    }
    const domNodes = document.getElementsByTagName('*').length;
    const katexNodes = document.querySelectorAll('.katex').length;
    const scopeName = observedTarget ? observedTarget.tagName.toLowerCase() : 'none';
    return {
      preset: settings.preset,
      totalTurns: turns.length,
      foldedTurns: folded,
      protectedTurns,
      isolatedTurns: isolated,
      domNodes,
      katexNodes,
      scopeName
    };
  }

  function deferredBoot() {
    if (deferredStarted) return;
    deferredStarted = true;
    const kick = () => {
      runDomPass();
      ensureScopedObserver();
    };
    setTimeout(() => {
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(kick, { timeout: 2000 });
      } else {
        kick();
      }
    }, 1000);
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(null, (stored) => {
      settings = migrateSettings(stored);
      cacheSettings(settings);
      applyRootClasses();
      if (deferredStarted) {
        runDomPass();
        refreshFoldBarLabels();
      }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      const langChanged = Boolean(changes.language);
      let nonLangChanged = false;
      for (const key of Object.keys(changes)) {
        if (key in DEFAULTS) {
          settings[key] = changes[key].newValue;
          if (key !== 'language') nonLangChanged = true;
        }
      }
      settings.language = normalizeLanguage(settings.language);
      settings.preset = detectPreset(settings);
      cacheSettings(settings);
      if (nonLangChanged) {
        allExpandedManually = false;
      }
      applyRootClasses();
      if (deferredStarted) {
        runDomPass();
        if (langChanged) refreshFoldBarLabels();
      }
    });
  }

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'GUL_GET_STATS') {
        sendResponse(collectStats());
        return true;
      }
      if (msg.type === 'GUL_RESCAN') {
        allExpandedManually = false;
        const manual = document.querySelectorAll('[data-gul-manual-open]');
        for (let i = 0; i < manual.length; i++) manual[i].removeAttribute('data-gul-manual-open');
        runDomPass();
        sendResponse(collectStats());
        return true;
      }
      if (msg.type === 'GUL_TOGGLE_ALL') {
        if (allExpandedManually) {
          collapseOldTurns();
        } else {
          expandAllFoldedTurns();
        }
        sendResponse(collectStats());
        return true;
      }
    });
  }

  if (document.readyState === 'complete') {
    deferredBoot();
  } else {
    window.addEventListener('load', deferredBoot, { once: true });
  }
})();

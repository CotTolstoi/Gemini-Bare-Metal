# Gemini Bare-Metal Lite (Chromium x64) — v5.3.0

**Ultra-lightweight Manifest V3 performance optimizer for `gemini.google.com`** designed for desktop Chromium browsers (**Google Chrome, Thorium x64, Brave, Microsoft Edge, Vivaldi, Opera, Ungoogled Chromium**).

* **Zero background Service Workers:** 0 MB background RAM outside active Gemini tabs.
* **Zero frameworks:** pure vanilla JS, modular CSS, and Chromium's native C++ `declarativeNetRequest` engine (~22 KB compressed).
* **100% native Gemini functionality preserved:** Canvas, Deep Research, Gems, Temporary Chat, `@Gmail/@Drive/@YouTube`, voice, file uploads, KaTeX math formulas, and Material icons remain intact.
* **English by default** (`default_locale: "en"`) with an instant **`EN` / `UK`** switcher built directly into the popup.

---

## Why `gemini.google.com` Slows Down (and What This Extension Solves)

Performance slowdowns in long Gemini chats stem from two separate layers:

1. **Client-side browser bottlenecks (solved by this extension):**
   * Angular keeps every loaded `.conversation-container` attached in the DOM as you scroll or converse.
   * Mathematical expressions rendered with KaTeX generate triple DOM representations (visual, accessibility, and TeX source), multiplying style recalculation and layout cost.
   * Typing in the prompt box triggers frequent `Recalculate Style` and `Layout` passes across the entire DOM tree, degrading **Interaction to Next Paint (INP)**.
   * Continuous background telemetry (`play.google.com/log`, `ogads-pa`, `/client_204`), heavy CSS shadows, `backdrop-filter`, ripples, and Lottie animations add unnecessary CPU/GPU and network overhead.
2. **Server-side bottlenecks (outside any browser extension's control):**
   * Re-sending growing conversation token histories, backend load, or quota limits cannot be sped up locally. For very long tasks, starting a fresh chat with a concise summary or moving iterative code edits into **Canvas** remains best practice.

---

## Two Built-In Presets: Stealth vs. Bare-Metal

Switch modes in one click from the popup. Toggling any individual option automatically marks the profile as **Custom**.

| Optimization Feature | Stealth Mode (`stealth`) | Bare-Metal Mode (`bare-metal`) |
| :--- | :---: | :---: |
| Pure telemetry blocking via C++ DNR (`BotGuard/WAA` safe) | Enabled | Enabled |
| 7-day forced SSD cache for `gstatic.com` static assets | Enabled | Enabled |
| Off-screen `content-visibility: auto` (last 4 turns protected) | Enabled | Enabled |
| Rich-turn protection (Canvas, video, audio, iframes, interactive widgets) | Enabled | Enabled |
| Lazy loading & async decoding (`loading="lazy"`, `decoding="async"`) | Enabled | Enabled |
| Angular-safe FX kill (`0.001ms` transitions, no blur/shadows/ripples) | Disabled (native look) | Enabled |
| Clean flat UI (`6px` radius, subtle `1px` borders) | Disabled (native look) | Enabled |
| Compact bottom input bar (preserves centering, hides footer disclaimer) | Disabled (native look) | Enabled |
| System fonts + web-font blocking (`Google Sans`, `Product Sans`, `Roboto`) | Disabled (native fonts) | Enabled |
| Hide decorative avatars, zero-state art & block Lottie scripts | Disabled (native visuals) | Enabled |
| Smart folding of old turns into compact bars (`content-visibility: hidden`) | Disabled | Enabled |
| Wide chat layout (`max-width: min(1240px, 94vw)`) | Optional toggle | Optional toggle |

---

## Architecture & Optimization Layers

### 1. Granular C++ Network Rules (4 Independent DNR Rulesets)

All network filtering runs natively in Chromium's C++ network stack without proxying traffic through JavaScript:

* **`rules/telemetry.json`** — blocks pure telemetry and analytics (`play.google.com/log`, `ogads-pa.clients6.google.com`, `/client_204`, `/gen_204`, `/_/BardChatUi/browserinfo`, `google-analytics.com`, `googletagmanager.com`, `feedback.googleusercontent.com`). Zero visual impact.
* **`rules/static-cache.json`** — enforces `Cache-Control: public, max-age=604800, immutable` on `gstatic.com` static scripts, stylesheets, fonts, and images to speed up repeat loads from disk/SSD. Toggleable independently.
* **`rules/webfonts.json`** — blocks heavy text web fonts (`googlesans`, `productsans`, `roboto`) while keeping Google Material icon fonts and KaTeX math fonts untouched. Active **only** when **System fonts** is enabled (automatically disabled in Stealth Mode).
* **`rules/decor.json`** — blocks `gstatic.com/*lottie` animation assets. Active **only** when **Hide decorative avatars, illustrations & Lottie** is enabled.

#### BotGuard / WAA & Core RPC Safety

The following critical endpoints are **explicitly never blocked**:
* `waa-pa.clients6.google.com` & `jnn-pa.googleapis.com` (Google BotGuard / Web Anti-Abuse attestation — blocking these causes *"Gemini — something went wrong"* errors).
* `gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate` & `batchexecute` (streaming responses and chat RPCs).
* `accounts.google.com/RotateCookies` (session cookie rotation).

### 2. Viewport-Safe Rendering Isolation & Angular-Safe CSS

* **Single-class `:root.gul-*` selectors:** minimizes selector matching overhead during Chromium's `Recalculate Style` pass.
* **Angular-safe FX removal:** uses `animation-duration: 0.001ms` and `transition-duration: 0.001ms` instead of `animation: none`, allowing Angular Material's `animationend` / `transitionend` listeners to fire normally so menus and dialogs never get stuck in the DOM.
* **Safe `content-visibility: auto`:** paired with `contain-intrinsic-size: auto none auto 480px` so Chromium remembers rendered heights after the first pass (preventing scrollbar jumping). The last 4 turns and all protected rich turns are automatically excluded to prevent menu clipping or streaming jitter.
* **Centered compact input:** adjusts only vertical margins/padding on `.input-area-container` so Gemini's horizontal auto-centering in New Chat stays aligned.

### 3. Zero-Leak Smart History Folding & Rich Turn Protection

* **True layout skipping without Angular detaching:** folded turns remain 100% attached in the DOM (preventing Angular `Detached DOM` memory leaks), while their children receive `content-visibility: hidden` so Blink skips KaTeX, code-block, and table layout/paint completely.
* **Automatic rich-turn guard (`protectRichTurns`):** turns containing any of the following are never folded and never clipped by `content-visibility: auto`:
  * **Canvas & Artifacts:** `<canvas>`, `immersive-entry-chip`, `artifact-card`, `deep-research-confirmation`, `editable-response`, `code-execution-result`, `[role="application"]`.
  * **Media & Embeds:** `<video>`, `<audio>`, `<iframe>`, `<embed>`, `<object>`, `youtube-player`.
  * **Interactive Widgets & Editors:** open `<details open>`, forms, `<input>`, `<select>`, `<textarea>`, `[contenteditable="true"]` (active prompt editing), sliders, progress bars, maps, charts, quizzes, and flashcards.
  * **In-flight Media & User Activity:** images still loading (`!img.complete`), active keyboard focus (`document.activeElement`), or highlighted text selection inside a turn.
* **Low-overhead DOM script (`content.js`):**
  * Scopes `MutationObserver` to `<main>` instead of `document.body`, ignoring sidebar/overlay churn.
  * Throttles DOM passes while Gemini is actively streaming a response.
  * Uses single-listener event delegation on `document` (zero per-turn listeners or DOM-array closures).
  * Extracts fold-bar previews via a bounded 110-character `TreeWalker` instead of reading massive `textContent` strings.
  * Tracks SPA chat switches via Chromium's native `Navigation API`.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl+F` / `Cmd+F` | Automatically expands folded turns so native Find-in-Page searches the entire chat (toggleable) |
| `Alt+Shift+E` | Toggle between expanding all folded turns and collapsing old turns |
| `Enter` / `Space` | Expand an individual folded turn when its fold bar has keyboard focus |

---

## Installation & Upgrading

### Fresh Installation

1. Download and extract `gemini-bare-metal-chromium-x64-v5.3.0.zip` into a permanent folder (for example, `C:\Extensions\gemini-bare-metal-chromium` or `~/extensions/gemini-bare-metal-chromium`).
2. Open your browser's Extensions page:
   * Chrome / Thorium / Ungoogled Chromium: `chrome://extensions`
   * Microsoft Edge: `edge://extensions`
   * Brave: `brave://extensions`
   * Vivaldi: `vivaldi://extensions`
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the `gemini-bare-metal-chromium` folder (the folder containing `manifest.json`).
5. Open `https://gemini.google.com`, click the extension icon, and choose **Stealth** or **Bare-Metal**.

### Upgrading from v4.7.x / v5.0.x / v5.1.x / v5.2.x

1. Replace the files in your existing extension folder with the contents of `gemini-bare-metal-chromium-x64-v5.3.0.zip` (settings migrate automatically; language defaults to English and can be switched to Ukrainian via the `EN | UK` button in the popup header).
2. Click the **Reload** icon on the extension card in `chrome://extensions`.
3. Reload open `gemini.google.com` tabs (`F5`).

---

## Recommended Chromium Companion Settings

* **Dedicated PWA Window:** in Chrome, go to `Menu → Cast, save, and share → Install page as app…` to isolate Gemini in its own lightweight window (extensions still run automatically inside Chrome PWAs).
* **Memory Saver Exception:** in `chrome://settings/performance`, enable Memory Saver for other tabs, but add `gemini.google.com` under **"Always keep these sites active"** so drafts are never discarded.
* **Verify GPU Acceleration:** confirm Hardware/Graphics Acceleration is enabled in `chrome://settings/system` and `GPU rasterization` is active in `chrome://gpu`.

---

## Measuring Impact in Chrome DevTools

Run an A/B check on the same long chat (after generation has completed) with the extension disabled vs. enabled:

1. **Task Manager (`Shift+Esc`):** right-click the table header, enable **JavaScript memory**, and compare memory usage after scrolling through a long thread.
2. **Performance Panel (`F12 → Performance`):** enable **Memory** and **Enable CSS selector stats**, then record 10 seconds of typing in the prompt box and scrolling up/down. Compare `Recalculate Style`, `Layout`, and **INP** (target ≤ 200 ms).
3. **Detached Elements Audit (`F12 → Memory → Detached elements`):** switch across 3–4 long chats and verify that detached DOM nodes do not accumulate.
4. **Network Cleanliness (`F12 → Network`):** verify that `StreamGenerate`, `batchexecute`, `waa-pa.clients6.google.com`, and `jnn-pa.googleapis.com` succeed with `200`, while telemetry endpoints are blocked cleanly.

---

## Privacy & Security

* **100% local execution:** no analytics, no external servers, no telemetry, and no prompt inspection.
* **Isolated execution context:** `content.js` runs in Chromium's standard `ISOLATED` world and never uses `innerHTML` / `outerHTML` (Trusted Types safe).
* **Minimal permissions:** `storage` (local preferences), `declarativeNetRequest` (C++ network rules), and host permissions scoped strictly to `gemini.google.com` and Google's static asset hosts (`www/fonts/ssl.gstatic.com` required for `modifyHeaders` cache rules).

---

## Project Structure

```text
gemini-bare-metal-chromium/
├── manifest.json              # MV3 manifest (default_locale: "en", 0 service workers)
├── content.js                 # Scoped observer, rich-turn guard, smart folding, live stats
├── popup.html                 # Control panel with presets, EN/UK switcher & live metrics
├── popup.js                   # Preset sync, 4-ruleset DNR manager & i18n controller
├── styles/
│   └── bare-metal.css         # Modular :root.gul-* styles & content-visibility rules
├── rules/
│   ├── telemetry.json         # Pure telemetry & analytics blocker (BotGuard-safe)
│   ├── static-cache.json      # 7-day Cache-Control enforcement for gstatic.com
│   ├── webfonts.json          # Text web-font blocker (linked to System fonts toggle)
│   └── decor.json             # Lottie blocker (linked to Hide decor toggle)
├── _locales/
│   ├── en/messages.json       # Default English extension metadata
│   └── uk/messages.json       # Ukrainian extension metadata
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## Changelog

* **v5.3.0:** Full English localization made the default (`default_locale: "en"`, `_locales/en` + `_locales/uk`), added instant `EN | UK` switcher in the popup with live fold-bar/toolbar translation, and expanded English README documentation.
* **v5.2.1:** Fixed horizontal left-shift of the New Chat input box by restricting `.input-area-container` compact overrides to vertical margins and padding only.
* **v5.2.0:** Added automatic rich-turn protection (`protectRichTurns`) shielding Canvas, video, audio, iframes, interactive widgets, loading images, and active focus/selection from both folding and `content-visibility: auto`.
* **v5.1.0:** Introduced **Stealth Mode** and **Bare-Metal** one-click presets and split C++ DNR rules into 4 independent rulesets (`telemetry`, `static-cache`, `webfonts`, `decor`).
* **v5.0.0:** Removed `waa-pa.clients6.google.com` from the blocklist to prevent BotGuard errors, switched folded turns from `visibility: hidden` to `content-visibility: hidden`, protected the last 4 turns from `content-visibility: auto`, made FX stripping Angular-safe (`0.001ms`), replaced per-turn closures with event delegation, scoped `MutationObserver` to `<main>`, added Navigation API route tracking, `Ctrl+F` auto-unfold, Wide Chat mode, and live popup tab metrics.
* **v4.7.2:** Initial Bare-Metal Lite baseline with C++ DNR blocking, SSD static caching, and basic history folding.

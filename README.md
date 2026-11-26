# Gemini Bare-Metal Lite v5.2.1 для x64 Chromium-браузерів

Ультралегке розширення (Manifest V3, **0 фонових Service Worker процесів**, чистий JS + CSS + C++ `declarativeNetRequest`) для оптимізації швидкодії, пам'яті та чуйності інтерфейсу `gemini.google.com` у **Google Chrome, Thorium x64, Brave, Microsoft Edge, Vivaldi, Opera, Ungoogled Chromium**.

## Виправлення у v5.2.1

- **Виправлено зсув поля вводу вліво у новому чаті**: у правилі `:root.gul-compact .input-area-container` прибрано скорочення `margin: 0 !important` і `padding: 0 !important`, яке перезаписувало нативне горизонтальне центрування (`margin-inline: auto`). Тепер змінюються лише вертикальні відступи (`margin-top/bottom`, `padding-top/bottom`), і поле вводу залишається точно по центру під заголовком.

## Що нового у v5.2.0

- **Розумний захист ходів із багатим та інтерактивним контентом (`protectRichTurns`)**: старі ходи автоматично виключаються як зі згортання (`foldOldTurns`), так і з позаекранної ізоляції (`content-visibility: auto`), якщо всередині виявлено:
  - **Canvas і артефакти Gemini**: `<canvas>`, `immersive-entry-chip`, `artifact-card`, `deep-research-confirmation`, `editable-response`, `code-execution-result`, `[role="application"]`;
  - **Відео, аудіо та вбудовані плеєри**: `<video>`, `<audio>`, `<iframe>`, `<embed>`, `<object>`, `youtube-player`;
  - **Інтерактивні віджети та форми**: відкриті `<details open>`, форми (`<form>`, `<input>`, `<select>`, `<textarea>`, `[contenteditable="true"]` — зокрема режим редагування промпту), слайдери, прогрес-бари, карти, графіки, тести та картки (`quiz-card`, `flashcard-deck`, `charts-card`, `google-map`);
  - **Недозавантажені медіа**: зображення `img[src]`, які ще завантажуються або генеруються (`!img.complete`);
  - **Активна взаємодія користувача**: поточний фокус (`document.activeElement`) або виділений текст усередині ходу.
- **Нуль хибних спрацьовувань**: стандартні службові кнопки Gemini (Copy, Edit, Like, Share) не блокують згортання звичайних текстових і кодових повідомлень.
- **Прозорість у popup**: окремий перемикач **«Захищати ходи з Canvas, відео, аудіо та інтерактивними елементами»** (активний за замовчуванням у «Непомітному» та «Bare-Metal» режимах) і лічильник захищених ходів (`зах. N`) у рядку живих метрик.

## Встановлення та оновлення

1. Розпакуйте архів `gemini-bare-metal-chromium-x64-v5.2.1.zip` із заміною файлів у вашу папку розширення (налаштування з попередніх версій мігрують автоматично).
2. Відкрийте `chrome://extensions` (в Edge — `edge://extensions`, у Brave — `brave://extensions`).
3. Увімкніть **Режим розробника** (Developer mode) і натисніть **Оновити** на картці розширення (або **Завантажити розпаковане розширення** для чистого встановлення).
4. Оновіть вкладку `https://gemini.google.com`.

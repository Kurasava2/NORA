# Технический аудит — ГСМ Ведомости v1.4.2

## 1. Состояние до аудита

Проект уже был рабочей React/Electron desktop-утилитой с подходящей для Windows 7 веткой Electron 22 и x86 packaging, но защита данных и regression-покрытие не соответствовали критичности бухгалтерских/учётных данных. Наиболее опасные проблемы находились не в визуальной части, а на границах autosave, recovery, closing и повторного запуска.

## 2. P0/P1

Устранены сценарии тихого сброса повреждённой базы, потери последних изменений при закрытии, небезопасной замены основного JSON и параллельной работы двух экземпляров с одним файлом. Асинхронные сохранения сериализованы; restore сначала подтверждает запись на диск.

Расчётный дефект `tolerance=0` исправлен. Старые путёвки нормализуются хронологически. Пустые обязательные значения больше не маскируются под реальные нули. Импорт XLSX не смешивает разные периоды и не принимает несколько распознанных листов одной машины.

## 3. Функциональные исправления

- единая трактовка чисел, запятой/точки и tolerance;
- перенос остатков учитывает пользовательский tolerance;
- carried values обновляются только пока остаются автоматическими;
- неиспользованная путёвка не требует фиктивного ГСМ и моточасов;
- только неиспользованные путёвки не превращают машину в «ездившую»;
- нулевые ГСМ не печатаются как искусственные строки;
- пустые моточасы не экспортируются как ложный `0`;
- import XLSX получил проверки периода, duplicate vehicle, CRC, encryption и memory limits.

## 4. UI/UX

Сохранён существующий дизайн. Исправлены keyboard focus/focus trap, dirty-close путёвки, inline validation в простых формах, минимальный logical размер окна для DPI и слишком мелкие служебные шрифты. Таблицы используют локальный horizontal overflow, main content — собственный scroll; модалки ограничены viewport и имеют scrollable body.

Физическая визуальная проверка всех заявленных viewport остаётся обязательной на собранном приложении.

Добавлен верхнеуровневый React Error Boundary. Если renderer падает во время render, вместо белого окна показывается recovery-screen; техническая причина уходит в `gsm-errors.log`, а перед перезапуском или закрытием выполняется синхронная попытка сохранить только уже загруженное валидное состояние. Ошибка сохранения блокирует перезапуск/закрытие, чтобы аварийный UI не превратился в тихую потерю данных.

## 5. Производительность

Проект уже использует low-end mode, progressive rows, lazy Excel engine, deferred search и кеширование тяжёлых сводок. Дополнительно ограничена память XLSX и исключены параллельные тяжёлые операции. Сохранение не держит несколько постоянных полных копий базы; `.bak` ротируется через файловые операции.

Не добавлялись тяжёлые зависимости и не применялась массовая memoization без измеримой причины.

## 6. Windows 7 x86

Зафиксированы Electron 22.3.27, Chromium 108 target и `portable --ia32`. Новые API/зависимости ради аудита не добавлялись. Используемый `DecompressionStream('deflate-raw')` доступен в Chromium поколения 108. Минимальный logical размер окна — 800×560, чтобы физический 1024×768 экран оставался пригодным при DPI scaling.

Остаточный риск: Electron 22 EOL. Он принят ради обязательной Windows 7 совместимости; renderer изолирован и sandboxed, external navigation/popups/webview запрещены.

## 7. Архитектура

Массового переписывания не было. Критическая логика вынесена в небольшие чистые модули (`numbers`, `calculations`, `carry`, `trips`, `tripValidation`). `App.jsx` остаётся крупным (~750 строк), но дальнейшее дробление сейчас не оправдывает regression-риск: обязанности экранов уже локализованы функциями, а критическая бизнес-логика вынесена из JSX.

## 8. Cleanup

Из `xlsxCore` удалён неиспользуемый старый builder/downloader; оставлены CRC32 + ZIP writer, которые реально нужны template engine. Убраны системные `alert()` из обычной validation UX. README и build scripts приведены к реальной версии 1.4.1.

## 9. Тесты

`npm test` — **37/37 PASS** в текущем исходнике.

Покрыты: backup/checksum/legacy validation, smart balance, tolerance=0, carry, number parsing, atomic save/recovery/rollback, trip validation, unused trip, sorting, CRC/ZIP и XLSX import-period consistency.

Дополнительно Electron CJS/чистые JS файлы проходят syntax check, а `App.jsx` проходит TypeScript parser syntax pass без resolution/type dependencies.

## 10. Оставшиеся риски / release gates

1. В текущей песочнице npm registry недоступен (`EAI_AGAIN`), поэтому production Vite build и electron-builder package здесь не завершены.
2. Нужен запуск `VERIFY_RELEASE.bat` на машине с рабочей сетью/npm cache.
3. Нужен ручной smoke/UI pass именно собранного ia32 EXE: 1024×768, 1152×864, 1280×720, 1280×800, 1366×768, 1600×900, 1920×1080, resize, maximized/minimized, DPI 100/125%.
4. Нужен финальный запуск на настоящей Windows 7 x86 VM/машине: старт, save/load, Excel template, import/export, print dialog, backup/restore, close/reopen.
5. Желательно измерить working set процесса на реальном 32-bit Electron при большой месячной книге.

## 11. Основные изменённые файлы

- `electron/main.cjs` — runtime safety, IPC, single-instance, logging, file limits, print cleanup;
- `electron/storage.cjs` — atomic persistence/recovery/rollback;
- `electron/backup.cjs` — universal backup v1 + integrity/legacy validation;
- `electron/preload.cjs` — ограниченный IPC bridge;
- `src/App.jsx` — save queue, recovery UX, modal/keyboard/data-entry fixes;
- `src/lib/domain.js` — migration/carry/status/history semantics;
- `src/lib/numbers.js`, `calculations.js`, `carry.js`, `trips.js`, `tripValidation.js` — чистая критическая логика;
- `src/lib/templateEngine.js`, `xlsxCore.js` — hardened XLSX;
- `src/lib/document.js` — корректное представление пустых/нулевых данных;
- `src/index.css` — viewport, focus, low-end и readability fixes;
- `tests/*` — regression suite;
- `VERIFY_RELEASE.bat` — обязательный release gate.

## 12. Предварительная оценка

До физического Win7 runtime-pass оценки нельзя считать финальным сертификатом релиза.

| Направление | Оценка |
|---|---:|
| Стабильность | 9/10 |
| UI | 8.5/10 |
| UX | 8.5/10 |
| Производительность | 8.5/10 |
| Поддерживаемость | 8.5/10 |
| Надёжность расчётов | 9/10 |
| Совместимость с Windows 7 x86 | 9/10 статически, runtime verification pending |


## Дополнение v1.4.2 — пользовательские машины и моточасы

- добавлено создание пользовательских машин в разделе «Автомобили»;
- у нормы расхода выбирается `л/100 км` или `л/моточас`;
- `л/моточас` автоматически включает счётчик моточасов;
- моточасы в путёвке теперь вводятся как показания до/после, а «отработано» вычисляется разницей;
- конечное показание моточасов переносится в следующую путёвку/период;
- legacy-путёвки с одним значением `motohours` остаются валидными и экспортируются без потери данных;
- пользовательские машины включены в общие периоды, историю, XLSX import/export и universal backup;
- схема данных повышена с 6 до 7, формат `.gsmbackup` остаётся version 1.

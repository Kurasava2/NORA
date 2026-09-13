# ГСМ Ведомости Desktop v1.4.0

Desktop-приложение для расчётных ведомостей ГСМ. React 18 + Vite + Tailwind CSS + Electron 22, целевая система — Windows 7 x86 (32-bit).

## v1.4.0 — полный UI redesign

Интерфейс полностью обновлён по дизайн-языку пользовательского проекта `ep-modpack-updater`:

- собственная frameless title bar с управлением окном;
- тёмная `gray-950 / gray-900` система поверхностей;
- фиолетовый основной акцент;
- карточки, таблицы, фильтры, модалки и состояния приведены к одной дизайн-системе;
- hover/focus/disabled/error/success состояния унифицированы;
- навигация по годам и месяцам переработана визуально;
- строки путёвок и действия стали компактнее и яснее;
- печатный A4-предпросмотр намеренно остаётся белым и использует Times New Roman;
- JetBrains Mono поставляется локально внутри приложения, системная установка шрифта не нужна.

## Сборка

```bat
npm install
npm run dist:win7:x86
```

Результат: `release/GSM-Vedomosti-1.4.0-portable-Win7-ia32.exe`.

Electron зафиксирован на `22.3.27`, поскольку это последняя ветка Electron с поддержкой Windows 7/8/8.1.


## Performance profile v1.4.0

- Low-end PC mode enabled by default: blur/backdrop-filter, large shadows and transition-heavy effects are disabled.
- Fleet/month tables mount progressively during browser idle time instead of blocking one frame with all rows.
- Expensive fleet summaries are cached while the state object is unchanged.
- Number/date formatters and vehicle/catalog indexes are reused instead of rebuilt per cell.
- Navigation uses React transitions and search uses deferred values.
- Autosave is scheduled in browser idle time.
- Excel/template engine is code-split and loaded only for import/export/template inspection.
- State mutations no longer run a second full migration/deep clone after every change.
- Electron disables spellcheck and uses compact JSON persistence.

## Универсальная резервная копия

Начиная с этой ревизии приложение экспортирует один стабильный формат резервной копии: `*.gsmbackup`.

Формат контейнера резервной копии имеет собственную версию (`backupFormatVersion`) и **не привязан к версии приложения**. Версия структуры пользовательских данных хранится отдельно (`dataSchemaVersion`). Поэтому последующие версии приложения должны продолжать читать `backupFormatVersion: 1`, а данные более старых схем переводить штатной миграцией `migrateState`.

В файл также записываются версия приложения, время создания и SHA-256 контрольная сумма данных. Повреждённая или изменённая копия не восстанавливается молча.

Импорт прежних `.toml` и `.json` копий намеренно не поддерживается. Начиная с v1.4.0 приложение работает только с `.gsmbackup`. Старая рабочая копия пользователя была отдельно разово конвертирована в новый формат. Новая резервная копия, созданная версией приложения с более новой схемой данных, не должна восстанавливаться в старую программу автоматически: пользователю предлагается сначала обновить приложение.

**Политика совместимости:** не менять `backupFormatVersion` и не ломать чтение существующих `.gsmbackup` без отдельного решения и явной миграции. Если в будущем потребуется действительно необратимое изменение формата или модели данных, оно рассматривается отдельно до реализации.

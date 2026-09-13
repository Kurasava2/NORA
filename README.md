# ГСМ Ведомости Desktop v1.4.1

Desktop-приложение для расчётных ведомостей ГСМ. React 18 + Vite + Tailwind CSS + Electron 22, целевая система — Windows 7 x86 (32-bit).

## v1.4.1 — периоды, импорт и читаемость

- месяцы на главном экране отображаются вертикальными строками внутри сворачиваемых секций годов;
- добавлено корректное склонение подписей после чисел (`1 месяц`, `2 месяца`, `5 месяцев` и т. п.);
- импорт месячной книги отбрасывает строки путёвок, дата которых лежит вне выбранного расчётного периода;
- машина без путёвок текущего периода считается не выезжавшей, даже если в её листе остались строки предыдущего месяца;
- в итоговой строке по ГСМ нулевые значения отображаются как `0`, но нулевой ГСМ по следующим путёвкам по-прежнему не тянется;
- сервисные действия переименованы в `Сохранить`, `Сделать резервную копию`, `Восстановить из копии`.

## Сборка

```bat
npm install
npm run dist:win7:x86
```

Результат: `release/GSM-Vedomosti-1.4.1-portable-Win7-ia32.exe`.

Electron зафиксирован на `22.3.27`, поскольку это последняя ветка Electron с поддержкой Windows 7/8/8.1.

## Performance profile v1.4.1

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

Начиная с v1.4.0 приложение экспортирует один стабильный формат резервной копии: `*.gsmbackup`.

Формат контейнера резервной копии имеет собственную версию (`backupFormatVersion`) и **не привязан к версии приложения**. Версия структуры пользовательских данных хранится отдельно (`dataSchemaVersion`). Поэтому последующие версии приложения должны продолжать читать `backupFormatVersion: 1`, а данные более старых схем переводить штатной миграцией `migrateState`.

В файл также записываются версия приложения, время создания и SHA-256 контрольная сумма данных. Повреждённая или изменённая копия не восстанавливается молча.

Импорт прежних `.toml` и `.json` копий намеренно не поддерживается. Начиная с v1.4.0 приложение работает только с `.gsmbackup`. Старая рабочая копия пользователя была отдельно разово конвертирована в новый формат. Новая резервная копия, созданная версией приложения с более новой схемой данных, не должна восстанавливаться в старую программу автоматически: пользователю предлагается сначала обновить приложение.

**Политика совместимости:** не менять `backupFormatVersion` и не ломать чтение существующих `.gsmbackup` без отдельного решения и явной миграции. Если в будущем потребуется действительно необратимое изменение формата или модели данных, оно рассматривается отдельно до реализации.

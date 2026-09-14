# GSM Ведомости v1.4.2 — Release Candidate Status

Дата подготовки: 2026-09-14

## Статус

Исходный код прошёл финальный статический/regression gate в доступной среде и подготовлен как **Release Candidate**.

Подтверждено:

- схема данных = 7; пользовательские машины и счётчики моточасов мигрируются без изменения формата `.gsmbackup`;

- 37/37 regression-тестов проходят;
- Electron main/preload/storage/backup проходят Node syntax check;
- все чистые JS-модули проходят syntax check;
- `App.jsx` и `main.jsx` проходят JSX parser-pass;
- universal `.gsmbackup` format v1 зафиксирован как долгоживущий контракт;
- package/application version = 1.4.2;
- Electron = 22.3.27, target Chromium 108, Windows target = portable ia32;
- неполный `node_modules` не входит в исходный архив.

## Что НЕ подтверждено в этой среде

Production package не был собран здесь, потому что npm registry недоступен из песочницы. Повторная offline-попытка закончилась `ENOTCACHED` для `zip-stream@4.1.1`; предыдущие online-попытки получали `EAI_AGAIN` от `registry.npmjs.org`.

Поэтому до финального релиза обязательны два внешних gate.

### Gate 1 — автоматическая сборка

На Windows-машине с рабочим npm/network запустить:

```bat
VERIFY_RELEASE.bat
```

Скрипт выполняет clean `npm ci`, 37 regression-тестов, production Vite build, `electron-builder --win portable --ia32` и проверяет PE machine type `0x014C` (i386/PE32).

Ожидаемый артефакт:

`release\GSM-Vedomosti-1.4.2-portable-Win7-ia32.exe`

### Gate 2 — физический Win7 x86 smoke/UI pass

Проверить именно собранный EXE:

- первый запуск, save/load, close/reopen;
- corrupt DB recovery и `.bak/.tmp` recovery;
- universal `.gsmbackup` export/restore;
- XLSX template/import/export;
- print dialog и реальный принтер/виртуальный PDF-printer;
- 1024×768, 1152×864, 1280×720, 1280×800, 1366×768, 1600×900, 1920×1080;
- resize/maximize/minimize;
- DPI 100% и 125%;
- 500/1000 путёвок и working-set 32-bit Electron.

До прохождения этих двух gate пакет следует считать **RC**, а не окончательно сертифицированным релизом.

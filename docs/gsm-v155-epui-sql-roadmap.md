# ГСМ Ведомости — EP-UI + SQLite rewrite roadmap

Статус: активный план большой переработки после версии 1.5.4.

Базовая точка:
- repository: Kurasava2/NORA
- stable GSM branch: gsm-v152-termux-build
- base commit: 0b9d4531965374e4f8d851a1b3b02a48b6028fc3
- application version: 1.5.4
- logical data schema: STORAGE_VERSION = 11
- Electron: 22.3.27
- target: Windows 7, x86 / 32-bit, weak PCs
- working rewrite branch: gsm-v155-epui-sql-rewrite
- UI library: @kurasava/ep-ui 1.3.2

## 1. Main decision

This is not a new application and not a second codebase.

We rebuild the presentation layer of the existing application and replace the persistence backend with SQLite while preserving the current domain behavior, calculation semantics, exports, backup compatibility and Windows 7 constraints.

The current domain/calculation modules remain the source of truth unless a specific defect is proven.

Do not rewrite working mathematics merely to make it look cleaner.

## 2. Non-negotiable invariants

Preserve:
- all current user-visible functionality unless a change is explicitly approved;
- vehicle statements and trip semantics;
- mileage and motohours behavior;
- auto-calc rules and manual overrides until their dedicated audit;
- lazy carry between months;
- density movements, density allocations and Form 63 reconciliation;
- material ordering;
- decimal density arithmetic without premature rounding;
- legacy data readability;
- universal .gsmbackup compatibility;
- workbook import/export behavior until its dedicated rewrite;
- Windows 7 x86 portable build;
- Electron 22.3.27.

Do not touch NORA main.

## 3. UI rule: EP-UI is the visual source of truth

All visible controls and surfaces must come from @kurasava/ep-ui.

Application-level CSS may define only structural layout where necessary:
- grid/flex placement;
- widths/heights;
- overflow;
- page geometry;
- print-only layout.

Do not create a parallel visual system in GSM.

If a visual control is missing, add it to the EP-UI backlog/library first instead of inventing a GSM-only version.

EP-UI 1.3.2 already provides:
- Theme;
- TitleBar;
- Sidebar;
- MenuBar;
- StatusBar;
- Button/IconButton/CloseButton;
- Input/Textarea/NumberInput;
- Dropdown/Select/Combobox;
- Checkbox/Switch/RadioGroup/Slider;
- Field;
- Card/Badge/Alert/Progress;
- Tabs;
- Modal/ConfirmDialog;
- Toast/ToastProvider;
- Toolbar/PageHeader/EmptyState;
- Table;
- Tooltip/DropdownMenu/ContextMenu;
- ColorPicker.

Known EP-UI gaps for GSM:
- DatePicker;
- MonthPicker;
- DataTable with sorting/filtering/row selection;
- Dropzone/file queue;
- Pagination if needed;
- possibly SplitPane;
- possibly TreeView;
- possibly reusable editable-table primitives.

These gaps must remain explicit tasks. Do not hide them behind one-off GSM widgets.

## 4. EP-UI dependency strategy

Pin the exact approved UI package in the repository so npm ci and GitHub Actions are reproducible.

Preferred structure:
- vendor/ep-ui/kurasava-ep-ui-1.3.2.tgz
- package.json dependency via local file reference

The GSM application must not add Prettier. EP-UI having its own development dependency does not make Prettier an application dependency.

## 5. SQLite decision

Target persistence format: SQLite database.

Planned database file:
- gsm-data.sqlite

The Electron main process owns the database connection.

Renderer code must not access SQLite, filesystem or Node APIs directly.

Introduce a persistence/repository boundary so domain code does not depend on SQL.

Keep logical application schema version and database schema version separate:
- STORAGE_VERSION = logical state/domain migration version;
- DB_SCHEMA_VERSION = physical SQLite schema version.

All SQL schema migrations must run transactionally.

## 6. SQLite compatibility gate

Before adopting a driver, prove all of the following in CI:
- npm ci;
- tests;
- Electron 22.3.27;
- win32 ia32 packaging;
- native/WASM dependency included correctly;
- application starts with the driver loaded;
- packaged PE remains i386;
- no x64-only native binary;
- no requirement to raise the Windows baseline.

Current compatibility candidate for the spike:
- @vscode/sqlite3, because its current package publishes Node-API win32 ia32 binaries and supports old Node-API versions.

Do not adopt current better-sqlite3 blindly: current releases target newer Node versions and current prebuilds do not include win32 ia32.

A WASM SQLite fallback may be evaluated only if native SQLite cannot meet Win7 x86 requirements.

## 7. SQL schema direction

Do not store the entire application as one opaque JSON blob and call that a SQL migration.

Use relational tables for the stable domain:
- app_meta;
- settings;
- vehicles;
- vehicle_settings;
- catalog_materials;
- periods;
- statements;
- trips;
- trip_materials / trip_gsm;
- decoding_documents;
- density_movements;
- density_allocations;
- decoding_containers.

Use explicit foreign keys/IDs where safe.

Complex configuration that is not queried relationally may remain serialized in clearly named JSON/TEXT columns, for example vehicle auto-calc configuration.

Preserve unknown/legacy fields rather than silently dropping them. Use controlled extra/legacy payload storage when needed.

## 8. JSON -> SQLite migration

Existing gsm-data.json is user data and must never be destroyed during migration.

First SQL startup flow:
1. If a valid SQLite database already exists, open and migrate it.
2. If SQLite does not exist and legacy JSON exists, read it with the existing recovery logic.
3. Run current migrateState() over the legacy logical state.
4. Import into SQLite inside one transaction.
5. Read the data back from SQLite.
6. Canonically compare the important logical state / run round-trip validation.
7. Mark the import complete only after validation succeeds.
8. Keep the original JSON file as an untouched migration safety copy.
9. Never delete the legacy JSON automatically in the first SQL release.

If migration fails:
- rollback SQL transaction;
- do not modify the legacy JSON;
- show a clear recovery error;
- allow backup import / retry.

## 9. Backup/restore

Keep .gsmbackup as the portable user-facing backup format.

backupFormatVersion remains 1 unless the envelope format itself must change.

Backup should represent the logical application state, not a raw SQLite file.

Export:
SQLite -> logical state snapshot -> existing universal backup envelope.

Restore:
.gsmbackup -> validate/checksum -> migrateState -> transactional SQL replace/import -> reload.

This preserves portability across future database schema changes.

## 10. Persistence behavior

Preserve:
- save queue semantics;
- autosave;
- explicit save;
- safe close/flush;
- clear save errors;
- recovery path.

Replace JSON atomic-write semantics with SQLite transaction semantics.

Use WAL/PRAGMA choices only after checking Windows 7 behavior and portable shutdown reliability.

Do not introduce background database writes that can outlive application shutdown.

## 11. UI rewrite order

Rewrite screen by screen while keeping the domain layer stable.

Phase A — application shell:
- EP-UI Theme;
- EP-UI TitleBar;
- EP-UI Sidebar;
- status/save state;
- toast/confirm infrastructure;
- navigation shell.

Phase B — overview and periods:
- period/year list;
- create/delete/import period;
- MonthPicker dependency if required.

Phase C — vehicle statement:
- statement header;
- trips table;
- add/edit trip modal;
- validation;
- auto-calc interaction;
- preview/export/print actions.

Phase D — vehicles:
- vehicle list;
- add/edit vehicle;
- fuel and oil types;
- history.

Phase E — material catalog:
- material list;
- add/edit;
- ordering.

Phase F — decodings/Form 63 workspace:
- period/material selection;
- distribution movements;
- density reconciliation;
- density sections;
- manual movement modal;
- existing chronological allocation behavior.

Phase G — settings/service:
- settings;
- templates;
- backup/restore;
- save/database status.

After a screen is migrated and regression-tested, remove only its obsolete GSM-specific visual primitives.

## 12. Missing EP-UI components backlog

Priority 1:
- MonthPicker;
- DatePicker;
- DataTable;
- Dropzone.

Priority 2:
- pagination if actual data sizes require it;
- SplitPane if preview/workspace benefits from it;
- reusable editable-table cells only if repeated in more than one GSM module.

Every component must be built in EP-UI first, tested there, then consumed by GSM.

## 13. SQL + UI sequencing

Do not change SQL storage and every screen in the same commit.

Recommended technical sequence:
1. baseline tests at 1.5.4;
2. create rewrite branch;
3. vendor and integrate EP-UI without changing behavior;
4. build EP-UI application shell;
5. SQLite driver compatibility spike;
6. repository interface + SQL schema;
7. JSON -> SQL migration and backup round-trip tests;
8. switch persistence to SQLite;
9. migrate screens one at a time;
10. remove obsolete visual layer only after all screens are migrated.

## 14. Existing future tasks that remain mandatory

### Form 63 real Excel export
- use the real approved XLSX as the visual source;
- one density section per actual Form 63 structure;
- liters × density for kilograms;
- no premature rounding;
- include surrendered values where applicable;
- totals: liters, kg, container/net values when required;
- export only from validated/current decoding data;
- do not invent the form visually.

### Standard vehicle statement template
- user supplies one-sheet XLSX template;
- clone that sheet for every vehicle;
- fill each clone;
- assemble the monthly workbook;
- do not require a whole prebuilt multi-vehicle workbook.

### Shared document representation
Preview / print / XLSX should converge on one presentation/data source as far as technically practical.
Do not maintain three independent implementations of the same form.

### Idle vehicles
Do not copy fake trips from the previous month.
Preserve real boundary readings and material balances without inventing movement.

### Auto-calc audit
Still required as a dedicated project:
- mathematical model;
- priorities;
- dependencies;
- manual overrides;
- several fuels;
- DT Z / DT A;
- carry;
- trip -> trip;
- month -> month;
- motohours;
- L/100 km;
- L/motohour;
- mixed rules;
- edits to earlier trips.

No eval.

## 15. Regression matrix for the rewrite

Every phase must check:
- old version 1.5.4 data;
- empty database;
- zero balances;
- legacy motohours;
- several density values;
- skipped months;
- retroactive changes;
- future periods untouched;
- manual overrides;
- automatic allocations;
- backup export/import;
- JSON -> SQLite migration;
- SQLite schema migration;
- XLSX import/export;
- preview;
- print;
- Win7 ia32 packaging.

## 16. Architecture limits

Keep current architecture test intent:
- small readable modules;
- no monster components;
- no duplicated business formulas;
- no one-letter names;
- no minified source;
- no huge inline workflows.

UI components compose domain data but must not become the source of business rules.

SQL repositories persist domain data but must not reimplement calculation formulas.

## 17. Release/version rule

Technical commits on this working branch may remain package version 1.5.4 while the update is unfinished.

The first completed build delivered to the user after this rewrite work must receive a new version number.

If no intermediate release is delivered, target next release is 1.5.5.

Before release:
- package.json/package-lock.json synchronized;
- tests green;
- build green;
- PE32/i386 green;
- source ZIP;
- artifact upload;
- full diff review.

## 18. Definition of done for the full rewrite

The rewrite is complete only when:
- all screens use EP-UI visual components;
- no parallel GSM visual component library remains;
- missing controls were added through EP-UI, not hacked locally;
- persistence is SQLite;
- legacy JSON migrates safely;
- .gsmbackup still works;
- business behavior is preserved or intentionally changed with tests;
- Form 63 and standard workbook work follow their approved real templates;
- all regression tests pass;
- GitHub Actions produces the Win7 ia32 portable build;
- stable gsm-v152-termux-build is not moved until the rewrite is ready to promote.

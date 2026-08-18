#!/usr/bin/env python3
"""Быстрая проверка структуры NORA без сторонних зависимостей."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []
chapters = sorted((ROOT / "01 Новелла/Рукопись").rglob("Глава *.md"))
if len(chapters) != 50:
    errors.append(f"Глав: {len(chapters)}, ожидалось 50")
numbers = []
for path in chapters:
    m = re.search(r"Глава (\d+)", path.name)
    if m:
        numbers.append(int(m.group(1)))
if sorted(numbers) != list(range(1, 51)):
    errors.append("Нарушена последовательность номеров глав")
reader = (ROOT / "07 Читалка/NORA — Читалка.html").read_text(encoding="utf-8")
if "liren-reader-state-v2" not in reader:
    errors.append("В читалке потерян ключ прогресса")
if "Главы 1–18" not in reader:
    errors.append("Подпись литературного прохода в читалке устарела")
if len(re.findall(r'<section class="chapter-page"', reader)) != 50:
    errors.append("В читалке не 50 разделов глав")
if len(re.findall(r'class="prev-footer"', reader)) != 49:
    errors.append("В читалке нарушены кнопки перехода к предыдущей главе")
if len(re.findall(r'class="next-footer"', reader)) != 49:
    errors.append("В читалке нарушены кнопки перехода к следующей главе")
if len(re.findall(r'class="mark-btn"', reader)) != 50:
    errors.append("В читалке не у каждой главы есть отметка прочтения")
skip = {ROOT / "00 Управление проектом/Таблица переименований.md"}
for forbidden in ["Найра", "Весса", "Ильва Сенн", "Казэль", "Каэль", "Торрен", "Сейра"]:
    for base in [ROOT / "00 Управление проектом", ROOT / "01 Новелла", ROOT / "02 Персонажи", ROOT / "03 Мир", ROOT / "04 Сюжет и тайны"]:
        for path in base.rglob("*"):
            if not path.is_file() or path in skip or path.suffix.lower() not in {".md", ".csv", ".html"}:
                continue
            if re.search(rf"(?<![А-Яа-яЁё]){re.escape(forbidden)}(?![А-Яа-яЁё])", path.read_text(encoding="utf-8", errors="ignore")):
                errors.append(f"Старое имя {forbidden}: {path.relative_to(ROOT)}")
                break
for forbidden_term in ["Viz", "Resonance"]:
    for path in (ROOT / "01 Новелла").rglob("*.md"):
        if re.search(rf"{forbidden_term}", path.read_text(encoding="utf-8", errors="ignore")):
            errors.append(f"Нерусский термин {forbidden_term}: {path.relative_to(ROOT)}")
            break
if errors:
    print("ПРОВЕРКА НЕ ПРОЙДЕНА")
    for error in errors:
        print("-", error)
    sys.exit(1)
print("ПРОВЕРКА ПРОЙДЕНА")
print(f"Глав: {len(chapters)}; ключ читалки сохранён")

#!/usr/bin/env python3
"""Собирает сводную рукопись из отдельных глав."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
out = ["---", "тип: сводная рукопись", "статус: производное", "источник: отдельные файлы глав", "---", "", "# NORA:Эхо возможного", "", "> Файл собирается автоматически. Редактировать нужно отдельные главы.", ""]
chapters = []
for folder in ["Первый год", "Второй год"]:
    chapters += sorted((ROOT / "01 Новелла/Рукопись" / folder).glob("Глава *.md"))
for path in chapters:
    raw = path.read_text(encoding="utf-8")
    body = re.sub(r"\A---\n.*?\n---\n+", "", raw, count=1, flags=re.S)
    out += [body.strip(), "\n---\n"]
(ROOT / "01 Новелла/Сводная рукопись.md").write_text("\n".join(out).rstrip() + "\n", encoding="utf-8")
print(f"Собрано глав: {len(chapters)}")

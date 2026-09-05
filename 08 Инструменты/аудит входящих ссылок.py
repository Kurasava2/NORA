#!/usr/bin/env python3
"""Полный аудит ссылок и path-зависимостей для зон физической миграции NORA."""
from __future__ import annotations

from collections import defaultdict
from pathlib import Path, PurePosixPath
import re
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
TEXT_EXTS = {'.md', '.txt', '.csv', '.html', '.htm', '.py', '.js', '.css', '.json', '.yml', '.yaml'}
SELF = PurePosixPath('08 Инструменты/аудит входящих ссылок.py')
WORKFLOW = PurePosixPath('.github/workflows/nora-structure-audit.yml')

TARGETS = {
    'Арвель A2 — новый owner': {'prefixes': ['03 Мир/Государства и общество/Государства/Арвель/'], 'files': []},
    'Арвель A2 — старые пути': {'prefixes': ['03 Мир/Государства и общество/Арвель/'], 'files': []},
    'Лейвен 001–019': {'prefixes': ['03 Мир/Города и места/Лейвен/'], 'files': []},
    'Технический корпус': {'prefixes': ['03 Мир/Физика Виза и технологии/'], 'files': []},
    'Сценовые карты I–III': {
        'prefixes': [],
        'files': [
            '04 Сюжет и тайны/Первый год/Сценовые карты первого года.md',
            '04 Сюжет и тайны/Второй год/Сценовые карты второго тома.md',
            '04 Сюжет и тайны/Третий год/Сценовые карты третьего тома.md',
        ],
    },
    'Карты и расчётные ассеты': {'prefixes': ['06 Визуальный канон/Карты/'], 'files': []},
}

WIKI_RE = re.compile(r'\[\[([^\]]+)\]\]')
MD_RE = re.compile(r'(?<!!)\[[^\]]*\]\(([^)]+)\)')
HTML_RE = re.compile(r'\b(?:href|src)\s*=\s*["\']([^"\']+)["\']', re.I)
SCHEMES = ('http://', 'https://', 'mailto:', 'tel:', 'data:', 'javascript:')
TARGET_HINTS = ('арвель', 'лейвен', 'сценовые карты', 'физика виза', 'визуальный канон/карты')


def relpath(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def text_files():
    for path in ROOT.rglob('*'):
        if not path.is_file() or '.git' in path.parts:
            continue
        if path.suffix.lower() in TEXT_EXTS:
            yield path


FILES = {relpath(p): p for p in text_files()}
MD_BY_STEM = defaultdict(list)
for rel in FILES:
    pp = PurePosixPath(rel)
    if pp.suffix.lower() == '.md':
        MD_BY_STEM[pp.stem].append(rel)


def clean_target(raw: str, kind: str) -> str:
    raw = unquote(raw.strip()).replace('\\', '/')
    if kind == 'wiki':
        raw = raw.split('|', 1)[0].strip()
    raw = raw.split('#', 1)[0].strip()
    return raw


def normalize_candidates(raw: str, source_rel: str, kind: str):
    target = clean_target(raw, kind)
    if not target or target.startswith(SCHEMES) or target.startswith('#'):
        return [], target

    source_parent = PurePosixPath(source_rel).parent
    candidates = []

    if kind == 'wiki' and '/' not in target:
        stem = PurePosixPath(target).stem
        direct = MD_BY_STEM.get(stem, [])
        if len(direct) == 1:
            return direct, target
        if direct:
            return direct, target

    raw_pp = PurePosixPath(target.lstrip('/'))
    bases = [raw_pp]
    if not target.startswith('/'):
        bases.insert(0, source_parent / raw_pp)

    for base in bases:
        norm = PurePosixPath(*[part for part in base.parts if part not in ('', '.')])
        stack = []
        for part in norm.parts:
            if part == '..':
                if stack:
                    stack.pop()
            else:
                stack.append(part)
        norm = PurePosixPath(*stack)
        variants = [norm]
        if not norm.suffix:
            variants.append(PurePosixPath(str(norm) + '.md'))
        for variant in variants:
            s = variant.as_posix()
            if s in FILES and s not in candidates:
                candidates.append(s)
    return candidates, target


def in_group(path: str, spec: dict) -> bool:
    return path in spec['files'] or any(path.startswith(prefix) for prefix in spec['prefixes'])


edges = []
unresolved_all = []
unresolved_target_like = []
literal_hits = defaultdict(list)

for source_rel, path in sorted(FILES.items()):
    text = path.read_text(encoding='utf-8', errors='ignore')

    for kind, regex in [('wiki', WIKI_RE), ('markdown', MD_RE), ('html', HTML_RE)]:
        for m in regex.finditer(text):
            raw = m.group(1)
            candidates, cleaned = normalize_candidates(raw, source_rel, kind)
            if candidates:
                for target_rel in candidates:
                    edges.append((source_rel, target_rel, kind, raw.strip()))
            elif cleaned and not cleaned.startswith(SCHEMES):
                line = text.count('\n', 0, m.start()) + 1
                unresolved_all.append((source_rel, line, kind, raw.strip()))
                if any(h in cleaned.lower() for h in TARGET_HINTS):
                    unresolved_target_like.append((source_rel, line, kind, raw.strip()))

    source_pp = PurePosixPath(source_rel)
    if source_pp in (SELF, WORKFLOW):
        continue
    for group, spec in TARGETS.items():
        probes = list(spec['prefixes']) + list(spec['files'])
        for probe in probes:
            start = 0
            while True:
                pos = text.find(probe, start)
                if pos < 0:
                    break
                line = text.count('\n', 0, pos) + 1
                literal_hits[group].append((source_rel, line, probe))
                start = pos + len(probe)

print('NORA — полный аудит ссылок зон миграции')
print(f'Текстовых файлов просканировано: {len(FILES)}')
print(f'Разрешённых внутренних ссылочных рёбер: {len(edges)}')
print()

for group, spec in TARGETS.items():
    incoming = [e for e in edges if in_group(e[1], spec)]
    outgoing = [e for e in edges if in_group(e[0], spec) and not in_group(e[1], spec)]
    unresolved_out = [u for u in unresolved_all if in_group(u[0], spec)]

    print(f'## {group}')
    print(f'Разрешённых входящих ссылок: {len(incoming)}')
    for source, target, kind, raw in sorted(set(incoming)):
        print(f'- {source} -> {target} [{kind}] :: {raw}')

    print(f'Разрешённых исходящих ссылок наружу: {len(outgoing)}')
    for source, target, kind, raw in sorted(set(outgoing)):
        print(f'- {source} -> {target} [{kind}] :: {raw}')

    print(f'Неразрешённых исходящих ссылок: {len(unresolved_out)}')
    for source, line, kind, raw in sorted(set(unresolved_out)):
        print(f'- {source}:{line} [{kind}] :: {raw}')

    hits = sorted(set(literal_hits[group]))
    print(f'Буквальных path-зависимостей: {len(hits)}')
    for source, line, probe in hits:
        print(f'- {source}:{line} :: {probe}')
    print()

print('## Неразрешённые ссылки, похожие на зависимости целевых зон')
if unresolved_target_like:
    for source, line, kind, raw in sorted(set(unresolved_target_like)):
        print(f'- {source}:{line} [{kind}] :: {raw}')
else:
    print('- нет')

print()
print('Аудит завершён. Наличие ссылок не является ошибкой: отчёт нужен для доказательного обновления путей.')

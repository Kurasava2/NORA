from pathlib import Path

path = Path('shdk-personnel-app-v0.6.0/src/import/stroevayaImporter.ts')
text = path.read_text(encoding='utf-8')

replacements = {
    "location: cleanupSuffix(value, /^1\\s*командиров\\w*/i)": "location: cleanupSuffix(value, /^1\\s*командиров[а-яё]*/iu)",
    "location: cleanupSuffix(value, /^командиров\\w*/i)": "location: cleanupSuffix(value, /^командиров[а-яё]*/iu)",
    "if (/^наряд\\b|дежур|дневаль|патрул|комутатор|коммутатор|ответственн/.test(lower))": "if (/^наряд(?:\\s|$)|дежур|дневаль|патрул|комутатор|коммутатор|ответственн/u.test(lower))",
    "if (/^соч\\b/.test(lower))": "if (/^соч(?:\\s|$)/u.test(lower))",
    "if (/^омп\\b|мед\\.?\\s*пункт/.test(lower))": "if (/^омп(?:\\s|$)|мед\\.?\\s*пункт/u.test(lower))",
    "if (/^болен|освобожд|^ввк\\b/.test(lower)) return { kind: 'EVENT', eventType: 'MEDICAL_RELEASE', subtype: /^ввк/.test(lower) ? 'VVK' : 'SICK' };": "if (/^болен|освобожд|^ввк(?:\\s|$)/u.test(lower)) return { kind: 'EVENT', eventType: 'MEDICAL_RELEASE', subtype: /^ввк(?:\\s|$)/u.test(lower) ? 'VVK' : 'SICK' };",
}

for old, new in replacements.items():
    if old not in text:
        raise RuntimeError(f'Expected parser fragment not found: {old}')
    text = text.replace(old, new)

start = text.index('export function parseLegacyPeriod')
end = text.index('\nfunction expandYear', start)
new_period = r'''export function parseLegacyPeriod(raw: string, orderDate?: string): LegacyPeriod {
  const text = raw.trim().toLocaleLowerCase('ru-RU').replace(/^[cс]\s+/iu, 'с ').replace(/\s+/g, ' ');
  if (!text) return {};

  const tokens = Array.from(text.matchAll(/(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{2,4}))?/g)).map((match) => ({
    day: Number(match[1]),
    month: Number(match[2]),
    year: match[3] ? expandYear(Number(match[3])) : undefined
  }));

  if (tokens.length >= 2) {
    const start = tokens[0];
    const end = tokens[1];

    let endYear = end.year ?? start.year;
    let startYear = start.year ?? endYear;

    if (!endYear && orderDate) endYear = Number(orderDate.slice(0, 4));
    if (!startYear) startYear = endYear;
    if (!endYear) endYear = startYear;
    if (!startYear || !endYear) return {};

    if (!start.year && start.month > end.month) startYear -= 1;
    if (!end.year && end.month < start.month) endYear += 1;

    return {
      startDate: iso(startYear, start.month, start.day),
      endDate: iso(endYear, end.month, end.day)
    };
  }

  if (tokens.length === 1) {
    const token = tokens[0];
    const year = token.year ?? (orderDate ? Number(orderDate.slice(0, 4)) : undefined);
    if (!year) return {};
    return { startDate: iso(year, token.month, token.day), endDate: undefined };
  }

  return {};
}
'''
text = text[:start] + new_period + text[end:]
path.write_text(text, encoding='utf-8')
print(f'Patched {path}')

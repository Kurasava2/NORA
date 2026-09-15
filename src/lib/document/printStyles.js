export function printStyles() {
  return [
    '@page{size:A4 portrait;margin:19.05mm 6.35mm}',
    '*{box-sizing:border-box}',
    'body{margin:0;background:#fff;color:#000;font-family:"Times New Roman",serif;font-size:10px}',
    '.paper{width:100%}',
    '.doc-title{text-align:center;font-weight:700;font-size:12px;line-height:1.25;margin-bottom:6px}',
    '.norm-text{text-align:justify;font-size:9px;line-height:1.15;margin-bottom:6px}',
    '.doc-table{width:100%;border-collapse:collapse;table-layout:fixed}',
    '.doc-table th,.doc-table td{border:1px solid #000;padding:2px;vertical-align:middle;text-align:center;line-height:1.12;word-break:break-word}',
    '.doc-table th{font-size:8px}',
    '.doc-table td{font-size:8.5px}',
    '.doc-table .text{text-align:left}',
    '.tot{font-weight:700}',
    '.doc-notes{margin-top:6px;font-size:9px;line-height:1.2}',
    '.doc-sign{text-align:center;margin-top:9px}',
    '.signline{text-align:center;margin-top:6px}',
  ].join('')
}

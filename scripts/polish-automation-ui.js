const fs = require('fs');

let code = fs.readFileSync('public/js/automation-ui.js', 'utf8');

// Update cleanTitle to strip any emoji in string
code = code.replace(
  /function cleanTitle\(str\) \{[\s\S]*?return str\.replace\([\s\S]*?\)\.trim\(\);\s*\}/,
  `function cleanTitle(str) {
    if (!str) return '';
    return str.replace(/[\\u{1F300}-\\u{1F9FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\u{FE00}-\\u{FE0F}\\u{1F000}-\\u{1F02F}\\u{1F0A0}-\\u{1F0FF}\\u{1F100}-\\u{1F64F}\\u{1F680}-\\u{1F6FF}]/gu, '').replace(/\\s+/g, ' ').trim();
  }`
);

// Update direction options
code = code.replace(
  `<option value="down" \${step.direction === 'down' ? 'selected' : ''}>Cuộn xuống ⬇</option>`,
  `<option value="down" \${step.direction === 'down' ? 'selected' : ''}>Cuộn xuống (Down)</option>`
);
code = code.replace(
  `<option value="up" \${step.direction === 'up' ? 'selected' : ''}>Cuộn lên ⬆</option>`,
  `<option value="up" \${step.direction === 'up' ? 'selected' : ''}>Cuộn lên (Up)</option>`
);

// Update key options
code = code.replace(
  `<option value="ArrowDown" \${step.key === 'ArrowDown' ? 'selected' : ''}>Mũi tên xuống ⬇</option>`,
  `<option value="ArrowDown" \${step.key === 'ArrowDown' ? 'selected' : ''}>Mũi tên xuống (Down)</option>`
);
code = code.replace(
  `<option value="ArrowUp" \${step.key === 'ArrowUp' ? 'selected' : ''}>Mũi tên lên ⬆</option>`,
  `<option value="ArrowUp" \${step.key === 'ArrowUp' ? 'selected' : ''}>Mũi tên lên (Up)</option>`
);

// Update rotate IP info box emoji
code = code.replace(
  `ℹ️ Kích hoạt xoay IP 4G Webhook`,
  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block; vertical-align:middle; margin-right:4px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> Kích hoạt xoay IP 4G Webhook`
);

fs.writeFileSync('public/js/automation-ui.js', code, 'utf8');
console.log('Updated automation-ui.js with clean typography and icons!');

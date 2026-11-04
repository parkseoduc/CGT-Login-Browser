const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const stack = [];
const regex = /<\/?([a-zA-Z0-9\-]+)([^>]*)>/g;
let match;
let line = 1;
let lastIndex = 0;

while ((match = regex.exec(html)) !== null) {
  const textBefore = html.substring(lastIndex, match.index);
  line += (textBefore.match(/\n/g) || []).length;
  lastIndex = match.index;

  const tagFull = match[0];
  const tagName = match[1].toLowerCase();
  const isClosing = tagFull.startsWith('</');
  const isSelfClosing = tagFull.endsWith('/>') || voidTags.has(tagName);

  if (tagName === '!doctype') continue;
  if (tagName === 'svg' || tagName === 'path' || tagName === 'rect' || tagName === 'circle' || tagName === 'line' || tagName === 'polyline' || tagName === 'polygon' || tagName === 'g') {
    // skip svg internals for simplicity or track
    continue;
  }

  if (isClosing) {
    if (stack.length === 0) {
      console.log(`Unmatched closing tag </${tagName}> at line ${line}`);
    } else {
      const top = stack.pop();
      if (top.name !== tagName) {
        console.log(`Mismatched tag: expected </${top.name}> (opened at ${top.line}), found </${tagName}> at line ${line}`);
      }
    }
  } else if (!isSelfClosing) {
    stack.push({ name: tagName, line });
  }
}

if (stack.length > 0) {
  console.log(`Unclosed tags remaining:`, stack.map(s => `${s.name} at line ${s.line}`));
} else {
  console.log('All tags are perfectly balanced!');
}

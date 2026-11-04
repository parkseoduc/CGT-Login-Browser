const fs = require('fs');
const css = fs.readFileSync('public/style.css', 'utf8');
const pos = css.indexOf('data-theme="light"');
if (pos !== -1) {
  console.log(css.substring(pos, pos + 500));
} else {
  console.log('not found');
}

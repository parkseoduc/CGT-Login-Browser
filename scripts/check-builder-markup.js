const fs = require('fs');
const js = fs.readFileSync('public/js/automation-ui.js', 'utf8');
const pos = js.indexOf('builder-modal-title');
console.log(js.substring(pos, pos + 800));

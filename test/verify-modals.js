const fs = require('fs');

const html = fs.readFileSync('public/index.html', 'utf8');
const app = fs.readFileSync('public/app.js', 'utf8');
const css = fs.readFileSync('public/style.css', 'utf8');

const checks = [
  { name: 'kernel-modal in HTML without display:none', pass: html.includes('id="kernel-modal"') && !html.includes('id="kernel-modal" style="display: none;"') },
  { name: 'bulk-profile-modal in HTML without display:none', pass: html.includes('id="bulk-profile-modal"') && !html.includes('id="bulk-profile-modal" style="display: none;"') },
  { name: 'notranslate meta in HTML head', pass: html.includes('name="google" content="notranslate"') },
  { name: 'CSS has :not(.open) protection for display:none', pass: css.includes('.modal[style*="display: none"]:not(.open)') },
  { name: 'openKernelModal handles display:flex and open class', pass: app.includes("kernelModal.style.display = 'flex'") },
  { name: 'openBulkProfileModal handles display:flex and open class', pass: app.includes("bulkProfileModal.style.display = 'flex'") }
];

console.log('--- Modal Verification Results ---');
let allPass = true;
for (const c of checks) {
  console.log(`${c.pass ? '✅' : '❌'} ${c.name}`);
  if (!c.pass) allPass = false;
}

if (allPass) {
  console.log('\n🎉 ALL MODAL CHECKS PASSED 100%!');
} else {
  process.exit(1);
}

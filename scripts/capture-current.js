const puppeteer = require('puppeteer-core');

async function test() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1400,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto('http://127.0.0.1:51888', { waitUntil: 'networkidle2' });

  // Switch to automation tab
  await page.evaluate(() => {
    const tab = document.querySelector('[data-tab="automation"]');
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: 'C:/Users/Admin/.gemini/antigravity/brain/f1d304f6-0f1e-4601-9cf9-1f2a35f863dd/current_automation_tab.png' });

  // Open the detail modal for iphey
  await page.evaluate(() => {
    if (window.AutomationUI && window.AutomationUI.openBuilderModal) {
      window.AutomationUI.openBuilderModal('sys_iphey_audit');
    }
  });
  await new Promise(r => setTimeout(r, 600));

  await page.screenshot({ path: 'C:/Users/Admin/.gemini/antigravity/brain/f1d304f6-0f1e-4601-9cf9-1f2a35f863dd/current_builder_modal.png' });

  await browser.close();
  console.log('Screenshots saved!');
}
test().catch(e => { console.error(e); process.exit(1); });

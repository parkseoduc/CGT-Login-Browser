const db = require('../src/db');
const { PRESET_TEMPLATES } = require('../src/automation-engine');

console.log('Seeding preset templates into automation_scripts...');
for (const tmpl of PRESET_TEMPLATES) {
  const existing = db.getAutomationScript(tmpl.id);
  if (!existing) {
    db.createAutomationScript({
      id: tmpl.id,
      name: tmpl.name,
      description: tmpl.description,
      category: tmpl.category,
      icon: tmpl.icon,
      steps: tmpl.steps,
      is_preset: 1
    });
    console.log(`- Seeded: ${tmpl.name}`);
  } else {
    console.log(`- Already exists: ${tmpl.name}`);
  }
}

const list = db.listAutomationScripts();
console.log(`Total automation scripts in DB: ${list.length}`);

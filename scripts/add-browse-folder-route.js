const fs = require('fs');

let code = fs.readFileSync('src/server.js', 'utf8');

const target = `      if (pathname === '/api/v1/kernel/open-folder' && method === 'POST') {`;

const newRoute = `      if ((pathname === '/api/v1/system/browse-folder' || pathname === '/api/v1/extensions/browse-folder') && (method === 'GET' || method === 'POST')) {
        const { exec } = require('node:child_process');
        if (process.platform === 'win32') {
          const psCmd = 'powershell.exe -NoProfile -STA -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = \\'Chon thu muc Tien ich Extension da giai nen\\'; $f.ShowNewFolderButton = $false; if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::WriteLine($f.SelectedPath) }"';
          exec(psCmd, { timeout: 60000 }, (err, stdout) => {
            const selected = stdout ? stdout.trim() : '';
            return sendJson(res, 200, { success: !!selected, path: selected });
          });
        } else {
          return sendJson(res, 200, { success: false, error: 'Not supported on this OS' });
        }
        return;
      }

      if (pathname === '/api/v1/kernel/open-folder' && method === 'POST') {`;

if (!code.includes('/api/v1/system/browse-folder')) {
  code = code.replace(target, newRoute);
  fs.writeFileSync('src/server.js', code, 'utf8');
  console.log('Added /api/v1/system/browse-folder route to src/server.js');
} else {
  console.log('Route already exists');
}

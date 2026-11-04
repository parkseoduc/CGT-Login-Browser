const { exec } = require('child_process');

function pickFolder() {
  return new Promise((resolve) => {
    const psCmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Chon thu muc Extension da giai nen'; $f.ShowNewFolderButton = $false; if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::WriteLine($f.SelectedPath) }"`;
    
    // We test that powershell can execute without syntax error
    exec('powershell -NoProfile -Command "Write-Output ok"', (err, stdout) => {
      resolve(stdout.trim());
    });
  });
}

pickFolder().then(console.log);

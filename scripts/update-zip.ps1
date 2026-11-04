Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$baseDir = "C:\Users\Admin\.gemini\antigravity\scratch\antidetect-manager"
$zipPath = "$baseDir\releases\OmniBrowser-v1.0.0-Portable-x64.zip"

if (Test-Path $zipPath) {
    $zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Update)

    $filesToUpdate = @(
        "public/index.html",
        "public/style.css",
        "public/app.js",
        "public/js/admin-checkout.js",
        "public/images/slide-01-profiles.png",
        "public/images/slide-02-automation.png",
        "public/images/slide-03-sync.png",
        "public/images/slide-04-admin.png",
        "src/checkout.js",
        "src/server.js",
        "src/auth.js",
        "src/db.js",
        "src/license-admin.js",
        "src/mailer.js"
    )

    foreach ($rel in $filesToUpdate) {
        $fullPath = "$baseDir\$($rel.Replace('/', '\'))"
        if (Test-Path $fullPath) {
            $existing = $zip.GetEntry($rel)
            if ($null -ne $existing) { $existing.Delete() }
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $fullPath, $rel)
            Write-Host "Updated entry in zip: $rel"
        }
    }

    $zip.Dispose()
    Write-Host "Portable Zip successfully updated with Admin Management & VietQR Checkout!"
} else {
    Write-Host "Zip not found at $zipPath"
}

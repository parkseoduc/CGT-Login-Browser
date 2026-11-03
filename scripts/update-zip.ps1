Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipPath = "C:\Users\Admin\.gemini\antigravity\scratch\antidetect-manager\releases\OmniBrowser-v1.0.0-Portable-x64.zip"
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Update)

$e1 = $zip.GetEntry("public/index.html")
if ($null -ne $e1) { $e1.Delete() }
[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, "C:\Users\Admin\.gemini\antigravity\scratch\antidetect-manager\public\index.html", "public/index.html")

$e2 = $zip.GetEntry("public/style.css")
if ($null -ne $e2) { $e2.Delete() }
[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, "C:\Users\Admin\.gemini\antigravity\scratch\antidetect-manager\public\style.css", "public/style.css")

$e3 = $zip.GetEntry("public/app.js")
if ($null -ne $e3) { $e3.Delete() }
[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, "C:\Users\Admin\.gemini\antigravity\scratch\antidetect-manager\public\app.js", "public/app.js")

$zip.Dispose()
Write-Host "Portable Zip successfully updated with clean Vietnamese validations and updated templates!"

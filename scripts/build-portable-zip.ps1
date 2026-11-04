$sourceDir = Get-Location
$zipPath = Join-Path $sourceDir 'releases\OmniBrowser-v1.0.0-Portable-x64.zip'
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$tempDir = Join-Path $sourceDir 'releases\temp_package'
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "Copying files to package directory..."
Copy-Item 'OmniBrowser.exe' $tempDir
Copy-Item 'start-desktop.bat' $tempDir
Copy-Item 'start-web.bat' $tempDir
Copy-Item 'download-kernel.bat' $tempDir
Copy-Item 'HUONG-DAN-SU-DUNG.txt' $tempDir
Copy-Item 'app.ico' $tempDir
Copy-Item 'package.json' $tempDir
Copy-Item 'public' $tempDir -Recurse
Copy-Item 'src' $tempDir -Recurse
Copy-Item 'desktop' $tempDir -Recurse

New-Item -ItemType Directory -Path (Join-Path $tempDir 'data') | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tempDir 'data\profiles') | Out-Null
Copy-Item 'data\extensions' (Join-Path $tempDir 'data') -Recurse
if (Test-Path 'data\antidetect.db') {
    Copy-Item 'data\antidetect.db' (Join-Path $tempDir 'data\antidetect.db')
}
if (Test-Path 'bin') {
    Copy-Item 'bin' $tempDir -Recurse
}

Write-Host "Compressing to $zipPath ..."
Compress-Archive -Path (Join-Path $tempDir '*') -DestinationPath $zipPath -CompressionLevel Optimal
Remove-Item $tempDir -Recurse -Force
Write-Host "SUCCESS: releases\OmniBrowser-v1.0.0-Portable-x64.zip created!"

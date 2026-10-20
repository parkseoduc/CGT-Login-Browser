param([int]$MainPid)

$main = Get-Process -Id $MainPid -ErrorAction SilentlyContinue
if (-not $main) {
    Write-Output "PID $MainPid not found"
    exit
}

$children = Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $MainPid }
$allProcs = @($main)
if ($children) {
    foreach ($c in $children) {
        $cp = Get-Process -Id $c.ProcessId -ErrorAction SilentlyContinue
        if ($cp) { $allProcs += $cp }
    }
}

$totalWorkingSetMB = ($allProcs | Measure-Object -Property WorkingSet64 -Sum).Sum / 1MB
$totalPrivateMB = ($allProcs | Measure-Object -Property PrivateMemorySize64 -Sum).Sum / 1MB
$totalCpu = ($allProcs | Measure-Object -Property CPU -Sum).Sum

[PSCustomObject]@{
    ProcessCount = $allProcs.Count
    WorkingSetTotalMB = [math]::Round($totalWorkingSetMB, 2)
    ActualPrivateRamMB = [math]::Round($totalPrivateMB, 2)
    MainRamMB = [math]::Round($main.WorkingSet64 / 1MB, 2)
    TotalCpuSec = [math]::Round($totalCpu, 2)
} | ConvertTo-Json -Compress

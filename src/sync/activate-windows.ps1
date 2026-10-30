param(
    [Parameter(Mandatory=$false)]
    [int[]]$Pids
)

if (-not $Pids -or $Pids.Count -eq 0) { exit 0 }

# 1. Thu thap tat ca cac PID bao gom ca Process con cua Chromium (Renderers, GPU, Utility)
$targetPids = New-Object 'System.Collections.Generic.HashSet[uint32]'
foreach ($pidNum in $Pids) {
    if ($pidNum -gt 0) {
        [void]$targetPids.Add([uint32]$pidNum)
        try {
            $children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $pidNum" -ErrorAction SilentlyContinue
            foreach ($c in $children) {
                [void]$targetPids.Add([uint32]$c.ProcessId)
            }
        } catch {}
    }
}

# 2. Goi WScript.Shell AppActivate (nhanh de kick hoat focus)
$ws = New-Object -ComObject WScript.Shell
foreach ($p in $targetPids) {
    try {
        [void]$ws.AppActivate([int]$p)
    } catch {}
}

# 3. Chuan xac 100%: EnumWindows duyet toan bo cua so Chromium va dua len Foreground Z-Order
$code = @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class Win32WindowFocus {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    public static void ActivateProcesses(uint[] pids) {
        if (pids == null || pids.Length == 0) return;
        var set = new HashSet<uint>(pids);

        IntPtr HWND_TOP = IntPtr.Zero;
        const int SW_RESTORE = 9;
        const uint SWP_NOMOVE = 0x0002;
        const uint SWP_NOSIZE = 0x0001;
        const uint SWP_SHOWWINDOW = 0x0040;

        EnumWindows((hWnd, lParam) => {
            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            if (set.Contains(pid) && IsWindowVisible(hWnd)) {
                ShowWindowAsync(hWnd, SW_RESTORE);
                BringWindowToTop(hWnd);
                SetForegroundWindow(hWnd);
                SetWindowPos(hWnd, HWND_TOP, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW);
            }
            return true;
        }, IntPtr.Zero);
    }
}
'@

try {
    Add-Type -TypeDefinition $code -Language CSharp -ErrorAction SilentlyContinue
    $pidsArray = [uint32[]]@($targetPids)
    [Win32WindowFocus]::ActivateProcesses($pidsArray)
} catch {}


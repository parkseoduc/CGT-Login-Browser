param(
    [Parameter(Mandatory=$false)]
    [int[]]$Pids
)

if (-not $Pids -or $Pids.Count -eq 0) { exit 0 }

# 1. Nhanh: Dung WScript.Shell AppActivate
$ws = New-Object -ComObject WScript.Shell
foreach ($pidNum in $Pids) {
    try {
        $ws.AppActivate([int]$pidNum)
    } catch {}
}

# 2. Chuan xac: P/Invoke User32 de khoi phuc cua so bi an / thu nho va dua len Top Z-Order
$code = @'
using System;
using System.Runtime.InteropServices;
public class Win32WindowFocus {
    [DllImport("user32.dll")]
    public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
}
'@

try {
    Add-Type -TypeDefinition $code -Language CSharp -ErrorAction SilentlyContinue
} catch {}

$HWND_TOP = [IntPtr]::Zero
$SW_RESTORE = 9
$SWP_NOMOVE = 0x0002
$SWP_NOSIZE = 0x0001
$SWP_SHOWWINDOW = 0x0040

foreach ($pidNum in $Pids) {
    try {
        $procs = Get-CimInstance Win32_Process -Filter "ProcessId = $pidNum or ParentProcessId = $pidNum" -ErrorAction SilentlyContinue
        foreach ($pr in $procs) {
            $p = Get-Process -Id $pr.ProcessId -ErrorAction SilentlyContinue
            if ($p -and $p.MainWindowHandle -ne [IntPtr]::Zero) {
                [Win32WindowFocus]::ShowWindowAsync($p.MainWindowHandle, $SW_RESTORE)
                [Win32WindowFocus]::BringWindowToTop($p.MainWindowHandle)
                [Win32WindowFocus]::SetForegroundWindow($p.MainWindowHandle)
                [Win32WindowFocus]::SetWindowPos($p.MainWindowHandle, $HWND_TOP, 0, 0, 0, 0, ($SWP_NOMOVE -bor $SWP_NOSIZE -bor $SWP_SHOWWINDOW))
            }
        }
    } catch {}
}

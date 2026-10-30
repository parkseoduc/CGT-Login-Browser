using System;
using System.IO;
using System.Runtime.InteropServices;

public class Program {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct STARTUPINFO {
        public Int32 cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public Int32 dwX;
        public Int32 dwY;
        public Int32 dwXSize;
        public Int32 dwYSize;
        public Int32 dwXCountChars;
        public Int32 dwYCountChars;
        public Int32 dwFillAttribute;
        public Int32 dwFlags;
        public Int16 wShowWindow;
        public Int16 cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct PROCESS_INFORMATION {
        public IntPtr hProcess;
        public IntPtr hThread;
        public Int32 dwProcessId;
        public Int32 dwThreadId;
    }

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool CreateProcess(
        string lpApplicationName,
        string lpCommandLine,
        IntPtr lpProcessAttributes,
        IntPtr lpThreadAttributes,
        bool bInheritHandles,
        uint dwCreationFlags,
        IntPtr lpEnvironment,
        string lpCurrentDirectory,
        ref STARTUPINFO lpStartupInfo,
        out PROCESS_INFORMATION lpProcessInformation);

    public static int Main(string[] args) {
        if (args.Length == 0) {
            Console.Error.WriteLine("Usage: spawn-desktop.exe <cmd> [args...]");
            return 1;
        }

        System.Text.StringBuilder sb = new System.Text.StringBuilder();
        string workDir = null;

        for (int i = 0; i < args.Length; i++) {
            string a = args[i];
            if (i > 0) sb.Append(" ");
            if (a.Contains(" ") && !a.StartsWith("\"")) {
                sb.Append("\"").Append(a).Append("\"");
            } else {
                sb.Append(a);
            }

            if (workDir == null && (a.EndsWith(".js") || a.EndsWith(".bat"))) {
                try {
                    string full = Path.GetFullPath(a);
                    workDir = Path.GetDirectoryName(full);
                    if (Path.GetFileName(workDir).Equals("src", StringComparison.OrdinalIgnoreCase)) {
                        workDir = Path.GetDirectoryName(workDir);
                    }
                } catch {}
            }
        }

        if (workDir == null) {
            try {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                DirectoryInfo parentInfo = Directory.GetParent(baseDir.TrimEnd('\\'));
                if (parentInfo != null) {
                    string parent = parentInfo.FullName;
                    if (File.Exists(Path.Combine(parent, "package.json"))) {
                        workDir = parent;
                    }
                }
            } catch {}
        }

        string fullCmd = sb.ToString();

        STARTUPINFO si = new STARTUPINFO();
        si.cb = Marshal.SizeOf(si);
        si.lpDesktop = @"WinSta0\Default";

        PROCESS_INFORMATION pi = new PROCESS_INFORMATION();
        bool ok = CreateProcess(null, fullCmd, IntPtr.Zero, IntPtr.Zero, false, 0, IntPtr.Zero, workDir, ref si, out pi);
        if (!ok) {
            int err = Marshal.GetLastWin32Error();
            Console.Error.WriteLine("Error: " + err + " on cmd: " + fullCmd);
            return err;
        }

        Console.WriteLine(pi.dwProcessId);
        return 0;
    }
}

using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace OmniBrowser
{
    static class Program
    {
        private const int PORT = 51888;
        private const string MUTEX_NAME = "Global\\OmniBrowser_Antidetect_Hub_Mutex";

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool createdNew;
            using (Mutex mutex = new Mutex(true, MUTEX_NAME, out createdNew))
            {
                if (!createdNew)
                {
                    // Already running - bring window or open browser
                    try
                    {
                        Process.Start("http://127.0.0.1:" + PORT);
                    }
                    catch { }
                    return;
                }

                string baseDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
                Directory.SetCurrentDirectory(baseDir);

                // 1. Locate Node.js Runtime
                string nodeExe = Path.Combine(baseDir, "bin", "node", "node.exe");
                if (!File.Exists(nodeExe))
                {
                    nodeExe = FindSystemNode();
                }

                if (string.IsNullOrEmpty(nodeExe) || !File.Exists(nodeExe))
                {
                    MessageBox.Show(
                        "Không tìm thấy Node.js Runtime!\n\nVui lòng đảm bảo file 'bin\\node\\node.exe' tồn tại hoặc cài đặt Node.js từ https://nodejs.org.",
                        "OmniBrowser - Thiếu Runtime",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error);
                    return;
                }

                // 2. Ensure Backend Server is Running
                Process serverProc = null;
                if (!IsServerReady(PORT))
                {
                    string scriptPath = Path.Combine(baseDir, "src", "index.js");
                    ProcessStartInfo psiServer = new ProcessStartInfo
                    {
                        FileName = nodeExe,
                        Arguments = "--experimental-sqlite \"" + scriptPath + "\"",
                        WorkingDirectory = baseDir,
                        CreateNoWindow = true,
                        UseShellExecute = false,
                        WindowStyle = ProcessWindowStyle.Hidden
                    };

                    try
                    {
                        serverProc = Process.Start(psiServer);
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show(
                            "Không thể khởi động Backend Engine:\n" + ex.Message,
                            "OmniBrowser - Lỗi Khởi Chạy",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Error);
                        return;
                    }

                    // Wait up to 12 seconds for backend to be ready
                    bool ready = false;
                    for (int i = 0; i < 24; i++)
                    {
                        Thread.Sleep(500);
                        if (IsServerReady(PORT))
                        {
                            ready = true;
                            break;
                        }
                    }

                    if (!ready)
                    {
                        MessageBox.Show(
                            "Máy chủ Backend phản hồi quá thời gian quy định.\nỨng dụng sẽ vẫn thử mở giao diện...",
                            "OmniBrowser - Cảnh Báo",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Warning);
                    }
                }

                // 3. Launch Desktop Window
                Process appWindowProc = null;
                string electronExe = Path.Combine(baseDir, "node_modules", "electron", "dist", "electron.exe");
                string electronMain = Path.Combine(baseDir, "desktop", "main.js");

                if (File.Exists(electronExe) && File.Exists(electronMain))
                {
                    // Priority 1: Electron Desktop Window
                    ProcessStartInfo psiElectron = new ProcessStartInfo
                    {
                        FileName = electronExe,
                        Arguments = "\"" + electronMain + "\"",
                        WorkingDirectory = baseDir,
                        UseShellExecute = false
                    };
                    try
                    {
                        appWindowProc = Process.Start(psiElectron);
                    }
                    catch { }
                }

                if (appWindowProc == null)
                {
                    // Priority 2: Native App Mode Window (Chrome / Edge / Bundled Chromium)
                    string browserExe = FindAppModeBrowser(baseDir);
                    if (!string.IsNullOrEmpty(browserExe))
                    {
                        string userDataDir = Path.Combine(
                            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                            "OmniBrowserDesktop", "app-session");

                        string appArgs = string.Format(
                            "--app=http://127.0.0.1:{0} --window-size=1360,860 --window-position=center --user-data-dir=\"{1}\" --app-id=OmniBrowserHub --disable-extensions --no-first-run --no-default-browser-check",
                            PORT, userDataDir);

                        ProcessStartInfo psiBrowser = new ProcessStartInfo
                        {
                            FileName = browserExe,
                            Arguments = appArgs,
                            WorkingDirectory = baseDir,
                            UseShellExecute = false
                        };
                        try
                        {
                            appWindowProc = Process.Start(psiBrowser);
                        }
                        catch { }
                    }
                }

                if (appWindowProc == null)
                {
                    // Priority 3: Default Web Browser
                    try
                    {
                        Process.Start("http://127.0.0.1:" + PORT);
                    }
                    catch { }
                    return;
                }

                // Wait for the desktop window to close
                try
                {
                    appWindowProc.WaitForExit();
                }
                catch { }

                // 4. Cleanup on App Exit
                try
                {
                    HttpWebRequest stopReq = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + PORT + "/api/v1/profiles/stop-all");
                    stopReq.Method = "POST";
                    stopReq.Timeout = 1200;
                    using (stopReq.GetResponse()) { }
                }
                catch { }

                if (serverProc != null && !serverProc.HasExited)
                {
                    try
                    {
                        serverProc.Kill();
                    }
                    catch { }
                }
            }
        }

        private static bool IsServerReady(int port)
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + port + "/api/v1/status");
                req.Timeout = 800;
                req.Method = "GET";
                using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
                {
                    return res.StatusCode == HttpStatusCode.OK;
                }
            }
            catch
            {
                return false;
            }
        }

        private static string FindSystemNode()
        {
            string[] paths = {
                @"C:\Program Files\nodejs\node.exe",
                @"C:\Program Files (x86)\nodejs\node.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\node\node.exe"),
                @"C:\nvm4w\nodejs\node.exe"
            };

            foreach (string p in paths)
            {
                if (File.Exists(p)) return p;
            }
            return null;
        }

        private static string FindAppModeBrowser(string baseDir)
        {
            string progFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            string progFilesX86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);

            string[] candidates = {
                // 1. Google Chrome
                Path.Combine(progFiles, @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(progFilesX86, @"Google\Chrome\Application\chrome.exe"),
                Path.Combine(localAppData, @"Google\Chrome\Application\chrome.exe"),
                // 2. Microsoft Edge
                Path.Combine(progFilesX86, @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(progFiles, @"Microsoft\Edge\Application\msedge.exe"),
                // 3. Bundled Chromium Kernel
                Path.Combine(baseDir, @"bin\chromium\chrome.exe")
            };

            foreach (string p in candidates)
            {
                if (File.Exists(p)) return p;
            }
            return null;
        }
    }
}

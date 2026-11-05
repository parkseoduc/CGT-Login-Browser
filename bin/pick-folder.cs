using System;
using System.IO;
using System.Windows.Forms;
using System.Runtime.InteropServices;

public class FolderPicker
{
    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    [STAThread]
    public static int Main(string[] args)
    {
        string outFile = args.Length > 0 ? args[0] : null;

        try
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
        }
        catch {}

        using (Form topForm = new Form())
        {
            topForm.TopMost = true;
            topForm.ShowInTaskbar = false;
            topForm.FormBorderStyle = FormBorderStyle.None;
            topForm.Size = new System.Drawing.Size(1, 1);
            topForm.StartPosition = FormStartPosition.CenterScreen;
            topForm.WindowState = FormWindowState.Normal;
            topForm.Visible = true;
            topForm.BringToFront();
            topForm.Activate();
            try { SetForegroundWindow(topForm.Handle); } catch {}

            using (FolderBrowserDialog fbd = new FolderBrowserDialog())
            {
                fbd.Description = "Chọn thư mục Extension đã giải nén (chứa file manifest.json)";
                fbd.ShowNewFolderButton = true;

                DialogResult result = fbd.ShowDialog(topForm);
                topForm.Close();

                if (result == DialogResult.OK && !string.IsNullOrEmpty(fbd.SelectedPath))
                {
                    string path = fbd.SelectedPath.Trim();
                    if (!string.IsNullOrEmpty(outFile))
                    {
                        try { File.WriteAllText(outFile, path, System.Text.Encoding.UTF8); } catch {}
                    }
                    Console.OutputEncoding = System.Text.Encoding.UTF8;
                    Console.WriteLine(path);
                    return 0;
                }
            }
        }
        return 1;
    }
}

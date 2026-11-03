#define MyAppName "OmniBrowser"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "CGT Development Team"
#define MyAppURL "https://cgtdev.space"
#define MyAppExeName "OmniBrowser.exe"

[Setup]
AppId={{5E27F4A8-1D29-436C-A924-E82C0E8BF1B4}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\Programs\{#MyAppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=..\releases
OutputBaseFilename=OmniBrowser-Setup-v1.0.0
SetupIconFile=..\app.ico
Compression=lzma2/fast
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\{#MyAppExeName}
CloseApplications=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "..\OmniBrowser.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\app.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\HUONG-DAN-SU-DUNG.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\start-desktop.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\start-web.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\download-kernel.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion

; Folders
Source: "..\public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\desktop\*"; DestDir: "{app}\desktop"; Flags: ignoreversion recursesubdirs createallsubdirs

; Bin folder (node + chromium)
Source: "..\bin\node\*"; DestDir: "{app}\bin\node"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\bin\chromium\*"; DestDir: "{app}\bin\chromium"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "test_user\*,test_user"

; Clean Data folder
Source: "clean_antidetect.db"; DestDir: "{app}\data"; DestName: "antidetect.db"; Flags: ignoreversion
Source: "..\data\extensions\*"; DestDir: "{app}\data\extensions"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\data\profiles\.gitkeep"; DestDir: "{app}\data\profiles"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

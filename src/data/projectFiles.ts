import { ProjectSourceFile } from '../types/monitor';

export const GITHUB_WORKFLOW_CONTENT = `name: Build Windows Executable (CoreGuard)

on:
  push:
    branches: [ "main" ]
    tags: [ "v*" ]
  pull_request:
    branches: [ "main" ]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build-and-release:
    runs-on: windows-latest
    name: Build Self-Contained Windows .exe

    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup .NET 8 SDK
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - name: Restore NuGet Dependencies
        run: dotnet restore CoreGuard.csproj

      - name: Publish Single-File Self-Contained .exe
        run: >
          dotnet publish CoreGuard.csproj
          -c Release
          -r win-x64
          --self-contained true
          -p:PublishSingleFile=true
          -p:IncludeNativeLibrariesForSelfExtract=true
          -p:EnableCompressionInSingleFile=true
          -p:DebugType=none
          -p:DebugSymbols=false
          -o ./dist

      - name: Compute SHA-256 Checksum
        shell: pwsh
        run: |
          $hash = (Get-FileHash -Algorithm SHA256 ./dist/CoreGuard.exe).Hash
          Set-Content -Path ./dist/SHA256SUMS.txt -Value "$hash  CoreGuard.exe"
          Write-Host "Calculated SHA-256: $hash"

      - name: Upload Build Artifact (Zip & Exe)
        uses: actions/upload-artifact@v4
        with:
          name: CoreGuard-Windows-x64
          path: |
            ./dist/CoreGuard.exe
            ./dist/SHA256SUMS.txt

      - name: Publish GitHub Release (on tag push)
        if: startsWith(github.ref, 'refs/tags/v')
        uses: softprops/action-gh-release@v2
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: \${{ github.ref_name }}
          name: CoreGuard \${{ github.ref_name }}
          body: |
            ## CoreGuard Windows Release \${{ github.ref_name }}
            Automated production build from GitHub Actions.
            
            ### Included Files:
            - **\`CoreGuard.exe\`**: Standalone, portable single-file executable for 64-bit Windows 10/11. No .NET runtime installation required.
            - **\`SHA256SUMS.txt\`**: Integrity verification checksum.
            
            ### Notes:
            - Run as Administrator on Windows to grant access to hardware Model-Specific Registers (MSRs) for reading individual CPU core temperatures.
          draft: false
          prerelease: false
          files: |
            ./dist/CoreGuard.exe
            ./dist/SHA256SUMS.txt
`;

export const PROJECT_FILES: ProjectSourceFile[] = [
  {
    path: '.github/workflows/build-windows.yml',
    filename: 'build-windows.yml',
    language: 'yaml',
    description: 'GitHub Actions workflow to compile self-contained .exe and create release',
    content: GITHUB_WORKFLOW_CONTENT
  },
  {
    path: 'CoreGuard.csproj',
    filename: 'CoreGuard.csproj',
    language: 'xml',
    description: '.NET 8 Project file with single-file compilation and LibreHardwareMonitorLib package',
    content: `<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net8.0-windows10.0.19041.0</TargetFramework>
    <Nullable>enable</Nullable>
    <UseWPF>true</UseWPF>
    <UseWindowsForms>true</UseWindowsForms>
    <ApplicationManifest>app.manifest</ApplicationManifest>
    <AssemblyName>CoreGuard</AssemblyName>
    <RootNamespace>CoreGuard</RootNamespace>
    
    <!-- Self-Contained Single-File Executable Settings -->
    <RuntimeIdentifier>win-x64</RuntimeIdentifier>
    <PublishSingleFile>true</PublishSingleFile>
    <SelfContained>true</SelfContained>
    <IncludeNativeLibrariesForSelfExtract>true</IncludeNativeLibrariesForSelfExtract>
    <EnableCompressionInSingleFile>true</EnableCompressionInSingleFile>
    
    <!-- Metadata -->
    <Version>1.0.0</Version>
    <Authors>CoreGuard Team</Authors>
    <Description>Windows CPU Per-Core Temperature Monitor with Thermal Hazard Protection</Description>
  </PropertyGroup>

  <ItemGroup>
    <!-- LibreHardwareMonitorLib provides direct Ring-0 Intel & AMD CPU MSR temperature reading -->
    <PackageReference Include="LibreHardwareMonitorLib" Version="0.9.3" />
    <!-- Windows 10/11 Native Toast Notifications -->
    <PackageReference Include="Microsoft.Toolkit.Uwp.Notifications" Version="7.1.3" />
  </ItemGroup>

</Project>`
  },
  {
    path: 'app.manifest',
    filename: 'app.manifest',
    language: 'xml',
    description: 'Windows Application Manifest requesting Administrator privileges for ring-0 hardware register access',
    content: `<?xml version="1.0" encoding="utf-8"?>
<assembly manifestVersion="1.0" xmlns="urn:schemas-microsoft-com:asm.v1">
  <assemblyIdentity version="1.0.0.0" name="CoreGuard.app"/>
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v2">
    <security>
      <requestedPrivileges xmlns="urn:schemas-microsoft-com:asm.v3">
        <!-- Administrator privilege is strictly required by Windows to access CPU MSR registers -->
        <requestedExecutionLevel level="requireAdministrator" uiAccess="false" />
      </requestedPrivileges>
    </security>
  </trustInfo>
  <compatibility xmlns="urn:schemas-microsoft-com:compatibility.v1">
    <application>
      <!-- Windows 10 and Windows 11 -->
      <supportedOS Id="{8e0f7a12-bfb3-4fe8-b9a5-48fd50a15a9a}" />
    </application>
  </compatibility>
</assembly>`
  },
  {
    path: 'Services/HardwareMonitorService.cs',
    filename: 'HardwareMonitorService.cs',
    language: 'csharp',
    description: 'Hardware sensor polling engine using LibreHardwareMonitor to read per-core DTS temperatures',
    content: `using System;
using System.Collections.Generic;
using System.Linq;
using LibreHardwareMonitor.Hardware;

namespace CoreGuard.Services
{
    public class CoreTemperatureInfo
    {
        public string Name { get; set; } = string.Empty;
        public float Current { get; set; }
        public float Min { get; set; }
        public float Max { get; set; }
    }

    public class HardwareMonitorService : IDisposable
    {
        private readonly Computer _computer;
        private IHardware? _cpuHardware;

        public string CpuName { get; private set; } = "Detecting CPU...";
        public bool IsInitialized { get; private set; }

        public HardwareMonitorService()
        {
            _computer = new Computer
            {
                IsCpuEnabled = true,
                IsMotherboardEnabled = true,
                IsControllerEnabled = false,
                IsGpuEnabled = false,
                IsMemoryEnabled = false,
                IsNetworkEnabled = false,
                IsStorageEnabled = false
            };
        }

        public void Initialize()
        {
            try
            {
                _computer.Open();
                _cpuHardware = _computer.Hardware.FirstOrDefault(h => h.HardwareType == HardwareType.Cpu);
                if (_cpuHardware != null)
                {
                    CpuName = _cpuHardware.Name;
                    IsInitialized = true;
                }
            }
            catch (Exception ex)
            {
                CpuName = $"Access Error (Run as Admin): {ex.Message}";
            }
        }

        public List<CoreTemperatureInfo> ReadTemperatures()
        {
            var results = new List<CoreTemperatureInfo>();

            if (_cpuHardware == null)
            {
                return results;
            }

            _cpuHardware.Update();

            foreach (var sensor in _cpuHardware.Sensors)
            {
                if (sensor.SensorType == SensorType.Temperature)
                {
                    // Focus on Core # and Package temperatures
                    if (sensor.Name.Contains("Core", StringComparison.OrdinalIgnoreCase) ||
                        sensor.Name.Contains("Package", StringComparison.OrdinalIgnoreCase))
                    {
                        results.Add(new CoreTemperatureInfo
                        {
                            Name = sensor.Name,
                            Current = sensor.Value ?? 0f,
                            Min = sensor.Min ?? sensor.Value ?? 0f,
                            Max = sensor.Max ?? sensor.Value ?? 0f
                        });
                    }
                }
            }

            return results;
        }

        public void Dispose()
        {
            _computer.Close();
        }
    }
}`
  },
  {
    path: 'Services/ThermalWarningManager.cs',
    filename: 'ThermalWarningManager.cs',
    language: 'csharp',
    description: 'Thermal hazard evaluator triggering Windows native toast notifications and sound alarms',
    content: `using System;
using System.Media;
using Microsoft.Toolkit.Uwp.Notifications;

namespace CoreGuard.Services
{
    public class ThermalWarningManager
    {
        public float WarningThreshold { get; set; } = 80.0f;
        public float HarmThreshold { get; set; } = 90.0f;

        private DateTime _lastNotificationTime = DateTime.MinValue;
        private readonly TimeSpan _notificationCooldown = TimeSpan.FromSeconds(15);

        public event Action<string, float, bool>? OnHazardDetected;

        public void EvaluateTemperatures(System.Collections.Generic.List<CoreTemperatureInfo> cores)
        {
            float maxTemp = 0f;
            string hottestCore = string.Empty;

            foreach (var core in cores)
            {
                if (core.Current > maxTemp)
                {
                    maxTemp = core.Current;
                    hottestCore = core.Name;
                }
            }

            if (maxTemp >= HarmThreshold)
            {
                TriggerHarmAlert(hottestCore, maxTemp);
            }
            else if (maxTemp >= WarningThreshold)
            {
                TriggerWarningAlert(hottestCore, maxTemp);
            }
        }

        private void TriggerHarmAlert(string coreName, float temperature)
        {
            OnHazardDetected?.Invoke(coreName, temperature, true);

            if (DateTime.Now - _lastNotificationTime > _notificationCooldown)
            {
                _lastNotificationTime = DateTime.Now;

                // Play Windows system critical stop sound
                SystemSounds.Hand.Play();

                // Trigger Windows 10/11 Native Toast
                new ToastContentBuilder()
                    .AddText("⚠️ CRITICAL THERMAL HARM WARNING!")
                    .AddText($"CPU core [{coreName}] reached {temperature:F1}°C (Exceeds critical harm limit of {HarmThreshold:F0}°C).")
                    .AddText("Immediate action: Check laptop fan, elevate base, or reduce workload!")
                    .SetToastScenario(ToastScenario.Alarm)
                    .Show();
            }
        }

        private void TriggerWarningAlert(string coreName, float temperature)
        {
            OnHazardDetected?.Invoke(coreName, temperature, false);

            if (DateTime.Now - _lastNotificationTime > _notificationCooldown)
            {
                _lastNotificationTime = DateTime.Now;

                SystemSounds.Exclamation.Play();

                new ToastContentBuilder()
                    .AddText("⚠️ CPU Temperature Warning")
                    .AddText($"[{coreName}] is currently {temperature:F1}°C (Above warning limit {WarningThreshold:F0}°C).")
                    .Show();
            }
        }
    }
}`
  },
  {
    path: 'MainWindow.xaml',
    filename: 'MainWindow.xaml',
    language: 'xml',
    description: 'WPF XAML modern dark user interface with per-core gauges and tray controls',
    content: `<Window x:Class="CoreGuard.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="CoreGuard — CPU Core Thermal Guard" 
        Height="620" Width="850"
        WindowStartupLocation="CenterScreen"
        Background="#090D16" Foreground="#F8FAFC"
        FontFamily="Segoe UI, sans-serif">
    
    <Grid Margin="20">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <!-- Top Header Bar -->
        <Border Grid.Row="0" Background="#0F172A" BorderBrush="#1E293B" BorderThickness="1" CornerRadius="12" Padding="16" Margin="0,0,0,16">
            <Grid>
                <Grid.ColumnDefinitions>
                    <ColumnDefinition Width="*"/>
                    <ColumnDefinition Width="Auto"/>
                </Grid.ColumnDefinitions>

                <StackPanel Grid.Column="0">
                    <TextBlock Text="CoreGuard Thermal Monitor" FontSize="18" FontWeight="Bold" Foreground="#38BDF8"/>
                    <TextBlock x:Name="TxtCpuName" Text="Intel Core / AMD Ryzen Processor" FontSize="12" Foreground="#94A3B8" Margin="0,4,0,0"/>
                </StackPanel>

                <StackPanel Grid.Column="1" Orientation="Horizontal" VerticalAlignment="Center">
                    <Border Background="#1E293B" CornerRadius="8" Padding="12,6" Margin="0,0,8,0">
                        <TextBlock x:Name="TxtPackageTemp" Text="Package: --°C" FontWeight="SemiBold" FontSize="14" Foreground="#10B981"/>
                    </Border>
                    <Button x:Name="BtnMinimizeToTray" Content="Minimize to Tray" Click="BtnMinimizeToTray_Click" 
                            Background="#0284C7" Foreground="White" BorderThickness="0" Padding="12,6" FontWeight="SemiBold" Cursor="Hand"/>
                </StackPanel>
            </Grid>
        </Border>

        <!-- Threshold Settings Bar -->
        <Border Grid.Row="1" Background="#0F172A" BorderBrush="#1E293B" BorderThickness="1" CornerRadius="12" Padding="14" Margin="0,0,0,16">
            <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
                <TextBlock Text="⚠️ Warning Limit:" Foreground="#FBBF24" VerticalAlignment="Center" Margin="0,0,8,0" FontWeight="SemiBold"/>
                <TextBox x:Name="TxtWarnLimit" Text="80" Width="44" Background="#1E293B" Foreground="White" BorderThickness="1" BorderBrush="#334155" Padding="4" TextAlignment="Center"/>
                <TextBlock Text="°C" Foreground="#94A3B8" VerticalAlignment="Center" Margin="4,0,24,0"/>

                <TextBlock Text="🚨 Harm Condition Limit:" Foreground="#EF4444" VerticalAlignment="Center" Margin="0,0,8,0" FontWeight="SemiBold"/>
                <TextBox x:Name="TxtHarmLimit" Text="90" Width="44" Background="#1E293B" Foreground="White" BorderThickness="1" BorderBrush="#334155" Padding="4" TextAlignment="Center"/>
                <TextBlock Text="°C" Foreground="#94A3B8" VerticalAlignment="Center" Margin="4,0,24,0"/>

                <Button x:Name="BtnApplyLimits" Content="Update Limits" Click="BtnApplyLimits_Click"
                        Background="#334155" Foreground="White" BorderThickness="0" Padding="10,4" Cursor="Hand"/>
                
                <Button x:Name="BtnTestToast" Content="Test Notification" Click="BtnTestToast_Click" Margin="12,0,0,0"
                        Background="#1E293B" Foreground="#38BDF8" BorderThickness="1" BorderBrush="#0284C7" Padding="10,4" Cursor="Hand"/>
            </StackPanel>
        </Border>

        <!-- Per-Core Grid Display -->
        <Border Grid.Row="2" Background="#0F172A" BorderBrush="#1E293B" BorderThickness="1" CornerRadius="12" Padding="16">
            <ScrollViewer VerticalScrollBarVisibility="Auto">
                <ItemsControl x:Name="ItemsCoreList">
                    <ItemsControl.ItemTemplate>
                        <DataTemplate>
                            <Border Background="#1E293B" CornerRadius="8" Padding="12" Margin="0,0,0,8">
                                <Grid>
                                    <Grid.ColumnDefinitions>
                                        <ColumnDefinition Width="140"/>
                                        <ColumnDefinition Width="*"/>
                                        <ColumnDefinition Width="100"/>
                                    </Grid.ColumnDefinitions>

                                    <TextBlock Grid.Column="0" Text="{Binding Name}" FontWeight="SemiBold" FontSize="13" Foreground="White" VerticalAlignment="Center"/>
                                    
                                    <!-- Temperature Progress Bar -->
                                    <ProgressBar Grid.Column="1" Value="{Binding Current}" Minimum="20" Maximum="105" Height="14" Margin="12,0" 
                                                 Foreground="#38BDF8" Background="#090D16" BorderThickness="0"/>

                                    <StackPanel Grid.Column="2" Orientation="Horizontal" HorizontalAlignment="Right" VerticalAlignment="Center">
                                        <TextBlock Text="{Binding Current, StringFormat='{}{0:F1}°C'}" FontWeight="Bold" FontSize="14" Foreground="#38BDF8"/>
                                        <TextBlock Text="{Binding Max, StringFormat=' (Peak {0:F0}°)'}" FontSize="11" Foreground="#64748B" Margin="4,2,0,0"/>
                                    </StackPanel>
                                </Grid>
                            </Border>
                        </DataTemplate>
                    </ItemsControl.ItemTemplate>
                </ItemsControl>
            </ScrollViewer>
        </Border>

        <!-- Bottom Status Bar -->
        <Grid Grid.Row="3" Margin="0,12,0,0">
            <TextBlock x:Name="TxtStatus" Text="Polling sensor registers every 1000ms..." FontSize="12" Foreground="#64748B"/>
            <TextBlock Text="Running as Administrator • LibreHardwareMonitorLib" HorizontalAlignment="Right" FontSize="12" Foreground="#64748B"/>
        </Grid>
    </Grid>
</Window>`
  },
  {
    path: 'MainWindow.xaml.cs',
    filename: 'MainWindow.xaml.cs',
    language: 'csharp',
    description: 'Main window code-behind with timer dispatch, tray icon logic, and hazard events',
    content: `using System;
using System.Windows;
using System.Windows.Threading;
using System.Windows.Forms;
using CoreGuard.Services;

namespace CoreGuard
{
    public partial class MainWindow : Window
    {
        private readonly HardwareMonitorService _hardwareService;
        private readonly ThermalWarningManager _warningManager;
        private readonly DispatcherTimer _pollTimer;
        private readonly NotifyIcon _trayIcon;

        public MainWindow()
        {
            InitializeComponent();

            _hardwareService = new HardwareMonitorService();
            _warningManager = new ThermalWarningManager();

            _hardwareService.Initialize();
            TxtCpuName.Text = _hardwareService.CpuName;

            _warningManager.OnHazardDetected += (coreName, temp, isHarm) =>
            {
                Dispatcher.Invoke(() =>
                {
                    TxtStatus.Text = isHarm
                        ? $"🚨 CRITICAL HARM CONDITION: {coreName} at {temp:F1}°C!"
                        : $"⚠️ WARNING: {coreName} at {temp:F1}°C";
                    TxtStatus.Foreground = isHarm ? System.Windows.Media.Brushes.Red : System.Windows.Media.Brushes.Orange;
                });
            };

            // Setup System Tray
            _trayIcon = new NotifyIcon
            {
                Text = "CoreGuard Thermal Monitor",
                Icon = System.Drawing.SystemIcons.Shield,
                Visible = true
            };
            _trayIcon.DoubleClick += (s, e) =>
            {
                Show();
                WindowState = WindowState.Normal;
            };

            // 1-second Polling Loop
            _pollTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromMilliseconds(1000)
            };
            _pollTimer.Tick += PollTimer_Tick;
            _pollTimer.Start();
        }

        private void PollTimer_Tick(object? sender, EventArgs e)
        {
            var readings = _hardwareService.ReadTemperatures();
            ItemsCoreList.ItemsSource = readings;

            // Update package temperature badge
            var package = readings.Find(r => r.Name.Contains("Package"));
            if (package != null)
            {
                TxtPackageTemp.Text = $"Package: {package.Current:F1}°C";
                _trayIcon.Text = $"CoreGuard: {package.Current:F0}°C";
            }

            // Check against warning & harm thresholds
            _warningManager.EvaluateTemperatures(readings);
        }

        private void BtnMinimizeToTray_Click(object sender, RoutedEventArgs e)
        {
            Hide();
            _trayIcon.ShowBalloonTip(2000, "CoreGuard Minimized", "Thermal monitoring continues in the background.", ToolTipIcon.Info);
        }

        private void BtnApplyLimits_Click(object sender, RoutedEventArgs e)
        {
            if (float.TryParse(TxtWarnLimit.Text, out float warn))
                _warningManager.WarningThreshold = warn;

            if (float.TryParse(TxtHarmLimit.Text, out float harm))
                _warningManager.HarmThreshold = harm;

            System.Windows.MessageBox.Show($"Limits updated:\\nWarning: {_warningManager.WarningThreshold}°C\\nHarm: {_warningManager.HarmThreshold}°C", "Thresholds Saved");
        }

        private void BtnTestToast_Click(object sender, RoutedEventArgs e)
        {
            new Microsoft.Toolkit.Uwp.Notifications.ToastContentBuilder()
                .AddText("CoreGuard Test Notification")
                .AddText("Thermal warning engine and Windows Toast notifications are working properly!")
                .Show();
        }

        protected override void OnClosed(EventArgs e)
        {
            _pollTimer.Stop();
            _hardwareService.Dispose();
            _trayIcon.Dispose();
            base.OnClosed(e);
        }
    }
}`
  },
  {
    path: 'App.xaml',
    filename: 'App.xaml',
    language: 'xml',
    description: 'WPF Application definition',
    content: `<Application x:Class="CoreGuard.App"
             xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
             xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
             StartupUri="MainWindow.xaml">
    <Application.Resources>
    </Application.Resources>
</Application>`
  },
  {
    path: 'App.xaml.cs',
    filename: 'App.xaml.cs',
    language: 'csharp',
    description: 'Application startup handling single instance mutex',
    content: `using System.Threading;
using System.Windows;

namespace CoreGuard
{
    public partial class App : Application
    {
        private static Mutex? _singleInstanceMutex;

        protected override void OnStartup(StartupEventArgs e)
        {
            const string mutexName = "CoreGuard_SingleInstance_Mutex";
            _singleInstanceMutex = new Mutex(true, mutexName, out bool createdNew);

            if (!createdNew)
            {
                MessageBox.Show("CoreGuard is already running in the background or system tray.", "Already Running");
                Shutdown();
                return;
            }

            base.OnStartup(e);
        }
    }
}`
  },
  {
    path: 'README.md',
    filename: 'README.md',
    language: 'markdown',
    description: 'Project README with GitHub Actions setup instructions and build steps',
    content: `# CoreGuard — Windows CPU Core Thermal Guard

CoreGuard reads hardware digital thermal sensors (DTS) on every physical and logical CPU core, warning users with desktop toasts and system tray alerts before dangerous heat causes hardware damage or thermal throttling.

## Features
- **Accurate Per-Core Hardware DTS Readings**: Uses \`LibreHardwareMonitorLib\` to query Intel & AMD MSR hardware registers directly.
- **Dual-Level Thermal Protection**:
  - ⚠️ **Warning Threshold** (Default: 80°C)
  - 🚨 **Harm Condition Hazard** (Default: 90°C) with Windows Toast & audio alert.
- **System Tray Mode**: Minimizes to background with live taskbar temperature tooltip.
- **Zero-Dependency .exe**: Single-file self-contained compilation (~25MB), no .NET runtime required.

## Building on GitHub Actions
1. Push this repository to GitHub.
2. The included \`.github/workflows/build-windows.yml\` will automatically run on a \`windows-latest\` runner.
3. Download the compiled \`CoreGuard.exe\` from the **Actions > Artifacts** tab.
4. Push a tag like \`git tag v1.0.0 && git push --tags\` to automatically generate a GitHub Release!
`
  }
];

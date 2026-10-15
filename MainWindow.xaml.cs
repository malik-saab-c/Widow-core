using System;
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

            System.Windows.MessageBox.Show($"Limits updated:\nWarning: {_warningManager.WarningThreshold}°C\nHarm: {_warningManager.HarmThreshold}°C", "Thresholds Saved");
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
}

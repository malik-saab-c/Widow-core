# CoreGuard — Windows CPU Core Thermal Guard

CoreGuard reads hardware digital thermal sensors (DTS) on every physical and logical CPU core, warning users with desktop toasts and system tray alerts before dangerous heat causes hardware damage or thermal throttling.

## Features
- **Accurate Per-Core Hardware DTS Readings**: Uses `LibreHardwareMonitorLib` to query Intel & AMD MSR hardware registers directly.
- **Dual-Level Thermal Protection**:
  - ⚠️ **Warning Threshold** (Default: 80°C)
  - 🚨 **Harm Condition Hazard** (Default: 90°C) with Windows Toast & audio alert.
- **System Tray Mode**: Minimizes to background with live taskbar temperature tooltip.
- **Zero-Dependency .exe**: Single-file self-contained compilation (~25MB), no .NET runtime required.

## Building on GitHub Actions
1. Push this repository to GitHub.
2. The included `.github/workflows/build-windows.yml` will automatically run on a `windows-latest` runner.
3. Download the compiled `CoreGuard.exe` from the **Actions > Artifacts** tab.
4. Push a tag like `git tag v1.0.0 && git push --tags` to automatically generate a GitHub Release!

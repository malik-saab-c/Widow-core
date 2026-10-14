# CoreGuard — Windows Per-Core CPU Thermal Monitor & GitHub Actions CI/CD Pipeline

A production-grade, native Windows hardware monitoring application and automated CI/CD pipeline that measures temperatures for every individual CPU core, triggers instant desktop notifications and system tray alerts before dangerous thermal throttle or hardware harm thresholds are hit, and automatically compiles into a standalone, portable `.exe` on GitHub Actions.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were aligned based on your responses:

- **Hardware Sensor Engine**: **C# .NET 8 with LibreHardwareMonitorLib**. Unlike standard Windows WMI queries (which only return motherboard ACPI thermal zones and cannot read individual core temperatures), LibreHardwareMonitor interfaces directly with CPU Model-Specific Registers (MSRs) via a signed ring-0 driver across all modern Intel Core and AMD Ryzen architectures.
- **Warning & Hazard Response**: **Windows Native Desktop Toast + System Tray Alerts**. When temperatures enter the Warning Zone (default 80°C) or Harm Condition (default 90°C), the app fires native Windows action notifications, pulses the tray icon color (Green $\to$ Amber $\to$ Red), and logs the thermal peak event.
- **Packaging & GitHub Actions**: **Self-Contained Single-File Executable (`PublishSingleFile=true`)**. Compiled on GitHub Actions `windows-latest` runner into an un-bloated, zero-dependency `CoreGuard.exe` that runs out-of-the-box on Windows 10 and 11 without requiring .NET runtimes.

---

### 1. Overview & Core Concept

- **What It Does**: CoreGuard continuously polls hardware digital thermal sensors (DTS) on every physical and logical CPU core. It renders real-time per-core temperature gauges, overall package temperature, peak thermal delta, and throttling alerts. If cooling fails or workloads cause temperatures to climb into unsafe thermal territories, it dispatches non-intrusive yet immediate desktop warnings and tray notifications.
- **Target Audience / Persona**: PC gamers, 3D/video rendering professionals, software developers compiling intensive codebases, and laptop users concerned with thermal throttling, dust-clogged heatsinks, or fan failures.
- **Key Value**: Accurate, real-time protection against hardware degradation and sudden thermal throttling shutdowns, delivered as a portable `.exe` with zero installation fuss.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Launch & Sensor Discovery**: Launch `CoreGuard.exe`. The application requests administrative elevation (required by Windows to read ring-0 CPU MSR registers), discovers the CPU model (Intel Core i5/i7/i9 or AMD Ryzen), enumerates every individual core (e.g., Core #1 to Core #16), and begins high-frequency 1-second sensor polling.
2. **Main Dashboard**: The user views a clean, high-contrast dark telemetry dashboard showing:
   - Primary CPU Package Temperature meter with status indicator: Normal (<75°C), Warm (75–84°C), Critical/Harm ($\ge$85°C).
   - Core Grid: Dedicated real-time mini-bars for each individual core (`Core #0`, `Core #1`, ... `Core #N`) showing current, min, and max recorded temperatures.
   - Thermal Headroom Gauge: Distance to CPU TjMax (maximum junction temperature before hardware throttling).
3. **Threshold Customization & Warning Setup**: A sliding control panel lets users adjust their Warning Threshold (default 80°C) and Critical Harm Threshold (default 90°C), toggle sound chimes, and test tray notifications.
4. **Background System Tray Guard**: Minimizing the app parks it quietly in the Windows System Tray with a live numeric temperature icon. If any core breaches the threshold, a Windows Toast notification appears with the offending core name and temperature.
5. **Interactive GitHub Actions & Exe Generator**: An embedded web management suite inside this workspace where users can inspect the complete source tree, customize build flags, and download the pre-configured `.github/workflows/build-windows.yml` to produce the executable from GitHub.

#### Visual Identity & Theme
- **Aesthetic Direction**: High-precision hardware engineering cockpit. Dark slate canvas (`#090D16`), deep matte structural panels (`#0F172A`), hairline borders (`#1E293B`).
- **Thermal Palette**:
  - Nominal / Optimal (<75°C): Emerald Green (`#10B981`)
  - Elevated / Warm (75°C–84°C): Amber Warning (`#F59E0B`)
  - Danger / Harm Condition ($\ge$85°C): Crimson Hazard (`#EF4444`)
- **Typography**: Clean sans display headers (`Plus Jakarta Sans`), paired with strict tabular monospace figures (`font-mono tabular-nums` / `JetBrains Mono`) for all temperatures, clock speeds, and timestamps to eliminate layout jitter.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: C# .NET + LibreHardwareMonitor vs. Python PyInstaller vs. WMI**
  - *Chosen Approach*: C# with LibreHardwareMonitorLib.
  - *Why*: WMI queries (`MSAcpi_ThermalZoneTemperature`) are notoriously broken or return fixed 27.8°C values on modern motherboards and do not provide per-core DTS data. Python PyInstaller produces large, slow-launching binaries often flagged by Windows Defender heuristics. C# .NET 8 produces a self-contained 25MB native executable that boots in milliseconds and uses the battle-tested kernel driver proven in apps like FanControl and OpenHardwareMonitor.
- **Decision 2: Portable Single-File Executable Packaging**
  - *Chosen Approach*: `dotnet publish -r win-x64 --self-contained -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true`.
  - *Why*: Users do not want complex MSI installers for a hardware utility. A single portable `.exe` can be placed on a USB drive, desktop, or Startup folder without leaving registry detritus.
- **Decision 3: Dual-Mode Architecture in this Project**
  - *Chosen Approach*: We provide:
    1. The complete, ready-to-compile C# .NET desktop solution files (`CoreGuard.csproj`, `MainWindow.xaml`, `MainWindow.xaml.cs`, `HardwareMonitorService.cs`, `NotificationManager.cs`).
    2. The production `.github/workflows/build-windows.yml` pipeline that compiles and publishes the `.exe` as GitHub releases.
    3. A live interactive hardware telemetry simulator and dashboard builder directly in this web application so users can test the UI, simulate overheating triggers, adjust warning thresholds, and inspect/copy code files seamlessly.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CoreGuard Architecture                          │
└────────────────────────────────────────────────────────────────────────┘

 [CPU Hardware Sensors: Intel DTS / AMD SMU]
                    │
                    ▼  (Ring-0 MSR driver / WinRing0)
 ┌──────────────────────────────────────────────────────────────────────┐
 │               LibreHardwareMonitorLib / Sensor Engine                │
 ├──────────────────────────────────────────────────────────────────────┤
 │  • Enumerate Hardware (Type == CPU)                                  │
 │  • Poll Sensors (SensorType.Temperature)                             │
 │  • Per-Core Extraction: "CPU Core #1", "CPU Core #2", "CPU Package"   │
 └───────────────────┬──────────────────────────────────────────────────┘
                     │  Observable Temperature Stream (1000ms tick)
                     ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │                     CoreGuard Controller & State                     │
 ├──────────────────────────────────────────────────────────────────────┤
 │  • Current, Min, Max per core                                        │
 │  • Threshold Evaluator: Warn (80°C), Harm (90°C)                     │
 │  • Debounced Notification Scheduler                                  │
 └───────────┬──────────────────────────────────────────┬───────────────┘
             │                                          │
             ▼                                          ▼
 ┌──────────────────────┐                   ┌───────────────────────────┐
 │   WPF Dashboard UI   │                   │ Windows Tray & Toast Alert│
 ├──────────────────────┤                   ├───────────────────────────┤
 │ • Real-time Gauges   │                   │ • Taskbar NotifyIcon      │
 │ • Core-by-core Bars  │                   │ • Win32 Shell Toast       │
 │ • Event Log Table    │                   │ • Audio Chime Generator   │
 └──────────────────────┘                   └───────────────────────────┘

─────────────────────────────────────────────────────────────────────────

 [GitHub Actions Pipeline: .github/workflows/build-windows.yml]
  GitHub Push / Release Tag
            │
            ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │ Runner: windows-latest (Server 2022 / VS 2022)                       │
  │  1. Checkout repository & actions/setup-dotnet@v4 (v8.0.x)           │
  │  2. Restore NuGet dependencies (LibreHardwareMonitorLib, etc.)      │
  │  3. dotnet publish -c Release -r win-x64 -p:PublishSingleFile=true  │
  │  4. Upload Artifact: CoreGuard-win-x64.exe                          │
  │  5. Publish GitHub Release with release notes and checksums         │
  └─────────────────────────────────────────────────────────────────────┘
```

#### GitHub Actions Workflow Specification
- **Trigger**: Pushes to `main`, manual `workflow_dispatch`, and tag releases `v*`.
- **Target Output**: `CoreGuard.exe` (x64) and optional zip distribution containing the standalone binary.
- **Permissions**: `contents: write` for creating automated GitHub Releases with binary assets attached.

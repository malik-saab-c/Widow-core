import React, { useState } from 'react';
import {
  Cpu,
  Flame,
  FileCode,
  Github,
  Download,
  FolderArchive,
  Layers,
  ShieldAlert,
  Terminal,
  Activity,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
  Check
} from 'lucide-react';
import { LiveMonitorSimulator } from './components/LiveMonitorSimulator';
import { SourceCodeViewer } from './components/SourceCodeViewer';
import { GitHubWorkflowGuide } from './components/GitHubWorkflowGuide';
import { PROJECT_FILES } from './data/projectFiles';
import JSZip from 'jszip';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'code' | 'pipeline' | 'architecture'>('simulator');
  const [isZipping, setIsZipping] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownloadAllZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      PROJECT_FILES.forEach((file) => {
        zip.file(file.path, file.content);
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'CoreGuard-Windows-Solution.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Bar following 3-Zone Contract */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base tracking-tight text-white">CoreGuard</span>
              <span className="text-xs text-cyan-400 font-mono">v1.0.0</span>
            </div>
            <span className="text-[11px] text-slate-400">Windows CPU Core Thermal Guard</span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800/80 text-xs">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'simulator'
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Live Monitor &amp; Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'code'
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>C# .NET Solution Code</span>
          </button>

          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'pipeline'
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub Actions CI/CD</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'architecture'
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Hardware Architecture</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleDownloadAllZip}
            disabled={isZipping}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-tight transition cursor-pointer shadow-md shadow-cyan-500/20 disabled:opacity-50"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <FolderArchive className="w-3.5 h-3.5" />
                <span>{isZipping ? 'Archiving...' : 'Download Project Zip'}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Mobile Tab bar fallback */}
        <div className="flex md:hidden overflow-x-auto gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
              activeTab === 'simulator' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
            }`}
          >
            Live Monitor
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
              activeTab === 'code' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
            }`}
          >
            C# Code
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
              activeTab === 'pipeline' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
            }`}
          >
            GitHub Actions
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
              activeTab === 'architecture' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
            }`}
          >
            Architecture
          </button>
        </div>

        {/* Tab 1: Live Monitor & Thermal Simulator */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
                  <span>Hardware Core Telemetry &amp; Hazard Engine</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Simulating real Intel Core / AMD Ryzen MSR register reading with dual warning and harm alert levels.
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <span>Driver:</span>
                <span className="font-mono text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  LibreHardwareMonitor (Ring-0)
                </span>
              </div>
            </div>

            <LiveMonitorSimulator />
          </div>
        )}

        {/* Tab 2: C# Source Code */}
        {activeTab === 'code' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  Complete C# .NET 8 Desktop Solution
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Native WPF code-behind, hardware service polling, and Windows 10/11 toast notification managers.
                </p>
              </div>

              <button
                onClick={handleDownloadAllZip}
                className="flex items-center space-x-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition"
              >
                <Download className="w-4 h-4" />
                <span>Export All Files</span>
              </button>
            </div>

            <SourceCodeViewer />
          </div>
        )}

        {/* Tab 3: GitHub Actions Pipeline */}
        {activeTab === 'pipeline' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center space-x-2">
                <span>GitHub Actions CI/CD Pipeline &amp; Release Generator</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated cloud build workflow running on <code className="text-cyan-300">windows-latest</code> to produce self-contained single-file <code className="text-cyan-300">CoreGuard.exe</code>.
              </p>
            </div>

            <GitHubWorkflowGuide />
          </div>
        )}

        {/* Tab 4: Hardware Architecture & Sensor Specs */}
        {activeTab === 'architecture' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                CPU Hardware Sensor Architecture
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Why standard Windows APIs fail and how ring-0 Model-Specific Registers (MSRs) provide true per-core thermal telemetry.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Intel DTS */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-5 h-5 text-blue-400" />
                  <h4 className="font-bold text-white text-sm">Intel Digital Thermal Sensors (DTS)</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Every modern Intel core has an on-die Digital Thermal Sensor located directly in the hottest hotspot of the execution core.
                </p>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4">
                  <li>
                    <strong className="text-slate-200">Register:</strong> <code className="text-cyan-400 font-mono">IA32_THERM_STATUS (MSR 0x19C)</code> and per-core MSR offsets.
                  </li>
                  <li>
                    <strong className="text-slate-200">Formula:</strong> <code className="text-cyan-300 font-mono">Temp = TjMax - DigitalReadout</code>.
                  </li>
                  <li>
                    <strong className="text-slate-200">Accuracy:</strong> ±1°C near critical limits; instantaneous response to sudden microsecond thermal surges.
                  </li>
                </ul>
              </div>

              {/* AMD Ryzen SMU */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center space-x-2">
                  <Flame className="w-5 h-5 text-red-400" />
                  <h4 className="font-bold text-white text-sm">AMD Ryzen Core Complex (SMU / Tdie)</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  AMD Zen 3, Zen 4, and Zen 5 processors report temperatures through the System Management Unit (SMU) via PCI configuration space and internal sensors.
                </p>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4">
                  <li>
                    <strong className="text-slate-200">Tctl vs Tdie:</strong> Tctl includes an artificial offset on some processors for fan curves; CoreGuard extracts the true physical <strong>Tdie</strong> per CCX core.
                  </li>
                  <li>
                    <strong className="text-slate-200">SMU Mailbox:</strong> LibreHardwareMonitor queries the hardware mailbox commands without requiring proprietary manufacturer utilities.
                  </li>
                  <li>
                    <strong className="text-slate-200">3D V-Cache Monitoring:</strong> Protects temperature-sensitive stacked cache layers on X3D processors.
                  </li>
                </ul>
              </div>
            </div>

            {/* Thermal Hazard Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <h4 className="font-bold text-white text-sm">Thermal Hazard Threshold Matrix</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-slate-800 text-slate-400 font-mono">
                    <tr>
                      <th className="py-2.5 px-3">Range</th>
                      <th className="py-2.5 px-3">Thermal Status</th>
                      <th className="py-2.5 px-3">Hardware Impact</th>
                      <th className="py-2.5 px-3">CoreGuard Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono">
                    <tr>
                      <td className="py-2.5 px-3 text-emerald-400 font-semibold">&lt; 75°C</td>
                      <td className="py-2.5 px-3 text-slate-300">Optimal Operating Temp</td>
                      <td className="py-2.5 px-3 text-slate-400">Full Boost clock speeds maintained, zero degradation</td>
                      <td className="py-2.5 px-3 text-slate-400">Quiet background monitoring</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-amber-400 font-semibold">80°C – 89°C</td>
                      <td className="py-2.5 px-3 text-slate-300">Elevated Thermal Stress</td>
                      <td className="py-2.5 px-3 text-slate-400">Fan RPM at maximum, slight reduction in multi-core peak boost</td>
                      <td className="py-2.5 px-3 text-amber-300">Windows Toast Notification &amp; Yellow Tray Icon</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-red-400 font-semibold">&ge; 90°C – 100°C</td>
                      <td className="py-2.5 px-3 text-red-400 font-bold">Harm Condition Hazard</td>
                      <td className="py-2.5 px-3 text-slate-400">Hardware thermal throttling, silicon electromigration risk, potential thermal shutdown</td>
                      <td className="py-2.5 px-3 text-red-300 font-semibold">Priority Audio Alarm + Red Taskbar Alert + Incident Logged</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>CoreGuard — C# .NET 8 &amp; LibreHardwareMonitorLib Architecture</span>
        <span>Ready to build with GitHub Actions on <code className="text-slate-400">windows-latest</code></span>
      </footer>
    </div>
  );
}

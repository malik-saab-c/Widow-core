import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  ShieldAlert,
  Volume2,
  VolumeX,
  Play,
  Square,
  Bell,
  Clock,
  Cpu,
  AlertTriangle,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Zap
} from 'lucide-react';
import { CpuCoreData, ThermalIncident } from '../types/monitor';

const INITIAL_CORES: CpuCoreData[] = [
  { id: 0, name: 'Core #0 (P-Core)', type: 'P-Core', currentTemp: 44, minTemp: 38, maxTemp: 68, loadPercent: 12, status: 'nominal' },
  { id: 1, name: 'Core #1 (P-Core)', type: 'P-Core', currentTemp: 46, minTemp: 39, maxTemp: 71, loadPercent: 18, status: 'nominal' },
  { id: 2, name: 'Core #2 (P-Core)', type: 'P-Core', currentTemp: 43, minTemp: 38, maxTemp: 66, loadPercent: 9, status: 'nominal' },
  { id: 3, name: 'Core #3 (P-Core)', type: 'P-Core', currentTemp: 47, minTemp: 40, maxTemp: 73, loadPercent: 24, status: 'nominal' },
  { id: 4, name: 'Core #4 (E-Core)', type: 'E-Core', currentTemp: 41, minTemp: 36, maxTemp: 59, loadPercent: 8, status: 'nominal' },
  { id: 5, name: 'Core #5 (E-Core)', type: 'E-Core', currentTemp: 42, minTemp: 36, maxTemp: 60, loadPercent: 10, status: 'nominal' },
  { id: 6, name: 'Core #6 (E-Core)', type: 'E-Core', currentTemp: 40, minTemp: 35, maxTemp: 57, loadPercent: 6, status: 'nominal' },
  { id: 7, name: 'Core #7 (E-Core)', type: 'E-Core', currentTemp: 41, minTemp: 35, maxTemp: 58, loadPercent: 7, status: 'nominal' },
];

export const LiveMonitorSimulator: React.FC = () => {
  const [cores, setCores] = useState<CpuCoreData[]>(INITIAL_CORES);
  const [warningLimit, setWarningLimit] = useState<number>(80);
  const [harmLimit, setHarmLimit] = useState<number>(90);
  const [workloadMode, setWorkloadMode] = useState<'idle' | 'gaming' | 'heavy_render' | 'thermal_emergency'>('idle');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activeHarmAlert, setActiveHarmAlert] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<ThermalIncident[]>([]);
  const [pollingRateMs] = useState<number>(1000);
  const [audioContextReady, setAudioContextReady] = useState(false);

  const lastAlertTimeRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sound generator using Web Audio API
  const playAlertChime = (isHarm: boolean) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isHarm ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isHarm ? 880 : 587, ctx.currentTime); // A5 or D5
      if (isHarm) {
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);
      }

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (isHarm ? 0.4 : 0.25));

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + (isHarm ? 0.45 : 0.3));
    } catch {
      // Audio not permitted yet
    }
  };

  // Main simulation tick loop
  useEffect(() => {
    const timer = setInterval(() => {
      setCores((prevCores) => {
        let maxCoreTemp = 0;
        let hottestCoreName = '';

        const updated = prevCores.map((core) => {
          // Calculate target temperature based on workload
          let target = 42;
          let targetLoad = 12;

          if (workloadMode === 'gaming') {
            target = core.type === 'P-Core' ? 72 : 58;
            targetLoad = core.type === 'P-Core' ? 70 : 40;
          } else if (workloadMode === 'heavy_render') {
            target = core.type === 'P-Core' ? 83 : 74;
            targetLoad = 96;
          } else if (workloadMode === 'thermal_emergency') {
            target = core.type === 'P-Core' ? 94 : 86;
            targetLoad = 100;
          }

          // Random natural jitter
          const jitter = (Math.random() - 0.5) * 3;
          const newTemp = Math.round(Math.max(35, Math.min(102, core.currentTemp + (target - core.currentTemp) * 0.35 + jitter)));
          const newLoad = Math.round(Math.max(2, Math.min(100, targetLoad + (Math.random() - 0.5) * 6)));

          let status: 'nominal' | 'warning' | 'harm' = 'nominal';
          if (newTemp >= harmLimit) {
            status = 'harm';
          } else if (newTemp >= warningLimit) {
            status = 'warning';
          }

          if (newTemp > maxCoreTemp) {
            maxCoreTemp = newTemp;
            hottestCoreName = core.name;
          }

          return {
            ...core,
            currentTemp: newTemp,
            minTemp: Math.min(core.minTemp, newTemp),
            maxTemp: Math.max(core.maxTemp, newTemp),
            loadPercent: newLoad,
            status
          };
        });

        // Trigger alert check
        const now = Date.now();
        if (maxCoreTemp >= harmLimit) {
          setActiveHarmAlert(`CRITICAL: ${hottestCoreName} reached ${maxCoreTemp}°C! (Exceeds Harm Limit ${harmLimit}°C)`);
          if (now - lastAlertTimeRef.current > 3500) {
            lastAlertTimeRef.current = now;
            playAlertChime(true);
            setIncidents((prev) => [
              {
                id: Math.random().toString(),
                timestamp: new Date().toLocaleTimeString(),
                coreName: hottestCoreName,
                temperature: maxCoreTemp,
                level: 'harm',
                message: `Hardware Harm Hazard! Exceeded ${harmLimit}°C safety ceiling.`
              },
              ...prev.slice(0, 9)
            ]);
          }
        } else if (maxCoreTemp >= warningLimit) {
          setActiveHarmAlert(`WARNING: ${hottestCoreName} reached ${maxCoreTemp}°C (Above ${warningLimit}°C)`);
          if (now - lastAlertTimeRef.current > 4500) {
            lastAlertTimeRef.current = now;
            playAlertChime(false);
            setIncidents((prev) => [
              {
                id: Math.random().toString(),
                timestamp: new Date().toLocaleTimeString(),
                coreName: hottestCoreName,
                temperature: maxCoreTemp,
                level: 'warning',
                message: `Thermal warning threshold reached.`
              },
              ...prev.slice(0, 9)
            ]);
          }
        } else {
          setActiveHarmAlert(null);
        }

        return updated;
      });
    }, pollingRateMs);

    return () => clearInterval(timer);
  }, [workloadMode, warningLimit, harmLimit, soundEnabled, pollingRateMs]);

  const packageTemp = Math.round(
    cores.reduce((sum, c) => sum + c.currentTemp, 0) / cores.length + 3
  );

  return (
    <div className="space-y-6">
      {/* Top Banner Alert when in Warning or Harm state */}
      {activeHarmAlert && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between animate-pulse transition ${
            packageTemp >= harmLimit
              ? 'bg-red-950/70 border-red-500 text-red-200'
              : 'bg-amber-950/70 border-amber-500 text-amber-200'
          }`}
        >
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-6 h-6 text-red-400 shrink-0" />
            <div>
              <span className="font-bold text-sm tracking-wide">
                {packageTemp >= harmLimit ? '🚨 HARDWARE HARM THREAT DETECTED' : '⚠️ ELEVATED TEMPERATURE ALERT'}
              </span>
              <p className="text-xs opacity-90">{activeHarmAlert}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="bg-red-500/20 px-2 py-1 rounded font-mono font-semibold">
              Peak: {Math.max(...cores.map((c) => c.currentTemp))}°C
            </span>
          </div>
        </div>
      )}

      {/* Main CPU Telemetry Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Package Temp Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>CPU Package Temperature</span>
            <Flame
              className={`w-4 h-4 ${
                packageTemp >= harmLimit
                  ? 'text-red-500 animate-bounce'
                  : packageTemp >= warningLimit
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            />
          </div>
          <div className="my-2 flex items-baseline space-x-2">
            <span
              className={`text-4xl font-extrabold font-mono tabular-nums tracking-tight ${
                packageTemp >= harmLimit
                  ? 'text-red-400'
                  : packageTemp >= warningLimit
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {packageTemp}°C
            </span>
            <span className="text-xs text-slate-500 font-mono">
              TjMax: 100°C ({Math.max(0, 100 - packageTemp)}°C headroom)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Thermal State:</span>
            <span
              className={`font-semibold ${
                packageTemp >= harmLimit
                  ? 'text-red-400'
                  : packageTemp >= warningLimit
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {packageTemp >= harmLimit ? 'Harm Risk' : packageTemp >= warningLimit ? 'Warning' : 'Nominal'}
            </span>
          </div>
        </div>

        {/* Cores Count & Topology */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Physical Sensors</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-extrabold text-white font-mono">{cores.length}</span>
            <span className="text-xs text-slate-400 ml-2">Discrete Core DTS</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Architecture:</span>
            <span className="text-slate-300 font-mono">4P + 4E (Hybrid)</span>
          </div>
        </div>

        {/* Warning Threshold Config */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-amber-400 font-semibold flex items-center space-x-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Warning Threshold</span>
            </span>
            <span className="font-mono text-xs font-bold text-amber-300">{warningLimit}°C</span>
          </div>
          <input
            type="range"
            min="65"
            max="88"
            value={warningLimit}
            onChange={(e) => setWarningLimit(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="text-[11px] text-slate-400 flex justify-between">
            <span>Low: 65°C</span>
            <span>Triggers Tray Alert</span>
            <span>High: 88°C</span>
          </div>
        </div>

        {/* Harm Threshold Config */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-red-400 font-semibold flex items-center space-x-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Critical Harm Limit</span>
            </span>
            <span className="font-mono text-xs font-bold text-red-400">{harmLimit}°C</span>
          </div>
          <input
            type="range"
            min="82"
            max="100"
            value={harmLimit}
            onChange={(e) => setHarmLimit(Number(e.target.value))}
            className="w-full accent-red-500 cursor-pointer"
          />
          <div className="text-[11px] text-slate-400 flex justify-between">
            <span>Min: 82°C</span>
            <span>Triggers Audio Alarm</span>
            <span>Max: 100°C</span>
          </div>
        </div>
      </div>

      {/* Workload Simulator Controls */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-200">Workload Thermal Simulation:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setWorkloadMode('idle')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              workloadMode === 'idle'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Idle / Web Browsing (38-48°C)
          </button>
          <button
            onClick={() => setWorkloadMode('gaming')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              workloadMode === 'gaming'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Gaming Load (65-75°C)
          </button>
          <button
            onClick={() => setWorkloadMode('heavy_render')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              workloadMode === 'heavy_render'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Heavy 3D / Code Compile (80-86°C)
          </button>
          <button
            onClick={() => setWorkloadMode('thermal_emergency')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              workloadMode === 'thermal_emergency'
                ? 'bg-red-500 text-white font-bold shadow-lg shadow-red-500/30 animate-pulse'
                : 'bg-red-950/60 border border-red-800/80 hover:bg-red-900/60 text-red-300'
            }`}
          >
            🔥 Overheat / Harm Stress Test (92-98°C)
          </button>
        </div>

        <div className="flex items-center space-x-2 border-l border-slate-800 pl-3">
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              playAlertChime(true);
            }}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              soundEnabled
                ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
                : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}
            title="Toggle Audio Alarm Chime"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Per-Core Sensor Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <div>
            <h4 className="font-bold text-white text-sm">Individual CPU Core Digital Thermal Sensors (DTS)</h4>
            <p className="text-slate-400">Direct register reading via LibreHardwareMonitorLib</p>
          </div>
          <div className="flex items-center space-x-4 text-[11px] text-slate-400">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
              <span>Nominal (&lt;{warningLimit}°C)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
              <span>Warning ({warningLimit}–{harmLimit}°C)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500"></span>
              <span>Harm Hazard (&ge;{harmLimit}°C)</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cores.map((core) => {
            const isHarm = core.currentTemp >= harmLimit;
            const isWarn = core.currentTemp >= warningLimit && !isHarm;
            const tempPercent = Math.min(100, Math.max(0, ((core.currentTemp - 30) / (105 - 30)) * 100));

            return (
              <div
                key={core.id}
                className={`p-3.5 rounded-xl border transition ${
                  isHarm
                    ? 'bg-red-950/40 border-red-500 shadow-md shadow-red-500/10'
                    : isWarn
                    ? 'bg-amber-950/30 border-amber-500/70'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-white">{core.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      {core.type}
                    </span>
                  </div>

                  <div className="flex items-baseline space-x-2 font-mono">
                    <span
                      className={`text-base font-extrabold tabular-nums ${
                        isHarm ? 'text-red-400' : isWarn ? 'text-amber-400' : 'text-slate-100'
                      }`}
                    >
                      {core.currentTemp}°C
                    </span>
                    <span className="text-[10px] text-slate-500">
                      (Peak {core.maxTemp}°)
                    </span>
                  </div>
                </div>

                {/* Progress Visual Bar */}
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      isHarm ? 'bg-red-500' : isWarn ? 'bg-amber-400' : 'bg-cyan-500'
                    }`}
                    style={{ width: `${tempPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 font-mono">
                  <span>Load: {core.loadPercent}%</span>
                  <span>Min: {core.minTemp}°C</span>
                  <span
                    className={
                      isHarm ? 'text-red-400 font-bold' : isWarn ? 'text-amber-400 font-bold' : 'text-emerald-400'
                    }
                  >
                    {isHarm ? 'HAZARD' : isWarn ? 'WARN' : 'OK'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Incident Log Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h5 className="font-bold text-white">Live Thermal Alert & Incident History</h5>
          </div>
          {incidents.length > 0 && (
            <button
              onClick={() => setIncidents([])}
              className="text-slate-400 hover:text-slate-200 transition text-[11px]"
            >
              Clear Log
            </button>
          )}
        </div>

        {incidents.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
            No temperature incidents triggered yet. Temperatures remain below warning threshold ({warningLimit}°C).
            <p className="text-[11px] text-cyan-400/80 mt-1">
              Tip: Click the &quot;Overheat / Harm Stress Test&quot; button above to simulate an emergency.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                  inc.level === 'harm'
                    ? 'bg-red-950/40 border-red-800 text-red-200'
                    : 'bg-amber-950/40 border-amber-800 text-amber-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-[11px] text-slate-400">[{inc.timestamp}]</span>
                  <span className="font-bold">{inc.coreName}:</span>
                  <span>{inc.message}</span>
                </div>
                <span className="font-mono font-bold text-xs">{inc.temperature}°C</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

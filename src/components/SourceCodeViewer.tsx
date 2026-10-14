import React, { useState } from 'react';
import { FileCode, Copy, Check, Folder, ChevronRight, Terminal, Info } from 'lucide-react';
import { PROJECT_FILES } from '../data/projectFiles';
import { ProjectSourceFile } from '../types/monitor';

export const SourceCodeViewer: React.FC = () => {
  const [selectedPath, setSelectedPath] = useState<string>(PROJECT_FILES[1].path); // CoreGuard.csproj default
  const [copied, setCopied] = useState(false);

  const currentFile = PROJECT_FILES.find((f) => f.path === selectedPath) || PROJECT_FILES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Informational Callout */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start space-x-3 text-xs text-slate-300">
        <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">How LibreHardwareMonitorLib Reads Core Temperatures:</span>
          <p className="mt-1 leading-relaxed text-slate-400">
            Standard Windows APIs (like WMI) only expose passive ACPI thermal zones. CoreGuard uses the embedded 
            <code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded mx-1">WinRing0</code> driver inside 
            <code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded mx-1">LibreHardwareMonitorLib</code> to read 
            hardware Model-Specific Registers (MSRs) directly from Intel Digital Thermal Sensors (DTS) and AMD Ryzen SMU registers. 
            The included <code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded mx-1">app.manifest</code> guarantees administrator permissions for this access.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* File Navigator Sidebar */}
        <div className="lg:col-span-1 border-r border-slate-800 p-4 bg-slate-950/40 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
            C# Desktop Solution Files
          </div>
          <div className="space-y-1">
            {PROJECT_FILES.map((file) => {
              const isSelected = file.path === selectedPath;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedPath(file.path)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span className="truncate">{file.filename}</span>
                  </div>
                  {isSelected && <ChevronRight className="w-3 h-3 text-cyan-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Code Content Area */}
        <div className="lg:col-span-3 p-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm font-bold text-white">{currentFile.path}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono uppercase">
                  {currentFile.language}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{currentFile.description}</p>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Copied!' : 'Copy File'}</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950 p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto max-h-[520px]">
            <pre>{currentFile.content}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

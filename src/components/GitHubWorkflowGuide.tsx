import React, { useState } from 'react';
import {
  Github,
  Download,
  Terminal,
  Check,
  Copy,
  FolderArchive,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';
import JSZip from 'jszip';
import { GITHUB_WORKFLOW_CONTENT, PROJECT_FILES } from '../data/projectFiles';

export const GitHubWorkflowGuide: React.FC = () => {
  const [copiedWorkflow, setCopiedWorkflow] = useState(false);
  const [copiedCommands, setCopiedCommands] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    if (key === 'workflow') {
      setCopiedWorkflow(true);
      setTimeout(() => setCopiedWorkflow(false), 2000);
    } else {
      setCopiedCommands(key);
      setTimeout(() => setCopiedCommands(null), 2000);
    }
  };

  const handleDownloadZip = async () => {
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
      a.download = 'CoreGuard-Windows-Project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to create zip:', err);
    } finally {
      setIsZipping(false);
    }
  };

  const gitCommands = `# 1. Create a new directory and extract the project
git init
git add .
git commit -m "Initial commit of CoreGuard CPU thermal monitor"

# 2. Add your GitHub repository remote
git remote add origin https://github.com/YOUR_USERNAME/CoreGuard.git
git branch -M main
git push -u origin main

# 3. Create a release tag to trigger GitHub Actions to build and release the .exe
git tag v1.0.0
git push origin v1.0.0`;

  return (
    <div className="space-y-6">
      {/* Download Action Banner */}
      <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-cyan-950/60 border border-cyan-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              One-Click Package
            </span>
            <h3 className="text-lg font-bold text-white">Download Complete Ready-To-Build Project</h3>
          </div>
          <p className="text-xs text-slate-300 max-w-xl">
            Download all C# .NET solution files, XAML designs, hardware drivers configuration, and the GitHub Actions CI/CD workflow pre-structured in a single ZIP file.
          </p>
        </div>

        <button
          onClick={handleDownloadZip}
          disabled={isZipping}
          className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs tracking-wide transition shadow-lg shadow-cyan-500/20 cursor-pointer shrink-0 disabled:opacity-50"
        >
          {downloadSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-950" />
              <span>Project Zip Downloaded!</span>
            </>
          ) : (
            <>
              <FolderArchive className="w-4 h-4" />
              <span>{isZipping ? 'Generating Zip...' : 'Download CoreGuard-Project.zip'}</span>
            </>
          )}
        </button>
      </div>

      {/* GitHub Actions Step-by-Step Pipeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Github className="w-5 h-5 text-cyan-400" />
            <span>How to Build Your .exe with GitHub Actions</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Follow these 4 simple steps to have GitHub compile the executable for you in the cloud
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="w-6 h-6 rounded-md bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center">
              1
            </div>
            <h5 className="font-semibold text-xs text-white">Push to GitHub</h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Create a new GitHub repository and push this codebase including <code className="text-cyan-300">.github/workflows/build-windows.yml</code>.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center">
              2
            </div>
            <h5 className="font-semibold text-xs text-white">Action Executes</h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              GitHub automatically launches a <code className="text-slate-300">windows-latest</code> VM with Visual Studio and .NET 8 SDK pre-installed.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center">
              3
            </div>
            <h5 className="font-semibold text-xs text-white">Compiles .exe</h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Executes <code className="text-cyan-300">dotnet publish -r win-x64 --self-contained</code> bundling the LibreHardwareMonitor driver directly inside.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
              4
            </div>
            <h5 className="font-semibold text-xs text-white">Download &amp; Release</h5>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              The <code className="text-emerald-400 font-mono">CoreGuard.exe</code> is attached to your GitHub Release and the GitHub Action Artifacts tab for instant download.
            </p>
          </div>
        </div>

        {/* Git Commands Block */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300 flex items-center space-x-1.5">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Terminal Commands to Push &amp; Trigger Release:</span>
            </span>
            <button
              onClick={() => handleCopy(gitCommands, 'git')}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
            >
              {copiedCommands === 'git' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCommands === 'git' ? 'Copied Commands!' : 'Copy Commands'}</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
            <pre>{gitCommands}</pre>
          </div>
        </div>

        {/* Workflow YAML Viewer */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">
              File: <code className="text-cyan-400 font-mono">.github/workflows/build-windows.yml</code>
            </span>
            <button
              onClick={() => handleCopy(GITHUB_WORKFLOW_CONTENT, 'workflow')}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition cursor-pointer"
            >
              {copiedWorkflow ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedWorkflow ? 'Copied YAML!' : 'Copy Workflow YAML'}</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto max-h-[380px]">
            <pre>{GITHUB_WORKFLOW_CONTENT}</pre>
          </div>
        </div>

        {/* Security & Run as Admin Notice */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start space-x-3 text-xs text-amber-200">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-amber-300">Important Windows Execution Note:</span>
            <p className="text-slate-300 leading-relaxed">
              Because reading physical CPU Model-Specific Registers (MSRs) is a privileged hardware operation on x86/x64 architectures, Windows requires administrative permission. CoreGuard has <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded font-mono">requireAdministrator</code> in its embedded manifest so Windows automatically prompts the standard UAC approval when you double-click the <code className="text-amber-300 font-mono">.exe</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

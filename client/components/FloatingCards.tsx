import { ShieldCheck, FileText, AlertTriangle, ScanLine, CheckCircle } from "lucide-react";

export default function FloatingCards() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-0 hidden md:block">
      {/* Left stack: risks and clauses */}
      <div className="absolute left-2 top-24 sm:left-4 lg:left-10">
        <div className="glass-soft elevated rotate-[-6deg] rounded-3xl px-5 py-4 shadow-xl shadow-sky-500/10 backdrop-blur-2xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="text-[12px] sm:text-sm font-semibold text-slate-800 dark:text-slate-100">Risk highlights</span>
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">3 issues</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">reviewed</span>
          </div>
        </div>
        <div className="mt-4 ml-8 glass elevated rotate-[4deg] rounded-3xl px-5 py-4 shadow-xl shadow-sky-500/10 animate-float" style={{animationDelay:'200ms'}}>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span className="text-[12px] sm:text-sm font-semibold text-slate-800 dark:text-slate-100">Clause: Arbitration</span>
          </div>
          <div className="mt-2 text-sm font-medium text-amber-600">High risk • requires opt‑out</div>
        </div>
      </div>

      {/* Right stack: diffs and confidence */}
      <div className="absolute right-2 top-16 sm:right-4 lg:right-10">
        <div className="glass elevated rotate-[6deg] rounded-3xl px-5 py-4 shadow-xl shadow-indigo-500/10 animate-float" style={{animationDelay:'0ms'}}>
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-blue-600" />
            <span className="text-[12px] sm:text-sm font-semibold text-slate-800 dark:text-slate-100">Smart diff</span>
          </div>
          <div className="mt-2 text-sm text-slate-700 dark:text-slate-300"><span className="font-extrabold text-slate-900 dark:text-white">+2</span> changes detected</div>
        </div>
        <div className="mt-4 -mr-4 glass-soft elevated rotate-[-3deg] rounded-3xl px-5 py-4 shadow-xl shadow-emerald-500/10 animate-float" style={{animationDelay:'400ms'}}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span className="text-[12px] sm:text-sm font-semibold text-slate-800 dark:text-slate-100">Confidence</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
            <span>99% with citations</span>
          </div>
        </div>
      </div>
    </div>
  );
}

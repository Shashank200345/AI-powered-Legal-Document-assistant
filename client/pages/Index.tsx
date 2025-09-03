import { Upload, Video, ShieldCheck, Clock, ScanLine, GaugeCircle } from "lucide-react";
import FloatingCards from "@/components/FloatingCards";

export default function Index() {
  return (
    <main>
      {/* Hero */}
      <section className="relative">
        <FloatingCards />
        <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center animate-fadein">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-white/50">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              99% accuracy • Trusted by thousands
            </div>
            <h1 className="mt-6 bg-gradient-to-b from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 bg-clip-text text-4xl font-extrabold leading-tight tracking-tight text-transparent sm:text-6xl">
              Transform Legal Documents Into Plain English
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              Our AI analyzes contracts, terms, and policies to deliver clear, human-friendly explanations with risk highlights and citations — no legal background required.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="/demo"
                className="shine rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-xl shadow-sky-500/25"
              >
                <span className="inline-flex items-center gap-2"><Upload className="h-4 w-4" />Upload Document</span>
              </a>
              <a
                href="/demo"
                className="rounded-full border border-slate-200/70 bg-white/40 px-7 py-3 text-sm font-semibold text-slate-800 backdrop-blur-md hover:bg-white/70 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/20"
              >
                <span className="inline-flex items-center gap-2"><Video className="h-4 w-4" />See Demo</span>
              </a>
            </div>

            {/* Trust badges */}
            <div className="mt-10 grid grid-cols-3 gap-3 text-center text-sm text-slate-600 sm:mt-12 sm:gap-6">
              <div className="glass rounded-xl p-3 sm:rounded-2xl sm:p-4 animate-fadein" style={{animationDelay: "0ms"}}>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white">99%</p>
                <p className="dark:text-slate-300">Accuracy</p>
              </div>
              <div className="glass rounded-xl p-3 sm:rounded-2xl sm:p-4 animate-fadein" style={{animationDelay: "100ms"}}>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white">10k+</p>
                <p className="dark:text-slate-300">Active Users</p>
              </div>
              <div className="glass rounded-xl p-3 sm:rounded-2xl sm:p-4 animate-fadein" style={{animationDelay: "200ms"}}>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white">AES-256</p>
                <p className="dark:text-slate-300">Encryption</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="relative mt-20 sm:mt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="glass rounded-3xl p-6 md:p-8 animate-fadein" style={{animationDelay: "50ms"}}>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-slate-500" />
                <h3 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">Traditional Review</h3>
              </div>
              <ul className="mt-4 space-y-2 text-slate-600 dark:text-slate-300">
                <li>• Hours of jargon</li>
                <li>• High risk of missing critical clauses</li>
                <li>• Costly consultations</li>
              </ul>
            </div>
            <div className="glass rounded-3xl p-6 md:p-8 animate-fadein" style={{animationDelay: "150ms"}}>
              <div className="flex items-center gap-3">
                <GaugeCircle className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold tracking-tight text-slate-800">With LexiPlain AI</h3>
              </div>
              <ul className="mt-4 space-y-2 text-slate-600 dark:text-slate-300">
                <li>• Instant plain-English explanations</li>
                <li>• Risk highlights and smart clause detection</li>
                <li>• Affordable and accessible for everyone</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative mt-20 sm:mt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Powerful, effortless features</h2>
            <p className="mt-3 text-slate-600">Every interaction feels fast and fluid, designed to inspire trust.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="glass-soft rounded-3xl p-6 animate-fadein" style={{animationDelay: "0ms"}}>
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Multimodal uploads</h3>
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Upload PDF, images, or text. Our AI reads and understands them all.</p>
            </div>
            <div className="glass-soft rounded-3xl p-6 animate-fadein" style={{animationDelay: "100ms"}}>
              <div className="flex items-center gap-3">
                <ScanLine className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Clause risk analysis</h3>
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Color-highlighted risks with plain-language summaries and next steps.</p>
            </div>
            <div className="glass-soft rounded-3xl p-6 animate-fadein" style={{animationDelay: "200ms"}}>
              <div className="flex items-center gap-3">
                <Video className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Conversational assistant</h3>
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Ask anything about your document and get clear answers with citations.</p>
            </div>
            <div className="glass-soft rounded-3xl p-6 animate-fadein" style={{animationDelay: "300ms"}}>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Smart comparisons</h3>
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Spot changes and red flags across versions in seconds.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Security */}
      <section className="relative mt-20 sm:mt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Trust & Security</h2>
            <p className="mt-3 text-slate-600">Enterprise-grade protection for every user.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="glass rounded-3xl p-6 animate-fadein" style={{animationDelay: "0ms"}}>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">End-to-end encryption</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">AES-256 at rest, TLS 1.3 in transit.</p>
            </div>
            <div className="glass rounded-3xl p-6 animate-fadein" style={{animationDelay: "100ms"}}>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Compliance</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">GDPR, CCPA, and SOC2-aligned practices.</p>
            </div>
            <div className="glass rounded-3xl p-6 animate-fadein" style={{animationDelay: "200ms"}}>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Activity logs</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Transparent, exportable audit trails.</p>
            </div>
            <div className="glass rounded-3xl p-6 animate-fadein" style={{animationDelay: "300ms"}}>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Independent accuracy</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Third-party reviewed model performance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative mt-20 sm:mt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="glass rounded-3xl p-8 text-center md:p-12 animate-fadein">
            <h3 className="text-2xl font-extrabold tracking-tight text-slate-900">Ready to make legal simple?</h3>
            <p className="mt-3 text-slate-600">Upload a contract and see instant, plain-English answers.</p>
            <div className="mt-6 flex items-center justify-center">
              <a href="/demo" className="shine rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-xl shadow-sky-500/25">
                Upload Document
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

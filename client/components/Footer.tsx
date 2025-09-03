export default function Footer() {
  return (
    <footer className="mt-24 border-t border-white/40 bg-white/20 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-slate-600 dark:text-slate-300">© {new Date().getFullYear()} LexiPlain. All rights reserved.</p>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
            <a href="/trust" className="hover:text-slate-900 dark:hover:text-white">Trust & Security</a>
            <a href="/about" className="hover:text-slate-900 dark:hover:text-white">About</a>
            <a href="/contact" className="hover:text-slate-900 dark:hover:text-white">Contact</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

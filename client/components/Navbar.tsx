import { Link, NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";

const navItems = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/demo", label: "Demo" },
  { href: "/chat", label: "Chat" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
];

export default function Navbar() {
  const location = useLocation();
  return (
    <header className="sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mt-4 rounded-2xl glass elevated">
          <div className="flex items-center justify-between px-4 py-3 md:px-6">
            <Link to="/" className="group inline-flex items-center gap-2">
              <div className="relative grid size-9 place-items-center rounded-xl bg-gradient-to-br from-sky-400/80 via-blue-500/80 to-indigo-500/80 text-white shadow-md">
                <span className="absolute inset-0 rounded-xl bg-white/20" />
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="transition-transform duration-300 group-hover:scale-110">
                  <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <span className="text-base font-semibold tracking-tight text-slate-800 dark:text-white">LexiPlain</span>
            </Link>
            <nav className="hidden items-center gap-6 md:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      "rounded-full px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-white/60 dark:text-slate-200 dark:hover:bg-white/10",
                      isActive && "bg-white/70 text-slate-900 dark:bg-white/10 dark:text-white",
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                to={{ pathname: "/demo" }}
                className="hidden rounded-full px-4 py-2 text-sm text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white md:inline-flex"
              >
                See Demo
              </Link>
              <Link
                to="/chat"
                className="shine rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/25"
              >
                Upload Document
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* subtle dividing hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
    </header>
  );
}

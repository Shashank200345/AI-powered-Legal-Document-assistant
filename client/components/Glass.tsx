import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export function GlassCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("glass rounded-2xl elevated", className)}>
      {children}
    </div>
  );
}

export function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-base text-slate-600">{subtitle}</p>
      )}
    </div>
  );
}

export function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  return (
    <main className="relative mx-auto max-w-7xl px-4 sm:px-6">
      <div className="mx-auto mt-12 max-w-3xl text-center">
        <div className="glass rounded-3xl p-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{title}</h1>
          {description && <p className="mt-4 text-slate-600 dark:text-slate-300">{description}</p>}
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            This page is ready to be customized. Tell Fusion which content and layout you want here, and we'll make it pixel-perfect.
          </p>
        </div>
      </div>
    </main>
  );
}

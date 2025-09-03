import { ArrowRight, Upload, Bot, MessageSquare } from "lucide-react";

export default function HowItWorks() {
  return (
    <main className="relative mx-auto max-w-7xl px-4 sm:px-6">
      <div className="mx-auto mt-12 max-w-3xl text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">How It Works</h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
          Three simple steps to transform complex legal text into plain English.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 items-center gap-6 md:grid-cols-3">
        <div className="glass rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <Upload className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Upload</h3>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Drag and drop PDFs, images, or paste text directly.
          </p>
        </div>

        <div className="hidden justify-center md:flex">
          <ArrowRight className="h-6 w-6 text-slate-400" />
        </div>

        <div className="glass rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">AI Analysis</h3>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Our AI identifies clauses, highlights risks, and explains them.
          </p>
        </div>

        <div className="hidden md:block" />

        <div className="hidden justify-center md:flex">
          <ArrowRight className="h-6 w-6 text-slate-400" />
        </div>

        <div className="glass rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Get Clear Answers</h3>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Chat naturally with the document and get cited, plain-English answers.
          </p>
        </div>
      </div>
    </main>
  );
}

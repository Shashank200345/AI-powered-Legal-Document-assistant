import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="relative mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4 py-24 sm:px-6">
      <div className="glass rounded-3xl p-10 text-center">
        <h1 className="bg-gradient-to-b from-slate-900 to-slate-700 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent">
          404
        </h1>
        <p className="mt-3 text-slate-600">This page doesn’t exist yet.</p>
        <a
          href="/"
          className="mt-6 inline-flex rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-lg"
        >
          Go Home
        </a>
      </div>
    </main>
  );
};

export default NotFound;

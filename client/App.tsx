import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HowItWorks from "@/pages/HowItWorks";
import Demo from "@/pages/Demo";
import Pricing from "@/pages/Pricing";
import FAQ from "@/pages/FAQ";
import Trust from "@/pages/Trust";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import { ThemeProvider } from "next-themes";

const queryClient = new QueryClient();

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-[radial-gradient(80%_60%_at_50%_-10%,rgba(59,130,246,0.15),transparent_60%)]">
    <div className="pointer-events-none fixed inset-0 bg-grid" />
    <Navbar />
    {children}
    <Footer />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <BrowserRouter>
          <Shell>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/trust" element={<Trust />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Shell>
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);

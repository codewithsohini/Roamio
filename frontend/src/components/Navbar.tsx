import { Plane } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? "bg-white/80 backdrop-blur-md shadow-sm border-b border-border/50 py-3" 
          : "bg-transparent py-5"
      }`}
    >
      <div className="container mx-auto px-6 max-w-7xl flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer" data-testid="link-home">
          <Plane className="h-6 w-6 text-secondary-foreground fill-secondary-foreground group-hover:text-primary transition-colors" />
          <span className="font-display font-bold text-[22px] tracking-tight text-secondary-foreground">
            Roamio
          </span>
        </Link>


        <div className="hidden md:flex items-center gap-4">
          <Link href="/login" className="text-sm font-semibold text-foreground hover:text-primary transition-colors px-4 py-2" data-testid="link-login">
            Login
          </Link>
          <Link 
            href="/planner" 
            className="text-sm font-semibold text-primary-foreground bg-primary hover:brightness-105 transition-all px-6 py-2.5 rounded-full shadow-sm hover:shadow active:scale-95"
            data-testid="link-start-planning"
          >
            Start Planning
          </Link>
        </div>

        {/* Mobile menu button */}
        <button 
          className="md:hidden text-foreground p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-border shadow-lg py-4 px-6 flex flex-col gap-4">
          <Link href="/login" className="text-base font-semibold py-2 text-foreground" onClick={() => setMobileMenuOpen(false)}>Login</Link>
          <Link href="/planner" className="mt-2 text-center text-sm font-semibold text-primary-foreground bg-primary rounded-full px-6 py-3" onClick={() => setMobileMenuOpen(false)}>
            Start Planning
          </Link>
        </div>
      )}
    </header>
  );
}

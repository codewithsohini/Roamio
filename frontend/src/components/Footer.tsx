import { Link } from "wouter";
import { Plane, Twitter, Instagram, Linkedin, Facebook } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-secondary-foreground text-white py-16 md:py-24">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 group cursor-pointer inline-flex mb-6" data-testid="link-home-footer">
              <Plane className="h-6 w-6 text-white fill-white" />
              <span className="font-display font-bold text-[22px] tracking-tight text-white">
                Roamio
              </span>
            </Link>
            <p className="text-white/70 max-w-sm text-sm leading-relaxed mb-8">
              Roamio uses AI to build personalized travel itineraries in minutes. 
              Explore the world without the chaos of planning.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors group">
                <Twitter className="h-4 w-4 text-white group-hover:text-white" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors group">
                <Instagram className="h-4 w-4 text-white group-hover:text-white" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors group">
                <Linkedin className="h-4 w-4 text-white group-hover:text-white" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors group">
                <Facebook className="h-4 w-4 text-white group-hover:text-white" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-display font-semibold text-white mb-6">Company</h4>
            <ul className="flex flex-col gap-4">
              <li><Link href="/about" className="text-white/70 hover:text-white text-sm transition-colors">About Us</Link></li>
              <li><Link href="/careers" className="text-white/70 hover:text-white text-sm transition-colors">Careers</Link></li>
              <li><Link href="/press" className="text-white/70 hover:text-white text-sm transition-colors">Press</Link></li>
              <li><Link href="/contact" className="text-white/70 hover:text-white text-sm transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-white mb-6">Product</h4>
            <ul className="flex flex-col gap-4">
              <li><Link href="/planner" className="text-white/70 hover:text-white text-sm transition-colors">AI Planner</Link></li>
              <li><Link href="/chatbot" className="text-white/70 hover:text-white text-sm transition-colors">Travel Chatbot</Link></li>
              <li><Link href="/destinations" className="text-white/70 hover:text-white text-sm transition-colors">Destinations</Link></li>
              <li><Link href="/pricing" className="text-white/70 hover:text-white text-sm transition-colors">Pricing</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-white mb-6">Legal</h4>
            <ul className="flex flex-col gap-4">
              <li><Link href="/terms" className="text-white/70 hover:text-white text-sm transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-white/70 hover:text-white text-sm transition-colors">Privacy Policy</Link></li>
              <li><Link href="/cookies" className="text-white/70 hover:text-white text-sm transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/50 text-sm">
            © {new Date().getFullYear()} Roamio. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

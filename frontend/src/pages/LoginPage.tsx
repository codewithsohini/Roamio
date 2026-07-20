import { Link, useLocation } from "wouter";
import { Plane, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { SiGoogle } from "react-icons/si";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await login(email, password);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-bl from-[#F8FAFF] to-[#EFF6FF] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[1000px] bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col-reverse md:flex-row min-h-[600px]">
        
        {/* Left Panel - Form */}
        <div className="w-full md:w-7/12 p-8 md:p-16 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            <div className="md:hidden flex items-center justify-center gap-2 mb-10">
              <Plane className="h-8 w-8 text-secondary-foreground fill-secondary-foreground" />
              <span className="font-display font-bold text-2xl text-secondary-foreground tracking-tight">Roamio</span>
            </div>

            <h1 className="font-display text-3xl font-bold text-secondary-foreground mb-2">Welcome back</h1>
            <p className="text-muted-foreground mb-8">Log in to access your itineraries.</p>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">{error}</div>}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com" 
                  className="w-full bg-white border border-input rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-foreground">Password</label>
                  <a href="#" className="text-xs text-primary font-semibold hover:underline">Forgot password?</a>
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full bg-white border border-input rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                    required
                  />
                  <button 
                    type="button" 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="remember" className="rounded border-input text-primary focus:ring-primary w-4 h-4" />
                <label htmlFor="remember" className="text-sm text-muted-foreground">Remember me</label>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-primary text-white font-semibold py-3 rounded-full hover:brightness-105 active:scale-[0.98] transition-all shadow-sm mt-6 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
              >
                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Log In"}
              </button>
            </form>

            <div className="mt-8 flex items-center gap-4">
              <div className="h-px bg-border flex-1"></div>
              <span className="text-sm text-muted-foreground">Or continue with</span>
              <div className="h-px bg-border flex-1"></div>
            </div>

            <button type="button" className="w-full mt-6 bg-white border border-input text-foreground font-medium py-3 rounded-full hover:bg-muted/50 transition-colors flex items-center justify-center gap-3 shadow-sm">
              <SiGoogle className="h-4 w-4 text-[#4285F4]" />
              Google
            </button>

            <div className="mt-8 text-center text-sm text-muted-foreground">
              Don't have an account? <Link href="/register" className="text-primary font-semibold hover:underline">Sign up</Link>
            </div>
          </div>
        </div>

        {/* Right Panel - Decorative */}
        <div className="hidden md:flex md:w-5/12 bg-secondary-foreground p-12 flex-col justify-between relative overflow-hidden text-white">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/20 to-transparent pointer-events-none"></div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-500/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 -left-12 w-48 h-48 bg-primary/40 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex justify-end">
            <Link href="/" className="flex items-center gap-2 group cursor-pointer inline-flex">
              <Plane className="h-6 w-6 text-white fill-white" />
              <span className="font-display font-bold text-xl tracking-tight">Roamio</span>
            </Link>
          </div>

          <div className="relative z-10 mt-auto mb-12 text-right">
            <h2 className="font-display text-4xl font-bold leading-tight mb-4">
              Your next adventure is one click away.
            </h2>
            <p className="text-white/80 text-lg">
              Welcome back. The world is waiting for you.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

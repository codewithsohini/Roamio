import { Link, useLocation } from "wouter";
import { Plane, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { SiGoogle } from "react-icons/si";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      await register(email, password);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFF] to-[#EFF6FF] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[1000px] bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left Panel - Decorative */}
        <div className="hidden md:flex md:w-5/12 bg-secondary-foreground p-12 flex-col justify-between relative overflow-hidden text-white">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/20 to-transparent pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-500/30 rounded-full blur-3xl"></div>
          <div className="absolute top-1/4 -right-12 w-48 h-48 bg-primary/40 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <Link href="/" className="flex items-center gap-2 group cursor-pointer inline-flex">
              <Plane className="h-6 w-6 text-white fill-white" />
              <span className="font-display font-bold text-xl tracking-tight">Roamio</span>
            </Link>
          </div>

          <div className="relative z-10 mt-12">
            <h2 className="font-display text-4xl font-bold leading-tight mb-6">
              Join millions of travelers.
            </h2>
            <p className="text-white/80 text-lg leading-relaxed mb-8">
              Create your account to start planning smarter, perfectly optimized itineraries in seconds.
            </p>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 max-w-[280px]">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shrink-0"></div>
                <div>
                  <p className="font-semibold text-sm">Bali, Indonesia</p>
                  <p className="text-white/60 text-xs">Saved to wishlist</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 max-w-[280px] ml-8">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shrink-0"></div>
                <div>
                  <p className="font-semibold text-sm">Tokyo, Japan</p>
                  <p className="text-white/60 text-xs">10-day itinerary</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="w-full md:w-7/12 p-8 md:p-16 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            <div className="md:hidden flex items-center justify-center gap-2 mb-10">
              <Plane className="h-8 w-8 text-secondary-foreground fill-secondary-foreground" />
              <span className="font-display font-bold text-2xl text-secondary-foreground tracking-tight">Roamio</span>
            </div>

            <h1 className="font-display text-3xl font-bold text-secondary-foreground mb-2">Create an account</h1>
            <p className="text-muted-foreground mb-8">Enter your details to get started.</p>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">{error}</div>}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Johnson" 
                  className="w-full bg-white border border-input rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                  required
                />
              </div>

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
                <label className="text-sm font-semibold text-foreground">Password</label>
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

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Confirm Password</label>
                <div className="relative">
                  <input 
                    type={showConfirm ? "text" : "password"} 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="w-full bg-white border border-input rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                    required
                  />
                  <button 
                    type="button" 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-primary text-white font-semibold py-3 rounded-full hover:brightness-105 active:scale-[0.98] transition-all shadow-sm mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
              >
                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Create Account"}
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
              Already have an account? <Link href="/login" className="text-primary font-semibold hover:underline">Log in</Link>
            </div>
            
            <p className="mt-6 text-center text-xs text-muted-foreground">
              By creating an account, you agree to our <a href="#" className="underline">Terms of Service</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

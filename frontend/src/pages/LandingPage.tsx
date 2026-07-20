import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { 
  ArrowRight, Wand2, DollarSign, MapPin, Zap, Globe, Users,
  CloudSun, Navigation, Camera, Calendar, Star
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative min-h-[100dvh] pt-24 pb-16 flex items-center overflow-hidden">
          {/* Gradient background with subtle cloud-like shapes */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#EBF5FF] to-[#F0FDF4] -z-20"></div>
          
          {/* Decorative shapes */}
          <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-white/40 rounded-full blur-3xl -z-10 pointer-events-none mix-blend-overlay"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

          <div className="container mx-auto px-6 max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              
              {/* Hero Copy */}
              <div className="max-w-xl relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-white/80 shadow-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <Wand2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-secondary-foreground">✨ AI-Powered Planning</span>
                </div>
                
                <h1 className="font-display text-5xl md:text-[64px] font-bold leading-[1.1] tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                  <span className="text-secondary-foreground block">Plan Smarter.</span>
                  <span className="text-primary block">Travel Better.</span>
                </h1>
                
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                  Roamio uses AI to build personalized travel itineraries in minutes. Just tell us where you want to go — we'll handle the rest.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
                  <Link href="/planner" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground text-base font-semibold px-8 py-4 rounded-full shadow-lg shadow-primary/25 hover:brightness-105 active:scale-95 transition-all">
                    Start Planning
                  </Link>
                </div>
              </div>

              {/* Hero Visual / Composition */}
              <div className="relative w-full aspect-[4/3] lg:aspect-square flex items-center justify-center animate-in fade-in zoom-in-95 duration-1000 delay-300">
                <div className="absolute inset-0 bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl shadow-xl shadow-primary/5 p-6 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary-foreground flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-secondary-foreground text-sm">Next Destination</p>
                        <p className="text-muted-foreground text-xs">AI suggestions ready</p>
                      </div>
                    </div>
                  </div>

                  {/* Mock stacked cards */}
                  <div className="relative flex-1 mt-6">
                    {/* Card 3 (back) */}
                    <div className="absolute inset-x-8 top-8 bottom-4 bg-white rounded-2xl shadow-sm border border-border/50 scale-90 translate-y-8 rotate-3 opacity-60"></div>
                    {/* Card 2 (middle) */}
                    <div className="absolute inset-x-4 top-4 bottom-8 bg-white rounded-2xl shadow-sm border border-border/60 scale-95 translate-y-4 -rotate-2 opacity-80"></div>
                    {/* Card 1 (front) */}
                    <div className="absolute inset-0 bg-white rounded-2xl shadow-md border border-border overflow-hidden flex flex-col">
                      <div className="h-32 bg-gradient-to-r from-teal-400 to-emerald-400 p-4 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
                        <div className="relative z-10 flex justify-between items-start text-white">
                          <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium border border-white/30">
                            10 Days
                          </span>
                          <CloudSun className="h-6 w-6 opacity-80" />
                        </div>
                        <h3 className="relative z-10 font-display text-2xl font-bold text-white tracking-tight">Bali, Indonesia</h3>
                      </div>
                      <div className="p-4 flex-1 flex flex-col gap-3">
                        <div className="flex items-center gap-3 text-sm text-foreground">
                          <Navigation className="h-4 w-4 text-primary" />
                          <span className="font-medium">Ubud Monkey Forest</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-foreground">
                          <Camera className="h-4 w-4 text-primary" />
                          <span className="font-medium">Tegallalang Rice Terraces</span>
                        </div>
                        <div className="mt-auto flex gap-2">
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md font-medium">Culture</span>
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md font-medium">Nature</span>
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md font-medium">Food</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="py-24 bg-white relative">
          <div className="container mx-auto px-6 max-w-7xl">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="font-display text-3xl md:text-4xl font-semibold text-secondary-foreground tracking-tight mb-4">
                Everything you need to travel smarter
              </h2>
              <p className="text-muted-foreground text-lg">
                Ditch the 20 open tabs and confusing spreadsheets. Roamio brings all your planning into one calm, intelligent space.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { title: "AI Itinerary Builder", icon: Wand2, desc: "Generate second-by-second plans based on your pace, interests, and budget." },
                { title: "Budget Optimizer", icon: DollarSign, desc: "Track expenses, split costs, and get AI suggestions on where to save money." },
                { title: "Local Recommendations", icon: MapPin, desc: "Discover hidden gems and highly-rated restaurants away from the tourist traps." },
                { title: "Real-time Updates", icon: Zap, desc: "Flight delays? Rain? The AI instantly suggests alternative activities." },
                { title: "Multi-city Planning", icon: Globe, desc: "Seamlessly map out European tours or cross-country road trips in one view." },
                { title: "Collaborative Planning", icon: Users, desc: "Invite friends to vote on activities and add their own recommendations." }
              ].map((feature, i) => (
                <div key={i} className="bg-white rounded-2xl p-8 shadow-sm border border-border hover:shadow-md hover:border-l-4 hover:border-l-primary transition-all group duration-300">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-secondary-foreground mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* POPULAR DESTINATIONS */}
        <section id="destinations" className="py-24 bg-gradient-to-b from-[#F8FAFF] to-white">
          <div className="container mx-auto px-6 max-w-7xl">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div>
                <h2 className="font-display text-3xl md:text-4xl font-semibold text-secondary-foreground tracking-tight mb-4">
                  Popular Destinations
                </h2>
                <p className="text-muted-foreground text-lg">Where will AI take you next?</p>
              </div>
              <Link href="/destinations" className="text-primary font-semibold hover:text-primary/80 flex items-center gap-1 group">
                View all <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="flex md:grid md:grid-cols-4 gap-6 overflow-x-auto pb-8 snap-x snap-mandatory hide-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
              {[
                { name: "Bali, Indonesia", vibe: "warm tropical vibes", tags: "Culture · Nature", gradient: "from-amber-500 via-orange-400 to-emerald-600" },
                { name: "Tokyo, Japan", vibe: "urban adventure", tags: "Food · Shopping", gradient: "from-indigo-600 via-purple-600 to-pink-500" },
                { name: "Paris, France", vibe: "romance and culture", tags: "Art · History", gradient: "from-rose-400 via-pink-300 to-orange-200" },
                { name: "Santorini, Greece", vibe: "island escape", tags: "Beach · Relaxation", gradient: "from-blue-600 via-sky-400 to-cyan-300" }
              ].map((dest, i) => (
                <Link key={i} href="/planner" className={`min-w-[240px] md:min-w-0 h-[320px] rounded-2xl p-6 flex flex-col justify-end relative overflow-hidden group cursor-pointer shadow-sm hover:shadow-lg transition-all snap-center`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${dest.gradient} opacity-90 transition-transform duration-700 group-hover:scale-105`}></div>
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300"></div>
                  
                  <div className="relative z-10 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <span className="text-white/90 text-xs font-semibold uppercase tracking-wider mb-2 block">{dest.tags}</span>
                    <h3 className="font-display text-2xl font-bold text-white tracking-tight">{dest.name}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6 max-w-7xl">
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-secondary-foreground tracking-tight mb-16 text-center">
              Travelers love Roamio
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { 
                  quote: "Roamio planned my entire 10-day Japan trip in under 5 minutes. Absolutely mind-blowing.",
                  author: "Sarah K.", role: "Designer", color: "bg-purple-100 text-purple-700" 
                },
                { 
                  quote: "The budget breakdown alone saved me $400. I'd never plan a trip another way.",
                  author: "James R.", role: "Freelancer", color: "bg-blue-100 text-blue-700" 
                },
                { 
                  quote: "Family of 5, complex itinerary, zero stress. Roamio handled everything perfectly.",
                  author: "Priya M.", role: "Parent", color: "bg-emerald-100 text-emerald-700" 
                }
              ].map((testimonial, i) => (
                <div key={i} className="bg-white rounded-2xl p-8 shadow-sm border border-border">
                  <div className="flex gap-1 mb-6">
                    {[...Array(5)].map((_, j) => <Star key={j} className="h-5 w-5 fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-foreground text-lg mb-8 leading-relaxed">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full ${testimonial.color} flex items-center justify-center font-bold text-lg`}>
                      {testimonial.author.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-secondary-foreground">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6 max-w-5xl">
            <div className="bg-secondary-foreground rounded-[2rem] p-12 text-center relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/20 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>
              
              <div className="relative z-10">
                <h2 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
                  Ready to explore the world?
                </h2>
                <p className="text-primary-100 text-lg md:text-xl max-w-2xl mx-auto mb-10 text-white/80">
                  Join thousands of travelers who have already discovered a smarter way to plan their adventures.
                </p>
                <Link href="/register" className="inline-flex items-center justify-center bg-white text-secondary-foreground font-semibold px-8 py-4 rounded-full text-lg shadow-lg hover:bg-secondary transition-colors active:scale-95">
                  Start Planning for Free
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

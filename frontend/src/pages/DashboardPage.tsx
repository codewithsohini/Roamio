import { Link, useLocation } from "wouter";
import { 
  Plane, Home, Map, Wand2, MessageCircle, Heart, Settings2, 
  LogOut, Plus, Building, Utensils, BarChart, Calendar, Loader2
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

type Journey = {
  trip_id: string;
  destination: string;
  days: number;
  companions: string;
  status: "pending" | "completed" | "failed";
  created_at: string;
};

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { name: "Dashboard", icon: Home, path: "/dashboard" },
    { name: "AI Planner", icon: Wand2, path: "/planner" },
    { name: "Chatbot", icon: MessageCircle, path: "/chatbot" },
    { name: "Settings", icon: Settings2, path: "/settings" },
  ];

  const initial = user?.email.charAt(0).toUpperCase() || "U";
  const name = user?.email.split('@')[0] || "User";

  return (
    <aside className="w-[240px] bg-white border-r border-border flex-col justify-between hidden md:flex fixed h-screen top-0 left-0 z-40">
      <div>
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <Plane className="h-6 w-6 text-secondary-foreground fill-secondary-foreground" />
            <span className="font-display font-bold text-xl tracking-tight text-secondary-foreground">Roamio</span>
          </Link>
        </div>

        <div className="px-4 pb-6">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border/50">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
              {initial}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-secondary-foreground truncate">{name}</p>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-accent"></span>
                <span className="text-[10px] font-semibold text-accent uppercase tracking-wide">Premium</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="px-3 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.name} href={item.path} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}>
                <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="p-4">
        <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-colors text-sm font-medium">
          <LogOut className="h-5 w-5" />
          Log out
        </button>
      </div>
    </aside>
  );
}

export default function DashboardPage() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const { user } = useAuth();
  
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadJourneys() {
      try {
        const res = await apiFetch("/api/journeys");
        if (res.ok) {
          const data = await res.json();
          setJourneys(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadJourneys();
  }, []);

  const name = user?.email.split('@')[0] || "User";
  const initial = name.charAt(0).toUpperCase();

  const uniqueDestinations = new Set(journeys.map(j => j.destination)).size;

  return (
    <div className="min-h-screen bg-[#F8FAFF] font-sans flex">
      <Sidebar />
      
      <main className="flex-1 md:ml-[240px] p-6 md:p-10 pb-24">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between mb-8 bg-white p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-secondary-foreground fill-secondary-foreground" />
            <span className="font-display font-bold text-xl tracking-tight text-secondary-foreground">Roamio</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
            {initial}
          </div>
        </div>

        <header className="mb-10">
          <h1 className="font-display text-3xl font-bold text-secondary-foreground mb-1">Good morning, {name} 👋</h1>
          <p className="text-muted-foreground">{today}</p>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Trips Planned", value: isLoading ? "-" : journeys.length.toString() },
            { label: "Destinations", value: isLoading ? "-" : uniqueDestinations.toString() },
            { label: "Money Saved", value: "$12,400" },
            { label: "Upcoming", value: isLoading ? "-" : journeys.filter(j => j.status === 'completed').length.toString() }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-center">
              <p className="text-muted-foreground text-sm font-medium mb-1">{stat.label}</p>
              <p className="font-display text-2xl font-bold text-secondary-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            {/* AI CTA */}
            <div className="bg-gradient-to-r from-primary/90 to-primary rounded-3xl p-8 text-white shadow-md relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
              
              <div className="relative z-10 text-center sm:text-left">
                <h2 className="font-display text-2xl font-bold mb-2">Plan a New Trip with AI</h2>
                <p className="text-primary-100 max-w-sm">Tell Roamio where you want to go, and get a complete itinerary in seconds.</p>
              </div>
              
              <Link href="/planner" className="relative z-10 whitespace-nowrap bg-white text-primary font-semibold px-6 py-3 rounded-full hover:bg-secondary transition-colors shadow-sm active:scale-95">
                Start Planning
              </Link>
            </div>

            {/* Recent Trips */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl font-bold text-secondary-foreground">Recent Trips</h3>
                <Link href="/trips" className="text-sm font-semibold text-primary hover:underline">View all</Link>
              </div>
              
              <div className="flex overflow-x-auto gap-4 pb-4 -mx-6 px-6 md:mx-0 md:px-0 snap-x hide-scrollbar">
                {isLoading ? (
                  Array.from({length: 3}).map((_, i) => (
                    <div key={i} className="min-w-[280px] bg-white rounded-2xl overflow-hidden border border-border shadow-sm snap-start animate-pulse">
                      <div className="h-32 bg-muted"></div>
                      <div className="p-5">
                        <div className="h-6 w-1/2 bg-muted rounded mb-2"></div>
                        <div className="h-4 w-1/3 bg-muted rounded"></div>
                      </div>
                    </div>
                  ))
                ) : journeys.length === 0 ? (
                  <div className="w-full bg-white p-8 rounded-2xl border border-border text-center flex flex-col items-center justify-center text-muted-foreground">
                    <Map className="h-10 w-10 mb-3 opacity-20" />
                    <p className="font-medium text-foreground mb-1">No trips yet</p>
                    <p className="text-sm mb-4">Your planned itineraries will appear here.</p>
                    <Link href="/planner" className="text-primary text-sm font-semibold hover:underline">Plan your first trip</Link>
                  </div>
                ) : (
                  journeys.slice(0, 5).map((trip, i) => {
                    const gradients = [
                      "from-amber-400 to-emerald-500",
                      "from-indigo-500 to-purple-600",
                      "from-rose-400 to-orange-300",
                      "from-blue-400 to-cyan-500"
                    ];
                    const bg = gradients[i % gradients.length];
                    const dateStr = new Date(trip.created_at).toLocaleDateString();
                    
                    return (
                      <Link key={trip.trip_id} href={`/trip-results?tripId=${trip.trip_id}`} className="min-w-[280px] bg-white rounded-2xl overflow-hidden border border-border shadow-sm snap-start group cursor-pointer block">
                        <div className={`h-32 bg-gradient-to-br ${bg} relative`}>
                          <div className={`absolute top-3 left-3 backdrop-blur text-xs font-bold px-2.5 py-1 rounded-md shadow-sm ${
                            trip.status === 'completed' ? "bg-white/90 text-secondary-foreground" :
                            trip.status === 'pending' ? "bg-amber-400/90 text-amber-950" :
                            "bg-red-500/90 text-white"
                          }`}>
                            {trip.status === 'completed' ? "Completed" : trip.status === 'pending' ? "Generating..." : "Failed"}
                          </div>
                        </div>
                        <div className="p-5">
                          <h4 className="font-display font-bold text-lg text-secondary-foreground mb-1 group-hover:text-primary transition-colors truncate">{trip.destination}</h4>
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" /> {trip.days} Days • {dateStr}
                          </p>
                        </div>
                      </Link>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Quick Actions */}
            <div>
              <h3 className="font-display text-xl font-bold text-secondary-foreground mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/planner" className="bg-white p-4 rounded-2xl border border-border hover:border-primary/50 hover:shadow-md transition-all flex flex-col gap-3 group">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Wand2 className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-sm text-secondary-foreground">Generate Itinerary</span>
                </Link>
                <Link href="/chatbot" className="bg-white p-4 rounded-2xl border border-border hover:border-primary/50 hover:shadow-md transition-all flex flex-col gap-3 group">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                    <Building className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-sm text-secondary-foreground">Find Hotels</span>
                </Link>
                <Link href="/chatbot" className="bg-white p-4 rounded-2xl border border-border hover:border-primary/50 hover:shadow-md transition-all flex flex-col gap-3 group">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                    <Utensils className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-sm text-secondary-foreground">Explore Restaurants</span>
                </Link>
                <Link href="/chatbot" className="bg-white p-4 rounded-2xl border border-border hover:border-primary/50 hover:shadow-md transition-all flex flex-col gap-3 group">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                    <BarChart className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-sm text-secondary-foreground">Plan Budget</span>
                </Link>
              </div>
            </div>

            {/* Saved Itineraries List */}
            <div className="bg-white rounded-3xl border border-border shadow-sm p-6">
              <h3 className="font-display text-lg font-bold text-secondary-foreground mb-4">Saved Itineraries</h3>
              <div className="flex flex-col gap-4">
                {isLoading ? (
                   <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 text-muted-foreground animate-spin" /></div>
                ) : journeys.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No saved itineraries</p>
                ) : (
                  journeys.slice(0, 4).map((item) => (
                    <Link key={item.trip_id} href={`/trip-results?tripId=${item.trip_id}`} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-xl transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                          <Map className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="truncate">
                          <p className="font-semibold text-sm text-secondary-foreground group-hover:text-primary transition-colors truncate">{item.destination}</p>
                          <p className="text-xs text-muted-foreground">{item.days} days · {new Date(item.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <button className="text-muted-foreground hover:text-primary p-2 shrink-0">
                        <Settings2 className="h-4 w-4" />
                      </button>
                    </Link>
                  ))
                )}
              </div>
              <Link href="/planner" className="w-full mt-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5 rounded-lg transition-colors flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" /> Create Blank Itinerary
              </Link>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}

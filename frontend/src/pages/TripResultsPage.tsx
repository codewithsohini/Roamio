import { Link, useLocation } from "wouter";
import { Sidebar } from "@/pages/DashboardPage";
import { useState, useEffect } from "react";
import { 
  Calendar, DollarSign, MapPin, Download, Share, MessageCircle, 
  Clock, Coffee, Camera, Utensils, Navigation, CheckCircle2,
  Building, ShoppingBag, ShieldAlert, ChevronDown, Star,
  Car, Compass, Loader2
} from "lucide-react";
import { apiFetch } from "@/lib/api";

// Types match the FORMATTER_PROMPT schema exactly.
type Itinerary = {
  trip_summary?: {
    destination: string;
    duration_days: number;
    travel_style: string;
    budget_tier: string;
  };
  daywise_itinerary?: Array<{
    day: number;
    theme: string;
    activities: string[];   // plain strings, one per activity
    why: string;
  }>;
  food?: Array<{
    name: string;
    type: string;
    description: string;
    why: string;
  }>;
  stay?: Array<{
    name: string;
    area: string;
    description: string;
    why: string;
  }>;
  hidden_gems?: Array<{
    name: string;
    description: string;
    why: string;
  }>;
  shopping?: Array<{
    name: string;
    category: string;
    description: string;
    why: string;
  }>;
  estimated_budget?: {
    accommodation: string;  // e.g. "$30–50/night"
    food: string;
    transport: string;
    activities: string;
    total: string;
  };
  travel_tips?: string[];   // plain strings
  culture?: Array<{
    tip: string;
    why: string;
  }>;
  why_this_plan?: string;
};

type JourneyResponse = {
  trip_id: string;
  destination: string;
  days: number;
  companions: string;
  status: "pending" | "completed" | "failed";
  itinerary: Itinerary | null;
  created_at: string;
};

export default function TripResultsPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const tripId = searchParams.get("tripId");

  const [activeTab, setActiveTab] = useState("itinerary");
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({1: true, 2: true, 3: false});

  const [journey, setJourney] = useState<JourneyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout>;

    const startTime = Date.now();
    const MAX_POLL_MS = 90_000; // stop polling after 90 seconds

    async function loadTrip() {
      try {
        const res = await apiFetch(`/api/journeys/${tripId}`);
        if (!res.ok || cancelled) return;
        const data: JourneyResponse = await res.json();
        setJourney(data);

        if (data.itinerary?.daywise_itinerary?.length) {
          setExpandedDays({ [data.itinerary.daywise_itinerary[0].day]: true });
        }

        // Poll every 3s while pending, but give up after 90s
        if (data.status === "pending" && Date.now() - startTime < MAX_POLL_MS) {
          pollTimer = setTimeout(loadTrip, 3000);
        } else if (data.status === "pending") {
          // Timed out — treat as failed in the UI
          setJourney({ ...data, status: "failed" });
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadTrip();
    return () => {
      cancelled = true;
      clearTimeout(pollTimer);
    };
  }, [tripId]);

  const toggleDay = (day: number) => {
    setExpandedDays(prev => ({...prev, [day]: !prev[day]}));
  };

  const tabs = [
    { id: "itinerary", label: "Itinerary" },
    { id: "hotels", label: "Hotels" },
    { id: "food", label: "Restaurants" },
    { id: "attractions", label: "Attractions" },
    { id: "budget", label: "Budget" }
  ];

  if (!tripId) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] font-sans flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm">
          <h2 className="text-xl font-bold mb-2">No trip specified</h2>
          <Link href="/dashboard" className="text-primary hover:underline">Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] font-sans flex">
        <Sidebar />
        <main className="flex-1 md:ml-[240px] flex items-center justify-center">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground font-medium">Loading itinerary...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] font-sans flex">
        <Sidebar />
        <main className="flex-1 md:ml-[240px] flex items-center justify-center">
          <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-border">
            <ShieldAlert className="h-10 w-10 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Trip not found</h2>
            <Link href="/dashboard" className="text-primary hover:underline">Return to Dashboard</Link>
          </div>
        </main>
      </div>
    );
  }

  if (journey.status === 'pending') {
    return (
      <div className="min-h-screen bg-[#F8FAFF] font-sans flex">
        <Sidebar />
        <main className="flex-1 md:ml-[240px] flex items-center justify-center">
          <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-border flex flex-col items-center">
            <Loader2 className="h-10 w-10 text-amber-500 animate-spin mb-4" />
            <h2 className="text-xl font-bold mb-2 text-secondary-foreground">Generating Itinerary</h2>
            <p className="text-muted-foreground mb-4">Roamio is building your perfect trip to {journey.destination}...</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-white rounded-lg hover:brightness-105 transition-colors text-sm font-semibold">
              Refresh Status
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (journey.status === 'failed') {
    return (
      <div className="min-h-screen bg-[#F8FAFF] font-sans flex">
        <Sidebar />
        <main className="flex-1 md:ml-[240px] flex items-center justify-center">
          <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-border">
            <ShieldAlert className="h-10 w-10 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2 text-secondary-foreground">Generation Failed</h2>
            <p className="text-muted-foreground mb-4">There was an error creating this trip.</p>
            <Link href="/planner" className="px-4 py-2 bg-primary text-white rounded-lg hover:brightness-105 transition-colors text-sm font-semibold inline-block">
              Try Again
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const it = journey.itinerary;
  const isReady = !!it;

  return (
    <div className="min-h-screen bg-[#F8FAFF] font-sans flex">
      <Sidebar />
      
      <main className="flex-1 md:ml-[240px] flex flex-col h-screen overflow-hidden">
        
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          
          {/* Header Banner */}
          <div className="bg-secondary-foreground text-white pt-12 pb-8 px-6 md:px-10 relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-primary/30 to-teal-500/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none mix-blend-overlay"></div>
            
            <div className="relative z-10 max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold tracking-wide border border-white/10 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> AI Generated
                  </span>
                  <span className="text-white/70 text-sm">Created {new Date(journey.created_at).toLocaleDateString()}</span>
                </div>
                <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-2">
                  Your {it?.trip_summary?.destination || journey.destination} Itinerary
                </h1>
                <p className="text-white/80 text-lg flex items-center gap-4">
                  <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {it?.trip_summary?.duration_days || journey.days} Days</span>
                  <span className="flex items-center gap-1.5"><DollarSign className="h-4 w-4" /> {it?.trip_summary?.budget_tier || 'Custom'}</span>
                  {it?.trip_summary?.travel_style && (
                    <span className="flex items-center gap-1.5 opacity-80 text-sm">| {it.trip_summary.travel_style}</span>
                  )}
                </p>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-medium px-4 py-2.5 rounded-xl transition-colors text-sm">
                  <Download className="h-4 w-4" /> PDF
                </button>
                <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-medium px-4 py-2.5 rounded-xl transition-colors text-sm">
                  <Share className="h-4 w-4" /> Share
                </button>
                <Link href="/chatbot" className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary text-white font-semibold px-5 py-2.5 rounded-xl hover:brightness-105 transition-colors shadow-lg text-sm">
                  <MessageCircle className="h-4 w-4" /> Ask AI
                </Link>
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto w-full px-6 md:px-10 py-8">
            
            {/* Tabs */}
            <div className="flex overflow-x-auto gap-2 mb-8 border-b border-border pb-px hide-scrollbar sticky top-0 bg-[#F8FAFF] z-20 pt-2">
              {tabs.map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.id 
                      ? "border-primary text-primary" 
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content: Itinerary */}
            {activeTab === "itinerary" && isReady && (
              <div className="space-y-6">
                {it.daywise_itinerary?.map((daySchedule, idx) => {
                  const colors = ["border-primary", "border-accent", "border-secondary-foreground", "border-emerald-500", "border-orange-400"];
                  const dayColor = colors[idx % colors.length];

                  return (
                    <div key={daySchedule.day} className={`bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col`}>
                      <button 
                        onClick={() => toggleDay(daySchedule.day)}
                        className="w-full flex items-center justify-between p-6 bg-white hover:bg-muted/30 transition-colors text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl bg-muted flex items-center justify-center border-l-4 ${dayColor}`}>
                            <span className="font-display font-bold text-lg text-secondary-foreground">{daySchedule.day}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-primary mb-0.5">DAY {daySchedule.day}</p>
                            <h3 className="font-display text-xl font-bold text-secondary-foreground">{daySchedule.theme}</h3>
                          </div>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${expandedDays[daySchedule.day] ? "rotate-180" : ""}`} />
                      </button>
                      
                      {expandedDays[daySchedule.day] && (
                        <div className="p-6 pt-0 pl-8 md:pl-24 border-t border-border/50 relative">
                          {/* Vertical line connecting timeline items */}
                          <div className="absolute left-10 md:left-26 top-4 bottom-8 w-px bg-border/80"></div>
                          
                          <div className="space-y-4 mt-6">
                            {daySchedule.activities.map((activity, actIdx) => (
                              <div key={actIdx} className="relative pl-8">
                                <div className="absolute left-[-5px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-primary"></div>
                                <div className="bg-muted/30 border border-border rounded-xl p-4 flex-1 shadow-sm flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-white border border-border flex items-center justify-center shrink-0 text-primary">
                                    <MapPin className="h-4 w-4" />
                                  </div>
                                  <p className="text-sm text-secondary-foreground leading-relaxed">{activity}</p>
                                </div>
                              </div>
                            ))}
                            {daySchedule.why && (
                              <p className="text-xs text-primary/80 bg-primary/5 p-3 rounded-lg italic ml-8">
                                {daySchedule.why}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Content: Hotels */}
            {activeTab === "hotels" && isReady && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {it.stay?.map((hotel, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                    <div className="h-40 bg-gradient-to-br from-indigo-100 to-primary/20 flex items-center justify-center text-primary/40 relative">
                      <Building className="h-10 w-10" />
                      <div className="absolute bottom-2 left-2 right-2 text-center text-xs font-semibold text-primary/60 bg-white/50 backdrop-blur-sm rounded py-1">
                        {hotel.area}
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="font-bold text-secondary-foreground text-lg leading-tight mb-1">{hotel.name}</h3>
                      <span className="inline-block px-2 py-1 bg-accent/10 text-accent text-xs font-bold rounded mb-3 w-fit">
                        {hotel.area}
                      </span>
                      <p className="text-sm text-muted-foreground mb-3">{hotel.description}</p>
                      <p className="text-xs text-primary bg-primary/5 p-2 rounded mt-auto italic">
                        Why: {hotel.why}
                      </p>
                    </div>
                  </div>
                ))}
                {!it.stay?.length && (
                  <p className="col-span-full text-center text-muted-foreground py-8 border border-dashed rounded-xl">No accommodation recommendations found.</p>
                )}
              </div>
            )}

            {/* Content: Food */}
            {activeTab === "food" && isReady && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {it.food?.map((food, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex hover:shadow-md transition-shadow">
                    <div className="w-32 bg-orange-100 flex items-center justify-center shrink-0">
                      <Utensils className="h-8 w-8 text-orange-400" />
                    </div>
                    <div className="p-5 flex-1">
                      <h3 className="font-bold text-secondary-foreground text-lg mb-1">{food.name}</h3>
                      <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded mb-3 inline-block">{food.type}</span>
                      <p className="text-sm text-muted-foreground mb-3">{food.description}</p>
                      <p className="text-xs text-secondary-foreground/80 italic border-l-2 border-primary pl-2">
                        {food.why}
                      </p>
                    </div>
                  </div>
                ))}
                {!it.food?.length && (
                  <p className="col-span-full text-center text-muted-foreground py-8 border border-dashed rounded-xl">No food recommendations found.</p>
                )}
              </div>
            )}

            {/* Content: Attractions (Hidden Gems + Shopping + Culture) */}
            {activeTab === "attractions" && isReady && (
              <div className="space-y-8">
                {it.hidden_gems && it.hidden_gems.length > 0 && (
                  <div>
                    <h3 className="font-display text-2xl font-bold text-secondary-foreground mb-4 flex items-center gap-2">
                      <Compass className="h-6 w-6 text-primary" /> Hidden Gems
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {it.hidden_gems.map((gem, i) => (
                        <div key={i} className="bg-white border border-border p-5 rounded-xl shadow-sm">
                          <h4 className="font-bold text-lg text-secondary-foreground mb-2">{gem.name}</h4>
                          <p className="text-sm text-muted-foreground mb-3">{gem.description}</p>
                          <p className="text-xs font-medium text-primary bg-primary/5 p-2 rounded">
                            {gem.why}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {it.shopping && it.shopping.length > 0 && (
                  <div>
                    <h3 className="font-display text-2xl font-bold text-secondary-foreground mb-4 flex items-center gap-2">
                      <ShoppingBag className="h-6 w-6 text-accent" /> Shopping
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {it.shopping.map((shop, i) => (
                        <div key={i} className="bg-white border border-border p-5 rounded-xl shadow-sm">
                          <h4 className="font-bold text-lg text-secondary-foreground mb-1">{shop.name}</h4>
                          <span className="text-xs font-semibold bg-accent/10 text-accent px-2 py-0.5 rounded mb-3 inline-block">
                            {shop.category}
                          </span>
                          <p className="text-sm text-muted-foreground mt-2">{shop.description}</p>
                          {shop.why && <p className="text-xs text-primary bg-primary/5 p-2 rounded mt-3 italic">{shop.why}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {it.culture && it.culture.length > 0 && (
                  <div>
                    <h3 className="font-display text-2xl font-bold text-secondary-foreground mb-4 flex items-center gap-2">
                      <Building className="h-6 w-6 text-emerald-500" /> Local Culture
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {it.culture.map((c, i) => (
                        <div key={i} className="bg-white border border-border p-5 rounded-xl shadow-sm">
                          <p className="text-sm font-semibold text-secondary-foreground mb-2">{c.tip}</p>
                          {c.why && <p className="text-xs text-muted-foreground italic">{c.why}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Content: Budget */}
            {activeTab === "budget" && isReady && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-border shadow-sm p-6 md:p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-secondary-foreground">Budget Breakdown</h2>
                      <p className="text-muted-foreground">Estimated cost for your trip</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-accent uppercase tracking-wider mb-1">Total Estimated</p>
                      <p className="font-display text-3xl font-bold text-secondary-foreground">
                        {it.estimated_budget?.total || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Budget rows — values are strings like "$30–50/night" */}
                  <div className="space-y-4">
                    {[
                      { cat: "Accommodation", value: it.estimated_budget?.accommodation, color: "bg-primary" },
                      { cat: "Food & Dining",  value: it.estimated_budget?.food,          color: "bg-orange-400" },
                      { cat: "Activities",     value: it.estimated_budget?.activities,    color: "bg-accent" },
                      { cat: "Transport",      value: it.estimated_budget?.transport,     color: "bg-purple-500" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full shrink-0 ${item.color}`} />
                        <span className="text-sm font-medium text-secondary-foreground w-36">{item.cat}</span>
                        <span className="text-sm text-muted-foreground">{item.value || "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {it.travel_tips && it.travel_tips.length > 0 && (
                  <div>
                    <h3 className="font-display text-xl font-bold text-secondary-foreground mb-4 flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-primary" /> Travel Tips
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {it.travel_tips.map((tip, i) => (
                        <div key={i} className="bg-white rounded-xl border border-border p-5 flex items-start gap-3">
                          <div className="p-2 bg-blue-100 text-primary rounded-lg shrink-0">
                            <ShieldAlert className="h-4 w-4" />
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
          </div>
        </div>
      </main>
    </div>
  );
}

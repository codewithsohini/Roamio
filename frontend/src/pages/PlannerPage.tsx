import { Link, useLocation } from "wouter";
import { Sidebar } from "@/pages/DashboardPage";
import { useState, useRef, useEffect } from "react";
import { Wand2, Send, MapPin, Calendar, Heart, Compass, ClipboardList, Check, Utensils, RefreshCcw } from "lucide-react";
import { streamPost } from "@/lib/api";

type PlannerState = "destination" | "days" | "companions" | "confirm" | "streaming" | "error";

export default function PlannerPage() {
  const [, setLocation] = useLocation();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<PlannerState>("destination");
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState("");
  const [companions, setCompanions] = useState("");
  const [tripId, setTripId] = useState("");

  const [messages, setMessages] = useState<{ type: string; text: string; isError?: boolean }[]>([
    { type: "ai", text: "Hi! I'm Roamio AI 🌍 Let's plan your perfect trip. First — where would you like to go?" }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e?: React.FormEvent, textOverride?: string) => {
    if (e) e.preventDefault();
    const text = textOverride !== undefined ? textOverride : inputValue;
    if (!text.trim() && step !== "confirm" && step !== "error") return;
    
    if (text.trim()) {
      setMessages(prev => [...prev, { type: "user", text: text.trim() }]);
    }
    setInputValue("");
    
    if (step === "destination") {
      setDestination(text.trim());
      setStep("days");
      setTimeout(() => {
        setMessages(prev => [...prev, { type: "ai", text: `Amazing choice! 🌴 How many days are you planning for?` }]);
      }, 500);
    } else if (step === "days") {
      const parsedDays = parseInt(text.replace(/\D/g, '')) || text.trim();
      setDays(parsedDays.toString());
      setStep("companions");
      setTimeout(() => {
        setMessages(prev => [...prev, { type: "ai", text: `Perfect! ${parsedDays} days. Who are you traveling with? (e.g., Solo, Partner, Family, Friends)` }]);
      }, 500);
    } else if (step === "companions") {
      setCompanions(text.trim());
      setStep("confirm");
      setTimeout(() => {
        setMessages(prev => [...prev, { type: "ai", text: `Got it! I have everything I need to build a fantastic itinerary for you. Ready to generate your trip plan?` }]);
      }, 500);
    } else if (step === "confirm" || step === "error") {
      startStreaming();
    }
  };

  const startStreaming = async () => {
    setStep("streaming");
    setMessages(prev => [...prev, { type: "ai", text: "" }]);

    let currentTripId = tripId;
    let accumulatedText = "";

    await streamPost(
      "/api/journeys/stream",
      { destination, days: parseInt(days) || 3, companions },
      (chunk) => {
        if (chunk.startsWith("[TRIP_ID]")) {
          const id = chunk.replace("[TRIP_ID]", "").trim();
          currentTripId = id;
          setTripId(id);
        } else {
          accumulatedText += chunk;
          setMessages(prev => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], text: accumulatedText };
            return newMsgs;
          });
        }
      },
      () => {
        if (currentTripId) {
          setLocation(`/trip-results?tripId=${currentTripId}`);
        }
      },
      (errMsg) => {
        setStep("error");
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { 
            type: "ai", 
            text: `Error generating trip: ${errMsg}`,
            isError: true 
          };
          return newMsgs;
        });
      }
    );
  };

  const handleChipClick = (text: string) => {
    if (step === "confirm" && text === "Yes, generate it!") {
      handleSend(undefined, text);
    } else if (step === "error" && text === "Try again") {
      handleSend(undefined, text);
    } else {
      setInputValue(text);
    }
  };

  const isInputDisabled = step === "streaming";

  const getChips = () => {
    if (step === "destination") return ["Bali, Indonesia", "Tokyo, Japan", "Paris, France"];
    if (step === "days") return ["3 days", "5 days", "7 days", "14 days"];
    if (step === "companions") return ["Solo", "Partner", "Family", "Friends"];
    if (step === "confirm") return ["Yes, generate it!"];
    if (step === "error") return ["Try again"];
    return [];
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF] font-sans flex">
      <Sidebar />
      
      <main className="flex-1 md:ml-[240px] flex flex-col h-screen overflow-hidden">
        
        {/* Header */}
        <header className="bg-white border-b border-border p-4 md:px-8 shrink-0 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Wand2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-secondary-foreground leading-tight">AI Trip Planner</h1>
            <p className="text-xs text-muted-foreground">Tell Roamio about your dream trip</p>
          </div>
        </header>

        {/* Content area: split on desktop, stack on mobile */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* LEFT: Conversation Panel */}
          <div className="flex-1 flex flex-col bg-white/50 relative overflow-hidden h-full">
            
            {/* Scrollable chat area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.type === 'ai' && (
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0 mr-3 mt-1 shadow-sm">
                      R
                    </div>
                  )}
                  <div className={`max-w-[85%] md:max-w-[70%] p-4 text-[15px] leading-relaxed shadow-sm ${
                    msg.type === 'user' 
                      ? 'bg-primary text-white rounded-2xl rounded-tr-sm' 
                      : msg.isError
                        ? 'bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl rounded-tl-sm'
                        : 'bg-white border border-border text-secondary-foreground rounded-2xl rounded-tl-sm'
                  }`}>
                    {msg.text || (step === "streaming" && i === messages.length - 1 ? <span className="animate-pulse">Thinking...</span> : "")}
                    {msg.isError && (
                      <button 
                        onClick={() => startStreaming()}
                        className="mt-3 flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors"
                      >
                        <RefreshCcw className="h-3 w-3" /> Retry Generation
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area fixed at bottom of chat panel */}
            <div className="p-4 md:p-6 bg-white border-t border-border shrink-0">
              {/* Quick reply chips */}
              <div className="flex gap-2 overflow-x-auto pb-3 hide-scrollbar">
                {getChips().map((chip, i) => (
                  <button 
                    key={i}
                    disabled={isInputDisabled}
                    onClick={() => handleChipClick(chip)}
                    className="whitespace-nowrap px-4 py-1.5 rounded-full border border-accent text-accent text-sm font-medium hover:bg-accent hover:text-white transition-colors disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>
              
              <form onSubmit={(e) => handleSend(e)} className="relative">
                <input 
                  type="text" 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type your answer..." 
                  disabled={isInputDisabled || step === "confirm"}
                  className="w-full bg-[#F1F5F9] border-none rounded-xl pl-5 pr-14 py-4 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all shadow-inner disabled:opacity-50"
                />
                <button 
                  type="submit" 
                  disabled={(!inputValue.trim() && step !== "confirm") || isInputDisabled}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center hover:brightness-105 disabled:opacity-50 disabled:hover:brightness-100 transition-all shadow-sm"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT: Summary Sidebar */}
          <div className="w-full lg:w-[350px] bg-white border-l border-border shrink-0 overflow-y-auto hidden md:block">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-6 text-secondary-foreground">
                <ClipboardList className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-bold">Trip Summary</h2>
              </div>

              <div className="bg-muted/30 rounded-2xl border border-border p-5 space-y-4">
                <div className="flex gap-3 items-start pb-4 border-b border-border/50">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Destination</p>
                    <p className="font-medium text-secondary-foreground">{destination || "..."}</p>
                  </div>
                  {destination && <Check className="h-4 w-4 text-accent ml-auto mt-1" />}
                </div>

                <div className="flex gap-3 items-start pb-4 border-b border-border/50">
                  <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Duration</p>
                    <p className="font-medium text-secondary-foreground">{days ? `${days} days` : "..."}</p>
                  </div>
                  {days && <Check className="h-4 w-4 text-accent ml-auto mt-1" />}
                </div>

                <div className="flex gap-3 items-start pb-4 border-b border-border/50">
                  <Heart className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Companions</p>
                    <p className="font-medium text-secondary-foreground">{companions || "..."}</p>
                  </div>
                  {companions && <Check className="h-4 w-4 text-accent ml-auto mt-1" />}
                </div>
              </div>

              {step === "confirm" && (
                <div className="mt-8">
                  <button 
                    onClick={() => handleSend(undefined, "Yes, generate it!")}
                    disabled={isInputDisabled}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3.5 rounded-full shadow-lg shadow-primary/20 hover:brightness-105 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Wand2 className="h-4 w-4" />
                    Generate Itinerary
                  </button>
                  <p className="text-center text-xs text-muted-foreground mt-3">Takes about 15 seconds to generate</p>
                </div>
              )}
              {step === "streaming" && (
                <div className="mt-8 text-center text-sm font-medium text-primary animate-pulse">
                  Generating your perfect trip...
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

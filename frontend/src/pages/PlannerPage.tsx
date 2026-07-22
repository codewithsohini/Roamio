import { Link, useLocation } from "wouter";
import { Sidebar } from "@/pages/DashboardPage";
import { useState, useRef, useEffect } from "react";
import {
  Wand2, Send, MapPin, Calendar, Heart,
  ClipboardList, Check, RefreshCcw,
} from "lucide-react";
import { streamPost } from "@/lib/api";
import { formatIfItinerary } from "@/lib/itinerary-formatter";
import { MarkdownMessage } from "@/components/MarkdownMessage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type PlannerState = "destination" | "days" | "companions" | "confirm" | "streaming" | "error";

type Message = {
  type: "user" | "ai";
  text: string;
  /** When true the bubble shows a typing indicator instead of text */
  isTyping?: boolean;
  isError?: boolean;
};

// ---------------------------------------------------------------------------
// TypingIndicator — three bouncing dots, same visual style as ChatbotPage
// ---------------------------------------------------------------------------
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1 px-1">
      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function PlannerPage() {
  const [, setLocation] = useLocation();
  const [inputValue, setInputValue]   = useState("");
  const messagesEndRef                = useRef<HTMLDivElement>(null);

  const [step, setStep]               = useState<PlannerState>("destination");
  const [destination, setDestination] = useState("");
  const [days, setDays]               = useState("");
  const [companions, setCompanions]   = useState("");
  const [tripId, setTripId]           = useState("");

  const [messages, setMessages] = useState<Message[]>([
    { type: "ai", text: "Hi! I'm Roamio AI 🌍 Let's plan your perfect trip. First — where would you like to go?" },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  // ── Conversation flow ────────────────────────────────────────────────────
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
        setMessages(prev => [...prev, { type: "ai", text: "Amazing choice! 🌴 How many days are you planning for?" }]);
      }, 500);
    } else if (step === "days") {
      const numericStr = text.replace(/\D/g, "");
      const parsed = numericStr ? parseInt(numericStr, 10) : 3; // default 3 days if no digits found
      setDays(parsed.toString());
      setStep("companions");
      setTimeout(() => {
        setMessages(prev => [...prev, {
          type: "ai",
          text: `Perfect! ${parsed} day${parsed !== 1 ? "s" : ""}. Who are you traveling with? (e.g., Solo, Partner, Family, Friends)`,
        }]);
      }, 500);
    } else if (step === "companions") {
      setCompanions(text.trim());
      setStep("confirm");
      setTimeout(() => {
        setMessages(prev => [...prev, {
          type: "ai",
          text: "Got it! I have everything I need to build a fantastic itinerary for you. Ready to generate your trip plan?",
        }]);
      }, 500);
    } else if (step === "confirm" || step === "error") {
      startStreaming();
    }
  };

  // ── Generation ───────────────────────────────────────────────────────────
  const startStreaming = async () => {
    setStep("streaming");

    // Insert a typing-indicator bubble immediately — no text, no JSON
    setMessages(prev => [...prev, { type: "ai", text: "", isTyping: true }]);

    let currentTripId = tripId;
    let accumulatedRaw = "";     // accumulates raw tokens silently — never shown

    await streamPost(
      "/api/journeys/stream",
      { destination, days: parseInt(days) || 3, companions },

      // onChunk: capture silently; do NOT update the message text
      (chunk) => {
        if (chunk.startsWith("[TRIP_ID]")) {
          const id = chunk.replace("[TRIP_ID]", "").trim();
          currentTripId = id;
          setTripId(id);
        } else {
          accumulatedRaw += chunk;
        }
      },

      // onDone: format the full response, replace the typing bubble
      () => {
        const formatted =
          formatIfItinerary(accumulatedRaw) ??
          (accumulatedRaw.trim() || "Your trip has been generated! ✈️");

        setMessages(prev => {
          const next = [...prev];
          // Replace the last message (the typing indicator) with the formatted result
          next[next.length - 1] = { type: "ai", text: formatted, isTyping: false };
          return next;
        });

        // Reset step so the page is usable if the user navigates back
        setStep("confirm");

        // Navigate to the full results page after a short pause
        if (currentTripId) {
          setTimeout(() => setLocation(`/trip-results?tripId=${currentTripId}`), 2000);
        }
      },

      // onError: replace typing bubble with a friendly error
      (errMsg) => {
        setStep("error");
        const friendly = errMsg.toLowerCase().includes("timeout")
          ? "The request timed out. The model may be busy — please try again."
          : errMsg.toLowerCase().includes("403") || errMsg.toLowerCase().includes("401")
            ? "Authentication failed. Please check your API credentials."
            : "Something went wrong while generating your trip. Please try again.";

        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { type: "ai", text: friendly, isTyping: false, isError: true };
          return next;
        });
      }
    );
  };

  // ── Chips / quick replies ────────────────────────────────────────────────
  const handleChipClick = (text: string) => {
    if ((step === "confirm" || step === "error") && (text === "Yes, generate it!" || text === "Try again")) {
      handleSend(undefined, text);
    } else {
      setInputValue(text);
    }
  };

  const isInputDisabled = step === "streaming";

  const getChips = (): string[] => {
    if (step === "destination") return ["Bali, Indonesia", "Tokyo, Japan", "Paris, France"];
    if (step === "days")        return ["3 days", "5 days", "7 days", "14 days"];
    if (step === "companions")  return ["Solo", "Partner", "Family", "Friends"];
    if (step === "confirm")     return ["Yes, generate it!"];
    if (step === "error")       return ["Try again"];
    return [];
  };

  // ── Render ───────────────────────────────────────────────────────────────
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

        {/* Body: chat + sidebar */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

          {/* LEFT: Conversation */}
          <div className="flex-1 flex flex-col bg-white/50 relative overflow-hidden h-full">

            {/* Scrollable messages */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.type === "ai" && (
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0 mr-3 mt-1 shadow-sm">
                      R
                    </div>
                  )}
                  <div className={`max-w-[85%] md:max-w-[70%] p-4 text-[15px] leading-relaxed shadow-sm ${
                    msg.type === "user"
                      ? "bg-primary text-white rounded-2xl rounded-tr-sm"
                      : msg.isError
                        ? "bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl rounded-tl-sm"
                        : "bg-white border border-border text-secondary-foreground rounded-2xl rounded-tl-sm"
                  }`}>
                    {msg.isTyping
                      ? <TypingIndicator />
                      : msg.isError
                        ? (
                          <>
                            <p className="text-sm">{msg.text}</p>
                            <button
                              onClick={startStreaming}
                              className="mt-3 flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors"
                            >
                              <RefreshCcw className="h-3 w-3" /> Retry
                            </button>
                          </>
                        )
                        : <MarkdownMessage text={msg.text} />
                    }
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 md:p-6 bg-white border-t border-border shrink-0">
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
              <form onSubmit={handleSend} className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
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

          {/* RIGHT: Trip Summary sidebar */}
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
                  <p className="text-center text-xs text-muted-foreground mt-3">Takes about 15–30 seconds</p>
                </div>
              )}
              {step === "streaming" && (
                <div className="mt-8 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-primary">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  </div>
                  <p className="text-sm font-medium text-primary mt-2">Crafting your itinerary…</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

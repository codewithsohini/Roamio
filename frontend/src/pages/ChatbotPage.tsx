import { Link } from "wouter";
import { useState, useRef, useEffect } from "react";
import {
  Plane, Menu, X, Plus, MessageCircle, Send,
  Paperclip, History, Star,
} from "lucide-react";
import { streamPost } from "@/lib/api";
import { formatIfItinerary } from "@/lib/itinerary-formatter";
import { MarkdownMessage } from "@/components/MarkdownMessage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Message = {
  type: "user" | "ai";
  time: string;
  text: string;
  /** While true, the bubble shows three bouncing dots instead of text */
  isTyping?: boolean;
  isError?: boolean;
};

/** Shape expected by the backend /chat/stream history field */
type HistoryTurn = { role: "user" | "assistant"; content: string };

/** Maximum number of turns to send as history (user + assistant pairs) */
const MAX_HISTORY_TURNS = 6;

// ---------------------------------------------------------------------------
// TypingIndicator — three bouncing dots
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
// Helpers
// ---------------------------------------------------------------------------
function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function friendlyError(raw: string): string {
  const msg = raw.toLowerCase();
  if (msg.includes("timeout") || msg.includes("timed out"))
    return "The response timed out — the model may be busy. Please try again.";
  if (msg.includes("403") || msg.includes("forbidden") || msg.includes("401"))
    return "Authentication failed. Please check your API credentials.";
  if (msg.includes("429") || msg.includes("rate limit"))
    return "Too many requests — please wait a moment and try again.";
  return "Something went wrong. Please try again.";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ChatbotPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [inputValue, setInputValue]               = useState("");
  const [isTyping, setIsTyping]                   = useState(false);
  const messagesEndRef                            = useRef<HTMLDivElement>(null);

  // Conversation history sent to the backend. Kept in sync with messages
  // but stored separately so it only contains completed (non-typing) turns.
  const [history, setHistory] = useState<HistoryTurn[]>([]);

  const [messages, setMessages] = useState<Message[]>([
    {
      type: "ai",
      time: now(),
      text: "Hello! I'm Roamio AI, your personal travel assistant. 🌍 I can help you plan trips, find restaurants, book hotels, and answer any travel questions. What would you like to explore today?",
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  // ── Send a message ────────────────────────────────────────────────────────
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const textToSend = inputValue.trim();
    setMessages(prev => [...prev, { type: "user", time: now(), text: textToSend }]);
    setInputValue("");
    setIsTyping(true);

    // Show typing indicator bubble immediately
    setMessages(prev => [...prev, { type: "ai", time: now(), text: "", isTyping: true }]);

    // Snapshot the current history before this turn (so we don't include the
    // message we're about to send). Capped at MAX_HISTORY_TURNS.
    const historySnapshot = history.slice(-MAX_HISTORY_TURNS);

    let accumulatedRaw = "";

    await streamPost(
      "/api/chat/stream",
      { message: textToSend, use_profile: false, history: historySnapshot },

      // onChunk — accumulate silently
      (chunk) => {
        accumulatedRaw += chunk;
      },

      // onDone — format then display, then update history
      () => {
        setIsTyping(false);
        const display =
          formatIfItinerary(accumulatedRaw) ??
          (accumulatedRaw.trim() || "I didn't receive a response. Please try again.");

        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { type: "ai", time: now(), text: display, isTyping: false };
          return next;
        });

        // Append this user+assistant turn pair to history for the next request.
        // Use the raw accumulated text (not the formatted display) so the model
        // sees clean content rather than formatted itinerary markdown.
        setHistory(prev => [
          ...prev,
          { role: "user",      content: textToSend },
          { role: "assistant", content: accumulatedRaw.trim() },
        ].slice(-MAX_HISTORY_TURNS));
      },

      // onError — replace typing bubble with a friendly message
      // Do NOT update history on error — the turn was not completed.
      (errMsg) => {
        setIsTyping(false);
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = {
            type: "ai",
            time: now(),
            text: friendlyError(errMsg),
            isTyping: false,
            isError: true,
          };
          return next;
        });
      }
    );
  };

  const handleSuggestion = (text: string) => {
    setInputValue(text.replace(/[🌴🍜🗼🐘]/g, "").trim());
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#F8FAFF] font-sans overflow-hidden">

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-secondary-foreground/50 z-40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 w-[260px] bg-white border-r border-border flex flex-col z-50 transform transition-transform duration-300 ${
        mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <Plane className="h-5 w-5 text-secondary-foreground fill-secondary-foreground" />
            <span className="font-display font-bold text-lg tracking-tight text-secondary-foreground">Roamio</span>
          </Link>
          <button className="md:hidden" onClick={() => setMobileSidebarOpen(false)}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4">
          <button className="w-full flex items-center gap-2 bg-white border border-border text-secondary-foreground font-semibold px-4 py-2.5 rounded-lg hover:bg-muted/50 transition-colors shadow-sm text-sm">
            <Plus className="h-4 w-4" /> New Conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-4 mb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent</h3>
            <div className="space-y-1">
              {[
                { title: "Bali Trip Planning",  time: "2 hours ago" },
                { title: "Tokyo Restaurants",   time: "Yesterday"   },
                { title: "Budget Europe Trip",  time: "3 days ago"  },
                { title: "Paris Family Trip",   time: "Last week"   },
              ].map((chat, i) => (
                <button key={i} className="w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors hover:bg-muted text-secondary-foreground">
                  <MessageCircle className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium truncate">{chat.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{chat.time}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 mt-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Saved Chats</h3>
            <div className="space-y-1">
              {[
                { title: "London Packing List" },
                { title: "NYC Hotel Options"   },
              ].map((chat, i) => (
                <button key={i} className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left hover:bg-muted text-secondary-foreground transition-colors">
                  <Star className="h-4 w-4 shrink-0 text-amber-400 fill-amber-400/20" />
                  <p className="text-sm font-medium truncate">{chat.title}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <Link href="/dashboard" className="flex items-center gap-3 text-sm font-medium text-muted-foreground hover:text-secondary-foreground transition-colors">
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">AJ</div>
            Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative w-full h-full">

        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-border p-4 flex items-center justify-between shrink-0 absolute top-0 left-0 right-0 z-10">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setMobileSidebarOpen(true)}>
              <Menu className="h-6 w-6 text-secondary-foreground" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-secondary-foreground leading-none">Roamio AI</h2>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Ask me anything about travel</p>
            </div>
          </div>
          <button className="text-muted-foreground hover:text-secondary-foreground transition-colors bg-muted p-2 rounded-lg">
            <History className="h-4 w-4" />
          </button>
        </header>

        {/* Chat Scroll Area */}
        <div className="flex-1 overflow-y-auto pt-20 pb-40 px-4 md:px-8">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Suggestion chips (shown only before the first reply) */}
            {messages.length <= 1 && (
              <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">Try asking Roamio...</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    "Plan a 5-day trip to Bali 🌴",
                    "Best restaurants in Tokyo 🍜",
                    "Family-friendly activities in Paris 🗼",
                    "Budget itinerary for Thailand 🐘",
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestion(suggestion)}
                      className="text-left px-4 py-3 bg-white border border-accent/30 text-secondary-foreground text-sm rounded-xl hover:border-accent hover:bg-accent/5 transition-colors shadow-sm"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}
              >
                {msg.type === "ai" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mr-4 mt-1 shadow-md">
                    R
                  </div>
                )}

                <div className={`flex flex-col ${msg.type === "user" ? "items-end" : "items-start"} max-w-[85%] md:max-w-[75%]`}>
                  <div className={`p-4 md:p-5 text-[15px] leading-relaxed shadow-sm ${
                    msg.type === "user"
                      ? "bg-primary text-white rounded-2xl rounded-tr-sm"
                      : msg.isError
                        ? "bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl rounded-tl-sm"
                        : "bg-white border border-border text-secondary-foreground rounded-2xl rounded-tl-sm"
                  }`}>
                    {msg.isTyping
                      ? <TypingIndicator />
                      : msg.type === "user"
                        ? <span>{msg.text}</span>
                        : <MarkdownMessage text={msg.text} />
                    }
                    {msg.isError && (
                      <button
                        onClick={() => setInputValue(messages[i - 1]?.text ?? "")}
                        className="text-xs bg-destructive text-white px-3 py-1 rounded mt-2"
                      >
                        Try Again
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-1.5 px-1">{msg.time}</span>
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#F8FAFF] via-[#F8FAFF] to-transparent pt-6 pb-6 px-4 md:px-8">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={handleSend}
              className="bg-white rounded-2xl border border-border shadow-md overflow-hidden transition-shadow focus-within:shadow-lg focus-within:border-primary/50"
            >
              <textarea
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isTyping}
                placeholder="Ask Roamio about any destination..."
                className="w-full bg-transparent resize-none border-none p-4 pb-2 focus:ring-0 text-[15px] placeholder:text-muted-foreground min-h-[56px] max-h-[120px] disabled:opacity-50"
                rows={1}
              />
              <div className="px-3 pb-3 flex justify-between items-center bg-white">
                <button
                  type="button"
                  className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                  disabled={isTyping}
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isTyping}
                  className="bg-primary text-white p-2.5 rounded-xl hover:brightness-105 disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground transition-all active:scale-95"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
            <p className="text-center text-[11px] text-muted-foreground mt-3">
              Roamio AI can make mistakes. Verify important travel information.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}

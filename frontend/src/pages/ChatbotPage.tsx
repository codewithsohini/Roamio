import { Link } from "wouter";
import { useState, useRef, useEffect } from "react";
import { 
  Plane, Menu, X, Plus, MessageCircle, Send, MapPin, 
  Paperclip, History, Star
} from "lucide-react";
import { streamPost } from "@/lib/api";

export default function ChatbotPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<{ type: string; time: string; text: string; isError?: boolean }[]>([
    { 
      type: "ai", 
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      text: "Hello! I'm Roamio AI, your personal travel assistant. 🌍 I can help you plan trips, find restaurants, book hotels, and answer any travel questions. What would you like to explore today?" 
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isTyping) return;
    
    const textToSend = inputValue.trim();
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    // Add user message
    setMessages(prev => [...prev, { type: "user", time, text: textToSend }]);
    setInputValue("");
    setIsTyping(true);

    // Add empty AI message
    setMessages(prev => [...prev, { type: "ai", time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), text: "" }]);

    let accumulatedText = "";

    await streamPost(
      "/api/chat/stream",
      { message: textToSend, use_profile: false },
      (chunk) => {
        accumulatedText += chunk;
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], text: accumulatedText };
          return newMsgs;
        });
      },
      () => {
        setIsTyping(false);
      },
      (errMsg) => {
        setIsTyping(false);
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { 
            type: "ai", 
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            text: `Error connecting to chat: ${errMsg}`,
            isError: true 
          };
          return newMsgs;
        });
      }
    );
  };

  const handleSuggestion = (text: string) => {
    setInputValue(text.replace(/[🌴🍜🗼🐘]/g, '').trim());
  };

  // Renders richly-formatted AI responses matching Roamio's travel guide style.
  // Handles: # H1, ## H2, ### H3, **bold**, *italic*, bullets, numbered lists,
  // --- dividers, ✨ *callout* lines, ✔️ tip lines, closing "quotes".
  const formatText = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    const inlineFormat = (raw: string, key: number | string) => {
      const parts = raw.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
      return (
        <span key={key}>
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**'))
              return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
            if (part.startsWith('*') && part.endsWith('*'))
              return <em key={j} className="not-italic text-primary/90 font-medium">{part.slice(1, -1)}</em>;
            return part;
          })}
        </span>
      );
    };

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // H1 — big title (# 🌟 Title)
      if (line.startsWith('# ') && !line.startsWith('## ')) {
        elements.push(
          <h1 key={i} className="font-bold text-[17px] text-secondary-foreground leading-snug mt-1 mb-2">
            {inlineFormat(line.slice(2), i)}
          </h1>
        );
        i++; continue;
      }

      // H2 — section heading (## 🎭 Section)
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={i} className="font-bold text-[15px] text-secondary-foreground mt-5 mb-2 pb-1 border-b border-border/60 first:mt-1">
            {inlineFormat(line.slice(3), i)}
          </h2>
        );
        i++; continue;
      }

      // H3 — place/dish name (### 🏺 Name)
      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={i} className="font-semibold text-[14px] text-secondary-foreground mt-4 mb-1">
            {inlineFormat(line.slice(4), i)}
          </h3>
        );
        i++; continue;
      }

      // ✨ callout line — "✨ *Why visit?*" or "✨ *Why try?*"
      if (trimmed.startsWith('✨')) {
        elements.push(
          <div key={i} className="flex items-start gap-2 bg-primary/5 border border-primary/15 rounded-lg px-3 py-2 my-2 text-[13px] text-primary/90">
            <span className="shrink-0 mt-0.5">✨</span>
            <span>{inlineFormat(trimmed.slice(1).trim(), `callout-${i}`)}</span>
          </div>
        );
        i++; continue;
      }

      // ✔️ tip / etiquette line
      if (trimmed.startsWith('✔️')) {
        elements.push(
          <div key={i} className="flex items-start gap-2 text-[13px] text-secondary-foreground leading-relaxed py-0.5">
            <span className="shrink-0">✔️</span>
            <span>{inlineFormat(trimmed.slice(2).trim(), `check-${i}`)}</span>
          </div>
        );
        i++; continue;
      }

      // Bullet list — collect consecutive * or - lines
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const items: React.ReactNode[] = [];
        while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
          items.push(
            <li key={i} className="flex gap-2 text-[13px] leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
              <span>{inlineFormat(lines[i].slice(2), i)}</span>
            </li>
          );
          i++;
        }
        elements.push(<ul key={`ul-${i}`} className="space-y-1.5 my-2 ml-1">{items}</ul>);
        continue;
      }

      // Numbered list
      if (/^\d+\.\s/.test(line)) {
        const items: React.ReactNode[] = [];
        let num = 1;
        while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
          const content = lines[i].replace(/^\d+\.\s/, '');
          items.push(
            <li key={i} className="flex gap-2 text-[13px] leading-relaxed">
              <span className="font-semibold text-primary shrink-0 min-w-[1.2rem]">{num}.</span>
              <span>{inlineFormat(content, i)}</span>
            </li>
          );
          i++; num++;
        }
        elements.push(<ol key={`ol-${i}`} className="space-y-1.5 my-2 ml-1">{items}</ol>);
        continue;
      }

      // Horizontal rule
      if (trimmed === '---' || trimmed === '***') {
        elements.push(<hr key={i} className="my-4 border-border/50" />);
        i++; continue;
      }

      // Blank line
      if (trimmed === '') {
        elements.push(<div key={i} className="h-1" />);
        i++; continue;
      }

      // Closing quote — line that is entirely bold: **"..."** ✨
      if (trimmed.startsWith('**"') || trimmed.startsWith('**\'')) {
        elements.push(
          <blockquote key={i} className="mt-4 border-l-4 border-primary/40 pl-3 italic text-[13px] text-secondary-foreground/80 leading-relaxed">
            {inlineFormat(trimmed, `bq-${i}`)}
          </blockquote>
        );
        i++; continue;
      }

      // Plain paragraph
      elements.push(
        <p key={i} className="text-[13px] leading-relaxed text-secondary-foreground/90">
          {inlineFormat(line, i)}
        </p>
      );
      i++;
    }

    return <div className="space-y-0.5">{elements}</div>;
  };

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
                { title: "Bali Trip Planning", time: "2 hours ago" },
                { title: "Tokyo Restaurants", time: "Yesterday" },
                { title: "Budget Europe Trip", time: "3 days ago" },
                { title: "Paris Family Trip", time: "Last week" }
              ].map((chat, i) => (
                <button key={i} className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors hover:bg-muted text-secondary-foreground`}>
                  <MessageCircle className={`h-4 w-4 shrink-0 mt-0.5 text-muted-foreground`} />
                  <div className="overflow-hidden">
                    <p className={`text-sm font-medium truncate`}>{chat.title}</p>
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
                { title: "NYC Hotel Options" }
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
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
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
            
            {/* Show suggestions if few messages */}
            {messages.length <= 1 && (
              <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">Try asking Roamio...</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    "Plan a 5-day trip to Bali 🌴",
                    "Best restaurants in Tokyo 🍜",
                    "Family-friendly activities in Paris 🗼",
                    "Budget itinerary for Thailand 🐘"
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
              <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                
                {msg.type === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mr-4 mt-1 shadow-md">
                    R
                  </div>
                )}
                
                <div className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[75%]`}>
                  <div className={`p-4 md:p-5 text-[15px] leading-relaxed shadow-sm ${
                    msg.type === 'user' 
                      ? 'bg-primary text-white rounded-2xl rounded-tr-sm' 
                      : msg.isError
                        ? 'bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl rounded-tl-sm'
                        : 'bg-white border border-border text-secondary-foreground rounded-2xl rounded-tl-sm'
                  }`}>
                    {msg.text === "" && isTyping ? <span className="animate-pulse">...</span> : formatText(msg.text)}
                    {msg.isError && (
                      <button onClick={() => setInputValue(messages[i-1]?.text || "")} className="text-xs bg-destructive text-white px-3 py-1 rounded mt-2">
                        Try Again
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-1.5 px-1">{msg.time}</span>
                </div>
              </div>
            ))}

            {/* Typing Indicator if waiting for the first chunk */}
            {isTyping && messages[messages.length - 1]?.type === 'ai' && messages[messages.length - 1]?.text === "" && (
              <div className="flex justify-start animate-in fade-in hidden"> {/* Handled in the empty bubble above, kept for structure if needed */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mr-4 mt-1 shadow-md">
                  R
                </div>
                <div className="bg-white border border-border rounded-2xl rounded-tl-sm p-4 h-12 flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Area (Fixed at bottom) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#F8FAFF] via-[#F8FAFF] to-transparent pt-6 pb-6 px-4 md:px-8">
          <div className="max-w-3xl mx-auto">
            <form 
              onSubmit={handleSend} 
              className="bg-white rounded-2xl border border-border shadow-md overflow-hidden transition-shadow focus-within:shadow-lg focus-within:border-primary/50"
            >
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
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
                <button type="button" className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50" disabled={isTyping}>
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

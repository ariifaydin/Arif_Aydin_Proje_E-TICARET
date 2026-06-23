import React, { useEffect, useRef, useState } from "react";
import { Send, Bot, Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import { API_BASE } from "../lib/api";

const STARTERS = [
  "Motor uyarı lambası yanıyor, ne kontrol etmeliyim?",
  "Turbo basıncı düşüyor, olası nedenler nelerdir?",
  "Fren pedalı süngerimsi geliyor, sebep ne olabilir?",
  "Şanzıman 3. vitese sert geçiyor, ne yapmalıyım?",
];

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Merhaba 👋 Ben ağır vasıta diagnostik asistanınızım. Aracınızdaki arıza, uyarı ışığı, motor, turbo, fren veya şanzıman sorunlarınızı sorabilirsiniz." },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sessionId] = useState(() => `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async (msg) => {
    if (!msg || streaming) return;
    const userMsg = msg.trim();
    setMessages((m) => [...m, { role: "user", content: userMsg }, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const token = localStorage.getItem("hv_token");
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ session_id: sessionId, message: userMsg }),
      });
      if (!res.ok || !res.body) throw new Error("AI ile bağlantı kurulamadı");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE: split by \n\n
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const lines = part.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              // decode escaped newlines from backend
              const decoded = data.replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last.role === "assistant") last.content += decoded;
                return copy;
              });
            }
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last.role === "assistant" && !last.content) last.content = "⚠️ Yanıt alınamadı. Lütfen tekrar deneyin.";
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 md:px-8 py-8">
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="h-5 w-5 text-brand" />
              <span className="label-mono">AI Asistan</span>
            </div>
            <h2 className="font-heading text-xl font-bold uppercase mb-2">Teknik Destek</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Claude Sonnet 4.5 destekli, kamyon/tır/otobüs arızaları konusunda uzmanlaşmış AI.
            </p>
          </div>

          <div className="border border-border bg-card p-5">
            <div className="label-mono mb-3">Hızlı Sorular</div>
            <div className="space-y-2">
              {STARTERS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  data-testid={`starter-${i}`}
                  disabled={streaming}
                  className="block w-full text-left text-xs border border-border p-2 hover:border-brand hover:text-brand transition-colors disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="border border-yellow-500/40 bg-yellow-500/5 p-4">
            <div className="flex items-start gap-2 text-xs text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>AI önerileri profesyonel teşhisin yerini tutmaz. Şüpheli durumlarda servis ekibimize başvurun.</span>
            </div>
          </div>
        </aside>

        {/* Chat */}
        <section className="lg:col-span-3 border border-border bg-card flex flex-col h-[calc(100vh-12rem)]">
          <header className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-2 w-2 bg-green-500 absolute -right-1 -top-1 rounded-full animate-pulse" />
                <Sparkles className="h-5 w-5 text-brand" />
              </div>
              <div>
                <div className="font-heading text-lg font-bold uppercase">Ağır Vasıta Asistanı</div>
                <div className="label-mono">// claude-sonnet · {sessionId.slice(-6)}</div>
              </div>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  data-testid={`msg-${m.role}-${i}`}
                  className={`max-w-[85%] p-4 font-mono text-sm whitespace-pre-wrap leading-relaxed ${
                    m.role === "user"
                      ? "bg-brand text-white"
                      : "bg-secondary border border-border"
                  }`}
                >
                  {m.content}
                  {streaming && i === messages.length - 1 && m.role === "assistant" && (
                    <span className="inline-block w-2 h-4 bg-brand align-middle ml-1 animate-pulse" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="border-t border-border p-4 flex gap-2"
          >
            <input
              type="text" value={input} onChange={(e) => setInput(e.target.value)}
              data-testid="chat-input"
              placeholder="Bir soru sor... (örn: turbo basıncı düşüyor)"
              className="flex-1 bg-background border border-border focus:border-brand outline-none px-4 py-3 font-mono text-sm"
              disabled={streaming}
            />
            <button
              type="submit" disabled={!input.trim() || streaming}
              data-testid="chat-send-btn"
              className="bg-brand text-white px-5 font-heading font-bold uppercase tracking-wider hover:bg-brand-dark disabled:opacity-50 inline-flex items-center gap-2"
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="hidden sm:inline">Gönder</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2 } from "lucide-react";
import type Anthropic from "@anthropic-ai/sdk";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  onRefresh: () => void;
};

export default function ChatPanel({ onRefresh }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Merhaba! Checklist yönetim asistanınım. Durumu görmek için \"durum nedir?\" yazabilir, workflow başlatmak için \"başlat\" diyebilirsiniz.",
    },
  ]);
  const [apiMessages, setApiMessages] = useState<Anthropic.MessageParam[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    const newUserMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, newUserMsg]);
    setLoading(true);

    const updatedApiMessages: Anthropic.MessageParam[] = [
      ...apiMessages,
      { role: "user", content: text },
    ];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedApiMessages }),
      });

      const data = await res.json();
      setApiMessages([...data.messages, { role: "assistant", content: data.reply }]);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);

      // Refresh checklist if an action was taken
      if (
        text.toLowerCase().includes("başlat") ||
        text.toLowerCase().includes("tamamla") ||
        text.toLowerCase().includes("sıfırla") ||
        text.toLowerCase().includes("reset")
      ) {
        onRefresh();
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Bir hata oluştu. Tekrar deneyin." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const suggestions = ["Durum nedir?", "Başlat", "Kaç adım kaldı?", "Sıfırla"];

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <div className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center">
          <Bot className="h-4 w-4 text-zinc-300" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">Claude Asistan</p>
          <p className="text-xs text-zinc-600">Checklist yönetimi</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef as React.RefObject<React.ElementRef<typeof ScrollArea>>}>
        <div className="py-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === "assistant" ? "bg-zinc-800" : "bg-zinc-700"
                }`}
              >
                {msg.role === "assistant" ? (
                  <Bot className="h-4 w-4 text-zinc-300" />
                ) : (
                  <User className="h-4 w-4 text-zinc-300" />
                )}
              </div>
              <div
                className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === "assistant"
                    ? "bg-zinc-900 text-zinc-200 border border-zinc-800"
                    : "bg-white text-black"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-zinc-300" />
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5">
                <Loader2 className="h-4 w-4 text-zinc-500 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="text-xs px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Mesaj yaz... (Enter göndermek için)"
            className="flex-1 min-h-[44px] max-h-32 bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 resize-none focus-visible:ring-zinc-600 text-sm"
            rows={1}
          />
          <Button
            onClick={send}
            disabled={!input.trim() || loading}
            size="sm"
            className="bg-white text-black hover:bg-zinc-200 h-11 w-11 p-0 flex-shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

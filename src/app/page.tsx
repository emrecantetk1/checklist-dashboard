"use client";

import { useEffect, useState, useCallback } from "react";
import ChecklistPanel from "@/components/ChecklistPanel";
import ChatPanel from "@/components/ChatPanel";
import { ChecklistItem, ChecklistState } from "@/lib/supabase";

export default function Home() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [state, setState] = useState<ChecklistState>({
    id: 1,
    completed_steps: [],
    is_active: false,
    started_at: null,
    completed_at: null,
    updated_at: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/checklist");
    const data = await res.json();
    setItems(data.items);
    setState(data.state);
  }, []);

  useEffect(() => {
    fetchData();
    // Poll every 10s to reflect Slack button completions
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleStart = async () => {
    setLoading(true);
    await fetch("/api/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    await fetchData();
    setLoading(false);
  };

  const handleReset = async () => {
    if (!confirm("Tüm ilerleme sıfırlanacak. Emin misin?")) return;
    setLoading(true);
    await fetch("/api/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    await fetchData();
    setLoading(false);
  };

  const handleImport = async (file: File) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/import", { method: "POST", body: formData });
    const data = await res.json();
    if (data.error) {
      alert("Import hatası: " + data.error);
    } else {
      alert(`${data.count} adım başarıyla yüklendi.`);
      await fetchData();
    }
    setLoading(false);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-black">
      {/* Left: Checklist */}
      <div className="w-[340px] flex-shrink-0 flex flex-col">
        <ChecklistPanel
          items={items}
          state={state}
          onStart={handleStart}
          onReset={handleReset}
          onImport={handleImport}
          loading={loading}
        />
      </div>

      {/* Right: Claude chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatPanel onRefresh={fetchData} />
      </div>
    </div>
  );
}

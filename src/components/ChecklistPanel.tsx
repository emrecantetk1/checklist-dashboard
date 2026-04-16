"use client";

import { ChecklistItem, ChecklistState } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Circle, Clock, Play, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";

type Props = {
  items: ChecklistItem[];
  state: ChecklistState;
  onStart: () => void;
  onReset: () => void;
  onImport: (file: File) => void;
  loading: boolean;
};

function stepStatus(step: number, completedSteps: number[]) {
  if (completedSteps.includes(step)) return "completed";
  const maxCompleted = completedSteps.length > 0 ? Math.max(...completedSteps) : 0;
  if (step === maxCompleted + 1) return "active";
  return "pending";
}

export default function ChecklistPanel({
  items,
  state,
  onStart,
  onReset,
  onImport,
  loading,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const completed = state.completed_steps?.length ?? 0;
  const total = items.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-white tracking-tight">Checklist</h1>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-700 hover:bg-zinc-800 text-zinc-300 h-8 px-2"
              onClick={() => fileInputRef.current?.click()}
              title="Excel İmport"
            >
              <Upload className="h-3.5 w-3.5" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImport(f);
                e.target.value = "";
              }}
            />
            {state.is_active ? (
              <Button
                size="sm"
                variant="outline"
                className="border-zinc-700 hover:bg-zinc-800 text-zinc-300 h-8 px-2"
                onClick={onReset}
                disabled={loading}
                title="Sıfırla"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-white text-black hover:bg-zinc-200 h-8 px-3 text-xs font-medium"
                onClick={onStart}
                disabled={loading || total === 0}
              >
                <Play className="h-3 w-3 mr-1" />
                Başlat
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>{completed} / {total} tamamlandı</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Steps */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {items.length === 0 && (
            <div className="py-12 text-center text-zinc-600 text-sm">
              <Upload className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Excel dosyası yükle</p>
              <p className="text-xs mt-1 text-zinc-700">veya Supabase&apos;de checklist_items tablosunu oluştur</p>
            </div>
          )}
          {items.map((item) => {
            const status = stepStatus(item.step, state.completed_steps ?? []);
            return (
              <div
                key={item.step}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  status === "active"
                    ? "bg-zinc-800 border border-zinc-600"
                    : status === "completed"
                    ? "opacity-50"
                    : "hover:bg-zinc-900"
                }`}
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  {status === "completed" ? (
                    <div className="h-5 w-5 rounded-full bg-white flex items-center justify-center">
                      <Check className="h-3 w-3 text-black" />
                    </div>
                  ) : status === "active" ? (
                    <div className="h-5 w-5 rounded-full bg-zinc-400 flex items-center justify-center animate-pulse">
                      <Clock className="h-3 w-3 text-black" />
                    </div>
                  ) : (
                    <Circle className="h-5 w-5 text-zinc-700" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-600 font-mono w-5 flex-shrink-0">
                      {item.step}
                    </span>
                    <p
                      className={`text-sm truncate ${
                        status === "completed"
                          ? "text-zinc-600 line-through"
                          : status === "active"
                          ? "text-white font-medium"
                          : "text-zinc-400"
                      }`}
                    >
                      {item.task}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-600 ml-7 truncate">{item.name}</p>
                </div>

                {/* Badge */}
                {status === "active" && (
                  <Badge
                    variant="outline"
                    className="border-zinc-500 text-zinc-300 text-[10px] px-1.5 py-0 flex-shrink-0"
                  >
                    Aktif
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

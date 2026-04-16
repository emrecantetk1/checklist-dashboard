import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const tools: Anthropic.Tool[] = [
  {
    name: "get_status",
    description:
      "Get current checklist status: which steps are completed, who is active, overall progress",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "complete_step",
    description: "Mark a checklist step as completed and notify the next person via Slack",
    input_schema: {
      type: "object" as const,
      properties: {
        step: { type: "number", description: "Step number to mark complete" },
        slack_id: { type: "string", description: "Slack ID of the person completing the step" },
      },
      required: ["step", "slack_id"],
    },
  },
  {
    name: "start_checklist",
    description: "Start the checklist workflow from scratch, notifying the first person",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "reset_checklist",
    description: "Reset all checklist progress back to zero",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
];

async function executeTool(name: string, input: Record<string, unknown>) {
  if (name === "get_status") {
    const [itemsRes, stateRes] = await Promise.all([
      supabase.from("checklist_items").select("*").order("step"),
      supabase.from("checklist_state").select("*").eq("id", 1).single(),
    ]);

    const items = itemsRes.data ?? [];
    const state = stateRes.data ?? { completed_steps: [], is_active: false };
    const completedSteps: number[] = state.completed_steps ?? [];

    const summary = items.map((item: { step: number; task: string; name: string; slack_id: string }) => ({
      step: item.step,
      task: item.task,
      person: item.name,
      status: completedSteps.includes(item.step)
        ? "completed"
        : completedSteps.length > 0 && item.step === Math.max(...completedSteps) + 1
        ? "active"
        : "pending",
    }));

    return {
      total_steps: items.length,
      completed: completedSteps.length,
      remaining: items.length - completedSteps.length,
      is_active: state.is_active,
      steps: summary,
    };
  }

  if (name === "complete_step") {
    const { step, slack_id } = input as { step: number; slack_id: string };
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", step, slack_id }),
    });
    return res.json();
  }

  if (name === "start_checklist") {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    return res.json();
  }

  if (name === "reset_checklist") {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    return res.json();
  }

  return { error: "Unknown tool" };
}

export async function POST(request: Request) {
  const { messages } = await request.json();

  const anthropicMessages: Anthropic.MessageParam[] = messages;

  let response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: `Sen bir checklist yönetim asistanısın. Ekip için 20 adımlı bir checklist yönetiyorsun.
Araçlarını kullanarak checklist durumunu kontrol et, adımları tamamla, workflow'u başlat veya sıfırla.
Türkçe yanıt ver. Kısa ve net ol.`,
    tools,
    messages: anthropicMessages,
  });

  // Handle tool use loop
  while (response.stop_reason === "tool_use") {
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (toolUse) => ({
        type: "tool_result" as const,
        tool_use_id: toolUse.id,
        content: JSON.stringify(
          await executeTool(toolUse.name, toolUse.input as Record<string, unknown>)
        ),
      }))
    );

    anthropicMessages.push({ role: "assistant", content: response.content });
    anthropicMessages.push({ role: "user", content: toolResults });

    response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: `Sen bir checklist yönetim asistanısın. Ekip için 20 adımlı bir checklist yönetiyorsun.
Araçlarını kullanarak checklist durumunu kontrol et, adımları tamamla, workflow'u başlat veya sıfırla.
Türkçe yanıt ver. Kısa ve net ol.`,
      tools,
      messages: anthropicMessages,
    });
  }

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");

  return NextResponse.json({
    reply: textBlock?.text ?? "Bir sorun oluştu.",
    messages: anthropicMessages,
  });
}

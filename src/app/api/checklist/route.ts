import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const [itemsRes, stateRes] = await Promise.all([
    supabase.from("checklist_items").select("*").order("step"),
    supabase.from("checklist_state").select("*").eq("id", 1).single(),
  ]);

  return NextResponse.json({
    items: itemsRes.data ?? [],
    state: stateRes.data ?? {
      completed_steps: [],
      is_active: false,
      started_at: null,
      completed_at: null,
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, step, slack_id } = body;

  if (action === "complete") {
    const { data: current } = await supabase
      .from("checklist_state")
      .select("completed_steps")
      .eq("id", 1)
      .single();

    const steps: number[] = current?.completed_steps ?? [];
    if (!steps.includes(step)) steps.push(step);

    await supabase
      .from("checklist_state")
      .upsert({ id: 1, completed_steps: steps, updated_at: new Date().toISOString() });

    // Trigger n8n webhook
    const n8nBase = process.env.N8N_BASE_URL;
    if (n8nBase) {
      await fetch(`${n8nBase}/webhook/checklist-done`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, slack_id }),
      }).catch(() => null);
    }

    return NextResponse.json({ success: true, completed_steps: steps });
  }

  if (action === "start") {
    await supabase.from("checklist_state").upsert({
      id: 1,
      completed_steps: [],
      is_active: true,
      started_at: new Date().toISOString(),
      completed_at: null,
      updated_at: new Date().toISOString(),
    });

    const n8nBase = process.env.N8N_BASE_URL;
    if (n8nBase) {
      await fetch(`${n8nBase}/webhook/checklist-start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => null);
    }

    return NextResponse.json({ success: true });
  }

  if (action === "reset") {
    await supabase.from("checklist_state").upsert({
      id: 1,
      completed_steps: [],
      is_active: false,
      started_at: null,
      completed_at: null,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

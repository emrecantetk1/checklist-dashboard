import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  // Expected columns: step, task, name, slack_id (or Adım, Görev, Kişi, Slack ID)
  const items = rows
    .map((row, i) => {
      const step =
        Number(row["step"] ?? row["Adım"] ?? row["adım"] ?? i + 1);
      const task =
        String(row["task"] ?? row["Görev"] ?? row["görev"] ?? `Görev ${step}`);
      const name =
        String(row["name"] ?? row["Kişi"] ?? row["kişi"] ?? `Kişi ${step}`);
      const slack_id =
        String(row["slack_id"] ?? row["Slack ID"] ?? row["slack id"] ?? `UXXXXXXXXX${String(step).padStart(2, "0")}`);

      return { step, task, name, slack_id };
    })
    .filter((item) => item.step > 0)
    .sort((a, b) => a.step - b.step);

  // Delete existing items and insert new ones
  await supabase.from("checklist_items").delete().neq("id", 0);
  const { error } = await supabase.from("checklist_items").insert(items);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, count: items.length, items });
}

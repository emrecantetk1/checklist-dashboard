import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type ChecklistItem = {
  id: number;
  step: number;
  task: string;
  name: string;
  slack_id: string;
};

export type ChecklistState = {
  id: number;
  completed_steps: number[];
  is_active: boolean;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

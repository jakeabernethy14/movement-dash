export type AccountType = "owner" | "trainer" | "client";

export interface Profile {
  id: string;
  full_name: string;
  username: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  timezone: string;
  disabled: boolean;
  access_expires_at: string | null;
  created_at: string;
}

export interface PTClient {
  id: string;
  pt_id: string;
  client_id: string;
  description: string;
  expiration: string | null;
  status: "active" | "paused" | "expired";
  created_at: string;
  // joined
  client?: Profile;
}

export interface RegisterToken {
  id: string;
  token: string;
  role: AccountType;
  pt_id: string | null;
  created_by: string | null;
  max_uses: number;
  use_count: number;
  access_days: number | null;
  expires_at: string | null;
  created_at: string;
}

export interface TrainingPlanDay {
  day: string;
  exercises: {
    name: string;
    sets: string;
    reps: string;
    weight?: string;
    notes?: string;
  }[];
}

export interface TrainingPlan {
  id: string;
  pt_id: string;
  title: string;
  description: string;
  content: TrainingPlanDay[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssignedProgram {
  id: string;
  plan_id: string | null;
  client_id: string;
  assigned_by: string;
  start_date: string;
  end_date: string | null;
  notes: string;
  created_at: string;
  plan?: TrainingPlan;
}

export interface ScheduleEvent {
  id: string;
  client_id: string | null;
  pt_id: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  event_type: "training" | "checkup" | "rest" | "note" | "class" | "call" | "other";
  event_scope: "client" | "personal";
  client_response: string | null;
  client_completed: boolean;
  responded_at: string | null;
  created_at: string;
}

export interface DailyLog {
  id: string;
  client_id: string;
  pt_id: string | null;
  log_date: string;
  weight_kg: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  training_notes: string;
  mood: string | null;
  created_at: string;
  updated_at: string;
}

export interface NutritionInfo {
  id: string;
  client_id: string;
  pt_id: string;
  calories_target: number | null;
  protein_target: number | null;
  carbs_target: number | null;
  fats_target: number | null;
  notes: string;
  updated_at: string;
}

export interface Checkup {
  id: string;
  client_id: string;
  pt_id: string;
  checkup_date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  measurements: Record<string, number>;
  notes: string;
  created_at: string;
}

export interface Goal {
  id: string;
  client_id: string;
  pt_id: string;
  title: string;
  description: string;
  target_date: string | null;
  status: "in_progress" | "achieved" | "abandoned";
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  author_id: string;
  client_id: string;
  pt_id: string;
  content: string;
  visibility: "pt_only" | "shared";
  created_at: string;
  author?: Profile;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface AppSettings {
  id: number;
  allow_registration: boolean;
  require_email_verification: boolean;
  updated_at: string;
}

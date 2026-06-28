// Core domain types for CivicPulse

export type IssueStatus =
  | "reported"
  | "verified"
  | "in_progress"
  | "resolved"
  | "rejected";

export type UserRole = "citizen" | "authority" | "admin";

export interface User {
  id: string;
  name: string;
  avatar_url?: string;
  role: UserRole;
  points: number;
  badges: string[];
  ward?: string;
  created_at: string;
}

export interface Category {
  /** stable slug, used in DB */
  id: string;
  /** human label */
  label: string;
  /** emoji used in markers & UI */
  icon: string;
  /** responsible department / authority */
  department: string;
  /** typical target resolution in days */
  sla_days: number;
  /** tailwind-friendly accent color name from our palette */
  color: string;
}

export interface Verification {
  id: string;
  issue_id: string;
  user_id: string;
  user_name: string;
  /** confirm = "I've seen this too", deny = "this is not real / fixed" */
  type: "confirm" | "deny";
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  issue_id: string;
  /** what changed */
  status: IssueStatus;
  /** short human description */
  note: string;
  by_user: string;
  created_at: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category_id: string;
  /** AI-assigned or user-set, 1 (minor) - 5 (critical) */
  severity: number;
  /** lat/lng of the report */
  lat: number;
  lng: number;
  /** readable address/area */
  location_name: string;
  /** ward / district bucket for dashboards */
  ward: string;
  status: IssueStatus;
  image_url: string;
  reporter_id: string;
  reporter_name: string;
  /** trust score derived from verifications */
  trust_score: number;
  /** counts, denormalised for fast UI */
  confirm_count: number;
  deny_count: number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface Comment {
  id: string;
  issue_id: string;
  user_id: string;
  user_name: string;
  text: string;
  created_at: string;
}

/** Result of AI analysis on a report image */
export interface AICategorization {
  category_id: string;
  category_label: string;
  severity: number;
  department: string;
  /** short AI-generated summary of what's in the image */
  summary: string;
  /** 0-1 confidence */
  confidence: number;
  /** suggested title for the report */
  suggested_title: string;
}

export interface DashboardStats {
  total: number;
  by_status: Record<IssueStatus, number>;
  by_category: { category_id: string; label: string; count: number }[];
  by_ward: { ward: string; count: number }[];
  /** per-department performance for the SLA scorecard */
  by_department: {
    department: string;
    total: number;
    resolved: number;
    overdue: number;
  }[];
  avg_resolution_hours: number;
  resolution_rate: number;
  /** open issues past their category SLA deadline */
  overdue: number;
  /** newest reported/resolved events for the activity feed */
  recent_activity: {
    kind: "reported" | "resolved";
    title: string;
    category_id: string;
    who: string;
    at: string;
  }[];
  top_contributors: { name: string; points: number; reports: number }[];
  /** weekly trend */
  trend: { week: string; reported: number; resolved: number }[];
  /** predicted hotspots */
  hotspots: {
    ward: string;
    category_id: string;
    risk: "low" | "medium" | "high";
    reason: string;
  }[];
}

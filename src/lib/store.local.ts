import { promises as fs } from "fs";
import path from "path";
import type {
  Comment,
  DashboardStats,
  Issue,
  IssueStatus,
  TimelineEvent,
  User,
  Verification,
} from "./types";
import { SEED_DATA } from "./seed";
import { uid, haversineMeters, recomputeTrust, computeStats } from "./store.shared";

/**
 * Local persistent store.
 *
 * Keeps an in-memory copy hydrated from seed data and mirrors every write to a
 * JSON file on disk so state survives restarts/HMR. Fully runnable with zero
 * external services. When Supabase env vars are present, store.ts swaps this
 * out for the Supabase-backed store, which satisfies the same interface.
 */

interface DBShape {
  users: User[];
  issues: Issue[];
  verifications: Verification[];
  timeline: TimelineEvent[];
  comments: Comment[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

// Module-scoped singleton. Guarded against HMR double-init in dev.
const g = globalThis as unknown as { __CIVIC_DB__?: DBShape };

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

async function ensureSeed(): Promise<DBShape> {
  if (g.__CIVIC_DB__) return g.__CIVIC_DB__;
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as DBShape;
    if (parsed.issues && parsed.users) {
      g.__CIVIC_DB__ = parsed;
      return parsed;
    }
  } catch {
    // file missing — fall through to seed
  }
  g.__CIVIC_DB__ = clone(SEED_DATA);
  await persist();
  return g.__CIVIC_DB__;
}

async function persist(): Promise<void> {
  if (!g.__CIVIC_DB__) return;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(g.__CIVIC_DB__, null, 2), "utf-8");
  } catch (e) {
    console.error("[store] persist failed", e);
  }
}

export const localStore = {
  async resetToSeed(): Promise<void> {
    g.__CIVIC_DB__ = clone(SEED_DATA);
    await persist();
  },

  // ---------- Issues ----------
  async listIssues(filter?: {
    status?: IssueStatus;
    category_id?: string;
    ward?: string;
  }): Promise<Issue[]> {
    const db = await ensureSeed();
    return db.issues
      .filter((i) => !filter?.status || i.status === filter.status)
      .filter((i) => !filter?.category_id || i.category_id === filter.category_id)
      .filter((i) => !filter?.ward || i.ward === filter.ward)
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  },

  async getIssue(id: string): Promise<Issue | null> {
    const db = await ensureSeed();
    return db.issues.find((i) => i.id === id) ?? null;
  },

  async nearbyIssues(
    lat: number,
    lng: number,
    radiusMeters = 150,
    categoryId?: string
  ): Promise<(Issue & { distance_m: number })[]> {
    const db = await ensureSeed();
    return db.issues
      .filter((i) => i.status !== "rejected" && i.status !== "resolved")
      .filter((i) => !categoryId || i.category_id === categoryId)
      .map((i) => ({ ...i, distance_m: haversineMeters({ lat, lng }, i) }))
      .filter((i) => i.distance_m <= radiusMeters)
      .sort((a, b) => a.distance_m - b.distance_m);
  },

  async createIssue(
    input: Omit<
      Issue,
      | "id"
      | "trust_score"
      | "confirm_count"
      | "deny_count"
      | "created_at"
      | "updated_at"
      | "resolved_at"
      | "status"
    > & { status?: IssueStatus }
  ): Promise<Issue> {
    const db = await ensureSeed();
    const nowIso = new Date().toISOString();
    const issue: Issue = {
      id: uid("iss"),
      trust_score: 0.4,
      confirm_count: 0,
      deny_count: 0,
      status: input.status ?? "reported",
      created_at: nowIso,
      updated_at: nowIso,
      resolved_at: null,
      title: input.title,
      description: input.description,
      category_id: input.category_id,
      severity: input.severity,
      lat: input.lat,
      lng: input.lng,
      location_name: input.location_name,
      ward: input.ward,
      image_url: input.image_url,
      reporter_id: input.reporter_id,
      reporter_name: input.reporter_name,
    };
    db.issues.unshift(issue);
    db.timeline.unshift({
      id: uid("tl"),
      issue_id: issue.id,
      status: issue.status,
      note: "Issue reported with AI-assisted categorisation",
      by_user: issue.reporter_name,
      created_at: nowIso,
    });
    const reporter = db.users.find((u) => u.id === issue.reporter_id);
    if (reporter) reporter.points += 10;
    await persist();
    return issue;
  },

  async updateIssueStatus(
    id: string,
    status: IssueStatus,
    byUser: string,
    note?: string
  ): Promise<Issue | null> {
    const db = await ensureSeed();
    const issue = db.issues.find((i) => i.id === id);
    if (!issue) return null;
    const prev = issue.status;
    issue.status = status;
    issue.updated_at = new Date().toISOString();
    if (status === "resolved") issue.resolved_at = issue.updated_at;
    db.timeline.unshift({
      id: uid("tl"),
      issue_id: id,
      status,
      note:
        note ??
        (status === "resolved"
          ? "Marked as resolved"
          : status === "in_progress"
          ? "Work started"
          : `Status changed to ${status}`),
      by_user: byUser,
      created_at: issue.updated_at,
    });
    if (status === "resolved" && prev !== "resolved") {
      const reporter = db.users.find((u) => u.id === issue.reporter_id);
      if (reporter) reporter.points += 25;
    }
    await persist();
    return issue;
  },

  // ---------- Verification ----------
  async verify(
    issueId: string,
    user: { id: string; name: string },
    type: "confirm" | "deny"
  ): Promise<Issue | null> {
    const db = await ensureSeed();
    const issue = db.issues.find((i) => i.id === issueId);
    if (!issue) return null;
    db.verifications = db.verifications.filter(
      (v) => !(v.issue_id === issueId && v.user_id === user.id)
    );
    const existingConfirm = issue.confirm_count;
    db.verifications.unshift({
      id: uid("ver"),
      issue_id: issueId,
      user_id: user.id,
      user_name: user.name,
      type,
      created_at: new Date().toISOString(),
    });
    const confirms = db.verifications.filter(
      (v) => v.issue_id === issueId && v.type === "confirm"
    ).length;
    const denies = db.verifications.filter(
      (v) => v.issue_id === issueId && v.type === "deny"
    ).length;
    issue.confirm_count = confirms;
    issue.deny_count = denies;
    issue.trust_score = recomputeTrust(issue);
    issue.updated_at = new Date().toISOString();

    if (issue.status === "reported" && confirms >= 5) {
      issue.status = "verified";
      db.timeline.unshift({
        id: uid("tl"),
        issue_id: issueId,
        status: "verified",
        note: `Reached ${confirms} community confirmations`,
        by_user: "System",
        created_at: issue.updated_at,
      });
    }
    if (type === "confirm" && existingConfirm !== confirms) {
      const u = db.users.find((x) => x.id === user.id);
      if (u) u.points += 5;
    }
    await persist();
    return issue;
  },

  async listVerifications(issueId: string): Promise<Verification[]> {
    const db = await ensureSeed();
    return db.verifications
      .filter((v) => v.issue_id === issueId)
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  },

  // ---------- Timeline ----------
  async listTimeline(issueId: string): Promise<TimelineEvent[]> {
    const db = await ensureSeed();
    return db.timeline
      .filter((t) => t.issue_id === issueId)
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  },

  // ---------- Comments ----------
  async listComments(issueId: string): Promise<Comment[]> {
    const db = await ensureSeed();
    return db.comments
      .filter((c) => c.issue_id === issueId)
      .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  },

  async addComment(
    issueId: string,
    user: { id: string; name: string },
    text: string
  ): Promise<Comment> {
    const db = await ensureSeed();
    const comment: Comment = {
      id: uid("c"),
      issue_id: issueId,
      user_id: user.id,
      user_name: user.name,
      text,
      created_at: new Date().toISOString(),
    };
    db.comments.push(comment);
    const u = db.users.find((x) => x.id === user.id);
    if (u) u.points += 2;
    await persist();
    return comment;
  },

  // ---------- Users ----------
  async listUsers(): Promise<User[]> {
    const db = await ensureSeed();
    return [...db.users].sort((a, b) => b.points - a.points);
  },

  async getUser(id: string): Promise<User | null> {
    const db = await ensureSeed();
    return db.users.find((u) => u.id === id) ?? null;
  },

  async getDemoUser(): Promise<User> {
    const db = await ensureSeed();
    return db.users.find((u) => u.id === "u_demo")!;
  },

  // ---------- Dashboard ----------
  async stats(): Promise<DashboardStats> {
    const db = await ensureSeed();
    return computeStats(db.issues, db.users);
  },
};

export type Store = typeof localStore;

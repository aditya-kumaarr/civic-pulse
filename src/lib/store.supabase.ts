import type {
  Comment,
  DashboardStats,
  Issue,
  IssueStatus,
  TimelineEvent,
  User,
  Verification,
} from "./types";
import type { Store } from "./store.local";
import { SEED_DATA } from "./seed";
import { getSupabase } from "./supabase";
import { uid, haversineMeters, recomputeTrust, computeStats } from "./store.shared";

/**
 * Supabase-backed store. Implements the same interface as the local store, so
 * the rest of the app is unchanged. All access is server-side via the
 * service-role client. Row shapes already match the TS types (snake_case),
 * so rows map straight onto Issue/User/etc.
 */

const nowIso = () => new Date().toISOString();

async function addPoints(userId: string, delta: number) {
  const sb = getSupabase();
  const { data } = await sb.from("users").select("points").eq("id", userId).single();
  if (data) {
    await sb.from("users").update({ points: (data.points ?? 0) + delta }).eq("id", userId);
  }
}

export const supabaseStore: Store = {
  async resetToSeed(): Promise<void> {
    const sb = getSupabase();
    // delete children first (FK), then issues, then users
    await sb.from("comments").delete().neq("id", "");
    await sb.from("timeline").delete().neq("id", "");
    await sb.from("verifications").delete().neq("id", "");
    await sb.from("issues").delete().neq("id", "");
    await sb.from("users").delete().neq("id", "");
    await sb.from("users").insert(SEED_DATA.users);
    await sb.from("issues").insert(SEED_DATA.issues);
    await sb.from("verifications").insert(SEED_DATA.verifications);
    await sb.from("timeline").insert(SEED_DATA.timeline);
    await sb.from("comments").insert(SEED_DATA.comments);
  },

  // ---------- Issues ----------
  async listIssues(filter): Promise<Issue[]> {
    const sb = getSupabase();
    let q = sb.from("issues").select("*").order("created_at", { ascending: false });
    if (filter?.status) q = q.eq("status", filter.status);
    if (filter?.category_id) q = q.eq("category_id", filter.category_id);
    if (filter?.ward) q = q.eq("ward", filter.ward);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Issue[];
  },

  async getIssue(id): Promise<Issue | null> {
    const sb = getSupabase();
    const { data } = await sb.from("issues").select("*").eq("id", id).maybeSingle();
    return (data as Issue) ?? null;
  },

  async nearbyIssues(lat, lng, radiusMeters = 150, categoryId) {
    const sb = getSupabase();
    let q = sb
      .from("issues")
      .select("*")
      .not("status", "in", "(resolved,rejected)");
    if (categoryId) q = q.eq("category_id", categoryId);
    const { data, error } = await q;
    if (error) throw error;
    return ((data ?? []) as Issue[])
      .map((i) => ({ ...i, distance_m: haversineMeters({ lat, lng }, i) }))
      .filter((i) => i.distance_m <= radiusMeters)
      .sort((a, b) => a.distance_m - b.distance_m);
  },

  async createIssue(input): Promise<Issue> {
    const sb = getSupabase();
    const ts = nowIso();
    const issue: Issue = {
      id: uid("iss"),
      trust_score: 0.4,
      confirm_count: 0,
      deny_count: 0,
      status: input.status ?? "reported",
      created_at: ts,
      updated_at: ts,
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
    const { error } = await sb.from("issues").insert(issue);
    if (error) throw error;
    await sb.from("timeline").insert({
      id: uid("tl"),
      issue_id: issue.id,
      status: issue.status,
      note: "Issue reported with AI-assisted categorisation",
      by_user: issue.reporter_name,
      created_at: ts,
    });
    await addPoints(issue.reporter_id, 10);
    return issue;
  },

  async updateIssueStatus(id, status, byUser, note): Promise<Issue | null> {
    const sb = getSupabase();
    const { data: existing } = await sb.from("issues").select("*").eq("id", id).maybeSingle();
    if (!existing) return null;
    const issue = existing as Issue;
    const prev = issue.status;
    const ts = nowIso();
    const patch: Partial<Issue> = { status, updated_at: ts };
    if (status === "resolved") patch.resolved_at = ts;
    const { data: updated, error } = await sb
      .from("issues")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    await sb.from("timeline").insert({
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
      created_at: ts,
    });
    if (status === "resolved" && prev !== "resolved") {
      await addPoints(issue.reporter_id, 25);
    }
    return updated as Issue;
  },

  // ---------- Verification ----------
  async verify(issueId, user, type): Promise<Issue | null> {
    const sb = getSupabase();
    const { data: existing } = await sb.from("issues").select("*").eq("id", issueId).maybeSingle();
    if (!existing) return null;
    const issue = existing as Issue;

    // one vote per user per issue
    await sb.from("verifications").delete().eq("issue_id", issueId).eq("user_id", user.id);
    await sb.from("verifications").insert({
      id: uid("ver"),
      issue_id: issueId,
      user_id: user.id,
      user_name: user.name,
      type,
      created_at: nowIso(),
    });

    const { data: votes } = await sb
      .from("verifications")
      .select("type")
      .eq("issue_id", issueId);
    const confirms = (votes ?? []).filter((v) => v.type === "confirm").length;
    const denies = (votes ?? []).filter((v) => v.type === "deny").length;
    const ts = nowIso();

    const patch: Partial<Issue> = {
      confirm_count: confirms,
      deny_count: denies,
      trust_score: recomputeTrust({ confirm_count: confirms, deny_count: denies }),
      updated_at: ts,
    };
    let autoVerified = false;
    if (issue.status === "reported" && confirms >= 5) {
      patch.status = "verified";
      autoVerified = true;
    }
    const { data: updated, error } = await sb
      .from("issues")
      .update(patch)
      .eq("id", issueId)
      .select("*")
      .single();
    if (error) throw error;

    if (autoVerified) {
      await sb.from("timeline").insert({
        id: uid("tl"),
        issue_id: issueId,
        status: "verified",
        note: `Reached ${confirms} community confirmations`,
        by_user: "System",
        created_at: ts,
      });
    }
    if (type === "confirm" && issue.confirm_count !== confirms) {
      await addPoints(user.id, 5);
    }
    return updated as Issue;
  },

  async listVerifications(issueId): Promise<Verification[]> {
    const sb = getSupabase();
    const { data } = await sb
      .from("verifications")
      .select("*")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: false });
    return (data ?? []) as Verification[];
  },

  // ---------- Timeline ----------
  async listTimeline(issueId): Promise<TimelineEvent[]> {
    const sb = getSupabase();
    const { data } = await sb
      .from("timeline")
      .select("*")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: false });
    return (data ?? []) as TimelineEvent[];
  },

  // ---------- Comments ----------
  async listComments(issueId): Promise<Comment[]> {
    const sb = getSupabase();
    const { data } = await sb
      .from("comments")
      .select("*")
      .eq("issue_id", issueId)
      .order("created_at", { ascending: true });
    return (data ?? []) as Comment[];
  },

  async addComment(issueId, user, text): Promise<Comment> {
    const sb = getSupabase();
    const comment: Comment = {
      id: uid("c"),
      issue_id: issueId,
      user_id: user.id,
      user_name: user.name,
      text,
      created_at: nowIso(),
    };
    const { error } = await sb.from("comments").insert(comment);
    if (error) throw error;
    await addPoints(user.id, 2);
    return comment;
  },

  // ---------- Users ----------
  async listUsers(): Promise<User[]> {
    const sb = getSupabase();
    const { data } = await sb.from("users").select("*").order("points", { ascending: false });
    return (data ?? []) as User[];
  },

  async getUser(id): Promise<User | null> {
    const sb = getSupabase();
    const { data } = await sb.from("users").select("*").eq("id", id).maybeSingle();
    return (data as User) ?? null;
  },

  async getDemoUser(): Promise<User> {
    const sb = getSupabase();
    const { data } = await sb.from("users").select("*").eq("id", "u_demo").maybeSingle();
    return (data as User) ?? (SEED_DATA.users.find((u) => u.id === "u_demo") as User);
  },

  // ---------- Dashboard ----------
  async stats(): Promise<DashboardStats> {
    const sb = getSupabase();
    const [{ data: issues }, { data: users }] = await Promise.all([
      sb.from("issues").select("*"),
      sb.from("users").select("*"),
    ]);
    return computeStats((issues ?? []) as Issue[], (users ?? []) as User[]);
  },
};

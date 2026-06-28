import { store } from "@/lib/store";
import { IssuesList } from "@/components/IssuesList";

export const dynamic = "force-dynamic";

export const metadata = { title: "Issues · CivicPulse" };

export default async function IssuesPage() {
  const [issues, stats] = await Promise.all([
    store.listIssues(),
    store.stats(),
  ]);
  return <IssuesList issues={issues} wards={stats.by_ward.map((w) => w.ward)} />;
}

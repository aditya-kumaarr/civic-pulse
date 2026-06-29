import { store } from "@/lib/store";
import { IssuesList } from "@/components/IssuesList";

export const dynamic = "force-dynamic";

export const metadata = { title: "Issues · CivicPulse" };

export default async function IssuesPage() {
  const issues = await store.listIssues();
  return <IssuesList issues={issues} />;
}

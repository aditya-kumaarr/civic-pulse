import { notFound } from "next/navigation";
import { store } from "@/lib/store";
import { IssueDetail } from "@/components/IssueDetail";

export const dynamic = "force-dynamic";

export default async function IssuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const issue = await store.getIssue(id);
  if (!issue) notFound();
  const [verifications, timeline, comments] = await Promise.all([
    store.listVerifications(id),
    store.listTimeline(id),
    store.listComments(id),
  ]);
  return (
    <IssueDetail
      issue={issue}
      verifications={verifications}
      timeline={timeline}
      comments={comments}
    />
  );
}

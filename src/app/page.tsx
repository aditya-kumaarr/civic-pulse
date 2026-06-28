import { store } from "@/lib/store";
import { MapView } from "@/components/MapView";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [issues, stats] = await Promise.all([
    store.listIssues(),
    store.stats(),
  ]);
  return <MapView issues={issues} total={stats.total} resolved={stats.by_status.resolved} />;
}

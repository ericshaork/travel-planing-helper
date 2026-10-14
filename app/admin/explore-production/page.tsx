import { ExploreProductionDashboard } from "@/components/admin/explore-production/ExploreProductionDashboard";
import { listProductionJobs } from "@/lib/admin/explore-production/store";

export default async function ExploreProductionPage() {
  const jobs = await listProductionJobs();

  return <ExploreProductionDashboard initialJobs={jobs} />;
}

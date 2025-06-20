import { auth } from "@/auth";
import { DashboardBody } from "@/components/dashboard-body";
import { DashboardHeader } from "@/components/dashboard-header";

export default async function Home() {
  const session = await auth();
  if (!session) return <div>Not authenticated</div>;

  const userId = session.user?.id;
  const userAvatar = session.user?.image;
  const userName = session.user?.name;
  const userEmail = session.user?.email;

  if (!userId) return <div>User ID not found</div>;

  return (
    <div className="flex flex-col w-full">
      <DashboardHeader avatar={userAvatar} name={userName} email={userEmail} />
      <DashboardBody />
    </div>
  );
}

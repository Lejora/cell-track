import { auth } from "@/auth";
import { DashboardHeader } from "@/components/dashboard-header";
import { SettingsTabs } from "@/components/settings-tabs";

export default async function SettingsPage() {
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
      <div className="flex justify-center">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 w-full max-w-[1240px] overflow-x-auto">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">設定</h2>
          </div>
          <SettingsTabs userId={userId} />
        </div>
      </div>
    </div>
  );
}
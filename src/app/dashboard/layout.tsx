import { DashboardSidebar } from "@/components/dashboard-sidebar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex ">
      <DashboardSidebar />
      <div className="flex flex-col flex-1">{children}</div>
    </div>
  );
}

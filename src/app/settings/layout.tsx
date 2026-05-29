import { SettingsProvider } from "@/contexts/settings-context";

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SettingsProvider>
      <div className="flex ">
        <div className="flex flex-col flex-1">{children}</div>
      </div>
    </SettingsProvider>
  );
}
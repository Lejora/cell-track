"use client";

import { AccountSettingsTab } from "@/components/account-settings-tab";
import { MapSettingsTab } from "@/components/map-settings-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SettingsTabsProps {
  userId: string;
}

export function SettingsTabs({ userId }: SettingsTabsProps) {
  return (
    <Tabs defaultValue="map" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="map">マップ設定</TabsTrigger>
        <TabsTrigger value="account">アカウント</TabsTrigger>
      </TabsList>
      <TabsContent value="map" className="space-y-4">
        <MapSettingsTab />
      </TabsContent>
      <TabsContent value="account" className="space-y-4">
        <AccountSettingsTab userId={userId} />
      </TabsContent>
    </Tabs>
  );
}

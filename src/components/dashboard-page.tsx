"use client";

import { useGeolocation } from "@/hooks/use-geolocation";
import { useQuery } from "convex/react";
import { Map, Table } from "lucide-react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { CellLog } from "./columns";
import { DashboardHeader } from "./dashboard-header";
import { DashboardStatus } from "./dashboard-stats";
import { DataTable } from "./data-table";
import { MapView } from "./map-view";
import { Skeleton } from "./ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

export const DashboardPage = () => {
  const recordCount = useQuery(api.cellLogs.count) ?? 0;
  const data = useQuery(api.cellLogs.listAll) ?? [];

  const [selectedLogs, setSelectedLogs] = useState<CellLog[]>([]);

  const { geolocation, isLoading, isError } = useGeolocation(selectedLogs);

  return (
    <div className="flex flex-col h-screen w-full">
      <DashboardHeader />
      <div className="mx-auto max-w-7xl space-y-6 bg-background p-4 md:p-6">
        <DashboardStatus recordCount={recordCount} selectedRecordCount={selectedLogs.length} />

        <div>
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="grid grid-cols-2 max-w-[200px]">
              <TabsTrigger value="table">
                <Table className="h-4 w-4 mr-1" />
                <span>Table</span>
              </TabsTrigger>
              <TabsTrigger value="map">
                <Map className="h-4 w-4 mr-1" />
                <span>Map</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="table" className="mt-4 w-full">
              <DataTable data={data} onRowSelected={setSelectedLogs} />
            </TabsContent>
            <TabsContent value="map" className="mt-4 w-full">
              {isLoading || isError ? (
                <Skeleton />
              ) : (
                <MapView points={geolocation} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

"use client";

import { SelectCellLog } from "@/db/schema";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Map, Table } from "lucide-react";
import { useState } from "react";
import { DashboardStatus } from "./dashboard-stats";
import { DataTable } from "./data-table";
import { MapView } from "./map-view";
import { Skeleton } from "./ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useCellLogs } from "@/lib/client-queries";


export const DashboardBody = () => {
  const [selectedLogs, setSelectedLogs] = useState<SelectCellLog[]>([]);

  const { geolocation, isLoading, isError } = useGeolocation(selectedLogs);

  const { logs } = useCellLogs();

  return (
    <div className="mx-auto max-w-7xl space-y-6 bg-background p-4 md:p-6">
      <DashboardStatus
        recordCount={logs.length}
        selectedRecordCount={selectedLogs.length}
      />
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
            <DataTable data={logs} onRowSelected={setSelectedLogs} />
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
  );
};

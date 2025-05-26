"use client"

import { Search, Table, Map } from "lucide-react"
import { DashboardHeader } from "./dashboard-header"
import { Input } from "./ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs"
import { DashboardStatus } from "./dashboard-stats"
import { DataTable } from "./data-table"
import { AddCellLogDialog } from "./add-cell-log-dialog"
import { MapView } from "./map-view"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { CellLog } from "./columns"
import { useState } from "react"

export const DashboardPage = () => {
  const recordCount = useQuery(api.cellLogs.count) ?? 0;
  const [selectedLogs, setSelectedLogs] = useState<CellLog[]>([])


  return (
    <div className="flex flex-col h-screen w-full">
      <DashboardHeader />
      <div className="mx-auto max-w-7xl space-y-6 bg-background p-4 md:p-6">
        <div className="flex flex-col sm:flex-row gap-5 sm:items-center sm:justify-center">
          <h1 className="text-2xl font-bold tracking-tight">ダッシュボート</h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              {/* TODO: Search Boxのコンポーネント化 */}
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="データを検索..."
                className="w-full rounded-md pl-8 md:w-[200px] lg:w-[300px]"
                value={""}
                onChange={() => { }}
              />
            </div>
            <AddCellLogDialog />
          </div>
        </div>

        <DashboardStatus recordCount={recordCount} />

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
              <DataTable onSelectionChange={setSelectedLogs} />
            </TabsContent>
            <TabsContent value="map" className="mt-4 w-full">
              <MapView logs={selectedLogs} />
            </TabsContent>
          </Tabs>
        </div>


      </div>
    </div>
  )
}
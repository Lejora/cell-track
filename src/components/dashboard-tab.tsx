import { Map, Table } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"

export const DashboardTab = () => {
  return (
    <Tabs defaultValue="table" className="w-full">
      <TabsList>
        <TabsTrigger value="table">
          <Table className="h-4 w-4" />
          <span>Table</span>
        </TabsTrigger>
        <TabsTrigger value="map">
          <Map className="h-4 w-4" />
          <span>Map</span>
        </TabsTrigger>
        <TabsContent value="table" className="mt-4">
          {/* DATA TABLE */}
        </TabsContent>
        <TabsContent value="map" className="mt-4">
          {/* DATA TABLE */}
        </TabsContent>
      </TabsList>
    </Tabs>
  )
}
import { MousePointerClick, Radio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface DashboardStatusProps {
  recordCount: number;
  selectedRecordCount: number;
}

export const DashboardStatus = ({
  recordCount,
  selectedRecordCount,
}: DashboardStatusProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium mr-1">
            全レコード数
          </CardTitle>
          <Radio className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{recordCount}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium mr-1">
            選択レコード数
          </CardTitle>
          <MousePointerClick className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{selectedRecordCount}</div>
        </CardContent>
      </Card>
    </div>
  );
};

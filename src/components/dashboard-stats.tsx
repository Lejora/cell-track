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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            全レコード数
          </CardTitle>
          <Radio className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{recordCount.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">
            基地局データ
          </p>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            選択レコード数
          </CardTitle>
          <MousePointerClick className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{selectedRecordCount.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground mt-1">
            選択中
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

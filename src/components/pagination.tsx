import { cn } from "@/lib/utils";
import { Table } from "@tanstack/table-core";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface PaginationProps<TData> {
  table: Table<TData>;
  compact?: boolean;
}

export const Pagination = <TData,>({
  table,
  compact,
}: PaginationProps<TData>) => {
  const presetOptions: number[] = [10, 20, 30, 50, 100, 200];
  const currentSize = table.getState().pagination.pageSize;
  const selectValue = presetOptions.includes(currentSize)
    ? String(currentSize)
    : "custom";
  const pageCount = table.getPageCount();

  return (
    <div
      className={cn(
        "space-y-4 select-none",
        compact && "space-y-2 border-t pt-3"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between px-2",
          compact && "flex-col items-stretch gap-2 px-0 xl:flex-row xl:items-center"
        )}
      >
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} /{" "}
          {table.getRowCount().toLocaleString()} 件を選択中
        </div>
        <div
          className={cn(
            "flex items-center space-x-6 lg:space-x-8",
            compact && "justify-between space-x-2 lg:space-x-3"
          )}
        >
          <div className="flex items-center space-x-2">
            <p
              className={cn(
                "text-sm font-medium select-none",
                compact && "sr-only"
              )}
            >
              1ページの件数
            </p>
            <Select
              value={selectValue}
              onValueChange={(value) => {
                if (value === "custom") {
                  const input = window.prompt(
                    "1ページの件数を入力してください",
                    String(currentSize)
                  );
                  if (!input) return;
                  const v = Math.max(1, Number(input));
                  table.setPageSize(v);
                  try {
                    localStorage.setItem("celltrack.pageSize", String(v));
                  } catch {
                    console.error("local storage");
                  }
                  return;
                }
                const v = Number(value);
                table.setPageSize(v);
                try {
                  localStorage.setItem("celltrack.pageSize", String(v));
                } catch {
                  console.error("local storage");
                }
              }}
            >
              <SelectTrigger className="h-8 w-[112px]">
                <SelectValue placeholder={currentSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {presetOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom ({currentSize})</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[88px] select-none items-center justify-center text-sm font-medium">
            {table.getState().pagination.pageIndex + 1} / {pageCount || 1}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">最初のページへ</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">前のページへ</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">次のページへ</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">最後のページへ</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

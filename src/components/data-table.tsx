"use client";

import { cn } from "@/lib/utils";
import {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  Row,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  RowSelectionState,
  SortingState,
  TableMeta,
  useReactTable,
} from "@tanstack/react-table";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AddCellLogDialog } from "./add-cell-log-dialog";
import { DataSearchBox } from "./data-search-box";
import { Pagination } from "./pagination";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  getRowId?: (originalRow: TData, index: number) => string;
  onRowSelected?: (row: TData[]) => void;
  onRowActivate?: (row: TData) => void;
  onRowHover?: (row: TData | null) => void;
  activeRowId?: string | number | null;
  hoveredRowId?: string | number | null;
  rowSelection?: RowSelectionState;
  meta?: TableMeta<TData>;
  setRowSelection?: Dispatch<SetStateAction<RowSelectionState>>;
  sorting: SortingState;
  setSorting: Dispatch<SetStateAction<SortingState>>;
  columnFilters: ColumnFiltersState;
  setColumnFilters: Dispatch<SetStateAction<ColumnFiltersState>>;
  disableSearch?: boolean;
  disableRowsSelectButton?: boolean;
  allRowsSelected?: boolean;
  allRowsSelectDisabled?: boolean;
  onToggleAllRows?: () => void;
  projectId: number | null;
  refresh: () => void;
  customPageSize?: number;
  manualPagination?: boolean;
  pageCount?: number;
  rowCount?: number;
  pagination?: PaginationState;
  setPagination?: Dispatch<SetStateAction<PaginationState>>;
  compact?: boolean;
  className?: string;
  tableContainerClassName?: string;
  inlineEditEnabled?: boolean;
  editableColumnIds?: string[];
  getEditableCellValue?: (row: TData, columnId: string) => string;
  onEditableCellChange?: (
    row: TData,
    columnId: string,
    value: string
  ) => void;
  isEditableCellDirty?: (row: TData, columnId: string) => boolean;
}

export const DataTable = <TData,>({
  data,
  columns,
  getRowId,
  onRowSelected,
  onRowActivate,
  onRowHover,
  activeRowId,
  hoveredRowId,
  rowSelection,
  meta,
  setRowSelection,
  sorting,
  columnFilters,
  setSorting,
  setColumnFilters,
  disableSearch,
  disableRowsSelectButton,
  allRowsSelected,
  allRowsSelectDisabled,
  onToggleAllRows,
  projectId,
  refresh,
  customPageSize,
  manualPagination,
  pageCount,
  rowCount,
  pagination,
  setPagination,
  compact,
  className,
  tableContainerClassName,
  inlineEditEnabled,
  editableColumnIds,
  getEditableCellValue,
  onEditableCellChange,
  isEditableCellDirty,
}: DataTableProps<TData>) => {
  const dragSelectionRef = useRef<{
    anchorIndex: number;
    targetSelected: boolean;
  } | null>(null);
  const [searchValue, setSearchValue] = useState<string>("");
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);
  const saved =
    typeof window !== "undefined"
      ? Number(localStorage.getItem("celltrack.pageSize"))
      : undefined;

  const initialPageSize = customPageSize
    ? customPageSize
    : saved && Number.isFinite(saved) && saved > 0
    ? saved
    : 20;

  const table = useReactTable<TData>({
    data,
    columns,
    getRowId,
    state: {
      sorting,
      rowSelection,
      columnFilters,
      ...(pagination ? { pagination } : {}),
    },
    initialState: { pagination: { pageSize: initialPageSize } },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination,
    pageCount,
    rowCount,
    enableRowSelection: true,
    enableMultiRowSelection: true,
    meta,
  });

  const rowSelectionState = table.getState().rowSelection;

  useEffect(() => {
    if (onRowSelected) {
      const selected = table.getSelectedRowModel().rows.map((r) => r.original);
      onRowSelected(selected);
    }
  }, [rowSelectionState, onRowSelected, table]);

  const searchBoxOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setSearchValue(newValue);
    return table.getColumn("time")?.setFilterValue(newValue);
  };

  const editableColumns = useMemo(
    () => new Set(editableColumnIds ?? []),
    [editableColumnIds]
  );
  const visibleRows = table.getRowModel().rows;
  const rowIndexById = useMemo(
    () => new Map(visibleRows.map((row, index) => [row.id, index])),
    [visibleRows]
  );

  useEffect(() => {
    const stopDragSelection = () => {
      dragSelectionRef.current = null;
    };

    window.addEventListener("mouseup", stopDragSelection);
    window.addEventListener("blur", stopDragSelection);

    return () => {
      window.removeEventListener("mouseup", stopDragSelection);
      window.removeEventListener("blur", stopDragSelection);
    };
  }, []);

  const isInteractiveTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        "button,a,input,textarea,select,[role='button'],[role='checkbox']"
      )
    );

  const applyRowSelectionRange = (
    startIndex: number,
    endIndex: number,
    targetSelected: boolean
  ) => {
    if (!setRowSelection) return;

    const rangeStart = Math.min(startIndex, endIndex);
    const rangeEnd = Math.max(startIndex, endIndex);

    setRowSelection((currentSelection) => {
      const nextSelection = { ...currentSelection };

      for (let index = rangeStart; index <= rangeEnd; index += 1) {
        const rowId = visibleRows[index]?.id;
        if (!rowId) continue;

        if (targetSelected) {
          nextSelection[rowId] = true;
        } else {
          delete nextSelection[rowId];
        }
      }

      return nextSelection;
    });
  };

  const handleRowMouseDown = (
    event: React.MouseEvent<HTMLTableRowElement>,
    row: Row<TData>
  ) => {
    if (
      event.button !== 0 ||
      event.detail > 1 ||
      isInteractiveTarget(event.target)
    ) {
      return;
    }

    const anchorIndex = rowIndexById.get(row.id);
    if (anchorIndex === undefined) return;

    const targetSelected = !row.getIsSelected();
    dragSelectionRef.current = {
      anchorIndex,
      targetSelected,
    };
    applyRowSelectionRange(anchorIndex, anchorIndex, targetSelected);
    onRowActivate?.(row.original);
    event.preventDefault();
  };

  const handleRowMouseEnter = (row: Row<TData>) => {
    onRowHover?.(row.original);

    const dragSelection = dragSelectionRef.current;
    if (!dragSelection) return;

    const currentIndex = rowIndexById.get(row.id);
    if (currentIndex === undefined) return;

    applyRowSelectionRange(
      dragSelection.anchorIndex,
      currentIndex,
      dragSelection.targetSelected
    );
  };

  return (
    <div
      className={cn(
        "w-full max-w-[1240px] overflow-x-auto rounded-md border bg-background p-4",
        compact &&
          "flex h-full min-h-0 max-w-none flex-col overflow-hidden border-0 bg-transparent p-0",
        className
      )}
    >
      <div
        className={cn(
          "my-5 flex items-center justify-between gap-5",
          compact &&
            "my-0 mb-3 flex-col items-stretch gap-3 sm:flex-row sm:items-center"
        )}
      >
        <div className="flex items-center gap-2">
          {!disableRowsSelectButton && (
            <Button
              variant="outline"
              onClick={() => {
                if (onToggleAllRows) {
                  onToggleAllRows();
                  return;
                }

                table.toggleAllRowsSelected(!table.getIsAllRowsSelected());
              }}
              disabled={allRowsSelectDisabled ?? data.length === 0}
            >
              {(allRowsSelected ?? table.getIsAllRowsSelected())
                ? "全件解除"
                : "全件選択"}
            </Button>
          )}
        </div>
        {!disableSearch && (
          <div className="flex items-center justify-between gap-3 sm:justify-center">
            <DataSearchBox value={searchValue} onChange={searchBoxOnChange} />
            <AddCellLogDialog refresh={refresh} projectId={projectId} />
          </div>
        )}
      </div>
      <div
        className={cn(
          "w-full overflow-x-auto",
          compact && "min-h-0 flex-1 rounded-md border bg-background",
          tableContainerClassName
        )}
      >
        <Table>
          <TableHeader className="bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="sticky top-0 z-20 bg-background shadow-[inset_0_-1px_0_hsl(var(--border))]"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
                className={cn(
                  "cursor-default select-none transition-colors",
                  onRowActivate && "hover:bg-muted/60",
                  String(activeRowId ?? "") === row.id &&
                    "bg-primary/10 hover:bg-primary/10",
                  String(hoveredRowId ?? "") === row.id && "bg-muted"
                )}
                onMouseDown={(event) => handleRowMouseDown(event, row)}
                onMouseEnter={() => handleRowMouseEnter(row)}
                onMouseLeave={() => onRowHover?.(null)}
                onMouseUp={() => {
                  dragSelectionRef.current = null;
                }}
              >
                {row.getVisibleCells().map((cell) => {
                  const columnId = cell.column.id;
                  const isEditable =
                    Boolean(inlineEditEnabled) &&
                    editableColumns.has(columnId) &&
                    Boolean(getEditableCellValue) &&
                    Boolean(onEditableCellChange);
                  const isEditing =
                    editingCell?.rowId === row.id &&
                    editingCell?.columnId === columnId;
                  const isDirty =
                    isEditableCellDirty?.(row.original, columnId) ?? false;

                  return (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        isEditable && "cursor-text",
                        isDirty && "bg-amber-50"
                      )}
                      onDoubleClick={(event) => {
                        if (!isEditable) return;
                        event.stopPropagation();
                        setEditingCell({ rowId: row.id, columnId });
                      }}
                    >
                      {isEditing ? (
                        <Input
                          autoFocus
                          className="h-8 min-w-[120px] font-mono text-xs"
                          value={getEditableCellValue?.(
                            row.original,
                            columnId
                          ) ?? ""}
                          onClick={(event) => event.stopPropagation()}
                          onDoubleClick={(event) => event.stopPropagation()}
                          onChange={(event) =>
                            onEditableCellChange?.(
                              row.original,
                              columnId,
                              event.target.value
                            )
                          }
                          onBlur={() => setEditingCell(null)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.currentTarget.blur();
                            }
                            if (event.key === "Escape") {
                              setEditingCell(null);
                            }
                          }}
                        />
                      ) : (
                        <div
                          className={cn(
                            isEditable &&
                              "rounded-sm px-1 py-0.5 hover:bg-muted",
                            isDirty && "font-medium text-amber-900"
                          )}
                          title={isEditable ? "ダブルクリックで編集" : undefined}
                        >
                          {isEditable && getEditableCellValue
                            ? getEditableCellValue(row.original, columnId)
                            : flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                        </div>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination table={table} compact={compact} />
    </div>
  );
};

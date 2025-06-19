"use client";

import { SelectCellLog } from "@/db/schema";
import { deleteCellLog, useCellLogs } from "@/lib/client-queries";
import {
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  RowSelectionState,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { AddCellLogDialog } from "./add-cell-log-dialog";
import { createColumns } from "./columns";
import { DataSearchBox } from "./data-search-box";
import { Pagination } from "./pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

interface DataTableProps {
  data: SelectCellLog[];
  onRowSelected: (row: SelectCellLog[]) => void;
  rowSelection: RowSelectionState;
  setRowSelection: Dispatch<SetStateAction<RowSelectionState>>;
  sorting: SortingState;
  setSorting: Dispatch<SetStateAction<SortingState>>;
  columnFilters: ColumnFiltersState;
  setColumnFilters: Dispatch<SetStateAction<ColumnFiltersState>>;
}

export const DataTable = ({
  data,
  onRowSelected,
  rowSelection,
  setRowSelection,
  sorting,
  setSorting,
  columnFilters,
  setColumnFilters,
}: DataTableProps) => {
  const { refresh } = useCellLogs();
  const [searchValue, setSearchValue] = useState("");

  const columns = useMemo(() => createColumns(), []);

  const table = useReactTable<SelectCellLog>({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
      columnFilters,
    },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
    enableMultiRowSelection: true,
    meta: {
      removeRow: async (id: number) => {
        await deleteCellLog(id, refresh);
      },
    },
  });

  const rowSelectionState = table.getState().rowSelection;

  useEffect(() => {
    const selected = table.getSelectedRowModel().rows.map((r) => r.original);
    onRowSelected(selected);
  }, [rowSelectionState, onRowSelected, table]);

  const searchBoxOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setSearchValue(newValue);
    return table.getColumn("time")?.setFilterValue(newValue);
  };

  return (
    <div className="rounded-md border bg-background p-4 w-[1240px]">
      <div className="flex gap-5 my-5">
        <DataSearchBox value={searchValue} onChange={searchBoxOnChange} />
        <AddCellLogDialog />
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
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
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination table={table} />
    </div>
  );
};

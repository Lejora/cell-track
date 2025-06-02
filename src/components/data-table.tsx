"use client";

import {
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  RowSelectionState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

import { SortingState } from "@tanstack/react-table";
import { useMutation } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { AddCellLogDialog } from "./add-cell-log-dialog";
import { CellLog, createColumns } from "./columns";
import { DataSearchBox } from "./data-search-box";
import { Pagination } from "./pagination";

interface DataTableProps {
  data: CellLog[];
  onRowSelected: (row: CellLog[]) => void;
}

export const DataTable = ({ data, onRowSelected }: DataTableProps) => {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [searchValue, setSearchValue] = useState("");

  const deleteLog = useMutation(api.cellLogs.remove);
  const columns = useMemo(() => createColumns(deleteLog), [deleteLog]);

  const table = useReactTable({
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
      removeRow: (id: Id<"cellLogs">) => deleteLog({ id }),
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
  }

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

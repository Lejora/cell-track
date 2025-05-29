"use client";

import {
  flexRender,
  getCoreRowModel,
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
import { CellLog, createColumns } from "./columns";

interface DataTableProps {
  data: CellLog[];
  onRowSelected: (row: CellLog[]) => void;
}

export const DataTable = ({ data, onRowSelected }: DataTableProps) => {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);

  const deleteLog = useMutation(api.cellLogs.remove);
  const editLog = useMutation(api.cellLogs.edit);
  const columns = useMemo(() => createColumns(deleteLog), [deleteLog]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    enableMultiRowSelection: true,
    meta: {
      removeRow: (id: Id<"cellLogs">) => deleteLog({ id }),
    },
  });

  useEffect(() => {
    const selected = table.getSelectedRowModel().rows.map((r) => r.original);
    onRowSelected(selected);
  }, [table.getState().rowSelection, onRowSelected]);

  return (
    <div className="rounded-md border bg-background p-4 w-[1240px]">
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
    </div>
  );
};

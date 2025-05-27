"use client";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getSortedRowModel,
} from "@tanstack/react-table";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "./ui/table";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CellLog, createColumns } from "./columns";
import { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { SortingState } from "@tanstack/react-table";

interface DataTableProps {
  onSelectionChange: (selected: CellLog[]) => void
}

export const DataTable = ({ onSelectionChange }: DataTableProps) => {
  const data = useQuery(api.cellLogs.listAll) ?? [];
  const deleteLog = useMutation(api.cellLogs.remove);
  const columns = createColumns(deleteLog);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection
    },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    enableMultiRowSelection: true,
    meta: {
      removeRow: (id: Id<"cellLogs">) => deleteLog({ id }),
    }
  });

  useEffect(() => {
    onSelectionChange(table.getSelectedRowModel().rows.map((row) => row.original));
  }, [rowSelection, onSelectionChange, table]);

  return (
    <div className="rounded-md border bg-background p-4">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
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
}

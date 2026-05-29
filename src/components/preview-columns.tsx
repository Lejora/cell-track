"use client";

import { ParsedRow } from "@/lib/cell-import/parse";
import { ColumnDef } from "@tanstack/react-table";

export const createPreviewColumns = (): ColumnDef<ParsedRow>[] => [
    {accessorKey: "time", header: "Time"},
    {accessorKey: "mcc", header: "MCC"}, 
    {accessorKey: "mnc", header: "MNC"}, 
    {accessorKey: "tac", header: "TAC (HEX)"}, 
    {accessorKey: "cid", header: "CID (HEX)"}, 
]
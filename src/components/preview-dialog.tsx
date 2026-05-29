"use client";

import { ParsedRow } from "@/lib/cell-import/parse";
import { RowSelectionState } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { DataTable } from "./data-table";
import { createPreviewColumns } from "./preview-columns";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface PreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  data: ParsedRow[];
  onSubmit: (data: ParsedRow[]) => void;
}

export const PreviewDialog = ({
  isOpen,
  onOpenChange,
  data,
  onSubmit,
}: PreviewDialogProps) => {
  const columns = useMemo(() => createPreviewColumns(), []);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>アップロードデータ&emsp;プレビュー</DialogTitle>
        </DialogHeader>

        <DataTable
          columns={columns}
          data={data}
          // Previewではsortとsearchは一旦、行わない
          sorting={[]}
          setSorting={() => {}}
          columnFilters={[]}
          setColumnFilters={() => {}}
          rowSelection={rowSelection}
          setRowSelection={setRowSelection}
          disableSearch={true}
          projectId={null}
          refresh={() => {}}
          disableRowsSelectButton={true}
          customPageSize={10}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={() => onSubmit(data)}>DBに追加</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

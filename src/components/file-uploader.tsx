"use client";

import { formatBytes } from "@/format-bytes";
import { ParsedRow, parseJsonlFile } from "@/lib/cell-import/parse";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface FileUploaderProps {
  onParsed?: (rows: ParsedRow[]) => void;
}

export const FileUploader = ({ onParsed }: FileUploaderProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback(
    async (file: File[]) => {
      if (file.length === 0) return;
      
      setSelectedFile(file[0]);

      const rows = await parseJsonlFile(file);

      if (onParsed) {
        onParsed(rows);
      }
    },
    [onParsed]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: {
        "text/plain": [".txt", ".log"],
      },
      multiple: false,
    });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed h-[180px] flex flex-col items-center justify-center rounded-xl transition-colors cursor-pointer gap-2",
        fileRejections.length > 0
          ? "border-red-500 bg-red-50"
          : "border-slate-300 hover:border-slate-400",
        {
          "border-slate-500 bg-slate-100":
            isDragActive && fileRejections.length === 0,
        }
      )}
    >
      <div className="text-center">
        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <span className="text-sm text-muted-foreground">
          ファイルをドラッグ&ドロップ
        </span>
        <p className="text-xs text-muted-foreground mt-1">
          または クリックして選択
        </p>
      </div>
      <div className="flex text-center items-center justify-center text-sm gap-3">
        <span>{selectedFile?.name}</span>
        <span>
          {selectedFile ? formatBytes(Number(selectedFile.size)) : ""}
        </span>
      </div>
      <input {...getInputProps()} />
    </div>
  );
};

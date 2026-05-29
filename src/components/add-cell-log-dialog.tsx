"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ParsedRow } from "@/lib/cell-import/parse";
import {
  postCellLog,
  postMultipleCellLogs,
  useProjects,
} from "@/lib/client-queries";
import { Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { FileUploader } from "./file-uploader";
import { PreviewDialog } from "./preview-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";

interface AddCellLogDialogProps {
  refresh: () => void;
  projectId: number | null;
}

export const AddCellLogDialog = ({
  refresh,
  projectId,
}: AddCellLogDialogProps) => {
  const { projects } = useProjects();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    projectId: "",
    time: "",
    mcc: "440",
    mnc: "10",
    tac: "",
    cid: "",
  });
  const [previewData, setPreviewData] = useState<ParsedRow[]>([]);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);

  useEffect(() => {
    if (projectId) {
      setForm((prev) => ({ ...prev, projectId: String(projectId) }));
    }
  }, [projectId, open]);

  const handleParsed = (rows: ParsedRow[]) => {
    setPreviewData(rows);
    setIsPreviewDialogOpen(true);
  };

  const handleSubmitImport = async (data: ParsedRow[]) => {
    if (!form.projectId) {
      toast({
        variant: "destructive",
        title: "プロジェクトを選択してください",
      });
      return;
    }

    try {
      await postMultipleCellLogs(data, Number(form.projectId), refresh);

      toast({
        title: "インポート完了",
        description: `${data.length}件の基地局情報を保存しました`,
      });

      setIsPreviewDialogOpen(false);
      setOpen(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "インポートエラー",
        description: "データの保存に失敗しました",
      });
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    if (!form.time || !form.mcc || !form.mnc || !form.tac || !form.cid) {
      toast({
        variant: "destructive",
        title: "入力エラー",
        description: "すべてのフィールドを入力してください",
      });
      return;
    }

    try {
      await postCellLog(
        { ...form, projectId: Number(form.projectId) },
        refresh
      );

      toast({
        title: "登録完了",
        description: "新しい基地局情報を保存しました",
      });

      setForm({
        projectId: "",
        time: new Date().toISOString(),
        mcc: "",
        mnc: "",
        tac: "",
        cid: "",
      });
      setOpen(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "保存エラー",
        description: "データの保存に失敗しました",
      });

      console.error(err);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>データを追加</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5" />
              新しい基地局情報を追加
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Label htmlFor="project">
              <div>プロジェクト</div>
            </Label>
            <Select
              value={form.projectId}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, projectId: value }))
              }
            >
              <SelectTrigger id="project">
                <SelectValue placeholder="保存先のプロジェクトを選択..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={String(project.id)}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="time">取得日時</Label>
              <Input
                id="time"
                placeholder="20250523180527236"
                value={form.time}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, time: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mcc">MCC</Label>
                <Input
                  id="mcc"
                  placeholder="440"
                  value={form.mcc}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, mcc: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mnc">MNC</Label>
                <Input
                  id="mnc"
                  placeholder="10"
                  value={form.mnc}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, mnc: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tac">TAC (hex)</Label>
                <Input
                  id="tac"
                  placeholder="1780"
                  value={form.tac}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tac: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cid">CID (hex)</Label>
                <Input
                  id="cid"
                  placeholder="2AA8D11"
                  value={form.cid}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cid: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <span className="text-gray-500 text-sm">または</span>
          </div>

          <FileUploader onParsed={handleParsed} />

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit}>追加する</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PreviewDialog
        isOpen={isPreviewDialogOpen}
        onOpenChange={setIsPreviewDialogOpen}
        data={previewData}
        onSubmit={handleSubmitImport}
      />
    </>
  );
};

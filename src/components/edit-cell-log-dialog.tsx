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
import { patchCellLog } from "@/lib/client-queries";
import { Edit, Radio } from "lucide-react";
import { useState } from "react";

interface EditCellLogDialogProps {
  targetRowId: number;
  prevTime: string;
  prevMCC: string;
  prevMNC: string;
  prevCID: string;
  prevTAC: string;
}

export const EditCellLogDialog = ({
  targetRowId,
  prevTime,
  prevCID,
  prevMCC,
  prevMNC,
  prevTAC,
}: EditCellLogDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    time: prevTime,
    mcc: prevMCC,
    mnc: prevMNC,
    tac: prevTAC,
    cid: prevCID,
  });

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
      await patchCellLog(targetRowId, {
        time: form.time,
        mcc: form.mcc,
        mnc: form.mnc,
        tac: form.tac,
        cid: form.cid,
      });

      toast({
        title: "編集完了",
        description: "基地局情報を編集しました",
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
        >
          <Edit className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            基地局情報を編集
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
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

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit}>編集する</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

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
import { postCellLog, useCellLogs } from "@/lib/client-queries";
import { Radio } from "lucide-react";
import { useState } from "react";

export const AddCellLogDialog = () => {
  const { refresh } = useCellLogs();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    time: "",
    mcc: "440",
    mnc: "10",
    tac: "",
    cid: "",
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
      await postCellLog(form, refresh);

      toast({
        title: "登録完了",
        description: "新しい基地局情報を保存しました",
      });

      setForm({
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
          <Button onClick={handleSubmit}>追加する</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

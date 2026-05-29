"use client";

import { toast } from "@/hooks/use-toast";
import { createProject, useProjects } from "@/lib/client-queries";
import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const AddProjectDialog = () => {
  const { projects, refresh } = useProjects();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    projectName: "",
  });

  const handleSubmit = async () => {
    if (!form.projectName) {
      toast({
        variant: "destructive",
        title: "入力エラー",
        description: "プロジェクト名を入力してください",
      });
      return;
    }

    const isDuplicateName = projects.some(
      (project) => project.name == form.projectName.trim()
    );

    if (isDuplicateName) {
      toast({
        variant: "destructive",
        title: "入力エラー",
        description: "同じプロジェクトがすでに存在します",
      });
      return;
    }

    try {
      await createProject(form.projectName, refresh);

      setForm({
        projectName: "",
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
          <Button>新規プロジェクト</Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>プロジェクトを追加</DialogTitle>
          </DialogHeader>
          <Label htmlFor="projectName">プロジェクト名</Label>
          <Input
            id="projectName"
            placeholder="25/10/10 筑波山"
            value={form.projectName}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, projectName: e.target.value }));
            }}
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit}>追加する</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddProjectDialog;

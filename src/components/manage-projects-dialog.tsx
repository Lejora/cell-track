"use client";

import { SelectProject } from "@/db/schema";
import { useToast } from "@/hooks/use-toast";
import { deleteProject, updateProject } from "@/lib/client-queries";
import { Folder, Loader2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import AddProjectDialog from "./add-project-dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

interface ManageProjectsDialogProps {
  projects: SelectProject[];
  currentProjectId: number | null;
  refreshProjects: () => void;
  onProjectDeleted?: (projectId: number) => void;
}

type ProjectNameState = Record<number, string>;
type ProjectSelectionState = Record<number, boolean>;

export const ManageProjectsDialog = ({
  projects,
  refreshProjects,
  onProjectDeleted,
}: ManageProjectsDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [nameState, setNameState] = useState<ProjectNameState>({});
  const [selectedProjectIds, setSelectedProjectIds] =
    useState<ProjectSelectionState>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);

  const hasProjects = projects.length > 0;

  useEffect(() => {
    if (!open) return;

    const initial = projects.reduce<ProjectNameState>((acc, project) => {
      acc[project.id] = project.name;
      return acc;
    }, {});
    setNameState(initial);
    setSelectedProjectIds({});
    setConfirmDeleteOpen(false);
  }, [open, projects]);

  useEffect(() => {
    const projectIdSet = new Set(projects.map((project) => project.id));
    setSelectedProjectIds((current) => {
      const next: ProjectSelectionState = {};
      for (const [idText, selected] of Object.entries(current)) {
        const id = Number(idText);
        if (selected && projectIdSet.has(id)) {
          next[id] = true;
        }
      }
      return next;
    });
  }, [projects]);

  const trimmedState = useMemo(() => {
    const out: ProjectNameState = {};
    for (const [key, value] of Object.entries(nameState)) {
      out[Number(key)] = value?.trim() ?? "";
    }
    return out;
  }, [nameState]);

  const selectedProjects = useMemo(
    () => projects.filter((project) => selectedProjectIds[project.id]),
    [projects, selectedProjectIds]
  );
  const selectedCount = selectedProjects.length;
  const allSelected = hasProjects && selectedCount === projects.length;
  const someSelected = selectedCount > 0 && !allSelected;

  const handleNameChange = (projectId: number, value: string) => {
    setNameState((prev) => ({
      ...prev,
      [projectId]: value,
    }));
  };

  const handleProjectCheckedChange = (projectId: number, checked: boolean) => {
    setSelectedProjectIds((current) => ({
      ...current,
      [projectId]: checked,
    }));
  };

  const handleAllCheckedChange = (checked: boolean) => {
    if (!checked) {
      setSelectedProjectIds({});
      return;
    }

    setSelectedProjectIds(
      projects.reduce<ProjectSelectionState>((acc, project) => {
        acc[project.id] = true;
        return acc;
      }, {})
    );
  };

  const handleSave = async (projectId: number) => {
    const newName = trimmedState[projectId] ?? "";
    const original = projects.find((p) => p.id === projectId)?.name ?? "";

    if (savingId === projectId) return;

    if (!newName) {
      toast({
        variant: "destructive",
        title: "入力エラー",
        description: "プロジェクト名を入力してください。",
      });
      return;
    }

    if (newName === original) {
      toast({
        title: "変更はありません",
        description: "プロジェクト名は既存のものと同じです。",
      });
      return;
    }

    const isDuplicateName = projects.some(
      (project) => project.id !== projectId && project.name === newName
    );

    if (isDuplicateName) {
      toast({
        variant: "destructive",
        title: "入力エラー",
        description: "同じ名前のプロジェクトがすでに存在します。",
      });
      return;
    }

    try {
      setSavingId(projectId);
      await updateProject(projectId, newName, refreshProjects);
      setNameState((current) => ({
        ...current,
        [projectId]: newName,
      }));
      toast({
        title: "保存しました",
        description: "プロジェクト名を更新しました。",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "保存に失敗しました",
        description: "時間をおいて再度お試しください。",
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleProjectNameKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    projectId: number
  ) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;

    event.preventDefault();
    void handleSave(projectId);
  };

  const handleDeleteSelected = async () => {
    const targetProjects = selectedProjects;
    if (targetProjects.length === 0) {
      setConfirmDeleteOpen(false);
      return;
    }

    try {
      setIsDeletingSelected(true);

      for (const project of targetProjects) {
        await deleteProject(project.id, () => {});
      }

      refreshProjects();
      for (const project of targetProjects) {
        onProjectDeleted?.(project.id);
      }
      setSelectedProjectIds({});
      setConfirmDeleteOpen(false);
      toast({
        title: "消去しました",
        description: `${targetProjects.length}件のプロジェクトを消去しました。`,
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "消去に失敗しました",
        description: "時間をおいて再度お試しください。",
      });
    } finally {
      setIsDeletingSelected(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <Folder className="h-5 w-5 text-muted-foreground" />
            <span className="sr-only">プロジェクトを管理</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85dvh] overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>プロジェクト管理</DialogTitle>
          </DialogHeader>

          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="select-none text-sm text-muted-foreground">
                {projects.length.toLocaleString()}件
                {selectedCount > 0 &&
                  ` / ${selectedCount.toLocaleString()}件選択中`}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={selectedCount === 0 || isDeletingSelected}
                >
                  {isDeletingSelected ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {isDeletingSelected ? "消去中..." : "選択を消去"}
                </Button>
                <AddProjectDialog />
              </div>
            </div>

            {hasProjects ? (
              <div className="min-h-0 max-h-[55dvh] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={allSelected || (someSelected && "indeterminate")}
                          onCheckedChange={(value) =>
                            handleAllCheckedChange(value === true)
                          }
                          aria-label="すべて選択"
                        />
                      </TableHead>
                      <TableHead>プロジェクト名</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => {
                      const value = nameState[project.id] ?? project.name;
                      const isSaving = savingId === project.id;
                      const isSelected = Boolean(selectedProjectIds[project.id]);

                      return (
                        <TableRow
                          key={project.id}
                          data-state={isSelected ? "selected" : undefined}
                        >
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                handleProjectCheckedChange(
                                  project.id,
                                  checked === true
                                )
                              }
                              aria-label={`${project.name}を選択`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={value}
                              onChange={(event) =>
                                handleNameChange(project.id, event.target.value)
                              }
                              onKeyDown={(event) =>
                                handleProjectNameKeyDown(event, project.id)
                              }
                              disabled={isSaving || isDeletingSelected}
                              placeholder="プロジェクト名"
                              className="h-8"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                プロジェクトが見つかりません。まずは「新規プロジェクト」から作成してください。
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDeleteOpen}
        onOpenChange={(nextOpen) => {
          if (!isDeletingSelected) {
            setConfirmDeleteOpen(nextOpen);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              本当に{selectedCount.toLocaleString()}件消去しますか？
            </AlertDialogTitle>
            <AlertDialogDescription>
              選択したプロジェクトを消去します。関連する基地局ログも全て削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedProjects.length > 0 && (
            <div className="max-h-40 overflow-auto rounded-md border bg-muted/20 p-3 text-sm">
              {selectedProjects.slice(0, 8).map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between gap-4 py-1"
                >
                  <span className="truncate">{project.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    ID {project.id}
                  </span>
                </div>
              ))}
              {selectedProjects.length > 8 && (
                <div className="pt-1 text-xs text-muted-foreground">
                  ほか{(selectedProjects.length - 8).toLocaleString()}件
                </div>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingSelected}>
              キャンセル
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={isDeletingSelected || selectedCount === 0}
            >
              {isDeletingSelected ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  消去中...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  消去する
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

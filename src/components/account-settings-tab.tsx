"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Calendar,
  Download,
  Github,
  Loader2,
  LogOut,
  Mail,
  Shield,
  User
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

interface AccountInfo {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    emailVerified: Date | null;
  };
  githubAccount: {
    provider: string;
    providerAccountId: string;
    connectedAt: Date | null;
  } | null;
}

interface AccountSettingsTabProps {
  userId: string;
}

export function AccountSettingsTab({ userId }: AccountSettingsTabProps) {
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetchAccountInfo();
  }, [userId]);

  const fetchAccountInfo = async () => {
    try {
      const response = await fetch("/api/account");
      if (!response.ok) {
        throw new Error("Failed to fetch account info");
      }
      const data = await response.json();
      setAccountInfo(data);
    } catch (error) {
      toast({
        title: "エラー",
        description: "アカウント情報の取得に失敗しました。",
        variant: "destructive",
      });
      console.error(error)
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const response = await fetch("/api/account/export");
      if (!response.ok) {
        throw new Error("Failed to export data");
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cell-track-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "エクスポート完了",
        description: "データのエクスポートが完了しました。",
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "データのエクスポートに失敗しました。",
        variant: "destructive",
      });
      console.error(error)
    } finally {
      setExporting(false);
    }
  };

  const handleDisconnectAccount = async () => {
    setDisconnecting(true);
    try {
      await signOut({ callbackUrl: "/" });
      toast({
        title: "アカウント切断完了",
        description: "GitHubアカウントとの接続を切断しました。",
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "アカウントの切断に失敗しました。",
        variant: "destructive",
      });
      console.error(error)
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!accountInfo) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              アカウント情報を読み込めませんでした。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            プロフィール情報
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={accountInfo.user.image || ""} alt={accountInfo.user.name || ""} />
              <AvatarFallback>
                {accountInfo.user.name?.charAt(0) || accountInfo.user.email?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">
                {accountInfo.user.name || "名前未設定"}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {accountInfo.user.email || "メールアドレス未設定"}
              </div>
              {accountInfo.user.emailVerified && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    メール認証済み
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GitHub OAuth Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub認証
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {accountInfo.githubAccount ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-300 text-green-800 hover:bg-green-400">
                      接続済み
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      GitHub ID: {accountInfo.githubAccount.providerAccountId}
                    </span>
                  </div>
                  {accountInfo.githubAccount.connectedAt && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      接続日時: {new Date(accountInfo.githubAccount.connectedAt).toLocaleDateString('ja-JP')}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={disconnecting}
                        className="flex items-center gap-2"
                      >
                        {disconnecting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <LogOut className="h-4 w-4" />
                        )}
                        切断
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>アカウントの切断</AlertDialogTitle>
                        <AlertDialogDescription>
                          GitHubアカウントとの接続を切断します。この操作により、アプリケーションからログアウトされます。
                          データは保持されますが、再度ログインが必要になります。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDisconnectAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          切断する
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    未接続
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    GitHubアカウントが接続されていません。
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            データ管理
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">データエクスポート</h4>
              <p className="text-sm text-muted-foreground">
                基地局データ、設定、アカウント情報をJSON形式でダウンロードします。
              </p>
            </div>
            <Button
              onClick={handleExportData}
              disabled={exporting}
              className="flex items-center gap-2"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {exporting ? "エクスポート中..." : "データをエクスポート"}
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">データ保持について</h4>
            <p className="text-xs text-muted-foreground">
              • 設定情報はアカウントに紐づいて保存されます<br />
              • アカウントを削除すると、すべてのデータが削除されます
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
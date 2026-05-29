import { logout } from "@/actions/logout";
import { Bell, LogOut, Radio, Settings } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface DashboardHeaderProps {
  avatar: string | null | undefined;
  name: string | null | undefined;
  email: string | null | undefined;
}

export const DashboardHeader = ({
  avatar,
  name,
  email,
}: DashboardHeaderProps) => {

  return (
    <header
      className="flex h-14 items-center bg-background/60 backdrop-blur-md  supports-[backdrop-filter]:bg-background/60 justify-between
    gap-4 border-b px-4 lg:h-[60px] lg:px-6 w-full sticky top-0 z-40"
    >
      <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2">
        <Radio className="h-6 w-6 text-gray-600" />
        <span className="font-semibold text-gray-900">Cell Track</span>
      </Link>
      <div className="flex items-center gap-4 mr-5">
        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="h-4 w-4" />
          <span className="sr-only">通知</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar>
              {avatar ? (
                <AvatarImage src={avatar} />
              ) : (
                <AvatarFallback>User</AvatarFallback>
              )}
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel className="flex flex-col gap-1">
              <span>{name ? name : "User"}</span>
              <span className="font-medium text-gray-600">
                {email ? email : "email unknown"}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-3">
                <Settings size={16} />
                <span>設定</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <form action={logout}>
                <button
                  type="submit"
                  className="flex items-center justify-start gap-3 text-red-600"
                >
                  <LogOut size={16} />
                  <span className="font-bold">ログアウト</span>
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

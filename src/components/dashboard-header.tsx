import { Bell } from "lucide-react"
import { Button } from "./ui/button"
import { SidebarTrigger } from "./ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { logout } from "@/actions/logout";

interface DashboardHeaderProps {
  avatar: string | null | undefined;
  name: string | null | undefined;
  email: string | null | undefined;
}

export const DashboardHeader = ({ avatar, name, email }: DashboardHeaderProps) => {
  return (
    <header className="flex h-14 items-center bg-background justify-between 
    gap-4 border-b px-4 lg:h-[60px] lg:px-6 w-full">
      <SidebarTrigger />
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="h-4 w-4" />
          <span className="sr-only">通知</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar>
              {avatar ? <AvatarImage src={avatar} /> : <AvatarFallback>User</AvatarFallback>}
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel className="flex flex-col gap-1">
              <span>{name ? name : "User"}</span>
              <span className="font-medium text-gray-600">{email ? email : "email unknown"}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <form action={logout}>
                <button type="submit">
                  <span className="text-red-600 font-bold">
                    ログアウト
                  </span>
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
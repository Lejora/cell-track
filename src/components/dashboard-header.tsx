import { Bell } from "lucide-react"
import { Button } from "./ui/button"
import { SidebarTrigger } from "./ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"

export const DashboardHeader = () => {
  return (
    <header className="flex h-14 items-center bg-background justify-between 
    gap-4 border-b px-4 lg:h-[60px] lg:px-6 w-full">
      <SidebarTrigger />
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full">
          <Bell className="h-4 w-4" />
          <span className="sr-only">通知</span>
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarImage src="user-icon.svg" alt="avatar" />
          <AvatarFallback>User</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
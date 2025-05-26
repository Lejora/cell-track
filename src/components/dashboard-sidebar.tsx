"use client"

import { Radio, Home, Settings, User } from "lucide-react"
import { Button } from "./ui/button"
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar
} from "./ui/sidebar"

export const DashboardSidebar = () => {
  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <Radio className="h-6 w-6 text-gray-600" />
          {useSidebar().state === "expanded" && (
            <span className="font-semibold text-gray-900">Cell Track</span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="#">
                    <Home className="h-4 w-4" />
                    <span>ダッシュボート</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="#">
                    <Settings className="h-4 w-4" />
                    <span>設定</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-3 py-2">
          <Button variant="outline" className="w-full justify-start">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
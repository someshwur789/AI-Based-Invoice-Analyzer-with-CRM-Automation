import { useState } from "react";
import { 
  LayoutDashboard, 
  FileText, 
  Upload, 
  Users, 
  Building2,
  BarChart3,
  Settings
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Upload Invoice", url: "/upload", icon: Upload },
  { title: "Invoices", url: "/invoices", icon: FileText },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Vendors", url: "/vendors", icon: Building2 },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Automations", url: "/automations", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground font-medium shadow-sm" 
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";

  return (
    <Sidebar
      className={`${collapsed ? "w-16" : "w-64"} border-r border-border bg-card shadow-card transition-all duration-300`}
      collapsible="icon"
    >
      <SidebarContent className="p-0">
        {/* Logo/Brand */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-corporate flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h2 className="font-semibold text-foreground">InvoiceAnalyzer</h2>
                <p className="text-xs text-muted-foreground">CRM Integration</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 p-2">
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : "text-muted-foreground font-medium px-2 mb-2"}>
              Main Navigation
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="transition-colors duration-200">
                      <NavLink 
                        to={item.url} 
                        end={item.url === "/"}
                        className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg ${getNavCls({ isActive })}`}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        {!collapsed && <span className="truncate">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        {/* Footer/User Info */}
        <div className="p-4 border-t border-border">
          {!collapsed && (
            <div className="text-xs text-muted-foreground">
              <p>Invoice Processing & CRM</p>
              <p className="text-primary font-medium">System Active</p>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
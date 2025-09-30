"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { SidebarSearch } from "@/components/sidebar-search"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Link } from '@tanstack/react-router'
import { brandInfo, navBaseGroups, navSearchGroups, navSummaryGroups } from '@/lib/navigation'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const LogoIcon = brandInfo.logoIcon
    const ownerName = brandInfo.owner ?? brandInfo.name

    return (
        <Sidebar variant="inset" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link to="/">
                                <div className="bg-black text-white flex aspect-square size-8 items-center justify-center rounded-lg">
                                    <LogoIcon className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{brandInfo.name}</span>
                                    <span className="truncate text-xs">{ownerName}</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <div className="px-2 pb-2">
                    <SidebarSearch items={navSearchGroups} />
                </div>
            </SidebarHeader>
            <SidebarContent>
                {/* Summaries remain in main content */}
                <NavMain
                    label="Resúmenes"
                    items={navSummaryGroups}
                />
            </SidebarContent>
            <SidebarFooter>
                {/* Move Base to the bottom; default collapsed and show a plus icon */}
                <NavMain items={navBaseGroups} label="Base" defaultCollapsed={true} groupCollapsible={true} />
            </SidebarFooter>
        </Sidebar>
    )
}

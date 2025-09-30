"use client"

import { ChevronRight, Plus, Minus } from "lucide-react"
import { Link } from '@tanstack/react-router'
import type { NavGroup } from '@/lib/navigation'

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavMain({
    items,
    label = 'Base',
    defaultCollapsed = false,
    groupCollapsible = false,
}: {
    items: NavGroup[]
    label?: string
    defaultCollapsed?: boolean
    groupCollapsible?: boolean
}) {
    const content = (
        <SidebarMenu>
            {items.map((item) => (
                item.items?.length ? (
                    <Collapsible key={item.title} asChild defaultOpen={!defaultCollapsed}>
                        <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                                <SidebarMenuButton tooltip={item.title} className="text-muted-foreground font-thin data-[state=open]:text-sidebar-foreground">
                                    <item.icon />
                                    <span>{item.title}</span>
                                </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleTrigger asChild>
                                <SidebarMenuAction className="data-[state=open]:rotate-90">
                                    <ChevronRight />
                                    <span className="sr-only">Toggle</span>
                                </SidebarMenuAction>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <SidebarMenuSub>
                                    {item.items?.map((subItem) => (
                                        <SidebarMenuSubItem key={subItem.title}>
                                            <SidebarMenuSubButton asChild>
                                                <Link to={subItem.url}>
                                                    <span>{subItem.title}</span>
                                                </Link>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    ))}
                                </SidebarMenuSub>
                            </CollapsibleContent>
                        </SidebarMenuItem>
                    </Collapsible>
                ) : (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild tooltip={item.title} className="text-muted-foreground font-thin">
                            <Link to={item.url}>
                                <item.icon />
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                )
            ))}
            {items.length === 0 ? (
                <SidebarMenuItem>
                    <SidebarMenuButton disabled>
                        <span className="text-muted-foreground">(vacío)</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            ) : null}
        </SidebarMenu>
    )

    if (groupCollapsible) {
        return (
            <Collapsible defaultOpen={!defaultCollapsed}>
                <SidebarGroup>
                    <CollapsibleTrigger asChild>
                        <SidebarGroupLabel className="flex items-center justify-between cursor-pointer select-none group">
                            <span>{label}</span>
                            {/* Show + when closed and - when open */}
                            <Plus className="h-4 w-4 opacity-70 group-data-[state=open]:hidden" />
                            <Minus className="h-4 w-4 opacity-70 hidden group-data-[state=open]:inline-block" />
                        </SidebarGroupLabel>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        {content}
                    </CollapsibleContent>
                </SidebarGroup>
            </Collapsible>
        )
    }

    return (
        <SidebarGroup>
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            {content}
        </SidebarGroup>
    )
}

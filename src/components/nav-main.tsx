"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import { Link } from '@tanstack/react-router'

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
}: {
    items: {
        title: string
        url: string
        icon: LucideIcon
        isActive?: boolean
        items?: {
            title: string
            url: string
        }[]
    }[]
    label?: string
}) {
    return (
        <SidebarGroup>
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => (
                    item.items?.length ? (
                        <Collapsible key={item.title} asChild defaultOpen={item.isActive}>
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
        </SidebarGroup>
    )
}

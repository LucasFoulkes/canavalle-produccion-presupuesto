import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
} from '@/components/ui/sidebar'
import { TABLES } from '@/services/db'
import { TABLE_GROUPS, SUMMARY_GROUPS } from '@/config/navigation'

export function AppSidebar() {
    return (
        <Sidebar>
            <SidebarHeader>
                <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="font-semibold">Canavalle</span>
                </div>
            </SidebarHeader>
            <SidebarContent className="gap-0">
                <SidebarMenu>
                    <Collapsible defaultOpen className="group/collapsible">
                        <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                                <SidebarMenuButton>
                                    <span>Tablas</span>
                                    <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <SidebarMenuSub>
                                    {TABLE_GROUPS.map((group) => (
                                        <Collapsible key={group.label} defaultOpen className="group/collapsible">
                                            <SidebarMenuSubItem>
                                                <CollapsibleTrigger asChild>
                                                    <SidebarMenuSubButton size="sm">
                                                        <span>{group.label}</span>
                                                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                                    </SidebarMenuSubButton>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                    <SidebarMenuSub className="ml-1">
                                                        {group.items
                                                            .map((id) => TABLES[id])
                                                            .filter((t): t is NonNullable<typeof t> => Boolean(t))
                                                            .map((t) => (
                                                                <SidebarMenuSubItem key={t.id}>
                                                                    <SidebarMenuSubButton asChild size="sm">
                                                                        <Link
                                                                            to="/db/$table"
                                                                            params={{ table: t.id }}
                                                                            activeProps={{ 'data-active': 'true' }}
                                                                        >
                                                                            <span>{t.title}</span>
                                                                        </Link>
                                                                    </SidebarMenuSubButton>
                                                                </SidebarMenuSubItem>
                                                            ))}
                                                    </SidebarMenuSub>
                                                </CollapsibleContent>
                                            </SidebarMenuSubItem>
                                        </Collapsible>
                                    ))}
                                </SidebarMenuSub>
                            </CollapsibleContent>
                        </SidebarMenuItem>
                    </Collapsible>
                    {SUMMARY_GROUPS.map((group) => (
                        <Collapsible key={group.label} defaultOpen className="group/collapsible">
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton>
                                        <span>{group.label}</span>
                                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        {group.items.map((item) => (
                                            <SidebarMenuSubItem key={item.to}>
                                                <SidebarMenuSubButton asChild size="sm">
                                                    <Link
                                                        to={item.to}
                                                        activeProps={{ 'data-active': 'true' }}
                                                    >
                                                        <span>{item.label}</span>
                                                    </Link>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    ))}
                </SidebarMenu>
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    )
}


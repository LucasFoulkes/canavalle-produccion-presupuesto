import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { TABLES } from '@/services/db'
import { TableFilterProvider, useTableFilter } from '@/hooks/use-table-filter'
import { FilterToolbar } from '@/features/table-filter/filter-toolbar'
import { AppSidebar } from '@/components/app-sidebar'

const RootLayout = () => (
    <TableFilterProvider>
        <SidebarProvider>
            <RootShell />
        </SidebarProvider>
    </TableFilterProvider>
)

function RootShell() {
    const currentTitle = useRouterState({
        select: (s) => {
            const match = s.matches.find((m) => m.routeId === '/db/$table') as
                | { params?: Record<string, unknown> }
                | undefined
            const tableId = (match?.params?.table as string | undefined) ?? undefined
            return tableId ? TABLES[tableId]?.title ?? tableId : 'Canavalle'
        },
    })

    const {
        query,
        setQuery,
        column,
        setColumn,
        columns,
        addFilter,
        filters,
        removeFilter,
        clearFilters,
    } = useTableFilter()

    return (
        <div className="flex h-svh w-full overflow-hidden">
            <AppSidebar />
            <SidebarInset>
                <div className="flex h-12 items-center gap-2 border-b px-2">
                    <SidebarTrigger />
                    <div className="font-medium">{currentTitle}</div>
                    <FilterToolbar
                        query={query}
                        setQuery={setQuery}
                        column={column}
                        setColumn={setColumn}
                        columns={columns}
                        addFilter={addFilter}
                        filters={filters}
                        removeFilter={removeFilter}
                        clearFilters={clearFilters}
                    />
                </div>
                <div className="flex-1 min-h-0 min-w-0 overflow-hidden px-4 pb-4">
                    <Outlet />
                </div>
            </SidebarInset>
        </div>
    )
}

export const Route = createRootRoute({ component: RootLayout })


import { createRootRoute, Outlet } from '@tanstack/react-router'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { OutboxIndicator } from '@/components/OutboxIndicator'

export const Route = createRootRoute({
  component: () => (
    <>
      <OfflineIndicator />
      <OutboxIndicator />
      <Outlet />
    </>
  ),
})
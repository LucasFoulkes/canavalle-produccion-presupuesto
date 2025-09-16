import * as React from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

/**
 * useDeferredLiveQuery
 * Adds a tiny delay (default 80ms) before hiding skeleton once data arrives
 * to avoid flash when IndexedDB returns immediately.
 */
export function useDeferredLiveQuery<T>(
    fn: () => Promise<T>,
    deps: any[],
    options?: { delay?: number; defer?: boolean }
) {
    const { delay = 80, defer = true } = options || {}
    const data = useLiveQuery(fn, deps) as T | undefined
    const [showSkeleton, setShowSkeleton] = React.useState(true)
    React.useEffect(() => {
        if (data !== undefined) {
            if (!defer) {
                setShowSkeleton(false)
                return
            }
            const t = setTimeout(() => setShowSkeleton(false), delay)
            return () => clearTimeout(t)
        }
    }, [data, delay, defer])
    const loading = showSkeleton && (data === undefined || (Array.isArray(data) && data.length === 0))
    return { data, loading }
}

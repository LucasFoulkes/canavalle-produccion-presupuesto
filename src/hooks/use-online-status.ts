import * as React from 'react'

export function useOnlineStatus() {
    const [online, setOnline] = React.useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

    React.useEffect(() => {
        const update = () => setOnline(typeof navigator === 'undefined' ? true : navigator.onLine)
        window.addEventListener('online', update)
        window.addEventListener('offline', update)
        return () => {
            window.removeEventListener('online', update)
            window.removeEventListener('offline', update)
        }
    }, [])

    return online
}

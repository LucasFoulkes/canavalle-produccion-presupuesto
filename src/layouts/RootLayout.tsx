export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col h-full min-h-screen bg-gradient-to-br from-slate-800 to-slate-900">
            <main className="flex-1 overflow-auto p-4">
                {children}
            </main>
        </div>
    )
}

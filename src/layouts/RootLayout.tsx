export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col h-full">
            <main className="flex-1 overflow-auto p-4">
                {children}
            </main>
        </div>
    )
}

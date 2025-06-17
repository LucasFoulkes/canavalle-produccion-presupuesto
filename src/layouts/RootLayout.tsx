export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col h-full min-h-screen bg-background">
            {/* Professional subtle background */}
            <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/20 to-background pointer-events-none" />

            <main className="relative flex-1 overflow-auto">
                <div className="mx-auto max-w-7xl p-4 md:p-6">
                    {children}
                </div>
            </main>
        </div>
    )
}

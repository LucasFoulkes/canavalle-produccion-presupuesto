export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col h-full bg-background">
            {/* Bauhaus geometric background */}
            <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/5 to-background pointer-events-none" />
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
                backgroundImage: `
                    linear-gradient(45deg, oklch(0.2 0.15 240) 25%, transparent 25%),
                    linear-gradient(-45deg, oklch(0.2 0.15 240) 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, oklch(0.2 0.15 240) 75%),
                    linear-gradient(-45deg, transparent 75%, oklch(0.2 0.15 240) 75%)
                `,
                backgroundSize: '32px 32px',
                backgroundPosition: '0 0, 0 16px, 16px -16px, -16px 0px'
            }} />

            <main className="relative flex-1 overflow-auto">
                <div className="mx-auto max-w-7xl p-4 md:p-6 h-full">
                    {children}
                </div>
            </main>
        </div>
    )
}

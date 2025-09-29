import { useCallback, useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Leaf, Mic, AudioLines, X, RotateCcw } from "lucide-react"
import { useOpenAIChat } from "@/hooks/useOpenAIChat"

export function FooterAI() {
    const [inputValue, setInputValue] = useState("")
    const [showOverlay, setShowOverlay] = useState(false)

    const { loading, responseText, error, metrics, sendMessage, clearConversation, cancelRequest } = useOpenAIChat({
        apiKey: 'REDACTED',
        model: 'gpt-5-nano',
        instructions: 'respond in as few words as possible, be concise and brief, use bullet points if necessary, be direct and to the point, avoid pleasantries.',
        debug: true,
    })

    useEffect(() => {
        if (metrics?.endTime && metrics?.startTime) {
            console.log('Performance Summary:', {
                totalTime: `${(metrics.endTime - metrics.startTime).toFixed(2)}ms`,
                timeToFirstChunk: metrics.firstChunkTime ? `${(metrics.firstChunkTime - metrics.startTime).toFixed(2)}ms` : null,
            })
        }
    }, [metrics])

    const handleSubmit = useCallback(async () => {
        if (!inputValue.trim() || loading) return
        try {
            setShowOverlay(true)
            await sendMessage(inputValue)
            setInputValue("")
        } catch (err) {
            console.error('Failed to send message:', err)
        }
    }, [inputValue, loading, sendMessage])

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            void handleSubmit()
        }
    }, [handleSubmit])

    const handleCloseResponse = useCallback(() => {
        cancelRequest()
        setShowOverlay(false)
    }, [cancelRequest])

    return (
        <footer className="flex py-3 shrink-0 items-center">
            <div className="w-full px-4">
                <div className="mx-auto w-full max-w-[720px] relative">
                    {showOverlay && (
                        <div className="absolute bottom-20 left-0 right-0 z-50">
                            <div className="w-full rounded-xl border bg-background shadow p-3 max-h-60 overflow-auto">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="text-sm whitespace-pre-wrap leading-relaxed flex-1">
                                        {error ? (
                                            <span className="text-destructive">Error: {error}</span>
                                        ) : (
                                            <>
                                                {responseText}
                                                {loading && (
                                                    <span className="inline-flex items-center gap-1 ml-1 align-baseline" aria-label="Generando">
                                                        <span className="inline-block size-1.5 rounded-full bg-muted-foreground/70 animate-pulse" style={{ animationDelay: '0ms' }} />
                                                        <span className="inline-block size-1.5 rounded-full bg-muted-foreground/70 animate-pulse" style={{ animationDelay: '150ms' }} />
                                                        <span className="inline-block size-1.5 rounded-full bg-muted-foreground/70 animate-pulse" style={{ animationDelay: '300ms' }} />
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={cancelRequest}
                                            disabled={!loading}
                                            title="Detener"
                                            className="inline-flex h-7 px-2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 disabled:opacity-60 text-xs border"
                                        >
                                            Stop
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { clearConversation(); setShowOverlay(false) }}
                                            disabled={loading}
                                            title="Nueva sesión"
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 disabled:opacity-60"
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label="Cerrar"
                                            onClick={handleCloseResponse}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center rounded-full border bg-background px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/40">
                        <button
                            type="button"
                            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/60"
                        >
                            <Leaf className="h-5 w-5" />
                        </button>
                        <Input
                            className="h-12 flex-1 border-0 bg-transparent px-3 shadow-none focus-visible:ring-0 focus-visible:border-transparent"
                            placeholder={loading ? "Pensando..." : "Pregunta lo que sea..."}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading}
                        />
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/60"
                            >
                                <Mic className="h-5 w-5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleSubmit()}
                                disabled={loading || !inputValue.trim()}
                                className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground disabled:opacity-60"
                            >
                                <AudioLines className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default FooterAI

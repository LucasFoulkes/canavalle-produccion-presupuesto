import { useState, useCallback, useRef, useEffect } from 'react'
import OpenAI from 'openai'

interface UseOpenAIChatConfig {
    apiKey: string
    model?: string
    instructions?: string
    debug?: boolean
}

interface ChatMetrics {
    startTime?: number
    firstChunkTime?: number
    endTime?: number
}

// Store client instances outside component lifecycle
const clientCache = new Map<string, OpenAI>()

export function useOpenAIChat({
    apiKey,
    model = 'gpt-5-nano',
    instructions = 'Be concise and brief, use bullet points if necessary',
    debug = false
}: UseOpenAIChatConfig) {
    const [loading, setLoading] = useState(false)
    const [responseText, setResponseText] = useState<string | null>(null)
    const [previousResponseId, setPreviousResponseId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [metrics, setMetrics] = useState<ChatMetrics>({})

    const abortRef = useRef<AbortController | null>(null)

    // Get or create client - cached by API key
    const getClient = useCallback(() => {
        if (!clientCache.has(apiKey)) {
            if (debug) console.log('Creating new OpenAI client instance')
            clientCache.set(apiKey, new OpenAI({
                apiKey,
                dangerouslyAllowBrowser: true,
                timeout: 60000, // 60 second timeout
                maxRetries: 2,
            }))
        } else {
            if (debug) console.log('Using cached OpenAI client instance')
        }
        return clientCache.get(apiKey)!
    }, [apiKey, debug])

    // Cleanup on unmount or API key change
    useEffect(() => {
        return () => {
            // Optional: Clean up client on unmount if needed
            // clientCache.delete(apiKey)
        }
    }, [apiKey])

    const sendMessage = useCallback(async (message: string) => {
        if (!message.trim()) return

        const startTime = performance.now()
        if (debug) console.log('Starting request at:', startTime)

        try {
            setLoading(true)
            setError(null)
            setResponseText("")
            setMetrics({ startTime })

            // Cancel any in-flight request
            if (abortRef.current) {
                if (debug) console.log('Aborting previous request')
                abortRef.current.abort()
            }
            const controller = new AbortController()
            abortRef.current = controller

            // Get cached client
            const client = getClient()

            // Prepare request
            const requestParams: any = {
                model,
                input: message,
                stream: true,
            }

            if (!previousResponseId) {
                requestParams.instructions = instructions
            } else {
                requestParams.previous_response_id = previousResponseId
            }

            if (debug) {
                console.log('Sending request with params:', requestParams)
                console.log('Time to prepare request:', performance.now() - startTime, 'ms')
            }

            // Make API call
            const response = await client.responses.create(
                requestParams,
                { signal: controller.signal }
            )

            let fullText = ""
            let firstChunkReceived = false
            let responseId: string | undefined

            // Handle streaming
            for await (const chunk of response as any) {
                if (!firstChunkReceived) {
                    const firstChunkTime = performance.now()
                    if (debug) {
                        console.log('First chunk received after:', firstChunkTime - startTime, 'ms')
                    }
                    setMetrics(prev => ({ ...prev, firstChunkTime }))
                    firstChunkReceived = true
                }

                // Debug: Log chunk structure once
                if (debug && !fullText) {
                    console.log('Chunk structure:', chunk)
                }

                // Store response ID from chunk
                if ((chunk as any).id) {
                    responseId = (chunk as any).id
                }

                // Process different response formats
                if ((chunk as any).output && Array.isArray((chunk as any).output)) {
                    for (const output of (chunk as any).output) {
                        if (output.type === 'message' && output.content) {
                            for (const content of output.content) {
                                if (content.text) {
                                    fullText = content.text
                                    setResponseText(fullText)
                                }
                            }
                        }
                    }
                } else if ((chunk as any).type === 'response.output_text.delta') {
                    fullText += (chunk as any).delta || ''
                    setResponseText(fullText)
                } else if ((chunk as any).delta) {
                    // Simple delta format
                    fullText += (chunk as any).delta
                    setResponseText(fullText)
                }
            }

            // Store response ID for conversation continuity
            if (responseId) {
                setPreviousResponseId(responseId)
            }

            const endTime = performance.now()
            if (debug) {
                console.log('Request completed in:', endTime - startTime, 'ms')
                console.log('Response length:', fullText.length, 'characters')
            }
            setMetrics(prev => ({ ...prev, endTime }))

            return fullText

        } catch (err: any) {
            if (err.name !== 'AbortError') {
                const errorMessage = err?.message || 'Error processing request'
                setError(errorMessage)
                if (debug) {
                    console.error('Request failed:', err)
                    console.log('Failed after:', performance.now() - startTime, 'ms')
                }
                throw err
            }
        } finally {
            setLoading(false)
            abortRef.current = null
        }
    }, [model, instructions, previousResponseId, getClient, debug])

    const clearConversation = useCallback(() => {
        if (abortRef.current) abortRef.current.abort()
        setPreviousResponseId(null)
        setResponseText(null)
        setError(null)
        setMetrics({})
    }, [])

    const cancelRequest = useCallback(() => {
        if (abortRef.current) {
            abortRef.current.abort()
            setLoading(false)
        }
    }, [])

    return {
        // State
        loading,
        responseText,
        error,
        hasConversation: !!previousResponseId,

        // Performance metrics
        metrics: debug ? metrics : undefined,

        // Actions
        sendMessage,
        clearConversation,
        cancelRequest
    }
}

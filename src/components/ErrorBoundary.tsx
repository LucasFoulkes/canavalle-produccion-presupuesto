import React from 'react'
import { StateDisplay } from './StateDisplay'

interface ErrorBoundaryState {
    hasError: boolean
    error?: Error
}

interface ErrorBoundaryProps {
    children: React.ReactNode
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        console.log('🚨 ErrorBoundary caught error:', error)
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.log('🚨 ErrorBoundary componentDidCatch:', { error, errorInfo })
    }

    render() {
        if (this.state.hasError) {
            return (
                <StateDisplay
                    message={`Error: ${this.state.error?.message || 'Algo salió mal'}`}
                    type="error"
                />
            )
        }

        return this.props.children
    }
}

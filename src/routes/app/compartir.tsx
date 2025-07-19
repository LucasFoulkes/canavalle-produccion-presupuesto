import { createFileRoute } from '@tanstack/react-router'
import QRCode from "react-qr-code"
import { Button } from "@/components/ui/button"
import { Share2, Copy, Check } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/app/compartir')({
  component: CompartirComponent,
})

function CompartirComponent() {
  const [copied, setCopied] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const value = window.location.origin

  const handleShare = async () => {
    setIsSharing(true)

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Aplicación de Producción Agrícola',
          text: 'Accede a la aplicación de gestión de producción agrícola',
          url: value,
        })
      } catch (error) {
        // User cancelled sharing, not an error
        if (error instanceof Error && error.name !== 'AbortError') {
          console.warn('Error sharing:', error)
          await handleCopyFallback()
        }
      }
    } else {
      await handleCopyFallback()
    }

    setIsSharing(false)
  }

  const handleCopyFallback = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.warn('Error copying to clipboard:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = value
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className='w-full h-screen flex flex-col'>
      <div className='flex-1 flex flex-col items-center justify-center p-4 gap-6'>
        <div className="text-center">
          <p className="text-lg font-medium mb-2">
            Comparte la aplicación
          </p>
          <p className="text-sm text-gray-600">
            Usa el código QR o el botón de compartir
          </p>
        </div>

        <div className="max-w-xs w-full">
          <QRCode
            size={256}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            value={value}
            viewBox={`0 0 256 256`}
          />
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleShare}
            disabled={isSharing}
            className="flex items-center gap-2 px-6 py-3"
            size="lg"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                ¡Copiado!
              </>
            ) : (
              <>
                <Share2 className="w-5 h-5" />
                {isSharing ? 'Compartiendo...' : 'Compartir enlace'}
              </>
            )}
          </Button>

          <Button
            onClick={handleCopyFallback}
            variant="outline"
            className="flex items-center gap-2 px-6 py-3"
            size="lg"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                ¡Copiado!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copiar enlace
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
'use client'

import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react'

export interface BpmnCanvasRef {
  importXML: (xml: string) => Promise<void>
  exportXML: () => Promise<string>
  exportSVG: () => Promise<string>
  zoom: (direction: 'in' | 'out' | 'fit') => void
}

interface BpmnCanvasProps {
  className?: string
  style?: React.CSSProperties
  onReady?: () => void
}

const BpmnCanvas = forwardRef<BpmnCanvasRef, BpmnCanvasProps>(
  ({ className, style, onReady }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modelerRef = useRef<any>(null)
    const [isReady, setIsReady] = useState(false)

    useEffect(() => {
      // REGRA CRÍTICA: bpmn-js SEMPRE via import() dinâmico — nunca import estático
      import('bpmn-js/lib/Modeler').then(({ default: BpmnModeler }) => {
        if (!containerRef.current || modelerRef.current) return

        modelerRef.current = new BpmnModeler({
          container: containerRef.current,
        })

        setIsReady(true)
        onReady?.()
      })

      return () => {
        modelerRef.current?.destroy()
        modelerRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useImperativeHandle(ref, () => ({
      importXML: async (xml: string) => {
        if (!modelerRef.current) {
          throw new Error('Modeler not ready yet')
        }
        try {
          await modelerRef.current.importXML(xml)
          // Small delay to let bpmn-js finish rendering before fitting
          setTimeout(() => {
            modelerRef.current?.get('canvas')?.zoom('fit-viewport')
          }, 100)
        } catch (err) {
          console.error('[BpmnCanvas] importXML error:', err)
          throw err
        }
      },
      exportXML: async () => {
        const { xml } = await modelerRef.current?.saveXML({ format: true })
        return xml
      },
      exportSVG: async () => {
        const { svg } = await modelerRef.current?.saveSVG()
        return svg
      },
      zoom: (direction: 'in' | 'out' | 'fit') => {
        const canvas = modelerRef.current?.get('canvas')
        const scroll = modelerRef.current?.get('zoomScroll')
        if (direction === 'fit') canvas?.zoom('fit-viewport')
        else if (direction === 'in') scroll?.zoom(0.3)
        else scroll?.zoom(-0.3)
      },
    }))

    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          width: '100%',
          height: '100%',
          // Show a subtle grid pattern while empty
          backgroundImage: isReady && !modelerRef.current
            ? 'radial-gradient(circle, var(--border2) 1px, transparent 1px)'
            : undefined,
          backgroundSize: '24px 24px',
          ...style,
        }}
      />
    )
  }
)

BpmnCanvas.displayName = 'BpmnCanvas'
export default BpmnCanvas


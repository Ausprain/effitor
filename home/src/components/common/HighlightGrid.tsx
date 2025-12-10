import './HighlightGrid.css'

import React, { useEffect, useRef } from 'react'

interface HighlightGridProps {
  children: React.ReactNode
  className?: string
}

export const HighlightGrid: React.FC<HighlightGridProps> = ({
  children,
  className = 'grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4',
}) => {
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!gridRef.current) return
    let time = Date.now()
    function handleMouseMove(this: HTMLDivElement, ev: MouseEvent) {
      if (Date.now() - time < 10) return
      time = Date.now()
      const { clientX, clientY } = ev
      if (!this.children.length) {
        return
      }
      const rects = []
      for (const el of this.children) {
        rects.push({
          el: el as HTMLElement,
          rect: el.getBoundingClientRect(),
        })
      }
      for (const { el, rect } of rects) {
        el.style.setProperty('--x', `${clientX - rect.left}px`)
        el.style.setProperty('--y', `${clientY - rect.top}px`)
      }
    }
    gridRef.current.addEventListener('mousemove', handleMouseMove)
    return () => {
      gridRef.current?.removeEventListener('mousemove', handleMouseMove)
    }
  })

  return (
    <div ref={gridRef} className={`highlight-grid grid ${className} justify-items-center relative`}>
      {/* Windows 10 style highlight effect */}
      {React.Children.map(children, child => (
        <div className="w-full">
          {child}
        </div>
      ))}
    </div>
  )
}

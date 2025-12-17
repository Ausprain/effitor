import './HighlightGrid.css'

import React, { useEffect, useRef } from 'react'

interface HighlightGridProps {
  children: React.ReactNode
  className?: string
}

export const HighlightGrid: React.FC<HighlightGridProps> = ({
  children,
  className = 'grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4 p-8 -m-8',
}) => {
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!gridRef.current) return
    const gridEl = gridRef.current
    let time = Date.now(), cursorIn = false, startY = 0
    gridEl.onmouseenter = () => {
      cursorIn = true
    }
    gridEl.onmouseleave = () => {
      cursorIn = false
    }
    // 鼠标移动时移动光源
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
    // 滚动时鼠标本身并没有动不会触发 mousemove，需要通过滚动事件来更新光源位置
    const handleScroll = () => {
      if (!cursorIn || (Date.now() - time < 30)) return
      time = Date.now()
      const scrollY = window.scrollY
      const deltaY = scrollY - startY
      startY = scrollY
      for (const el of gridEl.children as HTMLCollectionOf<HTMLElement>) {
        const y = el.style.getPropertyValue('--y')?.replace('px', '')
        if (!y) return
        el.style.setProperty('--y', `${parseFloat(y) + deltaY}px`)
      }
    }
    gridEl.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('scroll', handleScroll)
    return () => {
      gridEl.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('scroll', handleScroll)
    }
  }, [])

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

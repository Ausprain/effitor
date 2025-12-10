import React from 'react'

// Logo 1: 钢笔与文字组合
export const Logo1: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    className={className}
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="logo1-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6671e7" />
        <stop offset="100%" stopColor="#9921e7" />
      </linearGradient>
    </defs>
    {/* 背景圆形 */}
    <circle cx="16" cy="16" r="15" fill="url(#logo1-gradient)" opacity="0.1" />
    {/* 钢笔笔尖 */}
    <path
      d="M24 8L16 16L8 24M16 16L28 4"
      stroke="url(#logo1-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* 钢笔握柄 */}
    <rect
      x="22"
      y="2"
      width="3"
      height="8"
      rx="1.5"
      fill="url(#logo1-gradient)"
      transform="rotate(-45 23.5 6)"
    />
    {/* 文字装饰 */}
    <path
      d="M10 22H22M10 26H18"
      stroke="url(#logo1-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
)

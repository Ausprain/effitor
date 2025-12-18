const MainSlogan = () => (
  <div className="text-center py-8
    text-6xl
    md:text-7xl
    lg:text-8xl
    xl:text-9xl
    italic font-bold"
  >
    <p className="leading-[1.2] -my-8 md:my-0">
      An elegant and
    </p>
    <p className="lg:my-8 xl:my-12 scale-[1.1]">
      <svg
        width="100%"
        height="100"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="textGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9921e7">
              <animate
                attributeName="stop-color"
                values="#9921e7; #6671e7; #9921e7;"
                keyTimes="0; 0.5; 1"
                dur="2s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor="#6671e7">
              <animate
                attributeName="stop-color"
                values="#6671e7; #9921e7; #6671e7;"
                keyTimes="0; 0.5; 1"
                dur="2s"
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
        </defs>
        <text
          x="50%"
          y="95%"
          textAnchor="middle"
        >
          <tspan fill="url(#textGradient)">
            effi
          </tspan>
          <tspan fill="currentColor">
            cient edi
          </tspan>
          <tspan fill="url(#textGradient)">tor</tspan>
          .
        </text>
      </svg>
    </p>
  </div>
)

export default MainSlogan

import type { FeatureData } from './config'

export const FeatureList: React.FC<{
  featureList: FeatureData[]
  onSelectFeature: (index: number) => void
}> = ({
  featureList,
  onSelectFeature,
}) => {
  return (
    <ul className="h-full list flex-row lg:flex-col
    bg-base-100 text-gray-700 dark:text-gray-300 transition-colors
    overflow-auto"
    >
      {featureList.map((feat, index) => (
        <li
          key={feat.title}
          className="flex-1 shrink-0 min-w-64 cursor-pointer lg:max-h-[72px]"
          onClick={() => {
            onSelectFeature(index)
          }}
        >
          <div className="list-row hover:bg-base-200">
            <div className="flex items-center justify-center">
              <span className="size-8 rounded-box">{feat.icon}</span>
            </div>
            <div>
              <div className="text-[1.1em] font-bold">{feat.title}</div>
              <div className="text-[0.8em] opacity-60">{feat.pluginName}</div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

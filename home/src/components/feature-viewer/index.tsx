import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FeatureEditor } from './FeatureEditor'
import { FeatureList } from './FeatureList'
import { featureDataList } from './data'
import { useNavbar } from '../../context/NavbarContext'

export const FeatureViewer = () => {
  const { i18n } = useTranslation()
  const featureList = useMemo(() => {
    return featureDataList.map((map) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return map[i18n.language] || map['en']!
    })
  }, [i18n.language])
  const [currIndex, setCurrIndex] = useState<number>(0)
  const selectNext = useCallback(() => {
    setCurrIndex(prev => (prev + 1) % featureList.length)
  }, [])

  const { setEditorMarkdown } = useNavbar()
  const tryThis = useCallback(() => {
    const featureData = featureList[currIndex]
    if (!featureData) {
      return
    }
    setEditorMarkdown(featureData.mdText)
  }, [currIndex, featureList])

  return (
    <div className="lg:max-h-[600px] flex gap-4 flex-col lg:flex-row">
      <div className="lg:max-w-64 rounded-box shadow-md overflow-hidden">
        <FeatureList
          featureList={featureList}
          onSelectFeature={setCurrIndex}
        >
        </FeatureList>
      </div>
      <div className="flex-1 rounded-box shadow-md overflow-hidden">
        <FeatureEditor
          featureData={featureList[currIndex] || null}
          onFinished={selectNext}
          onTryThis={tryThis}
        >
        </FeatureEditor>
      </div>
    </div>
  )
}

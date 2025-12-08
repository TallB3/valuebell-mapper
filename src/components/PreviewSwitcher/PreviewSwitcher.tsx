import { useEffect, useMemo, useState } from 'react'
import { Badge, Segmented, Tag, message } from 'antd'
import { FileDoneOutlined, FileTextOutlined } from '@ant-design/icons'
import MapViewer from '../MapViewer/MapViewer'
import TranscriptViewer from '../TranscriptViewer/TranscriptViewer'
import styles from './PreviewSwitcher.module.scss'

type ActiveView = 'transcript' | 'mapping'

interface PreviewSwitcherProps {
  transcriptUrl?: string
  mappingContent?: string
}

function PreviewSwitcher({ transcriptUrl = '', mappingContent = '' }: PreviewSwitcherProps) {
  const trimmedMapping = useMemo(() => mappingContent.trim(), [mappingContent])
  const hasTranscript = Boolean(transcriptUrl)
  const hasMapping = Boolean(trimmedMapping)

  const [activeView, setActiveView] = useState<ActiveView | null>(null)
  const [hasSeenMapping, setHasSeenMapping] = useState(false)

  useEffect(() => {
    if (hasMapping && !hasSeenMapping) {
      message.success('Mapping is ready — switch tabs to view it')
    }
  }, [hasMapping, hasSeenMapping])

  const options = [
    hasTranscript && {
      label: 'Transcript',
      value: 'transcript',
      icon: <FileTextOutlined />
    },
    hasMapping && {
      label: 'Mapping',
      value: 'mapping',
      icon: <FileDoneOutlined />
    }
  ].filter(Boolean) as { label: string; value: ActiveView; icon: JSX.Element }[]
  const currentView = useMemo(() => {
    if (activeView && options.some((opt) => opt.value === activeView)) return activeView
    if (hasMapping) return 'mapping'
    if (hasTranscript) return 'transcript'
    return null
  }, [activeView, hasMapping, hasTranscript, options])

  if (!hasTranscript && !hasMapping) {
    return null
  }

  return (
    <div className={styles.switcherShell}>
      {options.length > 1 ? (
        <div className={styles.header}>
          <Segmented
            size="large"
            options={options}
            value={activeView || options[0].value}
            onChange={(value) => {
              const next = value as ActiveView
              setActiveView(next)
              if (next === 'mapping') {
                setHasSeenMapping(true)
              }
            }}
            className={styles.segmented}
          />
        </div>
      ) : (
        <div className={styles.singleLabel}>
          <Tag color="blue" icon={options[0].value === 'transcript' ? <FileTextOutlined /> : <FileDoneOutlined />}>
            {options[0].label} preview
          </Tag>
        </div>
      )}

      <div className={styles.viewerSlot}>
        {currentView === 'transcript' && hasTranscript && (
          <TranscriptViewer transcriptUrl={transcriptUrl} />
        )}
        {currentView === 'mapping' && hasMapping && <MapViewer content={trimmedMapping} />}
        {hasMapping && !hasSeenMapping && currentView !== 'mapping' && (
          <div className={styles.inlineNudge}>
            <Badge status="processing" text="Mapping ready — use the toggle to view it" />
          </div>
        )}
      </div>
    </div>
  )
}

export default PreviewSwitcher

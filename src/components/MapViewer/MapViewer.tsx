import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button, Segmented, Tag, Tooltip, message } from 'antd'
import { CopyOutlined, FileDoneOutlined } from '@ant-design/icons'
import styles from './MapViewer.module.scss'

interface MapViewerProps {
  content: string
}

const RTL_CHARS_REGEX = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/

const detectIsRtl = (text: string) => RTL_CHARS_REGEX.test(text)

function MapViewer({ content }: MapViewerProps) {
  const [detectedRtl, setDetectedRtl] = useState(false)
  const [directionMode, setDirectionMode] = useState<'auto' | 'ltr' | 'rtl'>('auto')

  useEffect(() => {
    setDetectedRtl(detectIsRtl(content))
  }, [content])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      message.success('Mapping copied to clipboard')
    } catch {
      message.error('Failed to copy mapping')
    }
  }

  const resolvedDirection = directionMode === 'auto' ? (detectedRtl ? 'rtl' : 'ltr') : directionMode
  const directionLabel =
    directionMode === 'auto'
      ? `Auto (${detectedRtl ? 'RTL' : 'LTR'})`
      : `Set to ${directionMode.toUpperCase()}`

  const rendered = useMemo(
    () => (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
          code: ({ inline, className, children, ...rest }: any) =>
            inline ? (
              <code className={styles.inlineCode} {...rest}>{children}</code>
            ) : (
              <pre className={styles.codeBlock}>
                <code className={className} {...rest}>{children}</code>
              </pre>
            )
        }}
      >
        {content}
      </ReactMarkdown>
    ),
    [content]
  )

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.eyebrowRow}>
            <FileDoneOutlined className={styles.titleIcon} />
            <div className={styles.eyebrow}>Mapping preview</div>
          </div>
        </div>
        <Tooltip title="Copy full mapping to clipboard">
          <Button
            type="primary"
            icon={<CopyOutlined />}
            onClick={handleCopy}
          >
            Copy mapping
          </Button>
        </Tooltip>
      </div>

      <div className={styles.shell} dir={resolvedDirection}>
        <div className={styles.metaRow}>
          <Tag color={resolvedDirection === 'rtl' ? 'volcano' : 'blue'}>{directionLabel}</Tag>
          <Segmented
            size="small"
            value={directionMode}
            onChange={(value) => setDirectionMode(value as 'auto' | 'ltr' | 'rtl')}
            options={[
              { label: 'Auto', value: 'auto' },
              { label: 'LTR', value: 'ltr' },
              { label: 'RTL', value: 'rtl' }
            ]}
          />
        </div>
        <div className={styles.markdownBody}>{rendered}</div>
      </div>
    </section>
  )
}

export default MapViewer

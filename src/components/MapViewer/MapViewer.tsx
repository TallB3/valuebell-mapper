import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button, Tag, Tooltip, message } from 'antd'
import { CopyOutlined, FileDoneOutlined } from '@ant-design/icons'
import styles from './MapViewer.module.scss'

interface MapViewerProps {
  content: string
}

const RTL_CHARS_REGEX = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/

const detectIsRtl = (text: string) => RTL_CHARS_REGEX.test(text)

function MapViewer({ content }: MapViewerProps) {
  const [isRtl, setIsRtl] = useState(false)

  useEffect(() => {
    setIsRtl(detectIsRtl(content))
  }, [content])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      message.success('Mapping copied to clipboard')
    } catch {
      message.error('Failed to copy mapping')
    }
  }

  const directionLabel = isRtl ? 'RTL detected' : 'LTR detected'

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
          <div className={styles.eyebrow}>Mapping preview</div>
          <div className={styles.titleRow}>
            <FileDoneOutlined className={styles.titleIcon} />
            <h3>Gemini output (Markdown)</h3>
          </div>
          <p className={styles.subtext}>
            Rendered directly from the llmResponse field—no download needed.
          </p>
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

      <div className={styles.shell} dir={isRtl ? 'rtl' : 'ltr'}>
        <div className={styles.metaRow}>
          <Tag color={isRtl ? 'volcano' : 'blue'}>{directionLabel}</Tag>
          <span className={styles.metaNote}>Auto-detected from text.</span>
        </div>
        <div className={styles.markdownBody}>{rendered}</div>
      </div>
    </section>
  )
}

export default MapViewer

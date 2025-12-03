import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Button, Spin, Tag, message } from 'antd'
import { CopyOutlined, ReloadOutlined, FileTextOutlined } from '@ant-design/icons'
import { extractRawText } from 'mammoth/mammoth.browser'
import styles from './TranscriptViewer.module.scss'

interface TranscriptViewerProps {
  transcriptUrl: string
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

const RTL_CHARS_REGEX = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/

const detectIsRtl = (text: string) => RTL_CHARS_REGEX.test(text)

function TranscriptViewer({ transcriptUrl }: TranscriptViewerProps) {
  const [transcriptText, setTranscriptText] = useState('')
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isRtl, setIsRtl] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchTranscript = useCallback(async () => {
    if (!transcriptUrl) return

    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setLoadState('loading')
    setErrorMessage(null)

    try {
      const response = await fetch(transcriptUrl, { signal: controller.signal })
      if (!response.ok) {
        throw new Error(`Failed to download transcript (${response.status})`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const { value } = await extractRawText({ arrayBuffer })
      const cleaned = (value || '')
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n') // collapse runaway empty lines
        .replace(/:\s*\n\s*\n/g, ':\n') // keep speaker label tight to its text
        .trim()

      setTranscriptText(cleaned)
      setIsRtl(detectIsRtl(cleaned))
      setLoadState('ready')
    } catch (error: any) {
      if (controller.signal.aborted) return
      setErrorMessage(error?.message || 'Unable to load transcript')
      setLoadState('error')
    }
  }, [transcriptUrl])

  useEffect(() => {
    fetchTranscript()
    return () => abortControllerRef.current?.abort()
  }, [fetchTranscript])

  const handleCopy = async () => {
    if (!transcriptText) return
    try {
      await navigator.clipboard.writeText(transcriptText)
      message.success('Transcript copied to clipboard')
    } catch (error) {
      message.error('Failed to copy transcript')
    }
  }

  const showCopyButton = loadState === 'ready' && Boolean(transcriptText)
  const directionLabel = isRtl ? 'RTL detected' : 'LTR detected'

  return (
    <section className={styles.viewerCard} aria-live="polite">
      <div className={styles.viewerHeader}>
        <div className={styles.titleGroup}>
          <div className={styles.eyebrow}>Transcript preview</div>
          <div className={styles.titleRow}>
            <FileTextOutlined className={styles.titleIcon} />
            <h3>Read it without downloading</h3>
          </div>
          <p className={styles.subtext}>
            We fetch the .docx for you, turn it into text, and render it here with RTL awareness.
          </p>
        </div>
        <div className={styles.actions}>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchTranscript}
            disabled={loadState === 'loading'}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<CopyOutlined />}
            onClick={handleCopy}
            disabled={!showCopyButton}
          >
            Copy transcript
          </Button>
        </div>
      </div>

      <div className={styles.cardBody}>
        {loadState === 'loading' && (
          <div className={styles.loadingState}>
            <Spin tip="Fetching transcript..." />
          </div>
        )}

        {loadState === 'error' && (
          <div className={styles.errorState}>
            <Alert
              type="error"
              showIcon
              message="Could not load the transcript"
              description={errorMessage || 'Please try again in a moment.'}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchTranscript}
              block
              size="large"
            >
              Retry
            </Button>
          </div>
        )}

        {loadState === 'ready' && (
          <div className={styles.transcriptShell} dir={isRtl ? 'rtl' : 'ltr'}>
            <div className={styles.metaRow}>
              <Tag color={isRtl ? 'volcano' : 'blue'}>{directionLabel}</Tag>
              <span className={styles.metaNote}>Auto-detected from transcript text.</span>
            </div>
            {transcriptText ? (
              <div className={styles.transcriptText}>{transcriptText}</div>
            ) : (
              <div className={styles.emptyState}>
                We loaded the file, but it looks empty.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default TranscriptViewer

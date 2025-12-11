import { Button, Steps } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import styles from './ProcessingView.module.scss'

interface StatusRow {
  id?: number | string
  status?: string | null
  resultTranscriptUrl?: string | null
  resultMappingUrl?: string | null
  error?: boolean
}

interface ProcessingViewProps {
  statusRow: StatusRow | null
  errorMessage: string | null
  isErrored: boolean
  currentGif: string | null
  elapsedTime: number
  onReset: () => void
}

function ProcessingView({
  statusRow,
  errorMessage,
  isErrored,
  currentGif,
  elapsedTime,
  onReset
}: ProcessingViewProps) {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const statusLabel = (() => {
    switch (statusRow?.status) {
      case 'queued':
        return 'Queued — waiting to start'
      case 'transcribing':
        return 'Transcribing audio'
      case 'mapping':
        return 'Generating mapping'
      case 'done':
        return 'Completed'
      case 'timeout':
        return 'Timed out'
      default:
        return 'Starting'
    }
  })()

  const getCurrentStep = () => {
    switch (statusRow?.status) {
      case 'queued': return 0
      case 'transcribing': return 1
      case 'mapping': return 2
      case 'done': return 3
      default: return 0
    }
  }

  return (
    <div>
      <div className={styles.formHeader}>
        <h2>Processing Request</h2>
        {!errorMessage && !isErrored && (
          <div className={styles.spiralSpinner} />
        )}
        <p>
          {statusLabel}
          {!errorMessage && !isErrored && (
            <span className={styles.ellipsis}></span>
          )}
        </p>
      </div>

      {!errorMessage && !isErrored && (
        <>
          {currentGif && (
            <div className={styles.gifContainer}>
              <img src={currentGif} alt="Processing..." />
            </div>
          )}

          <div className={styles.timer}>
            Time Elapsed: <span>{formatTime(elapsedTime)}</span>
          </div>

          <div className={styles.stepsContainer}>
            <Steps
              current={getCurrentStep()}
              size="small"
              items={[
                { title: 'Queued', icon: getCurrentStep() === 0 && <LoadingOutlined /> },
                { title: 'Transcribing', icon: getCurrentStep() === 1 && <LoadingOutlined /> },
                { title: 'Mapping', icon: getCurrentStep() === 2 && <LoadingOutlined /> },
              ]}
            />
          </div>
        </>
      )}

      {errorMessage ? (
        <div className={styles.errorMessage}>{errorMessage}</div>
      ) : (
        <div className={styles.infoMessage}>
          Keep this page open while we process your file. We will refresh the status and links automatically.
        </div>
      )}

      <div className={styles.buttonsContainer}>
        {statusRow?.resultTranscriptUrl && (
          <Button
            type="default"
            size="large"
            block
            onClick={() => window.open(statusRow.resultTranscriptUrl as string, '_blank')}
          >
            Open Transcript (ready)
          </Button>
        )}

        {statusRow?.resultMappingUrl && (
          <Button
            type="default"
            size="large"
            block
            onClick={() => window.open(statusRow.resultMappingUrl as string, '_blank')}
          >
            Open Mapping (ready)
          </Button>
        )}

        {isErrored && (
          <Button block size="large" onClick={onReset}>
            Submit Another
          </Button>
        )}
      </div>
    </div>
  )
}

export default ProcessingView

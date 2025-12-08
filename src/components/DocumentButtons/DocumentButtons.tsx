import { Button } from 'antd'
import { LinkOutlined, RedoOutlined, CheckCircleFilled } from '@ant-design/icons'
import styles from './DocumentButtons.module.scss'

interface DocumentButtonsProps {
  humanReadableTranscriptDriveFileUrl: string
  mappingDriveFileUrl: string
  onReset: () => void
}

function DocumentButtons({
  humanReadableTranscriptDriveFileUrl,
  mappingDriveFileUrl,
  onReset
}: DocumentButtonsProps) {
  const handleOpen = (url: string) => {
    window.open(url, '_blank')
  }

  return (
    <div className={styles.container}>
      <div className={styles.successHeader}>
        <CheckCircleFilled className={styles.successIcon} />
        <h2 className={styles.successTitle}>Transcription Complete!</h2>
        <p className={styles.successSubtext}>
          Your documents are ready to open.
        </p>
      </div>

      <Button
        type="primary"
        size="large"
        block
        icon={<LinkOutlined />}
        onClick={() => handleOpen(humanReadableTranscriptDriveFileUrl)}
      >
        Open Transcript
      </Button>
      
      <Button
        type="primary"
        size="large"
        block
        icon={<LinkOutlined />}
        onClick={() => handleOpen(mappingDriveFileUrl)}
      >
        Open Mapping
      </Button>

      <div className={styles.divider} />

      <Button
        size="large"
        block
        icon={<RedoOutlined />}
        onClick={onReset}
      >
        Submit Another
      </Button>
    </div>
  )
}

export default DocumentButtons

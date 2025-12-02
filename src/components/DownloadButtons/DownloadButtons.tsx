import { Button } from 'antd'
import { DownloadOutlined, RedoOutlined, CheckCircleFilled } from '@ant-design/icons'
import styles from './DownloadButtons.module.scss'

interface DownloadButtonsProps {
  humanReadableTranscriptDriveFileUrl: string
  mappingDriveFileUrl: string
  onReset: () => void
}

function DownloadButtons({
  humanReadableTranscriptDriveFileUrl,
  mappingDriveFileUrl,
  onReset
}: DownloadButtonsProps) {
  const handleDownload = (url: string) => {
    window.open(url, '_blank')
  }

  return (
    <div className={styles.container}>
      <div className={styles.successHeader}>
        <CheckCircleFilled className={styles.successIcon} />
        <h2 className={styles.successTitle}>Transcription Complete!</h2>
        <p className={styles.successSubtext}>
          Your files are ready for download.
        </p>
      </div>

      <Button
        type="primary"
        size="large"
        block
        icon={<DownloadOutlined />}
        onClick={() => handleDownload(humanReadableTranscriptDriveFileUrl)}
      >
        Download Transcript
      </Button>
      
      <Button
        type="primary"
        size="large"
        block
        icon={<DownloadOutlined />}
        onClick={() => handleDownload(mappingDriveFileUrl)}
      >
        Download Mapping
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

export default DownloadButtons

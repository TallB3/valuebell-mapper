import { Button } from 'antd'
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
      <Button
        type="primary"
        size="large"
        block
        onClick={() => handleDownload(humanReadableTranscriptDriveFileUrl)}
      >
        Download Transcript
      </Button>
      <Button
        type="primary"
        size="large"
        block
        onClick={() => handleDownload(mappingDriveFileUrl)}
      >
        Download Mapping
      </Button>
      <Button
        size="large"
        block
        onClick={onReset}
      >
        Submit Another
      </Button>
    </div>
  )
}

export default DownloadButtons

import { useCallback, useEffect, useRef, useState } from 'react'
import { Formik, Form as FormikForm, Field } from 'formik'
import type { FormikHelpers } from 'formik'
import { Input, Button, message, Form } from 'antd'
import { LinkOutlined, FileTextOutlined } from '@ant-design/icons'
import * as Yup from 'yup'
import axios from 'axios'
import DownloadButtons from '../DownloadButtons/DownloadButtons'
import styles from './TranscribeForm.module.scss'

const TRANSCRIBE_WEBHOOK = import.meta.env.VITE_TRANSCRIBE_WEBHOOK_URL
const TRANSCRIBE_STATUS_WEBHOOK = import.meta.env.VITE_TRANSCRIBE_STATUS_URL
const POLL_INTERVAL_MS = 10_000
const JOB_TIMEOUT_MS = 45 * 60 * 1000

interface FormValues {
  driveVideoUrl: string
  episodeName: string
}

const validationSchema = Yup.object({
  driveVideoUrl: Yup.string()
    .url('Please enter a valid URL')
    .required('Drive video URL is required'),
  episodeName: Yup.string()
    .required('Episode name is required')
})

interface StatusRow {
  id?: number | string
  status?: string | null
  resultTranscriptUrl?: string | null
  resultMappingUrl?: string | null
  error?: boolean
}

function TranscribeForm() {
  const [loading, setLoading] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [statusRow, setStatusRow] = useState<StatusRow | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  const pollIntervalRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const clearTimers = () => {
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  useEffect(() => {
    return () => clearTimers()
  }, [])

  const stopPolling = useCallback(() => {
    clearTimers()
    setIsPolling(false)
  }, [])

  const fetchStatus = useCallback(
    async (id: string, opts?: { initial?: boolean }) => {
      if (!TRANSCRIBE_STATUS_WEBHOOK) {
        setErrorMessage('Missing status endpoint configuration')
        stopPolling()
        return
      }

      try {
        const response = await axios.get(TRANSCRIBE_STATUS_WEBHOOK, {
          params: { jobId: id }
        })

        const rows = Array.isArray(response.data) ? response.data : [response.data]
        const row: StatusRow | undefined = rows[0]

        if (!row) {
          // If no row yet, keep waiting silently.
          return
        }

        setStatusRow(row)

        if (row.error) {
          stopPolling()
          setErrorMessage('Processing failed. Please try again.')
          return
        }

        if (row.status === 'done') {
          stopPolling()
          message.success('Processing complete')
        } else if (!opts?.initial && !isPolling) {
          setIsPolling(true)
        }
      } catch (error: any) {
        // Avoid spamming the user; surface a soft warning.
        if (!opts?.initial) {
          message.warning(error.response?.data?.message || 'Status check failed, retrying...')
        }
      }
    },
    [isPolling, stopPolling]
  )

  const startPolling = useCallback(
    (id: string) => {
      setIsPolling(true)
      setStatusRow({ id, status: 'queued' })
      setErrorMessage(null)

      fetchStatus(id, { initial: true })

      pollIntervalRef.current = window.setInterval(() => fetchStatus(id), POLL_INTERVAL_MS)
      timeoutRef.current = window.setTimeout(() => {
        stopPolling()
        setStatusRow((prev) => ({ ...prev, status: 'timeout' }))
        setErrorMessage('Processing timed out after 45 minutes. Please try again.')
      }, JOB_TIMEOUT_MS)
    },
    [fetchStatus, stopPolling]
  )

  const handleSubmit = async (values: FormValues, { setSubmitting }: FormikHelpers<FormValues>) => {
    setLoading(true)
    setStatusRow(null)
    setErrorMessage(null)
    setJobId(null)
    clearTimers()

    try {
      if (!TRANSCRIBE_WEBHOOK) {
        throw new Error('Missing submit webhook configuration')
      }

      const response = await axios.post(TRANSCRIBE_WEBHOOK, values)
      const returnedJobId = response.data?.jobID ?? response.data?.jobId

      if (!returnedJobId) {
        throw new Error('No job ID returned from submit webhook')
      }

      const idAsString = String(returnedJobId)
      setJobId(idAsString)
      startPolling(idAsString)
      message.success('Request submitted. We are processing your file.')
    } catch (error: any) {
      message.error(error.response?.data?.message || error.message || 'Request failed')
    } finally {
      setLoading(false)
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    clearTimers()
    setJobId(null)
    setStatusRow(null)
    setErrorMessage(null)
    setIsPolling(false)
  }

  const isDone = statusRow?.status === 'done' && !statusRow.error
  const isErrored = Boolean(statusRow?.error) || statusRow?.status === 'timeout'
  const hasJob = Boolean(jobId)

  const statusLabel = (() => {
    switch (statusRow?.status) {
      case 'queued':
        return 'Queued — waiting to start'
      case 'transcribing':
        return 'Transcribing audio...'
      case 'mapping':
        return 'Generating mapping...'
      case 'done':
        return 'Completed'
      case 'timeout':
        return 'Timed out'
      default:
        return 'Starting...'
    }
  })()

  return (
    <div className={styles.container}>
      {!hasJob ? (
        <>
          <div className={styles.formHeader}>
            <h2>Start New Transcription</h2>
            <p>Enter the details below to begin the mapping process.</p>
          </div>
          <Formik
            initialValues={{ driveVideoUrl: '', episodeName: '' }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ setFieldValue, values, errors, touched, handleBlur }) => (
              <FormikForm>
                <Form.Item
                  label={<span className={styles.label}>Drive Video URL</span>}
                  validateStatus={touched.driveVideoUrl && errors.driveVideoUrl ? 'error' : ''}
                  help={touched.driveVideoUrl && errors.driveVideoUrl}
                  colon={false}
                  layout="vertical"
                >
                  <Field name="driveVideoUrl">
                    {() => (
                      <Input
                        size="large"
                        prefix={<LinkOutlined style={{ color: 'rgba(255,255,255,0.25)' }} />}
                        placeholder="https://drive.google.com/..."
                        value={values.driveVideoUrl}
                        onChange={(e) => setFieldValue('driveVideoUrl', e.target.value)}
                        onBlur={handleBlur('driveVideoUrl')}
                        disabled={loading}
                      />
                    )}
                  </Field>
                </Form.Item>

                <Form.Item
                  label={<span className={styles.label}>Episode Name</span>}
                  validateStatus={touched.episodeName && errors.episodeName ? 'error' : ''}
                  help={touched.episodeName && errors.episodeName}
                  colon={false}
                  layout="vertical"
                >
                  <Field name="episodeName">
                    {() => (
                      <Input
                        size="large"
                        prefix={<FileTextOutlined style={{ color: 'rgba(255,255,255,0.25)' }} />}
                        placeholder="e.g. Episode 42 - The Beginning"
                        value={values.episodeName}
                        onChange={(e) => setFieldValue('episodeName', e.target.value)}
                        onBlur={handleBlur('episodeName')}
                        disabled={loading}
                      />
                    )}
                  </Field>
                </Form.Item>

                <Form.Item style={{ marginTop: '32px' }}>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    block 
                    size="large" 
                    loading={loading}
                    style={{ height: '48px', fontWeight: 600 }}
                  >
                    {loading ? 'Processing...' : 'Submit Request'}
                  </Button>
                </Form.Item>
              </FormikForm>
            )}
          </Formik>
        </>
      ) : isDone ? (
        <DownloadButtons
          humanReadableTranscriptDriveFileUrl={statusRow?.resultTranscriptUrl || ''}
          mappingDriveFileUrl={statusRow?.resultMappingUrl || ''}
          onReset={handleReset}
        />
      ) : (
        <div>
          <div className={styles.formHeader}>
            <h2>Processing Request</h2>
            <p>{statusLabel}</p>
          </div>

          {errorMessage ? (
            <div style={{ color: '#ff7875', marginBottom: '16px' }}>{errorMessage}</div>
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.75)', marginBottom: '16px' }}>
              Keep this page open while we process your file. We will refresh the status and links automatically.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
              <Button block size="large" onClick={handleReset}>
                Submit Another
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default TranscribeForm

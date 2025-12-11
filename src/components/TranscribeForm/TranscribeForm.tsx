import { useCallback, useEffect, useRef, useState } from 'react'
import { Formik, Form as FormikForm, Field } from 'formik'
import type { FormikHelpers } from 'formik'
import { Input, Button, message, Form } from 'antd'
import { LinkOutlined, FileTextOutlined, MailOutlined } from '@ant-design/icons'
import * as Yup from 'yup'
import axios from 'axios'
import DocumentButtons from '../DocumentButtons/DocumentButtons'
import ProcessingView from './ProcessingView'
import PreviewSwitcher from '../PreviewSwitcher/PreviewSwitcher'
import styles from './TranscribeForm.module.scss'
import { TRANSCRIBE_WEBHOOK, TRANSCRIBE_STATUS_WEBHOOK } from '../../constants'
const POLL_INTERVAL_MS = 10_000
const JOB_TIMEOUT_MS = 45 * 60 * 1000

// Import all GIFs from the assets folder
const gifsGlob = import.meta.glob('../../assets/gifs/*.gif', { eager: true }) as Record<string, { default: string }>
const GIF_URLS = Object.values(gifsGlob).map((mod) => mod.default)

interface FormValues {
  driveVideoUrl: string
  episodeName: string
  email: string
}

const validationSchema = Yup.object({
  driveVideoUrl: Yup.string()
    .url('Please enter a valid URL')
    .test(
      'not-folder',
      'Folder links are not supported. Please provide a Google Drive file link.',
      (value) => {
        if (!value) return true
        return !/drive\.google\.com\/(?:drive\/folders|folderview)/i.test(value)
      }
    )
    .required('Drive video URL is required'),
  episodeName: Yup.string()
    .required('Episode name is required')
    .matches(
      /^[\p{L}\p{M}0-9\s\-_]+$/u,
      'Episode name can include letters (any language), numbers, spaces, hyphens, and underscores'
    ),
  email: Yup.string()
    .email('Please enter a valid email')
    .required('Email is required')
})

interface StatusRow {
  id?: number | string
  status?: string | null
  resultTranscriptUrl?: string | null
  resultMappingUrl?: string | null
  llmResponse?: string | null
  error?: boolean
  errorMessage?: string | null
}

function TranscribeForm() {
  const [loading, setLoading] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [statusRow, setStatusRow] = useState<StatusRow | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  
  // New state for enhanced wait screen
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [currentGif, setCurrentGif] = useState<string | null>(null)

  const pollIntervalRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const timerIntervalRef = useRef<number | null>(null)

  const clearTimers = () => {
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
  }

  useEffect(() => {
    return () => clearTimers()
  }, [])

  // Timer effect
  useEffect(() => {
    if (startTime && isPolling) {
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    } else {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current)
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current)
      }
    }
  }, [startTime, isPolling])

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
          setErrorMessage(row.errorMessage || 'Processing failed. Please try again.')
          return
        }

        if (row.status === 'done') {
          stopPolling()
          message.success('Processing complete')
        } else if (!opts?.initial && !isPolling) {
          setIsPolling(true)
        }
      } catch (error: unknown) {
        if (!opts?.initial) {
          if (axios.isAxiosError(error)) {
            const apiMessage = error.response?.data as { message?: string } | undefined
            message.warning(apiMessage?.message || 'Status check failed, retrying...')
          } else if (error instanceof Error) {
            message.warning(error.message)
          } else {
            message.warning('Status check failed, retrying...')
          }
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
      
      // Start timer and pick random GIF
      setStartTime(Date.now())
      setElapsedTime(0)
      if (GIF_URLS.length > 0) {
        const randomGif = GIF_URLS[Math.floor(Math.random() * GIF_URLS.length)]
        setCurrentGif(randomGif)
      }

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
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const apiMessage = error.response?.data as { message?: string } | undefined
        message.error(apiMessage?.message || error.message || 'Request failed')
      } else if (error instanceof Error) {
        message.error(error.message)
      } else {
        message.error('Request failed')
      }
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
    setStartTime(null)
    setElapsedTime(0)
    setCurrentGif(null)
  }

  const isDone = statusRow?.status === 'done' && !statusRow.error
  const isErrored = Boolean(statusRow?.error) || statusRow?.status === 'timeout'
  const hasJob = Boolean(jobId)
  const transcriptUrl = statusRow?.resultTranscriptUrl || ''
  const mappingMarkdown = (statusRow?.llmResponse || '').trim()
  const hasPreview = Boolean(transcriptUrl || mappingMarkdown)

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {!hasJob ? (
          <>
            <div className={styles.formHeader}>
              <h2>Start New Transcription</h2>
              <p>Enter the details below to begin the mapping process.</p>
            </div>
            <Formik
              initialValues={{ driveVideoUrl: '', episodeName: '', email: '' }}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ setFieldValue, values, errors, touched, handleBlur }) => (
                <FormikForm>
                  <Form.Item
                    label={<span className={styles.label}>Google Drive URL</span>}
                    validateStatus={touched.driveVideoUrl && errors.driveVideoUrl ? 'error' : ''}
                    help={touched.driveVideoUrl && errors.driveVideoUrl}
                    colon={false}
                    layout="vertical"
                  >
                    <Field name="driveVideoUrl">
                      {() => (
                        <Input
                          size="large"
                          prefix={<LinkOutlined className={styles.inputIcon} />}
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
                          prefix={<FileTextOutlined className={styles.inputIcon} />}
                          placeholder="e.g. Episode 42 - The Beginning"
                          value={values.episodeName}
                          onChange={(e) => setFieldValue('episodeName', e.target.value)}
                          onBlur={handleBlur('episodeName')}
                          disabled={loading}
                        />
                      )}
                    </Field>
                  </Form.Item>

                  <Form.Item
                    label={<span className={styles.label}>Email</span>}
                    validateStatus={touched.email && errors.email ? 'error' : ''}
                    help={touched.email && errors.email}
                    colon={false}
                    layout="vertical"
                  >
                    <Field name="email">
                      {() => (
                        <Input
                          size="large"
                          prefix={<MailOutlined className={styles.inputIcon} />}
                          placeholder="your.email@example.com"
                          value={values.email}
                          onChange={(e) => setFieldValue('email', e.target.value)}
                          onBlur={handleBlur('email')}
                          disabled={loading}
                        />
                      )}
                    </Field>
                  </Form.Item>

                  <Form.Item className={styles.submitFormItem}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      block
                      size="large"
                      loading={loading}
                      className={styles.submitButton}
                    >
                      {loading ? 'Processing...' : 'Submit Request'}
                    </Button>
                  </Form.Item>
                </FormikForm>
              )}
            </Formik>
          </>
        ) : isDone ? (
          <DocumentButtons
            humanReadableTranscriptDriveFileUrl={statusRow?.resultTranscriptUrl || ''}
            mappingDriveFileUrl={statusRow?.resultMappingUrl || ''}
            onReset={handleReset}
          />
        ) : (
          <ProcessingView
            statusRow={statusRow}
            errorMessage={errorMessage}
            isErrored={isErrored}
            currentGif={currentGif}
            elapsedTime={elapsedTime}
            onReset={handleReset}
          />
        )}
      </div>

      {hasPreview && (
        <div className={styles.viewerContainer}>
          <PreviewSwitcher transcriptUrl={transcriptUrl} mappingContent={mappingMarkdown} />
        </div>
      )}
    </div>
  )
}
// sr
export default TranscribeForm

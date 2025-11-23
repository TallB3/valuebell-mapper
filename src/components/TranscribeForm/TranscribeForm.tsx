import { useState } from 'react'
import { Formik, Form as FormikForm, Field } from 'formik'
import type { FormikHelpers } from 'formik'
import { Input, Button, message, Form } from 'antd'
import * as Yup from 'yup'
import axios from 'axios'
import DownloadButtons from '../DownloadButtons/DownloadButtons'
import styles from './TranscribeForm.module.scss'

const TRANSCRIBE_WEBHOOK = import.meta.env.VITE_TRANSCRIBE_WEBHOOK_URL

interface FormValues {
  driveVideoUrl: string
  episodeName: string
}

interface TranscribeResponse {
  humanReadableTranscriptDriveFileUrl: string
  mappingDriveFileUrl: string
}

const validationSchema = Yup.object({
  driveVideoUrl: Yup.string()
    .url('Please enter a valid URL')
    .required('Drive video URL is required'),
  episodeName: Yup.string()
    .required('Episode name is required')
})

function TranscribeForm() {
  const [loading, setLoading] = useState(false)
  const [responseData, setResponseData] = useState<TranscribeResponse | null>(null)

  const handleSubmit = async (values: FormValues, { setSubmitting }: FormikHelpers<FormValues>) => {
    setLoading(true)
    setResponseData(null)

    try {
      console.log('Submitting values:', values);
      
      const response = await axios.post(
        TRANSCRIBE_WEBHOOK,
        values
      )
      console.log('Response data:', response.data);
      
      setResponseData(response.data)
      message.success('Request completed successfully')
    } catch (error: any) {
      message.error(error.response?.data?.message || error.message || 'Request failed')
    } finally {
      setLoading(false)
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setResponseData(null)
  }

  return (
    <div className={styles.container}>
      {!responseData ? (
        <Formik
          initialValues={{ driveVideoUrl: '', episodeName: '' }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ setFieldValue, values, errors, touched, handleBlur }) => (
            <FormikForm>
              <Form.Item
                label={<span className={styles.label}>Drive video url</span>}
                validateStatus={touched.driveVideoUrl && errors.driveVideoUrl ? 'error' : ''}
                help={touched.driveVideoUrl && errors.driveVideoUrl}
                colon={false}
                layout="vertical"
              >
                <Field name="driveVideoUrl">
                  {() => (
                    <Input
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
                label={<span className={styles.label}>Episode name</span>}
                validateStatus={touched.episodeName && errors.episodeName ? 'error' : ''}
                help={touched.episodeName && errors.episodeName}
                colon={false}
                layout="vertical"
              >
                <Field name="episodeName">
                  {() => (
                    <Input
                      placeholder="Enter episode name"
                      value={values.episodeName}
                      onChange={(e) => setFieldValue('episodeName', e.target.value)}
                      onBlur={handleBlur('episodeName')}
                      disabled={loading}
                    />
                  )}
                </Field>
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" block loading={loading}>
                  Submit
                </Button>
              </Form.Item>
            </FormikForm>
          )}
        </Formik>
      ) : (
        <DownloadButtons
          humanReadableTranscriptDriveFileUrl={responseData.humanReadableTranscriptDriveFileUrl}
          mappingDriveFileUrl={responseData.mappingDriveFileUrl}
          onReset={handleReset}
        />
      )}
    </div>
  )
}

export default TranscribeForm

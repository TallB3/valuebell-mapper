import { ConfigProvider, theme, Button } from 'antd'
import { MailOutlined } from '@ant-design/icons'
import TranscribeForm from './components/TranscribeForm/TranscribeForm'
import valubellIcon from './assets/valubell-icon.jpeg'
import './App.css'

function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#F96B2F',
          borderRadius: 4,
          colorBgContainer: '#1E1E1E',
        },
      }}
    >
      <div className="app-container">
        <header className="app-header">
          <a href="https://www.valuebell.studio/" target="_blank" rel="noopener noreferrer">
            <img src={valubellIcon} className="app-logo" alt="Valuebell Logo" />
          </a>
          <h1 className="app-title">Valuebell Mapper</h1>
        </header>
        <main className="app-main">
          <TranscribeForm />
        </main>
        <Button
          type="primary"
          shape="round"
          icon={<MailOutlined />}
          href="https://www.valuebell.studio/contact"
          target="_blank"
          rel="noopener noreferrer"
          className="floating-contact-button"
          size="large"
        >
          Contact Us
        </Button>
      </div>
    </ConfigProvider>
  )
}

export default App
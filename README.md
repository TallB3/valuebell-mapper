# Mapper Frontend (React + TypeScript + Vite)

## Environment variables

Copy `.env.example` to `.env` and fill in your webhook endpoints:

```
VITE_TRANSCRIBE_WEBHOOK_URL=https://your-n8n-domain/webhook/<submit-webhook-id>
VITE_TRANSCRIBE_STATUS_URL=https://your-n8n-domain/webhook/<status-webhook-id>
```

## Getting started

```
npm install
npm run dev
```

This app was bootstrapped with the Vite React + TypeScript template. Refer to the Vite docs for additional configuration details.

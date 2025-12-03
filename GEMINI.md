# GEMINI.md

This file provides guidance to Gemini when working with code in this repository.

## Project Overview

Valuebell Mapper is a React + TypeScript + Vite frontend application for submitting podcast transcription and content mapping jobs. The system consists of:
- **Frontend**: React app (this repo) deployed on Netlify at https://valuebell-mapper.netlify.app/
- **Backend**: n8n workflows (JSON files in this repo represent the workflow definitions)

### How It Works

1. User submits Google Drive video URL + episode name via the frontend form
2. Frontend POSTs to n8n webhook (triggers "Mapper - Orr.json" workflow)
3. n8n workflow orchestrates:
   - Calling transcription service (Google Cloud Run)
   - Processing transcript with Gemini API for content mapping
   - Creating Google Docs for results
   - Updating job status in n8n Data Table
4. Frontend polls status endpoint every 10 seconds (queries "mapper-runs-get-status.json" workflow)
5. When done, frontend displays download links to Google Drive files

## Environment Setup

Required environment variables in `.env`:
```bash
VITE_TRANSCRIBE_WEBHOOK_URL=https://your-n8n-domain/webhook/<submit-webhook-id>
VITE_TRANSCRIBE_STATUS_URL=https://your-n8n-domain/webhook/<status-webhook-id>
```

Copy `.env.example` to `.env` and fill in your actual n8n webhook endpoints.

## Development Commands

```bash
# Install dependencies
npm install

# Start dev server (default: http://localhost:5173)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm preview
```

## Architecture

### Frontend Architecture (React)

The app follows an async job pattern with client-side polling:

**1. Job Submission** (`TranscribeForm.tsx:130-159`):
- POST to `VITE_TRANSCRIBE_WEBHOOK_URL` with `{ driveVideoUrl, episodeName }`
- Backend returns `jobId` (or `jobID` - both are handled)
- Immediately starts polling with the returned job ID

**2. Status Polling** (`TranscribeForm.tsx:67-110`, `TranscribeForm.tsx:112-128`):
- GET to `VITE_TRANSCRIBE_STATUS_URL?jobId=<id>` every 10 seconds
- Polls for up to 45 minutes (timeout at `JOB_TIMEOUT_MS`)
- Uses `useRef` to manage `setInterval` and timeout timers
- Stops polling when status is `'done'`, error occurs, or timeout reached

**3. Status Response Schema** (`TranscribeForm.tsx:29-35`):
```typescript
interface StatusRow {
  id?: number | string
  status?: 'queued' | 'transcribing' | 'mapping' | 'done' | 'timeout' | null
  resultTranscriptUrl?: string | null  // Google Drive download link
  resultMappingUrl?: string | null     // Google Drive download link
  error?: boolean
}
```

**4. UI States** (`TranscribeForm.tsx:192-316`):
- **Form state**: Show input form when no active job
- **Processing state**: Show status label + partial download links while polling
- **Done state**: Show `DownloadButtons` component with both download links

### Backend Architecture (n8n Workflows)

**Main Workflow: "Mapper - Orr.json"**

This workflow handles the entire transcription and mapping pipeline:

1. **Webhook Trigger** (node: "Webhook")
   - Receives POST with `{ driveVideoUrl, episodeName }`

2. **Database Insert** (node: "Insert row")
   - Creates job record in n8n Data Table `valuebell-mapper-runs`
   - Initial status: `queued`, `error: false`
   - Returns `jobID` to frontend immediately

3. **Transcription** (node: "Transcribe")
   - Updates status to `transcribing`
   - POSTs to Google Cloud Run service at `https://transcribe-115346807311.me-west1.run.app`
   - Sends: `source_file_url`, `episode_name`, `destination`, `number_of_speakers`
   - Uses JWT token authentication (via "Call JWT Token Exchange" sub-workflow)
   - Returns: `human_readable_transcript_url`, `episode_folder_url`

4. **Transcript Processing** (nodes: "Download HR Transcript" → "Extract from File")
   - Downloads transcript from Google Drive
   - Extracts text content for AI processing

5. **Content Mapping** (node: "Generate Map-Doc1")
   - Updates status to `mapping`
   - Sends transcript to Google Gemini 2.5 Pro
   - Generates comprehensive content mapping (titles, descriptions, chapters, quotes, editing instructions)

6. **File Creation** (nodes: "Create file from text", "Call Create Google Doc")
   - Creates Google Doc for transcript in episode folder
   - Creates Google Doc for content mapping
   - Deletes temporary transcript file

7. **Status Updates** (nodes: "update transcript url", "update mapping url", "status: done")
   - Updates database with `resultTranscriptUrl` (docx export link)
   - Updates database with `resultMappingUrl` (docx export link)
   - Sets final status to `done`

8. **Error Handling** (nodes: "error: true", "error: true1")
   - On transcription failure: sets `error: true`
   - On mapping failure: sets `error: true`

**Status Workflow: "mapper-runs-get-status.json"**

Simple 3-node workflow:
1. **Webhook** - Receives GET with `?jobId=<id>` query param
2. **Get row(s)** - Queries n8n Data Table for matching job ID
3. **Respond to Webhook** - Returns status row(s) as JSON

### Component Structure

```
App.tsx
└── TranscribeForm.tsx (main form + job orchestration)
    └── DownloadButtons.tsx (success state with download links)
```

- **App.tsx**: Ant Design dark theme configuration with Valuebell branding (`#F96B2F` primary color)
- **TranscribeForm.tsx**: All job submission, polling logic, and conditional rendering
- **DownloadButtons.tsx**: Download links + "Submit Another" reset button

### Form Validation

Uses Formik + Yup schema validation:
- `driveVideoUrl`: Required, must be valid URL format
- `episodeName`: Required string

### Styling

- SCSS modules for component-level styles (`.module.scss` files)
- Ant Design components with custom theme overrides in `App.tsx`
- Dark mode by default via `theme.darkAlgorithm`

## n8n Data Table Schema

Table: `valuebell-mapper-runs` (ID: `RJFPsYD64pC65buf`)

Columns:
- `id` (auto-generated) - Job ID returned to frontend
- `status` (string) - `queued` | `transcribing` | `mapping` | `done`
- `fileUrl` (string) - Original Google Drive video URL
- `episodeName` (string) - Episode name from form
- `resultTranscriptUrl` (string) - Google Docs export URL for transcript
- `resultMappingUrl` (string) - Google Docs export URL for content mapping
- `error` (boolean) - `true` if processing failed

## Key TypeScript Configurations

- **tsconfig.app.json**: App-specific config with React JSX support
- **tsconfig.node.json**: Vite config file type checking
- **tsconfig.json**: Root config that references both

## Third-Party Dependencies

- **React 19.2**: UI framework
- **Ant Design 6.0**: Component library (forms, buttons, inputs, messages)
- **Formik 2.4**: Form state management
- **Yup 1.7**: Schema validation
- **Axios 1.13**: HTTP client for webhook calls
- **Vite 7.2**: Build tool and dev server
- **TypeScript 5.9**: Type safety

## Deployment

- **Platform**: Netlify
- **URL**: https://valuebell-mapper.netlify.app/
- **Build Command**: `npm run build` (outputs to `dist/`)
- **Environment Variables**: Set in Netlify dashboard (same as `.env` format)

## Common Patterns

### Timer Cleanup
Always clean up polling intervals and timeouts to prevent memory leaks:
```typescript
useEffect(() => {
  return () => clearTimers()  // Cleanup on unmount
}, [])
```

### Error Handling
- Use Ant Design's `message.error()` for user-facing errors
- Use `message.warning()` for soft warnings during polling failures
- Display inline error messages for timeout/processing failures

### n8n Workflow Development
- Edit workflow JSON files directly or use n8n UI and export
- Test workflows in n8n with "Test" mode before activating
- Webhook URLs remain stable across workflow updates (tied to webhook node ID)

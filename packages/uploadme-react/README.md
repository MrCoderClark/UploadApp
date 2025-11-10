# @uploadme/react

React components and hooks for easy file uploads with UploadMe.

## Installation

```bash
npm install @uploadme/react
# or
yarn add @uploadme/react
# or
pnpm add @uploadme/react
```

## Quick Start

### 1. Get Your API Key

**For Local Development:**
1. Clone and run the UploadMe backend:
   ```bash
   git clone https://github.com/MrCoderClark/UploadApp
   cd UploadApp/apps/api
   npm install
   npm run dev  # Runs on port 4000
   ```

2. Run the dashboard:
   ```bash
   cd ../web
   npm install
   npm run dev  # Runs on port 3000
   ```

3. Get your API key:
   - Visit http://localhost:3000/register and create an account
   - Login and go to http://localhost:3000/dashboard/api-keys
   - Click "Create API Key" and copy it

**For Production:**
- Sign up at your deployed UploadMe instance
- Generate an API key from the dashboard

### 2. Install the SDK

```bash
npm install @weirdlookingjay/uploadme-react
```

### 3. Use in Your App

```tsx
import { UploadButton } from '@weirdlookingjay/uploadme-react';

function App() {
  return (
    <UploadButton
      apiKey="uk_test_your_key_here"  // From dashboard
      apiUrl="http://localhost:4000/api/v1"  // Local development
      onSuccess={(file) => {
        console.log('Uploaded:', file);
      }}
    />
  );
}
```

**Note:** For production, use your deployed API URL instead of localhost.

## CORS Configuration

If you're running the SDK on a different port than the default (e.g., `localhost:8080` instead of `localhost:3000`), you need to configure CORS in the backend.

### Update Backend CORS Settings

In `apps/api/src/index.ts`, update the allowed origins:

```typescript
const allowedOrigins = [
  config.clientUrl,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8080',  // Add your test app port
  'http://localhost:8081',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8080',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

**After updating, restart your API server:**
```bash
cd apps/api
npm run dev
```

## Components

### UploadButton

Simple button component for file uploads.

```tsx
<UploadButton
  apiKey="your-api-key"
  apiUrl="https://api.uploadme.com/api/v1"
  onSuccess={(file) => console.log('Success:', file)}
  onError={(error) => console.error('Error:', error)}
  onProgress={(progress) => console.log('Progress:', progress)}
  accept="image/*"
  maxSize={10485760} // 10MB
  multiple={false}
/>
```

### UploadDropzone

Drag and drop area for file uploads.

```tsx
<UploadDropzone
  apiKey="your-api-key"
  onSuccess={(files) => console.log('Uploaded:', files)}
  multiple={true}
  accept="image/*,video/*"
/>
```

### FilePreview

Display uploaded files with thumbnails.

```tsx
<FilePreview
  files={uploadedFiles}
  onDelete={(fileId) => handleDelete(fileId)}
/>
```

## Hooks

### useUpload

Programmatic file upload with progress tracking.

```tsx
import { useUpload } from '@uploadme/react';

function MyComponent() {
  const { upload, progress, isUploading, error } = useUpload({
    apiKey: 'your-api-key',
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const result = await upload(file);
      console.log('Uploaded:', result);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      {isUploading && <p>Progress: {progress}%</p>}
      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

### useFileList

Fetch and manage user's uploaded files.

```tsx
import { useFileList } from '@uploadme/react';

function MyFiles() {
  const { files, loading, error, refetch, deleteFile } = useFileList({
    apiKey: 'your-api-key',
  });

  return (
    <div>
      {files.map((file) => (
        <div key={file.id}>
          <img src={file.url} alt={file.filename} />
          <button onClick={() => deleteFile(file.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

## Configuration

### API Key

Get your API key from the [UploadMe Dashboard](https://uploadme.com/dashboard/api-keys).

### API URL

Default: `https://api.uploadme.com/api/v1`

For local development:
```tsx
<UploadButton
  apiKey="your-api-key"
  apiUrl="http://localhost:4000/api/v1"
/>
```

## Props Reference

### UploadButton Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiKey` | `string` | **required** | Your UploadMe API key |
| `apiUrl` | `string` | `https://api.uploadme.com/api/v1` | API base URL |
| `onSuccess` | `(file: UploadedFile) => void` | - | Success callback |
| `onError` | `(error: Error) => void` | - | Error callback |
| `onProgress` | `(progress: number) => void` | - | Progress callback (0-100) |
| `accept` | `string` | - | Accepted file types |
| `maxSize` | `number` | - | Max file size in bytes |
| `multiple` | `boolean` | `false` | Allow multiple files |
| `disabled` | `boolean` | `false` | Disable button |
| `className` | `string` | - | Custom CSS class |
| `children` | `ReactNode` | `"Upload File"` | Button content |

## License

MIT

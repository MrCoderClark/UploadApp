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

```tsx
import { UploadButton } from '@uploadme/react';

function App() {
  return (
    <UploadButton
      apiKey="your-api-key"
      onSuccess={(file) => {
        console.log('Uploaded:', file);
      }}
    />
  );
}
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

import React from 'react';
import { UploadButton, UploadDropzone, useUpload, useFileList } from '../src/index';
import type { UploadedFile } from '../src/lib/types';

// Example 1: Simple Upload Button
export function Example1() {
  return (
    <UploadButton
      apiKey="your-api-key-here"
      apiUrl="http://localhost:4000/api/v1"
      onSuccess={(file: UploadedFile) => {
        console.log('File uploaded:', file);
        alert(`Uploaded: ${file.filename}`);
      }}
      onError={(error: Error) => {
        console.error('Upload error:', error);
        alert(`Error: ${error.message}`);
      }}
      onProgress={(progress: number) => {
        console.log('Upload progress:', progress + '%');
      }}
      accept="image/*"
      maxSize={10 * 1024 * 1024} // 10MB
    >
      Upload Image
    </UploadButton>
  );
}

// Example 2: Drag & Drop Zone
export function Example2() {
  return (
    <UploadDropzone
      apiKey="your-api-key-here"
      apiUrl="http://localhost:4000/api/v1"
      onSuccess={(files: UploadedFile[]) => {
        console.log('Files uploaded:', files);
        alert(`Uploaded ${files.length} file(s)`);
      }}
      onError={(error: Error) => {
        console.error('Upload error:', error);
      }}
      accept="image/*,video/*"
      maxSize={50 * 1024 * 1024} // 50MB
      multiple={true}
    />
  );
}

// Example 3: Custom Upload with useUpload Hook
export function Example3() {
  const { upload, isUploading, progress, error, uploadedFile } = useUpload({
    apiKey: 'your-api-key-here',
    apiUrl: 'http://localhost:4000/api/v1',
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await upload(file);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} disabled={isUploading} />
      
      {isUploading && (
        <div>
          <p>Uploading... {progress}%</p>
          <progress value={progress} max={100} />
        </div>
      )}

      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}

      {uploadedFile && (
        <div>
          <p>✅ Uploaded successfully!</p>
          <img src={uploadedFile.url} alt={uploadedFile.filename} style={{ maxWidth: '200px' }} />
        </div>
      )}
    </div>
  );
}

// Example 4: File List with useFileList Hook
export function Example4() {
  const { files, loading, error, deleteFile, refetch } = useFileList({
    apiKey: 'your-api-key-here',
    apiUrl: 'http://localhost:4000/api/v1',
    limit: 10,
  });

  const handleDelete = async (fileId: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      await deleteFile(fileId);
    }
  };

  if (loading) return <p>Loading files...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <h2>My Files ({files.length})</h2>
      <button onClick={refetch}>Refresh</button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
        {files.map((file: UploadedFile) => (
          <div key={file.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '12px' }}>
            {file.mimeType.startsWith('image/') && (
              <img src={file.url} alt={file.filename} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' }} />
            )}
            <p style={{ margin: '8px 0', fontSize: '14px', fontWeight: '500' }}>{file.originalName}</p>
            <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>
              {(file.size / 1024).toFixed(0)} KB
            </p>
            <button onClick={() => handleDelete(file.id)} style={{ marginTop: '8px', width: '100%' }}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Example 5: Complete Upload App
export function CompleteExample() {
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h1>UploadMe React SDK Demo</h1>

      <div style={{ marginTop: '32px' }}>
        <h2>Upload Files</h2>
        <UploadDropzone
          apiKey="your-api-key-here"
          apiUrl="http://localhost:4000/api/v1"
          onSuccess={(files: UploadedFile[]) => {
            setUploadedFiles((prev) => [...files, ...prev]);
          }}
          multiple={true}
        />
      </div>

      <div style={{ marginTop: '32px' }}>
        <h2>Uploaded Files</h2>
        <Example4 />
      </div>
    </div>
  );
}

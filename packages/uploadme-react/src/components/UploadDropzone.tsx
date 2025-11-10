import React, { useState, useCallback } from 'react';
import { useUpload } from '../hooks/useUpload';
import type { UploadDropzoneProps } from '../lib/types';

export function UploadDropzone({
  apiKey,
  apiUrl,
  onSuccess,
  onError,
  onProgress,
  accept,
  maxSize,
  multiple = true,
  disabled = false,
  className = '',
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);

  const { upload } = useUpload({
    apiKey,
    apiUrl,
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      await handleFiles(files);
    },
    [disabled]
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      await handleFiles(Array.from(files));
      e.target.value = ''; // Reset input
    },
    []
  );

  const handleFiles = async (files: File[]) => {
    const filesToUpload = multiple ? files : files.slice(0, 1);
    const uploadedFiles = [];

    for (const file of filesToUpload) {
      // Validate file size
      if (maxSize && file.size > maxSize) {
        onError?.(new Error(`File ${file.name} exceeds maximum size of ${maxSize} bytes`));
        continue;
      }

      setUploadingFiles((prev) => [...prev, file.name]);

      try {
        const result = await upload(file);
        if (result) {
          uploadedFiles.push(result);
        }
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error('Upload failed'));
      } finally {
        setUploadingFiles((prev) => prev.filter((name) => name !== file.name));
      }
    }

    if (uploadedFiles.length > 0) {
      onSuccess?.(uploadedFiles);
    }
  };

  const dropzoneClass = `
    uploadme-dropzone
    ${className}
    ${isDragging ? 'uploadme-dropzone-dragging' : ''}
    ${disabled ? 'uploadme-dropzone-disabled' : ''}
  `.trim();

  return (
    <div
      className={dropzoneClass}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${isDragging ? '#3b82f6' : '#cbd5e1'}`,
        borderRadius: '8px',
        padding: '40px 20px',
        textAlign: 'center',
        backgroundColor: isDragging ? '#eff6ff' : '#f8fafc',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
      }}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInput}
        disabled={disabled}
        style={{ display: 'none' }}
        id="uploadme-file-input"
      />

      <label
        htmlFor="uploadme-file-input"
        style={{
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'block',
        }}
      >
        {uploadingFiles.length > 0 ? (
          <div>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#475569' }}>
              Uploading {uploadingFiles.length} file(s)...
            </p>
            <ul style={{ marginTop: '10px', listStyle: 'none', padding: 0 }}>
              {uploadingFiles.map((name) => (
                <li key={name} style={{ fontSize: '14px', color: '#64748b' }}>
                  {name}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <svg
              style={{ margin: '0 auto 16px', display: 'block' }}
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>
              {isDragging ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p style={{ fontSize: '14px', color: '#94a3b8' }}>
              or click to browse
            </p>
            {maxSize && (
              <p style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '8px' }}>
                Max file size: {(maxSize / 1024 / 1024).toFixed(0)}MB
              </p>
            )}
          </>
        )}
      </label>
    </div>
  );
}

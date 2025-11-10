import React, { useRef, useState } from 'react';
import { useUpload } from '../hooks/useUpload';
import type { UploadButtonProps } from '../lib/types';

export function UploadButton({
  apiKey,
  apiUrl,
  onSuccess,
  onError,
  onProgress,
  accept,
  maxSize,
  multiple = false,
  disabled = false,
  className = '',
  children = 'Upload File',
}: UploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localProgress, setLocalProgress] = useState(0);

  const { upload, isUploading } = useUpload({
    apiKey,
    apiUrl,
    onSuccess,
    onError,
    onProgress: (progress) => {
      setLocalProgress(progress.percentage);
      onProgress?.(progress.percentage);
    },
  });

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file size
    if (maxSize && file.size > maxSize) {
      const error = new Error(`File size exceeds maximum of ${maxSize} bytes`);
      onError?.(error);
      return;
    }

    await upload(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setLocalProgress(0);
  };

  const buttonClass = `
    uploadme-button
    ${className}
    ${isUploading ? 'uploadme-button-uploading' : ''}
    ${disabled ? 'uploadme-button-disabled' : ''}
  `.trim();

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isUploading}
        className={buttonClass}
        style={{
          position: 'relative',
          padding: '10px 20px',
          backgroundColor: isUploading ? '#94a3b8' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: disabled || isUploading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'background-color 0.2s',
          ...(!disabled && !isUploading && {
            ':hover': {
              backgroundColor: '#2563eb',
            },
          }),
        }}
      >
        {isUploading ? (
          <span>
            Uploading... {localProgress}%
          </span>
        ) : (
          children
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </>
  );
}

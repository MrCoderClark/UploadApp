import { removeBackground } from '@imgly/background-removal';

/**
 * Remove background from an image file using client-side processing
 * This runs entirely in the browser - no server needed!
 */
export async function removeBackgroundClient(imageFile: File): Promise<Blob> {
  try {
    // Remove background using @imgly/background-removal
    const blob = await removeBackground(imageFile);
    return blob;
  } catch (error) {
    console.error('Background removal error:', error);
    throw new Error('Failed to remove background');
  }
}

/**
 * Convert a Blob to a File
 */
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

import { removeBackground } from '@imgly/background-removal';

// Web Worker for background removal
self.onmessage = async (e: MessageEvent) => {
  const { imageFile, fileId } = e.data;

  try {
    // Send initial progress
    self.postMessage({ type: 'progress', fileId, progress: 0, stage: 'Loading model...' });

    // Remove background with detailed progress tracking
    const blob = await removeBackground(imageFile, {
      progress: (key: string, current: number, total: number) => {
        const percent = Math.round((current / total) * 100);
        
        // Determine stage based on key
        let stage = 'Processing...';
        if (key.includes('fetch')) {
          stage = 'Loading AI model...';
        } else if (key.includes('compute')) {
          stage = 'Analyzing image...';
        } else if (key.includes('encode')) {
          stage = 'Finalizing...';
        }
        
        self.postMessage({ 
          type: 'progress', 
          fileId, 
          progress: percent,
          stage,
        });
      },
    });

    self.postMessage({ type: 'progress', fileId, progress: 100, stage: 'Complete!' });

    // Send the result back
    self.postMessage({ 
      type: 'success', 
      fileId,
      blob,
    });
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      fileId,
      error: error instanceof Error ? error.message : 'Failed to remove background',
    });
  }
};

export {};

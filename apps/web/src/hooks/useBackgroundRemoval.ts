import { useState, useCallback, useRef, useEffect } from 'react';

interface BackgroundRemovalJob {
  fileId: string;
  progress: number;
  status: 'processing' | 'uploading' | 'complete' | 'error';
  stage?: string;
  error?: string;
}

export function useBackgroundRemoval() {
  const [jobs, setJobs] = useState<Map<string, BackgroundRemovalJob>>(new Map());
  const workerRef = useRef<Worker | null>(null);
  const callbacksRef = useRef<Map<string, (blob: Blob) => void>>(new Map());

  // Initialize worker
  useEffect(() => {
    // Create worker
    const worker = new Worker(
      new URL('../workers/backgroundRemoval.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e: MessageEvent) => {
      const { type, fileId, progress, stage, blob, error } = e.data;

      if (type === 'progress') {
        setJobs(prev => {
          const newJobs = new Map(prev);
          const job = newJobs.get(fileId);
          if (job) {
            job.progress = progress;
            job.stage = stage;
          }
          return newJobs;
        });
      } else if (type === 'success') {
        setJobs(prev => {
          const newJobs = new Map(prev);
          const job = newJobs.get(fileId);
          if (job) {
            job.status = 'uploading';
          }
          return newJobs;
        });

        // Call the success callback
        const callback = callbacksRef.current.get(fileId);
        if (callback) {
          callback(blob);
          callbacksRef.current.delete(fileId);
        }
      } else if (type === 'error') {
        setJobs(prev => {
          const newJobs = new Map(prev);
          const job = newJobs.get(fileId);
          if (job) {
            job.status = 'error';
            job.error = error;
          }
          return newJobs;
        });
        callbacksRef.current.delete(fileId);
      }
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, []);

  const processImage = useCallback(
    (fileId: string, imageFile: File, onSuccess: (blob: Blob) => void) => {
      if (!workerRef.current) return;

      // Add job to state
      setJobs(prev => {
        const newJobs = new Map(prev);
        newJobs.set(fileId, {
          fileId,
          progress: 0,
          status: 'processing',
        });
        return newJobs;
      });

      // Store callback
      callbacksRef.current.set(fileId, onSuccess);

      // Send to worker
      workerRef.current.postMessage({ imageFile, fileId });
    },
    []
  );

  const completeJob = useCallback((fileId: string) => {
    setJobs(prev => {
      const newJobs = new Map(prev);
      newJobs.delete(fileId);
      return newJobs;
    });
  }, []);

  const getJob = useCallback((fileId: string) => {
    return jobs.get(fileId);
  }, [jobs]);

  return {
    processImage,
    completeJob,
    getJob,
    activeJobs: Array.from(jobs.values()),
  };
}

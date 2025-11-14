'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface SecureImageProps {
  fileId: string;
  alt: string;
  fill?: boolean;
  className?: string;
  getSignedUrl: (fileId: string) => Promise<string>;
}

export default function SecureImage({ fileId, alt, fill, className, getSignedUrl }: SecureImageProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      try {
        setLoading(true);
        const url = await getSignedUrl(fileId);
        if (mounted) {
          setImageUrl(url);
          setError(false);
        }
      } catch (err) {
        console.error('Failed to load image:', err);
        if (mounted) {
          setError(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      mounted = false;
    };
  }, [fileId, getSignedUrl]);

  if (loading) {
    return (
      <div className={`bg-gray-200 animate-pulse ${fill ? 'absolute inset-0' : 'w-full h-full'}`} />
    );
  }

  if (error || !imageUrl) {
    return (
      <div className={`bg-gray-300 flex items-center justify-center ${fill ? 'absolute inset-0' : 'w-full h-full'}`}>
        <span className="text-gray-500 text-sm">Failed to load</span>
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      fill={fill}
      className={className}
      unoptimized // Disable Next.js image optimization for signed URLs
    />
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const accessToken = useAuthStore((state) => state.accessToken);

  // Wait for client-side mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !accessToken) {
      router.push('/auth/login');
    }
  }, [mounted, accessToken, router]);

  // Don't render until mounted (prevents hydration mismatch)
  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!accessToken) {
    return null;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UploadCloud, Shield, Zap, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <UploadCloud className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold">UploadMe</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/auth/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/auth/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight">
            Secure File Upload Platform
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-600">
            Upload, manage, and share files with ease. Built for developers with powerful APIs,
            team collaboration, and enterprise-grade security.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/auth/register">
              <Button size="lg" className="text-lg">
                Start Uploading Free
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="text-lg">
                View Demo
              </Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="bg-gray-50 py-24">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">
              Everything you need to manage files
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <Shield className="mb-4 h-12 w-12 text-blue-600" />
                <h3 className="mb-2 text-xl font-semibold">Secure & Reliable</h3>
                <p className="text-gray-600">
                  Enterprise-grade security with encryption, virus scanning, and access controls.
                </p>
              </div>
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <Zap className="mb-4 h-12 w-12 text-blue-600" />
                <h3 className="mb-2 text-xl font-semibold">Lightning Fast</h3>
                <p className="text-gray-600">
                  Optimized upload speeds with CDN delivery and smart caching.
                </p>
              </div>
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <Users className="mb-4 h-12 w-12 text-blue-600" />
                <h3 className="mb-2 text-xl font-semibold">Team Collaboration</h3>
                <p className="text-gray-600">
                  Manage teams, set permissions, and collaborate seamlessly.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2025 UploadMe. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

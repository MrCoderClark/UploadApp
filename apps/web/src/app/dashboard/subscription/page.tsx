'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  ArrowUpCircle, 
  Calendar,
  HardDrive,
  Upload,
  Zap,
  Crown,
  Rocket
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface UsageStats {
  plan: string;
  status: string;
  storage: {
    used: number;
    limit: number;
    percentage: number;
  };
  uploads: {
    used: number;
    limit: number;
    percentage: number;
  };
  bandwidth: {
    used: number;
    limit: number;
    percentage: number;
  };
  resetAt: string;
}

interface Plan {
  name: string;
  displayName: string;
  price: number;
  yearlyPrice: number;
  storageLimit: number;
  uploadLimit: number;
  bandwidthLimit: number;
  maxFileSize: number;
  features: string[];
}

export default function SubscriptionPage() {
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usageRes, plansRes] = await Promise.all([
        api.get('/subscription/usage'),
        api.get('/subscription/plans'),
      ]);

      setUsage(usageRes.data.data);
      setPlans(plansRes.data.data.plans);
    } catch (error) {
      console.error('Failed to fetch subscription data:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planName: string) => {
    if (planName === 'FREE') {
      toast.error('You are already on the free plan');
      return;
    }

    setUpgrading(true);
    try {
      await api.post('/subscription/upgrade', { plan: planName });
      toast.success(`Successfully upgraded to ${planName} plan!`);
      await fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to upgrade plan');
    } finally {
      setUpgrading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const formatPrice = (cents: number): string => {
    return `$${(cents / 100).toFixed(0)}`;
  };

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'FREE':
        return <Zap className="h-6 w-6" />;
      case 'PRO':
        return <Rocket className="h-6 w-6" />;
      case 'ENTERPRISE':
        return <Crown className="h-6 w-6" />;
      default:
        return <Zap className="h-6 w-6" />;
    }
  };

  const getPlanColor = (planName: string) => {
    switch (planName) {
      case 'FREE':
        return 'bg-gray-100 text-gray-800';
      case 'PRO':
        return 'bg-blue-100 text-blue-800';
      case 'ENTERPRISE':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Subscription & Billing</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription plan and monitor usage
        </p>
      </div>

      {/* Current Plan & Usage */}
      {usage && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Current Plan Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>Your active subscription</CardDescription>
                </div>
                <div className={`p-3 rounded-lg ${getPlanColor(usage.plan)}`}>
                  {getPlanIcon(usage.plan)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">{usage.plan}</span>
                  <Badge variant={usage.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {usage.status}
                  </Badge>
                </div>
                {usage.plan === 'FREE' && (
                  <p className="text-sm text-muted-foreground">
                    Upgrade to unlock more storage and features
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  Usage resets on {new Date(usage.resetAt).toLocaleDateString()}
                </span>
              </div>

              {usage.plan === 'FREE' && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      <ArrowUpCircle className="h-4 w-4 mr-2" />
                      Upgrade Plan
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Choose Your Plan</DialogTitle>
                      <DialogDescription>
                        Select the plan that best fits your needs
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 md:grid-cols-3 mt-4">
                      {plans.map((plan) => (
                        <Card key={plan.name} className={plan.name === 'PRO' ? 'border-blue-500 border-2' : ''}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle>{plan.displayName}</CardTitle>
                              {plan.name === 'PRO' && (
                                <Badge>Popular</Badge>
                              )}
                            </div>
                            <div className="mt-4">
                              <span className="text-3xl font-bold">
                                {formatPrice(plan.price)}
                              </span>
                              <span className="text-muted-foreground">/month</span>
                            </div>
                            {plan.yearlyPrice > 0 && (
                              <p className="text-sm text-muted-foreground">
                                or {formatPrice(plan.yearlyPrice)}/year (save 17%)
                              </p>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <ul className="space-y-2">
                              {plan.features.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                            <Button
                              className="w-full"
                              variant={plan.name === usage.plan ? 'outline' : 'default'}
                              disabled={plan.name === usage.plan || upgrading}
                              onClick={() => handleUpgrade(plan.name)}
                            >
                              {plan.name === usage.plan ? 'Current Plan' : 'Upgrade'}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>

          {/* Usage Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Overview</CardTitle>
              <CardDescription>Current billing period</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Storage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Storage</span>
                  </div>
                  <span className="text-muted-foreground">
                    {formatBytes(usage.storage.used)} / {formatBytes(usage.storage.limit)}
                  </span>
                </div>
                <Progress value={usage.storage.percentage} />
                <p className="text-xs text-muted-foreground">
                  {usage.storage.percentage}% used
                </p>
              </div>

              {/* Uploads */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Uploads</span>
                  </div>
                  <span className="text-muted-foreground">
                    {formatNumber(usage.uploads.used)} / {formatNumber(usage.uploads.limit)}
                  </span>
                </div>
                <Progress value={usage.uploads.percentage} />
                <p className="text-xs text-muted-foreground">
                  {usage.uploads.percentage}% used
                </p>
              </div>

              {/* Bandwidth */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Bandwidth</span>
                  </div>
                  <span className="text-muted-foreground">
                    {formatBytes(usage.bandwidth.used)} / {formatBytes(usage.bandwidth.limit)}
                  </span>
                </div>
                <Progress value={usage.bandwidth.percentage} />
                <p className="text-xs text-muted-foreground">
                  {usage.bandwidth.percentage}% used
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* All Plans Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>All Plans</CardTitle>
          <CardDescription>Compare features across all plans</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.name} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getPlanColor(plan.name)}`}>
                    {getPlanIcon(plan.name)}
                  </div>
                  <div>
                    <h3 className="font-semibold">{plan.displayName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(plan.price)}/mo
                    </p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {plan.features.slice(0, 6).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

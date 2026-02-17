'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

interface Bank {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    branches: number;
    approvals: number;
    transactions: number;
    exceptions: number;
  };
  riskScores: Array<{
    score: number;
    grade: string;
    calculatedAt: string;
  }>;
}

const getRiskGradeColor = (grade: string) => {
  switch (grade) {
    case 'A': return 'bg-green-500';
    case 'B': return 'bg-blue-500';
    case 'C': return 'bg-yellow-500';
    case 'D': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

export default function BanksPage() {
  const { user } = useAuth();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    swiftCode: '',
    address: '',
    contactEmail: '',
    contactPhone: '',
  });

  const fetchBanks = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      
      const response = await fetch(`/api/banks?${params}`);
      const result = await response.json();
      if (result.success) {
        setBanks(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch banks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, [searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (result.success) {
        setIsDialogOpen(false);
        setFormData({ code: '', name: '', swiftCode: '', address: '', contactEmail: '', contactPhone: '' });
        fetchBanks();
      }
    } catch (error) {
      console.error('Failed to create bank:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canCreateBank = user?.role === 'SUPER_ADMIN' || user?.role === 'SUPERVISOR';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Banks</h1>
          <p className="text-muted-foreground">
            Manage registered commercial banks
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchBanks}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {canCreateBank && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bank
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Bank</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Bank Code *</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="e.g., ABC"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="swiftCode">SWIFT Code</Label>
                      <Input
                        id="swiftCode"
                        value={formData.swiftCode}
                        onChange={(e) => setFormData({ ...formData, swiftCode: e.target.value })}
                        placeholder="e.g., ABCDUS33"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Bank Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Full legal name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Head office address"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Contact Email</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                        placeholder="email@bank.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">Contact Phone</Label>
                      <Input
                        id="contactPhone"
                        value={formData.contactPhone}
                        onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Creating...' : 'Create Bank'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Banks Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Registered Banks ({banks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : banks.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No banks found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Risk Grade</TableHead>
                  <TableHead className="text-center">Branches</TableHead>
                  <TableHead className="text-center">Approvals</TableHead>
                  <TableHead className="text-center">Exceptions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banks.map((bank) => {
                  const latestRisk = bank.riskScores[0];
                  return (
                    <TableRow key={bank.id}>
                      <TableCell className="font-medium">{bank.code}</TableCell>
                      <TableCell>{bank.name}</TableCell>
                      <TableCell>
                        {latestRisk ? (
                          <Badge className={getRiskGradeColor(latestRisk.grade)}>
                            Grade {latestRisk.grade} ({latestRisk.score.toFixed(1)}%)
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not Scored</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{bank._count.branches}</TableCell>
                      <TableCell className="text-center">{bank._count.approvals}</TableCell>
                      <TableCell className="text-center">
                        {bank._count.exceptions > 0 ? (
                          <Badge variant="destructive">{bank._count.exceptions}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={bank.isActive ? 'default' : 'secondary'}>
                          {bank.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/banks/${bank.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

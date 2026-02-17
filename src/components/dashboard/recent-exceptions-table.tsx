'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn, getSeverityColor, getStatusColor, formatDateTime } from '@/lib/utils';
import Link from 'next/link';

interface Exception {
  id: string;
  code: string;
  description: string;
  severity: string;
  status: string;
  createdAt: string;
  bank: { code: string; name: string };
  transaction?: { referenceNumber: string; type: string };
}

interface RecentExceptionsTableProps {
  exceptions: Exception[];
}

export function RecentExceptionsTable({ exceptions }: RecentExceptionsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Bank</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {exceptions.map((exception) => (
          <TableRow key={exception.id}>
            <TableCell>
              <Link 
                href={`/exceptions/${exception.id}`}
                className="font-mono text-primary hover:underline"
              >
                {exception.code}
              </Link>
            </TableCell>
            <TableCell>
              <span className="font-medium">{exception.bank.code}</span>
            </TableCell>
            <TableCell>
              <Badge className={cn(getSeverityColor(exception.severity))}>
                {exception.severity}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className={cn(getStatusColor(exception.status))}>
                {exception.status.replace('_', ' ')}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {formatDateTime(exception.createdAt)}
            </TableCell>
          </TableRow>
        ))}
        {exceptions.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
              No recent exceptions
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

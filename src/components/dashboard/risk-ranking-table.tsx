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
import { cn, getRiskGradeColor, formatNumber } from '@/lib/utils';

interface Bank {
  id: string;
  code: string;
  name: string;
  score: number;
  grade: string;
  openExceptions: number;
}

interface RiskRankingTableProps {
  banks: Bank[];
}

export function RiskRankingTable({ banks }: RiskRankingTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Bank</TableHead>
          <TableHead className="text-center">Risk Score</TableHead>
          <TableHead className="text-center">Grade</TableHead>
          <TableHead className="text-center">Open Exceptions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {banks.map((bank, index) => (
          <TableRow key={bank.id}>
            <TableCell className="font-medium">{index + 1}</TableCell>
            <TableCell>
              <div>
                <span className="font-medium">{bank.code}</span>
                <p className="text-sm text-muted-foreground">{bank.name}</p>
              </div>
            </TableCell>
            <TableCell className="text-center font-mono">{bank.score}</TableCell>
            <TableCell className="text-center">
              <Badge className={cn('font-bold', getRiskGradeColor(bank.grade))}>
                {bank.grade}
              </Badge>
            </TableCell>
            <TableCell className="text-center">
              <span className={cn(
                bank.openExceptions > 5 ? 'text-red-600 font-semibold' : ''
              )}>
                {formatNumber(bank.openExceptions)}
              </span>
            </TableCell>
          </TableRow>
        ))}
        {banks.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
              No risk data available
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

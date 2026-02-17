'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

interface RiskDistributionChartProps {
  data: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
}

export function RiskDistributionChart({ data }: RiskDistributionChartProps) {
  const chartData = [
    { name: 'Grade A', value: data.A, color: '#22c55e' },
    { name: 'Grade B', value: data.B, color: '#3b82f6' },
    { name: 'Grade C', value: data.C, color: '#f59e0b' },
    { name: 'Grade D', value: data.D, color: '#ef4444' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Grade Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface RiskTrendChartProps {
  data: Array<{
    date: string;
    score: number;
    grade: string;
  }>;
}

export function RiskTrendChart({ data }: RiskTrendChartProps) {
  const chartData = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: d.score,
  })).reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Score Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface ExceptionChartProps {
  data: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export function ExceptionSeverityChart({ data }: ExceptionChartProps) {
  const chartData = [
    { severity: 'Critical', count: data.critical, fill: '#ef4444' },
    { severity: 'High', count: data.high, fill: '#f59e0b' },
    { severity: 'Medium', count: data.medium, fill: '#3b82f6' },
    { severity: 'Low', count: data.low, fill: '#22c55e' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exceptions by Severity</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="severity" type="category" width={80} />
            <Tooltip />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface ApprovalUtilizationChartProps {
  data: Array<{
    type: string;
    approvedAmount: number;
    utilizedAmount: number;
    utilizationRate: number;
  }>;
}

export function ApprovalUtilizationChart({ data }: ApprovalUtilizationChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval Utilization by Type</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="type" />
            <YAxis />
            <Tooltip formatter={(value: number) => value.toLocaleString()} />
            <Legend />
            <Bar dataKey="approvedAmount" name="Approved" fill="#3b82f6" />
            <Bar dataKey="utilizedAmount" name="Utilized" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

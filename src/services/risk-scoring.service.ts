import prisma from '@/lib/prisma';
import { createAuditLog } from './audit.service';

// Type constants for SQLite (no enum support)
const RiskGrade = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
} as const;

const ExceptionStatus = {
  OPEN: 'OPEN',
  UNDER_REVIEW: 'UNDER_REVIEW',
  RESOLVED: 'RESOLVED',
  WAIVED: 'WAIVED',
} as const;

// Risk scoring weights (configurable)
const RISK_WEIGHTS = {
  mismatch: 0.25,
  unapprovedTx: 0.30,
  lateSubmission: 0.15,
  dataQuality: 0.15,
  repeatViolation: 0.15,
};

// Thresholds for scoring
const THRESHOLDS = {
  mismatchRate: { good: 5, medium: 15, high: 25 },
  unapprovedTxRate: { good: 2, medium: 10, high: 20 },
  lateSubmissionDays: { good: 1, medium: 3, high: 7 },
  dataQualityRate: { good: 95, medium: 85, high: 70 },
  repeatViolationCount: { good: 2, medium: 5, high: 10 },
};

// Grade thresholds
const GRADE_THRESHOLDS = {
  A: 25,
  B: 50,
  C: 75,
  D: 100,
};

interface ScoreComponents {
  mismatchScore: number;
  unapprovedTxScore: number;
  lateSubmissionScore: number;
  dataQualityScore: number;
  repeatViolationScore: number;
}

interface ScoringResult {
  bankId: string;
  score: number;
  grade: string;
  components: ScoreComponents;
  statistics: {
    totalTransactions: number;
    totalExceptions: number;
    criticalExceptions: number;
    highExceptions: number;
  };
}

export async function calculateBankRiskScore(
  bankId: string,
  userId: string,
  periodMonths: number = 3
): Promise<ScoringResult> {
  const periodStart = new Date();
  periodStart.setMonth(periodStart.getMonth() - periodMonths);

  // Gather data for scoring
  const [
    transactions,
    transactionsWithoutApproval,
    exceptions,
    repeatViolations,
  ] = await Promise.all([
    // Total transactions in period
    prisma.transaction.count({
      where: {
        bankId,
        transactionDate: { gte: periodStart },
      },
    }),
    // Transactions without approval
    prisma.transaction.count({
      where: {
        bankId,
        transactionDate: { gte: periodStart },
        approvalId: null,
      },
    }),
    // Exceptions in period
    prisma.exception.groupBy({
      by: ['severity'],
      where: {
        bankId,
        createdAt: { gte: periodStart },
      },
      _count: { severity: true },
    }),
    // Repeat violations (same exception code multiple times)
    prisma.exception.groupBy({
      by: ['code'],
      where: {
        bankId,
        createdAt: { gte: periodStart },
      },
      _count: { code: true },
    }),
  ]);

  // Calculate exception counts by severity
  const exceptionCounts = Object.fromEntries(
    exceptions.map((e: { severity: string; _count: { severity: number } }) => [e.severity, e._count.severity])
  );
  const criticalCount = exceptionCounts['CRITICAL'] || 0;
  const highCount = exceptionCounts['HIGH'] || 0;
  const mediumCount = exceptionCounts['MEDIUM'] || 0;
  const lowCount = exceptionCounts['LOW'] || 0;
  const totalExceptions = criticalCount + highCount + mediumCount + lowCount;

  // Calculate mismatch score (based on exception rate)
  const mismatchRate = transactions > 0 
    ? (totalExceptions / transactions) * 100 
    : 0;
  const mismatchScore = calculateComponentScore(mismatchRate, THRESHOLDS.mismatchRate);

  // Calculate unapproved transaction score
  const unapprovedRate = transactions > 0 
    ? (transactionsWithoutApproval / transactions) * 100 
    : 0;
  const unapprovedTxScore = calculateComponentScore(unapprovedRate, THRESHOLDS.unapprovedTxRate);

  // Calculate late submission score (simplified - using average days)
  const lateSubmissionScore = 10; // Default low score

  // Calculate data quality score (simplified)
  const dataQualityScore = 10; // Default low score

  // Calculate repeat violation score
  const repeatViolationCount = repeatViolations.filter((r: { _count: { code: number } }) => r._count.code > 1).length;
  const repeatViolationScore = calculateComponentScore(repeatViolationCount, THRESHOLDS.repeatViolationCount);

  // Calculate weighted total score
  const totalScore = Math.round(
    mismatchScore * RISK_WEIGHTS.mismatch +
    unapprovedTxScore * RISK_WEIGHTS.unapprovedTx +
    lateSubmissionScore * RISK_WEIGHTS.lateSubmission +
    dataQualityScore * RISK_WEIGHTS.dataQuality +
    repeatViolationScore * RISK_WEIGHTS.repeatViolation
  );

  // Determine grade
  const grade = determineGrade(totalScore);

  // Save the risk score
  const riskScore = await prisma.riskScore.create({
    data: {
      bankId,
      score: totalScore,
      grade,
      mismatchRate: mismatchScore,
      unapprovedRate: unapprovedTxScore,
      lateSubmissionRate: lateSubmissionScore,
      dataQualityScore: dataQualityScore,
      repeatViolationRate: repeatViolationScore,
    },
  });

  // Create audit log
  await createAuditLog({
    userId,
    action: 'RUN_SCORING',
    entityType: 'Bank',
    entityId: bankId,
    details: {
      score: totalScore,
      grade,
      riskScoreId: riskScore.id,
    },
  });

  return {
    bankId,
    score: totalScore,
    grade,
    components: {
      mismatchScore,
      unapprovedTxScore,
      lateSubmissionScore,
      dataQualityScore,
      repeatViolationScore,
    },
    statistics: {
      totalTransactions: transactions,
      totalExceptions,
      criticalExceptions: criticalCount,
      highExceptions: highCount,
    },
  };
}

function calculateComponentScore(
  value: number,
  thresholds: { good: number; medium: number; high: number }
): number {
  if (value <= thresholds.good) {
    return Math.round((value / thresholds.good) * 25);
  } else if (value <= thresholds.medium) {
    return Math.round(25 + ((value - thresholds.good) / (thresholds.medium - thresholds.good)) * 25);
  } else if (value <= thresholds.high) {
    return Math.round(50 + ((value - thresholds.medium) / (thresholds.high - thresholds.medium)) * 25);
  } else {
    return Math.min(100, Math.round(75 + ((value - thresholds.high) / thresholds.high) * 25));
  }
}

function determineGrade(score: number): string {
  if (score <= GRADE_THRESHOLDS.A) return RiskGrade.A;
  if (score <= GRADE_THRESHOLDS.B) return RiskGrade.B;
  if (score <= GRADE_THRESHOLDS.C) return RiskGrade.C;
  return RiskGrade.D;
}

export async function calculateAllBankScores(userId: string): Promise<ScoringResult[]> {
  const banks = await prisma.bank.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  const results: ScoringResult[] = [];

  for (const bank of banks) {
    try {
      const result = await calculateBankRiskScore(bank.id, userId);
      results.push(result);
    } catch (error) {
      console.error(`Failed to calculate risk score for bank ${bank.id}:`, error);
    }
  }

  return results;
}

export async function getBankRiskHistory(bankId: string, limit: number = 12) {
  return prisma.riskScore.findMany({
    where: { bankId },
    orderBy: { calculatedAt: 'desc' },
    take: limit,
  });
}

export async function getRiskRanking(limit: number = 20) {
  // Get latest score for each bank
  const banks = await prisma.bank.findMany({
    where: { isActive: true },
    include: {
      riskScores: {
        orderBy: { calculatedAt: 'desc' },
        take: 1,
      },
      _count: {
        select: {
          transactions: true,
          exceptions: {
            where: { status: ExceptionStatus.OPEN },
          },
        },
      },
    },
  });

  interface BankWithScores {
    id: string;
    code: string;
    name: string;
    riskScores: Array<{
      score: number;
      grade: string;
      calculatedAt: Date;
    }>;
    _count: {
      transactions: number;
      exceptions: number;
    };
  }

  interface RankedBank {
    bankId: string;
    bankCode: string;
    bankName: string;
    score: number;
    grade: string;
    scoringDate: Date;
    openExceptions: number;
  }

  const ranking = (banks as BankWithScores[])
    .filter((bank: BankWithScores) => bank.riskScores.length > 0)
    .map((bank: BankWithScores) => ({
      bankId: bank.id,
      bankCode: bank.code,
      bankName: bank.name,
      score: bank.riskScores[0].score,
      grade: bank.riskScores[0].grade,
      scoringDate: bank.riskScores[0].calculatedAt,
      openExceptions: bank._count.exceptions,
    }))
    .sort((a: RankedBank, b: RankedBank) => b.score - a.score)
    .slice(0, limit);

  return ranking;
}

export async function getRiskSummary() {
  const banks = await prisma.bank.findMany({
    where: { isActive: true },
    include: {
      riskScores: {
        orderBy: { calculatedAt: 'desc' },
        take: 1,
      },
    },
  });

  const gradeDistribution: Record<string, number> = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    unscored: 0,
  };

  let totalScore = 0;
  let scoredBanks = 0;

  for (const bank of banks) {
    if (bank.riskScores.length > 0) {
      const grade = bank.riskScores[0].grade;
      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
      totalScore += bank.riskScores[0].score;
      scoredBanks++;
    } else {
      gradeDistribution.unscored++;
    }
  }

  return {
    totalBanks: banks.length,
    scoredBanks,
    averageScore: scoredBanks > 0 ? Math.round(totalScore / scoredBanks) : 0,
    gradeDistribution,
    highRiskCount: (gradeDistribution['C'] || 0) + (gradeDistribution['D'] || 0),
  };
}

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Type constants (SQLite uses strings instead of enums)
const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CFM_OFFICER: 'CFM_OFFICER',
  SUPERVISOR: 'SUPERVISOR',
  BANK_USER: 'BANK_USER',
  AUDITOR: 'AUDITOR',
} as const;

const ApprovalType = {
  FOREX_PURCHASE: 'FOREX_PURCHASE',
  FOREX_SALE: 'FOREX_SALE',
  OUTWARD_TRANSFER: 'OUTWARD_TRANSFER',
  INWARD_TRANSFER: 'INWARD_TRANSFER',
  LOAN_DISBURSEMENT: 'LOAN_DISBURSEMENT',
  LOAN_REPAYMENT: 'LOAN_REPAYMENT',
  DIVIDEND_PAYMENT: 'DIVIDEND_PAYMENT',
  CAPITAL_REPATRIATION: 'CAPITAL_REPATRIATION',
  OTHER: 'OTHER',
} as const;

const ApprovalStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
  EXHAUSTED: 'EXHAUSTED',
} as const;

const TransactionType = {
  FOREX_PURCHASE: 'FOREX_PURCHASE',
  FOREX_SALE: 'FOREX_SALE',
  OUTWARD_TRANSFER: 'OUTWARD_TRANSFER',
  INWARD_TRANSFER: 'INWARD_TRANSFER',
  LOAN_DISBURSEMENT: 'LOAN_DISBURSEMENT',
  LOAN_REPAYMENT: 'LOAN_REPAYMENT',
  DIVIDEND_PAYMENT: 'DIVIDEND_PAYMENT',
  CAPITAL_REPATRIATION: 'CAPITAL_REPATRIATION',
  OTHER: 'OTHER',
} as const;

const ExceptionSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

const ExceptionStatus = {
  OPEN: 'OPEN',
  UNDER_REVIEW: 'UNDER_REVIEW',
  RESOLVED: 'RESOLVED',
  WAIVED: 'WAIVED',
} as const;

const RiskGrade = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
} as const;

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.report.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.riskScore.deleteMany();
  await prisma.exception.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.bank.deleteMany();

  // Create Banks
  console.log('🏦 Creating banks...');
  const banks = await Promise.all([
    prisma.bank.create({
      data: {
        code: 'ABC',
        name: 'Alpha Bank Corporation',
        swiftCode: 'ABCMUS33',
        address: '123 Financial District, New York, NY 10001',
        contactEmail: 'compliance@alphabank.com',
        contactPhone: '+1-212-555-0100',
        isActive: true,
      },
    }),
    prisma.bank.create({
      data: {
        code: 'BNK',
        name: 'Beta National Bank',
        swiftCode: 'BNKBUS44',
        address: '456 Wall Street, New York, NY 10002',
        contactEmail: 'regulatory@betabank.com',
        contactPhone: '+1-212-555-0200',
        isActive: true,
      },
    }),
    prisma.bank.create({
      data: {
        code: 'GCB',
        name: 'Gamma Commercial Bank',
        swiftCode: 'GCBCUS55',
        address: '789 Commerce Ave, Chicago, IL 60601',
        contactEmail: 'cfm@gammabank.com',
        contactPhone: '+1-312-555-0300',
        isActive: true,
      },
    }),
    prisma.bank.create({
      data: {
        code: 'DFI',
        name: 'Delta Financial Institution',
        swiftCode: 'DFINUS66',
        address: '321 Banking Plaza, Miami, FL 33101',
        contactEmail: 'treasury@deltabank.com',
        contactPhone: '+1-305-555-0400',
        isActive: true,
      },
    }),
    prisma.bank.create({
      data: {
        code: 'EUB',
        name: 'Epsilon Universal Bank',
        swiftCode: 'EUBUS77',
        address: '654 Finance Center, Los Angeles, CA 90001',
        contactEmail: 'operations@epsilonbank.com',
        contactPhone: '+1-213-555-0500',
        isActive: true,
      },
    }),
  ]);

  // Create Branches for each bank
  console.log('🏢 Creating branches...');
  for (const bank of banks) {
    await prisma.branch.createMany({
      data: [
        {
          code: `${bank.code}-HQ`,
          name: `${bank.name} - Head Office`,
          address: bank.address,
          bankId: bank.id,
          isActive: true,
        },
        {
          code: `${bank.code}-BR1`,
          name: `${bank.name} - Downtown Branch`,
          address: `Downtown Branch, ${bank.address?.split(',')[1] || 'City'}`,
          bankId: bank.id,
          isActive: true,
        },
      ],
    });
  }

  // Create Users
  console.log('👤 Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@centralbank.gov',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  const cfmOfficer = await prisma.user.create({
    data: {
      email: 'cfm.officer@centralbank.gov',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Smith',
      role: UserRole.CFM_OFFICER,
      isActive: true,
    },
  });

  const supervisor = await prisma.user.create({
    data: {
      email: 'supervisor@centralbank.gov',
      password: hashedPassword,
      firstName: 'Jane',
      lastName: 'Wilson',
      role: UserRole.SUPERVISOR,
      isActive: true,
    },
  });

  const auditor = await prisma.user.create({
    data: {
      email: 'auditor@centralbank.gov',
      password: hashedPassword,
      firstName: 'Robert',
      lastName: 'Brown',
      role: UserRole.AUDITOR,
      isActive: true,
    },
  });

  // Create bank users
  type BankType = { id: string; code: string };
  const bankUsers = await Promise.all(
    banks.map((bank: BankType) =>
      prisma.user.create({
        data: {
          email: `user@${bank.code.toLowerCase()}.com`,
          password: hashedPassword,
          firstName: `${bank.code}`,
          lastName: 'User',
          role: UserRole.BANK_USER,
          bankId: bank.id,
          isActive: true,
        },
      })
    )
  );

  // Create Approvals
  console.log('✅ Creating approvals...');
  const approvalTypes = [
    ApprovalType.FOREX_PURCHASE,
    ApprovalType.FOREX_SALE,
    ApprovalType.OUTWARD_TRANSFER,
    ApprovalType.INWARD_TRANSFER,
    ApprovalType.LOAN_DISBURSEMENT,
    ApprovalType.LOAN_REPAYMENT,
  ];

  const approvals = [];
  for (const bank of banks) {
    for (let i = 0; i < 5; i++) {
      const type = approvalTypes[Math.floor(Math.random() * approvalTypes.length)];
      const approvedAmount = Math.floor(Math.random() * 9000000) + 1000000;
      const validityStart = new Date();
      validityStart.setDate(validityStart.getDate() - Math.floor(Math.random() * 30));
      const validityEnd = new Date(validityStart);
      validityEnd.setMonth(validityEnd.getMonth() + 6);

      const approval = await prisma.approval.create({
        data: {
          referenceNumber: `APR-${bank.code}-${Date.now()}-${i}`,
          type,
          approvedAmount,
          utilizedAmount: Math.floor(Math.random() * approvedAmount * 0.7),
          currency: 'USD',
          status: i < 3 ? ApprovalStatus.ACTIVE : ApprovalStatus.PENDING,
          validityStart,
          validityEnd,
          purpose: `${type.replace('_', ' ')} approval for ${bank.name}`,
          bankId: bank.id,
          createdById: cfmOfficer.id,
          approvedById: cfmOfficer.id,
        },
      });
      approvals.push(approval);
    }
  }

  // Create Transactions
  console.log('💰 Creating transactions...');
  const transactionTypes = [
    TransactionType.FOREX_PURCHASE,
    TransactionType.FOREX_SALE,
    TransactionType.OUTWARD_TRANSFER,
    TransactionType.INWARD_TRANSFER,
  ];

  for (const bank of banks) {
    const bankApprovals = approvals.filter((a) => a.bankId === bank.id);
    
    for (let i = 0; i < 20; i++) {
      const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
      const hasApproval = Math.random() > 0.2; // 80% have approvals
      const approval = hasApproval
        ? bankApprovals.find((a) => a.type === type && a.status === ApprovalStatus.ACTIVE)
        : null;
      
      const amount = Math.floor(Math.random() * 500000) + 10000;
      const transactionDate = new Date();
      transactionDate.setDate(transactionDate.getDate() - Math.floor(Math.random() * 60));

      await prisma.transaction.create({
        data: {
          referenceNumber: `TXN-${bank.code}-${Date.now()}-${i}`,
          type,
          amount,
          currency: 'USD',
          exchangeRate: type.includes('FOREX') ? 1.0 + Math.random() * 0.1 : null,
          transactionDate,
          valueDate: transactionDate,
          counterpartyName: `Counterparty ${i + 1}`,
          counterpartyCountry: ['US', 'UK', 'DE', 'JP', 'CH'][Math.floor(Math.random() * 5)],
          purpose: `Transaction for ${type.replace('_', ' ')}`,
          bankId: bank.id,
          approvalId: approval?.id,
        },
      });
    }
  }

  // Create Exceptions
  console.log('⚠️ Creating exceptions...');
  const exceptionCodes = [
    { code: 'NO_APPROVAL', desc: 'Transaction executed without valid approval' },
    { code: 'AMOUNT_EXCEEDED', desc: 'Transaction amount exceeds approval limit' },
    { code: 'EXPIRED_APPROVAL', desc: 'Transaction executed against expired approval' },
    { code: 'LATE_SUBMISSION', desc: 'Transaction data submitted after deadline' },
    { code: 'DATA_MISMATCH', desc: 'Discrepancy between reported and actual data' },
  ];

  const severities = [
    ExceptionSeverity.LOW,
    ExceptionSeverity.MEDIUM,
    ExceptionSeverity.HIGH,
    ExceptionSeverity.CRITICAL,
  ];

  for (const bank of banks) {
    const exceptionCount = Math.floor(Math.random() * 8) + 2;
    for (let i = 0; i < exceptionCount; i++) {
      const exc = exceptionCodes[Math.floor(Math.random() * exceptionCodes.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      const isResolved = Math.random() > 0.6;

      await prisma.exception.create({
        data: {
          code: exc.code,
          description: `${exc.desc} - Bank: ${bank.code}`,
          severity,
          status: isResolved ? ExceptionStatus.RESOLVED : ExceptionStatus.OPEN,
          resolution: isResolved ? 'Exception reviewed and resolved by supervisor' : null,
          resolvedAt: isResolved ? new Date() : null,
          resolvedById: isResolved ? supervisor.id : null,
          bankId: bank.id,
        },
      });
    }
  }

  // Create Risk Scores
  console.log('📊 Creating risk scores...');

  // Create Submissions for each bank
  console.log('📤 Creating submissions...');
  const submissionTypes = ['TRANSACTION_REPORT', 'MONTHLY_RETURN', 'FOREX_REPORT', 'COMPLIANCE_REPORT'];
  const submissionStatuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING', 'PROCESSING'];

  for (let bIdx = 0; bIdx < banks.length; bIdx++) {
    const bank = banks[bIdx];
    const bankUser = bankUsers[bIdx];
    for (let i = 0; i < 6; i++) {
      const subType = submissionTypes[Math.floor(Math.random() * submissionTypes.length)];
      const subStatus = submissionStatuses[Math.floor(Math.random() * submissionStatuses.length)];
      const totalRecords = Math.floor(Math.random() * 200) + 10;
      const processedRecords = subStatus === 'COMPLETED' ? totalRecords : Math.floor(totalRecords * Math.random());
      const errorRecords = subStatus === 'COMPLETED' ? Math.floor(Math.random() * 3) : 0;
      const submittedAt = new Date();
      submittedAt.setDate(submittedAt.getDate() - Math.floor(Math.random() * 60));

      await prisma.submission.create({
        data: {
          referenceNumber: `SUB-${bank.code}-${Date.now()}-${i}`,
          type: subType,
          fileName: `${bank.code.toLowerCase()}_${subType.toLowerCase()}_${submittedAt.toISOString().slice(0, 10)}.csv`,
          status: subStatus,
          totalRecords,
          processedRecords,
          errorRecords,
          errorDetails: errorRecords > 0 ? JSON.stringify([{ row: 5, error: 'Invalid amount format' }]) : null,
          submittedAt,
          processedAt: subStatus === 'COMPLETED' ? new Date(submittedAt.getTime() + 60000 * 30) : null,
          bankId: bank.id,
          submittedById: bankUser.id,
        },
      });
    }
  }
  
  for (const bank of banks) {
    const score = Math.floor(Math.random() * 100);
    let grade: string;
    if (score <= 25) grade = RiskGrade.A;
    else if (score <= 50) grade = RiskGrade.B;
    else if (score <= 75) grade = RiskGrade.C;
    else grade = RiskGrade.D;

    await prisma.riskScore.create({
      data: {
        bankId: bank.id,
        score,
        grade,
        mismatchRate: Math.random() * 0.3,
        unapprovedRate: Math.random() * 0.2,
        lateSubmissionRate: Math.random() * 0.25,
        dataQualityScore: 0.7 + Math.random() * 0.3,
        repeatViolationRate: Math.random() * 0.15,
        calculatedAt: new Date(),
      },
    });
  }

  // Create Audit Logs
  console.log('📝 Creating audit logs...');
  const actions = ['LOGIN', 'CREATE', 'UPDATE', 'APPROVE', 'REJECT'];
  const entities = ['USER', 'BANK', 'APPROVAL', 'TRANSACTION'];

  for (let i = 0; i < 50; i++) {
    const user = [superAdmin, cfmOfficer, supervisor, ...bankUsers][
      Math.floor(Math.random() * (bankUsers.length + 3))
    ];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const entity = entities[Math.floor(Math.random() * entities.length)];
    const createdAt = new Date();
    createdAt.setHours(createdAt.getHours() - Math.floor(Math.random() * 720));

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action,
        entityType: entity,
        entityId: null,
        details: `${action} operation on ${entity}`,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        createdAt,
      },
    });
  }

  // Create System Config
  console.log('⚙️ Creating system config...');
  await prisma.systemConfig.createMany({
    data: [
      { key: 'RECONCILIATION_TOLERANCE', value: '0.01', description: 'Tolerance for amount matching (1%)' },
      { key: 'RISK_THRESHOLD_A', value: '25', description: 'Maximum score for Grade A' },
      { key: 'RISK_THRESHOLD_B', value: '50', description: 'Maximum score for Grade B' },
      { key: 'RISK_THRESHOLD_C', value: '75', description: 'Maximum score for Grade C' },
      { key: 'SUBMISSION_DEADLINE_DAYS', value: '5', description: 'Days after month-end for submissions' },
      { key: 'PASSWORD_MIN_LENGTH', value: '8', description: 'Minimum password length' },
      { key: 'SESSION_TIMEOUT_MINUTES', value: '30', description: 'Session timeout in minutes' },
    ],
  });

  console.log('✅ Seed completed successfully!');
  console.log('\n📋 Test Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Super Admin:    admin@centralbank.gov / password123');
  console.log('CFM Officer:    cfm.officer@centralbank.gov / password123');
  console.log('Supervisor:     supervisor@centralbank.gov / password123');
  console.log('Auditor:        auditor@centralbank.gov / password123');
  console.log('Bank User:      user@abc.com / password123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

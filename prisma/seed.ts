import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
} as const;

const ApprovalStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  EXHAUSTED: 'EXHAUSTED',
  PENDING: 'PENDING',
  REVOKED: 'REVOKED',
} as const;

const SubmissionStatus = {
  COMPLETED: 'COMPLETED',
  PARTIALLY_COMPLETED: 'PARTIALLY_COMPLETED',
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
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
} as const;

const RiskGrade = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
} as const;

const bankFixtures = [
  {
    code: 'AFC',
    name: 'AFC Commercial Bank',
    address: 'Borrowdale Road, Harare, Zimbabwe',
    contactEmail: 'compliance@agribank.co.zw',
    contactPhone: '+263-242-700001',
    branches: [
      { code: 'HAR', name: 'Harare Main Branch', address: 'Samora Machel Avenue, Harare' },
      { code: 'BYO', name: 'Bulawayo Branch', address: 'Joshua Nkomo Street, Bulawayo' },
    ],
  },
  {
    code: 'BABC',
    name: 'BancABC Zimbabwe',
    address: 'Herbert Chitepo Avenue, Harare, Zimbabwe',
    contactEmail: 'regulatory@bancabc.co.zw',
    contactPhone: '+263-242-700002',
    branches: [
      { code: 'HAR', name: 'Harare Head Office', address: 'Nelson Mandela Avenue, Harare' },
      { code: 'MTA', name: 'Mutare Branch', address: 'Aerodrome Road, Mutare' },
    ],
  },
  {
    code: 'CBZ',
    name: 'CBZ Bank Limited',
    address: 'Jason Moyo Avenue, Harare, Zimbabwe',
    contactEmail: 'compliance@cbz.co.zw',
    contactPhone: '+263-242-700003',
    branches: [
      { code: 'HAR', name: 'Harare Corporate Centre', address: 'Kwame Nkrumah Avenue, Harare' },
      { code: 'BYO', name: 'Bulawayo Corporate Branch', address: 'Fort Street, Bulawayo' },
    ],
  },
  {
    code: 'ECO',
    name: 'Ecobank Zimbabwe Limited',
    address: 'Second Street Extension, Harare, Zimbabwe',
    contactEmail: 'regulatory.zw@ecobank.com',
    contactPhone: '+263-242-700004',
    branches: [
      { code: 'HAR', name: 'Harare Main Branch', address: 'Sam Nujoma Street, Harare' },
      { code: 'GWE', name: 'Gweru Branch', address: 'Main Street, Gweru' },
    ],
  },
  {
    code: 'FBC',
    name: 'FBC Bank Limited',
    address: 'Fife Avenue, Harare, Zimbabwe',
    contactEmail: 'compliance@fbc.co.zw',
    contactPhone: '+263-242-700005',
    branches: [
      { code: 'HAR', name: 'Harare Commercial Branch', address: 'Borrowdale Road, Harare' },
      { code: 'BYO', name: 'Bulawayo Trade Branch', address: 'Leopold Takawira Avenue, Bulawayo' },
    ],
  },
  {
    code: 'FCB',
    name: 'First Capital Bank Zimbabwe Limited',
    address: 'Chinamano Avenue, Harare, Zimbabwe',
    contactEmail: 'compliance@firstcapitalbank.co.zw',
    contactPhone: '+263-242-700006',
    branches: [
      { code: 'HAR', name: 'Harare Capital Centre', address: 'Jason Moyo Avenue, Harare' },
      { code: 'MTA', name: 'Mutare Border Trade Branch', address: 'G Herbert Chitepo Street, Mutare' },
    ],
  },
  {
    code: 'NMB',
    name: 'NMB Bank Limited',
    address: 'Borrowdale Brooke, Harare, Zimbabwe',
    contactEmail: 'regulatory@nmbz.co.zw',
    contactPhone: '+263-242-700007',
    branches: [
      { code: 'HAR', name: 'Harare Treasury Branch', address: 'Avondale, Harare' },
      { code: 'GWE', name: 'Gweru Agribusiness Branch', address: 'Lobengula Street, Gweru' },
    ],
  },
  {
    code: 'SBIC',
    name: 'Stanbic Bank Zimbabwe Limited',
    address: 'Nelson Mandela Avenue, Harare, Zimbabwe',
    contactEmail: 'compliance@stanbicbank.co.zw',
    contactPhone: '+263-242-700008',
    branches: [
      { code: 'HAR', name: 'Harare Corporate Office', address: 'Jason Moyo Avenue, Harare' },
      { code: 'BYO', name: 'Bulawayo Market Branch', address: 'Leopold Takawira Avenue, Bulawayo' },
    ],
  },
  {
    code: 'STWD',
    name: 'Steward Bank Limited',
    address: 'Livingstone Avenue, Harare, Zimbabwe',
    contactEmail: 'risk@stewardbank.co.zw',
    contactPhone: '+263-242-700009',
    branches: [
      { code: 'HAR', name: 'Harare Digital Hub', address: 'Borrowdale Road, Harare' },
      { code: 'CHI', name: 'Chitungwiza Branch', address: 'Tilcor Industrial Area, Chitungwiza' },
    ],
  },
  {
    code: 'ZB',
    name: 'ZB Bank Limited',
    address: 'First Street, Harare, Zimbabwe',
    contactEmail: 'compliance@zb.co.zw',
    contactPhone: '+263-242-700010',
    branches: [
      { code: 'HAR', name: 'Harare Head Office', address: 'First Street, Harare' },
      { code: 'BYO', name: 'Bulawayo Main Branch', address: 'J Nkomo Street, Bulawayo' },
    ],
  },
  {
    code: 'CABS',
    name: 'Central Africa Building Society (CABS)',
    address: 'Central Avenue, Harare, Zimbabwe',
    contactEmail: 'compliance@cabs.co.zw',
    contactPhone: '+263-242-700011',
    branches: [
      { code: 'HAR', name: 'Harare Retail Centre', address: 'Central Avenue, Harare' },
      { code: 'MTA', name: 'Mutare Main Branch', address: 'Aerodrome Road, Mutare' },
    ],
  },
] as const;

const counterpartyTemplates = [
  {
    name: 'Johannesburg Fuel Trading Desk',
    country: 'ZA',
    account: 'ZA98-FTD-4501',
    purpose: 'Diesel and petrol import settlement',
    documentReference: 'INV-FUEL-2026-001',
  },
  {
    name: 'Lusaka Agro Inputs Limited',
    country: 'ZM',
    account: 'ZM44-AGI-7620',
    purpose: 'Fertiliser and seed import settlement',
    documentReference: 'INV-AGRO-2026-014',
  },
  {
    name: 'Gaborone Mining Supplies',
    country: 'BW',
    account: 'BW11-MINE-8830',
    purpose: 'Mining spares and processing chemicals',
    documentReference: 'INV-MINE-2026-022',
  },
  {
    name: 'Dubai Machinery FZE',
    country: 'AE',
    account: 'AE23-DMF-1177',
    purpose: 'Plant and equipment import payment',
    documentReference: 'INV-PLANT-2026-019',
  },
  {
    name: 'Shanghai Manufacturing Components',
    country: 'CN',
    account: 'CN61-SMC-5500',
    purpose: 'Industrial raw materials settlement',
    documentReference: 'INV-RAW-2026-031',
  },
  {
    name: 'London Treasury Services',
    country: 'GB',
    account: 'GB72-LTS-2841',
    purpose: 'Dividend remittance and shareholder servicing',
    documentReference: 'DIV-2026-008',
  },
] as const;

function makeReference(prefix: string, bankCode: string, index: number): string {
  return `${prefix}-${bankCode}-${String(index).padStart(3, '0')}`;
}

function addDays(base: Date, days: number): Date {
  const value = new Date(base);
  value.setDate(value.getDate() + days);
  return value;
}

function determineGrade(score: number): string {
  if (score <= 25) return RiskGrade.A;
  if (score <= 50) return RiskGrade.B;
  if (score <= 75) return RiskGrade.C;
  return RiskGrade.D;
}

async function main() {
  console.log('Starting Zimbabwe-focused seed...');

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

  const passwordHash = await bcrypt.hash('password123', 10);
  const now = new Date();

  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@rbz.co.zw',
      password: passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: UserRole.SUPER_ADMIN,
    },
  });

  const cfmOfficer = await prisma.user.create({
    data: {
      email: 'cfm.officer@rbz.co.zw',
      password: passwordHash,
      firstName: 'Rudo',
      lastName: 'Mhofu',
      role: UserRole.CFM_OFFICER,
    },
  });

  const supervisor = await prisma.user.create({
    data: {
      email: 'supervisor@rbz.co.zw',
      password: passwordHash,
      firstName: 'Tatenda',
      lastName: 'Chikore',
      role: UserRole.SUPERVISOR,
    },
  });

  const auditor = await prisma.user.create({
    data: {
      email: 'auditor@rbz.co.zw',
      password: passwordHash,
      firstName: 'Nyasha',
      lastName: 'Sibanda',
      role: UserRole.AUDITOR,
    },
  });

  const banks: Array<{
    id: string;
    code: string;
    name: string;
    branchIds: string[];
    userId: string;
    approvalSubmissionId: string;
    transactionSubmissionId: string;
    lateSubmissionId: string;
    activeApprovalId: string;
    expiredApprovalId: string;
  }> = [];

  for (let bankIndex = 0; bankIndex < bankFixtures.length; bankIndex++) {
    const fixture = bankFixtures[bankIndex];
    const bank = await prisma.bank.create({
      data: {
        code: fixture.code,
        name: fixture.name,
        address: fixture.address,
        contactEmail: fixture.contactEmail,
        contactPhone: fixture.contactPhone,
        isActive: true,
      },
    });

    const branches = await Promise.all(
      fixture.branches.map((branch) =>
        prisma.branch.create({
          data: {
            bankId: bank.id,
            code: branch.code,
            name: branch.name,
            address: branch.address,
          },
        })
      )
    );

    const bankUser = await prisma.user.create({
      data: {
        email: `compliance.${fixture.code.toLowerCase()}@cfms.local`,
        password: passwordHash,
        firstName: fixture.code,
        lastName: 'Compliance',
        role: UserRole.BANK_USER,
        bankId: bank.id,
      },
    });

    const approvalSubmission = await prisma.submission.create({
      data: {
        referenceNumber: makeReference('SUB-APR', fixture.code, 1),
        type: 'APPROVALS',
        fileName: `${fixture.code.toLowerCase()}_approvals_q2_2026.csv`,
        status: SubmissionStatus.COMPLETED,
        totalRecords: 4,
        processedRecords: 4,
        errorRecords: 0,
        submittedAt: addDays(now, -20 + bankIndex),
        processedAt: addDays(now, -20 + bankIndex),
        bankId: bank.id,
        submittedById: cfmOfficer.id,
      },
    });

    const transactionSubmission = await prisma.submission.create({
      data: {
        referenceNumber: makeReference('SUB-TXN', fixture.code, 1),
        type: 'TRANSACTIONS',
        fileName: `${fixture.code.toLowerCase()}_capital_flows_april_2026.csv`,
        status: SubmissionStatus.COMPLETED,
        totalRecords: 6,
        processedRecords: 6,
        errorRecords: 0,
        submittedAt: addDays(now, -12 + bankIndex),
        processedAt: addDays(now, -12 + bankIndex),
        bankId: bank.id,
        submittedById: bankUser.id,
      },
    });

    const lateSubmission = await prisma.submission.create({
      data: {
        referenceNumber: makeReference('SUB-TXN', fixture.code, 2),
        type: 'TRANSACTIONS',
        fileName: `${fixture.code.toLowerCase()}_capital_flows_march_2026_late.csv`,
        status: SubmissionStatus.PARTIALLY_COMPLETED,
        totalRecords: 5,
        processedRecords: 4,
        errorRecords: 1,
        errorDetails: JSON.stringify([
          { row: 5, errors: ['Missing counterparty country'] },
        ]),
        submittedAt: addDays(now, -5 + bankIndex),
        processedAt: addDays(now, -4 + bankIndex),
        bankId: bank.id,
        submittedById: bankUser.id,
      },
    });

    const activeApproval = await prisma.approval.create({
      data: {
        referenceNumber: makeReference('APR', fixture.code, 1),
        type: ApprovalType.FOREX_PURCHASE,
        approvedAmount: 950000 + bankIndex * 55000,
        utilizedAmount: 320000 + bankIndex * 20000,
        currency: 'USD',
        status: ApprovalStatus.ACTIVE,
        validityStart: addDays(now, -35),
        validityEnd: addDays(now, 75),
        beneficiaryName: 'Regional Trade Desk',
        beneficiaryAccount: `BEN-${fixture.code}-001`,
        purpose: 'Fuel, medicines, and productive sector import support',
        conditions: 'Invoice and bill of entry required within 5 working days',
        bankId: bank.id,
        createdById: cfmOfficer.id,
        approvedById: supervisor.id,
      },
    });

    const outwardApproval = await prisma.approval.create({
      data: {
        referenceNumber: makeReference('APR', fixture.code, 2),
        type: ApprovalType.OUTWARD_TRANSFER,
        approvedAmount: 420000 + bankIndex * 25000,
        utilizedAmount: 210000 + bankIndex * 10000,
        currency: 'USD',
        status: ApprovalStatus.ACTIVE,
        validityStart: addDays(now, -28),
        validityEnd: addDays(now, 35),
        beneficiaryName: 'Regional Supplier Settlement',
        beneficiaryAccount: `BEN-${fixture.code}-002`,
        purpose: 'Cross-border supplier obligations and contract settlements',
        conditions: 'Evidence of underlying contracts to be retained',
        bankId: bank.id,
        createdById: cfmOfficer.id,
        approvedById: supervisor.id,
      },
    });

    const expiredApproval = await prisma.approval.create({
      data: {
        referenceNumber: makeReference('APR', fixture.code, 3),
        type: ApprovalType.DIVIDEND_PAYMENT,
        approvedAmount: 260000 + bankIndex * 12000,
        utilizedAmount: 240000 + bankIndex * 11000,
        currency: 'USD',
        status: ApprovalStatus.EXPIRED,
        validityStart: addDays(now, -120),
        validityEnd: addDays(now, -7),
        beneficiaryName: 'Shareholder Services Desk',
        beneficiaryAccount: `BEN-${fixture.code}-003`,
        purpose: 'Approved offshore dividend distribution',
        bankId: bank.id,
        createdById: cfmOfficer.id,
        approvedById: supervisor.id,
      },
    });

    await prisma.approval.create({
      data: {
        referenceNumber: makeReference('APR', fixture.code, 4),
        type: ApprovalType.LOAN_DISBURSEMENT,
        approvedAmount: 780000 + bankIndex * 40000,
        utilizedAmount: 0,
        currency: 'USD',
        status: ApprovalStatus.PENDING,
        validityStart: addDays(now, 5),
        validityEnd: addDays(now, 120),
        beneficiaryName: 'Export Producer Finance Facility',
        beneficiaryAccount: `BEN-${fixture.code}-004`,
        purpose: 'Pending approval for productive sector facility',
        bankId: bank.id,
        createdById: cfmOfficer.id,
      },
    });

    const transactionSpecs = [
      {
        type: ApprovalType.FOREX_PURCHASE,
        amount: 145000 + bankIndex * 9000,
        currency: 'USD',
        submissionId: transactionSubmission.id,
        approvalId: activeApproval.id,
        templateIndex: 0,
        dayOffset: -11,
      },
      {
        type: ApprovalType.OUTWARD_TRANSFER,
        amount: 98000 + bankIndex * 7000,
        currency: 'USD',
        submissionId: transactionSubmission.id,
        approvalId: outwardApproval.id,
        templateIndex: 1,
        dayOffset: -10,
      },
      {
        type: ApprovalType.OUTWARD_TRANSFER,
        amount: 86000 + bankIndex * 5000,
        currency: 'USD',
        submissionId: lateSubmission.id,
        approvalId: null,
        templateIndex: 2,
        dayOffset: -4,
      },
      {
        type: ApprovalType.DIVIDEND_PAYMENT,
        amount: 54000 + bankIndex * 3000,
        currency: 'USD',
        submissionId: lateSubmission.id,
        approvalId: expiredApproval.id,
        templateIndex: 5,
        dayOffset: -3,
      },
      {
        type: ApprovalType.FOREX_PURCHASE,
        amount: 35000 + bankIndex * 2000,
        currency: 'ZAR',
        submissionId: lateSubmission.id,
        approvalId: null,
        templateIndex: 4,
        dayOffset: -2,
      },
      {
        type: ApprovalType.INWARD_TRANSFER,
        amount: 67000 + bankIndex * 3500,
        currency: 'USD',
        submissionId: transactionSubmission.id,
        approvalId: null,
        templateIndex: 3,
        dayOffset: -8,
      },
    ];

    const createdTransactions = [];
    for (let txIndex = 0; txIndex < transactionSpecs.length; txIndex++) {
      const spec = transactionSpecs[txIndex];
      const counterparty = counterpartyTemplates[(bankIndex + spec.templateIndex) % counterpartyTemplates.length];
      const branchId = branches[txIndex % branches.length]?.id || null;

      const transaction = await prisma.transaction.create({
        data: {
          referenceNumber: makeReference('TXN', fixture.code, txIndex + 1),
          type: spec.type,
          amount: spec.amount,
          currency: spec.currency,
          exchangeRate: spec.currency === 'ZAR' ? 17.6 : 1,
          transactionDate: addDays(now, spec.dayOffset),
          valueDate: addDays(now, spec.dayOffset + 1),
          counterpartyName: counterparty.name,
          counterpartyAccount: counterparty.account,
          counterpartyCountry: txIndex === 4 ? null : counterparty.country,
          purpose: txIndex === 2 ? null : counterparty.purpose,
          documentReference: counterparty.documentReference,
          bankId: bank.id,
          branchId,
          approvalId: spec.approvalId,
          submissionId: spec.submissionId,
        },
      });

      createdTransactions.push(transaction);
    }

    await prisma.exception.createMany({
      data: [
        {
          code: 'NO_APPROVAL',
          description: `${fixture.code} reported an outward transfer without an active approval.`,
          severity: ExceptionSeverity.HIGH,
          status: ExceptionStatus.OPEN,
          bankId: bank.id,
          transactionId: createdTransactions[2].id,
        },
        {
          code: 'EXPIRED_APPROVAL',
          description: `${fixture.code} executed a dividend payment after approval expiry.`,
          severity: ExceptionSeverity.CRITICAL,
          status: bankIndex % 2 === 0 ? ExceptionStatus.OPEN : ExceptionStatus.UNDER_REVIEW,
          bankId: bank.id,
          transactionId: createdTransactions[3].id,
          approvalId: expiredApproval.id,
        },
        {
          code: 'MISSING_REQUIRED_FIELDS',
          description: `${fixture.code} submitted incomplete counterparty details for a foreign purchase.`,
          severity: ExceptionSeverity.MEDIUM,
          status: bankIndex % 3 === 0 ? ExceptionStatus.RESOLVED : ExceptionStatus.OPEN,
          resolution: bankIndex % 3 === 0 ? 'Supporting documents provided and record corrected.' : null,
          resolvedAt: bankIndex % 3 === 0 ? addDays(now, -1) : null,
          resolvedById: bankIndex % 3 === 0 ? supervisor.id : null,
          bankId: bank.id,
          transactionId: createdTransactions[4].id,
        },
      ],
    });

    const riskScoreValue = 20 + bankIndex * 6;
    await prisma.riskScore.create({
      data: {
        bankId: bank.id,
        score: riskScoreValue,
        grade: determineGrade(riskScoreValue),
        mismatchRate: 0.04 + bankIndex * 0.01,
        unapprovedRate: 0.02 + bankIndex * 0.008,
        lateSubmissionRate: 0.01 + bankIndex * 0.006,
        dataQualityScore: 0.93 - bankIndex * 0.02,
        repeatViolationRate: 0.01 + bankIndex * 0.004,
        calculatedAt: addDays(now, -(bankIndex % 4)),
      },
    });

    banks.push({
      id: bank.id,
      code: bank.code,
      name: bank.name,
      branchIds: branches.map((branch) => branch.id),
      userId: bankUser.id,
      approvalSubmissionId: approvalSubmission.id,
      transactionSubmissionId: transactionSubmission.id,
      lateSubmissionId: lateSubmission.id,
      activeApprovalId: activeApproval.id,
      expiredApprovalId: expiredApproval.id,
    });
  }

  for (let index = 0; index < banks.length; index++) {
    const bank = banks[index];
    await prisma.auditLog.createMany({
      data: [
        {
          userId: bank.userId,
          action: 'auth.login.success',
          entityType: 'User',
          entityId: bank.userId,
          ipAddress: `10.20.${index + 1}.14`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          createdAt: addDays(now, -2),
        },
        {
          userId: bank.userId,
          action: 'submission.uploaded',
          entityType: 'Submission',
          entityId: bank.transactionSubmissionId,
          details: JSON.stringify({ bankCode: bank.code, fileType: 'TRANSACTIONS' }),
          ipAddress: `10.20.${index + 1}.21`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          createdAt: addDays(now, -5),
        },
        {
          userId: cfmOfficer.id,
          action: 'approval.uploaded',
          entityType: 'Submission',
          entityId: bank.approvalSubmissionId,
          details: JSON.stringify({ bankCode: bank.code, fileType: 'APPROVALS' }),
          ipAddress: `172.16.0.${index + 30}`,
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          createdAt: addDays(now, -18),
        },
      ],
    });

    await prisma.report.create({
      data: {
        name: `Compliance Report - ${bank.name}`,
        type: 'bank-compliance',
        format: 'JSON',
        status: 'COMPLETED',
        fileSize: 4096 + index * 128,
        parameters: JSON.stringify({ bankId: bank.id, period: 'Q2-2026' }),
        generatedById: index % 2 === 0 ? supervisor.id : bank.userId,
      },
    });
  }

  await prisma.systemConfig.createMany({
    data: [
      {
        key: 'PRIMARY_REPORTING_CURRENCIES',
        value: 'USD,ZAR,EUR,CNY,ZWG',
        description: 'Currencies accepted in the Zimbabwe capital flows reporting perimeter.',
      },
      {
        key: 'SUBMISSION_DEADLINE_DAYS',
        value: '5',
        description: 'Working days after period close for bank transaction submissions.',
      },
      {
        key: 'RECONCILIATION_TOLERANCE',
        value: '0.01',
        description: 'Tolerance for reconciliation amount variances.',
      },
      {
        key: 'PASSWORD_MIN_LENGTH',
        value: '8',
        description: 'Minimum allowed password length for local users.',
      },
      {
        key: 'SESSION_TIMEOUT_MINUTES',
        value: '30',
        description: 'Idle timeout for the local demonstration environment.',
      },
    ],
  });

  console.log('Seed completed successfully.');
  console.log('');
  console.log('Test credentials:');
  console.log(`  Super Admin: admin@rbz.co.zw / password123`);
  console.log(`  CFM Officer: cfm.officer@rbz.co.zw / password123`);
  console.log(`  Supervisor:  supervisor@rbz.co.zw / password123`);
  console.log(`  Auditor:     auditor@rbz.co.zw / password123`);
  console.log(`  Bank User:   compliance.cbz@cfms.local / password123`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

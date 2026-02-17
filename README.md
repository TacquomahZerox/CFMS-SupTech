# Capital Flows Management Supervisory Technology (CFMS-SupTech)

A production-grade regulatory supervisory platform for Central Bank capital flows management. This system automates regulatory reporting, reconciliation, compliance monitoring, and risk scoring for commercial banks.

## 🚀 Features

### Core Modules

- **🔐 Authentication & Authorization**
  - JWT-based authentication with secure cookie sessions
  - Role-based access control (RBAC) with 5 user roles
  - Session management and audit logging

- **🏦 Bank Management**
  - Register and manage commercial banks
  - Branch hierarchy management
  - Bank contact and compliance information

- **✅ Capital Flow Approvals**
  - Multi-type approval workflows (FOREX, Transfers, Loans, etc.)
  - Approval utilization tracking
  - Validity period management

- **💰 Transaction Management**
  - Record and track capital flow transactions
  - Link transactions to approvals
  - Support for multiple currencies and exchange rates

- **📤 Data Submission Portal**
  - Bulk upload via CSV/Excel
  - Validation and error reporting
  - Submission status tracking

- **🔄 Reconciliation Engine**
  - Automated matching of transactions to approvals
  - Exception detection and flagging
  - Multiple exception types support

- **📊 Risk Scoring Engine**
  - Weighted multi-factor risk scoring algorithm
  - Risk grade assignment (A/B/C/D)
  - Historical risk trend tracking

- **📈 Dashboards**
  - Role-specific dashboard views
  - Real-time compliance metrics
  - Interactive charts and visualizations

- **📋 Reporting**
  - Multiple report types (Summary, Volume, Risk, etc.)
  - Export to PDF, Excel, CSV
  - Scheduled report generation

- **📝 Audit Trail**
  - Complete activity logging
  - User action tracking
  - Compliance audit support

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT (jose library), bcryptjs
- **Charts**: Recharts
- **Tables**: TanStack Table
- **File Processing**: papaparse, xlsx

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/CFMS-SupTech.git
cd CFMS-SupTech
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Update `.env` with your configuration:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed the database with sample data
npx prisma db seed
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 👥 User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **SUPER_ADMIN** | System administrator | Full access to all features |
| **CFM_OFFICER** | Capital Flow Management officer | Approve/reject requests, manage approvals |
| **SUPERVISOR** | Bank supervisor | View all data, risk analysis, exception management |
| **BANK_USER** | Commercial bank user | Submit data, view own bank's information |
| **AUDITOR** | Internal/external auditor | Read-only access for audit purposes |

## 🔑 Test Credentials

After seeding the database:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@centralbank.gov | password123 |
| CFM Officer | cfm.officer@centralbank.gov | password123 |
| Supervisor | supervisor@centralbank.gov | password123 |
| Auditor | auditor@centralbank.gov | password123 |
| Bank User | user@abc.com | password123 |

## 📁 Project Structure

```
CFMS-SupTech/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed data script
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── api/           # API routes
│   │   ├── dashboard/     # Dashboard pages
│   │   ├── banks/         # Bank management
│   │   ├── approvals/     # Approval management
│   │   ├── transactions/  # Transaction views
│   │   ├── submissions/   # Data submissions
│   │   ├── exceptions/    # Exception management
│   │   ├── risk/          # Risk analysis
│   │   ├── reports/       # Report generation
│   │   ├── users/         # User management
│   │   └── audit/         # Audit logs
│   ├── components/        # React components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── layout/        # Layout components
│   │   └── dashboard/     # Dashboard widgets
│   ├── lib/               # Utility libraries
│   │   ├── prisma.ts      # Prisma client
│   │   ├── auth.ts        # Authentication utilities
│   │   ├── validations.ts # Zod schemas
│   │   └── utils.ts       # Helper functions
│   └── services/          # Business logic services
│       ├── audit.service.ts
│       ├── reconciliation.service.ts
│       ├── risk-scoring.service.ts
│       ├── upload.service.ts
│       └── report.service.ts
├── public/                # Static assets
└── package.json
```

## 🔒 Security Features

- Password hashing with bcryptjs
- JWT tokens with HttpOnly cookies
- CSRF protection
- Input validation with Zod
- Role-based access control
- Complete audit logging
- Session timeout management

## 📊 Risk Scoring Algorithm

The risk scoring engine uses a weighted multi-factor approach:

| Factor | Weight | Description |
|--------|--------|-------------|
| Mismatch Rate | 25% | Transaction/approval mismatches |
| Unapproved Transactions | 30% | Transactions without approvals |
| Late Submissions | 15% | Data submitted after deadline |
| Data Quality | 15% | Completeness and accuracy |
| Repeat Violations | 15% | Historical compliance issues |

**Grade Thresholds:**
- Grade A: 0-25%
- Grade B: 26-50%
- Grade C: 51-75%
- Grade D: 76-100%

## 📝 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Banks
- `GET /api/banks` - List all banks
- `POST /api/banks` - Create new bank
- `GET /api/banks/:id` - Get bank details
- `PATCH /api/banks/:id` - Update bank

### Approvals
- `GET /api/approvals` - List approvals
- `POST /api/approvals` - Create approval
- `GET /api/approvals/:id` - Get approval details
- `PATCH /api/approvals/:id` - Update approval

### Transactions
- `GET /api/transactions` - List transactions
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/:id` - Get transaction

### More endpoints available for:
- `/api/submissions` - Data submissions
- `/api/exceptions` - Exception management
- `/api/reconciliation/run` - Run reconciliation
- `/api/risk/score` - Calculate risk scores
- `/api/reports` - Generate reports
- `/api/users` - User management
- `/api/audit` - Audit logs
- `/api/dashboard/*` - Dashboard data

## 🧪 Development Commands

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Prisma commands
npx prisma studio      # Open Prisma Studio
npx prisma generate    # Generate Prisma client
npx prisma migrate dev # Run migrations
npx prisma db seed     # Seed database
```

## 📄 License

This project is proprietary software for Central Bank use.

## 🤝 Contributing

Please read our contributing guidelines before submitting pull requests.

## 📞 Support

For support inquiries, contact the IT department at support@centralbank.gov.

---

Built with ❤️ for regulatory excellence

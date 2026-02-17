// API Testing Script for CFMS-SupTech
// Run with: node test-api.js

const BASE_URL = 'http://localhost:3002';

// Test credentials
const USERS = {
  SUPER_ADMIN: { email: 'admin@centralbank.gov', password: 'password123' },
  CFM_OFFICER: { email: 'cfm.officer@centralbank.gov', password: 'password123' },
  SUPERVISOR: { email: 'supervisor@centralbank.gov', password: 'password123' },
  AUDITOR: { email: 'auditor@centralbank.gov', password: 'password123' },
  BANK_USER: { email: 'user@abc.com', password: 'password123' },
};

let cookies = {};

async function login(role) {
  const user = USERS[role];
  console.log(`\n🔐 Logging in as ${role}...`);
  
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Extract cookie from response
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      cookies[role] = setCookie.split(';')[0];
    }
    console.log(`✅ Login successful: ${data.data.firstName} ${data.data.lastName} (${data.data.role})`);
    return data.data;
  } else {
    console.log(`❌ Login failed: ${data.error}`);
    return null;
  }
}

async function testAPI(method, endpoint, role, body = null, expectedStatus = 200) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (cookies[role]) {
    headers['Cookie'] = cookies[role];
  }
  
  const options = { method, headers };
  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    const status = response.status;
    const success = data.success;
    const statusMatch = status === expectedStatus;
    
    if (statusMatch) {
      console.log(`  ✅ ${method} ${endpoint} - Status: ${status}`);
    } else {
      console.log(`  ❌ ${method} ${endpoint} - Status: ${status} (expected ${expectedStatus})`);
      if (data.error) console.log(`     Error: ${data.error}`);
    }
    
    return { status, data, success: statusMatch };
  } catch (error) {
    console.log(`  ❌ ${method} ${endpoint} - Error: ${error.message}`);
    return { status: 0, data: null, success: false };
  }
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║          CFMS-SupTech API Test Suite                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  // =====================================================
  // Test 1: Authentication
  // =====================================================
  console.log('\n📋 TEST 1: Authentication');
  console.log('─'.repeat(50));
  
  // Login all users
  for (const role of Object.keys(USERS)) {
    await login(role);
  }
  
  // Test /api/auth/me
  console.log('\n  Testing /api/auth/me...');
  await testAPI('GET', '/api/auth/me', 'SUPER_ADMIN');
  await testAPI('GET', '/api/auth/me', 'CFM_OFFICER');
  await testAPI('GET', '/api/auth/me', 'BANK_USER');
  
  // =====================================================
  // Test 2: Banks API with Role-Based Access
  // =====================================================
  console.log('\n📋 TEST 2: Banks API - Role Based Access');
  console.log('─'.repeat(50));
  
  // SUPER_ADMIN can read and write banks
  console.log('\n  SUPER_ADMIN (should have full access):');
  const banksResult = await testAPI('GET', '/api/banks', 'SUPER_ADMIN');
  const bankId = banksResult.data?.data?.[0]?.id;
  
  // CFM_OFFICER can read banks
  console.log('\n  CFM_OFFICER (should have read access):');
  await testAPI('GET', '/api/banks', 'CFM_OFFICER');
  
  // BANK_USER can read only their bank
  console.log('\n  BANK_USER (should have limited access):');
  await testAPI('GET', '/api/banks', 'BANK_USER');
  
  // AUDITOR can read banks
  console.log('\n  AUDITOR (should have read access):');
  await testAPI('GET', '/api/banks', 'AUDITOR');
  
  // Test bank detail
  if (bankId) {
    console.log('\n  Testing bank detail endpoint:');
    await testAPI('GET', `/api/banks/${bankId}`, 'SUPER_ADMIN');
  }
  
  // =====================================================
  // Test 3: Approvals API with Role-Based Access
  // =====================================================
  console.log('\n📋 TEST 3: Approvals API - Role Based Access');
  console.log('─'.repeat(50));
  
  // SUPER_ADMIN can read and write approvals
  console.log('\n  SUPER_ADMIN (should have full access):');
  const approvalsResult = await testAPI('GET', '/api/approvals', 'SUPER_ADMIN');
  const approvalId = approvalsResult.data?.data?.[0]?.id;
  
  // CFM_OFFICER can read and write approvals
  console.log('\n  CFM_OFFICER (should have read/write access):');
  await testAPI('GET', '/api/approvals', 'CFM_OFFICER');
  
  // SUPERVISOR can read approvals
  console.log('\n  SUPERVISOR (should have read access):');
  await testAPI('GET', '/api/approvals', 'SUPERVISOR');
  
  // BANK_USER can read only their bank's approvals
  console.log('\n  BANK_USER (should see limited approvals):');
  await testAPI('GET', '/api/approvals', 'BANK_USER');
  
  // AUDITOR can read approvals
  console.log('\n  AUDITOR (should have read access):');
  await testAPI('GET', '/api/approvals', 'AUDITOR');
  
  // Test approval detail
  if (approvalId) {
    console.log('\n  Testing approval detail endpoint:');
    await testAPI('GET', `/api/approvals/${approvalId}`, 'SUPER_ADMIN');
    await testAPI('GET', `/api/approvals/${approvalId}`, 'CFM_OFFICER');
  }
  
  // =====================================================
  // Test 4: Transactions API with Role-Based Access
  // =====================================================
  console.log('\n📋 TEST 4: Transactions API - Role Based Access');
  console.log('─'.repeat(50));
  
  // SUPER_ADMIN can read and write transactions
  console.log('\n  SUPER_ADMIN (should have full access):');
  const transactionsResult = await testAPI('GET', '/api/transactions', 'SUPER_ADMIN');
  const transactionId = transactionsResult.data?.data?.[0]?.id;
  
  // CFM_OFFICER can read transactions
  console.log('\n  CFM_OFFICER (should have read access):');
  await testAPI('GET', '/api/transactions', 'CFM_OFFICER');
  
  // BANK_USER can read only their bank's transactions
  console.log('\n  BANK_USER (should see limited transactions):');
  await testAPI('GET', '/api/transactions', 'BANK_USER');
  
  // Test transaction detail
  if (transactionId) {
    console.log('\n  Testing transaction detail endpoint:');
    await testAPI('GET', `/api/transactions/${transactionId}`, 'SUPER_ADMIN');
  }
  
  // =====================================================
  // Test 5: Submissions API
  // =====================================================
  console.log('\n📋 TEST 5: Submissions API - Role Based Access');
  console.log('─'.repeat(50));
  
  console.log('\n  SUPER_ADMIN:');
  await testAPI('GET', '/api/submissions', 'SUPER_ADMIN');
  
  console.log('\n  CFM_OFFICER:');
  await testAPI('GET', '/api/submissions', 'CFM_OFFICER');
  
  console.log('\n  BANK_USER:');
  await testAPI('GET', '/api/submissions', 'BANK_USER');
  
  // =====================================================
  // Test 6: Exceptions API
  // =====================================================
  console.log('\n📋 TEST 6: Exceptions API - Role Based Access');
  console.log('─'.repeat(50));
  
  console.log('\n  SUPER_ADMIN:');
  const exceptionsResult = await testAPI('GET', '/api/exceptions', 'SUPER_ADMIN');
  const exceptionId = exceptionsResult.data?.data?.[0]?.id;
  
  console.log('\n  CFM_OFFICER:');
  await testAPI('GET', '/api/exceptions', 'CFM_OFFICER');
  
  console.log('\n  BANK_USER:');
  await testAPI('GET', '/api/exceptions', 'BANK_USER');
  
  // =====================================================
  // Test 7: Dashboard API
  // =====================================================
  console.log('\n📋 TEST 7: Dashboard API');
  console.log('─'.repeat(50));
  
  console.log('\n  SUPER_ADMIN dashboard:');
  await testAPI('GET', '/api/dashboard/admin', 'SUPER_ADMIN');
  
  console.log('\n  CFM dashboard:');
  await testAPI('GET', '/api/dashboard/cfm', 'CFM_OFFICER');
  
  console.log('\n  BANK_USER dashboard:');
  await testAPI('GET', '/api/dashboard/bank', 'BANK_USER');
  
  // =====================================================
  // Test 8: Users API (Admin only)
  // =====================================================
  console.log('\n📋 TEST 8: Users API - Admin Only Access');
  console.log('─'.repeat(50));
  
  console.log('\n  SUPER_ADMIN (should have full access):');
  await testAPI('GET', '/api/users', 'SUPER_ADMIN');
  
  console.log('\n  CFM_OFFICER (should be denied):');
  await testAPI('GET', '/api/users', 'CFM_OFFICER', null, 403);
  
  console.log('\n  BANK_USER (should be denied):');
  await testAPI('GET', '/api/users', 'BANK_USER', null, 403);
  
  // =====================================================
  // Test 9: Risk API
  // =====================================================
  console.log('\n📋 TEST 9: Risk API');
  console.log('─'.repeat(50));
  
  console.log('\n  SUPER_ADMIN:');
  await testAPI('GET', '/api/risk', 'SUPER_ADMIN');
  
  console.log('\n  CFM_OFFICER:');
  await testAPI('GET', '/api/risk', 'CFM_OFFICER');
  
  // =====================================================
  // Test 10: Reports API
  // =====================================================
  console.log('\n📋 TEST 10: Reports API');
  console.log('─'.repeat(50));
  
  console.log('\n  SUPER_ADMIN:');
  await testAPI('GET', '/api/reports/summary', 'SUPER_ADMIN');
  
  console.log('\n  CFM_OFFICER:');
  await testAPI('GET', '/api/reports/summary', 'CFM_OFFICER');
  
  // =====================================================
  // Test 11: Audit API
  // =====================================================
  console.log('\n📋 TEST 11: Audit API');
  console.log('─'.repeat(50));
  
  console.log('\n  SUPER_ADMIN:');
  await testAPI('GET', '/api/audit', 'SUPER_ADMIN');
  
  console.log('\n  AUDITOR:');
  await testAPI('GET', '/api/audit', 'AUDITOR');
  
  console.log('\n  CFM_OFFICER (might be denied):');
  await testAPI('GET', '/api/audit', 'CFM_OFFICER', null, 403);
  
  // =====================================================
  // Test 12: Logout
  // =====================================================
  console.log('\n📋 TEST 12: Logout');
  console.log('─'.repeat(50));
  
  await testAPI('POST', '/api/auth/logout', 'SUPER_ADMIN');
  
  // =====================================================
  // Summary
  // =====================================================
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    Test Suite Complete                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('\n📝 Manual Testing Recommended:');
  console.log('   1. Login at http://localhost:3000/login with different roles');
  console.log('   2. Navigate through all pages');
  console.log('   3. Test create/edit/delete operations');
  console.log('   4. Verify role-based UI restrictions');
}

runTests().catch(console.error);

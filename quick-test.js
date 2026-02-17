// Quick API Test - CFMS-SupTech
// Run: node quick-test.js

const BASE_URL = process.env.API_URL || 'http://localhost:3002';

async function test() {
  console.log('Testing CFMS-SupTech APIs at:', BASE_URL);
  console.log('='.repeat(60));

  // Test 1: Login as Super Admin
  console.log('\n1. Testing Login API...');
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'admin@centralbank.gov', 
        password: 'password123' 
      }),
    });
    const loginData = await loginRes.json();
    
    if (loginData.success) {
      console.log('✅ Login successful:', loginData.data.firstName, loginData.data.lastName);
      console.log('   Role:', loginData.data.role);
      
      // Get cookie for subsequent requests
      const cookie = loginRes.headers.get('set-cookie');
      const token = cookie ? cookie.split(';')[0] : '';
      
      // Test 2: Get Dashboard
      console.log('\n2. Testing Dashboard API...');
      const dashRes = await fetch(`${BASE_URL}/api/dashboard`, {
        headers: { 'Cookie': token },
      });
      const dashData = await dashRes.json();
      console.log(dashData.success ? '✅ Dashboard loaded' : '❌ Dashboard failed:', dashData.error || '');
      if (dashData.data) {
        console.log('   Total Banks:', dashData.data.totalBanks || 'N/A');
        console.log('   Total Approvals:', dashData.data.totalApprovals || 'N/A');
      }

      // Test 3: Get Banks
      console.log('\n3. Testing Banks API...');
      const banksRes = await fetch(`${BASE_URL}/api/banks`, {
        headers: { 'Cookie': token },
      });
      const banksData = await banksRes.json();
      console.log(banksData.success ? '✅ Banks loaded' : '❌ Banks failed:', banksData.error || '');
      if (banksData.data) {
        console.log('   Banks count:', Array.isArray(banksData.data) ? banksData.data.length : 'N/A');
      }

      // Test 4: Get Approvals
      console.log('\n4. Testing Approvals API...');
      const approvalsRes = await fetch(`${BASE_URL}/api/approvals`, {
        headers: { 'Cookie': token },
      });
      const approvalsData = await approvalsRes.json();
      console.log(approvalsData.success ? '✅ Approvals loaded' : '❌ Approvals failed:', approvalsData.error || '');
      if (approvalsData.data) {
        console.log('   Approvals count:', Array.isArray(approvalsData.data) ? approvalsData.data.length : 'N/A');
      }

      // Test 5: Get Transactions
      console.log('\n5. Testing Transactions API...');
      const txRes = await fetch(`${BASE_URL}/api/transactions`, {
        headers: { 'Cookie': token },
      });
      const txData = await txRes.json();
      console.log(txData.success ? '✅ Transactions loaded' : '❌ Transactions failed:', txData.error || '');
      if (txData.data) {
        console.log('   Transactions count:', Array.isArray(txData.data) ? txData.data.length : 'N/A');
      }

      // Test 6: Get Exceptions
      console.log('\n6. Testing Exceptions API...');
      const excRes = await fetch(`${BASE_URL}/api/exceptions`, {
        headers: { 'Cookie': token },
      });
      const excData = await excRes.json();
      console.log(excData.success ? '✅ Exceptions loaded' : '❌ Exceptions failed:', excData.error || '');
      if (excData.data) {
        console.log('   Exceptions count:', Array.isArray(excData.data) ? excData.data.length : 'N/A');
      }

      // Test 7: Get Users (admin only)
      console.log('\n7. Testing Users API...');
      const usersRes = await fetch(`${BASE_URL}/api/users`, {
        headers: { 'Cookie': token },
      });
      const usersData = await usersRes.json();
      console.log(usersData.success ? '✅ Users loaded' : '❌ Users failed:', usersData.error || '');
      if (usersData.data) {
        console.log('   Users count:', Array.isArray(usersData.data) ? usersData.data.length : 'N/A');
      }

      // Test 8: Get Audit Logs
      console.log('\n8. Testing Audit Logs API...');
      const auditRes = await fetch(`${BASE_URL}/api/audit`, {
        headers: { 'Cookie': token },
      });
      const auditData = await auditRes.json();
      console.log(auditData.success ? '✅ Audit logs loaded' : '❌ Audit logs failed:', auditData.error || '');

      // Test 9: Logout
      console.log('\n9. Testing Logout API...');
      const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Cookie': token },
      });
      const logoutData = await logoutRes.json();
      console.log(logoutData.success ? '✅ Logout successful' : '❌ Logout failed:', logoutData.error || '');

    } else {
      console.log('❌ Login failed:', loginData.error);
    }
  } catch (err) {
    console.log('❌ Connection error:', err.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test complete!');
}

test();

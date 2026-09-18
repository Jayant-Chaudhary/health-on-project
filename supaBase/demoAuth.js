import { signUpUser, signInUser, signOutUser, getCurrentUser } from './auth.js';

async function runDemo() {
  console.log('--- Maternal Health Platform Auth Script Demo ---');
  
  const testUser = {
    email: `patient_test_${Date.now()}@gmail.com`,
    password: 'SecurePassword123!',
    fullName: 'Jane Doe',
    role: 'patient',
    phone: '+1234567890',
  };

  console.log('\n1. Testing Signup for:', testUser.email);
  const signupResult = await signUpUser(testUser);
  if (signupResult.error) {
    console.log('Signup Result Note:', signupResult.error.message || signupResult.error);
  } else {
    console.log('Signup Successful! User ID:', signupResult.user?.id);
  }

  console.log('\n2. Testing Login for:', testUser.email);
  const loginResult = await signInUser({
    email: testUser.email,
    password: testUser.password,
  });
  if (loginResult.error) {
    console.log('Login Result Note:', loginResult.error.message || loginResult.error);
  } else {
    console.log('Login Successful! Logged in User ID:', loginResult.user?.id);
  }

  console.log('\n3. Checking Current Session...');
  const currentUser = await getCurrentUser();
  console.log('Active User:', currentUser.user ? currentUser.user.email : 'None (No active session or placeholder credentials)');

  console.log('\n4. Testing Logout...');
  const logoutResult = await signOutUser();
  console.log('Logout Success:', logoutResult.success);

  console.log('\n--- Demo Completed ---');
}

runDemo().catch(console.error);

// Test script to verify child login functionality
// Run this with: node test-child-login.js

const API_BASE = 'http://localhost:5000/api';

// Test data
const parentData = {
  username: 'testparent',
  password: 'password123',
  email: 'parent@test.com',
  display_name: 'Test Parent',
  first_name: 'Test',
  last_name: 'Parent',
  role: 'parent'
};

const childData = {
  username: 'testchild',
  password: 'password123',
  email: 'child@test.com',
  display_name: 'Test Child',
  first_name: 'Test',
  last_name: 'Child'
};

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  
  return { response, data };
}

async function testChildLogin() {
  console.log('🧪 Testing Child Login Functionality\n');
  
  try {
    // Step 1: Create or login as parent
    console.log('1️⃣ Creating/logging in as parent...');
    let parentToken;
    
    // Try to register parent first
    const { response: registerRes, data: registerData } = await makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(parentData)
    });
    
    if (registerRes.ok) {
      console.log('✅ Parent registered successfully');
      parentToken = registerRes.headers.get('set-cookie')?.match(/token=([^;]+)/)?.[1];
    } else {
      // If registration fails, try login
      console.log('ℹ️ Parent already exists, trying login...');
      const { response: loginRes, data: loginData } = await makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: parentData.username,
          password: parentData.password
        })
      });
      
      if (loginRes.ok) {
        console.log('✅ Parent logged in successfully');
        parentToken = loginRes.headers.get('set-cookie')?.match(/token=([^;]+)/)?.[1];
      } else {
        throw new Error(`Parent login failed: ${JSON.stringify(loginData)}`);
      }
    }
    
    if (!parentToken) {
      throw new Error('No parent token received');
    }
    
    // Step 2: Create child account
    console.log('\n2️⃣ Creating child account...');
    const { response: childRes, data: childCreateData } = await makeRequest('/user/children', {
      method: 'POST',
      headers: {
        'Cookie': `token=${parentToken}`
      },
      body: JSON.stringify(childData)
    });
    
    if (childRes.ok) {
      console.log('✅ Child account created successfully');
      console.log('Child data:', childCreateData);
    } else {
      console.log('ℹ️ Child might already exist, continuing...');
      console.log('Response:', childCreateData);
    }
    
    // Step 3: Test child login
    console.log('\n3️⃣ Testing child login...');
    const { response: childLoginRes, data: childLoginData } = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: childData.username,
        password: childData.password
      })
    });
    
    if (childLoginRes.ok) {
      console.log('✅ Child logged in successfully!');
      console.log('Child user data:', childLoginData);
      
      const childToken = childLoginRes.headers.get('set-cookie')?.match(/token=([^;]+)/)?.[1];
      
      // Step 4: Test child dashboard access
      console.log('\n4️⃣ Testing child dashboard access...');
      const { response: dashboardRes, data: dashboardData } = await makeRequest('/child-dashboard', {
        headers: {
          'Cookie': `token=${childToken}`
        }
      });
      
      if (dashboardRes.ok) {
        console.log('✅ Child dashboard accessible!');
        console.log('Dashboard data:', dashboardData);
      } else {
        console.log('❌ Child dashboard access failed:', dashboardData);
      }
      
      // Step 5: Test lessons access
      console.log('\n5️⃣ Testing lessons access...');
      const { response: lessonsRes, data: lessonsData } = await makeRequest('/lessons', {
        headers: {
          'Cookie': `token=${childToken}`
        }
      });
      
      if (lessonsRes.ok) {
        console.log('✅ Child can access lessons!');
        console.log(`Found ${lessonsData.length} lessons`);
      } else {
        console.log('❌ Child lessons access failed:', lessonsData);
      }
      
    } else {
      console.log('❌ Child login failed:', childLoginData);
    }
    
    console.log('\n🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testChildLogin();

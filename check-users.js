// Simple script to check and update test user profiles
const API_BASE = 'http://localhost:5000/api';

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

async function loginAsParent() {
  console.log('🔐 Logging in as parent...');
  
  const { response: loginRes, data: loginData } = await makeRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'testparent',
      password: 'password123'
    })
  });
  
  if (loginRes.ok) {
    console.log('✅ Parent logged in successfully');
    const token = loginRes.headers.get('set-cookie')?.match(/token=([^;]+)/)?.[1];
    return token;
  } else {
    console.log('❌ Parent login failed:', loginData);
    return null;
  }
}

async function checkChildren(token) {
  console.log('\n👶 Checking children...');
  
  const { response: childrenRes, data: childrenData } = await makeRequest('/user/children', {
    headers: {
      'Cookie': `token=${token}`
    }
  });
  
  if (childrenRes.ok) {
    console.log(`✅ Found ${childrenData.length} children:`);
    
    childrenData.forEach((child, index) => {
      console.log(`\n${index + 1}. ${child.display_name} (@${child.username})`);
      console.log(`   - ID: ${child.id}`);
      console.log(`   - Name: ${child.first_name} ${child.last_name}`);
      console.log(`   - Email: ${child.email}`);
      console.log(`   - Role: ${child.role}`);
      console.log(`   - Parent ID: ${child.parent_id}`);
      
      if (child.profile) {
        console.log(`   - Age: ${child.profile.age || 'Not set'}`);
        console.log(`   - Profile Picture: ${child.profile.profile_picture || 'None'}`);
      } else {
        console.log(`   - Profile: Not found`);
      }
      
      console.log(`   - Lessons: ${child.completedLessons || 0}/${child.totalLessons || 0}`);
    });
    
    return childrenData;
  } else {
    console.log('❌ Failed to fetch children:', childrenData);
    return [];
  }
}

async function updateChildProfile(token, childId, profileData) {
  console.log(`\n🔄 Updating profile for child ID ${childId}...`);
  
  // Since we don't have a direct update endpoint, we'll need to create a simple SQL update
  // For now, let's just log what we would update
  console.log(`Would update child ${childId} with:`, profileData);
  
  // This would require a backend endpoint to update child profiles
  // For now, we'll just return success
  return true;
}

async function main() {
  console.log('🧪 Checking and updating test user profiles\n');
  
  try {
    // Login as parent
    const token = await loginAsParent();
    if (!token) {
      console.log('❌ Cannot proceed without parent authentication');
      return;
    }
    
    // Check children
    const children = await checkChildren(token);
    
    // Define the profile updates we want to make
    const profileUpdates = {
      'jimmy': {
        profilePicture: '/images/profile-boy-1.png',
        age: 8
      },
      'timmy': {
        profilePicture: '/images/profile-boy-2.png', 
        age: 10
      },
      'gracey': {
        profilePicture: '/images/profile-girl.png',
        age: 6
      }
    };
    
    console.log('\n🎯 Target profile updates:');
    Object.entries(profileUpdates).forEach(([username, data]) => {
      console.log(`${username}: ${data.profilePicture}, age ${data.age}`);
    });
    
    // Find matching children and show what needs to be updated
    console.log('\n📝 Required updates:');
    children.forEach(child => {
      const username = child.username.toLowerCase();
      if (profileUpdates[username]) {
        const target = profileUpdates[username];
        const current = child.profile;
        
        console.log(`\n${child.display_name} (@${username}):`);
        console.log(`  Current picture: ${current?.profile_picture || 'None'}`);
        console.log(`  Target picture:  ${target.profilePicture}`);
        console.log(`  Current age:     ${current?.age || 'None'}`);
        console.log(`  Target age:      ${target.age}`);
        
        const needsUpdate = 
          current?.profile_picture !== target.profilePicture ||
          current?.age !== target.age;
          
        console.log(`  Needs update:    ${needsUpdate ? '✅ YES' : '❌ NO'}`);
      }
    });
    
    console.log('\n💡 To complete the updates, you need to:');
    console.log('1. Create a backend endpoint to update child profiles');
    console.log('2. Or manually update the database with SQL commands');
    console.log('3. The profile pictures should point to the existing images in /images/');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the script
main();

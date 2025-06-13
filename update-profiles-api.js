// Script to update test user profiles via API
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

async function getChildren(token) {
  const { response: childrenRes, data: childrenData } = await makeRequest('/user/children', {
    headers: {
      'Cookie': `token=${token}`
    }
  });
  
  if (childrenRes.ok) {
    return childrenData;
  } else {
    console.log('❌ Failed to fetch children:', childrenData);
    return [];
  }
}

async function updateChildProfile(token, childId, profileData) {
  console.log(`🔄 Updating profile for child ID ${childId}...`);
  
  const { response: updateRes, data: updateData } = await makeRequest(`/user/profile/${childId}`, {
    method: 'PUT',
    headers: {
      'Cookie': `token=${token}`
    },
    body: JSON.stringify(profileData)
  });
  
  if (updateRes.ok) {
    console.log(`✅ Successfully updated profile for child ${childId}`);
    return updateData;
  } else {
    console.log(`❌ Failed to update profile for child ${childId}:`, updateData);
    return null;
  }
}

async function main() {
  console.log('🧪 Updating test user profiles via API\n');
  
  try {
    // Login as parent
    const token = await loginAsParent();
    if (!token) {
      console.log('❌ Cannot proceed without parent authentication');
      return;
    }
    
    // Get children
    const children = await getChildren(token);
    console.log(`\n👶 Found ${children.length} children`);
    
    // Define the profile updates we want to make
    const profileUpdates = {
      'jimmy': {
        profile_picture: '/images/profile-boy-1.png',
        age: 8
      },
      'timmy': {
        profile_picture: '/images/profile-boy-2.png', 
        age: 10
      },
      'gracey': {
        profile_picture: '/images/profile-girl.png',
        age: 6
      }
    };
    
    console.log('\n🎯 Updating profiles...');
    
    // Update each child's profile
    for (const child of children) {
      const username = child.username.toLowerCase();
      if (profileUpdates[username]) {
        const updateData = profileUpdates[username];
        
        console.log(`\n📝 ${child.display_name} (@${username}):`);
        console.log(`   Current: ${child.profile?.profile_picture || 'None'}, age ${child.profile?.age || 'None'}`);
        console.log(`   Target:  ${updateData.profile_picture}, age ${updateData.age}`);
        
        const result = await updateChildProfile(token, child.id, updateData);
        
        if (result) {
          console.log(`   ✅ Updated successfully`);
          console.log(`   New: ${result.profile_picture}, age ${result.age}`);
        }
      } else {
        console.log(`\n⏭️  Skipping ${child.display_name} (@${username}) - not in target list`);
      }
    }
    
    // Verify updates
    console.log('\n🔍 Verifying updates...');
    const updatedChildren = await getChildren(token);
    
    updatedChildren.forEach(child => {
      const username = child.username.toLowerCase();
      if (profileUpdates[username]) {
        console.log(`\n✅ ${child.display_name} (@${username}):`);
        console.log(`   Profile Picture: ${child.profile?.profile_picture || 'None'}`);
        console.log(`   Age: ${child.profile?.age || 'None'}`);
      }
    });
    
    console.log('\n🎉 Profile updates completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the script
main();

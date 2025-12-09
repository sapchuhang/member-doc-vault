
const API_URL = 'http://localhost:5001/api';

async function testAuth() {
    console.log('Testing Admin Login...');
    // Default credentials from routes/auth.js
    const username = 'admin';
    const password = 'admin123';

    try {
        // Login
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const loginData = await loginRes.json();
        console.log('Login Status:', loginRes.status);
        console.log('Login Response:', loginData);

        if (!loginRes.ok) return;

        const token = loginData.token;

        // Test Create Member
        console.log('\nTesting Create Member...');
        const memberData = {
            name: 'Test Member',
            email: `member${Date.now()}@example.com`,
            password: 'password123',
            address: '123 Test St',
            phone: '1234567890',
            panNumber: 'PAN123',
            citizenshipNumber: 'CIT123',
            nidNumber: 'NID123'
        };

        const createRes = await fetch(`${API_URL}/members`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify(memberData)
        });

        const createData = await createRes.json();
        console.log('Create Member Status:', createRes.status);
        console.log('Create Member Response:', createData);

        // Test Get Members
        console.log('\nTesting Get Members...');
        const getRes = await fetch(`${API_URL}/members`, {
            headers: { 'x-auth-token': token }
        });
        
        const getData = await getRes.json();
        console.log('Get Members Status:', getRes.status);
        console.log('Get Members Count:', getData.length);

    } catch (err) {
        console.error('Error:', err);
    }
}

testAuth();

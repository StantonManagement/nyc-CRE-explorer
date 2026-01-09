
async function run() {
  try {
    console.log('Sending login request...');
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'aks@stanlencap.com' })
    });
    
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Raw Body Length:', text.length);
    console.log('Raw Body:', text);
    try {
        console.log('JSON Body:', JSON.parse(text));
    } catch (e) {
        console.log('Body is not JSON');
    }
  } catch (e) {
    console.error('Fetch error:', e.message);
  }
}

run();

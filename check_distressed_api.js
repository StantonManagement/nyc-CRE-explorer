
async function checkDistressed() {
  try {
    const response = await fetch('http://localhost:3000/api/owners/distressed?minScore=10');
    const data = await response.json();
    console.log('Full Response:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Check failed:', e.message);
  }
}
checkDistressed();

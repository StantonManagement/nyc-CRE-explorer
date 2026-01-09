
async function checkProperty() {
  // Use a BBL known to have violations from previous step: 1005770017
  const bbl = '1005770017'; 
  try {
    const response = await fetch(`http://localhost:3000/api/properties/${bbl}`);
    const data = await response.json();
    console.log('Property Data Keys:', Object.keys(data));
    if (data.violations) {
        console.log('Violations found:', data.violations.length);
    } else {
        console.log('No "violations" field in response.');
    }
  } catch (e) {
    console.error('Check failed:', e.message);
  }
}
checkProperty();

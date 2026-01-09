// const fetch = require('node-fetch'); // Not needed in Node 18+

async function check() {
  const url = 'https://data.cityofnewyork.us/resource/3h2n-5cm9.json?$limit=5';
  const response = await fetch(url);
  const data = await response.json();
  console.log('Sample DOB Records:', JSON.stringify(data, null, 2));
}

check();


async function checkPluto() {
  // BBL for 216 WEST 30 STREET
  const bbl = '1007790053'; 
  const url = `https://data.cityofnewyork.us/resource/64uk-42ks.json?bbl=${bbl}`;
  
  console.log(`🔍 Checking NYC Open Data (PLUTO) for BBL: ${bbl}...`);
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.length === 0) {
      console.log('❌ Property not found in PLUTO.');
    } else {
      const p = data[0];
      console.log('✅ Property Found:');
      console.log(`   Address: ${p.address}`);
      console.log(`   Owner: ${p.ownername}`);
      console.log('--- CRITICAL DATA ---');
      console.log(`   Last Sale Date (PLUTO): ${p.lastsaledate || 'NULL'}`);
      console.log(`   Last Sale Price (PLUTO): ${p.lastsaleprice || 'NULL'}`);
      console.log(`   Year Altered 1: ${p.yearaltered1 || 'NULL'}`);
      console.log(`   Lot Front: ${p.lotfront}`);
      console.log(`   Lot Depth: ${p.lotdepth}`);
    }
  } catch (err) {
    console.error('Error fetching:', err);
  }
}

checkPluto();

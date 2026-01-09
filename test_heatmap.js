
async function checkHeatmap() {
  try {
    const response = await fetch('http://localhost:3000/api/heatmap?metric=distress');
    const data = await response.json();
    console.log('Distress points:', data.points?.length);
    
    const response2 = await fetch('http://localhost:3000/api/heatmap?metric=opportunity');
    const data2 = await response2.json();
    console.log('Opportunity points:', data2.points?.length);

    const response3 = await fetch('http://localhost:3000/api/heatmap?metric=price');
    const data3 = await response3.json();
    console.log('Price points:', data3.points?.length);
  } catch (e) {
    console.error('Heatmap check failed:', e.message);
  }
}
checkHeatmap();

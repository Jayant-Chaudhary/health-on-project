const { extractFromFile, checkOcrHealth } = require('./src/services/ocrService');

async function main() {
  const isHealthy = await checkOcrHealth();
  console.log('Is OCR Service Healthy?', isHealthy);

  if (isHealthy) {
    // Replace with the path to a real image on your computer
    const result = await extractFromFile('D:\\PROJECTS\\personalProjects\\healthon\\health-on-project\\server\\src\\tests\\services\\1.png');
    console.log('OCR Result:', JSON.stringify(result, null, 2));
  }
}
main();
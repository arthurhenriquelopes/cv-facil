import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

async function testStepProfileDirectImport() {
  const chromeExe = 'C:\\Users\\Arthur Henrique\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe';
  const browser = await chromium.launch({ executablePath: chromeExe });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });

  // 1. Go to step-profile
  await page.goto('http://localhost:5173/pages/step-profile.html');
  await page.waitForTimeout(500);

  // 2. Upload sample PDF directly
  const pdfPath = path.join(ROOT_DIR, 'EXEMPLO/Curriculo-Base-Arthur.pdf');
  const fileInput = await page.$('#file-upload-direct');
  if (!fileInput) throw new Error('#file-upload-direct not found');
  await fileInput.setInputFiles(pdfPath);

  // 3. Should redirect to /pages/result.html immediately
  await page.waitForURL(/result\.html/, { timeout: 10000 });
  await page.waitForSelector('.cv-professional', { timeout: 10000 });

  const nameText = await page.locator('.cv-name').textContent();
  console.log('step-profile direct import -> Rendered Name in result.html:', nameText);

  await browser.close();
  console.log('step-profile direct import test passed!');
}

testStepProfileDirectImport().catch(console.error);

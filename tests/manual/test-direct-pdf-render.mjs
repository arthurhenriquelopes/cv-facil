import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

async function testDeterministicImportFlow() {
  const chromeExe = 'C:\\Users\\Arthur Henrique\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe';
  const browser = await chromium.launch({ executablePath: chromeExe });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });

  // Listen to console
  page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err));

  // 1. Clear state and go to result.html
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => localStorage.removeItem('cvporvaga_data'));

  await page.goto('http://localhost:5173/pages/result.html');
  await page.waitForTimeout(500);

  // 2. Upload sample PDF directly
  const pdfPath = path.join(ROOT_DIR, 'EXEMPLO/Curriculo-Base-Arthur.pdf');
  console.log('Uploading PDF:', pdfPath);

  const fileInput = await page.$('#direct-pdf-upload');
  if (!fileInput) throw new Error('#direct-pdf-upload not found');
  await fileInput.setInputFiles(pdfPath);

  // 3. Wait for rendered CV to appear
  await page.waitForSelector('.cv-professional', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // 4. Verify rendered content
  const nameText = await page.locator('.cv-name').textContent();
  console.log('Rendered Name:', nameText);

  const linkedinLink = await page.locator('#cv-preview a[href*="linkedin.com"]').first();
  const linkedinHref = await linkedinLink.getAttribute('href');
  console.log('LinkedIn Link Href:', linkedinHref);

  const expCompany = await page.locator('.cv-exp-company').first().textContent();
  console.log('Exp Company:', expCompany);

  const expTitle = await page.locator('.cv-exp-title').first().textContent();
  console.log('Exp Title:', expTitle);

  const certCount = await page.locator('.cv-cert-bullets li').count();
  console.log('Certifications Count:', certCount);

  // 5. Screenshot the rendered CV
  await page.screenshot({ path: 'tests/output/deterministic_cv_imported_arthur.png', fullPage: true });
  console.log('Screenshot saved to tests/output/deterministic_cv_imported_arthur.png');

  await browser.close();
}

testDeterministicImportFlow().catch(console.error);

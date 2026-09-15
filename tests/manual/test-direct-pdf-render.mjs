import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

async function testWithPdf(pdfRelativePath, screenshotName) {
  const chromeExe = 'C:\\Users\\Arthur Henrique\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe';
  const browser = await chromium.launch({ executablePath: chromeExe });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1200 } });

  console.log('\n======================================================');
  console.log('TESTING WITH:', pdfRelativePath);
  console.log('======================================================');

  await page.goto('http://localhost:5173/');
  await page.evaluate(() => localStorage.removeItem('cvporvaga_data'));

  await page.goto('http://localhost:5173/pages/result.html');
  await page.waitForTimeout(500);

  const pdfPath = path.join(ROOT_DIR, pdfRelativePath);
  const fileInput = await page.$('#direct-pdf-upload');
  if (!fileInput) throw new Error('#direct-pdf-upload not found');
  await fileInput.setInputFiles(pdfPath);

  await page.waitForSelector('.cv-professional', { timeout: 10000 });
  await page.waitForTimeout(800);

  const nameText = await page.locator('.cv-name').textContent();
  console.log('Name:', nameText);

  const titleEl = await page.locator('.cv-title');
  const titleText = await titleEl.count() > 0 ? await titleEl.textContent() : '(No title)';
  console.log('Title:', titleText);

  // Contact lines
  const contactLines = await page.locator('.cv-contact-line').allTextContents();
  console.log('Contact Lines:', contactLines);

  // Links
  const links = await page.locator('.cv-contact-line a').evaluateAll(els => els.map(e => ({ text: e.textContent, href: e.href, color: window.getComputedStyle(e).color })));
  console.log('Links in Header:', links);

  // Check missing badge
  const badgeCount = await page.locator('#btn-toggle-missing-links').count();
  console.log('Missing Links Badge Visible:', badgeCount > 0);

  // Check categories in Skills
  const skillCategories = await page.locator('.cv-skills-category').allTextContents();
  console.log('Skill Categories Count:', skillCategories.length);
  if (skillCategories.length > 0) {
    console.log('First category:', skillCategories[0]);
  }

  // Check projects
  const projTitles = await page.locator('.cv-proj-title').allTextContents();
  console.log('Projects Count:', projTitles.length, projTitles);

  // Screenshot
  const outPath = `tests/output/${screenshotName}`;
  await page.screenshot({ path: outPath, fullPage: true });
  console.log('Screenshot saved to:', outPath);

  await browser.close();
}

async function main() {
  await testWithPdf('tests/output/cv-arthur-real.pdf', 'cv_arthur_real_imported.png');
  await testWithPdf('EXEMPLO/Curriculo-Base-Arthur.pdf', 'cv_arthur_base_imported.png');
}

main().catch(console.error);

import { chromium } from '@playwright/test';

async function testDirectImport() {
  const chromeExe = 'C:\\Users\\Arthur Henrique\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe';
  const browser = await chromium.launch({ executablePath: chromeExe });
  const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });

  // 1. Test empty state on result.html
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => {
    localStorage.removeItem('cvporvaga_data');
  });

  await page.goto('http://localhost:5173/pages/result.html');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'tests/output/result_direct_import_empty_state.png' });

  // 2. Test landing page CTA
  await page.goto('http://localhost:5173/index.html');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'tests/output/landing_with_direct_edit_btn.png' });

  // 3. Test step-profile with direct button
  await page.goto('http://localhost:5173/pages/step-profile.html');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'tests/output/step_profile_with_direct_btn.png' });

  await browser.close();
  console.log('Direct import screenshots captured successfully!');
}
testDirectImport().catch(console.error);

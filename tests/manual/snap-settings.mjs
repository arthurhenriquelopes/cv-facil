import { chromium } from '@playwright/test';

async function snap() {
  const chromeExe = 'C:\\Users\\Arthur Henrique\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe';
  const browser = await chromium.launch({ executablePath: chromeExe });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('http://localhost:5173/pages/step-profile.html');
  // Click settings button (svg in header or gear button)
  const btn = await page.$('.settings-btn, button[title*="Configurações"], button:has(svg)');
  if (btn) await btn.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'tests/output/settings_modal_preview.png' });
  await browser.close();
  console.log('Screenshot saved!');
}
snap().catch(console.error);

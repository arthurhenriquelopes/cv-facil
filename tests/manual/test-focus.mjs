import { chromium } from '@playwright/test';

async function testFocus() {
  const chromeExe = 'C:\\Users\\Arthur Henrique\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe';
  const browser = await chromium.launch({ executablePath: chromeExe });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => {
    const mockCV = {
      header: {
        name: 'Arthur Henrique Lopes Feitosa',
        title: 'Desenvolvedor Júnior | Java, Python e .NET | Integrações Financeiras',
        contact: {
          location: 'São José de Ribamar, MA',
          phone: '(98) 99161-2062',
          email: 'arthurhenriquelopesf@gmail.com',
        }
      },
      summary: 'Resumo teste',
      experiences: [],
      education: [],
      skills: [],
      certifications: []
    };
    localStorage.setItem('cvporvaga_data', JSON.stringify({
      generatedCV: mockCV,
      profile: { name: 'Arthur Henrique Lopes Feitosa' }
    }));
  });

  await page.goto('http://localhost:5173/pages/result.html');
  await page.waitForTimeout(500);

  // Open links adder
  await page.click('#btn-toggle-missing-links');
  await page.waitForTimeout(200);

  // Focus the LinkedIn input (like in user screenshot)
  await page.focus('#input-add-linkedin');
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'tests/output/input_focus_fixed.png' });

  // Type some text to test typing visibility
  await page.type('#input-add-linkedin', 'https://linkedin.com/in/arthurfeitosa');
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'tests/output/input_typing_fixed.png' });

  await browser.close();
  console.log('Focus screenshots captured!');
}
testFocus().catch(console.error);

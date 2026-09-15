import { chromium } from '@playwright/test';

async function testSave() {
  const chromeExe = 'C:\\Users\\Arthur Henrique\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe';
  const browser = await chromium.launch({ executablePath: chromeExe });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => {
    const mockCV = {
      header: {
        name: 'Arthur Henrique Lopes',
        title: 'Desenvolvedor Full Stack',
        contact: {
          location: 'São Luís, MA',
          phone: '(98) 98888-8888',
          email: 'arthur@email.com',
        }
      },
      summary: 'Desenvolvedor com experiência em Java, Spring Boot, React e TypeScript.',
      experiences: [
        {
          company: 'Midas Desenvolvimento de Sistemas',
          title: 'Estagiário em Desenvolvimento de Software',
          period: '06/2025 – 06/2026',
          bullets: ['Desenvolveu APIs RESTful de alto desempenho']
        }
      ],
      education: [
        {
          institution: 'IFMA',
          degree: 'Bacharelado em Sistemas de Informação',
          period: '2023 – 2027'
        }
      ],
      skills: {
        categorized: true,
        categories: [
          { label: 'Linguagens', items: ['Java', 'TypeScript'] }
        ]
      },
      certifications: [
        { title: 'Bootcamp Santander 2025 - Backend com Java', issuer: 'DIO', date: '2025' }
      ]
    };
    localStorage.setItem('cvporvaga_data', JSON.stringify({
      generatedCV: mockCV,
      profile: { name: 'Arthur Henrique Lopes' }
    }));
  });

  await page.goto('http://localhost:5173/pages/result.html');
  await page.waitForTimeout(500);

  // Open links adder
  await page.click('#btn-toggle-missing-links');
  await page.waitForTimeout(200);

  // Fill inputs
  await page.fill('#input-add-linkedin', 'linkedin.com/in/arthurlopes');
  await page.fill('#input-add-github', 'github.com/arthurlopes');
  await page.fill('#input-add-portfolio', 'arthur.dev');

  // Click Save
  await page.click('#btn-save-missing-links');
  await page.waitForTimeout(500);

  // Take screenshot of updated CV
  await page.screenshot({ path: 'tests/output/result_after_saving_links.png' });

  // Test adding a new certification
  await page.click('#btn-toggle-add-cert');
  await page.waitForTimeout(200);
  await page.fill('#input-cert-title', 'AWS Certified Solutions Architect');
  await page.fill('#input-cert-issuer', 'Amazon Web Services');
  await page.fill('#input-cert-year', '2026');
  await page.click('#btn-save-new-cert');
  await page.waitForTimeout(500);

  // Take screenshot of updated CV with new cert
  await page.screenshot({ path: 'tests/output/result_after_saving_cert.png' });

  await browser.close();
  console.log('Tested saving successfully!');
}
testSave().catch(console.error);

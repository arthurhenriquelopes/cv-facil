import { chromium } from '@playwright/test';

async function snap() {
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
          // linkedin, github and portfolio intentionally omitted to test the badge
        }
      },
      summary: 'Desenvolvedor com experiência em Java, Spring Boot, React e TypeScript.',
      experiences: [
        {
          company: 'Midas Desenvolvimento de Sistemas',
          title: 'Estagiário em Desenvolvimento de Software',
          period: '06/2025 – 06/2026',
          bullets: ['Desenvolveu APIs RESTful de alto desempenho', 'Implementou testes automatizados']
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
          { label: 'Linguagens', items: ['Java', 'TypeScript', 'JavaScript'] },
          { label: 'Frameworks', items: ['Spring Boot', 'React', 'Node.js'] }
        ]
      },
      certifications: [
        { title: 'Bootcamp Santander 2025 - Backend com Java', issuer: 'DIO', date: '2025' },
        { title: 'Formação Spring Framework', issuer: 'DIO', date: '2025' }
      ]
    };
    localStorage.setItem('cvporvaga_data', JSON.stringify({
      generatedCV: mockCV,
      profile: { name: 'Arthur Henrique Lopes' }
    }));
  });

  await page.goto('http://localhost:5173/pages/result.html');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'tests/output/result_preview_initial.png' });

  // Click on the missing links badge to expand
  const btnLinks = await page.$('#btn-toggle-missing-links');
  if (btnLinks) await btnLinks.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tests/output/result_preview_expanded.png' });

  await browser.close();
  console.log('Result screenshots saved!');
}
snap().catch(console.error);

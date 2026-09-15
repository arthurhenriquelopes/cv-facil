import { test } from '../support/commands.js';
import { expect } from '@playwright/test';

test.describe('ATS Scanner', () => {
    test('Scanner Flow - Valid analysis low score', async ({ page, mockProfileLow }) => {
        await page.goto('/pages/step-ats-scanner.html');

        // Wait for file input to be ready
        await page.waitForSelector('#pdf-upload', { state: 'attached' });
        await page.setInputFiles('#pdf-upload', {
            name: 'sample.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('%PDF-1.4 mock pdf dummy buffer')
        });

        await page.click('#btn-continue'); // Extrair
        
        // Em step-job.html (refactored: now has company-name + job-desc)
        await page.waitForSelector('#company-name');
        await page.fill('#company-name', 'TechCorp');
        await page.fill('#job-desc', 'Vaga Desenvolvedor Frontend Sênior com experiência em React, TypeScript e testes automatizados.');
        await page.click('#btn-next');

        await page.waitForURL(/step-ats-loading|step-ats-result/, { timeout: 15000 });

        // Wait for result page
        await page.waitForURL(/step-ats-result/, { timeout: 30000 });

        // Low score implies "Precisa de ajustes" classification label and "Novo teste" action button
        await expect(page.locator('.score-gauge-label')).toContainText('Precisa de ajustes');
        await expect(page.locator('.new-test-link')).toBeVisible();
    });

    test('Scanner Flow - Valid analysis high score', async ({ page, mockProfile }) => {
        // using mockProfile = high
        await page.goto('/pages/step-ats-scanner.html');

        await page.waitForSelector('#pdf-upload', { state: 'attached' });
        await page.setInputFiles('#pdf-upload', {
            name: 'sample2.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('%PDF-1.4 mock pdf dummy buffer')
        });

        await page.click('#btn-continue');
        
        // Em step-job.html (refactored: now has company-name + job-desc)
        await page.waitForSelector('#company-name');
        await page.fill('#company-name', 'StartupXYZ');
        await page.fill('#job-desc', 'Vaga Desenvolvedor Frontend Júnior com conhecimento em HTML, CSS e JavaScript.');
        await page.click('#btn-next');

        await page.waitForURL(/step-ats-loading|step-ats-result/, { timeout: 15000 });

        // Wait for result page
        await page.waitForURL(/step-ats-result/, { timeout: 30000 });

        await expect(page.locator('.score-gauge-label')).toContainText('Excelente');
        await expect(page.locator('text=Excelente aderência')).toBeVisible();
    });
});

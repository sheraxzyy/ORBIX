import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function main() {
  const screenshotsDir = path.resolve('docs/screenshots');
  const artifactDir = path.resolve('C:/Users/SheRaX/.gemini/antigravity/brain/f70a6243-4f38-4ac7-924c-b5ea89078a8e');
  
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const results = [];

  const checks = [
    {
      name: 'desktop-landing',
      url: 'http://localhost:4173/',
      viewport: { width: 1440, height: 900 },
      description: 'Desktop Landing Page (1440px)',
    },
    {
      name: 'mobile-landing',
      url: 'http://localhost:4173/',
      viewport: { width: 390, height: 844 },
      description: 'Mobile Landing Page (390px iPhone 14/15/16)',
    },
    {
      name: 'desktop-dashboard',
      url: 'http://localhost:4173/app/chats',
      viewport: { width: 1440, height: 900 },
      description: 'Desktop 3-Pane Dashboard Shell (1440px)',
    },
    {
      name: 'mobile-dashboard-list',
      url: 'http://localhost:4173/app/chats',
      viewport: { width: 390, height: 844 },
      description: 'Mobile Dashboard Channel List & Bottom Nav (390px)',
    },
    {
      name: 'mobile-dashboard-conversation',
      url: 'http://localhost:4173/app/chats/preview-c1',
      viewport: { width: 390, height: 844 },
      description: 'Mobile Fullscreen Conversation Screen (390px)',
    },
  ];

  for (const check of checks) {
    const page = await browser.newPage({ viewport: check.viewport });
    const consoleErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    await page.goto(check.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500); // Allow motion transitions to settle

    // Check horizontal overflow
    const overflowCheck = await page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      const innerWidth = window.innerWidth;
      return {
        scrollWidth,
        clientWidth,
        innerWidth,
        hasHorizontalOverflow: scrollWidth > clientWidth + 1,
      };
    });

    const fileBase = `${check.name}.png`;
    const localPath = path.join(screenshotsDir, fileBase);
    const artifactPath = path.join(artifactDir, fileBase);

    await page.screenshot({ path: localPath, fullPage: false });
    fs.copyFileSync(localPath, artifactPath);

    results.push({
      name: check.name,
      description: check.description,
      viewport: `${check.viewport.width}x${check.viewport.height}`,
      hasHorizontalOverflow: overflowCheck.hasHorizontalOverflow,
      scrollWidth: overflowCheck.scrollWidth,
      clientWidth: overflowCheck.clientWidth,
      consoleErrorsCount: consoleErrors.length,
      consoleErrors,
      screenshot: fileBase,
    });

    await page.close();
  }

  await browser.close();

  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error('Evidence capture failed:', err);
  process.exit(1);
});


import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_SCREENSHOT_DIR = path.join(__dirname, 'public', 'screenshots');

// Ensure directory exists
if (!fs.existsSync(PUBLIC_SCREENSHOT_DIR)) {
  fs.mkdirSync(PUBLIC_SCREENSHOT_DIR, { recursive: true });
}

/**
 * Capture screenshot of the current page for an opportunity
 * @param {import('playwright').Page} page Playwright page instance
 * @param {string|number} opportunityId ID of the price record
 * @returns {Promise<string|null>} Path relative to public directory or null
 */
export async function captureOpportunityScreenshot(page, opportunityId) {
  try {
    const fileName = `opportunity_${opportunityId}_${Date.now()}.png`;
    const savePath = path.join(PUBLIC_SCREENSHOT_DIR, fileName);

    // Take standard screenshot
    await page.screenshot({
      path: savePath,
      fullPage: false
    });

    console.log(`📸 Screenshot de oportunidade capturado: public/screenshots/${fileName}`);
    return `/screenshots/${fileName}`;
  } catch (error) {
    console.error('❌ Falha ao capturar screenshot de oportunidade:', error.message);
    return null;
  }
}

/**
 * Generates a mock screenshot with high premium design (fintech style text)
 * if Playwright is running in simulated mock mode.
 */
export async function generateMockScreenshot(opportunityId, flightDetails) {
  try {
    const fileName = `opportunity_mock.png`;
    const savePath = path.join(PUBLIC_SCREENSHOT_DIR, fileName);

    // Save only once to prevent file system cluttering
    if (!fs.existsSync(savePath)) {
      // Tiny valid transparent 1x1 PNG base64
      const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      fs.writeFileSync(savePath, Buffer.from(base64Png, 'base64'));
    }
    
    return `/screenshots/${fileName}`;
  } catch (error) {
    console.error('❌ Falha ao gerar screenshot mock:', error.message);
    return null;
  }
}

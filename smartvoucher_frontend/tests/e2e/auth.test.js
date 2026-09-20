/**
 * E2E Tests for SmartVoucher Admin - Login Page
 * Run: node tests/e2e/auth.test.js
 * Requires: frontend dev server running at http://localhost:5173
 */

import puppeteer from 'puppeteer';

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const TIMEOUT = 10000;

async function runTests() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.log(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    console.log('\n=== Login Page Tests ===\n');

    // Test 1: Redirect to /login when not authenticated
    {
      const page = await browser.newPage();
      await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle0', timeout: TIMEOUT });
      const url = page.url();
      assert(url.includes('/login'), 'Unauthenticated user is redirected to /login');
      await page.close();
    }

    // Test 2: Login page renders with form
    {
      const page = await browser.newPage();
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: TIMEOUT });
      const usernameInput = await page.$('#username');
      const passwordInput = await page.$('#password');
      const submitBtn = await page.$('button[type="submit"]');
      assert(usernameInput !== null, 'Login page has username input');
      assert(passwordInput !== null, 'Login page has password input');
      assert(submitBtn !== null, 'Login page has submit button');
      await page.close();
    }

    // Test 3: Login page shows error for empty form submission
    {
      const page = await browser.newPage();
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: TIMEOUT });
      await page.click('button[type="submit"]');
      await new Promise(r => setTimeout(r, 500));
      // Check for any visible error toast or validation
      const body = await page.evaluate(() => document.body.innerText);
      assert(
        body.includes('Vui lòng nhập') || body.includes('thất bại'),
        'Login shows error for empty submission'
      );
      await page.close();
    }

    // Test 4: Login page title shows SmartVoucher
    {
      const page = await browser.newPage();
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: TIMEOUT });
      const bodyText = await page.evaluate(() => document.body.innerText);
      assert(bodyText.includes('SmartVoucher'), 'Login page shows SmartVoucher brand');
      await page.close();
    }

  } catch (error) {
    console.error('Test error:', error.message);
    failed++;
  } finally {
    await browser.close();
    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

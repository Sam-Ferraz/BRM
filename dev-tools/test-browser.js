#!/usr/bin/env node

import puppeteer from 'puppeteer';

async function testBRMApp() {
  console.log('🚀 Starting BRM app test...');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for headless mode
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Test the login page
    console.log('📱 Navigating to login page...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });

    // Take a screenshot
    await page.screenshot({ path: 'dev-tools/screenshots/login-page.png' });
    console.log('📸 Screenshot saved: dev-tools/screenshots/login-page.png');

    // Check if login form exists
    try {
      await page.waitForSelector('input[type="email"]', { timeout: 5000 });
      console.log('✅ Email input found');
    } catch (error) {
      console.log('❌ Email input not found');
    }

    try {
      await page.waitForSelector('input[type="password"]', { timeout: 5000 });
      console.log('✅ Password input found');
    } catch (error) {
      console.log('❌ Password input not found');
    }

    // Test form interaction (if inputs exist)
    try {
      await page.type('input[type="email"]', 'test@example.com');
      await page.type('input[type="password"]', 'testpassword');
      console.log('✅ Form inputs working');
      
      // Take another screenshot with filled form
      await page.screenshot({ path: 'dev-tools/screenshots/login-filled.png' });
      console.log('📸 Screenshot saved: dev-tools/screenshots/login-filled.png');
    } catch (error) {
      console.log('❌ Could not fill form:', error.message);
    }

    // Test responsive design
    console.log('📱 Testing mobile viewport...');
    await page.setViewport({ width: 375, height: 667 });
    await page.screenshot({ path: 'dev-tools/screenshots/mobile-view.png' });
    console.log('📸 Mobile screenshot saved: dev-tools/screenshots/mobile-view.png');

    console.log('🎉 Browser test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Create screenshots directory if it doesn't exist
import { mkdirSync } from 'fs';
try {
  mkdirSync('dev-tools/screenshots', { recursive: true });
} catch (error) {
  // Directory already exists
}

testBRMApp().catch(console.error);
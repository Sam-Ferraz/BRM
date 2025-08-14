#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import puppeteer from 'puppeteer';

class PuppeteerMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'puppeteer-browser',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.browser = null;
    this.page = null;
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'launch_browser',
          description: 'Launch a new browser instance',
          inputSchema: {
            type: 'object',
            properties: {
              headless: {
                type: 'boolean',
                description: 'Run browser in headless mode',
                default: true,
              },
              viewport: {
                type: 'object',
                properties: {
                  width: { type: 'number', default: 1280 },
                  height: { type: 'number', default: 720 },
                },
              },
            },
          },
        },
        {
          name: 'navigate',
          description: 'Navigate to a URL',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL to navigate to',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'screenshot',
          description: 'Take a screenshot of the current page',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to save screenshot',
              },
              fullPage: {
                type: 'boolean',
                description: 'Capture full page',
                default: false,
              },
            },
          },
        },
        {
          name: 'click',
          description: 'Click an element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'CSS selector for element to click',
              },
            },
            required: ['selector'],
          },
        },
        {
          name: 'type',
          description: 'Type text into an element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'CSS selector for input element',
              },
              text: {
                type: 'string',
                description: 'Text to type',
              },
            },
            required: ['selector', 'text'],
          },
        },
        {
          name: 'wait_for_selector',
          description: 'Wait for an element to appear',
          inputSchema: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'CSS selector to wait for',
              },
              timeout: {
                type: 'number',
                description: 'Timeout in milliseconds',
                default: 30000,
              },
            },
            required: ['selector'],
          },
        },
        {
          name: 'get_text',
          description: 'Get text content from an element',
          inputSchema: {
            type: 'object',
            properties: {
              selector: {
                type: 'string',
                description: 'CSS selector for element',
              },
            },
            required: ['selector'],
          },
        },
        {
          name: 'evaluate',
          description: 'Execute JavaScript in the browser',
          inputSchema: {
            type: 'object',
            properties: {
              script: {
                type: 'string',
                description: 'JavaScript code to execute',
              },
            },
            required: ['script'],
          },
        },
        {
          name: 'close_browser',
          description: 'Close the browser instance',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    }));

    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'launch_browser':
            return await this.launchBrowser(args);
          case 'navigate':
            return await this.navigate(args);
          case 'screenshot':
            return await this.screenshot(args);
          case 'click':
            return await this.click(args);
          case 'type':
            return await this.type(args);
          case 'wait_for_selector':
            return await this.waitForSelector(args);
          case 'get_text':
            return await this.getText(args);
          case 'evaluate':
            return await this.evaluate(args);
          case 'close_browser':
            return await this.closeBrowser();
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  async launchBrowser(args = {}) {
    const { headless = true, viewport = { width: 1280, height: 720 } } = args;

    this.browser = await puppeteer.launch({
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport(viewport);

    return {
      content: [
        {
          type: 'text',
          text: `Browser launched successfully. Headless: ${headless}, Viewport: ${viewport.width}x${viewport.height}`,
        },
      ],
    };
  }

  async navigate(args) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch_browser first.');
    }

    const { url } = args;
    await this.page.goto(url, { waitUntil: 'networkidle2' });

    return {
      content: [
        {
          type: 'text',
          text: `Navigated to: ${url}`,
        },
      ],
    };
  }

  async screenshot(args = {}) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch_browser first.');
    }

    const { path, fullPage = false } = args;
    const screenshotPath = path || `/tmp/screenshot-${Date.now()}.png`;

    await this.page.screenshot({ path: screenshotPath, fullPage });

    return {
      content: [
        {
          type: 'text',
          text: `Screenshot saved to: ${screenshotPath}`,
        },
      ],
    };
  }

  async click(args) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch_browser first.');
    }

    const { selector } = args;
    await this.page.click(selector);

    return {
      content: [
        {
          type: 'text',
          text: `Clicked element: ${selector}`,
        },
      ],
    };
  }

  async type(args) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch_browser first.');
    }

    const { selector, text } = args;
    await this.page.type(selector, text);

    return {
      content: [
        {
          type: 'text',
          text: `Typed "${text}" into element: ${selector}`,
        },
      ],
    };
  }

  async waitForSelector(args) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch_browser first.');
    }

    const { selector, timeout = 30000 } = args;
    await this.page.waitForSelector(selector, { timeout });

    return {
      content: [
        {
          type: 'text',
          text: `Element found: ${selector}`,
        },
      ],
    };
  }

  async getText(args) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch_browser first.');
    }

    const { selector } = args;
    const text = await this.page.$eval(selector, (el) => el.textContent);

    return {
      content: [
        {
          type: 'text',
          text: `Text from ${selector}: ${text}`,
        },
      ],
    };
  }

  async evaluate(args) {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch_browser first.');
    }

    const { script } = args;
    const result = await this.page.evaluate(script);

    return {
      content: [
        {
          type: 'text',
          text: `Script result: ${JSON.stringify(result)}`,
        },
      ],
    };
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }

    return {
      content: [
        {
          type: 'text',
          text: 'Browser closed successfully',
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Puppeteer MCP server running on stdio');
  }
}

const server = new PuppeteerMCPServer();
server.run().catch(console.error);
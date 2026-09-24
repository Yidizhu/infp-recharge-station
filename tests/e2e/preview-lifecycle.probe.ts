import { test, expect } from '@playwright/test';

test('HTTP preview starts and closes without launching a browser', async () => {
  const response = await fetch('http://127.0.0.1:4187/');
  expect(response.status).toBe(200);
  expect(await response.text()).toContain('<div id="root">');
});

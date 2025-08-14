const { test, expect } = require('@playwright/test');

test.describe('Pedagogy MVP', () => {
  test('main page loads correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check title
    await expect(page).toHaveTitle(/Pedagogy Learning System/);
    
    // Check main header
    await expect(page.locator('h1')).toContainText('Pedagogy Learning System');
    
    // Check that all panels are present
    await expect(page.locator('.panel')).toHaveCount(4);
    
    // Check specific panel titles
    await expect(page.locator('.panel-title')).toContainText(['Claude\'s Knowledge', 'Your Knowledge', 'Learning Profile', 'Learning Activity']);
  });

  test('events API responds correctly', async ({ page }) => {
    const response = await page.request.get('/events');
    expect(response.status()).toBe(200);
    
    const events = await response.json();
    expect(Array.isArray(events)).toBe(true);
  });

  test('health check endpoint works', async ({ page }) => {
    const response = await page.request.get('/health');
    expect(response.status()).toBe(200);
    
    const health = await response.json();
    expect(health.status).toBe('ok');
    expect(health.timestamp).toBeDefined();
  });

  test('knowledge graph endpoints handle missing files gracefully', async ({ page }) => {
    // These should return 404 when no workspace is set up
    const claudeGraphResponse = await page.request.get('/kb/claude-graph');
    const userGraphResponse = await page.request.get('/kb/user-graph');
    const userProfileResponse = await page.request.get('/kb/user-profile');
    
    // Should handle missing files gracefully (404 is expected)
    expect([200, 404]).toContain(claudeGraphResponse.status());
    expect([200, 404]).toContain(userGraphResponse.status());
    expect([200, 404]).toContain(userProfileResponse.status());
  });

  test('event posting works correctly', async ({ page }) => {
    const testEvent = {
      session_id: 'test-session',
      event_type: 'TestEvent',
      timestamp: Date.now(),
      test_data: 'test_value'
    };

    const response = await page.request.post('/events', {
      data: testEvent
    });

    expect(response.status()).toBe(200);
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.session_id).toBe('test-session');
    expect(result.event_type).toBe('TestEvent');
  });

  test('sessions API works', async ({ page }) => {
    const response = await page.request.get('/sessions');
    expect(response.status()).toBe(200);
    
    const sessions = await response.json();
    expect(Array.isArray(sessions)).toBe(true);
  });
});
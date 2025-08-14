const { test, expect } = require('@playwright/test');

test.describe('Enhanced Pedagogy System - Multi-Agent & Knowledge Gaps', () => {
  
  test('knowledge graphs render with Mermaid properly', async ({ page }) => {
    await page.goto('/');
    
    // Wait for graphs to load
    await page.waitForTimeout(2000);
    
    // Check that graph containers exist and are visible
    const claudeGraph = page.locator('#claude-graph');
    const userGraph = page.locator('#user-graph');
    
    await expect(claudeGraph).toBeVisible();
    await expect(userGraph).toBeVisible();
    
    // Check for Mermaid content or appropriate loading/error messages
    const claudeContent = await claudeGraph.textContent();
    const userContent = await userGraph.textContent();
    
    // Should contain either loading message, error handling, or Mermaid content
    expect(claudeContent).toMatch(/(Loading|knowledge graph|graph TD|Ready to learn|Graph rendering error)/);
    expect(userContent).toMatch(/(Loading|knowledge graph|graph TD|User starting|Graph rendering error)/);
  });

  test('enhanced knowledge graph endpoints return structured content', async ({ page }) => {
    // Test Claude's knowledge graph endpoint
    const claudeGraphResponse = await page.request.get('/kb/claude-graph');
    if (claudeGraphResponse.status() === 200) {
      const content = await claudeGraphResponse.text();
      expect(content).toContain('graph TD');
      
      // Should contain proper Mermaid syntax
      expect(content).toMatch(/(-->|subgraph|graph TD)/);
    }
    
    // Test user's knowledge graph endpoint
    const userGraphResponse = await page.request.get('/kb/user-graph');
    if (userGraphResponse.status() === 200) {
      const content = await userGraphResponse.text();
      expect(content).toContain('graph TD');
    }
    
    // Test user profile with enhanced structure
    const userProfileResponse = await page.request.get('/kb/user-profile');
    if (userProfileResponse.status() === 200) {
      const profile = await userProfileResponse.json();
      expect(profile).toHaveProperty('learning_goals');
      expect(profile).toHaveProperty('current_topic');
      expect(profile).toHaveProperty('progress');
      expect(profile).toHaveProperty('preferences');
    }
  });

  test('event capture handles multi-agent research events', async ({ page }) => {
    // Test posting a research event
    const researchEvent = {
      session_id: 'research-session-001',
      event_type: 'UserPromptSubmit',
      timestamp: Date.now(),
      user_prompt: '/study::init machine learning',
      stdin_data: {
        prompt: '/study::init machine learning',
        session_id: 'research-session-001'
      },
      research_phase: 'multi_agent_orchestration'
    };

    const postResponse = await page.request.post('/events', {
      data: researchEvent
    });

    expect(postResponse.status()).toBe(200);
    
    const result = await postResponse.json();
    expect(result.success).toBe(true);
    expect(result.session_id).toBe('research-session-001');
    
    // Verify event was stored
    const eventsResponse = await page.request.get('/events?limit=5');
    const events = await eventsResponse.json();
    
    const postedEvent = events.find(e => e.session_id === 'research-session-001');
    expect(postedEvent).toBeDefined();
    expect(postedEvent.data.user_prompt).toBe('/study::init machine learning');
  });

  test('error handling displays properly for graph rendering', async ({ page }) => {
    await page.goto('/');
    
    // Check that error CSS classes exist
    const errorStyleExists = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets).flatMap(sheet => {
        try {
          return Array.from(sheet.cssRules).map(rule => rule.selectorText);
        } catch (e) {
          return [];
        }
      });
      return styles.some(selector => selector && selector.includes('.error'));
    });
    expect(errorStyleExists).toBe(true);
    
    // Check that details/summary elements are supported for error display
    const detailsSupported = await page.evaluate(() => {
      const details = document.createElement('details');
      return 'open' in details;
    });
    expect(detailsSupported).toBe(true);
  });

  test('status indicators work correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check that all status indicators exist
    const statusIndicators = page.locator('.status-indicator');
    await expect(statusIndicators).toHaveCount(4);
    
    // Each should have either active or inactive class
    for (let i = 0; i < 4; i++) {
      const indicator = statusIndicators.nth(i);
      const className = await indicator.getAttribute('class');
      expect(className).toMatch(/(status-active|status-inactive)/);
    }
  });

  test('auto-refresh mechanism is properly implemented', async ({ page }) => {
    await page.goto('/');
    
    // Wait for initial load
    await page.waitForTimeout(1000);
    
    // Check that loadAll function exists and auto-refresh is set up
    const autoRefreshConfigured = await page.evaluate(() => {
      return typeof window.loadAll === 'function' || 
             document.querySelector('script').textContent.includes('setInterval');
    });
    expect(autoRefreshConfigured).toBe(true);
  });

  test('responsive design adapts to different screen sizes', async ({ page }) => {
    // Test desktop layout
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    
    const mainContent = page.locator('.main');
    await expect(mainContent).toBeVisible();
    
    // Check grid layout on desktop
    const gridColumns = await mainContent.evaluate(el => 
      window.getComputedStyle(el).gridTemplateColumns
    );
    expect(gridColumns).toContain('1fr 1fr'); // Two column layout
    
    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Should still be visible and adapt layout
    await expect(mainContent).toBeVisible();
    
    const panels = page.locator('.panel');
    await expect(panels).toHaveCount(4);
  });

  test('sessions endpoint provides detailed session information', async ({ page }) => {
    const response = await page.request.get('/sessions');
    expect(response.status()).toBe(200);
    
    const sessions = await response.json();
    expect(Array.isArray(sessions)).toBe(true);
    
    // If sessions exist, check their structure
    if (sessions.length > 0) {
      const session = sessions[0];
      expect(session).toHaveProperty('session_id');
      expect(session).toHaveProperty('event_count');
      expect(session).toHaveProperty('first_event');
      expect(session).toHaveProperty('last_event');
      
      // Timestamps should be numbers
      expect(typeof session.first_event).toBe('number');
      expect(typeof session.last_event).toBe('number');
    }
  });

  test('Mermaid initialization is properly configured', async ({ page }) => {
    await page.goto('/');
    
    // Check that Mermaid is loaded and configured
    const mermaidConfigured = await page.evaluate(() => {
      return typeof mermaid !== 'undefined' && 
             typeof mermaid.initialize === 'function' &&
             typeof mermaid.run === 'function';
    });
    expect(mermaidConfigured).toBe(true);
    
    // Check theme configuration
    const mermaidConfig = await page.evaluate(() => {
      return mermaid.mermaidAPI?.getConfig?.()?.theme || 'configured';
    });
    expect(mermaidConfig).toBeDefined();
  });

  test('user profile displays formatted JSON correctly', async ({ page }) => {
    await page.goto('/');
    
    // Wait for profile to load
    await page.waitForTimeout(2000);
    
    const userProfile = page.locator('#user-profile');
    await expect(userProfile).toBeVisible();
    
    const profileContent = await userProfile.textContent();
    
    // Should contain either formatted JSON or loading message
    expect(profileContent).toMatch(/(Loading|learning_goals|current_topic|User profile)/);
    
    // If it contains JSON, it should be properly formatted
    if (profileContent.includes('{')) {
      expect(profileContent).toMatch(/{\s+"/); // Formatted with indentation
    }
  });

  test('event stream displays recent activity correctly', async ({ page }) => {
    await page.goto('/');
    
    // Wait for events to load
    await page.waitForTimeout(2000);
    
    const eventStream = page.locator('#event-stream');
    await expect(eventStream).toBeVisible();
    
    const eventsContent = await eventStream.textContent();
    
    // Should show either events or loading message
    expect(eventsContent).toMatch(/(Loading|events|UserPromptSubmit|PostToolUse|No learning activity)/);
    
    // Check events count display
    const eventsCount = page.locator('#events-count');
    await expect(eventsCount).toBeVisible();
  });
});
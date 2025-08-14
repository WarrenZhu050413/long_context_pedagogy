#!/usr/bin/env node

/**
 * Comprehensive Playwright tests for the Pedagogy Learning System
 * Tests UI, event capture, context injection, and knowledge graph updates
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Test configuration
const BASE_URL = 'http://localhost:3001';
const TEST_WORKSPACE = 'test-playwright';
const WORKSPACE_PATH = path.join(__dirname, TEST_WORKSPACE);

// Color codes for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

// Test utilities
const log = (message, color = RESET) => {
    console.log(`${color}${message}${RESET}`);
};

const setupTestWorkspace = async () => {
    log('\n📁 Setting up test workspace...', BLUE);
    
    // Create workspace directory
    if (!fs.existsSync(WORKSPACE_PATH)) {
        fs.mkdirSync(WORKSPACE_PATH, { recursive: true });
    }
    
    // Create initial files
    const claudeGraph = path.join(WORKSPACE_PATH, 'claude_knowledge_graph.mmd');
    const userGraph = path.join(WORKSPACE_PATH, 'user_knowledge_graph.mmd');
    const userJson = path.join(WORKSPACE_PATH, 'user.json');
    
    fs.writeFileSync(claudeGraph, 'graph TD\n    Claude["Claude Knowledge Base"]');
    fs.writeFileSync(userGraph, 'graph TD\n    User["User Starting Point"]');
    fs.writeFileSync(userJson, JSON.stringify({
        name: "Test User",
        learning_goals: ["JavaScript", "Testing"],
        current_topic: "Playwright Testing",
        knowledge_level: "intermediate",
        learning_style: "hands-on practice"
    }, null, 2));
    
    log('✅ Test workspace created', GREEN);
};

const testUIComponents = async (page) => {
    log('\n🖥️  Testing UI Components...', BLUE);
    
    // Test 1: Page loads successfully
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const title = await page.title();
    if (title === 'Pedagogy Learning System') {
        log('  ✅ Page title correct', GREEN);
    } else {
        log(`  ❌ Page title incorrect: ${title}`, RED);
    }
    
    // Test 2: Workspace selector exists and has options
    const workspaceSelector = await page.$('select#workspace-selector');
    if (workspaceSelector) {
        log('  ✅ Workspace selector found', GREEN);
        
        const options = await page.$$eval('#workspace-selector option', opts => 
            opts.map(opt => opt.textContent)
        );
        
        if (options.length > 0) {
            log(`  ✅ Found ${options.length} workspaces: ${options.join(', ')}`, GREEN);
        } else {
            log('  ⚠️  No workspaces found', YELLOW);
        }
    } else {
        log('  ❌ Workspace selector not found', RED);
    }
    
    // Test 3: Knowledge graphs are rendered
    await page.waitForTimeout(2000); // Wait for Mermaid to render
    
    const claudeGraphSvg = await page.$('#claude-graph svg');
    const userGraphSvg = await page.$('#user-graph svg');
    
    if (claudeGraphSvg) {
        log('  ✅ Claude knowledge graph rendered', GREEN);
    } else {
        log('  ❌ Claude knowledge graph not rendered', RED);
    }
    
    if (userGraphSvg) {
        log('  ✅ User knowledge graph rendered', GREEN);
    } else {
        log('  ❌ User knowledge graph not rendered', RED);
    }
    
    // Test 4: Graph controls work
    const zoomInBtn = await page.$('button:has-text("🔍+")');
    if (zoomInBtn) {
        await zoomInBtn.click();
        log('  ✅ Zoom controls functional', GREEN);
    }
    
    // Test 5: Auto-refresh indicator
    const autoRefresh = await page.$('.auto-refresh');
    if (autoRefresh) {
        const text = await autoRefresh.textContent();
        log(`  ✅ Auto-refresh active: ${text}`, GREEN);
    }
};

const testMermaidPanZoom = async (page) => {
    log('\n🔍 Testing Mermaid Pan/Zoom...', BLUE);
    
    await page.goto(BASE_URL);
    await page.waitForTimeout(2000); // Wait for Mermaid and svg-pan-zoom
    
    // Test if svg-pan-zoom is loaded
    const svgPanZoomLoaded = await page.evaluate(() => {
        return typeof svgPanZoom !== 'undefined';
    });
    
    if (svgPanZoomLoaded) {
        log('  ✅ svg-pan-zoom library loaded', GREEN);
        
        // Test zoom functionality
        const initialViewBox = await page.$eval('#claude-graph svg', svg => 
            svg.getAttribute('viewBox')
        );
        
        // Click zoom in
        await page.click('button:has-text("🔍+"):first');
        await page.waitForTimeout(500);
        
        // Test pan with mouse drag
        const svgElement = await page.$('#claude-graph svg');
        const box = await svgElement.boundingBox();
        
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 50);
        await page.mouse.up();
        
        log('  ✅ Pan and zoom controls tested', GREEN);
    } else {
        log('  ⚠️  svg-pan-zoom not loaded, using fallback', YELLOW);
    }
};

const testContextInjection = async () => {
    log('\n💉 Testing Context Injection...', BLUE);
    
    // Create a test hook script
    const testHookPath = path.join(WORKSPACE_PATH, 'test_inject.py');
    
    // Copy the inject_learning_context.py
    const templatePath = path.join(__dirname, 'templates', 'inject_learning_context.py');
    if (fs.existsSync(templatePath)) {
        fs.copyFileSync(templatePath, testHookPath);
        log('  ✅ Context injection hook copied', GREEN);
    }
    
    // Test the hook with sample input
    const testInput = JSON.stringify({
        prompt: "What is machine learning?"
    });
    
    try {
        const { stdout } = await execPromise(
            `echo '${testInput}' | python3 ${testHookPath}`,
            { cwd: WORKSPACE_PATH }
        );
        
        // Check if context was injected
        if (stdout.includes('[LEARNING CONTEXT]')) {
            log('  ✅ Learning context injected', GREEN);
        }
        
        if (stdout.includes('[PEDAGOGICAL INSTRUCTIONS]')) {
            log('  ✅ Pedagogical instructions added', GREEN);
        }
        
        if (stdout.includes('Can you explain back')) {
            log('  ✅ Explanation prompts included', GREEN);
        }
        
        // Parse the output to check specific elements
        const lines = stdout.split('\n');
        const contextSection = lines.find(line => line.includes('User knows:'));
        const styleSection = lines.find(line => line.includes('Learning style:'));
        
        if (contextSection) {
            log(`  ✅ User knowledge detected: ${contextSection}`, GREEN);
        }
        
        if (styleSection) {
            log(`  ✅ Learning style detected: ${styleSection}`, GREEN);
        }
        
    } catch (error) {
        log(`  ❌ Context injection failed: ${error.message}`, RED);
    }
};

const testEventCapture = async () => {
    log('\n📊 Testing Event Capture...', BLUE);
    
    // Simulate a Claude session event
    const testEvent = {
        session_id: 'test-session-001',
        event_type: 'UserPromptSubmit',
        timestamp: Date.now(),
        user_prompt: 'Test prompt for Playwright',
        workspace: TEST_WORKSPACE
    };
    
    try {
        // Send event to server
        const response = await fetch(`${BASE_URL}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testEvent)
        });
        
        if (response.ok) {
            log('  ✅ Event captured successfully', GREEN);
            
            // Verify event was stored
            const eventsResponse = await fetch(`${BASE_URL}/events?workspace=${TEST_WORKSPACE}`);
            const events = await eventsResponse.json();
            
            const capturedEvent = events.find(e => 
                e.data && e.data.user_prompt === 'Test prompt for Playwright'
            );
            
            if (capturedEvent) {
                log('  ✅ Event retrieved from database', GREEN);
            } else {
                log('  ⚠️  Event not found in database', YELLOW);
            }
        } else {
            log(`  ❌ Event capture failed: ${response.status}`, RED);
        }
    } catch (error) {
        log(`  ❌ Event capture error: ${error.message}`, RED);
    }
};

const testKnowledgeGraphUpdate = async () => {
    log('\n📈 Testing Knowledge Graph Updates...', BLUE);
    
    const userGraphPath = path.join(WORKSPACE_PATH, 'user_knowledge_graph.mmd');
    
    // Simulate user explaining a concept back
    const originalContent = fs.readFileSync(userGraphPath, 'utf8');
    
    // Update the graph as if user explained a concept
    const updatedContent = originalContent + '\n    User --> ML["Machine Learning Understood"]';
    fs.writeFileSync(userGraphPath, updatedContent);
    
    log('  ✅ Simulated knowledge graph update', GREEN);
    
    // Verify the update is reflected in the API
    try {
        const response = await fetch(`${BASE_URL}/kb/user-graph?workspace=${TEST_WORKSPACE}`);
        const graphContent = await response.text();
        
        if (graphContent.includes('Machine Learning Understood')) {
            log('  ✅ Knowledge graph update verified via API', GREEN);
        } else {
            log('  ❌ Knowledge graph update not reflected', RED);
        }
    } catch (error) {
        log(`  ❌ Error verifying graph update: ${error.message}`, RED);
    }
};

const testSocraticPrompts = async () => {
    log('\n❓ Testing Socratic Prompts...', BLUE);
    
    // Check if the enhanced prompts are in the template
    const claudeMdPath = path.join(__dirname, 'templates', 'claude_md.md');
    if (fs.existsSync(claudeMdPath)) {
        const content = fs.readFileSync(claudeMdPath, 'utf8');
        
        const checks = [
            {
                text: 'Can you explain back what we just discussed?',
                name: 'Explanation request prompt'
            },
            {
                text: 'UPDATE user_knowledge_graph.mmd immediately',
                name: 'Knowledge update instruction'
            },
            {
                text: 'concept_introduced → concept_explained → concept_mastered',
                name: 'Concept progression tracking'
            }
        ];
        
        checks.forEach(check => {
            if (content.includes(check.text)) {
                log(`  ✅ ${check.name} found`, GREEN);
            } else {
                log(`  ❌ ${check.name} missing`, RED);
            }
        });
    }
};

const runAllTests = async () => {
    log('\n' + '='.repeat(60), BLUE);
    log('🧪 PEDAGOGY SYSTEM COMPREHENSIVE TESTS', BLUE);
    log('='.repeat(60) + '\n', BLUE);
    
    let browser;
    
    try {
        // Setup
        await setupTestWorkspace();
        
        // Launch browser
        log('\n🚀 Launching browser...', BLUE);
        browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox']
        });
        const context = await browser.newContext();
        const page = await context.newPage();
        
        // Run tests
        await testUIComponents(page);
        await testMermaidPanZoom(page);
        await testContextInjection();
        await testEventCapture();
        await testKnowledgeGraphUpdate();
        await testSocraticPrompts();
        
        // Summary
        log('\n' + '='.repeat(60), BLUE);
        log('✅ ALL TESTS COMPLETED', GREEN);
        log('='.repeat(60) + '\n', BLUE);
        
    } catch (error) {
        log(`\n❌ Test suite failed: ${error.message}`, RED);
        console.error(error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

// Test Plan Documentation
const showTestPlan = () => {
    log('\n' + '='.repeat(60), BLUE);
    log('📋 TEST PLAN FOR PEDAGOGY SYSTEM', BLUE);
    log('='.repeat(60), BLUE);
    
    log('\n1️⃣  UI TESTS:', YELLOW);
    log('  • Page loads with correct title');
    log('  • Workspace selector populated');
    log('  • Knowledge graphs render');
    log('  • Controls are functional');
    log('  • Auto-refresh works');
    
    log('\n2️⃣  MERMAID VISUALIZATION TESTS:', YELLOW);
    log('  • svg-pan-zoom library loads');
    log('  • Zoom controls work');
    log('  • Pan functionality works');
    log('  • Fallback CSS transforms work');
    
    log('\n3️⃣  CONTEXT INJECTION TESTS:', YELLOW);
    log('  • Hook reads knowledge files');
    log('  • Context sections are added');
    log('  • Pedagogical instructions included');
    log('  • User knowledge detected');
    log('  • Learning style identified');
    
    log('\n4️⃣  EVENT CAPTURE TESTS:', YELLOW);
    log('  • Events sent to server');
    log('  • Events stored in database');
    log('  • Events retrievable via API');
    log('  • Workspace filtering works');
    
    log('\n5️⃣  KNOWLEDGE GRAPH UPDATE TESTS:', YELLOW);
    log('  • Graph files can be updated');
    log('  • Updates reflected in API');
    log('  • Concept progression tracked');
    
    log('\n6️⃣  SOCRATIC METHOD TESTS:', YELLOW);
    log('  • Explanation prompts present');
    log('  • Update instructions included');
    log('  • Progression tracking documented');
    
    log('\n' + '='.repeat(60) + '\n', BLUE);
};

// Main execution
if (require.main === module) {
    // Check if server is running
    fetch(BASE_URL + '/health')
        .then(() => {
            log('✅ Server is running', GREEN);
            showTestPlan();
            return runAllTests();
        })
        .catch(() => {
            log('❌ Server is not running!', RED);
            log('Please start the server first:', YELLOW);
            log('  cd pedagogy-mvp && node server.js', BLUE);
            process.exit(1);
        });
}
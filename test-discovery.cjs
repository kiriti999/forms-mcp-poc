#!/usr/bin/env node

// Simple test script to demonstrate the form discovery workflow
// This shows how the MCP tools would be used by a client

const { spawn } = require('child_process');
const readline = require('readline');

console.log('🔍 Testing Form Discovery Workflow');
console.log('=====================================\n');

// Simulate MCP tool calls
function simulateMCPCall(toolName, params = {}) {
  return new Promise((resolve, reject) => {
    const mcp = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: params
      }
    };

    mcp.stdin.write(JSON.stringify(request) + '\n');
    mcp.stdin.end();

    let output = '';
    mcp.stdout.on('data', (data) => {
      output += data.toString();
    });

    mcp.on('close', (code) => {
      try {
        // Parse the last line as JSON response
        const lines = output.trim().split('\n');
        const response = JSON.parse(lines[lines.length - 1]);
        resolve(response);
      } catch (error) {
        reject(error);
      }
    });

    mcp.on('error', reject);
  });
}

async function testDiscoveryWorkflow() {
  try {
    console.log('1. Starting form discovery...');
    const startResult = await simulateMCPCall('start_form_discovery');
    console.log('✅ Discovery started');
    console.log('📝 First question:', startResult.result?.content?.[0]?.text || 'No response');
    console.log();

    console.log('2. Answering: "I want to change my beneficiary"');
    const answer1 = await simulateMCPCall('answer_discovery_question', { 
      answer: 'I want to change my beneficiary' 
    });
    console.log('✅ Answer recorded');
    console.log('📝 Next question:', answer1.result?.content?.[0]?.text || 'No response');
    console.log();

    console.log('3. Answering: "Yes, I need to do this right away"');
    const answer2 = await simulateMCPCall('answer_discovery_question', { 
      answer: 'Yes, I need to do this right away' 
    });
    console.log('✅ Answer recorded');
    console.log('📝 Response:', answer2.result?.content?.[0]?.text || 'No response');
    console.log();

    console.log('4. Getting discovery results...');
    const results = await simulateMCPCall('get_discovery_results');
    console.log('✅ Discovery complete');
    console.log('🎯 Results:', results.result?.content?.[0]?.text || 'No results');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
testDiscoveryWorkflow();
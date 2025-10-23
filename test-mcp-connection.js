#!/usr/bin/env node

// Test script to verify MCP server functionality
const { spawn } = require('child_process');

console.log('🧪 Testing MCP Server Connection');
console.log('==================================\n');

function testMCPTool(toolName, params = {}) {
  return new Promise((resolve, reject) => {
    console.log(`📞 Calling tool: ${toolName}`);
    
    const server = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    // MCP protocol messages
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      }
    };

    const toolRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: params
      }
    };

    let output = '';
    let errorOutput = '';

    server.stdout.on('data', (data) => {
      output += data.toString();
    });

    server.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    server.on('close', (code) => {
      console.log(`📤 Server output:\n${output}`);
      if (errorOutput) {
        console.log(`❌ Server errors:\n${errorOutput}`);
      }
      console.log(`🔚 Server exited with code: ${code}\n`);
      resolve({ output, errorOutput, code });
    });

    server.on('error', (error) => {
      console.log(`❌ Server error: ${error.message}`);
      reject(error);
    });

    // Send initialization
    server.stdin.write(JSON.stringify(initRequest) + '\n');
    
    // Wait a bit then send tool call
    setTimeout(() => {
      server.stdin.write(JSON.stringify(toolRequest) + '\n');
      server.stdin.end();
    }, 100);
  });
}

async function runTests() {
  try {
    console.log('1️⃣ Testing list_forms tool...');
    await testMCPTool('list_forms');
    
    console.log('2️⃣ Testing start_form_discovery tool...');
    await testMCPTool('start_form_discovery');
    
    console.log('✅ All tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTests();
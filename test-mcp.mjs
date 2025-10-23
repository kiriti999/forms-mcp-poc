#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🧪 Testing MCP Server');
console.log('=====================\n');

function testMCPServer() {
  return new Promise((resolve, reject) => {
    const server = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    let output = '';
    let responses = [];

    server.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      
      // Try to parse each line as JSON
      const lines = text.split('\n').filter(line => line.trim());
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          responses.push(parsed);
          console.log('📨 Received:', JSON.stringify(parsed, null, 2));
        } catch (e) {
          // Not JSON, probably a log message
          console.log('📝 Log:', line);
        }
      }
    });

    server.stderr.on('data', (data) => {
      console.log('❌ Error:', data.toString());
    });

    // Send MCP initialization
    const initMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    };

    console.log('📤 Sending initialize...');
    server.stdin.write(JSON.stringify(initMessage) + '\n');

    // Wait for initialization, then list tools
    setTimeout(() => {
      const listToolsMessage = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list'
      };
      
      console.log('📤 Sending tools/list...');
      server.stdin.write(JSON.stringify(listToolsMessage) + '\n');
    }, 500);

    // Wait a bit more, then test start_form_discovery
    setTimeout(() => {
      const toolCallMessage = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'start_form_discovery',
          arguments: {}
        }
      };
      
      console.log('📤 Sending start_form_discovery...');
      server.stdin.write(JSON.stringify(toolCallMessage) + '\n');
    }, 1000);

    // Close after testing
    setTimeout(() => {
      server.stdin.end();
      resolve(responses);
    }, 2000);

    server.on('error', reject);
  });
}

async function runTest() {
  try {
    console.log('Starting MCP server test...\n');
    const responses = await testMCPServer();
    console.log('\n✅ Test completed!');
    console.log(`📊 Received ${responses.length} responses`);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTest();
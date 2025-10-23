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

    // Test 1: Test the enhanced "Find Insurance Forms" tool
    setTimeout(() => {
      const toolCallMessage = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'suggest_forms',
          arguments: {}
        }
      };
      
      console.log('📤 Testing "Find Insurance Forms" (suggest_forms)...');
      server.stdin.write(JSON.stringify(toolCallMessage) + '\n');
    }, 1000);

    // Test 2: Test the enhanced "Help with Insurance" tool
    setTimeout(() => {
      const toolCallMessage = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'analyze_intent',
          arguments: {
            user_input: "I need to change my beneficiary"
          }
        }
      };
      
      console.log('📤 Testing "Help with Insurance" (analyze_intent) with specific intent...');
      server.stdin.write(JSON.stringify(toolCallMessage) + '\n');
    }, 1500);

    // Test 3: Test answering a discovery question
    setTimeout(() => {
      const toolCallMessage = {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'answer_discovery_question',
          arguments: {
            answer: "Change beneficiary information"
          }
        }
      };
      
      console.log('📤 Testing "Continue Insurance Form Discovery" (answer_discovery_question)...');
      server.stdin.write(JSON.stringify(toolCallMessage) + '\n');
    }, 2000);

    // Test 4: Test getting a form PDF
    setTimeout(() => {
      const toolCallMessage = {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'get_form_pdf',
          arguments: {
            form_id: "beneficiary-change"
          }
        }
      };
      
      console.log('📤 Testing form PDF retrieval...');
      server.stdin.write(JSON.stringify(toolCallMessage) + '\n');
    }, 2500);

    // Close after all testing
    setTimeout(() => {
      server.stdin.end();
      resolve(responses);
    }, 3500);

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
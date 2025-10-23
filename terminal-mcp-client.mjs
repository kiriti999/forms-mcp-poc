#!/usr/bin/env node

import { spawn } from 'child_process';
import readline from 'readline';

console.log('🖥️  Terminal MCP Client');
console.log('======================\n');

const server = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd()
});

let messageId = 1;

server.stdout.on('data', (data) => {
  const text = data.toString();
  const lines = text.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      console.log('📨 Server Response:');
      console.log(JSON.stringify(parsed, null, 2));
      console.log('');
    } catch (e) {
      console.log('📝 Server Log:', line);
    }
  }
});

server.stderr.on('data', (data) => {
  console.log('❌ Server Error:', data.toString());
});

// Initialize the server
const initMessage = {
  jsonrpc: '2.0',
  id: messageId++,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'terminal-client',
      version: '1.0.0'
    }
  }
};

console.log('🚀 Initializing MCP server...');
server.stdin.write(JSON.stringify(initMessage) + '\n');

// Create readline interface for interactive input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n📋 Available commands:');
console.log('  list - List available tools');
console.log('  find - Find insurance forms (automatic discovery)');
console.log('  help <query> - Get help with insurance (e.g., "help I need to change my beneficiary")');
console.log('  answer <response> - Answer discovery question');
console.log('  pdf <form-id> - Get PDF for form');
console.log('  summary <form-id> - Get form summary');
console.log('  quit - Exit client');
console.log('');

function promptUser() {
  rl.question('mcp> ', (input) => {
    const [command, ...args] = input.trim().split(' ');
    
    switch (command) {
      case 'list':
        sendMessage('tools/list', {});
        break;
        
      case 'find':
        sendMessage('tools/call', {
          name: 'suggest_forms',
          arguments: {}
        });
        break;
        
      case 'help':
        if (args.length === 0) {
          console.log('Usage: help <your question>');
        } else {
          sendMessage('tools/call', {
            name: 'analyze_intent',
            arguments: {
              user_input: args.join(' ')
            }
          });
        }
        break;
        
      case 'answer':
        if (args.length === 0) {
          console.log('Usage: answer <your response>');
        } else {
          sendMessage('tools/call', {
            name: 'answer_discovery_question',
            arguments: {
              answer: args.join(' ')
            }
          });
        }
        break;
        
      case 'pdf':
        if (args.length === 0) {
          console.log('Usage: pdf <form-id>');
          console.log('Available form IDs: beneficiary-change, loan-form, reinstatement-application, surrender-form, non-forfeiture-option, annuity-contract-change, amendment-request');
        } else {
          sendMessage('tools/call', {
            name: 'get_form_pdf',
            arguments: {
              form_id: args[0]
            }
          });
        }
        break;
        
      case 'summary':
        if (args.length === 0) {
          console.log('Usage: summary <form-id>');
        } else {
          sendMessage('tools/call', {
            name: 'get_form_summary',
            arguments: {
              form_id: args[0]
            }
          });
        }
        break;
        
      case 'quit':
      case 'exit':
        console.log('👋 Goodbye!');
        server.stdin.end();
        rl.close();
        process.exit(0);
        break;
        
      default:
        console.log('Unknown command. Type "quit" to exit.');
    }
    
    setTimeout(promptUser, 100);
  });
}

function sendMessage(method, params) {
  const message = {
    jsonrpc: '2.0',
    id: messageId++,
    method: method,
    params: params
  };
  
  console.log('📤 Sending:', method);
  server.stdin.write(JSON.stringify(message) + '\n');
}

// Start prompting after initialization
setTimeout(() => {
  console.log('✅ Ready! Type commands or "quit" to exit.\n');
  promptUser();
}, 1000);

server.on('error', (error) => {
  console.error('❌ Server error:', error.message);
  process.exit(1);
});

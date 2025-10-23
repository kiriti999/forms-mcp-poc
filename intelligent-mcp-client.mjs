#!/usr/bin/env node

import { spawn } from 'child_process';
import readline from 'readline';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

console.log('🤖 Intelligent MCP Client with Claude');
console.log('====================================\n');

// Configuration
let ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL = 'claude-3-haiku-20240307';

// MCP Server connection
const server = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd()
});

let messageId = 1;
let availableTools = [];
let conversationHistory = [];

server.stdout.on('data', (data) => {
  const text = data.toString();
  const lines = text.split('\n').filter(line => line.trim());

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      console.log('📨 Server Response:', JSON.stringify(parsed, null, 2)); // Debug log
      handleServerResponse(parsed);
    } catch (e) {
      // Server log message
      console.log('📝 Server Log:', line);
    }
  }
});

server.stderr.on('data', (data) => {
  console.log('❌ Server Error:', data.toString());
});

function handleServerResponse(response) {
  if (response.method === 'tools/list' || (response.result && response.result.tools)) {
    availableTools = response.result.tools || response.result;
    console.log('✅ Connected to MCP server with', availableTools.length, 'tools available\n');
  } else if (response.result && response.result.content) {
    // Tool execution result - display all content
    console.log('📋 Result:');

    if (Array.isArray(response.result.content)) {
      response.result.content.forEach((item, index) => {
        if (item.type === 'text') {
          console.log(item.text);
        } else if (item.type === 'resource') {
          console.log(`📄 Resource: ${item.resource?.uri || 'Unknown'}`);
          if (item.text) {
            console.log(item.text);
          }
        } else {
          console.log(`Content ${index + 1}:`, JSON.stringify(item, null, 2));
        }
      });
    } else {
      console.log(JSON.stringify(response.result.content, null, 2));
    }
    console.log('');
  }
}

// Initialize the server
const initMessage = {
  jsonrpc: '2.0',
  id: messageId++,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'intelligent-client',
      version: '1.0.0'
    }
  }
};

server.stdin.write(JSON.stringify(initMessage) + '\n');

// Get available tools
setTimeout(() => {
  const listToolsMessage = {
    jsonrpc: '2.0',
    id: messageId++,
    method: 'tools/list'
  };
  server.stdin.write(JSON.stringify(listToolsMessage) + '\n');
}, 500);

// Claude API integration
async function callClaude(userMessage) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not provided');
  }

  const systemPrompt = `You are an intelligent MCP client for an Insurance Forms system. Your job is to:

1. Understand user queries about insurance forms and needs
2. Decide which MCP tool to call based on the query
3. Return a JSON response with the tool to call and its arguments

Available MCP tools:
${availableTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

Tool details:
- suggest_forms: Use when user wants to find forms or start discovery (requires user_input argument with what the user wants to do)
- analyze_intent: Use when user has a specific insurance question/need (requires user_input argument)
- answer_discovery_question: Use when user is answering a discovery question (requires answer argument)
- get_form_pdf: Use when user wants a specific form PDF (requires form_id argument)
- get_form_summary: Use when user wants form details (requires form_id argument)

Available form IDs: beneficiary-change, loan-form, reinstatement-application, surrender-form, non-forfeiture-option, annuity-contract-change, amendment-request

Respond with JSON in this format:
{
  "tool": "tool_name",
  "arguments": {...},
  "explanation": "Brief explanation of what you're doing"
}

If the user just wants to chat or the query is unclear, respond with:
{
  "tool": null,
  "response": "Your conversational response",
  "explanation": "Why no tool was called"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1000,
        messages: [
          ...conversationHistory,
          {
            role: 'user',
            content: userMessage
          }
        ],
        system: systemPrompt
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const claudeResponse = data.content[0].text;

    // Add to conversation history
    conversationHistory.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: claudeResponse }
    );

    // Keep conversation history manageable
    if (conversationHistory.length > 10) {
      conversationHistory = conversationHistory.slice(-8);
    }

    return JSON.parse(claudeResponse);
  } catch (error) {
    console.error('❌ Claude API Error:', error.message);
    return {
      tool: null,
      response: "I'm having trouble processing your request. Please try again or use direct commands.",
      explanation: "API error occurred"
    };
  }
}

function sendMCPMessage(method, params) {
  const message = {
    jsonrpc: '2.0',
    id: messageId++,
    method: method,
    params: params
  };

  console.log('📤 Sending to MCP server:', JSON.stringify(message, null, 2)); // Debug log
  server.stdin.write(JSON.stringify(message) + '\n');
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function promptUser() {
  rl.question('💬 You: ', async (input) => {
    const trimmedInput = input.trim();

    if (trimmedInput === 'quit' || trimmedInput === 'exit') {
      console.log('👋 Goodbye!');
      server.stdin.end();
      rl.close();
      process.exit(0);
      return;
    }

    if (trimmedInput === 'help') {
      console.log('\n📖 Help:');
      console.log('- Just type your insurance questions in natural language');
      console.log('- Examples: "I need to change my beneficiary", "Find forms for policy loans"');
      console.log('- Type "quit" to exit\n');
      promptUser();
      return;
    }

    if (trimmedInput.startsWith('setkey ')) {
      ANTHROPIC_API_KEY = trimmedInput.substring(7);
      console.log('✅ API key updated\n');
      promptUser();
      return;
    }

    if (!ANTHROPIC_API_KEY) {
      console.log('❌ Please set your Anthropic API key first:');
      console.log('   setkey your_api_key_here\n');
      promptUser();
      return;
    }

    try {
      console.log('🤔 Thinking...');
      const claudeDecision = await callClaude(trimmedInput);

      console.log('💭', claudeDecision.explanation);

      if (claudeDecision.tool) {
        console.log('🔧 Calling tool:', claudeDecision.tool);
        sendMCPMessage('tools/call', {
          name: claudeDecision.tool,
          arguments: claudeDecision.arguments || {}
        });
      } else if (claudeDecision.response) {
        console.log('🤖 Claude:', claudeDecision.response);
      }

    } catch (error) {
      console.error('❌ Error:', error.message);
    }

    console.log('');
    setTimeout(promptUser, 100);
  });
}

// Start the client
setTimeout(() => {
  console.log('🚀 Intelligent MCP Client Ready!');
  console.log('');

  if (!ANTHROPIC_API_KEY) {
    console.log('⚠️  Please set your Anthropic API key:');
    console.log('   setkey your_api_key_here');
    console.log('');
  }

  console.log('💡 Tips:');
  console.log('- Ask questions in natural language: "I need to change my beneficiary"');
  console.log('- Type "help" for more information');
  console.log('- Type "quit" to exit');
  console.log('');

  promptUser();
}, 1500);

server.on('error', (error) => {
  console.error('❌ Server error:', error.message);
  process.exit(1);
});
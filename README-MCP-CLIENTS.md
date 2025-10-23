# MCP Client Options for Insurance Forms Server

This document explains how to use different MCP clients to test and interact with the Insurance Forms MCP Server.

## Option 1: Custom Test Script (Recommended for Testing)

The project includes an enhanced test script that demonstrates all the automatic form discovery features:

```bash
node test-mcp.mjs
```

This script will:
- Initialize the MCP server
- Test the "Find Insurance Forms" tool (automatic discovery)
- Test the "Help with Insurance" tool with specific intent
- Test the form discovery conversation flow
- Test PDF form retrieval

## Option 2: VS Code MCP Extension

### Setup Instructions:

1. **Install the MCP Extension for VS Code**
   - Search for "MCP" in the VS Code extensions marketplace
   - Install the official MCP extension

2. **Configure the Extension**
   - Copy the provided `vscode-mcp-config.json` to your VS Code settings
   - Or manually add this configuration to your VS Code settings:

```json
{
  "mcp.servers": {
    "insurance-forms": {
      "command": "node",
      "args": ["build/index.js"],
      "cwd": "/Users/arjun/eForm-finder-mcp",
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

3. **Start Using**
   - Open the MCP panel in VS Code
   - Connect to the "insurance-forms" server
   - Use the available tools through the VS Code interface

## Option 3: Terminal-Based MCP Client

You can also interact with the server directly through the terminal using JSON-RPC messages:

### Manual Testing:

1. **Start the server:**
```bash
node build/index.js
```

2. **Send JSON-RPC messages via stdin:**

Initialize:
```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"terminal-client","version":"1.0.0"}}}
```

List tools:
```json
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
```

Test automatic form discovery:
```json
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"suggest_forms","arguments":{}}}
```

Test intent analysis:
```json
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"analyze_intent","arguments":{"user_input":"I need to change my beneficiary"}}}
```

## Available Tools

The server provides these enhanced tools with automatic discovery:

1. **Find Insurance Forms** (`suggest_forms`)
   - Automatically starts form discovery
   - No parameters needed
   - Provides conversational guidance

2. **Help with Insurance** (`analyze_intent`)
   - Analyzes user intent and provides targeted help
   - Parameter: `user_input` (string)
   - Automatically suggests relevant forms

3. **Continue Insurance Form Discovery** (`answer_discovery_question`)
   - Processes answers during the discovery conversation
   - Parameter: `answer` (string)
   - Guides to next question or final recommendation

4. **Get Form PDF** (`get_form_pdf`)
   - Retrieves PDF forms with localhost URLs
   - Parameter: `form_id` (enum of available forms)
   - Returns direct download links

5. **Get Form Summary** (`get_form_summary`)
   - Provides detailed form information
   - Parameter: `form_id` (enum of available forms)

## Key Features

- **Automatic Discovery**: Tools now automatically trigger form discovery without explicit calls
- **Conversational Flow**: Natural question-and-answer process to find the right forms
- **PDF Access**: Direct localhost URLs for immediate form access
- **Intent Analysis**: Smart analysis of user needs to suggest relevant forms
- **No Explicit Tool Calls**: Users can interact naturally without knowing tool names

## Testing the Enhanced Features

The enhanced test script (`test-mcp.mjs`) demonstrates:
- Automatic form discovery initiation
- Intent-based form suggestions
- Conversational discovery flow
- PDF retrieval with localhost URLs

Run it to see all features in action!
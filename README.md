# Insurance Forms MCP Server

A Model Context Protocol (MCP) server that provides access to various insurance forms with intelligent form selection and schema-based data collection capabilities.

## Features

- **7 Insurance Form Types**: Comprehensive coverage of common insurance forms
- **Schema-First Approach**: Get JSON schemas for forms to understand required fields
- **Intelligent Form Selection**: AI-powered form suggestions based on user input
- **Data Validation**: Robust validation of form inputs
- **MCP Compliant**: Follows official MCP specification without custom elicitation

## Available Forms

1. **beneficiary-change** - Beneficiary Change Request
2. **claim-form** - Insurance Claim Form  
3. **policy-update** - Policy Information Update
4. **address-change** - Address Change Request
5. **loan-request** - Policy Loan Request
6. **surrender-form** - Policy Surrender Form
7. **reinstatement** - Policy Reinstatement Request

## Installation

```bash
npm install
npm run build
```

## Usage

The server provides several tools for intelligent form selection and management:

### 1. `list_forms`
Lists all available insurance forms with descriptions and PDF paths.

```json
{
  "name": "list_forms",
  "arguments": {}
}
```

### 2. `get_form_schema`
Retrieves the JSON schema for a specific form to understand required fields.

```json
{
  "name": "get_form_schema", 
  "arguments": {
    "form_id": "beneficiary-change"
  }
}
```

### 3. `suggest_forms`
Intelligently suggests relevant forms based on user input.

```json
{
  "name": "suggest_forms",
  "arguments": {
    "user_input": "I need to change my beneficiary"
  }
}
```

### 4. `analyze_intent`
Analyzes user input to determine the most appropriate form and provides detailed recommendations.

```json
{
  "name": "analyze_intent",
  "arguments": {
    "user_input": "I want to take a loan against my policy"
  }
}
```

### 5. `get_form_pdf`
Retrieves the actual PDF form file from the forms folder.

```json
{
  "name": "get_form_pdf",
  "arguments": {
    "form_id": "beneficiary-change"
  }
}
```

## Example Workflow

1. **Get Form Suggestions**
   ```bash
   # Get intelligent form suggestions based on user input
   suggest_forms --user_input "I need to change my beneficiary"
   ```

2. **Analyze User Intent**
   ```bash
   # Get detailed analysis and form recommendations
   analyze_intent --user_input "I want to take a loan against my policy"
   ```

3. **Get Form Schema**
   ```bash
   # Get schema for the recommended form
   get_form_schema --form_id beneficiary-change
   ```

4. **Retrieve Form PDF**
   ```bash
   # Get the actual PDF form file
   get_form_pdf --form_id beneficiary-change
   ```

## Form Validation

Each form has specific validation rules:
- **Required fields** must be provided
- **String fields** have minimum/maximum length requirements
- **Email fields** must be valid email addresses
- **Phone numbers** must follow standard formats
- **Dates** must be in YYYY-MM-DD format
- **SSN** must follow XXX-XX-XXXX format

## Intelligent Form Selection

The server includes advanced form selection capabilities:
- **Context-aware suggestions**: Analyzes user input to suggest relevant forms
- **Confidence scoring**: Provides confidence levels for form recommendations
- **Keyword matching**: Matches user intent with form purposes
- **Fallback handling**: Provides alternatives when no perfect match is found

## Technical Details

- **Runtime**: Node.js with TypeScript
- **MCP SDK**: Uses official @modelcontextprotocol/sdk
- **Form Selection**: AI-powered intelligent form matching
- **Architecture**: Schema-first approach following MCP best practices

## Error Handling

The server provides detailed error messages for:
- Invalid form IDs
- Missing required fields
- Invalid data formats
- Form selection failures

## Development

```bash
# Build the project
npm run build

# Run tests
node test-schema-approach.js

# Start the server
npm start
```

## Architecture

The server follows MCP best practices:
- **No Custom Elicitation**: Uses schema-first approach instead of managing user interaction
- **Stateless Design**: Each request is independent with no session management
- **Standard MCP Tools**: Provides tools that return data or resources
- **Client Responsibility**: Lets MCP clients handle user interaction and data collection

This approach aligns with the official MCP specification where the server provides schemas and the client handles user interaction.
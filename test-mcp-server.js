#!/usr/bin/env node

// Test script to simulate MCP server tool calls
import { spawn } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

console.log('🧪 Testing MCP Server Tools\n');

// Test the suggest_forms tool
const testSuggestForms = async () => {
    console.log('Testing suggest_forms tool...');
    
    const testInput = {
        method: 'tools/call',
        params: {
            name: 'suggest_forms',
            arguments: {
                user_input: 'I want to change my beneficiary',
                max_suggestions: 2
            }
        }
    };
    
    console.log('Input:', JSON.stringify(testInput, null, 2));
    console.log('Expected: Should return beneficiary-change form as top suggestion\n');
};

// Test the analyze_intent tool
const testAnalyzeIntent = async () => {
    console.log('Testing analyze_intent tool...');
    
    const testInput = {
        method: 'tools/call',
        params: {
            name: 'analyze_intent',
            arguments: {
                user_input: 'I need a loan against my policy for medical expenses'
            }
        }
    };
    
    console.log('Input:', JSON.stringify(testInput, null, 2));
    console.log('Expected: Should identify loan-form as best match with high confidence\n');
};

// Test the get_form_pdf tool
const testGetFormPdf = async () => {
    console.log('Testing get_form_pdf tool...');
    
    const testInput = {
        method: 'tools/call',
        params: {
            name: 'get_form_pdf',
            arguments: {
                form_id: 'beneficiary-change'
            }
        }
    };
    
    console.log('Input:', JSON.stringify(testInput, null, 2));
    console.log('Expected: Should return the actual PDF file from forms folder\n');
};

// Test list_forms tool
const testListForms = async () => {
    console.log('Testing list_forms tool...');
    
    const testInput = {
        method: 'tools/call',
        params: {
            name: 'list_forms',
            arguments: {}
        }
    };
    
    console.log('Input:', JSON.stringify(testInput, null, 2));
    console.log('Expected: Should list all forms with PDF paths\n');
};

// Run all tests
const runTests = async () => {
    console.log('='.repeat(60));
    console.log('MCP SERVER TOOL TESTING');
    console.log('='.repeat(60));
    console.log();
    
    await testSuggestForms();
    await testAnalyzeIntent();
    await testGetFormPdf();
    await testListForms();
    
    console.log('='.repeat(60));
    console.log('To test these tools with the actual MCP server:');
    console.log('1. Start the server: node build/index.js');
    console.log('2. Send JSON-RPC requests via stdin');
    console.log('3. Or integrate with an MCP client');
    console.log('='.repeat(60));
};

runTests().catch(console.error);
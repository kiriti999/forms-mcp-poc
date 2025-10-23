#!/usr/bin/env node

// Test script for dynamic form selection functionality
import { getFormSuggestions, selectBestForm, analyzeUserIntent } from './build/form-templates.js';

console.log('🧪 Testing Dynamic Form Selection\n');

// Test cases with different user inputs
const testCases = [
    "I want to change my beneficiary",
    "I need a loan against my policy", 
    "My policy lapsed and I want to reinstate it",
    "I want to surrender my policy for cash",
    "I need to change my annuity contract",
    "I want to add a rider to my policy",
    "I need to modify my non-forfeiture option",
    "Can I borrow money from my life insurance?",
    "How do I update who gets my insurance money?",
    "My insurance stopped and I want it back"
];

console.log('Testing form suggestions for various user inputs:\n');

testCases.forEach((userInput, index) => {
    console.log(`${index + 1}. User Input: "${userInput}"`);
    
    // Get suggestions
    const suggestions = getFormSuggestions(userInput, 2);
    
    if (suggestions.length > 0) {
        console.log(`   Best Match: ${suggestions[0].title} (${suggestions[0].formId})`);
        console.log(`   Confidence: ${(suggestions[0].confidence * 100).toFixed(1)}%`);
        console.log(`   Keywords: ${suggestions[0].matchedKeywords.join(', ')}`);
        
        if (suggestions.length > 1) {
            console.log(`   Alternative: ${suggestions[1].title} (${(suggestions[1].confidence * 100).toFixed(1)}%)`);
        }
    } else {
        console.log('   No matches found');
    }
    
    console.log('');
});

// Test intent analysis
console.log('\n🔍 Testing Intent Analysis:\n');

const intentTestCases = [
    "I want to change my beneficiary to my daughter",
    "Need a policy loan for home improvements",
    "Policy lapsed due to financial hardship, want to reinstate"
];

intentTestCases.forEach((userInput, index) => {
    console.log(`${index + 1}. Analyzing: "${userInput}"`);
    
    const context = { userInput };
    const analysis = analyzeUserIntent(context);
    const bestForm = selectBestForm(context);
    
    if (bestForm) {
        console.log(`   Intent: ${bestForm.title}`);
        console.log(`   Confidence: ${(bestForm.confidence * 100).toFixed(1)}%`);
        console.log(`   Form ID: ${bestForm.formId}`);
        console.log(`   PDF Path: ${bestForm.pdfPath}`);
    }
    
    console.log('');
});

console.log('✅ Dynamic form selection testing completed!');
#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { FORM_TEMPLATES, getFormTemplate, getAvailableForms, getFormSuggestions, selectBestForm, analyzeUserIntent } from './form-templates.js';
import { ElicitationEngine } from './elicitation-engine.js';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';
const server = new McpServer({
    name: 'insurance-forms-mcp',
    version: '1.0.0',
});
// Initialize elicitation engine
const elicitationEngine = new ElicitationEngine(FORM_TEMPLATES);
// HTTP server for serving PDF files
const HTTP_PORT = 3000;
let httpServer = null;
function createHttpServer() {
    return http.createServer((req, res) => {
        const parsedUrl = url.parse(req.url || '', true);
        const pathname = parsedUrl.pathname;
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        // Serve PDF files from /forms/:form_id
        if (pathname?.startsWith('/forms/') && pathname.endsWith('.pdf')) {
            const formId = pathname.replace('/forms/', '').replace('.pdf', '');
            const pdfPath = path.join(process.cwd(), 'src', 'forms', `${formId}.pdf`);
            if (fs.existsSync(pdfPath)) {
                const pdfBuffer = fs.readFileSync(pdfPath);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `inline; filename="${formId}.pdf"`);
                res.writeHead(200);
                res.end(pdfBuffer);
            }
            else {
                res.writeHead(404);
                res.end('PDF not found');
            }
            return;
        }
        // Health check endpoint
        if (pathname === '/health') {
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(200);
            res.end(JSON.stringify({ status: 'ok', port: HTTP_PORT }));
            return;
        }
        // Default 404
        res.writeHead(404);
        res.end('Not found');
    });
}
// Register list_forms tool
server.registerTool('list_forms', {
    title: 'List Forms',
    description: 'List all available insurance forms',
    inputSchema: {}
}, async () => {
    const forms = getAvailableForms().map(formId => {
        const template = getFormTemplate(formId);
        return {
            id: formId,
            title: template?.title || 'Unknown Form',
            description: template?.description || 'No description available',
            pdfPath: `./src/forms/${formId}.pdf`,
        };
    });
    return {
        content: [
            {
                type: 'text',
                text: `Available Insurance Forms:\n\n${forms
                    .map(form => `• ${form.id}: ${form.title}\n  ${form.description}\n  PDF: ${form.pdfPath}`)
                    .join('\n\n')}\n\nTo get intelligent form suggestions, use 'suggest_forms' with a description of what you need.`,
            },
        ],
    };
});
// Register suggest_forms tool
server.registerTool('suggest_forms', {
    title: 'Suggest Forms',
    description: 'Suggest the most appropriate forms based on user input or context',
    inputSchema: {
        user_input: z.string().describe('User description of what they want to do (e.g., "I want to change my beneficiary", "I need a loan against my policy")'),
        max_suggestions: z.number().default(3).describe('Maximum number of form suggestions to return (default: 3)'),
    }
}, async ({ user_input, max_suggestions }) => {
    const suggestions = getFormSuggestions(user_input, max_suggestions);
    if (suggestions.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: `No forms found matching your request: "${user_input}"\n\nPlease try rephrasing your request or use 'list_forms' to see all available forms.`,
                },
            ],
        };
    }
    const suggestionText = suggestions
        .map((suggestion, index) => `${index + 1}. ${suggestion.title} (${suggestion.formId})\n` +
        `   Confidence: ${(suggestion.confidence * 100).toFixed(1)}%\n` +
        `   Description: ${suggestion.description}\n` +
        `   Matched keywords: ${suggestion.matchedKeywords.join(', ')}\n` +
        `   PDF: ${suggestion.pdfPath}`)
        .join('\n\n');
    return {
        content: [
            {
                type: 'text',
                text: `Form suggestions for: "${user_input}"\n\n${suggestionText}\n\nUse 'get_form_schema' to see required fields or 'get_form_pdf' to retrieve the actual form.`,
            },
        ],
    };
});
// Register analyze_intent tool
server.registerTool('analyze_intent', {
    title: 'Analyze Intent',
    description: 'Analyze user input to understand their intent and provide detailed form recommendations',
    inputSchema: {
        user_input: z.string().describe('User description of what they want to do'),
    }
}, async ({ user_input }) => {
    const context = { userInput: user_input };
    const suggestions = analyzeUserIntent(context);
    const bestForm = selectBestForm(context);
    let analysisText = `Intent Analysis for: "${user_input}"\n\n`;
    if (bestForm) {
        analysisText += `Best Match: ${bestForm.title} (${bestForm.formId})\n`;
        analysisText += `Confidence: ${(bestForm.confidence * 100).toFixed(1)}%\n`;
        analysisText += `Matched Keywords: ${bestForm.matchedKeywords.join(', ')}\n\n`;
    }
    if (suggestions.length > 1) {
        analysisText += `Alternative Suggestions:\n`;
        suggestions.slice(1).forEach((suggestion, index) => {
            analysisText += `${index + 2}. ${suggestion.title} (${(suggestion.confidence * 100).toFixed(1)}%)\n`;
        });
    }
    return {
        content: [
            {
                type: 'text',
                text: analysisText,
            },
        ],
    };
});
// Register get_form_schema tool
server.registerTool('get_form_schema', {
    title: 'Get Form Schema',
    description: 'Get the JSON schema for a specific form to understand required fields',
    inputSchema: {
        form_id: z.enum(getAvailableForms()).describe('The ID of the form to get schema for'),
    }
}, async ({ form_id }) => {
    const template = getFormTemplate(form_id);
    if (!template) {
        throw new Error(`Form template not found: ${form_id}`);
    }
    return {
        content: [
            {
                type: 'text',
                text: `Schema for ${template.title}:\n\n${JSON.stringify(template.elicitationSchema, null, 2)}`,
            },
        ],
    };
});
// Register get_form_pdf tool
server.registerTool('get_form_pdf', {
    title: 'Get Form PDF',
    description: 'Get the actual PDF form file from the forms folder with a localhost URL for easy access',
    inputSchema: {
        form_id: z.enum(getAvailableForms()).describe('The ID of the form to retrieve'),
    }
}, async ({ form_id }) => {
    // Log the request details
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] get_form_pdf called with form_id: "${form_id}"`);
    const template = getFormTemplate(form_id);
    if (!template) {
        console.error(`[${timestamp}] ERROR: Form template not found for form_id: "${form_id}"`);
        throw new Error(`Form template not found: ${form_id}`);
    }
    // Use __dirname to get the directory of the current script, then navigate to src/forms
    const scriptDir = path.dirname(new URL(import.meta.url).pathname);
    const projectRoot = path.resolve(scriptDir, '..');
    const pdfPath = path.join(projectRoot, 'src', 'forms', `${form_id}.pdf`);
    console.error(`[${timestamp}] Script directory: ${scriptDir}`);
    console.error(`[${timestamp}] Project root: ${projectRoot}`);
    console.error(`[${timestamp}] Looking for PDF at path: ${pdfPath}`);
    if (!fs.existsSync(pdfPath)) {
        console.error(`[${timestamp}] ERROR: PDF file not found at path: ${pdfPath}`);
        throw new Error(`PDF file not found: ${pdfPath}`);
    }
    // Provide localhost URL for easy access
    const pdfUrl = `http://localhost:${HTTP_PORT}/forms/${form_id}.pdf`;
    console.error(`[${timestamp}] Generated PDF URL: ${pdfUrl}`);
    // Test if HTTP server is accessible
    try {
        const testResponse = await fetch(`http://localhost:${HTTP_PORT}/health`);
        console.error(`[${timestamp}] HTTP server health check: ${testResponse.status} ${testResponse.statusText}`);
    }
    catch (error) {
        console.error(`[${timestamp}] WARNING: HTTP server health check failed:`, error);
    }
    console.error(`[${timestamp}] Successfully returning PDF info for: ${template.title}`);
    return {
        content: [
            {
                type: 'text',
                text: `Retrieved PDF form: ${template.title}

📄 **${template.title}**
📝 Description: ${template.description}

🔗 **Access the PDF:**
• Direct link: ${pdfUrl}
• Click the link above to open the PDF in your browser
• The PDF will open in a new tab for easy viewing and downloading

💡 **Tips:**
• Right-click the link and select "Save As" to download
• The PDF opens inline in your browser for immediate viewing
• Use Ctrl+P (Cmd+P on Mac) to print the form

🔍 **Debug Info:**
• Request timestamp: ${timestamp}
• Form ID: ${form_id}
• PDF path verified: ✅
• HTTP server: Running on port ${HTTP_PORT}`,
            },
        ],
    };
});
// Elicitation Tools
server.registerTool('start_elicitation', {
    title: 'Start Elicitation',
    description: 'Start an interactive form completion session for a specific form',
    inputSchema: {
        form_id: z.enum(getAvailableForms()).describe('The ID of the form to start elicitation for'),
    }
}, async ({ form_id }) => {
    try {
        const result = elicitationEngine.startElicitation(form_id);
        if (!result.success) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error starting elicitation: ${result.error}`
                    }
                ]
            };
        }
        const currentQuestion = elicitationEngine.getCurrentQuestion();
        return {
            content: [
                {
                    type: 'text',
                    text: `Elicitation started for form: ${form_id}\n\nFirst question: ${currentQuestion?.question || 'No questions available'}\n${currentQuestion?.description ? `Description: ${currentQuestion.description}` : ''}\n${currentQuestion?.type === 'select' && currentQuestion.options ? `Options: ${currentQuestion.options.join(', ')}` : ''}`
                }
            ]
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
                }
            ]
        };
    }
});
server.registerTool('get_current_question', {
    title: 'Get Current Question',
    description: 'Get the current question in the elicitation session',
    inputSchema: {}
}, async () => {
    try {
        const question = elicitationEngine.getCurrentQuestion();
        if (!question) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'No active elicitation session or no current question available.'
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: `Current question: ${question.question}\n${question.description ? `Description: ${question.description}` : ''}\n${question.type === 'select' && question.options ? `Options: ${question.options.join(', ')}` : ''}\nRequired: ${question.required ? 'Yes' : 'No'}`
                }
            ]
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
                }
            ]
        };
    }
});
server.registerTool('answer_question', {
    title: 'Answer Question',
    description: 'Provide an answer to the current question in the elicitation session',
    inputSchema: {
        answer: z.string().describe('The answer to the current question'),
    }
}, async ({ answer }) => {
    try {
        const result = elicitationEngine.processAnswer(answer);
        if (!result.success) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Invalid answer: ${result.error}`
                    }
                ]
            };
        }
        if (result.completed) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Form completion finished! All questions have been answered. Use get_form_summary to see the completed form data.'
                    }
                ]
            };
        }
        const nextQuestion = elicitationEngine.getCurrentQuestion();
        return {
            content: [
                {
                    type: 'text',
                    text: `Answer accepted.\n\nNext question: ${nextQuestion?.question || 'No more questions'}\n${nextQuestion?.description ? `Description: ${nextQuestion.description}` : ''}\n${nextQuestion?.type === 'select' && nextQuestion.options ? `Options: ${nextQuestion.options.join(', ')}` : ''}`
                }
            ]
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
                }
            ]
        };
    }
});
server.registerTool('check_progress', {
    title: 'Check Progress',
    description: 'Check the progress of the current elicitation session',
    inputSchema: {}
}, async () => {
    try {
        const progress = elicitationEngine.getProgress();
        return {
            content: [
                {
                    type: 'text',
                    text: `Elicitation Progress:\n- Answered: ${progress.answered} questions\n- Remaining: ${progress.remaining} questions\n- Total: ${progress.total} questions\n- Completion: ${progress.percentage}%`
                }
            ]
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
                }
            ]
        };
    }
});
server.registerTool('reset_elicitation', {
    title: 'Reset Elicitation',
    description: 'Reset the current elicitation session',
    inputSchema: {}
}, async () => {
    try {
        elicitationEngine.resetElicitation();
        return {
            content: [
                {
                    type: 'text',
                    text: 'Elicitation session has been reset. Use start_elicitation to begin a new session.'
                }
            ]
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
                }
            ]
        };
    }
});
server.registerTool('get_form_summary', {
    title: 'Get Form Summary',
    description: 'Get a summary of the completed form data from the elicitation session',
    inputSchema: {}
}, async () => {
    try {
        const summary = elicitationEngine.getFormSummary();
        if (!summary) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'No completed form data available. Start an elicitation session and answer all questions first.'
                    }
                ]
            };
        }
        const formattedSummary = Object.entries(summary.answers)
            .map(([field, value]) => `${field}: ${value}`)
            .join('\n');
        return {
            content: [
                {
                    type: 'text',
                    text: `Form Summary for ${summary.formId}:\n\n${formattedSummary}\n\nForm Title: ${summary.formTitle}\nCompletion Status: ${summary.completed ? 'Complete' : 'Incomplete'}`
                }
            ]
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
                }
            ]
        };
    }
});
// Register prompt templates for common form-related workflows
// Form Discovery Workflow
server.registerPrompt('find-insurance-form', {
    title: 'Find Insurance Form',
    description: 'Guide through finding the right insurance form',
    argsSchema: {
        situation: z.string().describe('What you want to do'),
        policy_type: z.string().optional().describe('Policy type if known')
    }
}, async ({ situation, policy_type }) => {
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Help me find the right form for: ${situation}${policy_type ? ` (Policy: ${policy_type})` : ''}`
                }
            }
        ]
    };
});
// Form Completion Guidance
server.registerPrompt('complete-insurance-form', {
    title: 'Complete Insurance Form',
    description: 'Guide through completing a form',
    argsSchema: {
        form_id: z.enum(getAvailableForms()).describe('Form to complete'),
        questions: z.string().optional().describe('Specific questions')
    }
}, async ({ form_id, questions }) => {
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Help me complete the ${form_id} form${questions ? `. Questions: ${questions}` : ''}`
                }
            }
        ]
    };
});
// Form Troubleshooting
server.registerPrompt('troubleshoot-form-issue', {
    title: 'Troubleshoot Form Issue',
    description: 'Help resolve form problems',
    argsSchema: {
        issue: z.string().describe('What problem are you having'),
        form_id: z.enum(['unknown', ...getAvailableForms()]).optional().describe('Which form if applicable')
    }
}, async ({ issue, form_id }) => {
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Help me with this form issue: ${issue}${form_id && form_id !== 'unknown' ? ` (Form: ${form_id})` : ''}`
                }
            }
        ]
    };
});
async function main() {
    // Start HTTP server for PDF serving
    httpServer = createHttpServer();
    // Add error handling for HTTP server
    httpServer.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`Port ${HTTP_PORT} is already in use. PDF serving will be disabled.`);
            console.error('Note: get_form_pdf tool will still work but without localhost URLs.');
        }
        else {
            console.error('HTTP server error:', error);
        }
    });
    httpServer.listen(HTTP_PORT, () => {
        console.error(`HTTP server running on http://localhost:${HTTP_PORT}`);
        console.error('PDF files available at: http://localhost:' + HTTP_PORT + '/forms/{form-id}.pdf');
    });
    // Start MCP server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Insurance Forms MCP Server running on stdio');
}
main().catch((error) => {
    console.error('Fatal error in main():', error);
    if (httpServer) {
        httpServer.close();
    }
    process.exit(1);
});

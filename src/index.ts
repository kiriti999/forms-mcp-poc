#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  FORM_TEMPLATES,
  getFormTemplate,
  getAvailableForms,
  getFormSuggestions,
  selectBestForm,
  analyzeUserIntent,
  FormSelectionContext
} from './form-templates.js';
import { ElicitationEngine } from './elicitation-engine.js';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';

const server = new McpServer(
  {
    name: 'insurance-forms-mcp',
    version: '1.0.0',
  }
);

// Initialize elicitation engine
const elicitationEngine = new ElicitationEngine(FORM_TEMPLATES);

// HTTP server for serving PDF files
const HTTP_PORT = 3000;
let httpServer: http.Server | null = null;

function createHttpServer(): http.Server {
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
      } else {
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
server.registerTool(
  'list_forms',
  {
    title: 'List Forms',
    description: 'List all available insurance forms',
    inputSchema: {}
  },
  async () => {
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
  }
);

// Register suggest_forms tool
server.registerTool(
  'suggest_forms',
  {
    title: 'Suggest Forms',
    description: 'Suggest the most appropriate forms based on user input or context',
    inputSchema: {
      user_input: z.string().describe('User description of what they want to do (e.g., "I want to change my beneficiary", "I need a loan against my policy")'),
      max_suggestions: z.number().default(3).describe('Maximum number of form suggestions to return (default: 3)'),
    }
  },
  async ({ user_input, max_suggestions }) => {
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
      .map((suggestion, index) =>
        `${index + 1}. ${suggestion.title} (${suggestion.formId})\n` +
        `   Confidence: ${(suggestion.confidence * 100).toFixed(1)}%\n` +
        `   Description: ${suggestion.description}\n` +
        `   Matched keywords: ${suggestion.matchedKeywords.join(', ')}\n` +
        `   PDF: ${suggestion.pdfPath}`
      )
      .join('\n\n');

    return {
      content: [
        {
          type: 'text',
          text: `Form suggestions for: "${user_input}"\n\n${suggestionText}\n\nUse 'get_form_schema' to see required fields or 'get_form_pdf' to retrieve the actual form.`,
        },
      ],
    };
  }
);

// Register analyze_intent tool
server.registerTool(
  'analyze_intent',
  {
    title: 'Analyze Intent',
    description: 'Analyze user input to understand their intent and provide detailed form recommendations',
    inputSchema: {
      user_input: z.string().describe('User description of what they want to do'),
    }
  },
  async ({ user_input }) => {
    const context: FormSelectionContext = { userInput: user_input };
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
  }
);

// Register get_form_schema tool
server.registerTool(
  'get_form_schema',
  {
    title: 'Get Form Schema',
    description: 'Get the JSON schema for a specific form to understand required fields',
    inputSchema: {
      form_id: z.enum(getAvailableForms() as [string, ...string[]]).describe('The ID of the form to get schema for'),
    }
  },
  async ({ form_id }) => {
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
  }
);

// Register get_form_pdf tool
server.registerTool(
  'get_form_pdf',
  {
    title: 'Get Form PDF',
    description: 'Get the actual PDF form file from the forms folder with a localhost URL for easy access',
    inputSchema: {
      form_id: z.enum(getAvailableForms() as [string, ...string[]]).describe('The ID of the form to retrieve'),
    }
  },
  async ({ form_id }) => {
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
    } catch (error) {
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
  }
);

// Discovery-based Elicitation Tools
server.registerTool(
  'start_form_discovery',
  {
    title: 'Start Form Discovery',
    description: 'Start an interactive session to discover the right form based on user needs',
    inputSchema: {}
  },
  async () => {
    try {
      const result = elicitationEngine.startDiscovery();
      const currentQuestion = elicitationEngine.getCurrentQuestion();
      return {
        content: [
          {
            type: 'text',
            text: `Started form discovery session\n\nFirst question: ${currentQuestion?.question || 'No questions available'}\n${currentQuestion?.description ? `Description: ${currentQuestion.description}` : ''}\n${currentQuestion?.type === 'select' && currentQuestion.options ? `Options: ${currentQuestion.options.join(', ')}` : ''}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
          }
        ]
      };
    }
  }
);

server.registerTool(
  'get_discovery_question',
  {
    title: 'Get Discovery Question',
    description: 'Get the current question in the form discovery session',
    inputSchema: {}
  },
  async () => {
    try {
      const question = elicitationEngine.getCurrentQuestion();
      if (question) {
        return {
          content: [
            {
              type: 'text',
              text: `Current question: ${question.question}\n${question.description ? `Description: ${question.description}` : ''}\n${question.type === 'select' && question.options ? `Options: ${question.options.join(', ')}` : ''}`
            }
          ]
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: 'No active discovery session or session is complete'
            }
          ]
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
          }
        ]
      };
    }
  }
);

server.registerTool(
  'answer_discovery_question',
  {
    title: 'Answer Discovery Question',
    description: 'Provide an answer to the current discovery question',
    inputSchema: {
      answer: z.string().describe('The answer to the current discovery question'),
    }
  },
  async ({ answer }) => {
    try {
      const result = elicitationEngine.processAnswer(answer);
      
      if (result.completed) {
        const state = elicitationEngine.getDiscoveryState();
        const suggestedForms = state?.suggestedForms || [];
        const formsText = suggestedForms.length > 0 
          ? suggestedForms.map((formId, index) => {
              const template = getFormTemplate(formId);
              return `${index + 1}. ${template?.title || formId} (${formId})`;
            }).join('\n')
          : 'No specific forms recommended based on your answers.';
        
        return {
          content: [
            {
              type: 'text',
              text: `Discovery session completed!\n\nRecommended forms:\n${formsText}\n\nUse get_form_pdf to retrieve specific forms or get_form_schema to see required fields.`
            }
          ]
        };
      }

      const nextQuestion = elicitationEngine.getCurrentQuestion();
      return {
        content: [
          {
            type: 'text',
            text: `Answer recorded.\n\nNext question: ${nextQuestion?.question || 'No more questions'}\n${nextQuestion?.description ? `Description: ${nextQuestion.description}` : ''}\n${nextQuestion?.type === 'select' && nextQuestion.options ? `Options: ${nextQuestion.options.join(', ')}` : ''}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
          }
        ]
      };
    }
  }
);

server.registerTool(
  'get_discovery_results',
  {
    title: 'Get Discovery Results',
    description: 'Get the suggested forms from the discovery session',
    inputSchema: {}
  },
  async () => {
    try {
      const state = elicitationEngine.getDiscoveryState();
      
      if (!state) {
        return {
          content: [
            {
              type: 'text',
              text: 'No active discovery session'
            }
          ]
        };
      }
      
      if (!state.isComplete) {
        return {
          content: [
            {
              type: 'text',
              text: 'Discovery session is not complete yet. Continue answering questions to get form recommendations.'
            }
          ]
        };
      }

      const suggestedForms = state.suggestedForms || [];
      const formsText = suggestedForms.length > 0 
        ? suggestedForms.map((formId, index) => {
            const template = getFormTemplate(formId);
            return `${index + 1}. ${template?.title || formId} (${formId})\n   Description: ${template?.description || 'No description available'}`;
          }).join('\n\n')
        : 'No specific forms recommended based on your answers.';
      
      return {
        content: [
          {
            type: 'text',
            text: `Discovery Results:\n\n${formsText}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
          }
        ]
      };
    }
  }
);

server.registerTool(
  'reset_discovery',
  {
    title: 'Reset Discovery',
    description: 'Reset the current form discovery session',
    inputSchema: {}
  },
  async () => {
    try {
      elicitationEngine.resetDiscovery();
      return {
        content: [
          {
            type: 'text',
            text: 'Form discovery session has been reset. Use start_form_discovery to begin a new session.'
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
          }
        ]
      };
    }
  }
);

server.registerTool(
  'get_form_summary',
  {
    title: 'Get Form Summary',
    description: 'Get a summary of a specific form including its purpose and required fields',
    inputSchema: {
      form_id: z.enum(getAvailableForms() as [string, ...string[]]).describe('The ID of the form to get summary for'),
    }
  },
  async ({ form_id }) => {
    try {
      const template = getFormTemplate(form_id);
      if (!template) {
        return {
          content: [
            {
              type: 'text',
              text: `Form ${form_id} not found`
            }
          ]
        };
      }
      
      const summary = {
        id: template.id,
        title: template.title,
        description: template.description,
        requiredFields: template.elicitationSchema.required,
        totalFields: Object.keys(template.elicitationSchema.properties).length,
        keywords: template.keywords,
        scenarios: template.scenarios
      };
      
      return {
        content: [
          {
            type: 'text',
            text: `Form Summary for ${form_id}:\n\nTitle: ${summary.title}\nDescription: ${summary.description}\n\nRequired Fields (${summary.requiredFields.length}): ${summary.requiredFields.join(', ')}\nTotal Fields: ${summary.totalFields}\n\nKeywords: ${summary.keywords.join(', ')}\n\nCommon Scenarios:\n${summary.scenarios.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
          }
        ]
      };
    }
  }
);

// Register prompt templates for common form-related workflows

// Form Discovery Workflow
server.registerPrompt(
  'find-insurance-form',
  {
    title: 'Find Insurance Form',
    description: 'Guide through finding the right insurance form',
    argsSchema: {
      situation: z.string().describe('What you want to do'),
      policy_type: z.string().optional().describe('Policy type if known')
    }
  },
  async ({ situation, policy_type }) => {
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
  }
);

// Form Completion Guidance
server.registerPrompt(
  'complete-insurance-form',
  {
    title: 'Complete Insurance Form',
    description: 'Guide through completing a form',
    argsSchema: {
      form_id: z.enum(getAvailableForms() as [string, ...string[]]).describe('Form to complete'),
      questions: z.string().optional().describe('Specific questions')
    }
  },
  async ({ form_id, questions }) => {
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
  }
);

// Form Troubleshooting
server.registerPrompt(
  'troubleshoot-form-issue',
  {
    title: 'Troubleshoot Form Issue',
    description: 'Help resolve form problems',
    argsSchema: {
      issue: z.string().describe('What problem are you having'),
      form_id: z.enum(['unknown', ...getAvailableForms()] as [string, ...string[]]).optional().describe('Which form if applicable')
    }
  },
  async ({ issue, form_id }) => {
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
  }
);

async function main() {
    // Start HTTP server for PDF serving
    httpServer = createHttpServer();
    
    // Add error handling for HTTP server
    httpServer.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`Port ${HTTP_PORT} is already in use. PDF serving will be disabled.`);
            console.error('Note: get_form_pdf tool will still work but without localhost URLs.');
        } else {
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
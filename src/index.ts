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
import { fileURLToPath } from 'url';

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

    // Serve static files (PDFs and demo)
    if (pathname?.startsWith('/forms/')) {
      const filePath = path.join(process.cwd(), 'src', pathname);
      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath);
        res.writeHead(200);
        res.end(fileBuffer);
      }
    }

    // Serve demo files from root
    if (pathname && pathname !== '/') {
      const demoPath = path.join(process.cwd(), pathname);
      if (fs.existsSync(demoPath)) {
        const fileBuffer = fs.readFileSync(demoPath);
        if (pathname.endsWith('.html')) {
          res.setHeader('Content-Type', 'text/html');
        } else if (pathname.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
        } else if (pathname.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
        }
        res.writeHead(200);
        res.end(fileBuffer);
        return;
      }
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

// Register suggest_forms tool - now with automatic discovery
server.registerTool(
  'suggest_forms',
  {
    title: 'Find Insurance Forms',
    description: 'Automatically find and suggest the best insurance forms based on what the user wants to do. Use this when users mention insurance needs like changing beneficiaries, getting loans, surrendering policies, etc.',
    inputSchema: {
      user_input: z.string().describe('What the user wants to do with their insurance (e.g., "I want to change my beneficiary", "I need a loan", "help with my insurance policy")'),
      max_suggestions: z.number().default(3).describe('Maximum number of form suggestions to return (default: 3)'),
    }
  },
  async ({ user_input, max_suggestions }) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] suggest_forms called with user_input: "${user_input}", max_suggestions: ${max_suggestions}`);
    
    try {
      // First, start the discovery process automatically
      elicitationEngine.startDiscovery();
      
      // Get initial suggestions
      const suggestions = getFormSuggestions(user_input, max_suggestions);
      console.error(`[${timestamp}] Found ${suggestions.length} form suggestions`);
      
      // If we have high-confidence matches, return them directly
      const highConfidenceMatches = suggestions.filter(s => s.confidence > 0.7);
      
      if (highConfidenceMatches.length > 0) {
        return {
          content: [
            {
              type: 'text',
              text: `I found these forms that match what you're looking for:\n\n${highConfidenceMatches.map((form, index) => 
                `${index + 1}. **${form.title}**\n   📝 ${form.description}\n   🎯 Match: ${Math.round(form.confidence * 100)}%\n   📄 Form ID: ${form.formId}\n   🔗 Get PDF: Use the get_form_pdf tool with form_id "${form.formId}"`
              ).join('\n\n')}\n\n💡 **Need help choosing?** I can ask you a few questions to find the perfect form. Just let me know!`
            }
          ]
        };
      } else {
        // Start interactive discovery for unclear requests
        const firstQuestion = elicitationEngine.getCurrentQuestion();
        
        return {
          content: [
            {
              type: 'text',
              text: `I'd like to help you find the right insurance form! Let me ask you a few questions to make sure we get exactly what you need.\n\n**${firstQuestion?.question}**\n\n${firstQuestion?.options ? `Options: ${firstQuestion.options.join(', ')}` : ''}\n\nJust tell me your answer, and I'll guide you to the perfect form!`
            }
          ]
        };
      }
    } catch (error) {
      console.error(`[${timestamp}] ERROR in suggest_forms:`, error);
      throw error;
    }
  }
);

// Register analyze_intent tool - now with smart auto-discovery
server.registerTool(
  'analyze_intent',
  {
    title: 'Help with Insurance',
    description: 'Understand what the user wants to do with their insurance and automatically guide them to the right forms and next steps. Use this for any insurance-related questions or requests.',
    inputSchema: {
      user_input: z.string().describe('What the user is asking about or wants to do with their insurance'),
    }
  },
  async ({ user_input }) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] analyze_intent called with user_input: "${user_input}"`);
    
    try {
      // Automatically start discovery
      elicitationEngine.startDiscovery();
      
      const context: FormSelectionContext = { userInput: user_input };
      const suggestions = analyzeUserIntent(context);
      const bestForm = selectBestForm(context);
      console.error(`[${timestamp}] Intent analysis completed`);
      
      // Get form suggestions based on intent
      const formSuggestions = getFormSuggestions(user_input, 3);
      const topMatch = formSuggestions[0];
      
      if (topMatch && topMatch.confidence > 0.8) {
        // High confidence - provide direct recommendation
        return {
          content: [
            {
              type: 'text',
              text: `I understand you want to: **${user_input}**\n\n🎯 **Perfect Match Found!**\n\n**${topMatch.title}**\n📝 ${topMatch.description}\n🔗 Form ID: ${topMatch.formId}\n\n✅ **Next Steps:**\n1. Use the get_form_pdf tool with form_id "${topMatch.formId}" to get the PDF\n2. Or ask me "How do I fill out this form?" for guidance\n\n💡 **Confidence:** ${Math.round(topMatch.confidence * 100)}% match`
            }
          ]
        };
      } else if (formSuggestions.length > 0) {
        // Multiple options - start guided discovery
        const firstQuestion = elicitationEngine.getCurrentQuestion();
        
        return {
          content: [
            {
              type: 'text',
              text: `I understand you're looking for help with: **${user_input}**\n\nI found a few forms that might work, but let me ask you a question to find the perfect one:\n\n**${firstQuestion?.question}**\n\n${firstQuestion?.options ? `Options: ${firstQuestion.options.join(', ')}` : ''}\n\nJust tell me your answer!`
            }
          ]
        };
      } else {
        // No clear matches - start from beginning
        const firstQuestion = elicitationEngine.getCurrentQuestion();
        
        return {
          content: [
            {
              type: 'text',
              text: `I'd love to help you with your insurance needs! Let me ask you a few questions to find exactly what you're looking for.\n\n**${firstQuestion?.question}**\n\n${firstQuestion?.options ? `Options: ${firstQuestion.options.join(', ')}` : ''}`
            }
          ]
        };
      }
    } catch (error) {
      console.error(`[${timestamp}] ERROR in analyze_intent:`, error);
      throw error;
    }
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

    // Use fileURLToPath for cross-platform compatibility (works on Windows, macOS, and Linux)
    const scriptPath = fileURLToPath(import.meta.url);
    const scriptDir = path.dirname(scriptPath);
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
    title: 'Continue Insurance Form Discovery',
    description: 'Process user responses during form discovery to find the right insurance form. Use this when the user provides answers to questions about their insurance needs.',
    inputSchema: {
      answer: z.string().describe('The user\'s answer to the current discovery question'),
    }
  },
  async ({ answer }) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] answer_discovery_question called with answer: "${answer}"`);
    
    try {
      const result = elicitationEngine.processAnswer(answer);
      console.error(`[${timestamp}] Question answered, result:`, result);
      
      if (result.completed) {
        const state = elicitationEngine.getDiscoveryState();
        const suggestedForms = state?.suggestedForms || [];
        console.error(`[${timestamp}] Discovery complete, ${suggestedForms.length} suggestions found`);
        
        if (suggestedForms.length === 1) {
          // Perfect match found
          const formId = suggestedForms[0];
          const template = getFormTemplate(formId);
          return {
            content: [
              {
                type: 'text',
                text: `Perfect! Based on your answers, I found exactly what you need:\n\n🎯 **${template?.title || formId}**\n📝 ${template?.description || 'No description available'}\n\n✅ **Ready to proceed:**\n• Form ID: ${formId}\n• Use get_form_pdf with form_id "${formId}" to download the PDF\n• Need help filling it out? Just ask!\n\n🎉 **This form matches your needs perfectly!**`
              }
            ]
          };
        } else if (suggestedForms.length > 1) {
          // Multiple good options
          const formsText = suggestedForms.map((formId, index) => {
            const template = getFormTemplate(formId);
            return `${index + 1}. **${template?.title || formId}**\n   📝 ${template?.description || 'No description available'}\n   📄 Form ID: ${formId}\n   🔗 Get PDF: Use get_form_pdf with "${formId}"`;
          }).join('\n\n');
          
          return {
            content: [
              {
                type: 'text',
                text: `Great! Based on your answers, here are your best options:\n\n${formsText}\n\n💡 **Choose the one that fits best, or ask me for more details about any of these forms!**`
              }
            ]
          };
        } else {
          // No matches found
          return {
            content: [
              {
                type: 'text',
                text: `I've gathered your information, but I couldn't find a perfect match in our current forms. Let me show you all available forms so you can choose:\n\n📋 **Available Forms:**\n${getAvailableForms().map(id => {
                  const template = getFormTemplate(id);
                  return `• **${template?.title}** (${id}) - ${template?.description}`;
                }).join('\n')}\n\n💬 **Need help?** Tell me more about your specific situation and I can provide better guidance!`
              }
            ]
          };
        }
      } else {
        // Continue with next question
        const nextQuestion = elicitationEngine.getCurrentQuestion();
        if (nextQuestion) {
          return {
            content: [
              {
                type: 'text',
                text: `Thanks for that answer! Let me ask you one more question:\n\n**${nextQuestion.question}**\n\n${nextQuestion.options ? `Options: ${nextQuestion.options.join(', ')}` : ''}\n\n💭 Just tell me your answer and I'll find the perfect form for you!`
              }
            ]
          };
        } else {
          // Shouldn't happen, but handle gracefully
          return {
            content: [
              {
                type: 'text',
                text: `Thank you for your answer! Let me process this and find the best forms for you. Please use the get_discovery_results tool to see your recommendations.`
              }
            ]
          };
        }
      }
    } catch (error) {
      console.error(`[${timestamp}] ERROR in answer_discovery_question:`, error);
      return {
        content: [
          {
            type: 'text',
            text: `I encountered an error processing your answer. Please try again or use the reset_discovery tool to start over.`
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
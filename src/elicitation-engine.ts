export interface ElicitationQuestion {
  fieldName: string;
  question: string;
  description?: string;
  type: 'text' | 'date' | 'boolean' | 'select';
  required: boolean;
  options?: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    minimum?: number;
    maximum?: number;
  };
}

export interface FormTemplate {
  id: string;
  title: string;
  description: string;
  elicitationSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

export interface ElicitationState {
  formId: string;
  formTitle: string;
  currentQuestionIndex: number;
  answers: Record<string, string>;
  isComplete: boolean;
  questions: ElicitationQuestion[];
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  processedValue?: string;
}

export interface ProcessAnswerResult {
  success: boolean;
  error?: string;
  completed?: boolean;
}

export interface ProgressInfo {
  answered: number;
  remaining: number;
  total: number;
  percentage: number;
}

export interface FormSummary {
  formId: string;
  formTitle: string;
  answers: Record<string, string>;
  completed: boolean;
}

export class ElicitationEngine {
  private formTemplates: FormTemplate[];
  private currentState: ElicitationState | null = null;

  constructor(formTemplates: FormTemplate[]) {
    this.formTemplates = formTemplates;
  }

  private convertSchemaToQuestions(schema: any): ElicitationQuestion[] {
    const questions: ElicitationQuestion[] = [];
    const properties = schema.properties || {};
    const required = schema.required || [];

    for (const [fieldName, fieldSchema] of Object.entries(properties)) {
      const field = fieldSchema as any;
      let type: 'text' | 'date' | 'boolean' | 'select' = 'text';
      let options: string[] | undefined;

      if (field.type === 'boolean') {
        type = 'boolean';
      } else if (field.format === 'date') {
        type = 'date';
      } else if (field.enum && Array.isArray(field.enum)) {
        type = 'select';
        options = field.enum;
      }

      questions.push({
        fieldName,
        question: field.title || fieldName,
        description: field.description,
        type,
        required: required.includes(fieldName),
        options,
        validation: {
          minLength: field.minLength,
          maxLength: field.maxLength,
          minimum: field.minimum,
          maximum: field.maximum,
        }
      });
    }

    return questions;
  }

  startElicitation(formId: string): { success: boolean; error?: string } {
    const template = this.formTemplates.find(t => t.id === formId);
    if (!template) {
      return { success: false, error: `Form template not found: ${formId}` };
    }

    const questions = this.convertSchemaToQuestions(template.elicitationSchema);
    
    this.currentState = {
      formId: template.id,
      formTitle: template.title,
      currentQuestionIndex: 0,
      answers: {},
      isComplete: false,
      questions
    };

    return { success: true };
  }

  getCurrentQuestion(): ElicitationQuestion | null {
    if (!this.currentState || this.currentState.isComplete) {
      return null;
    }

    if (this.currentState.currentQuestionIndex >= this.currentState.questions.length) {
      this.currentState.isComplete = true;
      return null;
    }

    return this.currentState.questions[this.currentState.currentQuestionIndex];
  }

  processAnswer(answer: string): ProcessAnswerResult {
    if (!this.currentState) {
      return { success: false, error: 'No active elicitation session' };
    }

    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) {
      return { success: false, error: 'No current question or elicitation complete' };
    }

    const validation = this.validateAnswer(currentQuestion, answer);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Store the answer
    this.currentState.answers[currentQuestion.fieldName] = validation.processedValue || answer;
    
    // Move to next question
    this.currentState.currentQuestionIndex++;
    
    // Check if complete
    if (this.currentState.currentQuestionIndex >= this.currentState.questions.length) {
      this.currentState.isComplete = true;
      return { success: true, completed: true };
    }

    return { success: true, completed: false };
  }

  validateAnswer(question: ElicitationQuestion, answer: string): ValidationResult {
    // Check if required
    if (question.required && (!answer || answer.trim() === '')) {
      return { valid: false, error: 'This field is required' };
    }

    // If not required and empty, allow it
    if (!question.required && (!answer || answer.trim() === '')) {
      return { valid: true, processedValue: '' };
    }

    switch (question.type) {
      case 'date':
        return this.validateDate(answer);
      case 'boolean':
        return this.validateBoolean(answer);
      case 'select':
        return this.validateSelect(question, answer);
      case 'text':
      default:
        return this.validateText(question, answer);
    }
  }

  private validateDate(answer: string): ValidationResult {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(answer)) {
      return { valid: false, error: 'Please enter date in YYYY-MM-DD format' };
    }

    const date = new Date(answer);
    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Please enter a valid date' };
    }

    return { valid: true, processedValue: answer };
  }

  private validateBoolean(answer: string): ValidationResult {
    const normalized = answer.toLowerCase().trim();
    if (['true', 'yes', 'y', '1'].includes(normalized)) {
      return { valid: true, processedValue: 'true' };
    }
    if (['false', 'no', 'n', '0'].includes(normalized)) {
      return { valid: true, processedValue: 'false' };
    }
    return { valid: false, error: 'Please enter yes/no, true/false, or y/n' };
  }

  private validateSelect(question: ElicitationQuestion, answer: string): ValidationResult {
    if (!question.options) {
      return { valid: false, error: 'No options available for this question' };
    }

    const normalizedAnswer = answer.trim();
    const matchedOption = question.options.find(option => 
      option.toLowerCase() === normalizedAnswer.toLowerCase()
    );

    if (!matchedOption) {
      return { 
        valid: false, 
        error: `Please select one of: ${question.options.join(', ')}` 
      };
    }

    return { valid: true, processedValue: matchedOption };
  }

  private validateText(question: ElicitationQuestion, answer: string): ValidationResult {
    const trimmed = answer.trim();
    
    if (question.validation?.minLength && trimmed.length < question.validation.minLength) {
      return { 
        valid: false, 
        error: `Minimum length is ${question.validation.minLength} characters` 
      };
    }
    
    if (question.validation?.maxLength && trimmed.length > question.validation.maxLength) {
      return { 
        valid: false, 
        error: `Maximum length is ${question.validation.maxLength} characters` 
      };
    }

    return { valid: true, processedValue: trimmed };
  }

  getElicitationState(): ElicitationState | null {
    return this.currentState;
  }

  getProgress(): ProgressInfo {
    if (!this.currentState) {
      return { answered: 0, remaining: 0, total: 0, percentage: 0 };
    }

    const answered = this.currentState.currentQuestionIndex;
    const total = this.currentState.questions.length;
    const remaining = total - answered;
    const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;

    return { answered, remaining, total, percentage };
  }

  resetElicitation(): void {
    this.currentState = null;
  }

  getFormSummary(): FormSummary | null {
    if (!this.currentState) {
      return null;
    }

    return {
      formId: this.currentState.formId,
      formTitle: this.currentState.formTitle,
      answers: { ...this.currentState.answers },
      completed: this.currentState.isComplete
    };
  }
}
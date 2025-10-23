export interface ElicitationQuestion {
  fieldName: string;
  question: string;
  type: 'text' | 'date' | 'boolean' | 'select';
  required: boolean;
  options?: string[];
  validation?: (value: string) => boolean;
}

export interface FormTemplate {
  id: string;
  title: string;
  description: string;
  elicitationQuestions: ElicitationQuestion[];
}

export interface ElicitationState {
  formTemplate: FormTemplate;
  currentQuestionIndex: number;
  answers: Record<string, string>;
  isComplete: boolean;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  processedValue?: string;
}

export interface ProcessAnswerResult {
  success: boolean;
  error?: string;
  nextQuestion?: ElicitationQuestion;
  isComplete: boolean;
}

export interface ProgressInfo {
  current: number;
  total: number;
  percentage: number;
}

export class ElicitationEngine {
  private states = new Map<string, ElicitationState>();

  startElicitation(sessionId: string, formTemplate: FormTemplate): ElicitationState {
    const state: ElicitationState = {
      formTemplate,
      currentQuestionIndex: 0,
      answers: {},
      isComplete: false
    };
    this.states.set(sessionId, state);
    return state;
  }

  getCurrentQuestion(sessionId: string): ElicitationQuestion | null {
    const state = this.states.get(sessionId);
    if (!state || state.isComplete) {
      return null;
    }

    const questions = state.formTemplate.elicitationQuestions;
    if (state.currentQuestionIndex >= questions.length) {
      state.isComplete = true;
      return null;
    }

    return questions[state.currentQuestionIndex];
  }

  processAnswer(sessionId: string, answer: string): ProcessAnswerResult {
    const state = this.states.get(sessionId);
    if (!state) {
      return { success: false, error: 'Session not found', isComplete: false };
    }

    const currentQuestion = this.getCurrentQuestion(sessionId);
    if (!currentQuestion) {
      return { success: false, error: 'No current question or elicitation complete', isComplete: false };
    }

    // Validate the answer
    const validationResult = this.validateAnswer(currentQuestion, answer);
    if (!validationResult.valid) {
      return { success: false, error: validationResult.error, isComplete: false };
    }

    // Store the answer
    state.answers[currentQuestion.fieldName] = validationResult.processedValue || answer;

    // Move to next question
    state.currentQuestionIndex++;

    // Check if we're done
    if (state.currentQuestionIndex >= state.formTemplate.elicitationQuestions.length) {
      state.isComplete = true;
      return { success: true, isComplete: true };
    }

    // Get next question
    const nextQuestion = this.getCurrentQuestion(sessionId);
    return {
      success: true,
      nextQuestion: nextQuestion || undefined,
      isComplete: false
    };
  }

  validateAnswer(question: ElicitationQuestion, answer: string): ValidationResult {
    // Check if required
    if (question.required && (!answer || answer.trim() === '')) {
      return { valid: false, error: 'This field is required' };
    }

    // Skip validation for optional empty answers
    if (!question.required && (!answer || answer.trim() === '')) {
      return { valid: true };
    }

    // Type-specific validation
    switch (question.type) {
      case 'date':
        return this.validateDate(answer);
      case 'boolean':
        return this.validateBoolean(answer);
      case 'select':
        return this.validateSelect(question, answer);
      case 'text':
        return this.validateText(question, answer);
      default:
        return { valid: true };
    }
  }

  private validateDate(answer: string): ValidationResult {
    const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
    if (!dateRegex.test(answer)) {
      return { valid: false, error: 'Please enter date in MM/DD/YYYY format' };
    }

    const date = new Date(answer);
    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Please enter a valid date' };
    }

    return { valid: true, processedValue: answer };
  }

  private validateBoolean(answer: string): ValidationResult {
    const lowerAnswer = answer.toLowerCase().trim();
    const validAnswers = ['yes', 'no', 'true', 'false', 'y', 'n'];
    
    if (!validAnswers.includes(lowerAnswer)) {
      return { valid: false, error: 'Please answer with yes/no, true/false, or y/n' };
    }

    const booleanValue = ['yes', 'true', 'y'].includes(lowerAnswer);
    return { valid: true, processedValue: booleanValue.toString() };
  }

  private validateSelect(question: ElicitationQuestion, answer: string): ValidationResult {
    if (!question.options) {
      return { valid: true };
    }

    const lowerAnswer = answer.toLowerCase().trim();
    const matchingOption = question.options.find(option => 
      option.toLowerCase() === lowerAnswer
    );

    if (!matchingOption) {
      return {
        valid: false,
        error: `Please select one of: ${question.options.join(', ')}`
      };
    }

    return { valid: true, processedValue: matchingOption };
  }

  private validateText(question: ElicitationQuestion, answer: string): ValidationResult {
    if (question.validation && !question.validation(answer)) {
      return { valid: false, error: 'Invalid format for this field' };
    }
    return { valid: true };
  }

  getElicitationState(sessionId: string): ElicitationState | null {
    return this.states.get(sessionId) || null;
  }

  getProgress(sessionId: string): ProgressInfo | null {
    const state = this.states.get(sessionId);
    if (!state) {
      return null;
    }

    const total = state.formTemplate.elicitationQuestions.length;
    const current = state.currentQuestionIndex;
    const percentage = Math.round((current / total) * 100);

    return { current, total, percentage };
  }

  resetElicitation(sessionId: string): void {
    this.states.delete(sessionId);
  }

  getFormSummary(sessionId: string): string | null {
    const state = this.states.get(sessionId);
    if (!state || !state.isComplete) {
      return null;
    }

    let summary = `Form: ${state.formTemplate.title}\n\n`;
    state.formTemplate.elicitationQuestions.forEach(question => {
      const answer = state.answers[question.fieldName];
      if (answer) {
        summary += `${question.question}\nAnswer: ${answer}\n\n`;
      }
    });

    return summary;
  }
}
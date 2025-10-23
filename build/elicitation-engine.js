export class ElicitationEngine {
    states = new Map();
    startElicitation(sessionId, formTemplate) {
        const state = {
            formTemplate,
            currentQuestionIndex: 0,
            answers: {},
            isComplete: false
        };
        this.states.set(sessionId, state);
        return state;
    }
    getCurrentQuestion(sessionId) {
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
    processAnswer(sessionId, answer) {
        const state = this.states.get(sessionId);
        if (!state) {
            return { success: false, error: 'Session not found' };
        }
        const currentQuestion = this.getCurrentQuestion(sessionId);
        if (!currentQuestion) {
            return { success: false, error: 'No current question or elicitation complete' };
        }
        // Validate the answer
        const validationResult = this.validateAnswer(currentQuestion, answer);
        if (!validationResult.valid) {
            return { success: false, error: validationResult.error };
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
    validateAnswer(question, answer) {
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
    validateDate(answer) {
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
    validateBoolean(answer) {
        const lowerAnswer = answer.toLowerCase().trim();
        const validAnswers = ['yes', 'no', 'true', 'false', 'y', 'n'];
        if (!validAnswers.includes(lowerAnswer)) {
            return { valid: false, error: 'Please answer with yes/no, true/false, or y/n' };
        }
        const booleanValue = ['yes', 'true', 'y'].includes(lowerAnswer);
        return { valid: true, processedValue: booleanValue.toString() };
    }
    validateSelect(question, answer) {
        if (!question.options) {
            return { valid: true };
        }
        const lowerAnswer = answer.toLowerCase().trim();
        const matchingOption = question.options.find(option => option.toLowerCase() === lowerAnswer);
        if (!matchingOption) {
            return {
                valid: false,
                error: `Please select one of: ${question.options.join(', ')}`
            };
        }
        return { valid: true, processedValue: matchingOption };
    }
    validateText(question, answer) {
        if (question.validation && !question.validation(answer)) {
            return { valid: false, error: 'Invalid format for this field' };
        }
        return { valid: true };
    }
    getElicitationState(sessionId) {
        return this.states.get(sessionId) || null;
    }
    getProgress(sessionId) {
        const state = this.states.get(sessionId);
        if (!state) {
            return null;
        }
        const total = state.formTemplate.elicitationQuestions.length;
        const current = state.currentQuestionIndex;
        const percentage = Math.round((current / total) * 100);
        return { current, total, percentage };
    }
    resetElicitation(sessionId) {
        this.states.delete(sessionId);
    }
    getFormSummary(sessionId) {
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

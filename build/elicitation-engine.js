export class ElicitationEngine {
    formTemplates;
    discoveryQuestions;
    currentState = null;
    constructor(formTemplates) {
        this.formTemplates = formTemplates;
        this.discoveryQuestions = this.createDiscoveryQuestions();
    }
    createDiscoveryQuestions() {
        return [
            {
                id: 'intent',
                question: 'What would you like to do with your insurance policy?',
                type: 'select',
                options: [
                    'Change beneficiary information',
                    'Take a loan against my policy',
                    'Surrender my policy',
                    'Change policy details',
                    'Apply for reinstatement',
                    'Other'
                ],
                followUp: {
                    'Change beneficiary information': 'beneficiary-type',
                    'Take a loan against my policy': 'loan-type',
                    'Surrender my policy': 'surrender-type',
                    'Change policy details': 'change-type',
                    'Apply for reinstatement': 'reinstatement-reason',
                    'Other': 'describe-need'
                }
            },
            {
                id: 'beneficiary-type',
                question: 'What type of beneficiary change do you need?',
                type: 'select',
                options: [
                    'Change primary beneficiary',
                    'Add or change contingent beneficiary',
                    'Update beneficiary percentage',
                    'All of the above'
                ]
            },
            {
                id: 'loan-type',
                question: 'What type of loan are you looking for?',
                type: 'select',
                options: [
                    'Policy loan (borrow against cash value)',
                    'Automatic premium loan',
                    'Other loan option'
                ]
            },
            {
                id: 'surrender-type',
                question: 'What type of surrender are you considering?',
                type: 'select',
                options: [
                    'Full surrender (cancel policy)',
                    'Partial surrender (withdraw some cash value)',
                    'Non-forfeiture option (keep some benefits)'
                ]
            },
            {
                id: 'change-type',
                question: 'What policy details would you like to change?',
                type: 'select',
                options: [
                    'Contact information',
                    'Payment method or frequency',
                    'Coverage amount',
                    'Policy options or riders',
                    'Other changes'
                ]
            },
            {
                id: 'reinstatement-reason',
                question: 'Why do you need to reinstate your policy?',
                type: 'select',
                options: [
                    'Policy lapsed due to non-payment',
                    'Policy was surrendered and I want it back',
                    'Other reinstatement situation'
                ]
            },
            {
                id: 'describe-need',
                question: 'Please describe what you need help with:',
                type: 'text'
            }
        ];
    }
    startDiscovery() {
        this.currentState = {
            currentQuestionId: 'intent',
            answers: {},
            isComplete: false,
            suggestedForms: []
        };
        return { success: true };
    }
    getCurrentQuestion() {
        if (!this.currentState || !this.currentState.currentQuestionId) {
            return null;
        }
        return this.discoveryQuestions.find(q => q.id === this.currentState.currentQuestionId) || null;
    }
    processAnswer(answer) {
        if (!this.currentState) {
            return { success: false, error: 'No active discovery session' };
        }
        const currentQuestion = this.getCurrentQuestion();
        if (!currentQuestion) {
            return { success: false, error: 'No current question found' };
        }
        // Store the answer
        this.currentState.answers[currentQuestion.id] = answer;
        // Determine next question or completion
        let nextQuestionId = null;
        if (currentQuestion.followUp && currentQuestion.followUp[answer]) {
            nextQuestionId = currentQuestion.followUp[answer];
        }
        // Update state
        this.currentState.currentQuestionId = nextQuestionId;
        // If no next question, complete the discovery and suggest forms
        if (!nextQuestionId) {
            this.currentState.isComplete = true;
            this.currentState.suggestedForms = this.suggestFormsBasedOnAnswers();
        }
        return {
            success: true,
            completed: this.currentState.isComplete,
            suggestedForms: this.currentState.isComplete ? this.currentState.suggestedForms : undefined
        };
    }
    suggestFormsBasedOnAnswers() {
        const answers = this.currentState.answers;
        const suggestions = [];
        // Map answers to form IDs
        const intent = answers['intent'];
        if (intent === 'Change beneficiary information') {
            suggestions.push('beneficiary-change');
        }
        else if (intent === 'Take a loan against my policy') {
            suggestions.push('loan-form');
        }
        else if (intent === 'Surrender my policy') {
            const surrenderType = answers['surrender-type'];
            if (surrenderType === 'Non-forfeiture option (keep some benefits)') {
                suggestions.push('non-forfeiture-option');
            }
            else {
                suggestions.push('surrender-form');
            }
        }
        else if (intent === 'Apply for reinstatement') {
            suggestions.push('reinstatement-application');
        }
        else if (intent === 'Change policy details') {
            suggestions.push('amendment-request');
        }
        // If no specific match, suggest based on keywords in text answers
        if (suggestions.length === 0) {
            const textAnswers = Object.values(answers).join(' ').toLowerCase();
            for (const template of this.formTemplates) {
                if (template.keywords?.some(keyword => textAnswers.includes(keyword.toLowerCase()))) {
                    suggestions.push(template.id);
                }
            }
        }
        return suggestions.length > 0 ? suggestions : ['beneficiary-change']; // Default fallback
    }
    getDiscoveryState() {
        return this.currentState;
    }
    getProgress() {
        if (!this.currentState) {
            return { questionsAnswered: 0, formsNarrowed: 0, isComplete: false };
        }
        const questionsAnswered = Object.keys(this.currentState.answers).length;
        const formsNarrowed = this.currentState.suggestedForms.length;
        return {
            questionsAnswered,
            formsNarrowed,
            isComplete: this.currentState.isComplete
        };
    }
    resetDiscovery() {
        this.currentState = null;
    }
    getFormSummary() {
        if (!this.currentState) {
            return null;
        }
        return {
            suggestedForms: this.currentState.suggestedForms,
            answers: this.currentState.answers,
            completed: this.currentState.isComplete
        };
    }
}

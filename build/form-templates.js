export const FORM_TEMPLATES = [
    {
        id: 'beneficiary-change',
        title: 'Beneficiary Change Request',
        description: 'Change the beneficiary on your life insurance policy',
        keywords: ['beneficiary', 'change beneficiary', 'update beneficiary', 'new beneficiary', 'primary beneficiary', 'secondary beneficiary', 'heir', 'inheritance'],
        scenarios: ['I want to change my beneficiary', 'Need to update who gets my benefits', 'My beneficiary information is outdated'],
        elicitationSchema: {
            type: 'object',
            properties: {
                policyNumber: {
                    type: 'string',
                    title: 'Policy Number',
                    description: 'Your insurance policy number',
                    minLength: 6,
                    maxLength: 20
                },
                policyholderName: {
                    type: 'string',
                    title: 'Policyholder Name',
                    description: 'Full name of the policyholder',
                    minLength: 2,
                    maxLength: 100
                },
                currentBeneficiary: {
                    type: 'string',
                    title: 'Current Beneficiary',
                    description: 'Name of the current primary beneficiary',
                    minLength: 2,
                    maxLength: 100
                },
                newBeneficiaryName: {
                    type: 'string',
                    title: 'New Beneficiary Name',
                    description: 'Full name of the new primary beneficiary',
                    minLength: 2,
                    maxLength: 100
                },
                relationship: {
                    type: 'string',
                    title: 'Relationship',
                    description: 'Relationship of new beneficiary to policyholder',
                    enum: ['Spouse', 'Child', 'Parent', 'Sibling', 'Other'],
                    enumNames: ['Spouse', 'Child', 'Parent', 'Sibling', 'Other']
                },
                beneficiaryDob: {
                    type: 'string',
                    format: 'date',
                    title: 'Beneficiary Date of Birth',
                    description: 'Date of birth of the new beneficiary'
                },
                percentage: {
                    type: 'number',
                    title: 'Percentage',
                    description: 'Percentage of benefits for this beneficiary',
                    minimum: 1,
                    maximum: 100,
                    default: 100
                }
            },
            required: ['policyNumber', 'policyholderName', 'currentBeneficiary', 'newBeneficiaryName', 'relationship', 'beneficiaryDob', 'percentage']
        }
    },
    {
        id: 'loan-form',
        title: 'Policy Loan Application',
        description: 'Apply for a loan against your life insurance policy',
        keywords: ['loan', 'borrow', 'policy loan', 'cash advance', 'loan against policy', 'policy value', 'cash value loan'],
        scenarios: ['I need a loan against my policy', 'Want to borrow money from my policy', 'Need cash from my policy value'],
        elicitationSchema: {
            type: 'object',
            properties: {
                policyNumber: {
                    type: 'string',
                    title: 'Policy Number',
                    description: 'Your insurance policy number',
                    minLength: 6,
                    maxLength: 20
                },
                policyholderName: {
                    type: 'string',
                    title: 'Policyholder Name',
                    description: 'Full name of the policyholder',
                    minLength: 2,
                    maxLength: 100
                },
                loanAmount: {
                    type: 'string',
                    title: 'Loan Amount',
                    description: 'Amount you wish to borrow (e.g., $25,000.00)',
                    minLength: 1,
                    maxLength: 20
                },
                loanPurpose: {
                    type: 'string',
                    title: 'Loan Purpose',
                    description: 'Purpose of the loan',
                    enum: ['Home improvement', 'Education', 'Medical expenses', 'Business investment', 'Debt consolidation', 'Other'],
                    enumNames: ['Home improvement', 'Education', 'Medical expenses', 'Business investment', 'Debt consolidation', 'Other']
                },
                disbursementMethod: {
                    type: 'string',
                    title: 'Disbursement Method',
                    description: 'How would you like to receive the loan proceeds?',
                    enum: ['Direct deposit', 'Check by mail', 'Wire transfer'],
                    enumNames: ['Direct deposit', 'Check by mail', 'Wire transfer']
                }
            },
            required: ['policyNumber', 'policyholderName', 'loanAmount', 'loanPurpose', 'disbursementMethod']
        }
    },
    {
        id: 'reinstatement-application',
        title: 'Policy Reinstatement Application',
        description: 'Apply to reinstate a lapsed life insurance policy',
        keywords: ['reinstate', 'reinstatement', 'lapsed policy', 'restore policy', 'reactivate', 'policy lapsed', 'bring back policy'],
        scenarios: ['My policy lapsed and I want to reinstate it', 'Need to restore my cancelled policy', 'Want to reactivate my policy'],
        elicitationSchema: {
            type: 'object',
            properties: {
                policyNumber: {
                    type: 'string',
                    title: 'Policy Number',
                    description: 'Your insurance policy number',
                    minLength: 6,
                    maxLength: 20
                },
                policyholderName: {
                    type: 'string',
                    title: 'Policyholder Name',
                    description: 'Full name of the policyholder',
                    minLength: 2,
                    maxLength: 100
                },
                lapseDate: {
                    type: 'string',
                    format: 'date',
                    title: 'Lapse Date',
                    description: 'Date when the policy lapsed'
                },
                reasonForLapse: {
                    type: 'string',
                    title: 'Reason for Lapse',
                    description: 'Reason why the policy lapsed',
                    enum: ['Financial hardship', 'Forgot to pay', 'Changed address', 'Other'],
                    enumNames: ['Financial hardship', 'Forgot to pay', 'Changed address', 'Other']
                },
                healthChanged: {
                    type: 'boolean',
                    title: 'Health Status Changed',
                    description: 'Has your health status changed since the policy lapsed?',
                    default: false
                }
            },
            required: ['policyNumber', 'policyholderName', 'lapseDate', 'reasonForLapse', 'healthChanged']
        }
    },
    {
        id: 'surrender-form',
        title: 'Policy Surrender Form',
        description: 'Surrender your life insurance policy for cash value',
        keywords: ['surrender', 'cash out', 'cancel policy', 'terminate policy', 'cash surrender', 'policy surrender', 'cash value'],
        scenarios: ['I want to surrender my policy', 'Need to cash out my policy', 'Want to cancel and get cash value'],
        elicitationSchema: {
            type: 'object',
            properties: {
                policyNumber: {
                    type: 'string',
                    title: 'Policy Number',
                    description: 'Your insurance policy number',
                    minLength: 6,
                    maxLength: 20
                },
                policyholderName: {
                    type: 'string',
                    title: 'Policyholder Name',
                    description: 'Full name of the policyholder',
                    minLength: 2,
                    maxLength: 100
                },
                surrenderType: {
                    type: 'string',
                    title: 'Surrender Type',
                    description: 'Type of surrender requested',
                    enum: ['Full surrender', 'Partial surrender'],
                    enumNames: ['Full surrender', 'Partial surrender']
                },
                surrenderAmount: {
                    type: 'string',
                    title: 'Surrender Amount',
                    description: 'Amount to surrender (for partial surrender only)',
                    minLength: 0,
                    maxLength: 20
                },
                reason: {
                    type: 'string',
                    title: 'Reason for Surrender',
                    description: 'Reason for surrendering the policy',
                    enum: ['Financial need', 'No longer needed', 'Found better coverage', 'Other'],
                    enumNames: ['Financial need', 'No longer needed', 'Found better coverage', 'Other']
                }
            },
            required: ['policyNumber', 'policyholderName', 'surrenderType', 'reason']
        }
    },
    {
        id: 'non-forfeiture-option',
        title: 'Non-Forfeiture Option Change',
        description: 'Change the non-forfeiture option on your policy',
        keywords: ['non-forfeiture', 'forfeiture option', 'paid-up', 'extended term', 'cash surrender option', 'policy options'],
        scenarios: ['I want to change my non-forfeiture option', 'Need to update my policy options', 'Want to switch to paid-up or extended term'],
        elicitationSchema: {
            type: 'object',
            properties: {
                policyNumber: {
                    type: 'string',
                    title: 'Policy Number',
                    description: 'Your insurance policy number',
                    minLength: 6,
                    maxLength: 20
                },
                policyholderName: {
                    type: 'string',
                    title: 'Policyholder Name',
                    description: 'Full name of the policyholder',
                    minLength: 2,
                    maxLength: 100
                },
                currentOption: {
                    type: 'string',
                    title: 'Current Option',
                    description: 'Current non-forfeiture option',
                    enum: ['Cash surrender', 'Reduced paid-up', 'Extended term', 'Unknown'],
                    enumNames: ['Cash surrender', 'Reduced paid-up', 'Extended term', 'Unknown']
                },
                newOption: {
                    type: 'string',
                    title: 'New Option',
                    description: 'Desired non-forfeiture option',
                    enum: ['Cash surrender', 'Reduced paid-up', 'Extended term'],
                    enumNames: ['Cash surrender', 'Reduced paid-up', 'Extended term']
                }
            },
            required: ['policyNumber', 'policyholderName', 'currentOption', 'newOption']
        }
    },
    {
        id: 'annuity-contract-change',
        title: 'Annuity Contract Change Request',
        description: 'Request changes to your annuity contract',
        keywords: ['annuity', 'contract change', 'annuity change', 'payment frequency', 'investment allocation', 'annuity contract'],
        scenarios: ['I want to change my annuity contract', 'Need to modify my annuity payments', 'Want to update my investment allocation'],
        elicitationSchema: {
            type: 'object',
            properties: {
                contractNumber: {
                    type: 'string',
                    title: 'Contract Number',
                    description: 'Your annuity contract number',
                    minLength: 6,
                    maxLength: 20
                },
                contractHolderName: {
                    type: 'string',
                    title: 'Contract Holder Name',
                    description: 'Full name of the contract holder',
                    minLength: 2,
                    maxLength: 100
                },
                changeType: {
                    type: 'string',
                    title: 'Change Type',
                    description: 'Type of change requested',
                    enum: ['Beneficiary change', 'Payment frequency', 'Investment allocation', 'Address change', 'Other'],
                    enumNames: ['Beneficiary change', 'Payment frequency', 'Investment allocation', 'Address change', 'Other']
                },
                changeDetails: {
                    type: 'string',
                    title: 'Change Details',
                    description: 'Detailed description of the requested change',
                    minLength: 10,
                    maxLength: 500
                },
                effectiveDate: {
                    type: 'string',
                    format: 'date',
                    title: 'Effective Date',
                    description: 'Date when the change should take effect'
                }
            },
            required: ['contractNumber', 'contractHolderName', 'changeType', 'changeDetails', 'effectiveDate']
        }
    },
    {
        id: 'amendment-request',
        title: 'Policy Amendment Request',
        description: 'Request an amendment to your insurance policy',
        keywords: ['amendment', 'policy amendment', 'change policy', 'modify policy', 'coverage change', 'rider', 'policy modification'],
        scenarios: ['I want to amend my policy', 'Need to change my coverage', 'Want to add or remove a rider'],
        elicitationSchema: {
            type: 'object',
            properties: {
                policyNumber: {
                    type: 'string',
                    title: 'Policy Number',
                    description: 'Your insurance policy number',
                    minLength: 6,
                    maxLength: 20
                },
                policyholderName: {
                    type: 'string',
                    title: 'Policyholder Name',
                    description: 'Full name of the policyholder',
                    minLength: 2,
                    maxLength: 100
                },
                amendmentType: {
                    type: 'string',
                    title: 'Amendment Type',
                    description: 'Type of amendment requested',
                    enum: ['Coverage increase', 'Coverage decrease', 'Rider addition', 'Rider removal', 'Other'],
                    enumNames: ['Coverage increase', 'Coverage decrease', 'Rider addition', 'Rider removal', 'Other']
                },
                amendmentDetails: {
                    type: 'string',
                    title: 'Amendment Details',
                    description: 'Detailed description of the requested amendment',
                    minLength: 10,
                    maxLength: 500
                },
                justification: {
                    type: 'string',
                    title: 'Justification',
                    description: 'Reason for requesting this amendment',
                    minLength: 10,
                    maxLength: 300
                }
            },
            required: ['policyNumber', 'policyholderName', 'amendmentType', 'amendmentDetails', 'justification']
        }
    }
];
export function getFormTemplate(formName) {
    return FORM_TEMPLATES.find(template => template.id === formName) || null;
}
export function getAvailableForms() {
    return FORM_TEMPLATES.map(template => template.id);
}
// Keywords and patterns for each form type
const FORM_KEYWORDS = {
    'beneficiary-change': {
        keywords: ['beneficiary', 'change beneficiary', 'update beneficiary', 'new beneficiary', 'primary beneficiary', 'secondary beneficiary', 'heir', 'inheritance'],
        patterns: [/beneficiary/i, /change.*beneficiary/i, /update.*beneficiary/i, /new.*beneficiary/i]
    },
    'loan-form': {
        keywords: ['loan', 'borrow', 'policy loan', 'cash advance', 'loan against policy', 'policy value', 'cash value loan'],
        patterns: [/loan/i, /borrow/i, /cash.*advance/i, /policy.*loan/i, /loan.*against/i]
    },
    'reinstatement-application': {
        keywords: ['reinstate', 'reinstatement', 'lapsed policy', 'restore policy', 'reactivate', 'policy lapsed', 'bring back policy'],
        patterns: [/reinstate/i, /lapsed/i, /restore.*policy/i, /reactivate/i, /bring.*back/i]
    },
    'surrender-form': {
        keywords: ['surrender', 'cash out', 'cancel policy', 'terminate policy', 'cash surrender', 'policy surrender', 'cash value'],
        patterns: [/surrender/i, /cash.*out/i, /cancel.*policy/i, /terminate.*policy/i, /cash.*value/i]
    },
    'non-forfeiture-option': {
        keywords: ['non-forfeiture', 'forfeiture option', 'paid-up', 'extended term', 'cash surrender option', 'policy options'],
        patterns: [/non.?forfeiture/i, /paid.?up/i, /extended.*term/i, /policy.*option/i]
    },
    'annuity-contract-change': {
        keywords: ['annuity', 'contract change', 'annuity change', 'payment frequency', 'investment allocation', 'annuity contract'],
        patterns: [/annuity/i, /contract.*change/i, /payment.*frequency/i, /investment.*allocation/i]
    },
    'amendment-request': {
        keywords: ['amendment', 'policy amendment', 'change policy', 'modify policy', 'coverage change', 'rider', 'policy modification'],
        patterns: [/amendment/i, /modify.*policy/i, /change.*policy/i, /coverage.*change/i, /rider/i]
    }
};
export function analyzeUserIntent(context) {
    const { userInput } = context;
    const suggestions = [];
    // Normalize input for better matching
    const normalizedInput = userInput.toLowerCase().trim();
    // Analyze each form type
    for (const [formId, formConfig] of Object.entries(FORM_KEYWORDS)) {
        let confidence = 0;
        const matchedKeywords = [];
        // Check keyword matches
        for (const keyword of formConfig.keywords) {
            if (normalizedInput.includes(keyword.toLowerCase())) {
                confidence += 0.3;
                matchedKeywords.push(keyword);
            }
        }
        // Check pattern matches
        for (const pattern of formConfig.patterns) {
            if (pattern.test(normalizedInput)) {
                confidence += 0.4;
            }
        }
        // Boost confidence for exact matches
        if (normalizedInput.includes(formId.replace('-', ' '))) {
            confidence += 0.5;
        }
        // Only include suggestions with reasonable confidence
        if (confidence > 0.2) {
            const template = getFormTemplate(formId);
            if (template) {
                suggestions.push({
                    formId,
                    title: template.title,
                    description: template.description,
                    confidence: Math.min(confidence, 1.0),
                    matchedKeywords,
                    pdfPath: `./src/forms/${formId}.pdf`
                });
            }
        }
    }
    // Sort by confidence (highest first)
    return suggestions.sort((a, b) => b.confidence - a.confidence);
}
export function selectBestForm(context) {
    const suggestions = analyzeUserIntent(context);
    return suggestions.length > 0 ? suggestions[0] : null;
}
export function getFormSuggestions(userInput, maxSuggestions = 3) {
    const context = { userInput };
    const suggestions = analyzeUserIntent(context);
    return suggestions.slice(0, maxSuggestions);
}
// Resource template for dynamic form queries
export function createFormResourceTemplate(formId, parameters) {
    const template = getFormTemplate(formId);
    if (!template) {
        throw new Error(`Form template not found: ${formId}`);
    }
    const baseUri = `form://${formId}`;
    if (parameters && Object.keys(parameters).length > 0) {
        const queryParams = new URLSearchParams();
        for (const [key, value] of Object.entries(parameters)) {
            queryParams.append(key, String(value));
        }
        return `${baseUri}?${queryParams.toString()}`;
    }
    return baseUri;
}

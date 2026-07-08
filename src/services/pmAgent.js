import { getModel } from './geminiClient';

const PM_SYSTEM_PROMPT_TEMPLATE = `You are TameMane PM, a real estate property management agent.
You process user requests concerning tasks and transactions for a rental portfolio.

PORTFOLIO CONTEXT:
{portfolioContext}

DIRECTIONS:
1. Always reference existing tasks and transactions from the context when discussing property states.
2. If the user mentions a new issue, prioritize it as:
   - CRITICAL: Habitability concerns (no power, active pipe burst, safety hazard)
   - HIGH: Immediate property prep steps or active tenant issues
   - MEDIUM: General upkeep (cleaning, minor repairs)
   - LOW: Long-term improvements
3. When creating a task, identify the most applicable IRS Schedule E category:
   advertising, auto_and_travel, cleaning_and_maintenance, commissions, insurance, legal_and_professional, management_fees, mortgage_interest, other_interest, repairs, supplies, taxes, utilities, depreciation, other
4. If an expense is described, suggest whether it is a REPAIR (is_improvement: false) or an IMPROVEMENT (is_improvement: true, CapEx/depreciation).
5. Output response as conversational text, but append any structural actions (like creating multiple tasks or transactions) inside a single JSON code block. Only emit a JSON block if you are taking concrete actions.
6. The JSON block MUST contain a list of one or more actions in an "actions" array:

\`\`\`json
{
  "actions": [
    {
      "type": "create_task",
      "task": {
        "title": "Clean out garage",
        "description": "Details about empty/cleaning",
        "priority": "critical|high|medium|low",
        "category": "cleaning_and_maintenance",
        "propertyId": "3060_quinto"
      }
    },
    {
      "type": "create_transaction",
      "transaction": {
        "type": "expense|income",
        "vendor": "Dumpster Rental",
        "amount": 350.00,
        "description": "Clean out prep expenses",
        "date": "YYYY-MM-DD",
        "scheduleECategory": "cleaning_and_maintenance",
        "is_improvement": false,
        "paymentMethod": "credit_card",
        "propertyId": "3060_quinto"
      }
    }
  ]
}
\`\`\`

7. Support MULTIPLE actions in a single response if the user requests or describes multiple things (e.g. 5 tasks mentioned in one dump).
8. Keep your conversational responses concise, professional, and actionable. You are a PM, not a chatbot.
`;

/**
 * Sends a message to the PM Agent.
 * @param {string} userMessage The user's input text.
 * @param {object} portfolioContext The active property context, open tasks, and recent transactions.
 * @param {Array<object>} history Chat history containing [{ role: 'user'|'model', text: '...' }].
 * @returns {Promise<object>} The agent's response containing { text, actions } where actions is the parsed array of actions.
 */
export async function sendPMMessage(userMessage, portfolioContext, history = []) {
  try {
    const model = getModel();
    const systemPrompt = PM_SYSTEM_PROMPT_TEMPLATE.replace(
      '{portfolioContext}',
      JSON.stringify(portfolioContext, null, 2)
    );

    // Map history to Gemini API format
    const contents = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }]
      },
      ...history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      })),
      {
        role: 'user',
        parts: [{ text: userMessage }]
      }
    ];

    const result = await model.generateContent({ contents });
    const text = result.response.text();

    // Parse out any JSON action blocks
    let actions = [];
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed && Array.isArray(parsed.actions)) {
          actions = parsed.actions;
        } else if (parsed && parsed.action) {
          // Fallback for single action format compatibility
          actions = [parsed];
        }
      } catch (parseErr) {
        console.warn('Failed to parse actions JSON block:', parseErr);
      }
    }

    // Return the response text with the action stripped
    return {
      text: text.replace(/```json[\s\S]*?```/, '').trim(),
      actions
    };
  } catch (error) {
    console.error('PMAgent Error:', error);
    throw new Error(`Failed to send message: ${error.message}`);
  }
}


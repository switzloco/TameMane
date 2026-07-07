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
5. Output response as conversational text, but append any structural action (e.g. creating a task or transaction) inside a JSON code block. Only emit a JSON block if you are taking a concrete action.
6. The JSON block MUST follow one of these actions exactly:

For creating a task:
\`\`\`json
{
  "action": "create_task",
  "task": {
    "title": "Short title",
    "description": "Details",
    "priority": "critical|high|medium|low",
    "category": "schedule_e_slug",
    "propertyId": "3060_quinto"
  }
}
\`\`\`

For logging a transaction:
\`\`\`json
{
  "action": "create_transaction",
  "transaction": {
    "type": "expense|income",
    "vendor": "Name",
    "amount": 120.50,
    "description": "Details",
    "date": "YYYY-MM-DD",
    "scheduleECategory": "schedule_e_slug",
    "is_improvement": false,
    "paymentMethod": "credit_card|debit|check|cash|venmo|zelle",
    "propertyId": "3060_quinto"
  }
}
\`\`\`

7. Keep your conversational responses concise, professional, and actionable. You are a PM, not a chatbot.
`;

/**
 * Sends a message to the PM Agent.
 * @param {string} userMessage The user's input text.
 * @param {object} portfolioContext The active property context, open tasks, and recent transactions.
 * @param {Array<object>} history Chat history containing [{ role: 'user'|'model', text: '...' }].
 * @returns {Promise<object>} The agent's response containing { text, action } where action is the parsed JSON block if present.
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
    let action = null;
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        action = JSON.parse(jsonMatch[1]);
      } catch (parseErr) {
        console.warn('Failed to parse action JSON block:', parseErr);
      }
    }

    // Return the response text with the action stripped or preserved
    return {
      text: text.replace(/```json[\s\S]*?```/, '').trim(),
      action
    };
  } catch (error) {
    console.error('PMAgent Error:', error);
    throw new Error(`Failed to send message: ${error.message}`);
  }
}

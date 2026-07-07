import { getModel } from './geminiClient';

const VISION_SYSTEM_PROMPT = `You are TameMane Vision, a receipt-parsing model optimized for real estate tax extraction.
Extract values from this receipt image for Property: {propertyName} ({propertyId}).

EXTRACTION PARAMETERS:
1. Extract Vendor name, Transaction Date (YYYY-MM-DD), and Total Amount.
2. Categorize the transaction into one of these exact Schedule E categories:
   advertising, auto_and_travel, cleaning_and_maintenance, commissions, insurance, legal_and_professional, management_fees, mortgage_interest, other_interest, repairs, supplies, taxes, utilities, depreciation, other
3. Flag is_improvement: true if it is an asset improvement/betterment (e.g. new appliance, roof replacement), or false if it is standard maintenance (e.g. cartridge swap, lightbulb, cleaning supplies).
4. Provide a confidence score between 0.0 and 1.0.

RETURN A VALID JSON OBJECT ONLY matching this structure:
{
  "vendor": "String or null",
  "amount": Number or null,
  "date": "YYYY-MM-DD or null",
  "description": "String detailing items purchased",
  "scheduleECategory": "Category slug",
  "is_improvement": Boolean,
  "paymentMethod": "credit_card|debit|check|cash|venmo|zelle|null",
  "confidence": Number,
  "needsReview": Boolean,
  "reviewReason": "String if needsReview is true, else null"
}
`;

/**
 * Parses a receipt image encoded as base64.
 * @param {string} base64String The base64-encoded image (with or without data URL prefix).
 * @param {string} propertyId The ID of the active property.
 * @param {string} propertyName The name of the active property.
 * @returns {Promise<object>} The extracted receipt transaction details.
 */
export async function parseReceipt(base64String, propertyId, propertyName) {
  try {
    // Clean up base64 string if it contains data prefix (e.g., "data:image/jpeg;base64,...")
    let mimeType = 'image/jpeg';
    let rawBase64 = base64String;

    const dataPrefixMatch = base64String.match(/^data:([^;]+);base64,(.*)$/);
    if (dataPrefixMatch) {
      mimeType = dataPrefixMatch[1];
      rawBase64 = dataPrefixMatch[2];
    }

    const model = getModel();
    const systemInstructions = VISION_SYSTEM_PROMPT
      .replace('{propertyName}', propertyName)
      .replace('{propertyId}', propertyId);

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemInstructions },
            {
              inlineData: {
                mimeType: mimeType,
                data: rawBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.error('VisionAgent Error:', error);
    throw new Error(`Failed to parse receipt: ${error.message}`);
  }
}

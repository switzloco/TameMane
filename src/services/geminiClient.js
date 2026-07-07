import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn(
    'TameMane WARNING: VITE_GEMINI_API_KEY is not defined in .env.local! ' +
    'AI features will fail gracefully with warning indicators.'
  );
}

// Initialize the SDK with key string directly (legacy format)
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Default model is gemini-2.5-pro (user requested)
export const MODEL_NAME = 'gemini-2.5-pro';

export const getAIInstance = () => {
  if (!genAI) {
    throw new Error('Gemini API client not initialized. Check VITE_GEMINI_API_KEY in .env.local.');
  }
  return genAI;
};

export const getModel = (name = MODEL_NAME) => {
  const ai = getAIInstance();
  return ai.getGenerativeModel({ model: name });
};

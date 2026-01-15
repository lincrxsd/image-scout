import { GoogleGenAI } from "@google/genai";

export const generateRelatedKeywords = async (
  baseKeyword: string,
  apiKey: string
): Promise<string[]> => {
  if (!apiKey) {
    throw new Error("Missing Gemini API Key");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate 5 specific, historically relevant search queries related to "${baseKeyword}". 
      Focus on finding high-quality images, variations, or specific details.
      Return ONLY a JSON array of strings. Example: ["Keyword 1", "Keyword 2"]`,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return [];
    
    const keywords = JSON.parse(text);
    if (Array.isArray(keywords)) {
      return keywords.slice(0, 5);
    }
    return [];
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Failed to generate keywords with Gemini");
  }
};
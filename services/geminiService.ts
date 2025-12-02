import { GoogleGenAI } from "@google/genai";
import { NpsRecord } from "../types";

const createClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeData = async (records: NpsRecord[], question: string) => {
  try {
    const ai = createClient();
    
    // Prepare a summarized context. We can't send infinite rows, so we focus on key info.
    // We prioritize rows with textual justification as they are most valuable for LLM.
    const relevantRecords = records
      .filter(r => r.justification && r.justification.length > 2)
      .map(r => `Unit: ${r.unitName}, Score: ${r.score}, Comment: "${r.justification}"`)
      .slice(0, 100) // Limit to 100 comments to fit context comfortably
      .join('\n');

    const prompt = `
      You are an expert Data Analyst specializing in NPS (Net Promoter Score).
      
      Here is a sample of the dataset containing customer feedback (comments) and their scores:
      ---
      ${relevantRecords}
      ---
      
      The user asks: "${question}"
      
      Provide a concise, professional answer based on the data provided. 
      If the user asks for sentiment, identify common themes.
      If the user asks for specific unit problems, cite the unit names.
      Format your response in Markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I encountered an error analyzing the data. Please ensure your API key is configured correctly.";
  }
};

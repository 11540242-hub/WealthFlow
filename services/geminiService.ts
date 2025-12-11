import { GoogleGenAI } from "@google/genai";
import { StockUpdateResult, GroundingSource } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function fetchCurrentStockPrices(symbols: string[]): Promise<{ prices: StockUpdateResult[], sources: GroundingSource[] }> {
  if (symbols.length === 0) return { prices: [], sources: [] };

  const symbolList = symbols.join(", ");
  const prompt = `
    Find the current realtime stock price for the following symbols: ${symbolList}.
    Please provide the latest available price in a standard numeric format.
    
    IMPORTANT: You must return the data in a valid JSON block like this:
    \`\`\`json
    [
      { "symbol": "2330.TW", "price": 980.5 },
      { "symbol": "AAPL", "price": 225.30 }
    ]
    \`\`\`
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    
    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    chunks.forEach(chunk => {
      if (chunk.web?.uri && chunk.web?.title) {
        sources.push({ title: chunk.web.title, url: chunk.web.uri });
      }
    });

    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    let prices: StockUpdateResult[] = [];
    
    if (jsonMatch && jsonMatch[1]) {
      try {
        prices = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.warn("Failed to parse JSON, trying full text");
      }
    } else {
        try {
            const start = text.indexOf('[');
            const end = text.lastIndexOf(']');
            if (start !== -1 && end !== -1) {
                prices = JSON.parse(text.substring(start, end + 1));
            }
        } catch(e) {
            console.error("Failed to parse stock data", e);
        }
    }
    
    return { prices, sources };

  } catch (error) {
    console.error("Error fetching stock prices:", error);
    throw error;
  }
}

export async function generateFinancialAdvice(summary: string): Promise<string> {
    const aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await aiInstance.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Act as a financial advisor. Here is a summary of my current finances: ${summary}. 
        Provide a brief, encouraging, and actionable 3-bullet point summary of advice. Keep it under 100 words.`,
    });
    return response.text || "Unable to generate advice at this time.";
}
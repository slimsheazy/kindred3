import { ChatMessage, BondScore, UserData, AiResult } from "../../types";
import { getAiClient, getCleanText, extractJson, getSystemPrompt } from "./core";
import * as schemas from "../../lib/schemas";

export const getCoachingResponse = async (
  message: string, 
  history: ChatMessage[] = [],
  user: UserData | null,
  context?: { 
    bondScores: BondScore[];
  }
): Promise<AiResult<string>> => {
  const ai = getAiClient();
  const contents = history.map(msg => ({ 
    role: msg.role === 'user' ? 'user' : 'model', 
    parts: [{ text: msg.text }] 
  }));
  contents.push({ role: 'user', parts: [{ text: message }] });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: contents as any,
      config: { 
        systemInstruction: getSystemPrompt(user, context),
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });
    const text = getCleanText(response);
    if (!text) return { data: null, error: "The Oracle is silent." };
    return { data: text, error: null };
  } catch (e: any) {
    return { data: null, error: e.message || "Connection interrupted." };
  }
};

export const analyzeInteractionForScores = async (context: string): Promise<AiResult<{ category: string, delta: number }[]>> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({ 
      model: 'gemini-3-flash-preview', 
      contents: `Analyze the following interaction for relationship shifts. Return a JSON array of objects with 'category' and 'delta' keys. Interaction: "${context}"`, 
      config: { responseMimeType: "application/json" } 
    });
    const raw = JSON.parse(extractJson(getCleanText(response) || '[]'));
    const data = schemas.InteractionAnalysisResponseSchema.parse(raw);
    return { data, error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
};
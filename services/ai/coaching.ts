
import { ChatMessage, BondScore, UserData, AiResult, GrowthLog } from "../../types";
import { getAiClient, getCleanText, extractJson, getSystemPrompt } from "./core";
import * as schemas from "../../lib/schemas";

/**
 * getCoachingResponse: Generates a contextual coaching response from Kindred.
 */
export const getCoachingResponse = async (
  message: string, 
  history: ChatMessage[] = [],
  user: UserData | null,
  context?: { 
    bondScores: BondScore[];
    foundation?: string;
    weeklySynthesis?: string;
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

/**
 * generateProactiveNudge: Analyzes the current relational state to offer a proactive insight.
 */
export const generateProactiveNudge = async (
  user: UserData | null,
  scores: BondScore[],
  logs: GrowthLog[]
): Promise<AiResult<string>> => {
  const ai = getAiClient();
  
  const recentLogs = logs.slice(0, 5).map(l => `${l.category}: ${l.delta > 0 ? '+' : ''}${l.delta} (${l.context})`).join('; ');
  const currentScores = scores.map(s => `${s.category}: ${s.score.toFixed(1)}`).join(', ');

  const prompt = `
    As Kindred, the soulful Oracle for this couple, analyze their recent shifts and current equilibrium.
    
    RELATIONAL STATE: ${currentScores}
    RECENT SHIFTS: ${recentLogs || "No recent shifts recorded."}
    
    TASK: Generate a single, profound, and proactive "whisper". 
    If you notice a dip (negative delta) in a specific area like Trust or Communication, address it gently.
    If you notice a plateau, suggest a new depth.
    The goal is to invite ${user?.userName} into a meaningful reflection without being prompted.
    Format: One short paragraph, highly poetic and architectural.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        temperature: 0.8,
        systemInstruction: getSystemPrompt(user)
      }
    });
    return { data: getCleanText(response), error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
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

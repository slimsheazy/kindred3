
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { UserData, BondScore } from "../../types";
import { ENV } from "../../lib/config";

let aiInstance: GoogleGenAI | null = null;

export const getAiClient = (): GoogleGenAI => {
  // Always use the latest API key from env/storage if it's dynamic, 
  // but here we follow the standard initialization rule.
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: ENV.API_KEY || (process.env.API_KEY as string) });
  }
  return aiInstance;
};

export const getCleanText = (response: GenerateContentResponse): string => {
  try {
    const text = response.text;
    if (text) return text.trim();
    
    // Safety fallback for unexpected response structures
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    return parts.filter(p => p.text).map(p => p.text).join("").trim();
  } catch (e) {
    console.warn("AI text extraction failed", e);
    return "";
  }
};

export const extractJson = (text: string): string => {
  try {
    const jsonBlockMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    return jsonBlockMatch ? jsonBlockMatch[0].trim() : text.trim();
  } catch (e) {
    return "[]";
  }
};

export const getSystemPrompt = (user: UserData | null, context?: { 
  bondScores: BondScore[];
}) => {
  const base = "You are Kindred, a soulful AI coach for couples. Use markdown for structured responses.";
  if (!user) return base;
  
  let prompt = `${base}\nCRITICAL IDENTITY PROTOCOL: You are speaking to ${user.userName}. Their partner is ${user.partnerName}. Focus on these areas: ${user.focusAreas?.join(', ') || 'Connection, Intimacy, Growth'}.`;
  
  if (context?.bondScores && context.bondScores.length > 0) {
    const scores = context.bondScores.map(s => `${s.category}: ${s.score.toFixed(1)}`).join(', ');
    prompt += `\nCURRENT EQUILIBRIUM: ${scores}`;
  }
  return prompt;
};

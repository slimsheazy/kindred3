import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { UserData, BondScore } from "../../types";
import { ENV } from "../../lib/config";

let aiInstance: GoogleGenAI | null = null;

export const getAiClient = (): GoogleGenAI => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: ENV.API_KEY });
  }
  return aiInstance;
};

export const getCleanText = (response: GenerateContentResponse): string => {
  try {
    return response.text.trim();
  } catch (e) {
    const parts = response.candidates?.[0]?.content?.parts || [];
    return parts.filter(p => p.text).map(p => p.text).join("").trim();
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
  const base = "You are Kindred, a soulful AI coach for couples. Use markdown.";
  if (!user) return base;
  
  let prompt = `${base}\nCRITICAL IDENTITY PROTOCOL: You are speaking to ${user.userName}. You are a private confidant for them. Their partner is ${user.partnerName}. Focus on these areas: ${user.focusAreas.join(', ')}.`;
  
  if (context) {
    if (context.bondScores && context.bondScores.length > 0) {
      const scores = context.bondScores.map(s => `${s.category}: ${s.score.toFixed(1)}`).join(', ');
      prompt += `\nCURRENT EQUILIBRIUM: ${scores}`;
    }
  }
  return prompt;
};
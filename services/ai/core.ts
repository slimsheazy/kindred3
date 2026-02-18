import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { UserData, BondScore } from "../../types";

let aiInstance: GoogleGenAI | null = null;

// Fix: Directly use process.env.API_KEY as per Google GenAI SDK guidelines
export const getAiClient = (): GoogleGenAI => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  }
  return aiInstance;
};

export const getCleanText = (response: GenerateContentResponse): string => {
  try {
    const text = response.text;
    if (text) return text.trim();
    
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
  foundation?: string;
  weeklySynthesis?: string;
}) => {
  const base = "You are Kindred, a soulful AI coach for couples. Use markdown for structured responses.";
  if (!user) return base;
  
  let prompt = `${base}\nCRITICAL IDENTITY PROTOCOL: You are speaking to ${user.userName}. Their partner is ${user.partnerName}.`;
  
  // Dynamic calibration based on relational age
  if (user.yearsTogether) {
    prompt += `\nRELATIONAL ARCHITECTURE: They have been together for ${user.yearsTogether} years. `;
    if (user.yearsTogether === "0-1") prompt += "Their focus is on exploration and building initial trust.";
    else if (user.yearsTogether === "7+") prompt += "Their focus is on sustained depth, legacy, and rekindling curiosity.";
  }

  prompt += `\nFOCUS AREAS: ${user.focusAreas?.join(', ') || 'Connection, Intimacy, Growth'}.`;
  
  if (context?.bondScores && context.bondScores.length > 0) {
    const scores = context.bondScores.map(s => `${s.category}: ${s.score.toFixed(1)}`).join(', ');
    prompt += `\nCURRENT EQUILIBRIUM: ${scores}`;
  }

  if (context?.foundation) {
    prompt += `\nRELATIONSHIP FOUNDATION: ${context.foundation}`;
  }

  return prompt;
};
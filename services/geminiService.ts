
import { GoogleGenAI, Type } from "@google/genai";
import { UserData, Activity, CourseModule, Lesson, QuizQuestion, MicroStep, JournalEntry, ChatMessage, BondScore, WeeklySynthesis, FoundationSummary } from "../types";

let currentUserData: UserData | null = null;

const getSystemPrompt = (context?: { journalEntries: JournalEntry[], bondScores: BondScore[], foundationSummary?: string }) => {
  const basePrompt = "You are a world-class, empathetic AI relationship coach from 'Kindred'. You use evidence-based frameworks like the Gottman Method and EFT. Your goal is to provide supportive, insightful, and practical advice. You have access to the couple's long-term history via a 'Foundation Summary' and their recent memories. Use markdown.";
  
  let dynamicPrompt = basePrompt;
  if (currentUserData) {
    const focusString = (currentUserData.focusAreas || []).join(', ');
    dynamicPrompt = `${basePrompt} You are coaching ${currentUserData.userName} and ${userDataPartnerName(currentUserData)}. Focus areas: ${focusString}.`;
  }

  if (context) {
    const entriesText = context.journalEntries.map(e => `[${e.date}]: ${e.text}`).join('\n');
    const scoresText = context.bondScores.map(s => `${s.category}: ${s.score.toFixed(1)}`).join(', ');
    
    dynamicPrompt += `\n\nLONG-TERM CONTEXT (The Foundation):
    ${context.foundationSummary || 'No foundation established yet.'}

    RECENT MEMORIES:
    ${entriesText || 'No recent entries yet.'}

    CURRENT BOND MAP EQUILIBRIUM (1-10 scale): ${scoresText}
    
    CRITICAL INSTRUCTION: Dynamically reference the Foundation Summary for deep continuity and the recent scores/memories for current relevance. Be the observant architect of their growth.`;
  }
  
  return dynamicPrompt;
};

const userDataPartnerName = (u: UserData) => u?.partnerName || 'Partner';

export const initializeGeminiContext = (userData: UserData) => {
  currentUserData = userData;
};

const extractJson = (text: string): string => {
  try {
    const jsonBlockMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (jsonBlockMatch) return jsonBlockMatch[0].trim();
    return text.trim();
  } catch (e) {
    return "[]";
  }
};

const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const getCoachingResponse = async (
  message: string, 
  history: ChatMessage[] = [],
  context?: { journalEntries: JournalEntry[], bondScores: BondScore[], foundationSummary?: string }
): Promise<string> => {
    try {
        const ai = getAiClient();
        const contents = history.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }));
        contents.push({ role: 'user', parts: [{ text: message }] });
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: contents as any,
            config: { systemInstruction: getSystemPrompt(context), temperature: 0.7 }
        });
        return response.text || "Kindred is observing silently. Please continue.";
    } catch (error) {
        return "Connection interrupted. Please verify your environment variables.";
    }
};

export const updateFoundationSummary = async (newEntries: JournalEntry[], currentSummary?: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const entriesText = newEntries.map(e => `[${e.date}]: ${e.text}`).join('\n---\n');
        const prompt = `You are the Kindred Architect. Update the 'Foundation Summary' of a relationship.
        EXISTING FOUNDATION: ${currentSummary || 'None.'}
        NEW MEMORIES: ${entriesText}
        Create a single, poetic, authoritative summary (200-300 words) of the relationship journey so far. This is long-term memory.`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { temperature: 0.5 } });
        return response.text?.trim() || currentSummary || "";
    } catch (error) {
        return currentSummary || "";
    }
};

export const generateWeeklySynthesis = async (entries: JournalEntry[], activities: Activity[]): Promise<{ poem: string, insight: string }> => {
    try {
        const ai = getAiClient();
        const journalText = entries.map(e => `- ${e.author}: ${e.text}`).join('\n');
        const activityText = activities.map(a => `- ${a.title} (${a.category})`).join('\n');
        const prompt = `Analyze history for ${currentUserData?.userName} and ${userDataPartnerName(currentUserData!)}.
        JOURNALS: ${journalText} | ACTIONS: ${activityText}
        1. Write a 3-stanza poem. 2. Provide one deep insight. Return JSON: {"poem": "...", "insight": "..."}`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { poem: { type: Type.STRING }, insight: { type: Type.STRING } },
                    required: ["poem", "insight"]
                }
            }
        });
        return JSON.parse(extractJson(response.text || '{}'));
    } catch (error) {
        return { poem: "The threads of time spin silently.", insight: "Your connection is a quiet garden." };
    }
};

export const generateJournalEchoes = async (entries: JournalEntry[]): Promise<{ synthesis: string, themes: string[] }> => {
    try {
        const ai = getAiClient();
        const historyText = entries.map(e => `[${e.date} by ${e.author}]: ${e.text}`).join('\n---\n');
        const prompt = `Synthesize these memories for ${currentUserData?.userName} and partner.
        ${historyText}
        Return JSON: {"synthesis": "...", "themes": ["...", "..."]}`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { synthesis: { type: Type.STRING }, themes: { type: Type.ARRAY, items: { type: Type.STRING } } },
                    required: ["synthesis", "themes"]
                }
            }
        });
        return JSON.parse(extractJson(response.text || '{}'));
    } catch (error) {
        return { synthesis: "The threads are weaving.", themes: [] };
    }
};

export const tagJournalEntry = async (text: string): Promise<string[]> => {
    try {
        const ai = getAiClient();
        const prompt = `Analyze memory: "${text}". Provide 3 short thematic tags. Return JSON array of strings.`;
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-flash-preview', 
            contents: prompt, 
            config: { 
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
            } 
        });
        return JSON.parse(extractJson(response.text || '[]'));
    } catch (error) {
        return ["Memory"];
    }
};

export const analyzeInteractionForScores = async (context: string): Promise<{ category: string, delta: number }[]> => {
    try {
        const ai = getAiClient();
        const prompt = `Analyze context: "${context}". Evaluate impact on: [Communication, Intimacy, Trust, Conflict, Shared Vision]. Return JSON array: [{"category": "...", "delta": 0.5}, ...]`;
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-flash-preview', 
            contents: prompt, 
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            category: { type: Type.STRING },
                            delta: { type: Type.NUMBER }
                        },
                        required: ["category", "delta"]
                    }
                }
            } 
        });
        return JSON.parse(extractJson(response.text || '[]'));
    } catch (e) {
        return [];
    }
}

export const generateGoalMicroSteps = async (goalTitle: string): Promise<MicroStep[]> => {
    try {
        const ai = getAiClient();
        const prompt = `Break down goal: "${goalTitle}" into 4 actionable steps. Return JSON array of strings.`;
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-flash-preview', 
            contents: prompt, 
            config: { 
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
            } 
        });
        const steps: string[] = JSON.parse(extractJson(response.text || '[]'));
        return steps.map((text, i) => ({ id: `step-${Date.now()}-${i}`, text, completed: false }));
    } catch (error) {
        return [];
    }
};

export const getGoalEncouragement = async (goalTitle: string, progress: number): Promise<string> => {
    try {
        const ai = getAiClient();
        const prompt = `Poetic encouragement for goal "${goalTitle}" at ${progress}%. One sentence.`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { temperature: 0.9 } });
        return response.text?.trim() || "Forward together.";
    } catch (error) {
        return "Your dedication strengthens the bond.";
    }
};

export const interpretSynchronicity = async (base64Image: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image } }, { text: "Kindred Oracle: Find a hidden metaphor for this couple's shared journey in this image. Brief, mystical, markdown." }] },
            config: { temperature: 0.9 }
        });
        return response.text || "The Oracle sees only silence.";
    } catch (error) {
        return "The lens is blurred.";
    }
};

export const generateQuizQuestions = async (topic: string): Promise<QuizQuestion[]> => {
    try {
        const ai = getAiClient();
        const prompt = `Generate 5 questions for a couples quiz: "${topic}". Return JSON array of objects.`;
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-flash-preview', 
            contents: prompt, 
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            question: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ["open", "multiple_choice"] },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["id", "question", "type"]
                    }
                }
            } 
        });
        return JSON.parse(extractJson(response.text || "[]"));
    } catch (error) {
        return [];
    }
};

export const interpretQuizResults = async (quizTitle: string, userAnswers: any[], partnerAnswers: any[]): Promise<string> => {
    try {
        const ai = getAiClient();
        const prompt = `Interpret quiz "${quizTitle}" results: ${JSON.stringify({ userAnswers, partnerAnswers })}. Synthesis + Insight. Markdown.`;
        const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt, config: { systemInstruction: getSystemPrompt(), temperature: 0.8 } });
        return response.text || "";
    } catch (error) {
        return "Your connection has its own rhythm.";
    }
};

export const generateLearningPath = async (): Promise<CourseModule[]> => {
    try {
        const ai = getAiClient();
        const prompt = `Generate initial 3-module learning path for Kindred. Focus: ${(currentUserData?.focusAreas || []).join(', ')}. Return JSON array of CourseModule.`;
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-flash-preview', 
            contents: prompt, 
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            description: { type: Type.STRING },
                            duration: { type: Type.STRING },
                            status: { type: Type.STRING, enum: ["active", "locked", "completed"] },
                            content: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        id: { type: Type.STRING },
                                        title: { type: Type.STRING },
                                        type: { type: Type.STRING, enum: ["Reading", "Exercise", "Prompt"] },
                                        description: { type: Type.STRING },
                                        longContent: { type: Type.STRING }
                                    },
                                    required: ["id", "title", "type", "description", "longContent"]
                                }
                            }
                        },
                        required: ["id", "title", "description", "duration", "status"]
                    }
                }
            } 
        });
        return JSON.parse(extractJson(response.text || "[]"));
    } catch (error) {
        return [];
    }
};

export const generateNextEvolutionPhase = async (bondScores: BondScore[], phaseNumber: number): Promise<CourseModule> => {
    try {
        const ai = getAiClient();
        const scoresText = bondScores.map(s => `${s.category}: ${s.score.toFixed(1)}/10`).join(', ');
        const prompt = `You are the Kindred Oracle Architect. The couple finished the foundation. 
        CURRENT EQUILIBRIUM: ${scoresText}.
        1. Identify the area with the LOWEST resonance.
        2. Architect Phase ${phaseNumber} (3 lessons) to specifically target that weakness.
        3. Write a 'rationale' explaining why this phase was chosen based on the scores.
        Return ONLY JSON object of CourseModule.`;
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: "application/json" } });
        return JSON.parse(extractJson(response.text || '{}'));
    } catch (error) {
        return { id: `evo-${Date.now()}`, title: "Infinite Growth", description: "Continuing the climb.", rationale: "Constant evolution is required for depth.", duration: "Ongoing", status: 'active', content: [] };
    }
};

export const generateActivities = async (vibe: string): Promise<Activity[]> => {
    try {
        const ai = getAiClient();
        const prompt = `Generate 4 relationship activities for Kindred with a "${vibe}" vibe. Return JSON array of Activity objects.`;
        const response = await ai.models.generateContent({ 
            model: 'gemini-3-flash-preview', 
            contents: prompt, 
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            category: { type: Type.STRING },
                            description: { type: Type.STRING },
                            duration: { type: Type.STRING },
                            difficulty: { type: Type.STRING },
                            isGenerated: { type: Type.BOOLEAN }
                        },
                        required: ["id", "title", "category", "description", "duration", "difficulty"]
                    }
                }
            } 
        });
        return JSON.parse(extractJson(response.text || "[]"));
    } catch (error) {
        return [];
    }
};

export const getDailyPrompt = async (): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: `Generate one deep daily connection prompt for a couple for Kindred. Focus: ${(currentUserData?.focusAreas || []).join(', ')}. No preamble.` });
        return response.text?.trim() || "What made you smile about us today?";
    } catch (error) {
        return "What made you feel seen today?";
    }
};

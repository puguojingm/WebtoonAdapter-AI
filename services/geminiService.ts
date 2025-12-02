import { GoogleGenAI } from "@google/genai";
import { MAIN_AGENT_SYSTEM_PROMPT, BREAKDOWN_ALIGNER_PROMPT, WEBTOON_ALIGNER_PROMPT } from '../constants';
import { AgentType } from '../types';

// Initialize Gemini Client
// NOTE: Process.env.API_KEY is assumed to be available.
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

// Helper to clean response text
const cleanText = (text: string | undefined) => text || "Error: No response generated.";

/**
 * Main Agent: Chat / Orchestration
 */
export const sendToMainAgent = async (
  history: { role: string; parts: { text: string }[] }[],
  newMessage: string,
  context: string
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash'; 
    const systemInstruction = `${MAIN_AGENT_SYSTEM_PROMPT}\n\nCurrent Context:\n${context}`;

    // Replay history to state (simplified for demo, ideally we maintain a persistent chat object)
    // We only send the last few turns to save tokens if history is long, 
    // but for this app we need context.
    
    // Let's iterate history to seed the chat
    const prompt = `
    HISTORY:
    ${history.map(h => `${h.role}: ${h.parts[0].text}`).join('\n')}
    
    USER NEW MESSAGE:
    ${newMessage}
    `;

    const result = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { systemInstruction }
    });

    return cleanText(result.text);

  } catch (error) {
    console.error("Main Agent Error:", error);
    return "❌ 主Agent暂时无法连接，请检查API Key或网络连接。";
  }
};

/**
 * Breakdown Aligner: Quality Check
 */
export const runBreakdownAligner = async (
  breakdownContent: string,
  originalNovelSegment: string
): Promise<string> => {
  try {
    const prompt = `
    TASK: Perform a quality check on the following Plot Breakdown based on the provided Novel Content.
    
    NOVEL CONTENT (Source):
    ${originalNovelSegment.substring(0, 5000)}... (truncated for context)
    
    PLOT BREAKDOWN (Target):
    ${breakdownContent}
    `;

    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction: BREAKDOWN_ALIGNER_PROMPT }
    });

    return cleanText(result.text);
  } catch (error) {
    console.error("Breakdown Aligner Error:", error);
    return "❌ Aligner Error: 无法执行检查。";
  }
};

/**
 * Webtoon Aligner: Consistency Check
 */
export const runWebtoonAligner = async (
  scriptContent: string,
  breakdownContext: string
): Promise<string> => {
  try {
    const prompt = `
    TASK: Perform a consistency check on the following Script Episode.
    
    PLOT BREAKDOWN (Reference):
    ${breakdownContext}
    
    SCRIPT CONTENT (Target):
    ${scriptContent}
    `;

    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction: WEBTOON_ALIGNER_PROMPT }
    });

    return cleanText(result.text);
  } catch (error) {
    console.error("Webtoon Aligner Error:", error);
    return "❌ Aligner Error: 无法执行检查。";
  }
};

/**
 * Specific Task: Generate Breakdown (Direct Call)
 */
export const generateBreakdownDirectly = async (novelContent: string, type: string): Promise<string> => {
    try {
        const prompt = `
        Context: The novel type is ${type}.
        Task: Perform plot breakdown for the following novel content (approx 6 chapters).
        Requirements: Extract conflicts, identify hooks, assign episodes (1-3 points per episode).
        
        NOVEL CONTENT:
        ${novelContent.substring(0, 15000)}
        `;

        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction: MAIN_AGENT_SYSTEM_PROMPT }
        });
        return cleanText(result.text);
    } catch (e) {
        console.error("Generate Breakdown Error:", e);
        return "Error generating breakdown.";
    }
}

/**
 * Specific Task: Generate Script (Direct Call)
 */
export const generateScriptDirectly = async (breakdownPoints: string, episodeNum: number): Promise<string> => {
    try {
        const prompt = `
        Task: Write the script for Episode ${episodeNum}.
        Use the following plot points:
        ${breakdownPoints}
        `;

        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction: MAIN_AGENT_SYSTEM_PROMPT }
        });
        return cleanText(result.text);
    } catch (e) {
        console.error("Generate Script Error:", e);
        return "Error generating script.";
    }
}

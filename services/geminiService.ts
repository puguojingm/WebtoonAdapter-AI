
import { GoogleGenAI } from "@google/genai";
import { 
  BREAKDOWN_WORKER_PROMPT, 
  BREAKDOWN_ALIGNER_PROMPT, 
  SCRIPT_WORKER_PROMPT, 
  WEBTOON_ALIGNER_PROMPT,
  ADAPT_METHOD,
  OUTPUT_STYLE,
  PLOT_TEMPLATE,
  SCRIPT_TEMPLATE 
} from '../constants';
import { NovelChapter, PlotPoint } from '../types';

const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

const cleanText = (text: string | undefined) => text || "";

// Helper: Agent Execution Loop
async function agentLoop(
  workerSystemPrompt: string,
  alignerSystemPrompt: string,
  workerTaskPrompt: string,
  alignerContextPrompt: (output: string) => string,
  maxRetries = 3,
  onProgress?: (status: string) => void
): Promise<{ content: string; status: 'PASS' | 'FAIL'; report: string }> {
  
  let currentOutput = "";
  let feedback = "";
  let retries = 0;

  while (retries < maxRetries) {
    // 1. Worker Step
    onProgress?.(retries === 0 ? "Worker: Generating content..." : `Worker: Refining content (Attempt ${retries + 1})...`);
    
    let fullWorkerPrompt = workerTaskPrompt;
    if (feedback) {
      fullWorkerPrompt += `\n\n[Previous Feedback - Please Fix]\n${feedback}`;
    }

    try {
      const workerRes = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullWorkerPrompt,
        config: { systemInstruction: workerSystemPrompt }
      });
      currentOutput = cleanText(workerRes.text);
    } catch (e) {
      return { content: currentOutput, status: 'FAIL', report: "API Error during generation." };
    }

    // 2. Aligner Step
    onProgress?.("Aligner: Checking quality...");
    const alignerPrompt = alignerContextPrompt(currentOutput);
    
    try {
      const alignerRes = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: alignerPrompt,
        config: { systemInstruction: alignerSystemPrompt }
      });
      const report = cleanText(alignerRes.text);

      if (report.includes("PASS")) {
        return { content: currentOutput, status: 'PASS', report };
      } else {
        feedback = report;
        retries++;
      }
    } catch (e) {
       // If aligner fails, we assume pass to avoid getting stuck, or return fail.
       return { content: currentOutput, status: 'FAIL', report: "API Error during alignment." };
    }
  }

  return { content: currentOutput, status: 'FAIL', report: "Max retries reached. Last feedback: " + feedback };
}

/**
 * Breakdown Agent Loop
 */
export const generateBreakdownBatch = async (
  chapters: NovelChapter[],
  novelType: string,
  onUpdate: (msg: string) => void
) => {
  const chapterText = chapters.map(c => `Chapter ${c.name}:\n${c.content}`).join("\n\n");
  
  const workerTask = `
  NOVEL TYPE: ${novelType}
  
  TASK: Breakdown the following 6 chapters into plot points.
  
  CONTEXT (Adapt Method):
  ${ADAPT_METHOD}
  
  TEMPLATE:
  ${PLOT_TEMPLATE}
  
  NOVEL CONTENT:
  ${chapterText.substring(0, 30000)} 
  `;

  const alignerPromptBuilder = (output: string) => `
  TASK: Check the quality of this plot breakdown.
  
  ORIGINAL NOVEL:
  ${chapterText.substring(0, 5000)}... (truncated)
  
  GENERATED BREAKDOWN:
  ${output}
  `;

  return agentLoop(
    BREAKDOWN_WORKER_PROMPT,
    BREAKDOWN_ALIGNER_PROMPT,
    workerTask,
    alignerPromptBuilder,
    3,
    onUpdate
  );
};

/**
 * Script Agent Loop
 */
export const generateScriptEpisode = async (
  episodeNum: number,
  plotPoints: PlotPoint[],
  relatedChapters: string, // content of relevant chapters
  onUpdate: (msg: string) => void
) => {
  const plotText = plotPoints.map(p => p.content).join("\n");
  
  const workerTask = `
  TASK: Write Script for Episode ${episodeNum}.
  
  PLOT POINTS:
  ${plotText}
  
  SOURCE NOVEL CONTENT:
  ${relatedChapters.substring(0, 20000)}
  
  KNOWLEDGE (Method & Style):
  ${ADAPT_METHOD}
  ${OUTPUT_STYLE}
  
  TEMPLATE:
  ${SCRIPT_TEMPLATE}
  `;

  const alignerPromptBuilder = (output: string) => `
  TASK: Check consistency of this script.
  
  PLOT POINTS:
  ${plotText}
  
  GENERATED SCRIPT:
  ${output}
  `;

  return agentLoop(
    SCRIPT_WORKER_PROMPT,
    WEBTOON_ALIGNER_PROMPT,
    workerTask,
    alignerPromptBuilder,
    3,
    onUpdate
  );
};

// Parser Helpers
export const parsePlotPoints = (text: string, batchIdx: number): PlotPoint[] => {
  const lines = text.split('\n');
  const points: PlotPoint[] = [];
  const regex = /【(剧情\d+)】(.*?)，(.*?)(?:，|,)第(\d+)集(?:，|,)状态[：:](.*)/;

  lines.forEach(line => {
    const match = line.match(regex);
    if (match) {
      points.push({
        id: match[1],
        content: line,
        scene: match[2].trim(), // Simplified parsing
        action: match[3].trim(),
        hookType: "Extract from action if needed",
        episode: parseInt(match[4]),
        status: 'unused',
        batchIndex: batchIdx
      });
    }
  });
  return points;
};

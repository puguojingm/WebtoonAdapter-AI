
export enum AgentType {
  MAIN = 'Main Agent',
  BREAKDOWN_ALIGNER = 'Breakdown Aligner',
  WEBTOON_ALIGNER = 'Webtoon Aligner'
}

export enum NovelType {
  FANTASY = '玄幻',
  WUXIA = '武侠',
  URBAN = '都市',
  ROMANCE = '言情',
  ANCIENT_ROMANCE = '古言',
  SUSPENSE = '悬疑',
  MYSTERY = '推理',
  SCI_FI = '科幻',
  DOOMSDAY = '末世',
  REBIRTH = '重生'
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  agent?: AgentType;
}

export interface UploadedFile {
  name: string;
  content: string;
  timestamp: number;
}

export interface ScriptFile {
  episode: number;
  content: string;
  status: 'draft' | 'approved' | 'rejected';
  alignerReport?: string;
}

export interface ProjectState {
  title: string;
  type: NovelType | string;
  files: UploadedFile[];
  breakdown: string;
  breakdownReport?: string;
  scripts: ScriptFile[];
  currentView: 'settings' | 'source' | 'breakdown' | 'scripts';
  isProcessing: boolean;
  processingStatus: string; // "Generating breakdown...", "Checking quality..."
}
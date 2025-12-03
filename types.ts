

export enum AgentType {
  MAIN = 'Master Agent',
  BREAKDOWN_WORKER = 'Breakdown Worker',
  BREAKDOWN_ALIGNER = 'Breakdown Aligner',
  SCRIPT_WORKER = 'Script Worker',
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

export interface NovelChapter {
  id: string;
  name: string;
  content: string;
  order: number;
}

export interface PlotPoint {
  id: string; // e.g. "剧情1"
  content: string; // Full text line
  scene: string;
  action: string;
  hookType: string;
  episode: number;
  status: 'unused' | 'used';
  batchIndex: number; // Which batch this belongs to
}

export interface PlotBatch {
  index: number;
  chapterRange: string; // "1-6"
  content: string; // Raw markdown content
  points: PlotPoint[];
  status: 'pending' | 'approved' | 'rejected';
  report?: string;
}

export interface ScriptFile {
  episode: number;
  title: string;
  content: string;
  status: 'draft' | 'approved' | 'rejected';
  alignerReport?: string;
}

export interface UserInfo {
  username: string;
  avatar: string;
  phone: string;
  email: string;
  balance: number;
  registerDate: string;
  lastLogin: string;
}

export interface ProjectState {
  title: string;
  type: NovelType | string;
  description: string;
  
  // Data
  chapters: NovelChapter[];
  plotBatches: PlotBatch[];
  scripts: ScriptFile[];
  
  // User
  userInfo: UserInfo;

  // View State
  currentView: 'settings' | 'source' | 'breakdown' | 'scripts';
  
  // Processing State
  isProcessing: boolean;
  processingStatus: string; // Message to show
  activeAgent?: AgentType;
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  agent?: AgentType;
  timestamp: string | number;
}
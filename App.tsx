import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { FileUploader } from './components/FileUploader';
import { SourceViewer } from './components/SourceViewer';
import { PlotViewer } from './components/PlotViewer';
import { ProjectState, NovelType, ScriptFile, NovelChapter, PlotBatch } from './types';
import * as GeminiService from './services/geminiService';
import { CheckCircle, RefreshCw, Plus, ChevronRight, User } from 'lucide-react';

// Mock User Data
const MOCK_USER = {
  username: "Writer_001",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  phone: "138****0000",
  email: "writer@example.com",
  balance: 1200,
  registerDate: "2023-10-01",
  lastLogin: "2023-10-27 10:30"
};

const App: React.FC = () => {
  // --- State ---
  const [project, setProject] = useState<ProjectState>({
    title: '',
    type: NovelType.FANTASY,
    description: '',
    chapters: [],
    plotBatches: [],
    scripts: [],
    userInfo: MOCK_USER,
    currentView: 'settings',
    isProcessing: false,
    processingStatus: '',
    activeAgent: undefined
  });

  const [activeEpisodeIdx, setActiveEpisodeIdx] = useState<number>(0);

  // --- Actions ---

  const handleUpdateProject = (updates: Partial<ProjectState>) => {
    setProject(prev => ({ ...prev, ...updates }));
  };

  const handleFileUpload = (content: string, fileName: string) => {
    // Attempt to parse chapter number for sorting
    let order = 9999;
    const match = fileName.match(/(\d+)/);
    if (match) order = parseInt(match[1]);

    const newChapter: NovelChapter = {
      id: `chap-${Date.now()}-${Math.random()}`,
      name: fileName.replace('.txt', ''),
      content: content,
      order: order
    };

    setProject(prev => {
      const updatedChapters = [...prev.chapters, newChapter].sort((a, b) => a.order - b.order);
      return { ...prev, chapters: updatedChapters };
    });
  };

  // --- AI Operations ---

  const handleBreakdownBatch = async () => {
    if (project.chapters.length === 0) {
      alert("请先上传小说章节！");
      return;
    }

    const startIdx = project.plotBatches.length * 6;
    const nextChapters = project.chapters.slice(startIdx, startIdx + 6);

    if (nextChapters.length === 0) {
      alert("所有已上传章节均已拆解！请上传更多章节。");
      return;
    }

    handleUpdateProject({ isProcessing: true, processingStatus: '初始化 Breakdown Agent...' });

    const result = await GeminiService.generateBreakdownBatch(
      nextChapters, 
      project.type, 
      (status) => handleUpdateProject({ processingStatus: status })
    );

    const points = GeminiService.parsePlotPoints(result.content, project.plotBatches.length);

    // Use safe access and extraction to avoid TS errors in object literal
    const startOrder = nextChapters[0].order;
    const endOrder = nextChapters[nextChapters.length - 1].order;

    const newBatch: PlotBatch = {
      index: project.plotBatches.length,
      chapterRange: `${startOrder}-${endOrder}`,
      content: result.content,
      points: points,
      status: result.status === 'PASS' ? 'approved' : 'rejected', // In loop logic, we might accept FAIL if retries exhausted
      report: result.report
    };

    setProject(prev => ({
      ...prev,
      plotBatches: [...prev.plotBatches, newBatch],
      isProcessing: false,
      processingStatus: ''
    }));
  };

  const handleGenerateScript = async () => {
    // Find next episode to write
    // 1. Flatten all unused plot points
    // 2. Find points belonging to next episode number
    
    // Logic: Look at last script episode number. Next is +1.
    const lastScript = project.scripts[project.scripts.length - 1];
    const lastEp = lastScript?.episode ?? 0;
    const nextEp = lastEp + 1;

    // Find unused points for this episode
    // We search across all batches
    const unusedPoints = project.plotBatches
      .flatMap(b => b.points)
      .filter(p => p.episode === nextEp && p.status === 'unused');

    if (unusedPoints.length === 0) {
      // Check if we have unused points for ANY episode greater than current
      const anyUnused = project.plotBatches.flatMap(b => b.points).some(p => p.status === 'unused');
      if (anyUnused) {
         alert(`找不到第 ${nextEp} 集的剧情点。请检查剧情拆解的分集编号。`);
      } else {
         alert("没有可用的剧情点！请先进行剧情拆解。");
      }
      return;
    }

    handleUpdateProject({ isProcessing: true, processingStatus: `初始化 Script Agent (第 ${nextEp} 集)...` });

    // Collect related content (naive approach: get content from the batch these points belong to)
    // In a real app, we'd map points to chapters more precisely. Here we grab the whole batch content.
    const uniqueBatchIndices = Array.from(new Set(unusedPoints.map(p => p.batchIndex)));
    let relatedContent = "";
    uniqueBatchIndices.forEach(idx => {
       // Find chapters for this batch
       const startIdx = idx * 6;
       const chaps = project.chapters.slice(startIdx, startIdx + 6);
       relatedContent += chaps.map(c => c.content).join("\n");
    });

    const result = await GeminiService.generateScriptEpisode(
      nextEp,
      unusedPoints,
      relatedContent,
      (status) => handleUpdateProject({ processingStatus: status })
    );

    const newScript: ScriptFile = {
      episode: nextEp,
      title: `第 ${nextEp} 集`, // Parse title from content if possible
      content: result.content,
      status: result.status === 'PASS' ? 'approved' : 'rejected',
      alignerReport: result.report
    };

    setProject(prev => {
        // Mark points as used
        const updatedBatches = prev.plotBatches.map(b => ({
            ...b,
            points: b.points.map(p => 
                unusedPoints.find(up => up.id === p.id) ? { ...p, status: 'used' as const } : p
            )
        }));

        return {
            ...prev,
            plotBatches: updatedBatches,
            scripts: [...prev.scripts, newScript],
            isProcessing: false,
            processingStatus: ''
        };
    });
    
    setActiveEpisodeIdx(project.scripts.length); // Select new script
  };

  // --- Views ---

  const renderSettings = () => (
    <div className="max-w-4xl mx-auto p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">项目设置</h2>
      
      {/* User Info Card */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white mb-8 shadow-lg">
        <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white p-1">
                <img src={project.userInfo.avatar} alt="avatar" className="w-full h-full rounded-full" />
            </div>
            <div>
                <h3 className="text-xl font-bold">{project.userInfo.username}</h3>
                <p className="text-indigo-100 text-sm">余额: {project.userInfo.balance} 漫剧币</p>
                <div className="flex gap-4 mt-2 text-xs text-indigo-200">
                    <span>{project.userInfo.phone}</span>
                    <span>{project.userInfo.email}</span>
                </div>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">项目名称</label>
          <input 
            type="text" 
            value={project.title}
            onChange={(e) => handleUpdateProject({ title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="例如：斗破苍穹"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">小说简介</label>
          <textarea 
            value={project.description}
            onChange={(e) => handleUpdateProject({ description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
            placeholder="简要描述小说内容..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">小说类型</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.values(NovelType).map((type) => (
              <button
                key={type}
                onClick={() => handleUpdateProject({ type })}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                  project.type === type 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        <div className="pt-4 flex justify-end">
           <button 
             onClick={() => handleUpdateProject({ currentView: 'source' })}
             className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md transition-all"
           >
             创建项目 <ChevronRight className="w-4 h-4 ml-1" />
           </button>
        </div>
      </div>
    </div>
  );

  const renderSource = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center">
         <h2 className="text-lg font-bold text-gray-800">小说原稿</h2>
         <div className="w-64">
             <FileUploader onUpload={handleFileUpload} />
         </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <SourceViewer chapters={project.chapters} />
      </div>
    </div>
  );

  const renderScripts = () => {
      const activeScript = project.scripts[activeEpisodeIdx];
      return (
        <div className="flex h-full">
          {/* List */}
          <div className="w-64 border-r border-gray-200 bg-white flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
               <button 
                 onClick={handleGenerateScript}
                 disabled={project.isProcessing}
                 className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50 transition-all shadow-sm"
               >
                 <Plus className="w-4 h-4 mr-2" />
                 AI 生成下一集
               </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {project.scripts.map((script, idx) => (
                <button
                  key={script.episode}
                  onClick={() => setActiveEpisodeIdx(idx)}
                  className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    idx === activeEpisodeIdx ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-gray-800">第 {script.episode} 集</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      script.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {script.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">{script.title}</div>
                </button>
              ))}
              {project.scripts.length === 0 && (
                  <div className="p-8 text-center text-gray-400 text-sm">暂无剧本</div>
              )}
            </div>
          </div>

          {/* Editor */}
          {activeScript ? (
            <div className="flex-1 flex h-full">
              <div className="flex-1 flex flex-col bg-white">
                 <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm z-10">
                    <h3 className="font-bold text-gray-800">剧本内容</h3>
                    <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold flex items-center ${
                             activeScript.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                            {activeScript.status === 'approved' ? <CheckCircle className="w-3 h-3 mr-1"/> : null} 
                            {activeScript.status === 'approved' ? 'Aligner PASS' : 'Aligner FAIL'}
                        </span>
                    </div>
                 </div>
                 <textarea
                    value={activeScript.content}
                    readOnly
                    className="flex-1 p-8 font-mono text-sm leading-relaxed resize-none focus:outline-none text-gray-800 bg-white"
                 />
              </div>
              {/* Report Panel */}
              {activeScript.alignerReport && (
                 <div className="w-80 bg-gray-50 border-l border-gray-200 overflow-y-auto p-4">
                    <div className="font-bold text-sm text-gray-900 mb-4 pb-2 border-b">质量检查报告</div>
                    <div className="text-xs whitespace-pre-wrap text-gray-600">
                        {activeScript.alignerReport}
                    </div>
                 </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-400">
                请生成或选择一集剧本
            </div>
          )}
        </div>
      );
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar 
        project={project} 
        onViewChange={(view) => handleUpdateProject({ currentView: view })}
        currentView={project.currentView}
      />
      
      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        {project.currentView === 'settings' && renderSettings()}
        {project.currentView === 'source' && renderSource()}
        {project.currentView === 'breakdown' && (
          <PlotViewer 
            batches={project.plotBatches} 
            onGenerateNext={handleBreakdownBatch}
            isProcessing={project.isProcessing}
          />
        )}
        {project.currentView === 'scripts' && renderScripts()}

        {/* Global Loading Overlay */}
        {project.isProcessing && (
           <div className="absolute bottom-4 right-4 bg-gray-900/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center text-sm z-50 backdrop-blur-sm animate-fade-in">
              <RefreshCw className="w-4 h-4 mr-3 animate-spin text-indigo-400" />
              <span>{project.processingStatus}</span>
           </div>
        )}
      </main>
    </div>
  );
};

export default App;
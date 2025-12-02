
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { FileUploader } from './components/FileUploader';
import { ProjectState, NovelType, ScriptFile } from './types';
import * as GeminiService from './services/geminiService';
import { Save, Play, CheckCircle, AlertTriangle, FileText, Plus, RefreshCw, ChevronRight, Layers } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [project, setProject] = useState<ProjectState>({
    title: '',
    type: '',
    files: [],
    breakdown: '',
    scripts: [],
    currentView: 'settings',
    isProcessing: false,
    processingStatus: ''
  });

  const [activeEpisodeIdx, setActiveEpisodeIdx] = useState<number>(0);

  // --- Helper Getters ---
  const fullNovelContent = project.files.map(f => f.content).join('\n\n');

  // --- Actions ---

  const handleUpdateProject = (updates: Partial<ProjectState>) => {
    setProject(prev => ({ ...prev, ...updates }));
  };

  const handleFileUpload = (content: string, fileName: string) => {
    setProject(prev => ({
      ...prev,
      files: [...prev.files, { name: fileName, content, timestamp: Date.now() }]
    }));
  };

  const setProcessing = (status: string) => {
    setProject(prev => ({ ...prev, isProcessing: true, processingStatus: status }));
  };

  const clearProcessing = () => {
    setProject(prev => ({ ...prev, isProcessing: false, processingStatus: '' }));
  };

  // --- AI Operations ---

  const handleGenerateBreakdown = async () => {
    if (!fullNovelContent) {
      alert("请先上传小说文件！");
      return;
    }
    setProcessing('正在进行剧情拆解 (Webtoon Skill)...');
    
    const breakdown = await GeminiService.generateBreakdownDirectly(fullNovelContent, project.type || '玄幻');
    
    handleUpdateProject({ breakdown, breakdownReport: undefined }); // Clear previous report
    clearProcessing();
  };

  const handleCheckBreakdown = async () => {
    if (!project.breakdown) return;
    setProcessing('正在进行拆解质量检查 (Breakdown Aligner)...');

    const report = await GeminiService.runBreakdownAligner(project.breakdown, fullNovelContent);
    
    handleUpdateProject({ breakdownReport: report });
    clearProcessing();
  };

  const handleGenerateScript = async (episodeNum: number) => {
    if (!project.breakdown) {
      alert("请先完成剧情拆解！");
      return;
    }
    setProcessing(`正在生成第 ${episodeNum} 集剧本...`);

    const content = await GeminiService.generateScriptDirectly(project.breakdown, episodeNum);
    
    // Check if script exists, update or add
    const existingIdx = project.scripts.findIndex(s => s.episode === episodeNum);
    let newScripts = [...project.scripts];
    const newScript: ScriptFile = { episode: episodeNum, content, status: 'draft' };

    if (existingIdx >= 0) {
      newScripts[existingIdx] = newScript;
    } else {
      newScripts.push(newScript);
    }
    // Sort scripts by episode
    newScripts.sort((a, b) => a.episode - b.episode);

    handleUpdateProject({ scripts: newScripts });
    setActiveEpisodeIdx(newScripts.findIndex(s => s.episode === episodeNum));
    clearProcessing();
  };

  const handleCheckScript = async (script: ScriptFile) => {
    setProcessing(`正在检查第 ${script.episode} 集一致性 (Webtoon Aligner)...`);

    const report = await GeminiService.runWebtoonAligner(script.content, project.breakdown);
    
    const updatedScripts = project.scripts.map(s => 
      s.episode === script.episode 
        ? { ...s, alignerReport: report, status: report.includes('PASS') ? 'approved' : 'rejected' as any }
        : s
    );

    handleUpdateProject({ scripts: updatedScripts });
    clearProcessing();
  };

  // --- Render Views ---

  const renderSettingsView = () => (
    <div className="max-w-4xl mx-auto p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">项目设置</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">小说名称</label>
          <input 
            type="text" 
            value={project.title}
            onChange={(e) => handleUpdateProject({ title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="例如：斗破苍穹"
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
             className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
           >
             下一步：导入小说 <ChevronRight className="w-4 h-4 ml-1" />
           </button>
        </div>
      </div>
    </div>
  );

  const renderSourceView = () => (
    <div className="flex h-full">
       <div className="w-1/3 border-r border-gray-200 bg-white p-6 overflow-y-auto">
          <h2 className="text-lg font-bold text-gray-900 mb-4">文件管理</h2>
          <FileUploader onUpload={handleFileUpload} />
          
          <div className="mt-6 space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase">已上传章节</h3>
            {project.files.length === 0 && <p className="text-sm text-gray-400 italic">暂无文件</p>}
            {project.files.map((file, idx) => (
              <div key={idx} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <FileText className="w-4 h-4 text-indigo-500 mr-3" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{file.name}</div>
                  <div className="text-xs text-gray-500">{new Date(file.timestamp).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
       </div>
       <div className="w-2/3 bg-gray-50 p-6 flex flex-col h-full">
          <h2 className="text-lg font-bold text-gray-900 mb-4">内容预览 (合并)</h2>
          <textarea
            readOnly
            value={fullNovelContent || "请在左侧上传文件..."}
            className="flex-1 w-full p-4 bg-white border border-gray-200 rounded-lg font-mono text-sm text-gray-600 resize-none focus:outline-none"
          />
       </div>
    </div>
  );

  const renderBreakdownView = () => (
    <div className="flex h-full">
      {/* Editor Area */}
      <div className="flex-1 flex flex-col border-r border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
           <h2 className="font-bold text-gray-800 flex items-center">
             <Layers className="w-5 h-5 mr-2 text-indigo-600" />
             Plot Breakdown
           </h2>
           <div className="flex gap-2">
             <button 
               onClick={handleGenerateBreakdown}
               disabled={project.isProcessing}
               className="flex items-center px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50"
             >
               <RefreshCw className={`w-4 h-4 mr-2 ${project.isProcessing ? 'animate-spin' : ''}`} />
               {project.breakdown ? '重新生成' : 'AI 拆解'}
             </button>
             <button 
               onClick={handleCheckBreakdown}
               disabled={!project.breakdown || project.isProcessing}
               className="flex items-center px-3 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50"
             >
               <CheckCircle className="w-4 h-4 mr-2" />
               质量检查
             </button>
           </div>
        </div>
        <textarea
          value={project.breakdown}
          onChange={(e) => handleUpdateProject({ breakdown: e.target.value })}
          placeholder="AI 将在此处生成剧情拆解..."
          className="flex-1 p-6 font-mono text-sm leading-relaxed resize-none focus:outline-none text-gray-800"
        />
      </div>

      {/* Report Area */}
      {project.breakdownReport && (
        <div className="w-96 bg-gray-50 p-4 border-l border-gray-200 overflow-y-auto">
          <div className="flex items-center mb-4">
             <AlertTriangle className="w-5 h-5 text-orange-500 mr-2" />
             <h3 className="font-bold text-gray-800">Breakdown Aligner 报告</h3>
          </div>
          <div className={`p-4 rounded-lg text-sm whitespace-pre-wrap border ${
            project.breakdownReport.includes('PASS') 
              ? 'bg-green-50 border-green-200 text-green-900' 
              : 'bg-red-50 border-red-200 text-red-900'
          }`}>
            {project.breakdownReport}
          </div>
        </div>
      )}
    </div>
  );

  const renderScriptsView = () => {
    const activeScript = project.scripts[activeEpisodeIdx];

    return (
      <div className="flex h-full">
        {/* Sidebar List */}
        <div className="w-64 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
             <button 
               onClick={() => handleGenerateScript(project.scripts.length + 1)}
               disabled={project.isProcessing}
               className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
             >
               <Plus className="w-4 h-4 mr-2" />
               生成第 {project.scripts.length + 1} 集
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
                    script.status === 'approved' ? 'bg-green-100 text-green-700' :
                    script.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {script.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500 truncate">{script.content.substring(0, 30)}...</div>
              </button>
            ))}
            {project.scripts.length === 0 && (
              <div className="p-6 text-center text-gray-400 text-sm">
                暂无剧本，请点击上方按钮生成。
              </div>
            )}
          </div>
        </div>

        {/* Script Editor */}
        {activeScript ? (
          <div className="flex-1 flex h-full">
             <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
                  <h3 className="font-bold text-gray-800">剧本编辑器 - 第 {activeScript.episode} 集</h3>
                  <button 
                    onClick={() => handleCheckScript(activeScript)}
                    disabled={project.isProcessing}
                    className="flex items-center px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    一致性检查 (Webtoon Aligner)
                  </button>
                </div>
                <textarea
                  value={activeScript.content}
                  onChange={(e) => {
                    const newScripts = [...project.scripts];
                    newScripts[activeEpisodeIdx] = { ...activeScript, content: e.target.value, status: 'draft' };
                    handleUpdateProject({ scripts: newScripts });
                  }}
                  className="flex-1 p-8 font-mono text-sm leading-relaxed resize-none focus:outline-none bg-gray-50 text-gray-800"
                />
             </div>
             {/* Script Aligner Report */}
             {activeScript.alignerReport && (
                <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto p-4 shadow-xl z-10">
                   <div className="font-bold text-sm text-gray-900 mb-4 pb-2 border-b">Webtoon Aligner 反馈</div>
                   <div className={`text-xs whitespace-pre-wrap p-3 rounded ${
                     activeScript.alignerReport.includes('PASS')
                       ? 'bg-green-50 text-green-800'
                       : 'bg-red-50 text-red-800'
                   }`}>
                     {activeScript.alignerReport}
                   </div>
                </div>
             )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-400">
             请选择或生成一集剧本
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      <Sidebar 
        project={project} 
        onViewChange={(view) => handleUpdateProject({ currentView: view })}
        currentView={project.currentView}
      />
      
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Top Bar can be added here if needed, but sidebar has title */}
        <div className="flex-1 overflow-hidden">
          {project.currentView === 'settings' && renderSettingsView()}
          {project.currentView === 'source' && renderSourceView()}
          {project.currentView === 'breakdown' && renderBreakdownView()}
          {project.currentView === 'scripts' && renderScriptsView()}
        </div>
      </main>
    </div>
  );
};

export default App;
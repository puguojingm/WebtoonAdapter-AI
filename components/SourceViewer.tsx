
import React, { useState } from 'react';
import { NovelChapter } from '../types';
import { FileText } from 'lucide-react';

interface SourceViewerProps {
  chapters: NovelChapter[];
}

export const SourceViewer: React.FC<SourceViewerProps> = ({ chapters }) => {
  const [selectedId, setSelectedId] = useState<string | null>(chapters.length > 0 ? chapters[0].id : null);

  const selectedChapter = chapters.find(c => c.id === selectedId);

  return (
    <div className="flex h-full bg-white border-t border-gray-200">
      {/* Chapter List */}
      <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col">
        <div className="p-4 border-b border-gray-200 font-bold text-gray-700 bg-gray-100">
          章节列表 ({chapters.length})
        </div>
        <div className="flex-1 overflow-y-auto">
          {chapters.map(chapter => (
            <button
              key={chapter.id}
              onClick={() => setSelectedId(chapter.id)}
              className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 hover:bg-gray-100 transition-colors flex items-center ${
                selectedId === chapter.id ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-600' : 'text-gray-600'
              }`}
            >
              <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{chapter.name}</span>
            </button>
          ))}
          {chapters.length === 0 && (
            <div className="p-4 text-center text-gray-400 text-xs">暂无章节</div>
          )}
        </div>
      </div>

      {/* Content Viewer */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {selectedChapter ? (
          <>
            <div className="p-4 border-b border-gray-200 bg-white shadow-sm z-10">
              <h2 className="text-lg font-bold text-gray-900">{selectedChapter.name}</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-white">
              <div className="max-w-3xl mx-auto whitespace-pre-wrap font-serif text-lg leading-loose text-gray-800">
                {selectedChapter.content}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            请选择章节查看内容
          </div>
        )}
      </div>
    </div>
  );
};

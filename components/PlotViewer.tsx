
import React from 'react';
import { PlotBatch, PlotPoint } from '../types';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface PlotViewerProps {
  batches: PlotBatch[];
  onGenerateNext: () => void;
  isProcessing: boolean;
}

export const PlotViewer: React.FC<PlotViewerProps> = ({ batches, onGenerateNext, isProcessing }) => {
  return (
    <div className="h-full bg-gray-50 flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white shadow-sm flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">剧情拆解 (Plot Breakdown)</h2>
        <button
          onClick={onGenerateNext}
          disabled={isProcessing}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors"
        >
          {isProcessing ? 'AI 拆解中...' : '拆解下一批 (6章)'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {batches.map((batch) => (
          <div key={batch.index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                 <span className="font-bold text-gray-800 text-sm">第 {batch.index + 1} 批次</span>
                 <span className="ml-2 text-xs text-gray-500">({batch.chapterRange}章)</span>
              </div>
              <div className="flex items-center gap-2">
                 {batch.status === 'approved' ? (
                   <span className="flex items-center text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">
                     <CheckCircle className="w-3 h-3 mr-1" /> 通过 (PASS)
                   </span>
                 ) : (
                   <span className="flex items-center text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                     <Clock className="w-3 h-3 mr-1" /> 检查中
                   </span>
                 )}
              </div>
            </div>

            {/* Structured Points */}
            <div className="divide-y divide-gray-100">
              {batch.points.map((point) => (
                <div key={point.id} className="p-4 hover:bg-gray-50 transition-colors flex gap-4">
                  <div className="flex-shrink-0 w-24">
                    <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded mb-1">
                      {point.id}
                    </span>
                    <div className="text-xs text-gray-500">第 {point.episode} 集</div>
                  </div>
                  <div className="flex-1">
                     <div className="text-sm text-gray-800 font-medium mb-1">{point.content.split('，')[0]}</div>
                     <div className="text-sm text-gray-600">{point.content}</div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      point.status === 'used' ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-700'
                    }`}>
                      {point.status === 'used' ? '已使用' : '未用'}
                    </span>
                  </div>
                </div>
              ))}
              {batch.points.length === 0 && (
                <div className="p-6 text-sm text-gray-500 font-mono whitespace-pre-wrap bg-gray-50">
                   {batch.content} 
                </div>
              )}
            </div>
            
            {/* Report */}
            {batch.report && (
                <div className="bg-gray-50 p-4 border-t border-gray-200 text-xs text-gray-600">
                    <div className="font-bold mb-1 flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" /> 质量报告:
                    </div>
                    {batch.report}
                </div>
            )}
          </div>
        ))}

        {batches.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            暂无拆解内容，请点击右上角按钮开始拆解。
          </div>
        )}
      </div>
    </div>
  );
};

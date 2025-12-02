
import React from 'react';
import { UploadCloud } from 'lucide-react';

interface FileUploaderProps {
  onUpload: (content: string, fileName: string) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onUpload }) => {
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const text = await file.text();
      onUpload(text, file.name);
    }
  };

  return (
    <div className="w-full">
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-indigo-50 hover:border-indigo-300 transition-colors">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadCloud className="w-8 h-8 mb-2 text-indigo-400" />
          <p className="mb-1 text-xs text-gray-600 font-medium">点击上传小说章节</p>
          <p className="text-[10px] text-gray-400">.txt 文件</p>
        </div>
        <input type="file" className="hidden" accept=".txt" multiple onChange={handleFileChange} />
      </label>
    </div>
  );
};

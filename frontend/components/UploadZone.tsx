// frontend/components/UploadZone.tsx

'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2 } from 'lucide-react';

interface UploadZoneProps {
   onFileDrop: (file: File) => Promise<any>;
  isUploading: boolean;
  uploadProgress: number;
}

export function UploadZone({ onFileDrop, isUploading, uploadProgress }: UploadZoneProps) {
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        await onFileDrop(file);
      }
    },
    [onFileDrop]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
    },
    disabled: isUploading,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        elative rounded-2xl p-8 text-center cursor-pointer
        glass hover:border-blue-500/30 transition-all duration-300
        shadow-lg shadow-black/20
        ${isDragActive
          ? 'ring-2 ring-blue-500/40 scale-[1.01]'
          : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/40'
        }
        ${isUploading ? 'cursor-not-allowed opacity-75' : ''}
      `}
    >
      <input {...getInputProps()} />

      {isUploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="text-blue-400 animate-spin" size={32} />
          <p className="text-slate-300 text-sm">Uploading... {uploadProgress}%</p>
          <div className="w-48 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      ) : isDragActive ? (
        <div className="flex flex-col items-center gap-3">
          <Upload className="text-blue-400" size={32} />
          <p className="text-blue-300 text-sm font-medium">Drop to upload</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-2">
            <FileText className="text-slate-500" size={28} />
            <Upload className="text-slate-500" size={28} />
          </div>
          <div>
            <p className="text-slate-300 text-sm font-medium">
              Drop PDFs or TXT files here
            </p>
            <p className="text-slate-500 text-xs mt-1">
              or click to browse — WhatsApp exports (.txt) supported
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
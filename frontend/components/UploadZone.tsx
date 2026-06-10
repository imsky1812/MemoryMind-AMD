// frontend/components/UploadZone.tsx

'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Loader2 } from 'lucide-react';

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
      'text/markdown': ['.md'],
    },
    disabled: isUploading,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-xl p-6 text-center cursor-pointer 
        transition-all duration-300 flex flex-col items-center justify-center gap-2 
        group relative overflow-hidden
        ${isDragActive 
          ? 'border-primary bg-primary/10 shadow-[inset_0_0_20px_rgba(172,199,255,0.2)]' 
          : 'border-outline-variant hover:border-primary hover:bg-white/5'
        }
        ${isUploading ? 'opacity-75 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      {isUploading ? (
        <div className="flex flex-col items-center justify-center w-full z-10">
          <Loader2 className="text-primary text-3xl animate-spin mb-1" size={28} />
          <p className="font-sans text-sm text-on-surface-variant font-medium">Uploading... {uploadProgress}%</p>
          <div className="w-full bg-surface-container-highest rounded-full h-1.5 mt-3 overflow-hidden">
            <div 
              className="bg-primary h-1.5 rounded-full transition-all duration-150" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-1 z-10">
          <UploadCloud className="text-primary text-3xl group-hover:scale-110 transition-transform duration-300" size={32} />
          <p className="font-sans text-sm text-on-surface-variant font-medium">
            {isDragActive ? 'Drop to upload' : 'Drop Files Here'}
          </p>
          <p className="font-sans text-xs text-outline mt-0.5">PDF, TXT, MD</p>
        </div>
      )}
    </div>
  );
}

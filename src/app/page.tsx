'use client';

import { useState, useRef } from 'react';
import { Camera, Heart, Users, Images, Check, X } from 'lucide-react';
import Link from 'next/link';

interface FileWithProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  id: string;
}

export default function Home() {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFiles = Array.from(event.target.files);
      const newFiles: FileWithProgress[] = selectedFiles.map(file => ({
        file,
        progress: 0,
        status: 'pending' as const,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }));

      setFiles(prev => [...prev, ...newFiles]);

      // Start uploading immediately
      newFiles.forEach(fileWithProgress => {
        uploadFile(fileWithProgress.id, fileWithProgress.file);
      });
    }
  };

  const updateFileProgress = (id: string, progress: number, status: FileWithProgress['status']) => {
    setFiles(prev => prev.map(f =>
      f.id === id ? { ...f, progress, status } : f
    ));
  };

  const uploadFile = async (id: string, file: File) => {
    try {
      updateFileProgress(id, 0, 'uploading');
      console.log('Starting upload for file:', file.name, file.type);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      updateFileProgress(id, 10, 'uploading');

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      return new Promise<boolean>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = 10 + Math.round((event.loaded / event.total) * 90);
            updateFileProgress(id, progress, 'uploading');
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            updateFileProgress(id, 100, 'success');
            console.log('Upload and processing successful for:', file.name);
            resolve(true);
          } else {
            console.error('Upload failed:', xhr.statusText);
            updateFileProgress(id, 0, 'error');
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          console.error('Upload error for file', file.name);
          updateFileProgress(id, 0, 'error');
          reject(new Error('Network error during upload'));
        });

        xhr.open('POST', '/api/process-upload');
        xhr.send(formData);
      });
    } catch (error) {
      console.error('Upload error for file', file.name, ':', error);
      updateFileProgress(id, 0, 'error');
      return false;
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const retryUpload = (id: string, file: File) => {
    uploadFile(id, file);
  };

  const clearCompletedFiles = () => {
    setFiles(prev => prev.filter(f => f.status !== 'success'));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="mobile-min-h bg-gradient-to-br from-pink-50 to-purple-50 p-4 pb-safe">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8 pt-safe">
          <div className="flex items-center justify-center mb-4">
            <Heart className="w-8 h-8 text-pink-500 mr-2" />
            <h1 className="text-3xl font-bold text-gray-800">Recuerdos de boda</h1>
          </div>
          <p className="text-gray-600">¡Comparte tus fotos y videos de nuestro día especial!</p>

          <Link
            href="/gallery"
            className="inline-flex items-center mt-4 text-pink-600 font-medium"
          >
            <Images className="w-5 h-5 mr-2" />
            Ver galería
          </Link>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {files.length === 0 ? (
            <div
              onClick={triggerFileInput}
              className="border-2 border-dashed border-pink-300 rounded-xl p-8 text-center cursor-pointer hover:border-pink-400 transition-colors"
            >
              <Camera className="w-16 h-16 text-pink-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Subir fotos/videos
              </h3>
              <p className="text-gray-500 text-sm">
                Toca aquí para seleccionar archivos
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Se subirán automáticamente
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-700 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Archivos ({files.length})
                </h3>
                {files.some(f => f.status === 'success') && (
                  <button
                    onClick={clearCompletedFiles}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Limpiar completados
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {files.map((fileWithProgress) => (
                  <div key={fileWithProgress.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {fileWithProgress.file.type.startsWith('image/') ? (
                            <div className="text-blue-500 text-xs">📷</div>
                          ) : (
                            <div className="text-purple-500 text-xs">🎥</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-gray-700 truncate">
                            {fileWithProgress.file.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {(fileWithProgress.file.size / 1024 / 1024).toFixed(1)} MB
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {fileWithProgress.status === 'success' && (
                          <Check className="w-5 h-5 text-green-500" />
                        )}
                        {fileWithProgress.status === 'error' && (
                          <button
                            onClick={() => retryUpload(fileWithProgress.id, fileWithProgress.file)}
                            className="text-red-500 hover:text-red-600 text-xs px-2 py-1 bg-red-50 rounded"
                          >
                            Reintentar
                          </button>
                        )}
                        {fileWithProgress.status === 'uploading' && (
                          <div className="text-xs text-gray-500">
                            {fileWithProgress.progress}%
                          </div>
                        )}
                        <button
                          onClick={() => removeFile(fileWithProgress.id)}
                          className="text-gray-400 hover:text-red-500 p-1"
                          disabled={fileWithProgress.status === 'uploading'}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${fileWithProgress.status === 'success'
                            ? 'bg-green-500'
                            : fileWithProgress.status === 'error'
                              ? 'bg-red-500'
                              : fileWithProgress.status === 'uploading'
                                ? 'bg-pink-500'
                                : 'bg-gray-300'
                          }`}
                        style={{
                          width: `${fileWithProgress.status === 'success'
                              ? 100
                              : fileWithProgress.status === 'error'
                                ? 0
                                : fileWithProgress.progress
                            }%`,
                        }}
                      />
                    </div>

                    {/* Status Text */}
                    <div className="mt-1 text-xs">
                      {fileWithProgress.status === 'pending' && (
                        <span className="text-gray-500">Esperando...</span>
                      )}
                      {fileWithProgress.status === 'uploading' && (
                        <span className="text-pink-600">Subiendo... {fileWithProgress.progress}%</span>
                      )}
                      {fileWithProgress.status === 'success' && (
                        <span className="text-green-600">¡Subido exitosamente!</span>
                      )}
                      {fileWithProgress.status === 'error' && (
                        <span className="text-red-600">Error en la subida</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={triggerFileInput}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-medium flex items-center justify-center transition-colors"
              >
                <Camera className="w-5 h-5 mr-2" />
                Agregar más archivos
              </button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-white/80 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-600">
            💝 ¡Gracias por ayudarnos a capturar nuestros momentos especiales!
            Tus fotos y videos nos ayudarán a recordar este día mágico para siempre.
          </p>
        </div>
      </div>
    </div>
  );
}

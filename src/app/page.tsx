'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, Heart, Users, Images } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFiles = Array.from(event.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const uploadFile = async (file: File) => {
    try {
      console.log('Starting upload for file:', file.name, file.type);
      
      // Get presigned URL
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(`Failed to get upload URL: ${errorData.error}`);
      }

      const { uploadUrl } = await response.json();
      console.log('Got presigned PUT URL, uploading to:', uploadUrl);

      // Upload file to R2 using PUT
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      console.log('Upload response status:', uploadResponse.status);
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload failed:', errorText);
        throw new Error(`Upload failed with status ${uploadResponse.status}: ${errorText}`);
      }

      console.log('Upload successful for:', file.name);
      return true;
    } catch (error) {
      console.error('Upload error for file', file.name, ':', error);
      return false;
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    
    try {
      const uploadPromises = files.map(uploadFile);
      const results = await Promise.all(uploadPromises);
      
      const successCount = results.filter(Boolean).length;
      const failCount = results.length - successCount;
      
      if (failCount === 0) {
        alert(`¡Todos los ${successCount} archivos se subieron exitosamente! 📸`);
      } else {
        alert(`${successCount} archivos subidos, ${failCount} fallaron. Por favor intenta de nuevo.`);
      }
      
      setFiles([]);
    } catch {
      alert('Subida falló. Por favor verifica tu conexión e intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4" 
      style={{
        minHeight: '100vh',
        minHeight: '100dvh',
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))'
      }}
    >
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
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
                Toca aquí para subir recuerdos de la boda
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Archivos seleccionados ({files.length})
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {files.map((file, index) => (
                  <div key={index} className="relative">
                    <div className="bg-gray-100 rounded-lg p-3 text-center">
                      {file.type.startsWith('image/') ? (
                        <div className="text-blue-500 text-xs mb-1">📷 Foto</div>
                      ) : (
                        <div className="text-purple-500 text-xs mb-1">🎥 Video</div>
                      )}
                      <div className="text-xs text-gray-600 truncate">
                        {file.name}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={triggerFileInput}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-medium"
                >
                  Agregar más
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 bg-pink-500 text-white py-3 px-4 rounded-xl font-medium flex items-center justify-center disabled:opacity-50"
                >
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      Subir
                    </>
                  )}
                </button>
              </div>
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
'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Heart, X, Play } from 'lucide-react';
import Link from 'next/link';

interface MediaFile {
  key: string;
  url: string;
  type: 'image' | 'video';
  uploadedAt: string;
  fileName: string;
  size: number;
}

export default function Gallery() {
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const response = await fetch('/api/gallery');
      if (!response.ok) {
        throw new Error('Failed to fetch gallery');
      }

      const data = await response.json();
      setMedia(data.files || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch media:', error);
      setMedia([]);
      setLoading(false);
    }
  };

  const downloadMedia = async (media: MediaFile) => {
    try {
      const response = await fetch(media.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = media.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download media:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading beautiful memories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6 pt-4">
          <Link href="/" className="mr-4">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="flex items-center">
            <Heart className="w-6 h-6 text-pink-500 mr-2" />
            <h1 className="text-2xl font-bold text-gray-800">Wedding Gallery</h1>
          </div>
        </div>

        {media.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📸</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              No memories uploaded yet
            </h2>
            <p className="text-gray-500 mb-6">
              Be the first to share photos and videos from the wedding!
            </p>
            <Link
              href="/"
              className="bg-pink-500 text-white px-6 py-3 rounded-xl font-medium inline-flex items-center"
            >
              Upload Photos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {media.map((item) => (
              <div key={item.key} className="relative group">
                <div
                  className="aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer relative"
                  onClick={() => setSelectedMedia(item)}
                >
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt="Wedding memory"
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        console.error('Image failed to load:', item.url);
                        e.currentTarget.style.border = '2px solid red';
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully:', item.url);
                      }}
                    />
                  ) : (
                    <>
                      <video
                        src={item.url}
                        className="absolute inset-0 w-full h-full object-cover"
                        controls={false}
                        muted
                      />
                      <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white p-1 rounded z-10">
                        <Play className="w-4 h-4" />
                      </div>
                    </>
                  )}
                </div>

                <div className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadMedia(item);
                    }}
                    className="opacity-0 group-hover:opacity-100 bg-white text-gray-800 p-2 rounded-full transition-opacity hover:bg-gray-100"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Full-screen modal */}
        {selectedMedia && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
            <div className="relative max-w-4xl max-h-full w-full h-full flex items-center justify-center">
              <button
                onClick={() => setSelectedMedia(null)}
                className="absolute top-4 right-4 z-10 text-white bg-black bg-opacity-50 p-2 rounded-full hover:bg-opacity-70"
              >
                <X className="w-6 h-6" />
              </button>

              <button
                onClick={() => downloadMedia(selectedMedia)}
                className="absolute top-4 right-16 z-10 text-white bg-black bg-opacity-50 p-2 rounded-full hover:bg-opacity-70"
              >
                <Download className="w-6 h-6" />
              </button>

              <div className="w-full h-full flex items-center justify-center">
                {selectedMedia.type === 'image' ? (
                  <img
                    src={selectedMedia.url}
                    alt={selectedMedia.fileName}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <video
                    src={selectedMedia.url}
                    controls
                    autoPlay
                    className="max-w-full max-h-full object-contain"
                  />
                )}
              </div>

              <div className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-3 py-2 rounded">
                <p className="text-sm font-medium">{selectedMedia.fileName}</p>
                <p className="text-xs opacity-75">
                  {new Date(selectedMedia.uploadedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

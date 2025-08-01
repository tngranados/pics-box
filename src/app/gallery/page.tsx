'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Heart } from 'lucide-react';
import Link from 'next/link';

interface MediaFile {
  key: string;
  url: string;
  type: 'image' | 'video';
  uploadedAt: string;
}

export default function Gallery() {
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      // TODO: Implement actual gallery fetch from S3/R2
      // For now, show placeholder
      setTimeout(() => {
        setMedia([]);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to fetch media:', error);
      setLoading(false);
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
                <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt="Wedding memory"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={item.url}
                      className="w-full h-full object-cover"
                      controls={false}
                      muted
                    />
                  )}
                </div>

                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                  <button className="opacity-0 group-hover:opacity-100 bg-white text-gray-800 p-2 rounded-full transition-opacity">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

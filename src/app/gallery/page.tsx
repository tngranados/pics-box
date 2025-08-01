'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Download, Heart, X, Play } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Zoom, Keyboard } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/zoom';

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fetchMedia();
    setMounted(true);
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

  const openFullscreen = (index: number) => {
    setCurrentIndex(index);
    setSelectedMedia(media[index]);
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
  };

  const closeFullscreen = () => {
    console.log('Close button clicked'); // Debug log
    setSelectedMedia(null);
    // Restore body scrolling
    document.body.style.overflow = 'unset';
  };

  // Add escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedMedia) {
        closeFullscreen();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedMedia]);

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
            {media.map((item, index) => (
              <div key={item.key} className="relative group">
                <div
                  className="aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer relative active:scale-95 transition-transform duration-150"
                  onClick={() => openFullscreen(index)}
                >
                  {item.type === 'image' ? (
                    <Image
                      src={item.url}
                      alt="Wedding memory"
                      fill
                      className="object-cover"
                      onError={() => {
                        console.error('Image failed to load:', item.url);
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

                <div className="absolute top-2 right-2 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadMedia(item);
                    }}
                    className="opacity-0 group-hover:opacity-100 bg-white text-gray-800 p-2 rounded-full transition-opacity hover:bg-gray-100 shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Swiper-based Full-screen Gallery */}
        {selectedMedia && mounted && createPortal(
          <div 
            className="fixed inset-0 bg-black"
            style={{ 
              zIndex: 999999,
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh'
            }}
            onClick={(e) => {
              // Close if clicking on the background (not on the swiper content)
              if (e.target === e.currentTarget) {
                closeFullscreen();
              }
            }}
          >
            <div className="relative w-full h-full">
              {/* Header with close and download buttons */}
              <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent" style={{ zIndex: 1000 }}>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Close button mousedown'); // Debug
                    closeFullscreen();
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Close button touchstart'); // Debug
                    closeFullscreen();
                  }}
                  className="text-white bg-red-600 p-4 rounded-full hover:bg-red-700 transition-all cursor-pointer select-none"
                  style={{ zIndex: 1001 }}
                >
                  <X className="w-6 h-6" />
                </button>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    downloadMedia(media[currentIndex]);
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    downloadMedia(media[currentIndex]);
                  }}
                  className="text-white bg-black/70 p-4 rounded-full hover:bg-black/90 transition-all cursor-pointer select-none"
                  style={{ zIndex: 1001 }}
                >
                  <Download className="w-6 h-6" />
                </button>
              </div>

              {/* Swiper Gallery */}
              <Swiper
                modules={[Navigation, Pagination, Zoom, Keyboard]}
                spaceBetween={0}
                slidesPerView={1}
                initialSlide={currentIndex}
                navigation={{
                  enabled: true,
                }}
                pagination={{
                  enabled: true,
                  clickable: true,
                }}
                zoom={{
                  maxRatio: 3,
                  minRatio: 1,
                }}
                keyboard={{
                  enabled: true,
                }}
                className="w-full h-full"
                style={{
                  '--swiper-navigation-color': '#ffffff',
                  '--swiper-pagination-color': '#ffffff',
                  '--swiper-navigation-size': '44px',
                } as React.CSSProperties}
              >
                {media.map((item, index) => (
                  <SwiperSlide key={item.key} className="flex items-center justify-center">
                    <div className="swiper-zoom-container w-full h-full flex items-center justify-center">
                      {item.type === 'image' ? (
                        <Image
                          src={item.url}
                          alt={item.fileName}
                          width={1920}
                          height={1080}
                          className="max-w-full max-h-full object-contain"
                          priority={index === currentIndex}
                        />
                      ) : (
                        <video
                          src={item.url}
                          controls
                          className="max-w-full max-h-full object-contain"
                          playsInline
                        />
                      )}
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>

              {/* Media info overlay */}
              <div className="absolute bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="text-white">
                  <p className="text-sm font-medium mb-1">{media[currentIndex]?.fileName}</p>
                  <p className="text-xs opacity-75 mb-2">
                    {media[currentIndex] && new Date(media[currentIndex].uploadedAt).toLocaleString()}
                  </p>
                  <p className="text-xs opacity-90">
                    {currentIndex + 1} of {media.length}
                  </p>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}


'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Download, Heart, X, Play } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination as SwiperPagination, Zoom, Keyboard, Virtual } from 'swiper/modules';
import Pagination from '@/components/Pagination';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/zoom';

interface MediaFile {
  key: string;
  url: string;
  thumbnail_url?: string;
  optimized_url?: string;
  original_url?: string;
  type: 'image' | 'video';
  uploadedAt: string;
  fileName: string;
  size: number;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export default function Gallery() {
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [allMedia, setAllMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loadingAllMedia, setLoadingAllMedia] = useState(false);
  const [isLowMemoryMode, setIsLowMemoryMode] = useState(false);
  // Memory management refs
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const imageCache = useRef<Set<string>>(new Set());
  // Store originals to restore after fullscreen closes or route changes
  const originalThemeColorRef = useRef<string | null>(null);
  const themeMetaExistedRef = useRef<boolean>(false);
  const originalViewportRef = useRef<string | null>(null);
  const originalBodyStylesRef = useRef<{ overflow: string; position: string; width: string; height: string } | null>(null);

  useEffect(() => {
    fetchMedia(currentPage);
    setMounted(true);
  }, [currentPage]);

  const fetchMedia = async (page: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/gallery?page=${page}&limit=20`);
      if (!response.ok) {
        throw new Error('Failed to fetch gallery');
      }

      const data = await response.json();
      setMedia(data.files || []);
      setPagination(data.pagination);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch media:', error);
      setMedia([]);
      setPagination(null);
      setLoading(false);
    }
  };

  const fetchAllMedia = async (): Promise<MediaFile[]> => {
    if (allMedia.length > 0) return allMedia; // Already loaded

    try {
      setLoadingAllMedia(true);
      // Fetch all media for the viewer by getting all pages with smaller limits for iOS Safari
      const allFiles: MediaFile[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await fetch(`/api/gallery?page=${page}&limit=20`); // Very small limit for iOS Safari
        if (!response.ok) break;

        const data = await response.json();
        allFiles.push(...(data.files || []));
        hasMore = data.pagination.hasNextPage;
        page++;
        
        // Add small delay to prevent overwhelming the browser
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      setAllMedia(allFiles);
      setLoadingAllMedia(false);
      return allFiles;
    } catch (error) {
      console.error('Failed to fetch all media:', error);
      setLoadingAllMedia(false);
      return [];
    }
  };

  // Clean up media cache - aggressive cleanup for iOS Safari
  const clearMediaCache = useCallback(() => {
    // Clear video elements
    videoRefs.current.forEach((video) => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      // Force garbage collection hint
      video.src = '';
    });
    videoRefs.current.clear();

    // Clear image cache tracking
    imageCache.current.clear();

    // Clear image cache tracking (DOM cleanup handled by React)

    // Clear allMedia to free memory
    setAllMedia([]);
    
    // Force garbage collection if available (iOS Safari specific)
    if ('gc' in window && typeof (window as unknown as { gc?: () => void }).gc === 'function') {
      (window as unknown as { gc: () => void }).gc();
    }
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const downloadMedia = async (media: MediaFile) => {
    try {
      // Use original_url for downloads to get full quality
      const downloadUrl = media.original_url || media.url;
      const response = await fetch(downloadUrl);
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

  const openFullscreen = async (index: number) => {
    const selectedItem = media[index];

    // Check available memory before loading (iOS Safari specific)
    if ('memory' in performance && (performance as unknown as { memory?: { jsHeapSizeLimit: number; usedJSHeapSize: number } }).memory) {
      const memInfo = (performance as unknown as { memory: { jsHeapSizeLimit: number; usedJSHeapSize: number } }).memory;
      const availableMemory = memInfo.jsHeapSizeLimit - memInfo.usedJSHeapSize;
      
      // If less than 50MB available, use single image mode
      if (availableMemory < 50 * 1024 * 1024) {
        console.warn('Low memory detected, using single image mode');
        setIsLowMemoryMode(true);
        setSelectedMedia(selectedItem);
        setCurrentIndex(index);
        setAllMedia([selectedItem]); // Only load current image
        
        // Apply fullscreen styles
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.height = '100%';
        return;
      }
    }

    // First load all media if not already loaded
    const loadedMedia = await fetchAllMedia();

    // Find the global index using the returned media array
    const globalIndex = loadedMedia.findIndex(item => item.key === selectedItem.key);

    // Set both states with the correct values
    setSelectedMedia(selectedItem);
    setCurrentIndex(globalIndex >= 0 ? globalIndex : 0);

    // Save originals
    const themeMeta = document.querySelector('meta[name=theme-color]') as HTMLMetaElement | null;
    themeMetaExistedRef.current = !!themeMeta;
    originalThemeColorRef.current = themeMeta?.getAttribute('content') ?? null;

    const viewportMeta = document.querySelector('meta[name=viewport]') as HTMLMetaElement | null;
    originalViewportRef.current = viewportMeta?.getAttribute('content') ?? null;

    originalBodyStylesRef.current = {
      overflow: document.body.style.overflow || '',
      position: document.body.style.position || '',
      width: document.body.style.width || '',
      height: document.body.style.height || '',
    };

    // Prevent body scrolling and hide browser UI
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.documentElement.classList.add('fullscreen-open');
    document.body.classList.add('fullscreen-open');

    // Try to hide address bar on mobile
    window.scrollTo(0, 1);
    setTimeout(() => window.scrollTo(0, 1), 100);

    // Add meta viewport changes for fullscreen
    const viewport = document.querySelector('meta[name=viewport]') as HTMLMetaElement | null;
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, minimal-ui');
    }

    // Force theme-color to black while fullscreen to avoid white bars
    let themeMeta2 = document.querySelector('meta[name=theme-color]') as HTMLMetaElement | null;
    if (!themeMeta2) {
      themeMeta2 = document.createElement('meta');
      themeMeta2.name = 'theme-color';
      document.head.appendChild(themeMeta2);
    }
    themeMeta2.setAttribute('content', '#000000');
  };

  const closeFullscreen = useCallback(() => {
    console.log('Close button clicked'); // Debug log

    // Clean up media resources before closing
    clearMediaCache();

    setSelectedMedia(null);
    // Restore body scrolling and position
    if (originalBodyStylesRef.current) {
      const { overflow, position, width, height } = originalBodyStylesRef.current;
      document.body.style.overflow = overflow;
      document.body.style.position = position;
      document.body.style.width = width;
      document.body.style.height = height;
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    }
  document.documentElement.classList.remove('fullscreen-open');
  document.body.classList.remove('fullscreen-open');

    // Restore original viewport
    const viewport = document.querySelector('meta[name=viewport]') as HTMLMetaElement | null;
    if (viewport) {
      const originalViewport = originalViewportRef.current ?? 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
      viewport.setAttribute('content', originalViewport);
    }

    // Restore theme-color to previous value or a sensible default
    let themeMeta = document.querySelector('meta[name=theme-color]') as HTMLMetaElement | null;
    const prev = originalThemeColorRef.current;
    const existed = themeMetaExistedRef.current;
    if (prev) {
      if (!themeMeta) {
        themeMeta = document.createElement('meta');
        themeMeta.name = 'theme-color';
        document.head.appendChild(themeMeta);
      }
      themeMeta.setAttribute('content', prev);
    } else if (!existed && themeMeta) {
      // We created it; remove it
      themeMeta.parentElement?.removeChild(themeMeta);
    } else {
      // Fallback: set based on color scheme
      const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const fallback = isDark ? '#000000' : '#fdf2f8';
      if (!themeMeta) {
        themeMeta = document.createElement('meta');
        themeMeta.name = 'theme-color';
        document.head.appendChild(themeMeta);
      }
      themeMeta.setAttribute('content', fallback);
    }
  }, [clearMediaCache]);

  // Safety net: cleanup on unmount/navigation
  useEffect(() => {
    return () => {
      // Clean up media resources
      clearMediaCache();

      // If overlay was open, ensure restoration
      document.documentElement.classList.remove('fullscreen-open');
      document.body.classList.remove('fullscreen-open');
      if (originalBodyStylesRef.current) {
        const { overflow, position, width, height } = originalBodyStylesRef.current;
        document.body.style.overflow = overflow;
        document.body.style.position = position;
        document.body.style.width = width;
        document.body.style.height = height;
      } else {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
      }
      const viewport = document.querySelector('meta[name=viewport]') as HTMLMetaElement | null;
      if (viewport && originalViewportRef.current) {
        viewport.setAttribute('content', originalViewportRef.current);
      }
      let themeMeta = document.querySelector('meta[name=theme-color]') as HTMLMetaElement | null;
      const prev = originalThemeColorRef.current;
      const existed = themeMetaExistedRef.current;
      if (prev) {
        if (!themeMeta) {
          themeMeta = document.createElement('meta');
          themeMeta.name = 'theme-color';
          document.head.appendChild(themeMeta);
        }
        themeMeta.setAttribute('content', prev);
      } else if (!existed && themeMeta) {
        themeMeta.parentElement?.removeChild(themeMeta);
      }
    };
  }, [clearMediaCache]);

  // Add escape key handler and fullscreen management
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedMedia) {
        closeFullscreen();
      }
    };

    const handleOrientationChange = () => {
      if (selectedMedia) {
        // Re-hide browser UI after orientation change
        setTimeout(() => {
          window.scrollTo(0, 1);
          // Force viewport refresh
          const viewport = document.querySelector('meta[name=viewport]');
          if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, minimal-ui');
          }
        }, 500);
      }
    };

    const handleVisibilityChange = () => {
      if (selectedMedia && !document.hidden) {
        // Re-hide browser UI when returning to tab
        setTimeout(() => window.scrollTo(0, 1), 100);
      }
    };

    document.addEventListener('keydown', handleEscape);
    window.addEventListener('orientationchange', handleOrientationChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('orientationchange', handleOrientationChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedMedia, closeFullscreen]);

  if (loading) {
    return (
  <div className="mobile-min-h bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center pb-safe pt-safe">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-pink-300 border-t-pink-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando hermosos recuerdos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-min-h bg-gradient-to-br from-pink-50 to-purple-50 p-4 pb-safe">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6 pt-4 pt-safe">
          <Link href="/" className="mr-4">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="flex items-center">
            <Heart className="w-6 h-6 text-pink-500 mr-2" />
            <h1 className="text-2xl font-bold text-gray-800">Galería de boda</h1>
          </div>
        </div>

        {media.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📸</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Aún no hay recuerdos subidos
            </h2>
            <p className="text-gray-500 mb-6">
              ¡Sé el primero en compartir fotos y videos de la boda!
            </p>
            <Link
              href="/"
              className="bg-pink-500 text-white px-6 py-3 rounded-xl font-medium inline-flex items-center"
            >
              Subir fotos
            </Link>
          </div>
        ) : (
          <>
            {/* Gallery stats */}
            {pagination && (
              <div className="mb-4 text-center text-gray-600">
                <p className="text-sm">
                  Mostrando {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1}-
                  {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} de{' '}
                  {pagination.totalItems} fotos y videos
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {media.map((item, index) => (
                <div key={item.key} className="relative group">
                  <div
                    className="aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer relative active:scale-95 transition-transform duration-150"
                    onClick={() => openFullscreen(index)}
                  >
                    {item.type === 'image' ? (
                      <Image
                        src={item.thumbnail_url || item.url}
                        alt="Recuerdo de boda"
                        fill
                        className="object-cover"
                        loading="lazy"
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        onError={() => {
                          console.error('Image failed to load:', item.thumbnail_url || item.url);
                          imageCache.current.delete(item.thumbnail_url || item.url);
                        }}
                        onLoad={() => {
                          imageCache.current.add(item.thumbnail_url || item.url);
                        }}
                      />
                    ) : (
                      <>
                        <video
                          ref={(el) => {
                            if (el) {
                              videoRefs.current.set(item.key, el);
                            } else {
                              videoRefs.current.delete(item.key);
                            }
                          }}
                          src={item.optimized_url || item.url}
                          className="absolute inset-0 w-full h-full object-cover"
                          controls={false}
                          muted
                          preload="none"
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

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}

        {/* Swiper-based Full-screen Gallery */}
        {selectedMedia && mounted && createPortal(
          <div
            className="fixed bg-black"
            style={{
              zIndex: 999999,
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100dvh', // Dynamic viewport height for mobile
              minHeight: '-webkit-fill-available',
              overflow: 'hidden',
              touchAction: 'manipulation',
              WebkitUserSelect: 'none',
              userSelect: 'none'
            }}
            onClick={(e) => {
              // Close if clicking on the background (not on the swiper content)
              if (e.target === e.currentTarget) {
                closeFullscreen();
              }
            }}
            onTouchStart={(e) => {
              // Prevent default touch behavior to avoid browser UI
              if (e.target === e.currentTarget) {
                e.preventDefault();
              }
            }}
            onTouchMove={(e) => {
              // Prevent scrolling that might trigger browser UI
              e.preventDefault();
            }}
            onTouchEnd={(e) => {
              // Handle touch end for closing
              if (e.target === e.currentTarget) {
                e.preventDefault();
                closeFullscreen();
              }
            }}
          >
            <div className="relative w-full h-full">
              {/* Header with close and download buttons */}
              <div
                className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent pt-safe px-safe"
                style={{
                  zIndex: 1000,
                  paddingTop: 'max(1rem, env(safe-area-inset-top, 1rem))',
                  paddingLeft: 'max(1rem, env(safe-area-inset-left, 1rem))',
                  paddingRight: 'max(1rem, env(safe-area-inset-right, 1rem))'
                }}
              >
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
                  className="text-white bg-black/50 backdrop-blur-sm p-3 rounded-full hover:bg-black/70 transition-all cursor-pointer select-none border border-white/20"
                  style={{ zIndex: 1001 }}
                >
                  <X className="w-6 h-6" />
                </button>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (allMedia[currentIndex]) {
                      downloadMedia(allMedia[currentIndex]);
                    }
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (allMedia[currentIndex]) {
                      downloadMedia(allMedia[currentIndex]);
                    }
                  }}
                  className="text-white bg-black/70 p-4 rounded-full hover:bg-black/90 transition-all cursor-pointer select-none"
                  style={{ zIndex: 1001 }}
                >
                  <Download className="w-6 h-6" />
                </button>
              </div>

              {/* Low memory warning */}
              {isLowMemoryMode && (
                <div className="absolute top-16 left-4 right-4 z-50 bg-yellow-600 text-white p-3 rounded-lg text-sm">
                  <p className="font-medium">Modo de memoria limitada</p>
                  <p className="text-xs mt-1">Solo se muestra una imagen para evitar bloqueos en Safari</p>
                </div>
              )}

              {/* Swiper Gallery */}
              {loadingAllMedia ? (
                <div className="flex items-center justify-center w-full h-full text-white">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p>Cargando todas las fotos...</p>
                  </div>
                </div>
              ) : (
                <Swiper
                  modules={[Navigation, SwiperPagination, Zoom, Keyboard, Virtual]}
                  spaceBetween={0}
                  slidesPerView={1}
                  initialSlide={currentIndex}
                  navigation={{
                    enabled: true,
                  }}
                  pagination={{
                    enabled: allMedia.length <= 10,
                    clickable: true,
                    type: 'fraction',
                    formatFractionCurrent: (number) => number,
                    formatFractionTotal: (number) => number,
                  }}
                  zoom={{
                    maxRatio: 3,
                    minRatio: 1,
                  }}
                  keyboard={{
                    enabled: true,
                  }}
                  // Enable Virtual Slides to prevent memory crashes
                  virtual={{
                    enabled: true,
                    addSlidesBefore: 2,
                    addSlidesAfter: 2,
                    cache: false, // Disable cache to save memory on mobile
                  }}
                  // iOS Safari memory optimizations
                  watchSlidesProgress={true}
                  centeredSlides={true}
                  allowTouchMove={true}
                  onSlideChange={(swiper) => {
                    setCurrentIndex(swiper.activeIndex);
                    
                    // Cleanup videos only (images are handled by conditional rendering)
                    setTimeout(() => {
                      videoRefs.current.forEach((video, key) => {
                        if (!key.includes(`fullscreen-${allMedia[swiper.activeIndex]?.key}`)) {
                          video.pause();
                          video.src = '';
                          video.load();
                        }
                      });
                      
                      // Force garbage collection if available
                      if ('gc' in window && typeof (window as unknown as { gc?: () => void }).gc === 'function') {
                        (window as unknown as { gc: () => void }).gc();
                      }
                    }, 100);
                  }}
                  className="w-full h-full"
                  style={{
                    '--swiper-navigation-color': '#ffffff',
                    '--swiper-pagination-color': '#ffffff',
                    '--swiper-navigation-size': '50px',
                    '--swiper-navigation-sides-offset': '20px',
                  } as React.CSSProperties}
                >
                  {allMedia.map((item, index) => (
                    <SwiperSlide key={item.key} virtualIndex={index} className="flex items-center justify-center">
                      <div className="swiper-zoom-container w-full h-full flex items-center justify-center">
                        {item.type === 'image' ? (
                          <Image
                            src={item.optimized_url || item.url}
                            alt={item.fileName}
                            width={800}
                            height={600}
                            className="max-w-full max-h-full object-contain"
                            priority={index === currentIndex}
                            loading={index === currentIndex ? "eager" : "lazy"}
                            unoptimized // Prevent Next.js optimization conflicts
                            onError={(e) => {
                              // Fallback to original if optimized fails
                              const target = e.target as HTMLImageElement;
                              if (target.src !== item.url) {
                                target.src = item.url;
                              }
                            }}
                          />
                        ) : (
                          <video
                            key={`video-${index}`}
                            src={item.optimized_url || item.url}
                            controls
                            className="max-w-full max-h-full object-contain"
                            playsInline
                            preload="none"
                            muted
                            onLoadStart={() => {
                              // Clean up other video elements when new one starts loading
                              videoRefs.current.forEach((video, key) => {
                                if (!key.includes(item.key)) {
                                  video.pause();
                                  video.src = '';
                                  video.load();
                                }
                              });
                            }}
                          />
                        )}
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              )}

              {/* Media info overlay */}
              <div
                className="absolute bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/80 to-transparent pb-safe px-safe"
                style={{
                  paddingLeft: 'max(1rem, env(safe-area-inset-left, 1rem))',
                  paddingRight: 'max(1rem, env(safe-area-inset-right, 1rem))',
                  paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))'
                }}
              >
                <div className="text-white">
                  <p className="text-sm font-medium mb-1">{allMedia[currentIndex]?.fileName}</p>
                  <p className="text-xs opacity-75 mb-2">
                    {allMedia[currentIndex] && new Date(allMedia[currentIndex].uploadedAt).toLocaleString()}
                  </p>
                  <p className="text-xs opacity-90">
                    {currentIndex + 1} of {allMedia.length}
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

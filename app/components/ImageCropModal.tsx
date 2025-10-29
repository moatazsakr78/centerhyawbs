'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface ImageCropModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onCropComplete: (croppedImageUrl: string) => void;
}

export default function ImageCropModal({ isOpen, imageUrl, onClose, onCropComplete }: ImageCropModalProps) {
  const [cropShape, setCropShape] = useState<'square' | 'circle'>('circle');
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('ImageCropModal opened with image URL length:', imageUrl?.length);
      console.log('Image URL starts with:', imageUrl?.substring(0, 50));
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setImageLoaded(false);
      setImageError(false);
      setCropShape('circle');
    }
  }, [isOpen, imageUrl]);

  // Handle image error
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('Image failed to load');
    console.log('Image URL length:', imageUrl?.length);
    setImageError(true);
    setImageLoaded(false);
  };

  // Center image when loaded
  const handleImageLoad = useCallback(() => {
    console.log('Image loaded successfully');
    setImageLoaded(true);
    if (imageRef.current) {
      const img = imageRef.current;
      const containerSize = 400;

      // Calculate initial zoom to fit image
      const widthScale = containerSize / img.naturalWidth;
      const heightScale = containerSize / img.naturalHeight;
      const scale = Math.max(widthScale, heightScale);

      console.log('Image dimensions:', img.naturalWidth, 'x', img.naturalHeight);
      console.log('Calculated scale:', scale);

      setZoom(scale * 0.8); // Fit nicely in container
    }
  }, []);

  // Check if image is already loaded (from cache)
  useEffect(() => {
    if (isOpen && imageRef.current && imageRef.current.complete) {
      console.log('Image already loaded from cache');
      handleImageLoad();
    }
  }, [isOpen, handleImageLoad]);

  // Handle image crop and export
  const handleCrop = useCallback(() => {
    if (!imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const outputSize = 500; // High quality output
    const containerSize = 400;

    // Set canvas size
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Clear canvas
    ctx.clearRect(0, 0, outputSize, outputSize);

    // Save context state
    ctx.save();

    // If circle crop, create circular clipping path
    if (cropShape === 'circle') {
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }

    // Calculate scale factor from container to output
    const scaleFactor = outputSize / containerSize;

    // Calculate the image dimensions in the viewport
    const scaledWidth = img.naturalWidth * zoom;
    const scaledHeight = img.naturalHeight * zoom;

    // Calculate offset to center in output
    const offsetX = (outputSize - scaledWidth * scaleFactor) / 2 + position.x * scaleFactor;
    const offsetY = (outputSize - scaledHeight * scaleFactor) / 2 + position.y * scaleFactor;

    // Draw the image
    ctx.drawImage(
      img,
      offsetX,
      offsetY,
      scaledWidth * scaleFactor,
      scaledHeight * scaleFactor
    );

    // Restore context state
    ctx.restore();

    // Convert to base64
    const croppedImage = canvas.toDataURL('image/png', 0.95);
    console.log('Cropped image created successfully');
    onCropComplete(croppedImage);
    onClose();
  }, [cropShape, zoom, position, onCropComplete, onClose]);

  // Handle mouse/touch drag
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200]">
      <div className="bg-[#2B3544] rounded-lg p-6 w-full max-w-2xl border border-gray-600">
        <h3 className="text-white text-xl font-bold mb-6 text-right">تعديل الصورة</h3>

        {/* Crop Area */}
        <div className="relative mb-6">
          <div
            ref={containerRef}
            className="relative w-[400px] h-[400px] mx-auto bg-gray-900 cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              borderRadius: cropShape === 'circle' ? '50%' : '0px',
              border: '4px solid #3B82F6',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {/* Image Container */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
              }}
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Crop preview"
                onLoad={handleImageLoad}
                onError={handleImageError}
                className="select-none"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  display: imageLoaded ? 'block' : 'none'
                }}
                draggable={false}
              />
            </div>

            {/* Loading indicator - positioned above image */}
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-gray-900/90">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  <p className="text-gray-400 text-sm">جاري تحميل الصورة...</p>
                </div>
              </div>
            )}

            {/* Error indicator */}
            {imageError && (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-gray-900/90">
                <div className="flex flex-col items-center gap-3 text-center px-4">
                  <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-400 text-sm">فشل تحميل الصورة</p>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                  >
                    إغلاق وإعادة المحاولة
                  </button>
                </div>
              </div>
            )}
          </div>
          <p className="text-center text-gray-400 text-sm mt-3">
            اسحب الصورة لتحريكها داخل الإطار
          </p>
        </div>

        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Controls */}
        <div className="space-y-4">
          {/* Crop Shape Selection */}
          <div>
            <label className="block text-white text-sm font-medium mb-3 text-right">شكل القص</label>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setCropShape('square')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${
                  cropShape === 'square'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="4" y="4" width="16" height="16" strokeWidth={2} strokeLinecap="round" />
                </svg>
                <span className="font-medium">مربع</span>
              </button>
              <button
                onClick={() => setCropShape('circle')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${
                  cropShape === 'circle'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" strokeWidth={2} />
                </svg>
                <span className="font-medium">دائري</span>
              </button>
            </div>
          </div>

          {/* Zoom Control */}
          <div>
            <label className="block text-white text-sm font-medium mb-2 text-right">
              التكبير: {(zoom * 100).toFixed(0)}%
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
              />
              <button
                onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Reset Button */}
          <button
            onClick={() => {
              setZoom(1);
              setPosition({ x: 0, y: 0 });
            }}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
          >
            إعادة تعيين
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
          >
            إلغاء
          </button>
          <button
            onClick={handleCrop}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            تطبيق القص
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-4 p-3 bg-blue-900/30 border border-blue-600 rounded-lg">
          <p className="text-blue-300 text-sm text-right">
            💡 اسحب الصورة لتحريكها • استخدم شريط التكبير لتغيير الحجم • اختر الشكل المناسب للقص
          </p>
        </div>
      </div>
    </div>
  );
}

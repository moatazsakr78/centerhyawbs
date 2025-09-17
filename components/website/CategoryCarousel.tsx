'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Category {
  id: number;
  name: string;
  image?: string;
  icon?: string;
  productCount?: number;
}

interface CategoryCarouselProps {
  categories: Category[];
  onCategorySelect?: (categoryName: string) => void;
  className?: string;
  itemsPerView?: number;
}

export default function CategoryCarousel({ 
  categories, 
  onCategorySelect,
  className = "",
  itemsPerView = 4
}: CategoryCarouselProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < categories.length - itemsPerView;
  
  const goToPrevious = () => {
    if (canGoPrevious) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  };
  
  const goToNext = () => {
    if (canGoNext) {
      setCurrentIndex(Math.min(categories.length - itemsPerView, currentIndex + 1));
    }
  };

  // Get current visible categories
  const visibleCategories = categories.slice(currentIndex, currentIndex + itemsPerView);

  const handleCategoryClick = (category: Category) => {
    if (onCategorySelect) {
      onCategorySelect(category.name);
    } else {
      router.push(`/category/${category.id}`);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Previous Arrow (Left) */}
      {canGoPrevious && (
        <button
          onClick={goToPrevious}
          className="absolute -left-6 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-lg hover:shadow-xl hover:scale-110 cursor-pointer transition-all duration-300"
        >
          <svg 
            className="w-6 h-6 text-gray-700" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15 19l-7-7 7-7" 
            />
          </svg>
        </button>
      )}

      {/* Categories Grid */}
      <div className="mx-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {visibleCategories.map((category, index) => (
            <div
              key={category.id}
              className="bg-white rounded-lg hover:bg-gray-50 transition-all duration-300 border border-gray-300 shadow-md cursor-pointer group transform hover:scale-105 hover:shadow-xl overflow-hidden"
              onClick={() => handleCategoryClick(category)}
              style={{
                animationName: 'fadeInUp',
                animationDuration: '0.6s',
                animationTimingFunction: 'ease-out',
                animationDelay: `${index * 0.1}s`,
                animationFillMode: 'both',
                height: '280px' // تكبير الارتفاع طولياً
              }}
            >
              <div className="relative h-full flex flex-col">
                {/* الصورة تملأ معظم المكون */}
                <div className="flex-1 relative overflow-hidden">
                  <img
                    src={category.image || '/placeholder-category.jpg'}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {category.icon && (
                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="text-4xl">{category.icon}</span>
                    </div>
                  )}
                </div>
                {/* منطقة صغيرة للنص في الأسفل */}
                <div className="bg-white p-3 text-center border-t border-gray-100">
                  <h4 className="font-bold text-base text-gray-800 transition-colors group-hover:text-[#5D1F1F] truncate">
                    {category.name}
                  </h4>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Arrow (Right) */}
      {canGoNext && (
        <button
          onClick={goToNext}
          className="absolute -right-6 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-lg hover:shadow-xl hover:scale-110 cursor-pointer transition-all duration-300"
        >
          <svg 
            className="w-6 h-6 text-gray-700" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 5l7 7-7 7" 
            />
          </svg>
        </button>
      )}

      {/* Dots Indicator */}
      {categories.length > itemsPerView && (
        <div className="flex justify-center mt-6 gap-2">
          {Array.from({ length: Math.ceil((categories.length - itemsPerView + 1)) }, (_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'scale-110' 
                  : 'hover:bg-gray-400'
              }`}
              style={{
                backgroundColor: index === currentIndex ? '#5D1F1F' : '#D1D5DB'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
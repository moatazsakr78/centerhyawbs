'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Product, ProductColor, ProductShape, ProductSize } from './shared/types';
import { useCart } from '../../lib/contexts/CartContext';
import { useUserProfile } from '../../lib/hooks/useUserProfile';
import { useWebsiteCurrency } from '@/lib/hooks/useCurrency';
import { useRatingsDisplay } from '../../lib/hooks/useRatingSettings';
import { useProductDisplaySettings } from '@/lib/hooks/useProductDisplaySettings';
import { useProductVoting } from '@/app/lib/hooks/useProductVoting';
import ProductVoteModal from './ProductVoteModal';

interface InteractiveProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => Promise<void>;
  deviceType: 'desktop' | 'tablet' | 'mobile';
  onProductClick?: (productId: string) => void;
}

export default function InteractiveProductCard({ 
  product, 
  onAddToCart,
  deviceType,
  onProductClick 
}: InteractiveProductCardProps) {
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [selectedShape, setSelectedShape] = useState<ProductShape | null>(null);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  
  // Mobile-specific states
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [note, setNote] = useState('');
  
  // Get cart functions for direct access
  const { addToCart: directAddToCart } = useCart();
  const websiteCurrency = useWebsiteCurrency();

  // Get user profile to check role
  const { profile } = useUserProfile();

  // Get rating settings
  const { showRatings } = useRatingsDisplay();

  // Get product display settings
  const { settings: displaySettings } = useProductDisplaySettings();

  // Vote modal state
  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
  const [voteModalMode, setVoteModalMode] = useState<'vote' | 'stats'>('vote');

  // Get voting stats
  const { voteStats } = useProductVoting(String(product.id));

  // Check if product is out of stock
  const isOutOfStock = (product.totalQuantity || product.stock || 0) === 0;

  // Check if voting mode is active
  const isVotingMode = displaySettings?.display_mode === 'show_with_stock_and_vote';

  // Check if user has already voted
  const hasUserVoted = voteStats.userVote !== null;

  // Get current product data based on selected size
  const getCurrentProductData = () => {
    if (selectedSize && selectedSize.product) {
      return {
        ...product,
        id: selectedSize.product.id,
        name: selectedSize.product.name,
        description: selectedSize.product.description || product.description || 'لا يوجد وصف متاح',
        price: selectedSize.product.price,
        image: selectedSize.product.main_image_url || product.image,
        selectedSize: selectedSize
      };
    }
    return product;
  };

  const currentProduct = getCurrentProductData();

  // Debug logging
  if (selectedSize) {
    console.log('Selected size:', selectedSize);
    console.log('Current product:', currentProduct);
    console.log('Description:', currentProduct.description);
  }

  // Determine which price to display based on user role
  const getDisplayPrice = () => {
    if (profile?.role === 'جملة' && currentProduct.wholesale_price) {
      return currentProduct.wholesale_price;
    }
    return currentProduct.price;
  };

  // Create array of all available images (main image + additional images)
  const allImages = (() => {
    const images = [];

    // Add main image first
    if (currentProduct.image) {
      images.push(currentProduct.image);
    }

    // Add all additional images from the images array
    if (currentProduct.images && Array.isArray(currentProduct.images)) {
      const additionalImages = currentProduct.images.filter(img => img && img !== currentProduct.image);
      images.push(...additionalImages);
    }

    const finalImages = images.filter(Boolean) as string[];

    // Debug: uncomment to check product data
    // console.log(`📸 Product "${product.name}":`, {
    //   mainImage: product.image,
    //   additionalImages: product.images,
    //   totalImages: finalImages.length,
    //   allImages: finalImages
    // });

    return finalImages;
  })();

  // Get current display image - prioritize selected shape, then color images, then regular images
  const getCurrentDisplayImage = () => {
    // If a shape is selected and has an image, use it
    if (selectedShape && selectedShape.image_url) {
      return selectedShape.image_url;
    }

    if (selectedColor && selectedColor.image_url) {
      // If a color is selected and has images, create array with color image first, then regular images
      const colorImages = [selectedColor.image_url, ...allImages.filter(img => img !== selectedColor.image_url)];
      return colorImages[currentImageIndex] || selectedColor.image_url;
    }

    // Return the image at current index, fallback to first image or placeholder
    if (allImages.length > 0) {
      return allImages[currentImageIndex] || allImages[0];
    }

    return product.image || '/placeholder-product.svg';
  };

  // Handle touch/swipe events for tablets
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [hasMoved, setHasMoved] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setHasMoved(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    setHasMoved(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation(); // Prevent navigation to product page

    if (deviceType !== 'tablet') return;

    // Get available images array based on selected color
    const availableImages = selectedColor && selectedColor.image_url
      ? [selectedColor.image_url, ...allImages.filter(img => img !== selectedColor.image_url)]
      : allImages;

    if (availableImages.length <= 1) return;

    // Handle swipe if there was movement
    if (touchStart && touchEnd && hasMoved) {
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > 50;
      const isRightSwipe = distance < -50;

      if (isLeftSwipe) {
        // Swipe left - next image
        const nextIndex = (currentImageIndex + 1) % availableImages.length;
        setCurrentImageIndex(nextIndex);
        return;
      } else if (isRightSwipe) {
        // Swipe right - previous image
        const prevIndex = currentImageIndex === 0 ? availableImages.length - 1 : currentImageIndex - 1;
        setCurrentImageIndex(prevIndex);
        return;
      }
    }

    // Handle tap navigation if no swipe occurred - more responsive zones
    if (!hasMoved && touchStart) {
      const imageContainer = imageRef.current;
      if (!imageContainer) return;

      const rect = imageContainer.getBoundingClientRect();
      const tapX = touchStart;
      const containerLeft = rect.left;
      const containerWidth = rect.width;
      const relativeX = tapX - containerLeft;

      // Divide image into sections based on number of images for better UX
      const sectionWidth = containerWidth / availableImages.length;
      const tappedSection = Math.floor(relativeX / sectionWidth);
      const targetIndex = Math.max(0, Math.min(tappedSection, availableImages.length - 1));

      if (targetIndex !== currentImageIndex) {
        setCurrentImageIndex(targetIndex);
      }
    }
  };

  // Handle mouse movement over the image to cycle through images (for desktop and mobile)
  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (deviceType === 'tablet') return; // Disable mousemove for tablet

    const imageContainer = imageRef.current;
    if (!imageContainer) return;

    // Get available images array - prioritize allImages for better image cycling
    const availableImages = selectedColor && selectedColor.image_url
      ? [selectedColor.image_url, ...allImages.filter(img => img !== selectedColor.image_url)]
      : allImages;

    if (availableImages.length <= 1) return;

    const rect = imageContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const containerWidth = rect.width;

    // Make it more sensitive - divide image into equal sections based on image count
    const normalizedPosition = Math.max(0, Math.min(1, mouseX / containerWidth)); // 0 to 1

    // Calculate exact image index with more precision
    const exactIndex = normalizedPosition * (availableImages.length - 1);
    const imageIndex = Math.round(exactIndex); // Round to nearest image instead of floor

    const clampedIndex = Math.max(0, Math.min(imageIndex, availableImages.length - 1));

    // Debug: uncomment to test image cycling
    // console.log(`🖼️ Mouse Move on "${product.name}": Available=${availableImages.length}, Index=${clampedIndex}, Position=${normalizedPosition.toFixed(2)}`);

    // Update immediately for better responsiveness
    if (clampedIndex !== currentImageIndex) {
      setCurrentImageIndex(clampedIndex);
    }
  };

  // Reset to first image when mouse leaves (for desktop and mobile)
  const handleImageMouseLeave = () => {
    if (deviceType === 'tablet') return; // Disable mouseleave for tablet
    setCurrentImageIndex(0);
  };

  // Handle color selection with toggle functionality
  const handleColorSelect = (color: ProductColor, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation to product page
    // Toggle color selection - if same color is clicked, deselect it
    if (selectedColor?.id === color.id) {
      setSelectedColor(null);
    } else {
      setSelectedColor(color);
    }
    setCurrentImageIndex(0); // Reset image index when color changes
  };

  // Handle shape selection with toggle functionality
  const handleShapeSelect = (shape: ProductShape, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation to product page
    // Toggle shape selection - if same shape is clicked, deselect it
    if (selectedShape?.id === shape.id) {
      setSelectedShape(null);
    } else {
      setSelectedShape(shape);
    }
    setCurrentImageIndex(0); // Reset image index when shape changes
  };

  // Handle size selection with product data update
  const handleSizeSelect = (size: ProductSize, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation to product page
    setSelectedSize(size);
    setCurrentImageIndex(0); // Reset image index when size changes
  };

  // Get responsive classes based on device type
  const getResponsiveClasses = () => {
    switch (deviceType) {
      case 'desktop':
        return {
          containerClass: 'rounded-lg p-4 hover:bg-gray-300 transition-colors border border-gray-300 shadow-md cursor-pointer group',
          imageClass: 'w-full h-72 object-cover rounded-lg scale-105',
          titleClass: 'font-semibold mb-2 text-gray-800 truncate transition-colors group-hover:text-[var(--primary-color)]'
        };
      case 'tablet':
        return {
          containerClass: 'rounded-lg p-4 hover:bg-gray-300 transition-colors border border-gray-300 shadow-md cursor-pointer group',
          imageClass: 'w-full h-64 object-cover rounded-lg scale-105',
          titleClass: 'font-semibold mb-2 text-gray-800 truncate transition-colors group-hover:text-[var(--primary-color)]'
        };
      case 'mobile':
        return {
          containerClass: 'rounded-lg p-3 hover:bg-gray-300 transition-colors border border-gray-300 shadow-md cursor-pointer group',
          imageClass: 'w-full h-40 object-cover rounded-lg scale-105',
          titleClass: 'font-semibold mb-2 text-sm text-gray-800 truncate transition-colors group-hover:text-[var(--primary-color)]'
        };
    }
  };

  const classes = getResponsiveClasses();

  return (
    <div
      className={`${classes.containerClass} flex flex-col`}
      data-device-type={deviceType}
      style={{ backgroundColor: 'var(--product-card-bg-color)' }}
      onClick={() => {
        if (onProductClick) {
          onProductClick(String(currentProduct.id));
        } else {
          router.push(`/product/${currentProduct.id}`);
        }
      }}
    >
      <div
        ref={imageRef}
        className="relative mb-4"
        onClick={(e) => {
          if (deviceType === 'tablet') {
            e.stopPropagation();
          }
        }}
        onMouseMove={handleImageMouseMove}
        onMouseLeave={handleImageMouseLeave}
        onTouchStart={deviceType === 'tablet' ? handleTouchStart : undefined}
        onTouchMove={deviceType === 'tablet' ? handleTouchMove : undefined}
        onTouchEnd={deviceType === 'tablet' ? handleTouchEnd : undefined}
      >
        <img
          src={getCurrentDisplayImage()}
          alt={product.name}
          className={`${classes.imageClass} transition-opacity duration-200 ${isVotingMode && isOutOfStock ? 'opacity-50' : ''}`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== '/placeholder-product.svg') {
              target.src = '/placeholder-product.svg';
            }
          }}
          style={{
            filter: 'brightness(1.02)', // Slight brightness enhancement
            transition: 'filter 0.2s ease-in-out'
          }}
        />
        {product.isOnSale && (
          <span className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold">
            -{product.discount}%
          </span>
        )}


      </div>
      
      <div className="flex flex-col">
        <h4 className={classes.titleClass}>{currentProduct.name}</h4>
        {/* Description with dynamic height based on colors, shapes and sizes availability */}
        <div
          className="mb-1"
          style={{
            minHeight: (product.colors && product.colors.length > 0) || (product.shapes && product.shapes.length > 0) || (product.sizes && product.sizes.length > 0)
              ? (deviceType === 'tablet' ? '4.2rem' : '3.6rem')
              : (deviceType === 'tablet' ? '4.5rem' : '4rem')
          }}
        >
          <div
            className="text-sm text-gray-600"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: (product.colors && product.colors.length > 0) || (product.shapes && product.shapes.length > 0) || (product.sizes && product.sizes.length > 0) ? 2 : 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: '1.4rem',
              maxHeight: (product.colors && product.colors.length > 0) || (product.shapes && product.shapes.length > 0) || (product.sizes && product.sizes.length > 0) ? '2.8rem' : '4.2rem',
              wordWrap: 'break-word'
            }}
          >
            {currentProduct.description || 'لا يوجد وصف متاح'}
          </div>
        </div>
        
        {/* Color Options - Horizontal Scroll for colors */}
        {product.colors && product.colors.length > 0 ? (
          <div className={`${deviceType === 'tablet' ? 'h-10' : 'h-8'} mb-1 flex items-center`}>
            <div className={`flex overflow-x-auto scrollbar-hide ${deviceType === 'tablet' ? 'gap-2.5' : 'gap-2'} pb-1`}>
              {product.colors.map((color) => (
                <button
                  key={color.id}
                  onClick={(e) => handleColorSelect(color, e)}
                  className={`${
                    deviceType === 'tablet' ? 'w-7 h-7' : 'w-6 h-6'
                  } rounded-full border-2 transition-all duration-200 flex-shrink-0 ${
                    selectedColor?.id === color.id
                      ? 'border-gray-800 scale-110 shadow-md'
                      : 'border-gray-300 hover:border-gray-500'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className={`${deviceType === 'tablet' ? 'h-3' : 'h-2'} mb-1`}></div>
        )}

        {/* Shape Options - Dropdown for shapes */}
        {product.shapes && product.shapes.length > 0 ? (
          <div className={`${deviceType === 'tablet' ? 'h-10' : 'h-9'} mb-1`}>
            <select
              value={selectedShape?.id || ''}
              onChange={(e) => {
                const shapeId = e.target.value;
                if (shapeId) {
                  const shape = product.shapes?.find(s => s.id === shapeId);
                  if (shape) {
                    handleShapeSelect(shape, e as any);
                  }
                } else {
                  setSelectedShape(null);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full bg-white border border-gray-300 rounded-md px-3 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all shadow-sm ${
                deviceType === 'tablet' ? 'py-2.5 text-base' : 'py-2'
              }`}
            >
              <option value="">اختر الشكل</option>
              {product.shapes.map((shape) => (
                <option key={shape.id} value={shape.id}>
                  {shape.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className={`${deviceType === 'tablet' ? 'h-2' : 'h-1'} mb-1`}></div>
        )}

        {/* Size Options - Dropdown for sizes */}
        {product.sizes && product.sizes.length > 0 ? (
          <div className={`${deviceType === 'tablet' ? 'h-10' : 'h-9'} mb-1`}>
            <select
              value={selectedSize?.id || ''}
              onChange={(e) => {
                const sizeId = e.target.value;
                if (sizeId) {
                  const size = product.sizes?.find(s => s.id === sizeId);
                  if (size) {
                    handleSizeSelect(size, e as any);
                  }
                } else {
                  setSelectedSize(null);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full bg-white border border-gray-300 rounded-md px-3 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all shadow-sm ${
                deviceType === 'tablet' ? 'py-2.5 text-base' : 'py-2'
              }`}
            >
              <option value="">اختر المقاس</option>
              {product.sizes.map((size) => (
                <option key={size.id} value={size.id}>
                  {size.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className={`${deviceType === 'tablet' ? 'h-2' : 'h-1'} mb-1`}></div>
        )}
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {currentProduct.originalPrice && (
                <span className="text-sm line-through text-gray-500">
                  {currentProduct.originalPrice} {websiteCurrency}
                </span>
              )}
              <span className="text-lg font-bold" style={{color: 'var(--primary-color)'}}>
                {getDisplayPrice()} {websiteCurrency}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {profile?.role === 'جملة' && currentProduct.wholesale_price && (
                <span className="text-xs text-blue-600 font-medium">سعر الجملة</span>
              )}
              {/* Display total quantity */}
              {(product.totalQuantity !== undefined || product.stock !== undefined) && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  (product.totalQuantity || product.stock || 0) > 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  الكمية: {product.totalQuantity || product.stock || 0}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Ratings Section - Only show if enabled in settings */}
        {showRatings && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-yellow-400">⭐</span>
              <span className="text-sm text-gray-400">
                {product.rating} ({product.reviews})
              </span>
            </div>
          </div>
        )}

      </div>
      
      {/* Desktop/Tablet Button */}
      {deviceType !== 'mobile' && (
        <>
          {isVotingMode && isOutOfStock ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasUserVoted) {
                  setVoteModalMode('stats');
                } else {
                  setVoteModalMode('vote');
                }
                setIsVoteModalOpen(true);
              }}
              className={`w-full mt-3 rounded-lg font-medium transition-colors text-white px-4 py-2 text-sm ${
                hasUserVoted
                  ? 'bg-gray-600 hover:bg-gray-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {hasUserVoted ? 'عرض الإحصائيات 📊' : 'صوت 🗳️'}
            </button>
          ) : (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                const productToAdd = {
                  ...currentProduct,
                  selectedColor: selectedColor || (product.colors && product.colors.length > 0 ? product.colors[0] : null),
                  selectedShape: selectedShape || (product.shapes && product.shapes.length > 0 ? product.shapes[0] : null),
                  selectedSize: selectedSize,
                  price: getDisplayPrice() // Use the display price based on user role
                };
                await onAddToCart(productToAdd);
              }}
              className={`w-full mt-3 rounded-lg font-medium transition-colors text-white px-4 py-2 text-sm`}
              style={{backgroundColor: 'var(--primary-color)'}}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-hover-color)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-color)';
              }}
            >
              أضف للسلة
            </button>
          )}
        </>
      )}
      
      {/* Mobile Buttons */}
      {deviceType === 'mobile' && (
        <div className="flex gap-1 mt-3">
          {isVotingMode && isOutOfStock ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasUserVoted) {
                  setVoteModalMode('stats');
                } else {
                  setVoteModalMode('vote');
                }
                setIsVoteModalOpen(true);
              }}
              className={`w-full rounded-lg font-medium transition-colors text-white p-1.5 text-xs ${
                hasUserVoted
                  ? 'bg-gray-600 hover:bg-gray-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {hasUserVoted ? 'عرض الإحصائيات 📊' : 'صوت 🗳️'}
            </button>
          ) : (
            <>
              {/* Add Button (80% width) */}
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  const productToAdd = {
                    ...currentProduct,
                    selectedColor: selectedColor || (product.colors && product.colors.length > 0 ? product.colors[0] : null),
                    selectedShape: selectedShape || (product.shapes && product.shapes.length > 0 ? product.shapes[0] : null),
                    selectedSize: selectedSize,
                    price: getDisplayPrice() // Use the display price based on user role
                  };
                  await onAddToCart(productToAdd);
                }}
                className="flex-[4] rounded-lg font-medium transition-colors text-white p-1.5 text-xs"
                style={{backgroundColor: 'var(--primary-color)'}}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-hover-color)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-color)';
                }}
              >
                إضافة
              </button>

              {/* Note Button (20% width) with gray color like in the image */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNoteModal(true);
                }}
                className="flex-1 rounded-lg font-medium transition-colors p-1.5"
                style={{backgroundColor: '#D1D5DB', color: '#374151'}}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#9CA3AF';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#D1D5DB';
                }}
                title="إضافة ملاحظة"
              >
                <svg className="w-3 h-3 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}
      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
             onClick={(e) => {
               if (e.target === e.currentTarget) {
                 setShowNoteModal(false);
               }
             }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-center mb-6 text-gray-800">إضافة ملاحظة</h3>
            
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="أدخل ملاحظتك هنا..."
              className="w-full h-32 p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500 resize-none text-right"
              style={{ fontFamily: 'Cairo, sans-serif' }}
            />
            
            <div className="flex gap-3 mt-4">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNoteModal(false);
                }}
                className="flex-1 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors"
              >
                إلغاء
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  // Here you would save the note with the product
                  console.log('Note saved:', note, 'for product:', product.name);
                  setShowNoteModal(false);
                  setNote('');
                }}
                className="flex-1 py-3 text-white rounded-lg font-medium transition-colors"
                style={{backgroundColor: 'var(--primary-color)'}}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-hover-color)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-color)';
                }}
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Vote Modal */}
      <ProductVoteModal
        isOpen={isVoteModalOpen}
        onClose={() => setIsVoteModalOpen(false)}
        product={currentProduct}
        mode={voteModalMode}
      />
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import VirtualProductsGrid from './VirtualProductsGrid';
import { Product } from './shared/types';
import { useCart } from '@/lib/contexts/CartContext';
import { useCartBadge } from '@/lib/hooks/useCartBadge';
import { useCompanySettings } from '@/lib/hooks/useCompanySettings';
import { useStoreTheme } from '@/lib/hooks/useStoreTheme';
import AuthButtons from '@/app/components/auth/AuthButtons';
import ProductDetailsModal from '@/app/components/ProductDetailsModal';
import CartModal from '@/app/components/CartModal';
import QuantityModal from './QuantityModal';
import Image from 'next/image';

interface DesktopHomeWrapperProps {
  initialProducts: any[];
  initialCategories: any[];
  initialSizeGroups: any[];
}

export default function DesktopHomeWrapper({
  initialProducts,
  initialCategories,
  initialSizeGroups
}: DesktopHomeWrapperProps) {
  const router = useRouter();
  const [websiteProducts, setWebsiteProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isQuantityModalOpen, setIsQuantityModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { addToCart } = useCart();
  const { cartBadgeCount } = useCartBadge();
  const { companyName, logoUrl, logoShape } = useCompanySettings();
  const { primaryColor, primaryHoverColor, interactiveColor } = useStoreTheme();

  const logoRoundingClass = logoShape === 'circle' ? 'rounded-full' : 'rounded-lg';

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Set CSS variables for colors
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--primary-color', primaryColor);
      document.documentElement.style.setProperty('--primary-hover-color', primaryHoverColor);
      document.documentElement.style.setProperty('--interactive-color', interactiveColor);
    }
  }, [primaryColor, primaryHoverColor, interactiveColor]);

  // Convert server products to website format
  useEffect(() => {
    if (!initialProducts || initialProducts.length === 0) {
      setWebsiteProducts([]);
      return;
    }

    try {
      const productsInSizeGroups = new Map();
      const hiddenProductIds = new Set();

      initialSizeGroups?.forEach(group => {
        if (group.product_size_group_items && group.product_size_group_items.length > 0) {
          const representative = group.product_size_group_items[0];
          if (representative.products) {
            productsInSizeGroups.set(representative.products.id, {
              sizeGroup: group,
              sizes: group.product_size_group_items.map((item: any) => ({
                id: item.product_id,
                name: item.size_name,
                product: item.products
              }))
            });
          }

          if (group.product_size_group_items.length > 1) {
            group.product_size_group_items.slice(1).forEach((item: any) => {
              hiddenProductIds.add(item.product_id);
            });
          }
        }
      });

      const convertedProducts: Product[] = initialProducts
        .filter(product => !hiddenProductIds.has(product.id))
        .map(product => {
          const sizeGroupInfo = productsInSizeGroups.get(product.id);
          const sizes = sizeGroupInfo ? sizeGroupInfo.sizes : [];

          return {
            id: product.id,
            name: product.name || 'منتج بدون اسم',
            description: product.description || '',
            price: product.finalPrice || Number(product.price),
            wholesale_price: Number(product.wholesale_price) || undefined,
            originalPrice: product.hasDiscount ? Number(product.price) : undefined,
            image: product.main_image_url || undefined,
            images: product.allImages || [product.main_image_url].filter(Boolean),
            colors: product.colors || [],
            shapes: product.shapes || [],
            sizes: sizes,
            category: product.category?.name || 'عام',
            brand: companyName,
            stock: product.stock || 0,
            totalQuantity: product.stock || 0,
            rating: Number(product.rating) || 0,
            reviews: product.rating_count || 0,
            isOnSale: product.hasDiscount || false,
            discount: product.hasDiscount && product.discount_percentage
              ? Math.round(Number(product.discount_percentage))
              : undefined,
            tags: [],
            isFeatured: product.is_featured || false
          };
        });

      setWebsiteProducts(convertedProducts);
    } catch (error) {
      console.error('Error converting products:', error);
      setWebsiteProducts([]);
    }
  }, [initialProducts, initialSizeGroups, companyName]);

  // Convert categories
  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      const convertedCategories = [
        { id: 'all', name: 'الكل', productCount: websiteProducts.length },
        ...initialCategories.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          description: cat.description || cat.name,
          image: cat.image_url,
          productCount: websiteProducts.filter(p => p.category === cat.name).length
        }))
      ];
      setCategories(convertedCategories);
    }
  }, [initialCategories, websiteProducts]);

  // Filter products by category and search
  const filteredProducts = React.useMemo(() => {
    let filtered = websiteProducts;

    // Filter by category
    if (selectedCategory !== 'الكل') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filtered;
  }, [websiteProducts, selectedCategory, searchQuery]);

  // Handle adding to cart
  const handleAddToCart = async (product: Product) => {
    setSelectedProduct(product);
    setIsQuantityModalOpen(true);
  };

  const handleQuantityConfirm = async (quantity: number) => {
    if (!selectedProduct) return;

    try {
      await addToCart(String(selectedProduct.id), quantity, selectedProduct.price);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleProductClick = (productId: string) => {
    setSelectedProductId(productId);
    setIsProductModalOpen(true);
  };

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#c0c0c0'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل التطبيق...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#c0c0c0'}}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4">
              {logoUrl && (
                <div className={`w-12 h-12 relative ${logoRoundingClass} overflow-hidden`}>
                  <Image src={logoUrl} alt={companyName} fill className="object-cover" />
                </div>
              )}
              <h1 className="text-2xl font-bold text-gray-800">{companyName}</h1>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن المنتجات..."
                  className="w-full px-4 py-3 pr-12 text-right border-2 border-gray-300 rounded-lg focus:outline-none focus:border-gray-500"
                />
                <svg
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Cart & Auth */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsCartModalOpen(true)}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cartBadgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartBadgeCount}
                  </span>
                )}
              </button>
              <AuthButtons />
            </div>
          </div>

          {/* Categories */}
          <div className="mt-4 flex items-center gap-3 overflow-x-auto scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-6 py-2 rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === cat.name
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={selectedCategory === cat.name ? { backgroundColor: primaryColor } : {}}
              >
                {cat.name} ({cat.productCount})
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Products Grid with Virtual Scrolling */}
      <main className="container mx-auto px-6 py-8" style={{ height: 'calc(100vh - 200px)' }}>
        <VirtualProductsGrid
          products={filteredProducts}
          columns={4}
          onProductClick={handleProductClick}
          onAddToCart={handleAddToCart}
        />
      </main>

      {/* Modals */}
      {isProductModalOpen && selectedProductId && (
        <ProductDetailsModal
          productId={selectedProductId}
          isOpen={isProductModalOpen}
          onClose={() => {
            setIsProductModalOpen(false);
            setSelectedProductId('');
          }}
        />
      )}

      {isCartModalOpen && (
        <CartModal
          isOpen={isCartModalOpen}
          onClose={() => setIsCartModalOpen(false)}
        />
      )}

      {isQuantityModalOpen && selectedProduct && (
        <QuantityModal
          isOpen={isQuantityModalOpen}
          onClose={() => setIsQuantityModalOpen(false)}
          onConfirm={handleQuantityConfirm}
          productName={selectedProduct.name}
        />
      )}
    </div>
  );
}

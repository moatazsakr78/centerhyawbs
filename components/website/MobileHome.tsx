'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts, Product as DatabaseProduct } from '../../app/lib/hooks/useProducts';
import { UserInfo, Product } from './shared/types';
import AuthButtons from '../../app/components/auth/AuthButtons';
import { useUserProfile } from '../../lib/hooks/useUserProfile';
import { useStoreCategoriesWithProducts } from '../../lib/hooks/useStoreCategories';
import { useCustomSections } from '../../lib/hooks/useCustomSections';
import InteractiveProductCard from './InteractiveProductCard';
import CategoryCarousel from './CategoryCarousel';
import ProductDetailsModal from '../../app/components/ProductDetailsModal';
import CartModal from '../../app/components/CartModal';
import QuantityModal from './QuantityModal';
import { useCart } from '../../lib/contexts/CartContext';
import { useCartBadge } from '../../lib/hooks/useCartBadge';

interface MobileHomeProps {
  userInfo: UserInfo;
  onCartUpdate: (cart: any[]) => void;
  onRemoveFromCart: (productId: string | number) => void;
  onUpdateQuantity: (productId: string | number, quantity: number) => void;
  onClearCart: () => void;
}

export default function MobileHome({ 
  userInfo, 
  onCartUpdate, 
  onRemoveFromCart, 
  onUpdateQuantity, 
  onClearCart 
}: MobileHomeProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isQuantityModalOpen, setIsQuantityModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [websiteProducts, setWebsiteProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Get user profile to check admin status
  const { isAdmin } = useUserProfile();
  
  // Get cart badge count and cart functions
  const { cartBadgeCount } = useCartBadge();
  const { addToCart } = useCart();

  // Get store categories with their products
  const { categoriesWithProducts, isLoading: isCategoriesLoading } = useStoreCategoriesWithProducts();

  // Get custom sections with products
  const { sections: customSections, isLoading: isSectionsLoading, fetchSectionsWithProducts } = useCustomSections();
  const [sectionsWithProducts, setSectionsWithProducts] = useState<any[]>([]);
  const [isSectionsReady, setIsSectionsReady] = useState(false);
  const [rawSectionsData, setRawSectionsData] = useState<any[]>([]);

  // Handle adding products to cart - now opens quantity modal
  const handleAddToCart = async (product: Product) => {
    setSelectedProduct(product);
    setIsQuantityModalOpen(true);
  };

  // Handle quantity confirmation
  const handleQuantityConfirm = async (quantity: number) => {
    if (!selectedProduct) return;

    try {
      console.log('🛒 Mobile: Adding product to cart:', selectedProduct.name, 'Quantity:', quantity);
      const selectedColorName = selectedProduct.selectedColor?.name || undefined;
      const selectedShapeName = selectedProduct.selectedShape?.name || undefined;
      await addToCart(String(selectedProduct.id), quantity, selectedProduct.price, selectedColorName, selectedShapeName);
      console.log('✅ Mobile: Product added successfully');
    } catch (error) {
      console.error('❌ Mobile: Error adding product to cart:', error);
    }
  };
  
  
  // Get real products from database
  const { products: databaseProducts, isLoading } = useProducts();

  // Convert database products to website format with colors
  useEffect(() => {
    const fetchProductsWithColors = async () => {
      try {
        if (databaseProducts && databaseProducts.length > 0) {
          // First, fetch all product variants for colors and shapes
          const { supabase } = await import('../../app/lib/supabase/client');
          const { data: variants, error: variantsError } = await supabase
            .from('product_variants')
            .select('*')
            .in('variant_type', ['color', 'shape']);

          if (variantsError) {
            console.error('Error fetching product variants:', variantsError);
          }

          // Fetch size groups with their items
          const { data: sizeGroups, error: sizeGroupsError } = await supabase
            .from('product_size_groups')
            .select(`
              *,
              product_size_group_items (
                *,
                products (
                  id,
                  name,
                  main_image_url,
                  price,
                  description
                )
              )
            `)
            .eq('is_active', true);

          if (sizeGroupsError) {
            console.error('Error fetching size groups:', sizeGroupsError);
          }

          // Create a map of products that are part of size groups
          const productsInSizeGroups = new Map();
          sizeGroups?.forEach(group => {
            if (group.product_size_group_items && group.product_size_group_items.length > 0) {
              // Use the first item as the representative for the group
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
            }
          });

          // Create a set of product IDs that should be hidden (all except representatives)
          const hiddenProductIds = new Set();
          sizeGroups?.forEach(group => {
            if (group.product_size_group_items && group.product_size_group_items.length > 1) {
              // Hide all products except the first one (representative)
              group.product_size_group_items.slice(1).forEach((item: any) => {
                hiddenProductIds.add(item.product_id);
              });
            }
          });

          const convertedProducts: Product[] = databaseProducts
            .filter((dbProduct: DatabaseProduct) =>
              !dbProduct.is_hidden && // Hide hidden products
              !hiddenProductIds.has(dbProduct.id) // Hide duplicate products in size groups
            )
            .map((dbProduct: DatabaseProduct) => {
              // Calculate if product has discount
              const hasDiscount = dbProduct.discount_percentage && dbProduct.discount_percentage > 0;
              const finalPrice = hasDiscount 
                ? Number(dbProduct.price) * (1 - Number(dbProduct.discount_percentage) / 100)
                : Number(dbProduct.price);
              
              // Get colors for this product
              const productColors = variants?.filter(v => v.product_id === dbProduct.id && v.variant_type === 'color') || [];
              const colors = productColors.map((variant: any) => ({
                id: variant.id,
                name: variant.color_name || variant.name || 'لون غير محدد',
                hex: variant.color_hex || '#000000',
                image_url: variant.image_url || null
              }));

              // Get shapes for this product
              const productShapes = variants?.filter(v => v.product_id === dbProduct.id && v.variant_type === 'shape') || [];
              const shapes = productShapes.map((variant: any) => ({
                id: variant.id,
                name: variant.name || 'شكل غير محدد',
                image_url: variant.image_url || null
              }));

              // Get sizes for this product (if it's part of a size group)
              const sizeGroupInfo = productsInSizeGroups.get(dbProduct.id);
              const sizes = sizeGroupInfo ? sizeGroupInfo.sizes : [];
              
              return {
                id: dbProduct.id,
                name: dbProduct.name || 'منتج بدون اسم',
                description: dbProduct.description || '',
                price: finalPrice,
                wholesale_price: Number(dbProduct.wholesale_price) || undefined,
                originalPrice: hasDiscount ? Number(dbProduct.price) : undefined,
                image: dbProduct.main_image_url || undefined,
                images: dbProduct.allImages || [], // Use allImages from useProducts hook
                colors: colors, // Real colors from product variants
                shapes: shapes, // Real shapes from product variants
                sizes: sizes,
                category: dbProduct.category?.name || 'عام',
                brand: 'El Farouk Group',
                stock: dbProduct.stock || 0,
                rating: Number(dbProduct.rating) || 0,
                reviews: dbProduct.rating_count || 0,
                isOnSale: hasDiscount || false,
                discount: hasDiscount && dbProduct.discount_percentage ? Math.round(Number(dbProduct.discount_percentage)) : undefined,
                tags: [],
                isFeatured: dbProduct.is_featured || false
              };
            });
          setWebsiteProducts(convertedProducts);
        }
      } catch (error) {
        console.error('Error converting database products:', error);
        setWebsiteProducts([]);
      }
    };

    fetchProductsWithColors();
  }, [databaseProducts]);

  // Load raw sections data immediately on mount
  useEffect(() => {
    let isMounted = true;

    const loadRawSections = async () => {
      try {
        const sections = await fetchSectionsWithProducts();
        if (isMounted) {
          setRawSectionsData(sections);
        }
      } catch (error) {
        console.error('Error loading custom sections:', error);
      }
    };

    loadRawSections();

    return () => {
      isMounted = false;
    };
  }, [fetchSectionsWithProducts]);

  // Convert sections when website products are ready
  useEffect(() => {
    if (!rawSectionsData || rawSectionsData.length === 0) {
      setSectionsWithProducts([]);
      setIsSectionsReady(true);
      return;
    }

    if (!websiteProducts || websiteProducts.length === 0) {
      // Show sections with raw product data if website products aren't ready yet
      const quickSections = rawSectionsData
        .filter((section: any) => section.is_active && section.productDetails && section.productDetails.length > 0)
        .map((section: any) => ({
          ...section,
          products: section.productDetails.map((product: any) => ({
            id: product.id,
            name: product.name,
            description: product.description || '',
            price: product.finalPrice || product.price,
            originalPrice: product.hasDiscount ? product.price : undefined,
            image: product.main_image_url,
            images: [product.main_image_url, product.sub_image_url].filter(Boolean),
            category: 'عام',
            colors: [],
            shapes: [],
            sizes: [],
            brand: 'El Farouk Group',
            stock: 0,
            rating: product.rating || 0,
            reviews: product.rating_count || 0,
            isOnSale: product.hasDiscount || false,
            discount: product.discount_percentage ? Math.round(product.discount_percentage) : undefined,
            tags: [],
            isFeatured: false
          }))
        }));

      requestAnimationFrame(() => {
        setSectionsWithProducts(quickSections);
        setIsSectionsReady(true);
      });
      return;
    }

    // Full conversion with website products
    const activeSections = rawSectionsData
      .filter((section: any) => section.is_active && section.productDetails && section.productDetails.length > 0);

    const sectionsWithConvertedProducts = activeSections.map((section: any) => {
      const convertedProducts = section.productDetails.map((product: any) => {
        const dbProduct = websiteProducts.find(wp => wp.id === product.id);
        return dbProduct || {
          id: product.id,
          name: product.name,
          description: product.description || '',
          price: product.finalPrice || product.price,
          originalPrice: product.hasDiscount ? product.price : undefined,
          image: product.main_image_url,
          images: [product.main_image_url, product.sub_image_url].filter(Boolean),
          category: 'عام',
          colors: [],
          shapes: [],
          sizes: [],
          brand: 'El Farouk Group',
          stock: 0,
          rating: product.rating || 0,
          reviews: product.rating_count || 0,
          isOnSale: product.hasDiscount || false,
          discount: product.discount_percentage ? Math.round(product.discount_percentage) : undefined,
          tags: [],
          isFeatured: false
        };
      });

      return {
        ...section,
        products: convertedProducts
      };
    });

    requestAnimationFrame(() => {
      setSectionsWithProducts(sectionsWithConvertedProducts);
      setIsSectionsReady(true);
    });
  }, [rawSectionsData, websiteProducts]);

  // Convert store categories to website format
  useEffect(() => {
    if (categoriesWithProducts && categoriesWithProducts.length > 0) {
      const convertedCategories = categoriesWithProducts.map((storeCategory: any) => ({
        id: storeCategory.id,
        name: storeCategory.name,
        description: storeCategory.description || storeCategory.name,
        icon: '📦',
        image: storeCategory.image_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
        productCount: storeCategory.products?.length || 0
      }));

      setCategories(convertedCategories);
    } else {
      setCategories([]);
    }
  }, [categoriesWithProducts]);

  // Set client-side flag after component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle menu toggle with animation
  const toggleMenu = () => {
    if (isMenuOpen) {
      // Close menu
      setIsMenuOpen(false);
      setTimeout(() => setIsMenuVisible(false), 300); // Wait for animation to complete
    } else {
      // Open menu
      setIsMenuVisible(true);
      setTimeout(() => setIsMenuOpen(true), 10); // Small delay to allow render
    }
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setTimeout(() => setIsMenuVisible(false), 300);
  };

  // Handle search toggle - now controls search bar visibility in header
  const toggleSearch = () => {
    setIsSearchActive(!isSearchActive);
    if (isSearchActive) {
      setSearchQuery(''); // Clear search when closing
    }
  };

  const filteredProducts = React.useMemo(() => {
    let productsToFilter = websiteProducts;

    // If a specific store category is selected, get products from that category
    if (selectedCategory !== 'الكل' && categoriesWithProducts.length > 0) {
      const selectedStoreCategory = categoriesWithProducts.find((cat: any) => cat.name === selectedCategory);
      if (selectedStoreCategory && selectedStoreCategory.products) {
        // Convert store category products to website product format
        productsToFilter = selectedStoreCategory.products.map((product: any) => {
          const dbProduct = websiteProducts.find(wp => wp.id === product.id);
          return dbProduct || {
            id: product.id,
            name: product.name,
            description: '',
            price: product.price,
            image: product.main_image_url,
            category: selectedCategory,
            colors: [],
            brand: 'El Farouk Group',
            stock: 0,
            rating: 0,
            reviews: 0,
            isOnSale: false,
            tags: [],
            isFeatured: false
          };
        });
      } else {
        // No products in this store category
        productsToFilter = [];
      }
    }

    // Apply search filter
    return productsToFilter.filter(product => {
      const matchesSearch = searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [websiteProducts, selectedCategory, searchQuery, categoriesWithProducts]);

  const featuredProducts = websiteProducts.filter(product => product.isFeatured || product.isOnSale);

  // Handle product click to show modal instead of navigation
  const handleProductClick = (productId: string) => {
    setSelectedProductId(productId);
    setIsProductModalOpen(true);
  };

  const handleCloseProductModal = () => {
    setIsProductModalOpen(false);
    setSelectedProductId('');
  };

  // Show loading state during hydration or while loading data
  if (!isClient || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-custom-gray">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-800">جاري تحميل التطبيق...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-800 bg-custom-gray">
      {/* Mobile Header */}
      <header className="border-b border-gray-700 py-2 fixed top-0 left-0 right-0 z-50 h-16" style={{backgroundColor: '#5d1f1f'}}>
        <div className="px-4 flex items-center justify-between w-full">
          {/* Complete horizontal layout from right to left */}
          <div className="flex items-center gap-2 w-full justify-between">
            {/* Right Side - Menu, Logo, Logo Text */}
            <div className="flex items-center gap-2">
              {/* Menu Button - Far Right */}
              <button 
                onClick={toggleMenu}
                className="p-2 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {/* Logo */}
              <img src="/assets/logo/El Farouk Group2.png" alt="الفاروق" className="h-14 w-14 object-contain" />
              
              {/* Logo Text */}
              <div className="flex flex-col leading-tight">
                <span className="text-white text-lg font-bold">El Farouk</span>
                <span className="text-white text-lg font-bold">Group</span>
              </div>
            </div>

            {/* Left Side - Search, Cart, Account */}
            <div className="flex items-center gap-2">
              {/* Search Toggle Button */}
              <button 
                onClick={toggleSearch}
                className={`p-2 rounded-lg transition-all duration-300 ${isSearchActive ? 'bg-white text-black hover:bg-gray-100' : 'text-white bg-transparent'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              
              {/* Cart Button */}
              <button 
                onClick={() => setIsCartModalOpen(true)}
                className="relative p-2 hover:bg-red-600 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6H19" />
                </svg>
                {cartBadgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-white text-red-600 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartBadgeCount}
                  </span>
                )}
              </button>
              
              {/* Account Icon - Far Left */}
              <AuthButtons compact mobileIconOnly />
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay - Advanced Menu like Desktop/Tablet */}
        {isMenuVisible && (
          <>
            <div className="fixed top-[72px] right-0 bottom-0 left-0 bg-black bg-opacity-50 z-40" onClick={closeMenu} />
            <div className={`fixed top-[72px] right-0 h-[calc(100vh-72px)] w-80 bg-[#eaeaea] border-l border-gray-400 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
              isMenuOpen ? 'translate-x-0' : 'translate-x-full'
            }`}>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-red-600 bg-[#5d1f1f]">
                <h2 className="text-lg font-bold text-white">القائمة الرئيسية</h2>
                <button
                  onClick={closeMenu}
                  className="p-2 text-gray-200 hover:text-white hover:bg-gray-600 rounded-full transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Menu Items */}
              <div className="p-3 overflow-y-auto scrollbar-hide h-[calc(100%-140px)]">
                <div className="space-y-1">
                  
                  {/* Admin-specific buttons */}
                  {isAdmin && (
                    <>
                      {/* Customer Orders (Admin Only) */}
                      <button
                        onClick={() => {
                          window.location.href = '/customer-orders';
                          closeMenu();
                        }}
                        className="flex items-center gap-3 w-full p-3 text-black hover:bg-gray-300 rounded-lg transition-colors text-right group"
                      >
                        <div className="p-2 bg-[#5d1f1f] rounded-full group-hover:bg-red-700 transition-colors">
                          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 text-right">
                          <h3 className="font-semibold text-base text-black">طلبات العملاء</h3>
                          <p className="text-xs text-gray-600">إدارة ومراجعة طلبات جميع العملاء</p>
                        </div>
                      </button>

                      {/* Manage Products */}
                      <button
                        onClick={() => {
                          window.location.href = '/admin/products';
                          closeMenu();
                        }}
                        className="flex items-center gap-3 w-full p-3 text-black hover:bg-gray-300 rounded-lg transition-colors text-right group"
                      >
                        <div className="p-2 bg-[#5d1f1f] rounded-full group-hover:bg-red-700 transition-colors">
                          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div className="flex-1 text-right">
                          <h3 className="font-semibold text-base text-black">إدارة المنتجات</h3>
                          <p className="text-xs text-gray-600">إضافة وتعديل وحذف المنتجات</p>
                        </div>
                      </button>

                      {/* Store Management */}
                      <button
                        onClick={() => {
                          alert('سيتم إضافة صفحة إدارة المتجر قريباً');
                          closeMenu();
                        }}
                        className="flex items-center gap-3 w-full p-3 text-black hover:bg-gray-300 rounded-lg transition-colors text-right group"
                      >
                        <div className="p-2 bg-[#5d1f1f] rounded-full group-hover:bg-red-700 transition-colors">
                          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div className="flex-1 text-right">
                          <h3 className="font-semibold text-base text-black">إدارة المتجر</h3>
                          <p className="text-xs text-gray-600">إعدادات وإدارة المتجر العامة</p>
                        </div>
                      </button>

                      {/* Go to POS System */}
                      <button
                        onClick={() => {
                          window.location.href = '/pos';
                          closeMenu();
                        }}
                        className="flex items-center gap-3 w-full p-3 text-black hover:bg-gray-300 rounded-lg transition-colors text-right group"
                      >
                        <div className="p-2 bg-[#5d1f1f] rounded-full group-hover:bg-red-700 transition-colors">
                          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div className="flex-1 text-right">
                          <h3 className="font-semibold text-base text-black">الانتقال للنظام</h3>
                          <p className="text-xs text-gray-600">الانتقال إلى نظام نقاط البيع</p>
                        </div>
                      </button>

                      {/* Shipping Details */}
                      <button
                        onClick={() => {
                          window.location.href = '/shipping';
                          closeMenu();
                        }}
                        className="flex items-center gap-3 w-full p-3 text-black hover:bg-gray-300 rounded-lg transition-colors text-right group"
                      >
                        <div className="p-2 bg-[#5d1f1f] rounded-full group-hover:bg-red-700 transition-colors">
                          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 text-right">
                          <h3 className="font-semibold text-base text-black">تفاصيل الشحن</h3>
                          <p className="text-xs text-gray-600">إدارة شركات الشحن وأسعار المحافظات</p>
                        </div>
                      </button>
                    </>
                  )}

                  {/* Regular user buttons (hidden for admins) */}
                  {!isAdmin && (
                    <>
                      {/* Profile */}
                      <button
                        onClick={() => {
                          alert('سيتم إضافة صفحة الملف الشخصي قريباً');
                          closeMenu();
                        }}
                        className="flex items-center gap-3 w-full p-3 text-black hover:bg-gray-300 rounded-lg transition-colors text-right group"
                      >
                        <div className="p-2 bg-[#5d1f1f] rounded-full group-hover:bg-red-700 transition-colors">
                          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="flex-1 text-right">
                          <h3 className="font-semibold text-base text-black">الملف الشخصي</h3>
                          <p className="text-xs text-gray-600">إعدادات الحساب والمعلومات الشخصية</p>
                        </div>
                      </button>

                      {/* Favorites */}
                      <button
                        onClick={() => {
                          alert('سيتم إضافة صفحة المفضلة قريباً');
                          closeMenu();
                        }}
                        className="flex items-center gap-3 w-full p-3 text-black hover:bg-gray-300 rounded-lg transition-colors text-right group"
                      >
                        <div className="p-2 bg-[#5d1f1f] rounded-full group-hover:bg-red-700 transition-colors">
                          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 text-right">
                          <h3 className="font-semibold text-base text-black">المفضلة</h3>
                          <p className="text-xs text-gray-600">المنتجات والعناصر المفضلة لديك</p>
                        </div>
                      </button>

                      {/* Orders List */}
                      <button
                        onClick={() => {
                          window.location.href = '/my-orders';
                          closeMenu();
                        }}
                        className="flex items-center gap-3 w-full p-3 text-black hover:bg-gray-300 rounded-lg transition-colors text-right group"
                      >
                        <div className="p-2 bg-[#5d1f1f] rounded-full group-hover:bg-red-700 transition-colors">
                          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 text-right">
                          <h3 className="font-semibold text-base text-black">قائمة الطلبات</h3>
                          <p className="text-xs text-gray-600">عرض وإدارة جميع الطلبات</p>
                        </div>
                      </button>
                    </>
                  )}

                </div>
              </div>

              {/* Footer */}
              <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-400 bg-[#eaeaea]">
                <p className="text-center text-black text-xs">
                  El Farouk Group
                </p>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Search Bar - Part of Header, Fixed Position */}
      <div 
        className="fixed left-0 right-0 z-40 transition-all duration-300 ease-in-out overflow-hidden" 
        style={{
          backgroundColor: '#5d1f1f',
          top: isSearchActive ? '64px' : '0px',
          transform: isSearchActive ? 'translateY(0)' : 'translateY(-100%)',
          opacity: isSearchActive ? 1 : 0,
          visibility: isSearchActive ? 'visible' : 'hidden',
          height: isSearchActive ? '70px' : '0'
        }}
      >
        <div className="px-4 flex items-center justify-center h-full">
          <div className="relative w-full">
            <input 
              type="text" 
              placeholder="ابحث عن المنتجات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-0 rounded-full px-4 py-3 pr-12 text-base text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white transition-all duration-300"
              style={{
                fontFamily: 'Cairo, sans-serif'
              }}
              autoFocus={isSearchActive}
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>


      {/* Mobile Main Content */}
      <main
        className="px-3 py-4 transition-all duration-300"
        style={{
          paddingTop: isSearchActive ? '140px' : '70px' // Adjust for header + search bar
        }}
      >

        {/* Custom Sections (Dynamic) - Show at the top, before categories */}
        {isSectionsReady && selectedCategory === 'الكل' && !searchQuery && sectionsWithProducts.length > 0 && (
          <>
            {sectionsWithProducts.map((section: any) => (
              section.products && section.products.length > 0 && (
                <section key={section.id} className="mb-6">
                  <h3 className="text-xl font-bold mb-4 text-black">{section.name}</h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {section.products.map((product: any) => (
                      <div key={product.id} className="flex-shrink-0 w-44">
                        <InteractiveProductCard
                          product={product}
                          onAddToCart={handleAddToCart}
                          deviceType="mobile"
                          onProductClick={handleProductClick}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )
            ))}
          </>
        )}

        {/* Featured Categories - Hide when searching */}
        {!searchQuery && (
          <section id="categories" className="mb-6">
            <h3 className="text-xl font-bold mb-4 text-black">فئات المنتجات</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {categories.slice(0, 8).map((category) => (
                <div
                  key={category.id}
                  className="bg-white rounded-lg text-center hover:shadow-lg transition-all duration-200 border border-gray-200 group flex-shrink-0 w-40 overflow-hidden"
                  onClick={() => setSelectedCategory(category.name)}
                  style={{ height: '160px' }} // زيادة الارتفاع للهاتف
                >
                  <div className="h-full flex flex-col">
                    {/* الصورة تملأ معظم المكون */}
                    <div className="flex-1 overflow-hidden">
                      <img
                        src={category.image}
                        alt={category.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    {/* منطقة صغيرة للنص في الأسفل */}
                    <div className="bg-white p-2 border-t border-gray-100">
                      <h4 className="font-semibold text-xs text-gray-800 group-hover:text-red-500 transition-colors truncate">{category.name}</h4>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All Products */}
        <section id="products" className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-black">
              {selectedCategory === 'الكل' ? 'جميع المنتجات' : selectedCategory}
            </h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <InteractiveProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                deviceType="mobile"
                onProductClick={handleProductClick}
              />
            ))}
          </div>
        </section>
      </main>


      {/* Product Details Modal */}
      <ProductDetailsModal
        isOpen={isProductModalOpen}
        onClose={handleCloseProductModal}
        productId={selectedProductId}
      />

      {/* Cart Modal */}
      <CartModal
        isOpen={isCartModalOpen}
        onClose={() => setIsCartModalOpen(false)}
      />

      {/* Quantity Modal */}
      <QuantityModal
        isOpen={isQuantityModalOpen}
        onClose={() => {
          setIsQuantityModalOpen(false);
          setSelectedProduct(null);
        }}
        onConfirm={handleQuantityConfirm}
        productName={selectedProduct?.name}
      />
    </div>
  );
}
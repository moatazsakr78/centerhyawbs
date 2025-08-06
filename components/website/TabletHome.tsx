'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts, Product as DatabaseProduct } from '../../app/lib/hooks/useProducts';
import { UserInfo, Product } from './shared/types';
import AuthButtons from '../../app/components/auth/AuthButtons';
import { useUserProfile } from '../../lib/hooks/useUserProfile';

interface TabletHomeProps {
  userInfo: UserInfo;
  onCartUpdate: (cart: any[]) => void;
  onAddToCart: (product: Product) => Promise<void>;
  onRemoveFromCart: (productId: string | number) => void;
  onUpdateQuantity: (productId: string | number, quantity: number) => void;
  onClearCart: () => void;
}

export default function TabletHome({ 
  userInfo, 
  onCartUpdate, 
  onAddToCart, 
  onRemoveFromCart, 
  onUpdateQuantity, 
  onClearCart 
}: TabletHomeProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [isSearchSticky, setIsSearchSticky] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [websiteProducts, setWebsiteProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Get user profile to check admin status
  const { isAdmin } = useUserProfile();
  
  // Get real products from database
  const { products: databaseProducts, isLoading } = useProducts();

  // Convert database products to website format
  useEffect(() => {
    if (databaseProducts && databaseProducts.length > 0) {
      const convertedProducts: Product[] = databaseProducts.map((dbProduct: DatabaseProduct) => ({
        id: dbProduct.id,
        name: dbProduct.name,
        description: dbProduct.description || '',
        price: dbProduct.finalPrice || dbProduct.price,
        originalPrice: dbProduct.isDiscounted ? dbProduct.price : undefined,
        image: dbProduct.main_image_url || undefined,
        images: dbProduct.allImages || [],
        category: dbProduct.category?.name || 'عام',
        brand: 'El Farouk Group',
        stock: dbProduct.totalQuantity || 0,
        rating: dbProduct.rating || 0,
        reviews: dbProduct.rating_count || 0,
        isOnSale: dbProduct.isDiscounted || false,
        discount: dbProduct.isDiscounted && dbProduct.discount_percentage ? Math.round(dbProduct.discount_percentage) : undefined,
        tags: []
      }));
      setWebsiteProducts(convertedProducts);
    }
  }, [databaseProducts]);

  // Fetch categories from database
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { supabase } = await import('../../app/lib/supabase/client');
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        
        if (error) throw error;
        
        const convertedCategories = (data || []).map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          description: cat.name,
          icon: '📦',
          image: cat.image_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
          productCount: 0
        }));
        
        setCategories(convertedCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    
    fetchCategories();
  }, []);

  // Set client-side flag after component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle scroll for sticky search
  useEffect(() => {
    if (!isClient) return;
    
    const handleScroll = () => {
      setIsSearchSticky(window.scrollY > 180);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isClient]);

  const filteredProducts = websiteProducts.filter(product => {
    const matchesSearch = searchQuery === '' || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'الكل' || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const featuredProducts = websiteProducts.filter(product => product.isOnSale || (product.rating && product.rating >= 4.5));

  // Show loading state during hydration or while loading data
  if (!isClient || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#c0c0c0'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{borderBottomColor: '#5D1F1F'}}></div>
          <p className="text-gray-600">جاري تحميل التطبيق...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-800" style={{backgroundColor: '#c0c0c0'}}>
      {/* Tablet Header */}
      <header className="border-b border-gray-700 py-3 sticky top-0 z-50" style={{backgroundColor: '#5d1f1f'}}>
        <div className="max-w-[85%] mx-auto px-3 flex items-center justify-between">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors md:hidden"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="flex items-center gap-2">
            <img src="/assets/logo/El Farouk Group2.png" alt="الفاروق" className="h-10 w-10 object-contain" />
            <h1 className="text-xl font-bold" style={{color: '#5D1F1F'}}>متجر الفاروق</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="mr-4">
              <AuthButtons compact />
            </div>
            
            
            <div className="ml-2">
              <button 
                onClick={() => router.push('/cart')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-white"
                style={{backgroundColor: '#5D1F1F'}}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#4A1616';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#5D1F1F';
                }}
              >
                <span className="text-sm">السلة ({userInfo.cart?.length || 0})</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6H19" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="bg-gray-700 border-t border-gray-600 md:hidden">
            <nav className="px-4 py-2 space-y-2">
              <a href="#products" className="block py-2 px-3 text-gray-300 hover:bg-gray-600 rounded transition-colors hover:text-[#5D1F1F]">المنتجات</a>
              <a href="#categories" className="block py-2 px-3 text-gray-300 hover:bg-gray-600 rounded transition-colors hover:text-[#5D1F1F]">الفئات</a>
              <a href="#offers" className="block py-2 px-3 text-gray-300 hover:bg-gray-600 rounded transition-colors hover:text-[#5D1F1F]">العروض</a>
              <a href="#about" className="block py-2 px-3 text-gray-300 hover:bg-gray-600 rounded transition-colors hover:text-[#5D1F1F]">عن المتجر</a>
            </nav>
          </div>
        )}
      </header>

      {/* Sticky Search Bar */}
      <div className={`${isSearchSticky ? 'fixed top-16 left-0 right-0 bg-gray-800 border-b border-gray-600 py-3 z-40' : 'bg-gray-800 border-b border-gray-700 py-4'} transition-all duration-300`}>
        <div className="max-w-[85%] mx-auto px-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="ابحث عن المنتجات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  backgroundColor: '#374151',
                  border: '1px solid #4B5563',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  paddingRight: '40px',
                  color: 'white',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#5D1F1F';
                  e.target.style.boxShadow = '0 0 0 1px #5D1F1F';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#4B5563';
                  e.target.style.boxShadow = 'none';
                }}
                className="w-full text-white placeholder-gray-400"
              />
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                backgroundColor: '#374151',
                border: '1px solid #4B5563',
                borderRadius: '8px',
                padding: '10px 12px',
                color: 'white',
                fontSize: '14px',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#5D1F1F';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#4B5563';
              }}
            >
              <option value="الكل">جميع الفئات</option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>{category.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tablet Main Content */}
      <main className="max-w-[85%] mx-auto px-3 py-6">

        {/* Quick Categories */}
        <section className="mb-6">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button 
              onClick={() => setSelectedCategory('الكل')}
              style={{
                padding: '8px 16px',
                borderRadius: '9999px',
                fontSize: '14px',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                backgroundColor: selectedCategory === 'الكل' ? '#5D1F1F' : '#1F2937',
                color: selectedCategory === 'الكل' ? 'white' : '#D1D5DB'
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== 'الكل') {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#374151';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== 'الكل') {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#1F2937';
                }
              }}
            >
              الكل
            </button>
            {categories.slice(0, 6).map((category) => (
              <button 
                key={category.id}
                onClick={() => setSelectedCategory(category.name)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: '500',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  backgroundColor: selectedCategory === category.name ? '#5D1F1F' : '#1F2937',
                  color: selectedCategory === category.name ? 'white' : '#D1D5DB'
                }}
                onMouseEnter={(e) => {
                  if (selectedCategory !== category.name) {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#374151';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCategory !== category.name) {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#1F2937';
                  }
                }}
              >
                {category.name}
              </button>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        <section className="mb-6">
          <h3 className="text-2xl font-bold mb-4 text-black">المنتجات المميزة</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredProducts.slice(0, 6).map((product) => (
              <div key={product.id} className="bg-gray-800 rounded-lg p-3 hover:bg-gray-700 transition-colors border border-gray-700 cursor-pointer group">
                <div className="relative mb-3" onClick={() => router.push(`/product/${product.id}`)}>
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-48 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                  />
                  {product.isOnSale && (
                    <span className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                      -{product.discount}%
                    </span>
                  )}
                </div>
                <div onClick={() => router.push(`/product/${product.id}`)}>
                  <h4 className="font-semibold mb-2 text-sm text-white truncate transition-colors" style={{'--hover-color': '#5D1F1F'}} onMouseEnter={(e) => {(e.target as HTMLElement).style.color = '#5D1F1F';}} onMouseLeave={(e) => {(e.target as HTMLElement).style.color = 'white';}}>{product.name}</h4>
                  <div className="h-8 mb-3">
                    <p className="text-gray-400 text-xs overflow-hidden" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: '1rem',
                      maxHeight: '2rem'
                    }}>
                      {product.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      {product.originalPrice && (
                        <span className="text-xs text-gray-500 line-through">{product.originalPrice} ريال</span>
                      )}
                      <span className="text-sm font-bold" style={{color: '#5D1F1F'}}>{product.price} ريال</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400 text-sm">⭐</span>
                      <span className="text-xs text-gray-400">{product.rating}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    await onAddToCart(product);
                  }}
                  style={{
                    backgroundColor: '#5D1F1F',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '500',
                    width: '100%',
                    marginTop: '8px',
                    color: 'white',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#4A1616';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#5D1F1F';
                  }}
                >
                  أضف
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* All Products */}
        <section id="products" className="mb-6">
          <h3 className="text-2xl font-bold mb-4 text-black">جميع المنتجات</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-gray-800 rounded-lg p-3 hover:bg-gray-700 transition-colors border border-gray-700 cursor-pointer group">
                <div className="relative mb-3" onClick={() => router.push(`/product/${product.id}`)}>
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-48 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                  />
                  {product.isOnSale && (
                    <span className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                      -{product.discount}%
                    </span>
                  )}
                </div>
                <div onClick={() => router.push(`/product/${product.id}`)}>
                  <h4 className="font-semibold mb-2 text-sm text-white truncate transition-colors" style={{'--hover-color': '#5D1F1F'}} onMouseEnter={(e) => {(e.target as HTMLElement).style.color = '#5D1F1F';}} onMouseLeave={(e) => {(e.target as HTMLElement).style.color = 'white';}}>{product.name}</h4>
                  <div className="h-8 mb-3">
                    <p className="text-gray-400 text-xs overflow-hidden" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: '1rem',
                      maxHeight: '2rem'
                    }}>
                      {product.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      {product.originalPrice && (
                        <span className="text-xs text-gray-500 line-through">{product.originalPrice} ريال</span>
                      )}
                      <span className="text-sm font-bold" style={{color: '#5D1F1F'}}>{product.price} ريال</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400 text-sm">⭐</span>
                      <span className="text-xs text-gray-400">{product.rating}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    await onAddToCart(product);
                  }}
                  style={{
                    backgroundColor: '#5D1F1F',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '500',
                    width: '100%',
                    marginTop: '8px',
                    color: 'white',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#4A1616';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = '#5D1F1F';
                  }}
                >
                  أضف
                </button>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-6">
            <button className="bg-gray-800 hover:bg-gray-700 px-6 py-3 rounded-lg font-medium transition-colors border border-gray-700">
              عرض المزيد
            </button>
          </div>
        </section>

        {/* Featured Categories */}
        <section id="categories" className="mb-6">
          <h3 className="text-2xl font-bold mb-4 text-black">فئات المنتجات</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories.map((category) => (
              <div 
                key={category.id} 
                className="bg-gray-800 p-4 rounded-lg text-center hover:bg-gray-700 transition-colors cursor-pointer border border-gray-700 group"
                onClick={() => setSelectedCategory(category.name)}
              >
                <div className="relative mb-3">
                  <img 
                    src={category.image} 
                    alt={category.name} 
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">{category.icon}</span>
                  </div>
                </div>
                <h4 className="font-semibold text-sm text-white transition-colors" onMouseEnter={(e) => {(e.target as HTMLElement).style.color = '#5D1F1F';}} onMouseLeave={(e) => {(e.target as HTMLElement).style.color = 'white';}}>{category.name}</h4>
                <p className="text-xs text-gray-400 mt-1">{category.productCount} منتج</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Tablet Footer */}
      <footer className="py-6 mt-8" style={{backgroundColor: '#4D4D4D', borderTop: '1px solid #666'}}>
        <div className="max-w-[85%] mx-auto px-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <img src="/assets/logo/El Farouk Group2.png" alt="الفاروق" className="h-6 w-6 object-contain" />
                <h5 className="font-bold text-lg" style={{color: '#5D1F1F'}}>متجر الفاروق</h5>
              </div>
              <p className="text-gray-400 text-sm mb-4">متجرك المتكامل للحصول على أفضل المنتجات بأسعار مميزة وجودة عالية</p>
              <div className="space-y-1 text-gray-400 text-sm">
                <p>📞 966+123456789</p>
                <p>✉️ info@elfarouk-store.com</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h6 className="font-semibold mb-2 text-sm">روابط سريعة</h6>
                <ul className="space-y-1 text-gray-400 text-sm">
                  <li><a href="#" className="hover:text-red-400 transition-colors">الرئيسية</a></li>
                  <li><a href="#" className="hover:text-red-400 transition-colors">المنتجات</a></li>
                  <li><a href="#" className="hover:text-red-400 transition-colors">من نحن</a></li>
                </ul>
              </div>
              <div>
                <h6 className="font-semibold mb-2 text-sm">خدمة العملاء</h6>
                <ul className="space-y-1 text-gray-400 text-sm">
                  <li><a href="#" className="hover:text-red-400 transition-colors">المساعدة</a></li>
                  <li><a href="#" className="hover:text-red-400 transition-colors">سياسة الإرجاع</a></li>
                  <li><a href="#" className="hover:text-red-400 transition-colors">الدفع</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
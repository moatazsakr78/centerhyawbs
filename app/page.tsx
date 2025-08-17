'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { detectDeviceClient, DeviceInfo } from '../lib/device-detection';
import DesktopHome from '../components/website/DesktopHome';
import TabletHome from '../components/website/TabletHome';
import MobileHome from '../components/website/MobileHome';
import { useRealCart } from '../lib/useRealCart';
import { useAuth } from '../lib/useAuth';
import { UserInfo } from '../components/website/shared/types';
import { CartProvider } from '../lib/contexts/CartContext';

export default function HomePage() {
  const router = useRouter();
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    type: 'desktop',
    userAgent: '',
    isMobile: false,
    isTablet: false,
    isDesktop: true
  });
  const [isClient, setIsClient] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo>({
    id: '1',
    name: 'عميل تجريبي',
    email: 'customer@example.com',
    cart: []
  });

  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, getCartItemsCount, refreshCart } = useRealCart();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // Set client flag first
    setIsClient(true);
    // Client-side device detection
    const detected = detectDeviceClient();
    setDeviceInfo(detected);
  }, []);

  // Separate effect for cart refresh
  useEffect(() => {
    if (isClient) {
      console.log('🏠 HomePage: Component mounted, refreshing cart...');
      refreshCart();
    }
  }, [isClient, refreshCart]);

  // Add effect to refresh cart when component mounts or becomes visible
  useEffect(() => {
    const handleFocus = () => {
      console.log('🏠 HomePage: Window focused, refreshing cart...');
      refreshCart();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🏠 HomePage: Page became visible, refreshing cart...');
        refreshCart();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshCart]);

  const handleCartUpdate = (newCart: any[]) => {
    // Real cart is managed by useRealCart hook with Supabase
    console.log('Cart updated:', newCart);
  };

  // Convert Supabase cart data to compatible format
  const compatibleCart = cart.map(item => ({
    id: item.id,
    name: item.products?.name || 'منتج غير معروف',
    price: item.price,
    quantity: item.quantity,
    image: item.products?.main_image_url || '',
    description: '',
    category: ''
  }));

  // Calculate cart count from real cart data
  const realCartCount = getCartItemsCount();
  console.log('🏠 HomePage: realCartCount =', realCartCount, 'cart.length =', cart.length);

  const updatedUserInfo = {
    ...userInfo,
    id: isAuthenticated ? user?.id || '1' : '1',
    name: isAuthenticated ? user?.name || 'عميل مسجل' : 'عميل تجريبي',
    email: isAuthenticated ? user?.email || 'user@example.com' : 'customer@example.com',
    cart: compatibleCart, // Compatible cart data format
    cartCount: realCartCount // Real cart count for display
  };

  // Show loading screen during hydration to prevent mismatch
  if (!isClient) {
    return (
      <CartProvider>
        <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#c0c0c0'}}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">جاري تحميل التطبيق...</p>
          </div>
        </div>
      </CartProvider>
    );
  }

  // Render appropriate component based on device type
  return (
    <CartProvider>
      {(() => {
        switch (deviceInfo.type) {
    case 'mobile':
      return (
        <MobileHome 
          userInfo={updatedUserInfo} 
          onCartUpdate={handleCartUpdate}
          onRemoveFromCart={(productId: string | number) => {
            const item = cart.find(item => item.product_id === String(productId));
            if (item) removeFromCart(item.id);
          }}
          onUpdateQuantity={(productId: string | number, quantity: number) => {
            const item = cart.find(item => item.product_id === String(productId));
            if (item) updateQuantity(item.id, quantity);
          }}
          onClearCart={clearCart}
        />
      );

    case 'tablet':
      return (
        <TabletHome 
          userInfo={updatedUserInfo} 
          onCartUpdate={handleCartUpdate}
          onRemoveFromCart={(productId: string | number) => {
            const item = cart.find(item => item.product_id === String(productId));
            if (item) removeFromCart(item.id);
          }}
          onUpdateQuantity={(productId: string | number, quantity: number) => {
            const item = cart.find(item => item.product_id === String(productId));
            if (item) updateQuantity(item.id, quantity);
          }}
          onClearCart={clearCart}
        />
      );

    case 'desktop':
    default:
      return (
        <DesktopHome 
          userInfo={updatedUserInfo} 
          onCartUpdate={handleCartUpdate}
          onRemoveFromCart={(productId: string | number) => {
            const item = cart.find(item => item.product_id === String(productId));
            if (item) removeFromCart(item.id);
          }}
          onUpdateQuantity={(productId: string | number, quantity: number) => {
            const item = cart.find(item => item.product_id === String(productId));
            if (item) updateQuantity(item.id, quantity);
          }}
          onClearCart={clearCart}
        />
      );
        }
      })()}
    </CartProvider>
  );
}
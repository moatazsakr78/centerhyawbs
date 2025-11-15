'use client';

import { useState, useEffect } from 'react';
import DesktopHome from './DesktopHome';
import TabletHome from './TabletHome';
import MobileHome from './MobileHome';
import { useRealCart } from '@/lib/useRealCart';
import { useAuth } from '@/lib/useAuth';

interface ClientHomePageProps {
  deviceType: 'desktop' | 'tablet' | 'mobile';
  initialProducts: any[];
  initialCategories: any[];
  initialSizeGroups: any[];
}

export default function ClientHomePage({
  deviceType,
  initialProducts,
  initialCategories,
  initialSizeGroups
}: ClientHomePageProps) {
  const [isClient, setIsClient] = useState(false);
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, getCartItemsCount, refreshCart } = useRealCart();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      refreshCart();
    }
  }, [isClient, refreshCart]);

  useEffect(() => {
    const handleFocus = () => refreshCart();
    const handleVisibilityChange = () => {
      if (!document.hidden) refreshCart();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshCart]);

  const handleCartUpdate = () => {};

  const compatibleCart = cart.map(item => ({
    id: item.id,
    name: item.products?.name || 'منتج غير معروف',
    price: item.price,
    quantity: item.quantity,
    image: item.products?.main_image_url || '',
    description: '',
    category: ''
  }));

  const realCartCount = getCartItemsCount();

  const userInfo = {
    id: isAuthenticated ? user?.id || '1' : '1',
    name: isAuthenticated ? user?.name || 'عميل مسجل' : 'عميل تجريبي',
    email: isAuthenticated ? user?.email || 'user@example.com' : 'customer@example.com',
    cart: compatibleCart,
    cartCount: realCartCount
  };

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#c0c0c0'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل التطبيق...</p>
        </div>
      </div>
    );
  }

  const commonProps = {
    userInfo,
    onCartUpdate: handleCartUpdate,
    onRemoveFromCart: (productId: string | number) => {
      const item = cart.find(item => item.product_id === String(productId));
      if (item) removeFromCart(item.id);
    },
    onUpdateQuantity: (productId: string | number, quantity: number) => {
      const item = cart.find(item => item.product_id === String(productId));
      if (item) updateQuantity(item.id, quantity);
    },
    onClearCart: clearCart,
    serverProducts: initialProducts,
    serverCategories: initialCategories,
    serverSizeGroups: initialSizeGroups
  };

  switch (deviceType) {
    case 'mobile':
      return <MobileHome {...commonProps} />;
    case 'tablet':
      return <TabletHome {...commonProps} />;
    case 'desktop':
    default:
      return <DesktopHome {...commonProps} />;
  }
}

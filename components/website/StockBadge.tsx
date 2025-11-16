'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';

interface StockData {
  productId: string;
  quantity: number;
  available: boolean;
  low_stock: boolean;
  min_stock: number;
}

interface StockBadgeProps {
  productId: string;
  className?: string;
  showQuantity?: boolean; // Whether to show exact quantity
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * StockBadge - Displays real-time stock availability
 *
 * Hybrid Approach:
 * - Product page is static (fast!)
 * - Stock quantity is fetched client-side (accurate!)
 * - Uses SWR for efficient caching and revalidation
 *
 * Performance:
 * - First render: Shows loading state
 * - After 100-200ms: Shows real stock data
 * - Cached for 30 seconds client-side
 * - API cached for 60 seconds on CDN
 *
 * Result: Fast page load + accurate stock info!
 */
export default function StockBadge({
  productId,
  className = '',
  showQuantity = true
}: StockBadgeProps) {
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data, error, isLoading } = useSWR<StockData>(
    mounted ? `/api/stock/${productId}` : null,
    fetcher,
    {
      revalidateOnFocus: false, // Don't revalidate when user returns to tab
      dedupingInterval: 30000, // Dedupe requests within 30 seconds
      refreshInterval: 0, // Don't auto-refresh (rely on CDN cache)
    }
  );

  // Loading state
  if (!mounted || isLoading) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
        <span className="text-sm text-gray-500">جاري التحميل...</span>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return null; // Silently hide if error (better UX than showing error)
  }

  const { quantity, available, low_stock } = data;

  // Out of stock
  if (!available) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <span className="text-sm font-medium text-red-600">غير متوفر</span>
      </div>
    );
  }

  // Low stock warning
  if (low_stock) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
        <span className="text-sm font-medium text-orange-600">
          {showQuantity ? `متبقي ${quantity} فقط` : 'كمية محدودة'}
        </span>
      </div>
    );
  }

  // In stock
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="w-3 h-3 rounded-full bg-green-500"></div>
      <span className="text-sm font-medium text-green-600">
        {showQuantity ? `متوفر (${quantity})` : 'متوفر'}
      </span>
    </div>
  );
}

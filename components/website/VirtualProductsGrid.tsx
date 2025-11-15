'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import InteractiveProductCard from './InteractiveProductCard';
import { Product } from './shared/types';

interface VirtualProductsGridProps {
  products: Product[];
  columns?: number; // Number of columns (default: 4)
  onProductClick?: (productId: string) => void;
  onAddToCart?: (product: Product) => Promise<void> | void;
}

export default function VirtualProductsGrid({
  products,
  columns = 4,
  onProductClick,
  onAddToCart
}: VirtualProductsGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  // Calculate rows needed
  const rows = Math.ceil(products.length / columns);

  // Virtualizer for rows only (columns are fixed)
  const rowVirtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 400, // Estimated height of each row (adjust based on your design)
    overscan: 2, // Preload 2 rows before/after visible area
  });

  // Preload images for visible and upcoming rows
  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    const imagesToPreload: string[] = [];

    virtualItems.forEach(virtualRow => {
      const startIndex = virtualRow.index * columns;
      const endIndex = Math.min(startIndex + columns, products.length);

      for (let i = startIndex; i < endIndex; i++) {
        const product = products[i];
        if (product && product.image && !loadedImages.has(product.image)) {
          imagesToPreload.push(product.image);
        }
      }
    });

    // Preload images
    if (imagesToPreload.length > 0) {
      imagesToPreload.forEach(src => {
        const img = new Image();
        img.onload = () => {
          setLoadedImages(prev => new Set(prev).add(src));
        };
        img.src = src;
      });
    }
  }, [rowVirtualizer.getVirtualItems(), products, columns, loadedImages]);

  return (
    <div
      ref={parentRef}
      className="overflow-y-auto scrollbar-hide"
      style={{
        height: '100%',
        width: '100%',
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map(virtualRow => {
          const startIndex = virtualRow.index * columns;
          const endIndex = Math.min(startIndex + columns, products.length);
          const rowProducts = products.slice(startIndex, endIndex);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className="grid gap-6 px-6"
                style={{
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`
                }}
              >
                {rowProducts.map((product, colIndex) => (
                  <div key={product.id} className="w-full">
                    <InteractiveProductCard
                      product={product}
                      deviceType="desktop"
                      onProductClick={() => onProductClick?.(String(product.id))}
                      onAddToCart={async () => {
                        if (onAddToCart) {
                          await onAddToCart(product);
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

interface ProductManagementItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isHidden: boolean;
  isFeatured: boolean;
  displayOrder: number;
  suggestedProducts: string[];
}

interface SuggestedProductsModalProps {
  productId: string;
  products: ProductManagementItem[];
  currentSuggestions: string[];
  onSave: (suggestedIds: string[]) => void;
  onClose: () => void;
}

export default function SuggestedProductsModal({
  productId,
  products,
  currentSuggestions,
  onSave,
  onClose,
}: SuggestedProductsModalProps) {
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>(currentSuggestions);
  const [searchQuery, setSearchQuery] = useState('');

  const currentProduct = products.find(p => p.id === productId);
  const availableProducts = products.filter(p => p.id !== productId);

  const filteredProducts = availableProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSuggestion = (suggestionId: string) => {
    setSelectedSuggestions(prev => 
      prev.includes(suggestionId)
        ? prev.filter(id => id !== suggestionId)
        : [...prev, suggestionId]
    );
  };

  const handleSave = () => {
    onSave(selectedSuggestions);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b" style={{backgroundColor: 'var(--primary-color)'}}>
          <div className="flex items-center justify-between">
            <div className="text-white">
              <h3 className="text-xl font-semibold">إدارة المنتجات المقترحة</h3>
              <p className="text-red-200 text-sm mt-1">للمنتج: {currentProduct?.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-red-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b bg-gray-50">
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث عن المنتجات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Selected Count */}
        <div className="px-4 py-2 border-b" style={{ backgroundColor: '#F5F1F1' }}>
          <p className="text-sm" style={{ color: 'var(--primary-color)' }}>
            تم تحديد {selectedSuggestions.length} منتج كمقترحات
          </p>
        </div>

        {/* Products Grid */}
        <div className="p-4 overflow-y-auto max-h-96">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.slice(0, 9).map((product) => {
              const isSelected = selectedSuggestions.includes(product.id);
              return (
                <div
                  key={product.id}
                  onClick={() => toggleSuggestion(product.id)}
                  className={`border rounded-lg p-3 cursor-pointer transition-all ${
                    isSelected 
                      ? 'shadow-md' 
                      : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-sm'
                  }`}
                  style={isSelected ? { borderColor: 'var(--primary-color)', backgroundColor: '#F5F1F1' } : {}}
                >
                  <div className="flex items-start gap-3">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src !== '/placeholder-product.svg') {
                          target.src = '/placeholder-product.svg';
                        }
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-800 text-sm truncate">{product.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">{product.category}</p>
                      <p className="text-sm font-semibold mt-1" style={{color: 'var(--primary-color)'}}>
                        {product.price} ريال
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div 
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected 
                            ? '' 
                            : 'border-gray-300'
                        }`}
                        style={isSelected ? { backgroundColor: 'var(--primary-color)', borderColor: 'var(--primary-color)' } : {}}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              لا توجد منتجات متطابقة مع البحث
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            حفظ المقترحات
          </button>
        </div>
      </div>
    </div>
  );
}
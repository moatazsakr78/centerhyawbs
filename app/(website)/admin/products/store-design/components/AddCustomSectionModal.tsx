'use client';

import { useState, useEffect, useRef } from 'react';
import { useCustomSections } from '../../../../../../lib/hooks/useCustomSections';

interface AddCustomSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  onSectionCreated?: () => void;
  editingSection?: any | null;
}

export default function AddCustomSectionModal({
  isOpen,
  onClose,
  products,
  onSectionCreated,
  editingSection
}: AddCustomSectionModalProps) {
  const { createSection, updateSection, addProductsToSection } = useCustomSections();
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [sectionName, setSectionName] = useState('');

  // Products selection state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Reset form when modal opens/closes or load editing data
  useEffect(() => {
    if (isOpen) {
      if (editingSection) {
        // Load editing data
        setSectionName(editingSection.name || '');
        setSearchTerm('');
        setSelectedProducts(new Set(editingSection.products || []));
        setSelectAll(false);
      } else {
        // Reset for new section
        setSectionName('');
        setSearchTerm('');
        setSelectedProducts(new Set());
        setSelectAll(false);
      }
    }
  }, [isOpen, editingSection]);

  // Filter products based on search
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.category?.name && product.category.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle individual product selection
  const toggleProductSelection = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
    setSelectAll(newSelected.size === filteredProducts.length);
  };

  // Handle select all toggle
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
    setSelectAll(!selectAll);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!sectionName.trim()) {
      alert('يرجى إدخال اسم القسم');
      return;
    }

    if (selectedProducts.size === 0) {
      alert('يرجى اختيار منتج واحد على الأقل');
      return;
    }

    setIsCreating(true);
    try {
      if (editingSection) {
        // Update existing section
        await updateSection(editingSection.id, {
          name: sectionName.trim(),
          products: Array.from(selectedProducts)
        });
        alert('تم تحديث القسم بنجاح!');
      } else {
        // Create new section
        await createSection({
          name: sectionName.trim(),
          section_key: `section-${Date.now()}`,
          is_active: true,
          display_order: 0,
          products: Array.from(selectedProducts)
        });
        alert('تم إنشاء القسم بنجاح!');
      }

      onSectionCreated?.();
      onClose();
    } catch (error) {
      console.error('Error creating/updating section:', error);
      alert(editingSection ? 'حدث خطأ أثناء تحديث القسم' : 'حدث خطأ أثناء إنشاء القسم');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">
            {editingSection ? 'تعديل القسم المخصص' : 'إضافة قسم مخصص جديد'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اسم القسم <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder="مثال: منتجات تيك توك، المنتجات الجديدة، عروض خاصة..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              {sectionName.length}/100 حرف
            </p>
          </div>

          {/* Products Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اختيار المنتجات <span className="text-red-500">*</span>
            </label>

            {/* Search and Select All */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="البحث في المنتجات..."
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">اختيار الكل</span>
              </label>
            </div>

            {/* Selected Count */}
            <div className="mb-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">{selectedProducts.size}</span> منتج محدد
              </p>
            </div>

            {/* Products Grid */}
            <div className="border border-gray-300 rounded-lg max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-3">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => toggleProductSelection(product.id)}
                    className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                      selectedProducts.has(product.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="aspect-square relative">
                      <img
                        src={product.main_image_url || '/placeholder-product.svg'}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-t-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder-product.svg';
                        }}
                      />
                      {selectedProducts.has(product.id) && (
                        <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-800 truncate">{product.name}</p>
                      <p className="text-xs text-gray-500 truncate">{product.category?.name || 'عام'}</p>
                    </div>
                  </div>
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-500">لا توجد منتجات مطابقة للبحث</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={isCreating}
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={isCreating || !sectionName.trim() || selectedProducts.size === 0}
            className="px-6 py-2 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--primary-color)' }}
            onMouseEnter={(e) => {
              if (!isCreating) (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-hover-color)';
            }}
            onMouseLeave={(e) => {
              if (!isCreating) (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-color)';
            }}
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                {editingSection ? 'جاري التحديث...' : 'جاري الإنشاء...'}
              </>
            ) : (
              editingSection ? 'تحديث القسم' : 'إنشاء القسم'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

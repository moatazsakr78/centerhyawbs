'use client';

import { useState, useEffect, useRef } from 'react';
import { useStoreCategories, CreateStoreCategoryData } from '../../../../../lib/hooks/useStoreCategories';
import { uploadCategoryImage } from '../../../../../app/lib/supabase/storage';

interface ProductSelectionItem {
  id: string;
  name: string;
  image: string;
  category: string;
  isSelected: boolean;
}

interface AddStoreCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  onCategoryCreated?: () => void;
  editingCategory?: any | null;
}

export default function AddStoreCategoryModal({
  isOpen,
  onClose,
  products,
  onCategoryCreated,
  editingCategory
}: AddStoreCategoryModalProps) {
  const { createCategory, updateCategory, getCategoryProducts, addProductsToCategory, removeProductsFromCategory } = useStoreCategories();
  const [isCreating, setIsCreating] = useState(false);

  // Form state - simplified
  const [categoryName, setCategoryName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Image upload states
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Products selection state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Category products state (for editing)
  const [categoryProducts, setCategoryProducts] = useState<any[]>([]);
  const [isLoadingCategoryProducts, setIsLoadingCategoryProducts] = useState(false);

  // Browse mode state
  const [isBrowseMode, setIsBrowseMode] = useState(false);

  // Scroll state for hiding tabs section based on content scroll
  const [isTabsHidden, setIsTabsHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load category products for editing
  const loadCategoryProducts = async (categoryId: string) => {
    try {
      setIsLoadingCategoryProducts(true);
      const categoryProductsData = await getCategoryProducts(categoryId);
      setCategoryProducts(categoryProductsData);

      // Set selected products from category
      const categoryProductIds = categoryProductsData.map((cp: any) => cp.product_id);
      setSelectedProducts(new Set(categoryProductIds));
    } catch (error) {
      console.error('Error loading category products:', error);
      setCategoryProducts([]);
      setSelectedProducts(new Set());
    } finally {
      setIsLoadingCategoryProducts(false);
    }
  };

  // Reset form when modal opens/closes or load editing data
  useEffect(() => {
    if (isOpen) {
      if (editingCategory) {
        // Load editing data
        setCategoryName(editingCategory.name || '');
        setImageUrl(editingCategory.image || editingCategory.image_url || '');
        setImageFile(null);
        setSearchTerm('');
        setSelectAll(false);

        // Load category products only for existing categories
        if (editingCategory.id) {
          loadCategoryProducts(editingCategory.id);
        }
      } else {
        // Reset for new category
        setCategoryName('');
        setImageUrl('');
        setImageFile(null);
        setSearchTerm('');
        setSelectedProducts(new Set());
        setSelectAll(false);
        setCategoryProducts([]);
      }

      // Reset browse mode and scroll state
      setIsBrowseMode(false);
      setIsTabsHidden(false);
      setLastScrollY(0);
    }
  }, [isOpen, editingCategory]);

  // Handle scroll to hide/show tabs section like in the main page
  const handleScroll = () => {
    if (!scrollRef.current || isBrowseMode) return;

    const currentScrollY = scrollRef.current.scrollTop;
    const threshold = 10; // Minimum scroll to trigger hide/show

    if (Math.abs(currentScrollY - lastScrollY) < threshold) return;

    if (currentScrollY > lastScrollY && currentScrollY > 50) {
      // Scrolling down and past threshold - hide tabs
      if (!isTabsHidden) {
        setIsTabsHidden(true);
      }
    } else if (currentScrollY < lastScrollY) {
      // Scrolling up - show tabs
      if (isTabsHidden) {
        setIsTabsHidden(false);
      }
    }

    setLastScrollY(currentScrollY);
  };

  // Filter products based on search
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
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

    // Update select all checkbox
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

  // Image upload functions
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    setIsUploading(true);
    try {
      const uploadedImageUrl = await uploadCategoryImage(file);
      setImageUrl(uploadedImageUrl);
      setImageFile(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('حدث خطأ أثناء رفع الصورة');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleImageUpload(files[0]);
    }
  };

  const removeImage = () => {
    setImageUrl('');
    setImageFile(null);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!categoryName.trim()) {
      alert('يرجى إدخال اسم الفئة');
      return;
    }

    if (!editingCategory && selectedProducts.size === 0) {
      if (!confirm('لم تقم بتحديد أي منتجات. هل تريد إنشاء فئة فارغة؟')) {
        return;
      }
    }

    setIsCreating(true);

    try {
      if (editingCategory) {
        // Update existing category
        const updates = {
          name: categoryName.trim(),
          image_url: imageUrl.trim() || null
        };

        await updateCategory(editingCategory.id, updates);

        // Handle products changes for editing category
        const currentProductIds = categoryProducts.map(cp => cp.product_id);
        const newProductIds = Array.from(selectedProducts);

        const productsToAdd = newProductIds.filter(id => !currentProductIds.includes(id));
        const productsToRemove = currentProductIds.filter(id => !newProductIds.includes(id));

        // Add new products
        if (productsToAdd.length > 0) {
          await addProductsToCategory(editingCategory.id, productsToAdd);
        }

        // Remove products
        if (productsToRemove.length > 0) {
          await removeProductsFromCategory(editingCategory.id, productsToRemove);
        }

        alert(`تم تحديث فئة "${categoryName}" بنجاح!`);
      } else {
        // Create new category
        const categoryData: CreateStoreCategoryData = {
          name: categoryName.trim(),
          image_url: imageUrl.trim() || undefined,
          product_ids: Array.from(selectedProducts)
        };

        await createCategory(categoryData);
        alert(`تم إنشاء فئة "${categoryName}" بنجاح مع ${selectedProducts.size} منتج!`);
      }

      if (onCategoryCreated) {
        onCategoryCreated();
      }

      onClose();
    } catch (error) {
      console.error('Error saving store category:', error);
      alert(`حدث خطأ أثناء ${editingCategory ? 'تحديث' : 'إنشاء'} الفئة. يرجى المحاولة مرة أخرى.`);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - Enhanced for mobile touch blocking */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} style={{ touchAction: 'none' }} />

      {/* Modal */}
      <div
        className={`fixed ${isBrowseMode ? 'inset-0 w-full h-full' : 'md:top-0 md:right-0 md:h-full md:w-[480px] w-full h-full inset-0'} bg-[#eaeaea] border-l border-gray-400 shadow-2xl z-50 flex flex-col overflow-hidden`}
        style={{ touchAction: 'auto' }}
      >


        {/* Header - Mobile optimized */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-red-600 bg-[var(--primary-color)] flex-shrink-0">
          <h2 className="text-base md:text-lg font-bold text-white">
            {editingCategory ? 'تعديل فئة المتجر' : 'إضافة فئة جديدة للمتجر'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-200 hover:text-white hover:bg-gray-600 rounded-full transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
            disabled={isCreating}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Mobile optimized scrolling */}
        <div className={`flex flex-col flex-1 overflow-hidden ${isBrowseMode ? '' : ''}`}>

          {/* Browse Mode - Full Screen Products View */}
          {isBrowseMode ? (
            <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden relative">
              {/* Browse Header */}
              <div className="p-4 bg-white border-b border-gray-300 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">
                    {editingCategory
                      ? `تصفح المنتجات لفئة "${categoryName}"`
                      : `تصفح المنتجات للفئة الجديدة${categoryName ? ` "${categoryName}"` : ''}`
                    }
                  </h3>
                  <button
                    onClick={() => setIsBrowseMode(false)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Browse Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      {selectedProducts.size} من {filteredProducts.length}
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        disabled={isCreating}
                      />
                      <span className="text-sm text-gray-600">تحديد الكل</span>
                    </label>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-80 px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-right"
                      placeholder="البحث في المنتجات..."
                      disabled={isCreating}
                    />
                    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Browse Products Grid */}
              <div
                className="flex-1 overflow-y-scroll p-6 pb-20"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitScrollbar: 'none'
                } as React.CSSProperties}
              >
                {isLoadingCategoryProducts && editingCategory ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="mr-3 text-gray-500">جاري تحميل المنتجات...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className={`relative bg-white rounded-lg border-2 p-4 cursor-pointer transition-all transform hover:scale-105 ${
                          selectedProducts.has(product.id)
                            ? 'border-red-500 bg-red-50 shadow-lg'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                        }`}
                        onClick={() => !isCreating && toggleProductSelection(product.id)}
                      >
                        {/* Selection Checkbox */}
                        <div className="absolute top-2 left-2 z-10">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.id)}
                            onChange={() => toggleProductSelection(product.id)}
                            className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                            disabled={isCreating}
                          />
                        </div>

                        {/* Product Image */}
                        <div className="aspect-square mb-3 overflow-hidden rounded-lg bg-gray-100">
                          <img
                            src={product.image || '/placeholder-product.svg'}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder-product.svg';
                            }}
                          />
                        </div>

                        {/* Product Info */}
                        <div className="text-center">
                          <h4 className="font-bold text-gray-900 text-sm mb-1 truncate">{product.name}</h4>
                          <p className="text-xs text-gray-500 mb-2 truncate">{product.category}</p>
                          <div className="text-lg font-bold text-red-600">
                            {product.price} ج.م
                          </div>
                        </div>

                        {/* Selection Indicator */}
                        {selectedProducts.has(product.id) && (
                          <div className="absolute inset-0 bg-red-500/10 rounded-lg flex items-center justify-center pointer-events-none">
                            <div className="bg-red-500 text-white rounded-full p-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {(!isLoadingCategoryProducts || !editingCategory) && filteredProducts.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد منتجات</h3>
                    <p className="text-gray-500">لا توجد منتجات تطابق البحث الحالي</p>
                  </div>
                )}
              </div>

              {/* Browse Footer */}
              <div className="p-4 bg-white border-t border-gray-300 flex justify-between items-center flex-shrink-0 absolute bottom-0 left-0 right-0">
                <div className="text-sm text-gray-600">
                  {selectedProducts.size} من {filteredProducts.length}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsBrowseMode(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={isCreating}
                  >
                    إلغاء
                  </button>

                  <button
                    onClick={handleSubmit}
                    disabled={isCreating || !categoryName.trim()}
                    className="px-6 py-2 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: !categoryName.trim() ? '#9CA3AF' : 'var(--primary-color)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isCreating && categoryName.trim()) {
                        (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-hover-color)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCreating && categoryName.trim()) {
                        (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-color)';
                      }
                    }}
                  >
                    {isCreating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        حفظ التغييرات
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Tabs Section - Hidden on scroll down */}
              <div
                className={`bg-white border-b border-gray-300 flex-shrink-0 transition-all duration-300 ease-in-out ${
                  isTabsHidden ? 'transform -translate-y-full opacity-0 h-0 overflow-hidden' : 'transform translate-y-0 opacity-100'
                }`}
              >
                <div className="flex items-center justify-between p-3 md:p-4 pb-0">
                  <h3 className="text-base md:text-lg font-semibold text-gray-800">
                    {editingCategory ? 'تعديل الفئة' : 'مجموعة جديدة'}
                  </h3>
                </div>
                <div className="px-3 md:px-4">
                  <div className="flex space-x-6">
                    <div className="pb-3 border-b-2 border-blue-500">
                      <span className="text-sm md:text-base text-blue-600 font-medium">تفاصيل المجموعة</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Section - Mobile optimized */}
              <div
                className="p-3 md:p-4 bg-white border-b border-gray-300 flex-shrink-0"
              >
                {/* Category Name */}
                <div className="mb-3 md:mb-4">
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                    اسم الفئة (مطلوب) *
                  </label>
                  <input
                    type="text"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full px-2 md:px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-right"
                    placeholder="أدخل اسم الفئة..."
                    disabled={isCreating}
                  />
                </div>

                {/* Category Image - Drag & Drop - Mobile optimized */}
                <div className="mb-3 md:mb-4">
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                    صورة الفئة
                  </label>
                  <div className="relative">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="category-image"
                    />

                    {!imageUrl ? (
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex items-center justify-center w-full px-4 py-8 bg-gray-50 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                          isDragOver
                            ? 'border-red-400 bg-red-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="text-center">
                          {isUploading ? (
                            <>
                              <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                              <span className="text-red-500 text-sm">جاري الرفع...</span>
                            </>
                          ) : (
                            <>
                              <svg className="h-8 w-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-gray-500 text-sm">
                                {isDragOver ? 'اتركها هنا' : 'اسحب الصورة هنا أو انقر للاختيار'}
                              </span>
                              <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF - حتى 5MB</p>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <img
                          src={imageUrl}
                          alt="صورة الفئة"
                          className="w-full h-32 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                          {imageFile?.name || 'صورة مرفوعة'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Products Selection Section - Mobile optimized scrolling */}
              <div className="flex-1 flex flex-col bg-gray-50 min-h-0 overflow-hidden">

                {/* Products Header */}
                <div className="p-3 md:p-4 bg-white border-b border-gray-300 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2 md:mb-3">
                    <h3 className="text-base md:text-lg font-semibold text-gray-800">
                      اختر المنتجات ({selectedProducts.size} محدد)
                    </h3>
                  <label className="flex items-center gap-1 md:gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      disabled={isCreating}
                    />
                    <span className="text-xs md:text-sm text-gray-600">تحديد الكل</span>
                  </label>
                </div>

                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-2 md:px-3 py-2 pr-8 md:pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-right text-xs md:text-sm"
                    placeholder="البحث في المنتجات..."
                    disabled={isCreating}
                  />
                  <svg className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 w-3 md:w-4 h-3 md:h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Products List - Mobile optimized scrolling with tabs hide/show */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 min-h-0 scrollbar-hide"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitScrollbar: 'none',
                  touchAction: 'pan-y'
                } as React.CSSProperties}
              >
                {isLoadingCategoryProducts && editingCategory ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="mr-3 text-gray-500">جاري تحميل منتجات الفئة...</span>
                  </div>
                ) : filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-white rounded-lg border transition-colors cursor-pointer ${
                      selectedProducts.has(product.id)
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => !isCreating && toggleProductSelection(product.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={() => toggleProductSelection(product.id)}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-4 h-4 md:w-5 md:h-5"
                      disabled={isCreating}
                    />

                    <img
                      src={product.image || '/placeholder-product.svg'}
                      alt={product.name}
                      className="w-8 h-8 md:w-10 md:h-10 object-cover rounded-lg bg-gray-100"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-product.svg';
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate text-xs md:text-sm">{product.name}</h4>
                      <p className="text-xs text-gray-500 truncate">{product.category}</p>
                    </div>

                    <div className="text-xs md:text-sm font-medium text-gray-600">
                      {product.price} ج.م
                    </div>
                  </div>
                ))}

                {(!isLoadingCategoryProducts || !editingCategory) && filteredProducts.length === 0 && (
                  <div className="text-center py-6 md:py-8 text-gray-500">
                    <svg className="mx-auto h-8 md:h-12 w-8 md:w-12 text-gray-400 mb-2 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-xs md:text-sm">لا توجد منتجات تطابق البحث</p>
                  </div>
                )}
              </div>
            </div>
            </>
          )}

        </div>

        {/* Footer - Mobile optimized */}
        {!isBrowseMode && (
        <div
          className="p-3 md:p-4 bg-white border-t border-gray-300 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 md:gap-0 flex-shrink-0"
        >
          <div className="text-xs md:text-sm text-gray-600 text-center md:text-left">
            {selectedProducts.size} من {filteredProducts.length}
          </div>

          <div className="flex flex-col md:flex-row gap-2 md:gap-3">
            <button
              onClick={onClose}
              className="px-3 md:px-4 py-2 text-gray-600 hover:text-gray-800 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              disabled={isCreating}
            >
              إلغاء
            </button>

            {/* Browse button - show for both new and editing categories */}
            {!isBrowseMode && (
              <button
                onClick={() => setIsBrowseMode(true)}
                className="px-3 md:px-4 py-2 text-blue-600 hover:text-blue-800 font-medium border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 text-sm"
                disabled={isCreating}
              >
                <svg className="w-3 md:w-4 h-3 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                تصفح
              </button>
            )}

            <button
              onClick={handleSubmit}
              disabled={isCreating || !categoryName.trim()}
              className="px-4 md:px-6 py-2 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              style={{
                backgroundColor: !categoryName.trim() ? '#9CA3AF' : 'var(--primary-color)'
              }}
              onMouseEnter={(e) => {
                if (!isCreating && categoryName.trim()) {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-hover-color)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isCreating && categoryName.trim()) {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-color)';
                }
              }}
            >
              {isCreating ? (
                <>
                  <div className="w-3 md:w-4 h-3 md:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {editingCategory ? 'جاري الحفظ...' : 'جاري الإنشاء...'}
                </>
              ) : (
                <>
                  <svg className="w-3 md:w-4 h-3 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={editingCategory ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" : "M12 4v16m8-8H4"} />
                  </svg>
                  {editingCategory ? 'حفظ التعديل' : 'إنشاء الفئة'}
                </>
              )}
            </button>
          </div>
        </div>
        )}
      </div>
    </>
  );
}
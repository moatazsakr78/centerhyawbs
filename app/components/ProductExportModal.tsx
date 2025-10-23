'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Product } from '../lib/hooks/useProducts'

interface ProductExportModalProps {
  isOpen: boolean
  onClose: () => void
  products: Product[]
  selectedProductIds: string[]
  onSelectModeRequest?: () => void
}

export default function ProductExportModal({
  isOpen,
  onClose,
  products,
  selectedProductIds,
  onSelectModeRequest
}: ProductExportModalProps) {
  const [exportOptions, setExportOptions] = useState({
    // تفاصيل المنتج
    name: true,
    code: true,
    barcode: true,
    description: true,

    // السعر
    purchasePrice: true,
    salePrice: true,
    wholesalePrice: true,
    price1: true,
    price2: true,
    price3: true,
    price4: true,

    // الصور والفيديوهات
    mainImage: true,
    additionalImages: true,
    videos: true,

    // الشكل واللون
    colors: true,
    variants: true,

    // الإعدادات
    isActive: true
  })

  const [exportMode, setExportMode] = useState<'all' | 'selected'>('all')

  if (!isOpen) return null

  const handleExport = () => {
    // تحديد المنتجات المراد تصديرها
    const productsToExport = exportMode === 'all'
      ? products
      : products.filter(p => selectedProductIds.includes(p.id))

    if (productsToExport.length === 0) {
      alert('لا توجد منتجات للتصدير')
      return
    }

    // تصفية البيانات حسب الخيارات المحددة
    const exportData = productsToExport.map(product => {
      // Debug log لكل منتج
      console.log('📤 Exporting product:', product.name)
      console.log('  - main_image_url:', product.main_image_url)
      console.log('  - additional_images:', product.additional_images?.length || 0, 'images')
      console.log('  - actualVideoUrl:', product.actualVideoUrl || 'none')

      const data: any = {}

      // تفاصيل المنتج
      if (exportOptions.name) data.name = product.name
      if (exportOptions.code) data.product_code = product.product_code
      if (exportOptions.barcode) data.barcode = product.barcode
      if (exportOptions.description) data.description = product.description

      // السعر
      if (exportOptions.purchasePrice) data.cost_price = product.cost_price
      if (exportOptions.salePrice) data.price = product.price
      if (exportOptions.wholesalePrice) data.wholesale_price = product.wholesale_price
      if (exportOptions.price1) data.price1 = product.price1
      if (exportOptions.price2) data.price2 = product.price2
      if (exportOptions.price3) data.price3 = product.price3
      if (exportOptions.price4) data.price4 = product.price4

      // الصور والفيديوهات
      if (exportOptions.mainImage) data.main_image_url = product.main_image_url

      // ✨ تصدير الصور الإضافية من الحقل الجديد
      if (exportOptions.additionalImages && product.additional_images && product.additional_images.length > 0) {
        data.additional_images = product.additional_images
      }

      // ✨ تصدير رابط الفيديو الفعلي فقط
      if (exportOptions.videos && product.actualVideoUrl) {
        data.video_url = product.actualVideoUrl
      }

      // الشكل واللون (بدون الكميات في المخزون)
      if (exportOptions.colors) data.productColors = product.productColors
      if (exportOptions.variants) data.variantsData = product.variantsData

      // الإعدادات
      if (exportOptions.isActive) data.is_active = product.is_active

      return data
    })

    // Debug: طباعة البيانات النهائية
    console.log('📦 Final export data:', exportData)

    // إنشاء ملف JSON وتنزيله
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `products-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    // إحصائيات التصدير
    const productsWithImages = exportData.filter(p => p.additional_images && p.additional_images.length > 0).length
    const productsWithVideos = exportData.filter(p => p.video_url).length

    console.log(`✅ تم تصدير ${exportData.length} منتج`)
    console.log(`   - ${productsWithImages} منتج لديه صور فرعية`)
    console.log(`   - ${productsWithVideos} منتج لديه فيديوهات`)

    alert(`تم تصدير ${exportData.length} منتج بنجاح!\n• ${productsWithImages} منتج لديه صور فرعية\n• ${productsWithVideos} منتج لديه فيديوهات`)
    onClose()
  }

  const toggleAllOptions = (value: boolean) => {
    setExportOptions({
      name: value,
      code: value,
      barcode: value,
      description: value,
      purchasePrice: value,
      salePrice: value,
      wholesalePrice: value,
      price1: value,
      price2: value,
      price3: value,
      price4: value,
      mainImage: value,
      additionalImages: value,
      videos: value,
      colors: value,
      variants: value,
      isActive: value
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">تصدير المنتجات</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] scrollbar-hide">
          {/* Export Mode Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              نطاق التصدير
            </label>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="exportMode"
                  checked={exportMode === 'all'}
                  onChange={() => setExportMode('all')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">جميع المنتجات ({products.length})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="exportMode"
                  checked={exportMode === 'selected'}
                  onChange={() => setExportMode('selected')}
                  className="w-4 h-4 text-blue-600"
                  disabled={selectedProductIds.length === 0}
                />
                <span className={selectedProductIds.length === 0 ? 'text-gray-400' : 'text-gray-700'}>
                  المنتجات المحددة ({selectedProductIds.length})
                </span>
              </label>
            </div>

            {/* زر تحديد المنتجات */}
            <button
              onClick={() => {
                if (onSelectModeRequest) {
                  onSelectModeRequest()
                  onClose()
                }
              }}
              className="w-full px-4 py-2.5 bg-blue-50 text-blue-700 border-2 border-blue-300 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              الانتقال إلى صفحة المنتجات لتحديد المنتجات
            </button>
          </div>

          {/* Quick Actions */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => toggleAllOptions(true)}
              className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              تحديد الكل
            </button>
            <button
              onClick={() => toggleAllOptions(false)}
              className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              إلغاء الكل
            </button>
          </div>

          {/* Export Options */}
          <div className="space-y-4">
            {/* تفاصيل المنتج */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">تفاصيل المنتج</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.name}
                    onChange={(e) => setExportOptions({ ...exportOptions, name: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">اسم المنتج</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.code}
                    onChange={(e) => setExportOptions({ ...exportOptions, code: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">الكود / الباركود</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.barcode}
                    onChange={(e) => setExportOptions({ ...exportOptions, barcode: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">الباركود</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.description}
                    onChange={(e) => setExportOptions({ ...exportOptions, description: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">الوصف</span>
                </label>
              </div>
            </div>

            {/* السعر */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">السعر</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.purchasePrice}
                    onChange={(e) => setExportOptions({ ...exportOptions, purchasePrice: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">سعر الشراء</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.salePrice}
                    onChange={(e) => setExportOptions({ ...exportOptions, salePrice: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">سعر البيع</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.wholesalePrice}
                    onChange={(e) => setExportOptions({ ...exportOptions, wholesalePrice: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">سعر الجملة</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.price1}
                    onChange={(e) => setExportOptions({ ...exportOptions, price1: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">السعر 1</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.price2}
                    onChange={(e) => setExportOptions({ ...exportOptions, price2: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">السعر 2</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.price3}
                    onChange={(e) => setExportOptions({ ...exportOptions, price3: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">السعر 3</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.price4}
                    onChange={(e) => setExportOptions({ ...exportOptions, price4: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">السعر 4</span>
                </label>
              </div>
            </div>

            {/* الوسائط */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">الصور والفيديوهات</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.mainImage}
                    onChange={(e) => setExportOptions({ ...exportOptions, mainImage: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">الصورة الرئيسية</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.additionalImages}
                    onChange={(e) => setExportOptions({ ...exportOptions, additionalImages: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">الصور الفرعية</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.videos}
                    onChange={(e) => setExportOptions({ ...exportOptions, videos: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">الفيديوهات</span>
                </label>
              </div>
            </div>

            {/* الشكل واللون */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">الشكل واللون</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.colors}
                    onChange={(e) => setExportOptions({ ...exportOptions, colors: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">الألوان</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.variants}
                    onChange={(e) => setExportOptions({ ...exportOptions, variants: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">الأشكال (المتغيرات)</span>
                </label>
              </div>
            </div>

            {/* الإعدادات */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">الإعدادات</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.isActive}
                    onChange={(e) => setExportOptions({ ...exportOptions, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">حالة المنتج (نشط/غير نشط)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            إلغاء
          </button>
          <button
            onClick={handleExport}
            className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            تصدير المنتجات
          </button>
        </div>
      </div>
    </div>
  )
}

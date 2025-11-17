'use client'

import { useState, useRef } from 'react'
import { XMarkIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline'
import { Product } from '../lib/hooks/useProducts'
import { supabase } from '../lib/supabase/client'
import {
  uploadProductImage,
  uploadProductVideo,
  getProductImageUrl,
  getProductVideoUrl,
  PRODUCT_STORAGE_BUCKETS
} from '../lib/supabase/storage'

interface ProductImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
  createProduct: (productData: Partial<Product>) => Promise<Product | null>
}

export default function ProductImportModal({
  isOpen,
  onClose,
  onImportComplete,
  createProduct
}: ProductImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResults, setImportResults] = useState<{
    total: number
    success: number
    failed: number
    errors: string[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/json') {
      setSelectedFile(file)
      setImportResults(null)
    } else {
      alert('الرجاء اختيار ملف JSON فقط')
    }
  }

  // ✨ تحويل base64 إلى File object
  const base64ToFile = (base64Data: string, fileName: string): File | null => {
    try {
      // استخراج نوع الملف من base64
      const arr = base64Data.split(',')
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream'
      const bstr = atob(arr[1])
      let n = bstr.length
      const u8arr = new Uint8Array(n)

      while (n--) {
        u8arr[n] = bstr.charCodeAt(n)
      }

      return new File([u8arr], fileName, { type: mime })
    } catch (error) {
      console.error('Error converting base64 to file:', error)
      return null
    }
  }

  const handleImport = async () => {
    if (!selectedFile) {
      alert('الرجاء اختيار ملف أولاً')
      return
    }

    setIsImporting(true)
    setImportProgress(0)
    const errors: string[] = []

    try {
      // قراءة الملف
      const fileContent = await selectedFile.text()
      const productsData = JSON.parse(fileContent)

      if (!Array.isArray(productsData)) {
        throw new Error('صيغة الملف غير صحيحة. يجب أن يحتوي على مصفوفة من المنتجات')
      }

      let successCount = 0
      let failedCount = 0

      // استيراد المنتجات واحداً تلو الآخر
      for (let i = 0; i < productsData.length; i++) {
        try {
          const productData = productsData[i]

          // التحقق من البيانات الأساسية
          if (!productData.name) {
            throw new Error('اسم المنتج مطلوب')
          }

          console.log('🔍 Import Debug for:', productData.name)

          // ✨ رفع الصورة الرئيسية إلى Bucket
          let mainImageUrl = null
          if (productData.main_image && productData.main_image.data) {
            console.log('📸 Uploading main image...')
            const imageFile = base64ToFile(productData.main_image.data, productData.main_image.name)
            if (imageFile) {
              const { data, error } = await uploadProductImage(imageFile, 'MAIN_PRODUCTS')
              if (!error && data) {
                mainImageUrl = getProductImageUrl('MAIN_PRODUCTS', data.path)
                console.log('✅ Main image uploaded:', mainImageUrl)
              } else {
                console.error('❌ Error uploading main image:', error)
                errors.push(`تحذير: فشل رفع الصورة الرئيسية للمنتج: ${productData.name}`)
              }
            }
          }

          // ✨ رفع الصور الإضافية إلى Bucket
          let additionalImagesUrls: string[] = []
          if (productData.additional_images && Array.isArray(productData.additional_images)) {
            console.log(`📸 Uploading ${productData.additional_images.length} additional images...`)
            for (const imageData of productData.additional_images) {
              if (imageData && imageData.data) {
                const imageFile = base64ToFile(imageData.data, imageData.name)
                if (imageFile) {
                  const { data, error } = await uploadProductImage(imageFile, 'SUB_PRODUCTS')
                  if (!error && data) {
                    const imageUrl = getProductImageUrl('SUB_PRODUCTS', data.path)
                    additionalImagesUrls.push(imageUrl)
                    console.log('✅ Sub image uploaded:', imageUrl)
                  } else {
                    console.error('❌ Error uploading sub image:', error)
                  }
                }
              }
            }
          }

          // ✨ معالجة الوصف - استخراج النص من JSON object إذا لزم الأمر
          let description = productData.description || ''
          if (typeof description === 'string' && description.startsWith('{') && description.includes('"text"')) {
            try {
              const parsed = JSON.parse(description)
              description = parsed.text || description
              console.log('✅ Extracted description text from JSON object')
            } catch (e) {
              // إذا فشل التحليل، استخدم النص كما هو
              console.log('⚠️ Failed to parse description JSON, using as-is')
            }
          }

          // إنشاء المنتج
          const newProduct = await createProduct({
            name: productData.name,
            product_code: productData.product_code || `PROD-${Date.now()}-${i}`,
            barcode: productData.barcode || null,
            category_id: productData.category_id || null,
            description: description,
            cost_price: productData.cost_price || 0,
            price: productData.price || 0,
            wholesale_price: productData.wholesale_price || 0,
            price1: productData.price1 || 0,
            price2: productData.price2 || 0,
            price3: productData.price3 || 0,
            price4: productData.price4 || 0,
            main_image_url: mainImageUrl,
            additional_images: additionalImagesUrls.length > 0 ? additionalImagesUrls : null,
            is_active: productData.is_active !== undefined ? productData.is_active : true,
            is_featured: productData.is_featured || false,
            display_order: productData.display_order || i
          })

          if (newProduct) {
            successCount++

            // ✨ رفع الفيديوهات إلى Bucket
            if (productData.product_videos && Array.isArray(productData.product_videos) && productData.product_videos.length > 0) {
              console.log(`📹 Uploading ${productData.product_videos.length} videos for product: ${newProduct.name}`)

              try {
                const videosToInsert = []

                for (const videoData of productData.product_videos) {
                  if (videoData && videoData.video_data && videoData.video_data.data) {
                    // رفع الفيديو إلى Bucket
                    const videoFile = base64ToFile(videoData.video_data.data, videoData.video_data.name)
                    if (videoFile) {
                      const { data, error } = await uploadProductVideo(videoFile, newProduct.id)
                      if (!error && data) {
                        console.log('✅ Video uploaded:', data.publicUrl)

                        // رفع thumbnail إذا كان موجود
                        let thumbnailUrl = null
                        if (videoData.thumbnail_data && videoData.thumbnail_data.data) {
                          const thumbnailFile = base64ToFile(videoData.thumbnail_data.data, videoData.thumbnail_data.name)
                          if (thumbnailFile) {
                            const thumbResult = await uploadProductImage(thumbnailFile, 'SUB_PRODUCTS')
                            if (!thumbResult.error && thumbResult.data) {
                              thumbnailUrl = getProductImageUrl('SUB_PRODUCTS', thumbResult.data.path)
                            }
                          }
                        }

                        videosToInsert.push({
                          product_id: newProduct.id,
                          video_url: data.publicUrl,
                          video_name: videoData.video_name || null,
                          video_size: videoData.video_size || null,
                          duration: videoData.duration || null,
                          thumbnail_url: thumbnailUrl,
                          sort_order: videoData.sort_order !== undefined ? videoData.sort_order : videosToInsert.length
                        })
                      } else {
                        console.error('❌ Error uploading video:', error)
                      }
                    }
                  }
                }

                // إدراج بيانات الفيديوهات في الجدول
                if (videosToInsert.length > 0) {
                  const { error: videosError } = await (supabase as any)
                    .from('product_videos')
                    .insert(videosToInsert)

                  if (videosError) {
                    console.error('Error inserting videos to DB:', videosError)
                    errors.push(`تحذير: فشل حفظ بيانات الفيديوهات للمنتج: ${newProduct.name}`)
                  } else {
                    console.log(`✅ Successfully imported ${videosToInsert.length} videos for product: ${newProduct.name}`)
                  }
                }
              } catch (videoError) {
                console.error('Error processing videos:', videoError)
                errors.push(`تحذير: خطأ في معالجة الفيديوهات للمنتج: ${newProduct.name}`)
              }
            }
          } else {
            failedCount++
            errors.push(`فشل إنشاء المنتج: ${productData.name}`)
          }
        } catch (error) {
          failedCount++
          const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف'
          errors.push(`خطأ في المنتج ${i + 1}: ${errorMessage}`)
        }

        // تحديث التقدم
        setImportProgress(Math.round(((i + 1) / productsData.length) * 100))
      }

      // عرض النتائج
      setImportResults({
        total: productsData.length,
        success: successCount,
        failed: failedCount,
        errors: errors
      })

      // إذا تم الاستيراد بنجاح، تحديث القائمة
      if (successCount > 0) {
        onImportComplete()
      }

    } catch (error) {
      console.error('خطأ في الاستيراد:', error)
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف'
      setImportResults({
        total: 0,
        success: 0,
        failed: 0,
        errors: [`خطأ في قراءة الملف: ${errorMessage}`]
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setImportResults(null)
    setImportProgress(0)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-xl font-bold text-white">استيراد المنتجات</h2>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-200 transition-colors"
            disabled={isImporting}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!importResults ? (
            <>
              {/* File Upload Area */}
              <div className="mb-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div
                  onClick={() => !isImporting && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center ${
                    isImporting
                      ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                      : 'border-green-300 hover:border-green-500 hover:bg-green-50 cursor-pointer'
                  } transition-colors`}
                >
                  <CloudArrowUpIcon className="h-16 w-16 mx-auto mb-4 text-green-600" />
                  {selectedFile ? (
                    <div>
                      <p className="text-lg font-semibold text-gray-800 mb-2">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-lg font-semibold text-gray-800 mb-2">
                        اضغط لاختيار ملف JSON
                      </p>
                      <p className="text-sm text-gray-500">
                        أو اسحب الملف وأفلته هنا
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">تعليمات الاستيراد:</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>يجب أن يكون الملف بصيغة JSON</li>
                  <li>يجب أن يحتوي الملف على مصفوفة من المنتجات</li>
                  <li>كل منتج يجب أن يحتوي على حقل "name" على الأقل</li>
                  <li>سيتم إنشاء المنتجات الجديدة في قاعدة البيانات</li>
                  <li>في حالة وجود أخطاء، سيتم عرض تقرير مفصل</li>
                </ul>
              </div>

              {/* Progress Bar */}
              {isImporting && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">جاري الاستيراد...</span>
                    <span className="text-sm font-medium text-gray-700">{importProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-green-600 h-3 transition-all duration-300 rounded-full"
                      style={{ width: `${importProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Import Results */
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-900">{importResults.total}</div>
                  <div className="text-sm text-blue-700">إجمالي</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-900">{importResults.success}</div>
                  <div className="text-sm text-green-700">نجح</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-900">{importResults.failed}</div>
                  <div className="text-sm text-red-700">فشل</div>
                </div>
              </div>

              {importResults.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <h4 className="font-semibold text-red-900 mb-2">الأخطاء:</h4>
                  <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                    {importResults.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {importResults.success > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-green-800 font-medium">
                    ✓ تم استيراد {importResults.success} منتج بنجاح!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200 rounded-b-lg">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={isImporting}
          >
            {importResults ? 'إغلاق' : 'إلغاء'}
          </button>
          {!importResults && (
            <button
              onClick={handleImport}
              disabled={!selectedFile || isImporting}
              className={`px-6 py-2 text-white rounded-lg flex items-center gap-2 ${
                !selectedFile || isImporting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isImporting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  جاري الاستيراد...
                </>
              ) : (
                <>
                  <CloudArrowUpIcon className="w-5 h-5" />
                  استيراد المنتجات
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

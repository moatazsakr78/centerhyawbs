// Simplified image versioning service that works with existing infrastructure
// Provides versioning without requiring new database tables

import { supabaseAdmin } from '../supabase/storage'
import { v4 as uuidv4 } from 'uuid'

export interface VersionedUploadResult {
  success: boolean
  publicUrl?: string
  fileName?: string
  error?: string
}

/**
 * Generate versioned filename that never conflicts
 */
export function generateVersionedFileName(
  productId: string,
  imageType: 'main' | 'sub' | 'variant' | 'additional',
  originalFileName: string
): string {
  const uuid = uuidv4()
  const timestamp = Date.now()
  const extension = originalFileName.split('.').pop() || 'jpg'
  
  // Format: product_ID_TYPE_TIMESTAMP_UUID.extension
  return `product_${productId}_${imageType}_${timestamp}_${uuid}.${extension}`
}

/**
 * Get storage bucket for image type
 */
export function getStorageBucket(imageType: string): string {
  switch (imageType) {
    case 'main':
      return 'main-products-pos-images'
    case 'sub':
      return 'sub-products-pos-images'
    case 'variant':
      return 'variant-products-pos-images'
    case 'additional':
      return 'main-products-pos-images' // Use main bucket for additional images
    default:
      return 'main-products-pos-images'
  }
}

/**
 * Upload versioned image - never overwrites existing files
 * Uses API route for server-side upload with service_role key
 */
export async function uploadVersionedProductImage(
  file: File,
  productId: string,
  imageType: 'main' | 'sub' | 'variant' | 'additional'
): Promise<VersionedUploadResult> {
  try {
    // Create FormData for API request
    const formData = new FormData()
    formData.append('file', file)
    formData.append('productId', productId)
    formData.append('imageType', imageType)

    // Call upload API route
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData
    })

    const result = await response.json()

    if (!result.success) {
      console.error('Versioned upload error:', result.error)
      return {
        success: false,
        error: result.error
      }
    }

    return {
      success: true,
      publicUrl: result.publicUrl,
      fileName: result.fileName,
      error: undefined
    }

  } catch (error) {
    console.error('Upload versioned image error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Update product with new versioned image URL
 */
export async function updateProductImageUrl(
  productId: string,
  imageType: 'main' | 'sub',
  newImageUrl: string
): Promise<boolean> {
  try {
    const { supabase } = await import('../supabase/client')
    
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    if (imageType === 'main') {
      updateData.main_image_url = newImageUrl
    } else if (imageType === 'sub') {
      updateData.sub_image_url = newImageUrl
    }

    const { error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)

    if (error) {
      console.error('Update product image URL error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Update product image URL error:', error)
    return false
  }
}

/**
 * Upload and set new main image with versioning
 */
export async function uploadAndSetMainImage(
  file: File,
  productId: string
): Promise<VersionedUploadResult> {
  const result = await uploadVersionedProductImage(file, productId, 'main')
  
  if (result.success && result.publicUrl) {
    const updateSuccess = await updateProductImageUrl(productId, 'main', result.publicUrl)
    if (!updateSuccess) {
      return {
        success: false,
        error: 'Failed to update product with new image URL'
      }
    }
  }
  
  return result
}

/**
 * Upload and set new sub image with versioning
 */
export async function uploadAndSetSubImage(
  file: File,
  productId: string
): Promise<VersionedUploadResult> {
  const result = await uploadVersionedProductImage(file, productId, 'sub')
  
  if (result.success && result.publicUrl) {
    const updateSuccess = await updateProductImageUrl(productId, 'sub', result.publicUrl)
    if (!updateSuccess) {
      return {
        success: false,
        error: 'Failed to update product with new image URL'
      }
    }
  }
  
  return result
}

/**
 * Add additional images to video_url field (existing pattern)
 */
export async function addAdditionalVersionedImage(
  file: File,
  productId: string
): Promise<VersionedUploadResult> {
  const result = await uploadVersionedProductImage(file, productId, 'additional')
  
  if (result.success && result.publicUrl) {
    try {
      const { supabase } = await import('../supabase/client')
      
      // Get current video_url (which stores additional images)
      const { data: productData } = await supabase
        .from('products')
        .select('video_url')
        .eq('id', productId)
        .single()

      let existingImages: string[] = []
      
      // Parse existing images
      if (productData?.video_url) {
        try {
          const parsed = JSON.parse(productData.video_url)
          if (Array.isArray(parsed)) {
            existingImages = parsed
          }
        } catch (e) {
          // If not valid JSON array, treat as single URL
          if (productData.video_url.startsWith('http')) {
            existingImages = [productData.video_url]
          }
        }
      }

      // Add new image URL
      existingImages.push(result.publicUrl)

      // Update product with new images array
      const { error } = await supabase
        .from('products')
        .update({
          video_url: JSON.stringify(existingImages),
          updated_at: new Date().toISOString()
        })
        .eq('id', productId)

      if (error) {
        console.error('Update additional images error:', error)
        return {
          success: false,
          error: 'Failed to update product with additional image'
        }
      }

    } catch (error) {
      console.error('Add additional image error:', error)
      return {
        success: false,
        error: 'Failed to add additional image'
      }
    }
  }
  
  return result
}

/**
 * Batch upload multiple images with versioning
 */
export async function batchUploadVersionedImages(
  files: Array<{
    file: File
    imageType: 'main' | 'sub' | 'variant' | 'additional'
  }>,
  productId: string
): Promise<{
  successful: Array<{ type: string, url: string }>
  failed: Array<{ type: string, error: string }>
}> {
  const successful: Array<{ type: string, url: string }> = []
  const failed: Array<{ type: string, error: string }> = []

  for (const { file, imageType } of files) {
    try {
      let result: VersionedUploadResult

      switch (imageType) {
        case 'main':
          result = await uploadAndSetMainImage(file, productId)
          break
        case 'sub':
          result = await uploadAndSetSubImage(file, productId)
          break
        case 'additional':
          result = await addAdditionalVersionedImage(file, productId)
          break
        default:
          result = await uploadVersionedProductImage(file, productId, imageType)
      }

      if (result.success && result.publicUrl) {
        successful.push({ type: imageType, url: result.publicUrl })
      } else {
        failed.push({ type: imageType, error: result.error || 'Upload failed' })
      }

    } catch (error) {
      failed.push({ 
        type: imageType, 
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return { successful, failed }
}

/**
 * Get all versioned files for a product (from storage bucket listing)
 */
export async function getProductImageVersions(productId: string): Promise<{
  main: string[]
  sub: string[]
  variant: string[]
  additional: string[]
}> {
  try {
    const versions = {
      main: [] as string[],
      sub: [] as string[],
      variant: [] as string[],
      additional: [] as string[]
    }

    // List files from each bucket that belong to this product
    const buckets = ['main-products-pos-images', 'sub-products-pos-images', 'variant-products-pos-images']
    
    for (const bucket of buckets) {
      const { data: files } = await supabaseAdmin.storage
        .from(bucket)
        .list('', {
          search: `product_${productId}_`
        })

      if (files) {
        for (const file of files) {
          const { data: { publicUrl } } = supabaseAdmin.storage
            .from(bucket)
            .getPublicUrl(file.name)

          // Determine image type from filename
          if (file.name.includes('_main_')) {
            versions.main.push(publicUrl)
          } else if (file.name.includes('_sub_')) {
            versions.sub.push(publicUrl)
          } else if (file.name.includes('_variant_')) {
            versions.variant.push(publicUrl)
          } else if (file.name.includes('_additional_')) {
            versions.additional.push(publicUrl)
          }
        }
      }
    }

    // Sort by timestamp in filename (newest first)
    Object.keys(versions).forEach(key => {
      versions[key as keyof typeof versions].sort((a, b) => {
        const aTimestamp = parseInt(a.match(/_(\d+)_/)?.[1] || '0')
        const bTimestamp = parseInt(b.match(/_(\d+)_/)?.[1] || '0')
        return bTimestamp - aTimestamp
      })
    })

    return versions
    
  } catch (error) {
    console.error('Get product image versions error:', error)
    return {
      main: [],
      sub: [],
      variant: [],
      additional: []
    }
  }
}

/**
 * Clean up old versions (keep only N latest versions per type)
 */
export async function cleanupOldVersions(
  productId: string,
  keepCount: number = 5
): Promise<{
  cleaned: number
  errors: string[]
}> {
  try {
    let cleaned = 0
    const errors: string[] = []

    const versions = await getProductImageVersions(productId)
    
    for (const [imageType, urls] of Object.entries(versions)) {
      if (urls.length > keepCount) {
        const toDelete = urls.slice(keepCount) // Keep first N (newest), delete rest
        
        for (const url of toDelete) {
          try {
            // Extract filename from URL
            const fileName = url.split('/').pop()
            if (fileName) {
              const bucket = getStorageBucket(imageType)
              const { error } = await supabaseAdmin.storage
                .from(bucket)
                .remove([fileName])
              
              if (error) {
                errors.push(`Failed to delete ${fileName}: ${error.message}`)
              } else {
                cleaned++
              }
            }
          } catch (err) {
            errors.push(`Error processing ${url}: ${err}`)
          }
        }
      }
    }

    return { cleaned, errors }
    
  } catch (error) {
    return {
      cleaned: 0,
      errors: [error instanceof Error ? error.message : 'Cleanup failed']
    }
  }
}
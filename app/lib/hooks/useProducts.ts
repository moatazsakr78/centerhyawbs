import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase/client'

export interface Product {
  id: string
  name: string
  name_en?: string | null
  description?: string | null
  description_en?: string | null
  barcode?: string | null
  price: number
  cost_price: number
  category_id?: string | null
  video_url?: string | null
  is_active?: boolean | null
  created_at?: string | null
  updated_at?: string | null
  product_code?: string | null
  wholesale_price?: number | null
  price1?: number | null
  price2?: number | null
  price3?: number | null
  price4?: number | null
  main_image_url?: string | null
  sub_image_url?: string | null
  barcodes?: string[] | null
  unit?: string | null
  stock?: number | null
  min_stock?: number | null
  max_stock?: number | null
  location?: string | null
  status?: string | null
  warehouse?: string | null
  branch?: string | null
  tax_price?: number | null
  // New rating and discount fields
  rating?: number | null
  rating_count?: number | null
  discount_percentage?: number | null
  discount_amount?: number | null
  discount_start_date?: string | null
  discount_end_date?: string | null
  // New management fields
  is_hidden?: boolean | null
  is_featured?: boolean | null
  display_order?: number | null
  suggested_products?: string[] | null
  // Relations
  category?: {
    id: string
    name: string
    name_en?: string | null
  } | null
  // Computed fields for table display
  totalQuantity?: number
  inventoryData?: Record<string, { quantity: number, min_stock: number }>
  variantsData?: Record<string, ProductVariant[]>
  productColors?: Array<{id: string, name: string, color: string}>
  allImages?: string[]
  productSizes?: ProductSize[]
  productRatings?: ProductRating[]
  // Helper computed fields
  finalPrice?: number // Price after discount
  isDiscounted?: boolean
  discountLabel?: string
}

export interface ProductVariant {
  id: string
  product_id: string
  branch_id: string
  variant_type: 'color' | 'shape'
  name: string
  quantity: number
  value?: string | null // Can contain JSON with barcode, color, and image data
  image_url?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface ProductSize {
  id: string
  product_id: string
  size_name: string
  size_code?: string | null
  size_value?: string | null
  size_category?: string | null
  price_adjustment: number
  is_available: boolean
  stock_quantity: number
  min_stock: number
  sort_order: number
  created_at?: string | null
  updated_at?: string | null
}

export interface ProductRating {
  id: string
  product_id: string
  customer_id?: string | null
  customer_name?: string | null
  customer_email?: string | null
  rating: number
  review_title?: string | null
  review_text?: string | null
  is_verified_purchase: boolean
  is_approved: boolean
  is_featured: boolean
  helpful_count: number
  created_at?: string | null
  updated_at?: string | null
}

export interface InventoryItem {
  id: string
  product_id: string
  branch_id: string
  quantity: number
  min_stock: number
  max_stock: number
  location?: string
}

export interface Branch {
  id: string
  name: string
  name_en?: string | null
  address?: string
  is_active?: boolean | null
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all products with categories and inventory data
  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch products with categories
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(
            id,
            name,
            name_en
          )
        `)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })

      if (productsError) throw productsError

      // Fetch branches (handle potential auth errors)
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (branchesError) {
        console.warn('Unable to fetch branches (likely auth required):', branchesError)
        setBranches([])
      } else {
        setBranches(branchesData || [])
      }

      // For each product, fetch inventory and variants data
      const enrichedProducts = await Promise.all(
        (productsData || []).map(async (rawProduct) => {
          // Cast to our Product type to include new fields
          const product = rawProduct as any
          // Parse product colors and description from description field
          let productColors: any[] = []
          let actualDescription: string = product.description || ""
          
          try {
            if (product.description && product.description.startsWith('{')) {
              const descriptionData = JSON.parse(product.description)
              productColors = descriptionData.colors || []
              actualDescription = descriptionData.text || ""
            }
          } catch (e) {
            // If parsing fails, use original description and empty colors array
            productColors = []
            actualDescription = product.description || ""
          }

          // Fetch inventory data for all branches (handle auth errors gracefully)
          let inventoryData: any[] = []
          try {
            const { data, error } = await supabase
              .from('inventory')
              .select('branch_id, warehouse_id, quantity, min_stock')
              .eq('product_id', product.id)
            
            if (!error && data) {
              inventoryData = data
            }
          } catch (err) {
            console.warn('Unable to fetch inventory data (likely auth required):', err)
          }

          // Fetch variants for all branches (handle auth errors gracefully)
          let variantsData: any[] = []
          try {
            const { data, error } = await supabase
              .from('product_variants')
              .select('*')
              .eq('product_id', product.id)
            
            if (!error && data) {
              variantsData = data
            }
          } catch (err) {
            console.warn('Unable to fetch variants data (likely auth required):', err)
          }

          // Group inventory by branch/warehouse
          const inventoryByBranch: Record<string, { quantity: number, min_stock: number }> = {}
          let totalQuantity = 0

          inventoryData.forEach((inv: any) => {
            const locationId = inv.branch_id || inv.warehouse_id
            if (locationId) {
              inventoryByBranch[locationId] = {
                quantity: inv.quantity || 0,
                min_stock: inv.min_stock || 0
              }
              totalQuantity += inv.quantity || 0
            }
          })

          // Group variants by location (branch or warehouse) and collect all images
          const variantsByLocation: Record<string, ProductVariant[]> = {}
          const allProductImages: string[] = []
          
          // Add main image if exists
          if (product.main_image_url) {
            allProductImages.push(product.main_image_url)
          }
          
          variantsData.forEach((variant: any) => {
            const locationId = variant.branch_id || variant.warehouse_id
            if (locationId) {
              if (!variantsByLocation[locationId]) {
                variantsByLocation[locationId] = []
              }
              variantsByLocation[locationId].push({
                ...variant,
                variant_type: variant.variant_type as 'color' | 'shape'
              })
              
              // Extract images from variant value JSON and image_url
              if (variant.image_url) {
                allProductImages.push(variant.image_url)
              }
              
              // Parse variant value for additional images
              try {
                if (variant.value && variant.value.startsWith('{')) {
                  const variantData = JSON.parse(variant.value)
                  if (variantData.image) {
                    allProductImages.push(variantData.image)
                  }
                  if (variantData.images && Array.isArray(variantData.images)) {
                    allProductImages.push(...variantData.images)
                  }
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
          })
          
          // Add sub-images from video_url field (admin uploaded sub-images)
          if (product.video_url) {
            try {
              const additionalImages = JSON.parse(product.video_url);
              if (Array.isArray(additionalImages)) {
                allProductImages.push(...additionalImages);
              }
            } catch (parseError) {
              console.error('Error parsing video_url for sub-images in useProducts:', parseError);
            }
          }

          // Remove duplicates from images
          const uniqueImages = Array.from(new Set(allProductImages.filter(img => img && img.trim() !== '')))
          
          // Add sub_image_url to images if it exists and is not already included
          if (product.sub_image_url && !uniqueImages.includes(product.sub_image_url)) {
            uniqueImages.push(product.sub_image_url)
          }

          // Calculate discount information
          const now = new Date()
          const discountStart = product.discount_start_date ? new Date(product.discount_start_date) : null
          const discountEnd = product.discount_end_date ? new Date(product.discount_end_date) : null
          
          const isDiscountActive = (
            (product.discount_percentage > 0 || product.discount_amount > 0) &&
            (!discountStart || now >= discountStart) &&
            (!discountEnd || now <= discountEnd)
          )
          
          let finalPrice = product.price
          let discountLabel = ''
          
          if (isDiscountActive) {
            if (product.discount_percentage > 0) {
              finalPrice = product.price * (1 - (product.discount_percentage / 100))
              discountLabel = `-${product.discount_percentage}%`
            } else if (product.discount_amount > 0) {
              finalPrice = Math.max(0, product.price - product.discount_amount)
              discountLabel = `-${product.discount_amount}`
            }
          }

          return {
            ...product,
            description: actualDescription, // Use parsed description text only
            totalQuantity,
            inventoryData: inventoryByBranch,
            variantsData: variantsByLocation,
            productColors: productColors, // Add parsed colors
            allImages: uniqueImages, // Add all product images including sub_image
            finalPrice: finalPrice,
            isDiscounted: isDiscountActive,
            discountLabel: discountLabel
          }
        })
      )

      setProducts(enrichedProducts)
    } catch (err) {
      console.error('Error fetching products:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch products')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Update existing product
  const updateProduct = useCallback(async (productId: string, productData: Partial<Product>): Promise<Product | null> => {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({
          name: productData.name!,
          name_en: productData.name_en,
          description: productData.description,
          description_en: productData.description_en,
          barcode: productData.barcode,
          price: productData.price || 0,
          cost_price: productData.cost_price || 0,
          wholesale_price: productData.wholesale_price || 0,
          price1: productData.price1 || 0,
          price2: productData.price2 || 0,
          price3: productData.price3 || 0,
          price4: productData.price4 || 0,
          category_id: productData.category_id,
          product_code: productData.product_code,
          main_image_url: productData.main_image_url,
          sub_image_url: productData.sub_image_url,
          barcodes: productData.barcodes || [],
          unit: productData.unit || 'قطعة',
          rating: productData.rating || 0,
          rating_count: productData.rating_count || 0,
          discount_percentage: productData.discount_percentage || 0,
          discount_amount: productData.discount_amount || 0,
          discount_start_date: productData.discount_start_date,
          discount_end_date: productData.discount_end_date,
          is_hidden: productData.is_hidden,
          is_featured: productData.is_featured,
          display_order: productData.display_order,
          suggested_products: productData.suggested_products,
          is_active: productData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId)
        .select(`
          *,
          category:categories(
            id,
            name,
            name_en
          )
        `)
        .single()

      if (error) throw error

      return data
    } catch (err) {
      console.error('Error updating product:', err)
      throw err
    }
  }, [])

  // Create new product
  const createProduct = useCallback(async (productData: Partial<Product>): Promise<Product | null> => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: productData.name!,
          name_en: productData.name_en,
          description: productData.description,
          description_en: productData.description_en,
          barcode: productData.barcode,
          price: productData.price || 0,
          cost_price: productData.cost_price || 0,
          category_id: productData.category_id,
          video_url: productData.video_url,
          product_code: productData.product_code,
          wholesale_price: productData.wholesale_price || 0,
          price1: productData.price1 || 0,
          price2: productData.price2 || 0,
          price3: productData.price3 || 0,
          price4: productData.price4 || 0,
          main_image_url: productData.main_image_url,
          sub_image_url: productData.sub_image_url,
          barcodes: productData.barcodes || [],
          unit: productData.unit || 'قطعة',
          stock: productData.stock || 0,
          min_stock: productData.min_stock || 0,
          max_stock: productData.max_stock || 100,
          location: productData.location,
          warehouse: productData.warehouse,
          branch: productData.branch,
          tax_price: productData.tax_price || 0,
          rating: 0,
          rating_count: 0,
          discount_percentage: productData.discount_percentage || 0,
          discount_amount: productData.discount_amount || 0,
          discount_start_date: productData.discount_start_date,
          discount_end_date: productData.discount_end_date,
          is_hidden: productData.is_hidden || false,
          is_featured: productData.is_featured || false,
          display_order: productData.display_order || 0,
          suggested_products: productData.suggested_products || [],
          is_active: true
        })
        .select(`
          *,
          category:categories(
            id,
            name,
            name_en
          )
        `)
        .single()

      if (error) throw error

      return data
    } catch (err) {
      console.error('Error creating product:', err)
      throw err
    }
  }, [])

  // Delete product
  const deleteProduct = useCallback(async (productId: string): Promise<void> => {
    try {
      // Check if product exists in sales invoices
      const { data: saleItems, error: saleError } = await supabase
        .from('sale_items')
        .select('id')
        .eq('product_id', productId)
        .limit(1)

      if (saleError) throw saleError

      if (saleItems && saleItems.length > 0) {
        throw new Error('المنتج موجود في فواتير لا يمكن حذفه')
      }

      // Check if product exists in purchase invoices
      const { data: purchaseItems, error: purchaseError } = await supabase
        .from('purchase_invoice_items')
        .select('id')
        .eq('product_id', productId)
        .limit(1)

      if (purchaseError) throw purchaseError

      if (purchaseItems && purchaseItems.length > 0) {
        throw new Error('المنتج موجود في فواتير لا يمكن حذفه')
      }

      // Check if product exists in orders
      const { data: orderItems, error: orderError } = await supabase
        .from('order_items')
        .select('id')
        .eq('product_id', productId)
        .limit(1)

      if (orderError) throw orderError

      if (orderItems && orderItems.length > 0) {
        throw new Error('المنتج موجود في فواتير لا يمكن حذفه')
      }

      // If no invoice references found, proceed with deletion
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error
    } catch (err) {
      console.error('Error deleting product:', err)
      throw err
    }
  }, [])

  // Setup real-time subscriptions
  useEffect(() => {
    // Products subscription
    const productsChannel = supabase
      .channel('products_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the new product with category data
            const { data: newProduct } = await supabase
              .from('products')
              .select(`
                *,
                category:categories(
                  id,
                  name,
                  name_en
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (newProduct) {
              // Parse product colors and description from description field
              let productColors: any[] = []
              let actualDescription: string = newProduct.description || ""
              
              try {
                if (newProduct.description && newProduct.description.startsWith('{')) {
                  const descriptionData = JSON.parse(newProduct.description)
                  productColors = descriptionData.colors || []
                  actualDescription = descriptionData.text || ""
                }
              } catch (e) {
                // If parsing fails, use original description and empty colors array
                productColors = []
                actualDescription = newProduct.description || ""
              }

              // Add inventory and variants data
              const enrichedProduct = {
                ...newProduct,
                description: actualDescription, // Use parsed description text only
                productColors: productColors, // Add parsed colors
                totalQuantity: 0,
                inventoryData: {},
                variantsData: {},
                allImages: newProduct.main_image_url ? [newProduct.main_image_url] : []
              }
              
              setProducts(prev => [enrichedProduct, ...prev])
            }
          } else if (payload.eventType === 'UPDATE') {
            // Fetch the updated product with category data
            const { data: updatedProduct } = await supabase
              .from('products')
              .select(`
                *,
                category:categories(
                  id,
                  name,
                  name_en
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (updatedProduct) {
              // Parse product colors and description from updated description field
              let productColors: any[] = []
              let actualDescription: string = updatedProduct.description || ""
              
              try {
                if (updatedProduct.description && updatedProduct.description.startsWith('{')) {
                  const descriptionData = JSON.parse(updatedProduct.description)
                  productColors = descriptionData.colors || []
                  actualDescription = descriptionData.text || ""
                }
              } catch (e) {
                // If parsing fails, use original description and empty colors array
                productColors = []
                actualDescription = updatedProduct.description || ""
              }

              setProducts(prev => prev.map(product => 
                product.id === payload.new.id 
                  ? { 
                      ...product, 
                      ...updatedProduct,
                      description: actualDescription, // Use parsed description text only
                      productColors: productColors, // Add parsed colors from updated product
                      // Preserve existing inventory and variants data
                      inventoryData: product.inventoryData,
                      variantsData: product.variantsData,
                      totalQuantity: product.totalQuantity
                    }
                  : product
              ))
            }
          } else if (payload.eventType === 'DELETE') {
            setProducts(prev => prev.filter(product => product.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    // Inventory subscription
    const inventoryChannel = supabase
      .channel('inventory_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'inventory' },
        (payload: any) => {
          if (payload.new && payload.new.product_id) {
            const productId = payload.new.product_id
            const locationId = payload.new.branch_id || payload.new.warehouse_id
            const quantity = payload.new.quantity || 0
            const minStock = payload.new.min_stock || 0

            if (locationId) {
              setProducts(prev => prev.map(product => {
                if (product.id === productId) {
                  const updatedInventoryData = {
                    ...product.inventoryData,
                    [locationId]: { quantity, min_stock: minStock }
                  }
                  
                  // Recalculate total quantity
                  const totalQuantity = Object.values(updatedInventoryData)
                    .reduce((sum, inv: any) => sum + (inv?.quantity || 0), 0)

                  return {
                    ...product,
                    inventoryData: updatedInventoryData,
                    totalQuantity
                  } as Product
                }
                return product
              }))
            }
          }
        }
      )
      .subscribe()

    // Variants subscription
    const variantsChannel = supabase
      .channel('variants_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'product_variants' },
        async (payload: any) => {
          if (payload.new && payload.new.product_id && (payload.new.branch_id || payload.new.warehouse_id)) {
            const productId = payload.new.product_id
            const locationId = payload.new.branch_id || payload.new.warehouse_id
            
            // Refetch variants for this product and location
            const { data: variants } = await supabase
              .from('product_variants')
              .select('*')
              .eq('product_id', productId)
              .or(`branch_id.eq.${locationId},warehouse_id.eq.${locationId}`)

            setProducts(prev => prev.map(product => {
              if (product.id === productId) {
                const updatedVariantsData = {
                  ...product.variantsData,
                  [locationId]: (variants || []).map(v => ({
                    ...v,
                    variant_type: v.variant_type as 'color' | 'shape'
                  }))
                }
                
                return {
                  ...product,
                  variantsData: updatedVariantsData
                }
              }
              return product
            }))
          }
        }
      )
      .subscribe()

    return () => {
      productsChannel.unsubscribe()
      inventoryChannel.unsubscribe()
      variantsChannel.unsubscribe()
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  return {
    products,
    branches,
    isLoading,
    error,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct
  }
}
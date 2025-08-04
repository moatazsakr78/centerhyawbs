'use client'

import { useState, useEffect, useRef } from 'react'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase/client'
import { ShapeManagement } from './products/ShapeManagement'
import { useShapes } from '../lib/hooks/useShapes'
import { uploadProductImage, PRODUCT_STORAGE_BUCKETS, getProductImageUrl } from '../lib/supabase/storage'
import { Product } from '../lib/hooks/useProducts'

interface Branch {
  id: string
  name: string
  name_en: string | null
  address: string
  phone: string
  manager_id: string | null
  allow_variants: boolean
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

interface Warehouse {
  id: string
  name: string
  name_en: string | null
  address: string
  phone: string
  manager_id: string | null
  allow_variants: boolean
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

interface LocationThreshold {
  locationId: string
  locationType: 'branch' | 'warehouse'
  locationName: string
  quantity: number
  minStockThreshold: number
}

interface LocationVariant {
  id: string
  locationId: string
  locationType: 'branch' | 'warehouse'
  elementType: 'color' | 'shape'
  elementId: string
  elementName: string
  quantity: number
  barcode: string
  image?: string
}

interface SelectedLocation {
  id: string
  name: string
  type: 'branch' | 'warehouse'
  totalQuantity: number
}

interface ProductColor {
  id: string
  name: string
  color: string
}

interface Category {
  id: string
  name: string
  name_en: string | null
  parent_id: string | null
  image_url: string | null
  is_active: boolean | null
  sort_order: number | null
  created_at: string | null
  updated_at: string | null
}

interface ProductSidebarProps {
  isOpen: boolean
  onClose: () => void
  onProductCreated?: () => void
  createProduct: (productData: Partial<Product>) => Promise<Product | null>
  updateProduct?: (productId: string, productData: Partial<Product>) => Promise<Product | null>
  categories: Category[]
  editProduct?: Product | null
}

// Image state interfaces
interface ImageFile {
  file: File
  preview: string
  id: string
}

interface ImageUploadAreaProps {
  onImageSelect: (files: File[]) => void
  images: ImageFile[]
  onImageRemove: (id: string) => void
  label: string
  multiple?: boolean
}

export default function ProductSidebar({ isOpen, onClose, onProductCreated, createProduct, updateProduct, categories, editProduct }: ProductSidebarProps) {
  const [activeTab, setActiveTab] = useState('تفاصيل المنتج')
  const [activeShapeColorTab, setActiveShapeColorTab] = useState('شكل وصف')
  const [branches, setBranches] = useState<Branch[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [locationThresholds, setLocationThresholds] = useState<LocationThreshold[]>([])
  const [loading, setLoading] = useState(true)
  const { shapes } = useShapes()
  const [productColors, setProductColors] = useState<ProductColor[]>([])
  const [colorName, setColorName] = useState('')
  const [selectedColor, setSelectedColor] = useState('#000000')
  const [editingColorId, setEditingColorId] = useState<string | null>(null)
  
  // New states for location variant management
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null)
  const [locationVariants, setLocationVariants] = useState<LocationVariant[]>([])
  const [variantForm, setVariantForm] = useState({
    elementType: 'color' as 'color' | 'shape',
    elementId: '',
    quantity: 0,
    barcode: '',
    image: null as File | null
  })
  const [editingVariant, setEditingVariant] = useState<LocationVariant | null>(null)
  
  // Image management states
  const [mainProductImages, setMainProductImages] = useState<ImageFile[]>([])
  const [additionalImages, setAdditionalImages] = useState<ImageFile[]>([])
  
  // Save state
  const [isSaving, setIsSaving] = useState(false)
  
  // Edit mode detection
  const isEditMode = Boolean(editProduct)
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    barcode: '',
    categoryId: '',
    description: '',
    purchasePrice: '',
    salePrice: '',
    wholesalePrice: '',
    price1: '',
    price2: '',
    price3: '',
    price4: '',
    isActive: true,
    shapeDescription: '',
    productColor: '#000000'
  })
  
  // State for managing multiple barcodes
  const [productBarcodes, setProductBarcodes] = useState<string[]>([])
  const [editingBarcodeIndex, setEditingBarcodeIndex] = useState<number | null>(null)

  // Pre-fill form data when editProduct changes
  useEffect(() => {
    if (editProduct && isOpen) {
      
      // Parse description to extract text and colors
      let descriptionText = editProduct.description || ''
      let savedColors: ProductColor[] = []
      
      try {
        if (editProduct.description && editProduct.description.startsWith('{')) {
          const descriptionData = JSON.parse(editProduct.description)
          descriptionText = descriptionData.text || ''
          savedColors = descriptionData.colors || []
        }
      } catch (e) {
        // If parsing fails, use the raw description
        descriptionText = editProduct.description || ''
      }
      
      setFormData({
        name: editProduct.name || '',
        code: editProduct.product_code || '',
        barcode: editProduct.barcode || '',
        categoryId: editProduct.category_id || '',
        description: descriptionText,
        purchasePrice: editProduct.cost_price?.toString() || '',
        salePrice: editProduct.price?.toString() || '',
        wholesalePrice: editProduct.wholesale_price?.toString() || '',
        price1: editProduct.price1?.toString() || '',
        price2: editProduct.price2?.toString() || '',
        price3: editProduct.price3?.toString() || '',
        price4: editProduct.price4?.toString() || '',
        isActive: editProduct.is_active ?? true,
        shapeDescription: '',
        productColor: '#000000'
      })
      
      // Set standalone colors from description field
      if (savedColors.length > 0) {
        console.log('🎨 Loading standalone colors from description:', savedColors)
        console.log('🎨 First color details:', savedColors[0])
        
        // Validate and fix color data structure
        const validatedColors = savedColors.map((color: any) => ({
          id: color.id || Date.now().toString(),
          name: color.name || 'لون غير محدد',
          color: color.color || '#000000'
        }))
        
        console.log('🎨 Validated colors:', validatedColors)
        setProductColors(validatedColors)
      } else {
        console.log('🎨 No standalone colors found in description')
        
        // If no colors in description, try to extract from productColors field or variants data
        const extractedColors: ProductColor[] = []
        
        // First check if productColors field exists (from useProducts hook)
        if (editProduct.productColors && Array.isArray(editProduct.productColors) && editProduct.productColors.length > 0) {
          console.log('🎨 Found productColors field:', editProduct.productColors)
          extractedColors.push(...editProduct.productColors)
        } else if (editProduct.variantsData) {
          console.log('🎨 Checking variants data for colors:', editProduct.variantsData)
          
          // Extract unique colors from all locations
          const colorMap = new Map<string, ProductColor>()
          
          Object.values(editProduct.variantsData).forEach((variants: any) => {
            if (Array.isArray(variants)) {
              variants.forEach((variant: any) => {
                if (variant.variant_type === 'color' && variant.name) {
                  let colorValue = '#6B7280' // Default gray
                  
                  // Try to get color from variant value JSON
                  try {
                    if (variant.value && variant.value.startsWith('{')) {
                      const valueData = JSON.parse(variant.value)
                      if (valueData.color) {
                        colorValue = valueData.color
                      }
                    }
                  } catch (e) {
                    // If parsing fails, keep default
                  }
                  
                  // Add to map to avoid duplicates
                  if (!colorMap.has(variant.name)) {
                    colorMap.set(variant.name, {
                      id: `variant-${variant.name}-${Date.now()}`,
                      name: variant.name,
                      color: colorValue
                    })
                  }
                }
              })
            }
          })
          
          extractedColors.push(...Array.from(colorMap.values()))
        }
        
        if (extractedColors.length > 0) {
          console.log('🎨 Extracted colors from variants:', extractedColors)
          setProductColors(extractedColors)
        } else {
          console.log('🎨 No colors found in variants either')
          setProductColors([])
        }
      }
      
      // Set barcodes if available
      if (editProduct.barcodes && editProduct.barcodes.length > 0) {
        setProductBarcodes(editProduct.barcodes)
      } else if (editProduct.barcode) {
        setProductBarcodes([editProduct.barcode])
      }
      
      // Load existing images immediately (doesn't depend on branches/warehouses)
      loadExistingImages()
      
      // If branches/warehouses are already loaded, load variants immediately
      if (branches.length > 0 || warehouses.length > 0) {
        loadExistingInventoryData()
        loadExistingVariantsData()
      }
      
      // Inventory and variants data will be loaded when branches/warehouses are available
    } else if (!editProduct && isOpen) {
      // Clear form for new product
      handleClearFields()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editProduct, isOpen, branches, warehouses])

  const tabs = [
    'تفاصيل المنتج',
    'السعر', 
    'المخزون',
    'الصور',
    'الشكل واللون',
    'الإعدادات'
  ]

  // Fetch branches from database
  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      setBranches(data || [])
    } catch (error) {
      console.error('Error fetching branches:', error)
    }
  }

  // Fetch warehouses from database
  const fetchWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      setWarehouses(data || [])
    } catch (error) {
      console.error('Error fetching warehouses:', error)
    }
  }

  // Initialize location thresholds when branches and warehouses are loaded
  const initializeLocationThresholds = () => {
    console.log('🔄 Initializing location thresholds (new product mode)')
    const thresholds: LocationThreshold[] = []
    
    // Add all branches
    branches.forEach(branch => {
      thresholds.push({
        locationId: branch.id,
        locationType: 'branch',
        locationName: branch.name,
        quantity: 0,
        minStockThreshold: 0
      })
    })
    
    // Add all warehouses
    warehouses.forEach(warehouse => {
      thresholds.push({
        locationId: warehouse.id,
        locationType: 'warehouse',
        locationName: warehouse.name,
        quantity: 0,
        minStockThreshold: 0
      })
    })
    
    console.log('✅ Initialized empty thresholds:', thresholds)
    setLocationThresholds(thresholds)
  }

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setLoading(true)
        try {
          await Promise.all([fetchBranches(), fetchWarehouses()])
        } finally {
          setLoading(false)
        }
      }
      fetchData()
    }
  }, [isOpen])

  // Initialize location thresholds when branches/warehouses change
  useEffect(() => {
    if (branches.length > 0 || warehouses.length > 0) {
      if (isEditMode && editProduct) {
        // Load existing data in edit mode
        loadExistingInventoryData()
        loadExistingVariantsData()
      } else if (!isEditMode) {
        // Initialize empty thresholds for new product only when NOT in edit mode
        initializeLocationThresholds()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches, warehouses, isEditMode, editProduct])

  // Load existing inventory data for edit mode
  const loadExistingInventoryData = async () => {
    if (!editProduct || !editProduct.inventoryData) {
      console.log('No inventory data found for editProduct:', editProduct?.name, editProduct?.inventoryData)
      return
    }

    console.log('🔄 Loading existing inventory data for:', editProduct.name)
    console.log('📦 Raw inventory data:', editProduct.inventoryData)
    console.log('🏢 Available branches:', branches.map(b => `${b.name} (${b.id})`))
    console.log('🏪 Available warehouses:', warehouses.map(w => `${w.name} (${w.id})`))

    // Convert the inventoryData object to locationThresholds format
    const existingThresholds: LocationThreshold[] = []
    
    // Add inventory data for branches
    branches.forEach(branch => {
      const inventoryInfo = editProduct.inventoryData?.[branch.id]
      const threshold = {
        locationId: branch.id,
        locationType: 'branch' as const,
        locationName: branch.name,
        quantity: inventoryInfo?.quantity || 0,
        minStockThreshold: inventoryInfo?.min_stock || 0
      }
      existingThresholds.push(threshold)
      console.log(`📋 Branch ${branch.name}: qty=${threshold.quantity}, min=${threshold.minStockThreshold}`)
    })
    
    // Add inventory data for warehouses
    warehouses.forEach(warehouse => {
      const inventoryInfo = editProduct.inventoryData?.[warehouse.id]
      const threshold = {
        locationId: warehouse.id,
        locationType: 'warehouse' as const,
        locationName: warehouse.name,
        quantity: inventoryInfo?.quantity || 0,
        minStockThreshold: inventoryInfo?.min_stock || 0
      }
      existingThresholds.push(threshold)
      console.log(`📋 Warehouse ${warehouse.name}: qty=${threshold.quantity}, min=${threshold.minStockThreshold}`)
    })
    
    console.log('✅ Setting location thresholds:', existingThresholds)
    setLocationThresholds(existingThresholds)
  }

  // Load existing variants data for edit mode
  const loadExistingVariantsData = async () => {
    console.log('🔄 Loading existing variants data for:', editProduct?.name)
    console.log('📦 Raw variantsData:', editProduct?.variantsData)
    console.log('🏢 Available branches:', branches.map(b => `${b.name} (${b.id})`))
    console.log('🏪 Available warehouses:', warehouses.map(w => `${w.name} (${w.id})`))
    
    if (!editProduct || !editProduct.variantsData) {
      console.log('❌ No variants data found for editProduct')
      return
    }

    const existingVariants: LocationVariant[] = []
    const colors: ProductColor[] = []
    
    // Convert variantsData to locationVariants format
    Object.entries(editProduct.variantsData).forEach(([locationId, variants]) => {
      console.log(`🔍 Processing variants for location ${locationId}:`, variants)
      
      const location = [...branches, ...warehouses].find(loc => loc.id === locationId)
      if (!location) {
        console.log(`❌ Location ${locationId} not found in branches/warehouses`)
        return
      }
      
      const locationType = branches.find(b => b.id === locationId) ? 'branch' as const : 'warehouse' as const
      console.log(`📍 Location ${location.name} is a ${locationType}`)
      
      variants.forEach(variant => {
        console.log(`🎨 Processing variant:`, variant)
        
        // Parse the value field - it might be JSON with barcode and image
        let barcode = variant.value || ''
        let variantImage: string | undefined = undefined
        
        try {
          if (variant.value && variant.value.startsWith('{')) {
            const valueData = JSON.parse(variant.value)
            barcode = valueData.barcode || variant.value
            variantImage = valueData.image
            console.log(`📄 Parsed JSON value data:`, valueData)
          } else {
            console.log(`📄 Using simple barcode value:`, barcode)
          }
        } catch (e) {
          // If parsing fails, use the raw value as barcode
          console.log(`⚠️ Failed to parse value as JSON, using raw value:`, barcode)
        }

        // For colors, create/find the color in our local state
        let elementId = variant.id
        if (variant.variant_type === 'color') {
          let existingColor = colors.find(c => c.name === variant.name)
          if (!existingColor) {
            existingColor = {
              id: `color_${variant.name}_${Date.now()}`,
              name: variant.name,
              color: '#000000' // Default color since it's not stored in the variant
            }
            colors.push(existingColor)
            console.log(`🎨 Created new color:`, existingColor)
          }
          elementId = existingColor.id
        } else if (variant.variant_type === 'shape') {
          // For shapes, try to find matching shape from localStorage
          const matchingShape = shapes.find(s => s.name === variant.name)
          if (matchingShape) {
            elementId = matchingShape.id
            console.log(`🔷 Found matching shape:`, matchingShape)
          } else {
            console.log(`❌ No matching shape found for:`, variant.name)
          }
        }

        const locationVariant = {
          id: variant.id,
          locationId: locationId,
          locationType: locationType,
          elementType: variant.variant_type,
          elementId: elementId,
          elementName: variant.name,
          quantity: variant.quantity,
          barcode: barcode,
          image: variantImage || undefined
        }
        
        existingVariants.push(locationVariant)
        console.log(`✅ Added location variant:`, locationVariant)
      })
    })
    
    console.log(`✅ Setting ${existingVariants.length} location variants:`, existingVariants)
    setLocationVariants(existingVariants)
    
    // Don't override standalone colors with variant colors
    if (colors.length > 0 && productColors.length === 0) {
      console.log(`🎨 Setting ${colors.length} product colors:`, colors)
      setProductColors(colors)
    } else {
      console.log(`🎨 Keeping existing product colors (${productColors.length} colors)`)
    }
  }

  // Load existing images for edit mode
  const loadExistingImages = async () => {
    if (!editProduct) return

    // Load main image if it exists
    if (editProduct.main_image_url) {
      try {
        const imageFile: ImageFile = {
          file: new File([], 'main-image.jpg'), // Empty file object for compatibility
          preview: editProduct.main_image_url,
          id: 'main-existing'
        }
        
        setMainProductImages([imageFile])
      } catch (error) {
        console.error('Error loading main image:', error)
      }
    }

    // Load additional images from video_url field (stored as JSON)
    if (editProduct.video_url) {
      try {
        const additionalImageUrls = JSON.parse(editProduct.video_url)
        if (Array.isArray(additionalImageUrls)) {
          const additionalImageFiles: ImageFile[] = additionalImageUrls.map((url, index) => ({
            file: new File([], `additional-image-${index}.jpg`),
            preview: url,
            id: `additional-existing-${index}`
          }))
          
          setAdditionalImages(additionalImageFiles)
        }
      } catch (error) {
        console.error('Error loading additional images:', error)
      }
    }
  }

  // Force re-render of shape image view when quantities change
  useEffect(() => {
    // This effect ensures the shape image view updates when quantities are modified
  }, [locationThresholds])

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }
  
  const handleThresholdChange = (locationId: string, field: 'quantity' | 'minStockThreshold', value: number) => {
    setLocationThresholds(prev => {
      const updated = prev.map(threshold => 
        threshold.locationId === locationId 
          ? { ...threshold, [field]: value }
          : threshold
      )
      // Force component re-render to update shape image display
      return [...updated]
    })
  }

  // Color management functions
  const addColor = () => {
    if (!colorName.trim()) return
    
    if (editingColorId) {
      // Update existing color
      setProductColors(prev => 
        prev.map(color => 
          color.id === editingColorId 
            ? { ...color, name: colorName.trim(), color: selectedColor }
            : color
        )
      )
      setEditingColorId(null)
    } else {
      // Add new color
      const newColor: ProductColor = {
        id: Date.now().toString(),
        name: colorName.trim(),
        color: selectedColor
      }
      setProductColors(prev => [...prev, newColor])
    }
    
    // Reset form
    setColorName('')
    setSelectedColor('#000000')
  }

  const editColor = (color: ProductColor) => {
    setColorName(color.name)
    setSelectedColor(color.color)
    setEditingColorId(color.id)
  }

  const deleteColor = (colorId: string) => {
    setProductColors(prev => prev.filter(color => color.id !== colorId))
    // If we were editing this color, reset the form
    if (editingColorId === colorId) {
      setColorName('')
      setSelectedColor('#000000')
      setEditingColorId(null)
    }
  }

  const cancelEdit = () => {
    setColorName('')
    setSelectedColor('#000000')
    setEditingColorId(null)
  }


  // Image handling functions
  const createImageFile = (file: File): ImageFile => ({
    file,
    preview: URL.createObjectURL(file),
    id: Math.random().toString(36).substr(2, 9)
  })

  const handleMainImageSelect = (files: File[]) => {
    const newImages = files.map(createImageFile)
    setMainProductImages(newImages.slice(0, 1)) // Only one main image
  }

  const handleAdditionalImageSelect = (files: File[]) => {
    const newImages = files.map(createImageFile)
    setAdditionalImages(prev => [...prev, ...newImages])
  }

  const removeMainImage = (id: string) => {
    setMainProductImages(prev => {
      const imageToRemove = prev.find(img => img.id === id)
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview)
      }
      return prev.filter(img => img.id !== id)
    })
  }

  const removeAdditionalImage = (id: string) => {
    setAdditionalImages(prev => {
      const imageToRemove = prev.find(img => img.id === id)
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview)
      }
      return prev.filter(img => img.id !== id)
    })
  }

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      mainProductImages.forEach(img => URL.revokeObjectURL(img.preview))
      additionalImages.forEach(img => URL.revokeObjectURL(img.preview))
    }
  }, [])

  // Image Upload Area Component
  const ImageUploadArea = ({ onImageSelect, images, onImageRemove, label, multiple = false }: ImageUploadAreaProps) => {
    const [isDragOver, setIsDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      
      const files = Array.from(e.dataTransfer.files).filter(file => 
        file.type.startsWith('image/')
      )
      
      if (files.length > 0) {
        onImageSelect(files)
      }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files) {
        onImageSelect(Array.from(files))
      }
      // Reset input value
      e.target.value = ''
    }

    const openFileDialog = () => {
      fileInputRef.current?.click()
    }

    return (
      <div className="space-y-3">
        <label className="block text-gray-300 text-sm font-medium mb-2">
          {label}
        </label>
        
        {/* Drop Zone */}
        <div 
          className={`border-2 border-dashed p-8 text-center transition-all duration-200 ${
            isDragOver 
              ? 'border-blue-400 bg-blue-400/10' 
              : 'border-gray-600 bg-[#4A5568]/30'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-2">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-gray-400 text-sm">
              {isDragOver ? 'أفلت الصورة هنا' : 'اسحب وأفلت الصورة هنا أو'}
            </p>
            <button 
              type="button"
              onClick={openFileDialog}
              className="bg-[#4A5568] hover:bg-[#5A6478] text-white px-4 py-2 text-sm border border-gray-600 transition-colors"
            >
              اختر الصورة
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple={multiple}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* Image Previews */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
            {images.map((image) => (
              <div key={image.id} className="relative group">
                <img 
                  src={image.preview} 
                  alt="معاينة الصورة"
                  className="w-full h-24 object-cover rounded border border-gray-600"
                />
                <button
                  type="button"
                  onClick={() => onImageRemove(image.id)}
                  className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="absolute bottom-1 left-1 right-1 bg-black/70 text-white text-xs p-1 rounded truncate">
                  {image.file.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Location variant management functions
  const handleLocationSelect = (location: Branch | Warehouse, type: 'branch' | 'warehouse') => {
    const totalQuantity = locationThresholds.find(t => t.locationId === location.id)?.quantity || 0
    
    // If clicking the same location, toggle it off
    if (selectedLocation?.id === location.id) {
      setSelectedLocation(null)
      setEditingVariant(null)
      setVariantForm({
        elementType: 'color',
        elementId: '',
        quantity: 0,
        barcode: generateBarcode(),
        image: null
      })
      return
    }
    
    setSelectedLocation({
      id: location.id,
      name: location.name,
      type: type,
      totalQuantity: totalQuantity
    })
    setEditingVariant(null)
    setVariantForm({
      elementType: 'color',
      elementId: '',
      quantity: 0,
      barcode: generateBarcode(),
      image: null
    })
  }

  const generateBarcode = () => {
    return (Math.floor(Math.random() * 9000000000) + 1000000000).toString()
  }
  
  // Functions for managing product barcodes
  const handleGenerateBarcode = () => {
    const newBarcode = generateBarcode()
    setFormData(prev => ({ ...prev, barcode: newBarcode }))
  }
  
  const handleAddBarcode = () => {
    const barcodeToAdd = formData.barcode.trim()
    if (!barcodeToAdd) return
    
    // Check if barcode already exists
    if (productBarcodes.includes(barcodeToAdd)) {
      alert('هذا الباركود موجود بالفعل')
      return
    }
    
    if (editingBarcodeIndex !== null) {
      // Update existing barcode
      setProductBarcodes(prev => 
        prev.map((barcode, index) => 
          index === editingBarcodeIndex ? barcodeToAdd : barcode
        )
      )
      setEditingBarcodeIndex(null)
    } else {
      // Add new barcode
      setProductBarcodes(prev => [...prev, barcodeToAdd])
    }
    
    // Clear the input field
    setFormData(prev => ({ ...prev, barcode: '' }))
  }
  
  const handleEditBarcode = (index: number) => {
    const barcodeToEdit = productBarcodes[index]
    setFormData(prev => ({ ...prev, barcode: barcodeToEdit }))
    setEditingBarcodeIndex(index)
  }
  
  const handleDeleteBarcode = (index: number) => {
    setProductBarcodes(prev => prev.filter((_, i) => i !== index))
    
    // If we were editing this barcode, reset the form
    if (editingBarcodeIndex === index) {
      setFormData(prev => ({ ...prev, barcode: '' }))
      setEditingBarcodeIndex(null)
    } else if (editingBarcodeIndex !== null && editingBarcodeIndex > index) {
      // Adjust editing index if necessary
      setEditingBarcodeIndex(prev => prev! - 1)
    }
  }
  
  const cancelBarcodeEdit = () => {
    setFormData(prev => ({ ...prev, barcode: '' }))
    setEditingBarcodeIndex(null)
  }

  const getAvailableElements = () => {
    if (variantForm.elementType === 'color') {
      return productColors
    } else {
      // Return shapes from useShapes hook
      return shapes
    }
  }

  const getUsedQuantity = () => {
    if (!selectedLocation) return 0
    return locationVariants
      .filter(v => v.locationId === selectedLocation.id)
      .reduce((sum, v) => sum + v.quantity, 0)
  }

  const getRemainingQuantity = () => {
    return selectedLocation ? selectedLocation.totalQuantity - getUsedQuantity() : 0
  }

  const handleVariantSubmit = () => {
    if (!selectedLocation || !variantForm.elementId || variantForm.quantity <= 0) return
    
    const element = getAvailableElements().find(e => e.id === variantForm.elementId)
    if (!element) return

    const remainingQuantity = getRemainingQuantity()
    if (variantForm.quantity > remainingQuantity) {
      alert(`الكمية المتاحة هي ${remainingQuantity} قطعة فقط`)
      return
    }

    const newVariant: LocationVariant = {
      id: editingVariant?.id || Date.now().toString(),
      locationId: selectedLocation.id,
      locationType: selectedLocation.type,
      elementType: variantForm.elementType,
      elementId: variantForm.elementId,
      elementName: element.name,
      quantity: variantForm.quantity,
      barcode: variantForm.barcode,
      image: variantForm.image ? URL.createObjectURL(variantForm.image) : undefined
    }

    if (editingVariant) {
      console.log('✏️ Editing existing variant:', editingVariant)
      setLocationVariants(prev => prev.map(v => v.id === editingVariant.id ? newVariant : v))
    } else {
      console.log('➕ Adding new variant:', newVariant)
      setLocationVariants(prev => {
        const updated = [...prev, newVariant]
        console.log('📦 Updated location variants array:', updated)
        return updated
      })
    }

    // Reset form but keep location selected
    setVariantForm({
      elementType: 'color',
      elementId: '',
      quantity: 0,
      barcode: generateBarcode(),
      image: null
    })
    setEditingVariant(null)
  }

  const handleVariantEdit = (variant: LocationVariant) => {
    setEditingVariant(variant)
    setVariantForm({
      elementType: variant.elementType,
      elementId: variant.elementId,
      quantity: variant.quantity,
      barcode: variant.barcode,
      image: null // We can't restore file objects, so leave null
    })
  }

  const handleVariantDelete = (variantId: string) => {
    setLocationVariants(prev => prev.filter(v => v.id !== variantId))
  }


  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('يرجى إدخال اسم المنتج')
      return
    }

    console.log('🚀 Starting save process...')
    console.log('📦 Current locationVariants before save:', locationVariants)
    console.log('🎨 Current productColors before save:', productColors)
    console.log('📋 Current locationThresholds before save:', locationThresholds)

    setIsSaving(true)
    try {
      // Upload main image if exists (for new uploads only)
      let mainImageUrl = isEditMode ? editProduct?.main_image_url : ''
      if (mainProductImages.length > 0 && mainProductImages[0].id !== 'main-existing') {
        const { data: mainImageData, error: mainImageError } = await uploadProductImage(
          mainProductImages[0].file,
          'MAIN_PRODUCTS'
        )
        
        if (mainImageError) {
          console.error('Main image upload error:', mainImageError)
          alert('فشل في رفع الصورة الرئيسية')
          return
        }
        
        if (mainImageData?.path) {
          mainImageUrl = getProductImageUrl('MAIN_PRODUCTS', mainImageData.path)
        }
      }

      // Handle additional images - store URLs in video_url field as JSON
      let additionalImagesJson = null
      if (additionalImages.length > 0) {
        const additionalImageUrls: string[] = []
        
        for (const imageFile of additionalImages) {
          if (imageFile.id.startsWith('additional-existing')) {
            // Keep existing image URL
            additionalImageUrls.push(imageFile.preview)
          } else {
            // Upload new image
            const { data: imageData, error: imageError } = await uploadProductImage(
              imageFile.file,
              'SUB_PRODUCTS'
            )
            
            if (!imageError && imageData?.path) {
              const imageUrl = getProductImageUrl('SUB_PRODUCTS', imageData.path)
              additionalImageUrls.push(imageUrl)
            }
          }
        }
        
        if (additionalImageUrls.length > 0) {
          additionalImagesJson = JSON.stringify(additionalImageUrls)
        }
      }

      // Store standalone colors in description field as JSON
      let descriptionData: any = {
        text: formData.description.trim() || '',
        colors: productColors.length > 0 ? productColors : undefined
      }

      // Prepare product data
      const productData: Partial<Product> = {
        name: formData.name.trim(),
        name_en: formData.name.trim(), // Could be separate field
        description: JSON.stringify(descriptionData),
        barcode: productBarcodes[0] || formData.barcode.trim() || undefined,
        barcodes: productBarcodes.length > 0 ? productBarcodes : (formData.barcode.trim() ? [formData.barcode.trim()] : []),
        price: parseFloat(formData.salePrice) || 0,
        cost_price: parseFloat(formData.purchasePrice) || 0,
        wholesale_price: parseFloat(formData.wholesalePrice) || 0,
        price1: parseFloat(formData.price1) || 0,
        price2: parseFloat(formData.price2) || 0,
        price3: parseFloat(formData.price3) || 0,
        price4: parseFloat(formData.price4) || 0,
        category_id: formData.categoryId || undefined,
        product_code: formData.code.trim() || undefined,
        main_image_url: mainImageUrl || undefined,
        video_url: additionalImagesJson || undefined, // Store additional images as JSON
        is_active: formData.isActive,
        unit: 'قطعة'
      }

      let savedProduct: Product | null = null

      if (isEditMode && editProduct && updateProduct) {
        // Update existing product
        savedProduct = await updateProduct(editProduct.id, productData)
        
        if (savedProduct) {
          // Update inventory entries
          const inventoryPromises = locationThresholds
            .filter(threshold => threshold.quantity > 0 || threshold.minStockThreshold > 0)
            .map(async (threshold) => {
              const inventoryData: any = {
                product_id: savedProduct!.id,
                quantity: threshold.quantity,
                min_stock: threshold.minStockThreshold
              }
              
              if (threshold.locationType === 'branch') {
                inventoryData.branch_id = threshold.locationId
              } else {
                inventoryData.warehouse_id = threshold.locationId
              }
              
              // Try to update existing inventory entry, or insert if it doesn't exist
              const { error: upsertError } = await supabase
                .from('inventory')
                .upsert(inventoryData, {
                  onConflict: threshold.locationType === 'branch' ? 'product_id,branch_id' : 'product_id,warehouse_id'
                })
              
              if (upsertError) {
                console.error('Error updating inventory:', upsertError)
              }
            })

          await Promise.all(inventoryPromises)

          // Update product variants - delete all existing variants and re-create
          const { error: deleteError } = await supabase
            .from('product_variants')
            .delete()
            .eq('product_id', savedProduct.id)

          if (deleteError) {
            console.error('Error deleting existing variants:', deleteError)
          }

          // Create new variants
          const variantPromises = locationVariants.map(async (variant) => {
            // Get additional data based on variant type and encode in the value field
            let valueData: any = {
              barcode: variant.barcode
            }
            
            if (variant.elementType === 'color') {
              const color = productColors.find(c => c.id === variant.elementId)
              valueData.color = color?.color || '#000000'
            }
            
            if (variant.image) {
              valueData.image = variant.image
            }
            
            // For variant images, we need to upload them first
            let editVariantValue = variant.barcode
            if (variant.image) {
              try {
                // Upload the variant image
                const imageFile = variant.image.startsWith('blob:') 
                  ? await fetch(variant.image).then(r => r.blob()).then(blob => new File([blob], 'variant.jpg', { type: 'image/jpeg' }))
                  : null
                
                if (imageFile) {
                  const { data: imageData, error: imageError } = await uploadProductImage(
                    imageFile,
                    'VARIANT_PRODUCTS'
                  )
                  
                  if (!imageError && imageData?.path) {
                    const imageUrl = getProductImageUrl('VARIANT_PRODUCTS', imageData.path)
                    // Store barcode and image URL as JSON in value field
                    editVariantValue = JSON.stringify({
                      barcode: variant.barcode,
                      image: imageUrl
                    })
                  }
                }
              } catch (error) {
                console.error('Error uploading variant image:', error)
              }
            }

            const editVariantData = {
              product_id: savedProduct!.id,
              branch_id: variant.locationId, // Use branch_id for all locations
              variant_type: variant.elementType,
              name: variant.elementName,
              value: editVariantValue, // Barcode or JSON with barcode + image
              quantity: variant.quantity
            }
            
            return supabase.from('product_variants').insert(editVariantData)
          })

          await Promise.all(variantPromises)
          
          // Trigger refresh and close
          onProductCreated?.()
          
          // Success - clear form and close AFTER everything is saved
          handleClearFields()
          alert('تم تحديث المنتج بنجاح!')
        }
      } else {
        // Create new product
        savedProduct = await createProduct(productData)
        
        if (savedProduct) {
          console.log('🔄 Creating inventory entries for new product:', savedProduct.name)
          console.log('📦 Location thresholds to save:', locationThresholds)
          
          // Create inventory entries for each location with quantities
          const inventoryEntriesToSave = locationThresholds
            .filter(threshold => threshold.quantity > 0 || threshold.minStockThreshold > 0)
          
          console.log('✅ Filtered inventory entries to save:', inventoryEntriesToSave)
          
          const inventoryPromises = inventoryEntriesToSave.map(threshold => {
              const inventoryData: any = {
                product_id: savedProduct!.id,
                quantity: threshold.quantity,
                min_stock: threshold.minStockThreshold
              }
              
              if (threshold.locationType === 'branch') {
                inventoryData.branch_id = threshold.locationId
              } else {
                inventoryData.warehouse_id = threshold.locationId
              }
              
              console.log('💾 Saving inventory entry:', inventoryData)
              return supabase.from('inventory').insert(inventoryData)
            })

          const inventoryResults = await Promise.all(inventoryPromises)
          console.log('✅ Inventory save results:', inventoryResults)

          // Create product variants if any
          console.log('🎨 Creating product variants for new product:', savedProduct.name)
          console.log('📦 Location variants to save:', locationVariants)
          console.log('🎨 Product colors available:', productColors)
          
          const variantPromises = locationVariants.map(async (variant) => {
            console.log('🔄 Processing variant for save:', variant)
            
            // Get additional data based on variant type and encode in the value field
            let valueData: any = {
              barcode: variant.barcode
            }
            
            if (variant.elementType === 'color') {
              const color = productColors.find(c => c.id === variant.elementId)
              valueData.color = color?.color || '#000000'
              console.log('🎨 Found color for variant:', color)
            }
            
            if (variant.image) {
              valueData.image = variant.image
              console.log('🖼️ Variant has image:', variant.image)
            }
            
            // For variant images, we need to upload them first
            let variantValue = variant.barcode
            if (variant.image) {
              try {
                // Upload the variant image
                const imageFile = variant.image.startsWith('blob:') 
                  ? await fetch(variant.image).then(r => r.blob()).then(blob => new File([blob], 'variant.jpg', { type: 'image/jpeg' }))
                  : null
                
                if (imageFile) {
                  const { data: imageData, error: imageError } = await uploadProductImage(
                    imageFile,
                    'VARIANT_PRODUCTS'
                  )
                  
                  if (!imageError && imageData?.path) {
                    const imageUrl = getProductImageUrl('VARIANT_PRODUCTS', imageData.path)
                    // Store barcode and image URL as JSON in value field
                    variantValue = JSON.stringify({
                      barcode: variant.barcode,
                      image: imageUrl
                    })
                    console.log('🖼️ Uploaded variant image:', imageUrl)
                  }
                }
              } catch (error) {
                console.error('Error uploading variant image:', error)
              }
            }

            const variantData = {
              product_id: savedProduct!.id,
              branch_id: variant.locationId, // Use branch_id for all locations
              variant_type: variant.elementType,
              name: variant.elementName,
              value: variantValue, // Barcode or JSON with barcode + image
              quantity: variant.quantity
            }
            
            console.log('💾 Saving variant data:', variantData)
            return supabase.from('product_variants').insert(variantData)
          })

          const variantResults = await Promise.all(variantPromises)
          console.log('✅ Variant save results:', variantResults)

          // Add a small delay to ensure all database transactions are committed
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // Trigger refresh of products list
          console.log('🔄 Triggering product list refresh after creation')
          onProductCreated?.()
          
          // Success - clear form and close AFTER everything is saved
          handleClearFields()
          alert('تم إنشاء المنتج بنجاح!')
        }
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} product:`, error)
      alert(`حدث خطأ أثناء ${isEditMode ? 'تحديث' : 'إنشاء'} المنتج`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: '',
      code: '',
      barcode: '',
      categoryId: '',
      description: '',
      purchasePrice: '',
      salePrice: '',
      wholesalePrice: '',
      price1: '',
      price2: '',
      price3: '',
      price4: '',
      isActive: true,
      shapeDescription: '',
      productColor: '#000000'
    })
    // Clear barcodes
    setProductBarcodes([])
    setEditingBarcodeIndex(null)
    onClose()
  }

  const handleClearFields = () => {
    // Instant clearing without confirmation
    setFormData({
      name: '',
      code: '',
      barcode: '',
      categoryId: '',
      description: '',
      purchasePrice: '',
      salePrice: '',
      wholesalePrice: '',
      price1: '',
      price2: '',
      price3: '',
      price4: '',
      isActive: true,
      shapeDescription: '',
      productColor: '#000000'
    })
    // Reset location thresholds
    initializeLocationThresholds()
    // Clear images
    mainProductImages.forEach(img => URL.revokeObjectURL(img.preview))
    additionalImages.forEach(img => URL.revokeObjectURL(img.preview))
    setMainProductImages([])
    setAdditionalImages([])
    // Clear barcodes
    setProductBarcodes([])
    setEditingBarcodeIndex(null)
    // Clear colors and variants
    setProductColors([])
    setLocationVariants([])
    setSelectedLocation(null)
  }


  const renderTabContent = () => {
    switch (activeTab) {
      case 'تفاصيل المنتج':
        return (
          <div className="space-y-4">
            {/* Product Name */}
            <div>
              <label className="block text-white text-sm font-medium mb-2 text-right">
                اسم المنتج *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="أدخل اسم المنتج"
                className="w-full px-3 py-2 bg-[#2B3441] border border-[#4A5568] rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#5DADE2] focus:border-[#5DADE2] text-right text-sm"
              />
            </div>

            {/* Product Code */}
            <div>
              <label className="block text-white text-sm font-medium mb-2 text-right">
                الكود
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                placeholder="أدخل كود المنتج"
                className="w-full px-3 py-2 bg-[#2B3441] border border-[#4A5568] rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#5DADE2] focus:border-[#5DADE2] text-right text-sm"
              />
            </div>

            {/* Barcode */}
            <div>
              <label className="block text-white text-sm font-medium mb-2 text-right">
                الباركود
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => handleInputChange('barcode', e.target.value)}
                  placeholder="أدخل باركود جديد"
                  className="flex-1 px-3 py-2 bg-[#2B3441] border border-[#4A5568] rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#5DADE2] focus:border-[#5DADE2] text-right text-sm"
                />
                <button 
                  type="button"
                  onClick={handleAddBarcode}
                  disabled={!formData.barcode.trim()}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    !formData.barcode.trim() 
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                      : 'bg-[#10B981] hover:bg-[#059669] text-white'
                  }`}
                >
                  {editingBarcodeIndex !== null ? '✓' : '+'}
                </button>
                <button 
                  type="button"
                  onClick={handleGenerateBarcode}
                  className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-3 py-2 text-sm font-medium transition-colors"
                >
                  ↻
                </button>
                {editingBarcodeIndex !== null && (
                  <button 
                    type="button"
                    onClick={cancelBarcodeEdit}
                    className="bg-[#6B7280] hover:bg-[#4B5563] text-white px-3 py-2 text-sm font-medium transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
              
              {/* Display added barcodes */}
              {productBarcodes.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-gray-300 text-xs font-medium text-right">
                    الباركودات المضافة ({productBarcodes.length}):
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-hide">
                    {productBarcodes.map((barcode, index) => (
                      <div key={index} className="bg-[#374151] rounded p-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDeleteBarcode(index)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEditBarcode(index)}
                            className={`transition-colors ${
                              editingBarcodeIndex === index 
                                ? 'text-blue-300' 
                                : 'text-blue-400 hover:text-blue-300'
                            }`}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                        
                        <div className="text-white text-sm font-mono">
                          {barcode}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-white text-sm font-medium mb-2 text-right">
                المجموعة *
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => handleInputChange('categoryId', e.target.value)}
                className="w-full px-3 py-2 bg-[#2B3441] border border-[#4A5568] rounded text-white focus:outline-none focus:ring-1 focus:ring-[#5DADE2] focus:border-[#5DADE2] text-right text-sm"
              >
                <option value="">-- اختر المجموعة --</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-white text-sm font-medium mb-2 text-right">
                الوصف
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="أدخل وصف المنتج"
                rows={4}
                className="w-full px-3 py-2 bg-[#2B3441] border border-[#4A5568] rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#5DADE2] focus:border-[#5DADE2] text-right text-sm resize-none"
              />
            </div>
          </div>
        )

      case 'السعر':
        return (
          <div className="space-y-4">
            {/* Purchase Price */}
            <div>
              <label className="block text-white text-sm font-medium mb-2 text-right">
                سعر الشراء *
              </label>
              <input
                type="number"
                value={formData.purchasePrice}
                onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                placeholder=""
                className="w-full px-3 py-2 bg-[#2B3441] border border-[#4A5568] rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#5DADE2] focus:border-[#5DADE2] text-right text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Sale Price */}
            <div>
              <label className="block text-white text-sm font-medium mb-2 text-right">
                سعر البيع *
              </label>
              <input
                type="number"
                value={formData.salePrice}
                onChange={(e) => handleInputChange('salePrice', e.target.value)}
                placeholder=""
                className="w-full px-3 py-2 bg-[#2B3441] border border-[#4A5568] rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#5DADE2] focus:border-[#5DADE2] text-right text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Wholesale Price */}
            <div>
              <label className="block text-white text-sm font-medium mb-2 text-right">
                سعر الجملة
              </label>
              <input
                type="number"
                value={formData.wholesalePrice}
                onChange={(e) => handleInputChange('wholesalePrice', e.target.value)}
                placeholder=""
                className="w-full px-3 py-2 bg-[#2B3441] border border-[#4A5568] rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#5DADE2] focus:border-[#5DADE2] text-right text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Additional Prices */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white text-sm font-medium mb-2 text-right">
                  سعر 1
                </label>
                <input
                  type="number"
                  value={formData.price1}
                  onChange={(e) => handleInputChange('price1', e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-2 bg-[#2B3441] border border-[#4A5568] rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#5DADE2] focus:border-[#5DADE2] text-right text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div>
                <label className="block text-white text-sm font-medium mb-2 text-right">
                  سعر 2
                </label>
                <input
                  type="number"
                  value={formData.price2}
                  onChange={(e) => handleInputChange('price2', e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-2 bg-[#2B3441] border border-[#4A5568] rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#5DADE2] focus:border-[#5DADE2] text-right text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div>
                <label className="block text-white text-sm font-medium mb-2 text-right">
                  سعر 3
                </label>
                <input
                  type="number"
                  value={formData.price3}
                  onChange={(e) => handleInputChange('price3', e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-2 bg-[#2B3441] border border-[#4A5568] rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#5DADE2] focus:border-[#5DADE2] text-right text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div>
                <label className="block text-white text-sm font-medium mb-2 text-right">
                  سعر 4
                </label>
                <input
                  type="number"
                  value={formData.price4}
                  onChange={(e) => handleInputChange('price4', e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-2 bg-[#2B3441] border border-[#4A5568] rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#5DADE2] focus:border-[#5DADE2] text-right text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          </div>
        )

      case 'الصور':
        return (
          <div className="space-y-6">
            {/* Main Product Image */}
            <ImageUploadArea
              label="الصورة الرئيسية للمنتج"
              onImageSelect={handleMainImageSelect}
              images={mainProductImages}
              onImageRemove={removeMainImage}
              multiple={false}
            />

            {/* Additional Product Images */}
            <ImageUploadArea
              label="الصور الفرعية للمنتج"
              onImageSelect={handleAdditionalImageSelect}
              images={additionalImages}
              onImageRemove={removeAdditionalImage}
              multiple={true}
            />
          </div>
        )

      case 'الشكل واللون':
        return (
          <div className="flex flex-col h-full">
            {/* Shape & Color Sub-tabs */}
            <div className="border-b border-[#4A5568] flex-shrink-0">
              <div className="flex gap-0">
                <button
                  onClick={() => setActiveShapeColorTab('شكل وصف')}
                  className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                    activeShapeColorTab === 'شكل وصف'
                      ? 'text-[#5DADE2]'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  شكل وصف
                  {activeShapeColorTab === 'شكل وصف' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5DADE2]"></div>
                  )}
                </button>
                <button
                  onClick={() => setActiveShapeColorTab('لون المنتج')}
                  className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                    activeShapeColorTab === 'لون المنتج'
                      ? 'text-[#5DADE2]'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  لون المنتج
                  {activeShapeColorTab === 'لون المنتج' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5DADE2]"></div>
                  )}
                </button>
                <button
                  onClick={() => setActiveShapeColorTab('شكل صورة')}
                  className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                    activeShapeColorTab === 'شكل صورة'
                      ? 'text-[#5DADE2]'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  شكل صورة
                  {activeShapeColorTab === 'شكل صورة' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5DADE2]"></div>
                  )}
                </button>
              </div>
            </div>

            {/* Sub-tab Content */}
            <div className="flex-1 pt-4">
            {activeShapeColorTab === 'شكل وصف' && (
              <div>
                <ShapeManagement />
              </div>
            )}

            {activeShapeColorTab === 'لون المنتج' && (
              <div className="space-y-4">
                {/* Color Name Section */}
                <div>
                  <label className="block text-white text-sm font-medium mb-2 text-right">
                    اسم اللون
                  </label>
                  <input
                    type="text"
                    value={colorName}
                    onChange={(e) => setColorName(e.target.value)}
                    placeholder="مثالة: أزرق فاتح"
                    className="w-full px-3 py-2 bg-[#2B3441] border border-[#4A5568] rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#5DADE2] focus:border-[#5DADE2] text-right text-sm"
                  />
                </div>

                {/* Color Selection Section */}
                <div className="flex items-center justify-end gap-3">
                  <span className="text-white text-sm">اللون</span>
                  <div className="flex items-center gap-2">
                    <label className="relative cursor-pointer">
                      <div 
                        className="w-8 h-8 border border-[#4A5568] rounded cursor-pointer hover:border-[#5DADE2] transition-colors"
                        style={{ backgroundColor: selectedColor }}
                      />
                      <input
                        type="color"
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </label>
                    <button 
                      onClick={addColor}
                      className="bg-[#10B981] hover:bg-[#059669] text-white w-8 h-8 rounded flex items-center justify-center text-sm font-bold transition-colors"
                    >
                      +
                    </button>
                    {editingColorId && (
                      <button 
                        onClick={cancelEdit}
                        className="bg-[#6B7280] hover:bg-[#4B5563] text-white w-8 h-8 rounded flex items-center justify-center text-sm font-bold transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Added Colors Display */}
                {productColors.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 justify-end">
                      {productColors.map((color) => {
                        console.log('🎨 Rendering color:', color.name, 'with color value:', color.color)
                        return (
                          <div 
                            key={color.id}
                            className="bg-[#10B981] text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => deleteColor(color.id)}
                                className="text-white hover:text-red-200 transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                              <button
                                onClick={() => editColor(color)}
                                className="text-white hover:text-blue-200 transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            </div>
                            <span>{color.name}</span>
                            <div 
                              className="w-4 h-4 rounded-full border border-white/20"
                              style={{ backgroundColor: color.color || '#000000' }}
                              title={`Color: ${color.color}`}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeShapeColorTab === 'شكل صورة' && (
              <div className="h-full flex flex-col">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5DADE2]"></div>
                  </div>
                ) : (
                  <div className="space-y-6 pb-8">
                    <label className="block text-white text-sm font-medium mb-4 text-right">
                      اختر المخزن أو الفرع:
                    </label>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Display branches */}
                      {branches.map((branch) => (
                        <div 
                          key={branch.id} 
                          className={`bg-[#2B3441] border rounded p-4 text-center hover:border-[#5DADE2] transition-colors cursor-pointer ${
                            selectedLocation?.id === branch.id ? 'border-[#5DADE2] bg-[#3B4A5A]' : 'border-[#4A5568]'
                          }`}
                          onClick={() => handleLocationSelect(branch, 'branch')}
                        >
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="p-1 rounded bg-blue-600/20 text-blue-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            <h3 className="text-white font-medium">{branch.name}</h3>
                          </div>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-600/20 text-blue-300 border border-blue-600/30">
                            فرع
                          </span>
                          <p className="text-blue-400 text-sm mt-2 font-medium">
                            كمية: {locationThresholds.find(t => t.locationId === branch.id)?.quantity || 0} قطعة
                          </p>
                        </div>
                      ))}
                      
                      {/* Display warehouses */}
                      {warehouses.map((warehouse) => (
                        <div 
                          key={warehouse.id} 
                          className={`bg-[#2B3441] border rounded p-4 text-center hover:border-[#5DADE2] transition-colors cursor-pointer ${
                            selectedLocation?.id === warehouse.id ? 'border-[#5DADE2] bg-[#3B4A5A]' : 'border-[#4A5568]'
                          }`}
                          onClick={() => handleLocationSelect(warehouse, 'warehouse')}
                        >
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="p-1 rounded bg-green-600/20 text-green-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                            <h3 className="text-white font-medium">{warehouse.name}</h3>
                          </div>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-600/20 text-green-300 border border-green-600/30">
                            مخزن
                          </span>
                          <p className="text-green-400 text-sm mt-2 font-medium">
                            كمية: {locationThresholds.find(t => t.locationId === warehouse.id)?.quantity || 0} قطعة
                          </p>
                        </div>
                      ))}
                      
                      {/* Empty state if no locations */}
                      {branches.length === 0 && warehouses.length === 0 && (
                        <div className="col-span-2 text-center py-8">
                          <div className="text-gray-400 text-sm">
                            لا توجد فروع أو مخازن متاحة
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Inline Form - appears when location is selected */}
                    {selectedLocation && (
                      <div className="bg-[#3A4553] border border-[#4A5568] rounded-lg p-3 space-y-2">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-[#4A5568]">
                          <h4 className="text-white font-medium text-right text-sm">
                            {selectedLocation.name} المحدد - {selectedLocation.type === 'branch' ? 'فرع' : 'مخزن'}
                          </h4>
                          <button
                            onClick={() => setSelectedLocation(null)}
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-gray-300 text-xs">
                            الكمية الإجمالية: {selectedLocation.totalQuantity} قطعة
                          </p>
                          {getRemainingQuantity() < selectedLocation.totalQuantity && (
                            <p className="text-green-400 text-xs mt-1">
                              متبقي {getRemainingQuantity()} قطعة
                            </p>
                          )}
                        </div>

                        {/* Form Fields */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Element Type Selection */}
                          <div>
                            <label className="block text-white text-xs font-medium mb-1 text-right">
                              العنصر المراد ربطه
                            </label>
                            <select
                              value={variantForm.elementType}
                              onChange={(e) => setVariantForm(prev => ({ 
                                ...prev, 
                                elementType: e.target.value as 'color' | 'shape',
                                elementId: '' 
                              }))}
                              className="w-full px-2 py-1.5 bg-[#2B3441] border border-[#4A5568] rounded text-white focus:outline-none focus:ring-1 focus:ring-[#5DADE2] focus:border-[#5DADE2] text-right text-xs"
                            >
                              <option value="color">لون المنتج</option>
                              {shapes.length > 0 && (
                                <option value="shape">شكل وصف</option>
                              )}
                            </select>
                          </div>

                          {/* Element Selection */}
                          <div>
                            <label className="block text-white text-xs font-medium mb-1 text-right">
                              نوع الربط
                            </label>
                            <select
                              value={variantForm.elementId}
                              onChange={(e) => setVariantForm(prev => ({ ...prev, elementId: e.target.value }))}
                              className="w-full px-2 py-1.5 bg-[#2B3441] border border-[#4A5568] rounded text-white focus:outline-none focus:ring-1 focus:ring-[#5DADE2] focus:border-[#5DADE2] text-right text-xs"
                            >
                              <option value="">-- اختر القيمة --</option>
                              {getAvailableElements().map((element) => (
                                <option key={element.id} value={element.id}>
                                  {element.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Quantity */}
                          <div>
                            <label className="block text-white text-xs font-medium mb-1 text-right">
                              الكمية
                            </label>
                            <input
                              type="number"
                              value={variantForm.quantity}
                              onChange={(e) => setVariantForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                              placeholder="0"
                              min="0"
                              max={getRemainingQuantity() + (editingVariant?.quantity || 0)}
                              className="w-full px-2 py-1.5 bg-[#2B3441] border border-[#4A5568] rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#5DADE2] focus:border-[#5DADE2] text-right text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>

                          {/* Barcode */}
                          <div>
                            <label className="block text-white text-xs font-medium mb-1 text-right">
                              الباركود
                            </label>
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={variantForm.barcode}
                                onChange={(e) => setVariantForm(prev => ({ ...prev, barcode: e.target.value }))}
                                placeholder="الباركود"
                                className="flex-1 px-2 py-1.5 bg-[#2B3441] border border-[#4A5568] rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#5DADE2] focus:border-[#5DADE2] text-right text-xs"
                              />
                              <button 
                                onClick={() => setVariantForm(prev => ({ ...prev, barcode: generateBarcode() }))}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 rounded transition-colors"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Image Upload with Drag & Drop */}
                        <div>
                          <label className="block text-white text-xs font-medium mb-1 text-right">
                            رفع صورة
                          </label>
                          <div 
                            className="border border-dashed border-gray-600 p-2 text-center bg-[#4A5568]/30 rounded transition-all duration-200 hover:border-blue-400"
                            onDragOver={(e) => {
                              e.preventDefault()
                              e.currentTarget.classList.add('border-blue-400', 'bg-blue-400/10')
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault()
                              e.currentTarget.classList.remove('border-blue-400', 'bg-blue-400/10')
                            }}
                            onDrop={(e) => {
                              e.preventDefault()
                              e.currentTarget.classList.remove('border-blue-400', 'bg-blue-400/10')
                              const files = Array.from(e.dataTransfer.files).filter(file => 
                                file.type.startsWith('image/')
                              )
                              if (files.length > 0) {
                                setVariantForm(prev => ({ ...prev, image: files[0] }))
                              }
                            }}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <p className="text-gray-400 text-xs">اسحب وأفلت الصورة هنا أو</p>
                              <label className="bg-[#4A5568] hover:bg-[#5A6478] text-white px-2 py-1 text-xs border border-gray-600 transition-colors cursor-pointer rounded">
                                اختر الصورة
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => setVariantForm(prev => ({ ...prev, image: e.target.files?.[0] || null }))}
                                  className="hidden"
                                />
                              </label>
                              {variantForm.image && (
                                <div className="mt-2 flex flex-col items-center gap-1">
                                  <img 
                                    src={URL.createObjectURL(variantForm.image)} 
                                    alt="معاينة الصورة"
                                    className="w-12 h-12 object-cover rounded border border-gray-600"
                                  />
                                  <p className="text-green-400 text-xs">
                                    {variantForm.image.name}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setVariantForm(prev => ({ ...prev, image: null }))}
                                    className="text-red-400 hover:text-red-300 text-xs"
                                  >
                                    إزالة الصورة
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end">
                          <button
                            onClick={handleVariantSubmit}
                            disabled={!variantForm.elementId || variantForm.quantity <= 0}
                            className={`px-3 py-1.5 rounded transition-colors text-xs ${
                              !variantForm.elementId || variantForm.quantity <= 0
                                ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            + إدراج
                          </button>
                        </div>

                        {/* Added Variants Display */}
                        {locationVariants.filter(v => v.locationId === selectedLocation.id).length > 0 && (
                          <div className="pt-3 border-t border-[#4A5568] pb-4">
                            <h5 className="text-white font-medium mb-2 text-right text-xs">الأشكال المضافة:</h5>
                            <div className="space-y-2">
                              {locationVariants
                                .filter(v => v.locationId === selectedLocation.id)
                                .map((variant) => (
                                  <div key={variant.id} className="bg-[#2B3441] rounded p-2 flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => handleVariantDelete(variant.id)}
                                        className="text-red-400 hover:text-red-300 transition-colors"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => handleVariantEdit(variant)}
                                        className="text-blue-400 hover:text-blue-300 transition-colors"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 text-right">
                                      <div className="text-white text-xs">
                                        <div className="font-medium">{variant.elementName}</div>
                                        <div className="text-xs text-gray-400">
                                          {variant.elementType === 'color' ? 'لون المنتج' : 'شكل وصف'} | {variant.barcode}
                                        </div>
                                      </div>
                                      
                                      <div className="bg-blue-600/20 text-blue-300 px-1.5 py-0.5 rounded text-xs font-medium">
                                        {variant.quantity}
                                      </div>
                                      
                                      {variant.image && (
                                        <img 
                                          src={variant.image} 
                                          alt={variant.elementName}
                                          className="w-6 h-6 rounded object-cover"
                                        />
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        )

      case 'المخزون':
        return (
          <div className="space-y-4 flex flex-col h-full">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5DADE2]"></div>
              </div>
            ) : (
              <>
                {/* Locations and Minimum Stock Thresholds */}
                <div className="flex-1">
                  <label className="block text-white text-sm font-medium mb-4 text-right">
                    إدارة المخزون لكل موقع:
                  </label>
                  
                  {locationThresholds.length > 0 ? (
                    <div className="space-y-4 pb-8">
                      {locationThresholds.map((threshold) => (
                        <div key={threshold.locationId} className="bg-[#2B3441] border border-[#4A5568] rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                threshold.locationType === 'branch' 
                                  ? 'bg-blue-600/20 text-blue-400' 
                                  : 'bg-green-600/20 text-green-400'
                              }`}>
                                {threshold.locationType === 'branch' ? (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                )}
                              </div>
                              <div>
                                <h3 className="text-white font-medium">{threshold.locationName}</h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  threshold.locationType === 'branch'
                                    ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30'
                                    : 'bg-green-600/20 text-green-300 border border-green-600/30'
                                }`}>
                                  {threshold.locationType === 'branch' ? 'فرع' : 'مخزن'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Two input fields side by side with action buttons */}
                          <div className="grid grid-cols-2 gap-4">
                            {/* Quantity field */}
                            <div>
                              <label className="block text-gray-300 text-sm font-medium mb-2 text-right">
                                إضافة الكمية
                              </label>
                              <input
                                type="number"
                                value={threshold.quantity}
                                onChange={(e) => handleThresholdChange(threshold.locationId, 'quantity', parseInt(e.target.value) || 0)}
                                placeholder="0"
                                min="0"
                                className="w-full px-3 py-2 bg-[#374151] border border-[#4A5568] rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#5DADE2] focus:border-[#5DADE2] text-right text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                            
                            {/* Low stock threshold field */}
                            <div>
                              <label className="block text-gray-300 text-sm font-medium mb-2 text-right">
                                منخفض عند
                              </label>
                              <input
                                type="number"
                                value={threshold.minStockThreshold}
                                onChange={(e) => handleThresholdChange(threshold.locationId, 'minStockThreshold', parseInt(e.target.value) || 0)}
                                placeholder="0"
                                min="0"
                                className="w-full px-3 py-2 bg-[#374151] border border-[#4A5568] rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#5DADE2] focus:border-[#5DADE2] text-right text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                          </div>
                          
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-sm">
                        لا توجد فروع أو مخازن متاحة. يرجى إضافة فروع أو مخازن أولاً من إدارة الفروع والمخازن.
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )

      case 'الإعدادات':
        return (
          <div className="space-y-4">
            {/* Product Status */}
            <div>
              <label className="block text-white text-sm font-medium mb-4 text-right">
                حالة المنتج
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleInputChange('isActive', !formData.isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    formData.isActive ? 'bg-[#3B82F6]' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.isActive ? 'translate-x-1' : 'translate-x-6'
                    }`}
                  />
                </button>
                <span className="text-gray-300 text-sm">
                  {formData.isActive ? 'نشط' : 'غير نشط'}
                </span>
              </div>
            </div>

            {/* Additional Settings can be added here */}
            <div className="pt-4 border-t border-gray-600">
              <p className="text-gray-400 text-sm">
                إعدادات إضافية للمنتج يمكن إضافتها هنا
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar - starts below header with exact dark theme colors */}
      <div className={`fixed top-12 right-0 h-[calc(100vh-3rem)] w-[600px] bg-[#3A4553] z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } shadow-2xl flex flex-col`}>
        {/* Header - dark gray header matching design */}
        <div className="bg-[#3A4553] px-4 py-3 flex items-center justify-start border-b border-[#4A5568]">
          <h2 className="text-white text-lg font-medium flex-1 text-right">
            {isEditMode ? 'تحرير المنتج' : 'منتج جديد'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors ml-4"
          >
            <ArrowRightIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation Bar - matching reference design */}
        <div className="bg-[#3A4553] border-b border-[#4A5568]">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-[#5DADE2]' // Light blue text for selected
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {tab}
                {/* Light blue underline for active tab */}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5DADE2]"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 flex-1 overflow-y-auto scrollbar-hide min-h-0 pb-24">
          {renderTabContent()}
        </div>

        {/* Action Buttons - exact design match */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#3A4553] border-t border-[#4A5568]">
          <div className="flex gap-2">
            {/* Clear Fields Button - matching reference design */}
            <button
              onClick={handleClearFields}
              className="bg-transparent hover:bg-[#EF4444]/10 text-[#EF4444] px-4 py-2 rounded-md border border-[#EF4444] hover:border-[#DC2626] hover:text-[#DC2626] text-sm font-medium transition-all duration-200"
            >
              تصفية الخلايا
            </button>
            
            <div className="flex-1"></div>
            
            {/* Cancel and Save buttons - exact styling */}
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="bg-transparent hover:bg-gray-600/10 text-gray-300 border border-gray-600 hover:border-gray-500 px-4 py-2 text-sm font-medium transition-all duration-200 min-w-[80px] flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 min-w-[80px] flex items-center gap-2 ${
                  isSaving
                    ? 'bg-gray-600/50 text-gray-400 border border-gray-600 cursor-not-allowed'
                    : 'bg-transparent hover:bg-gray-600/10 text-gray-300 border border-gray-600 hover:border-gray-500'
                }`}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                    {isEditMode ? 'جاري التحديث...' : 'جاري الحفظ...'}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {isEditMode ? 'تحديث' : 'حفظ'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
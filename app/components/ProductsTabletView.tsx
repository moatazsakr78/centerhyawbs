'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase/client'
import ResizableTable from './tables/ResizableTable'
import Sidebar from './layout/Sidebar'
import TopHeader from './layout/TopHeader'
import CategorySidebar from './CategorySidebar'
import ProductSidebar from './ProductSidebar'
import CategoriesTreeView from './CategoriesTreeView'
import ColorAssignmentModal from './ColorAssignmentModal'
import ColorChangeModal from './ColorChangeModal'
import ColumnsControlModal from './ColumnsControlModal'
import { useBranches, Branch, ProductVariant } from '../lib/hooks/useBranches'
import { useProducts, Product } from '../lib/hooks/useProducts'
import {
  ArrowPathIcon,
  FolderPlusIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  TagIcon,
  ArrowsUpDownIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TableCellsIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  Squares2X2Icon,
  ListBulletIcon,
  EyeIcon,
  XMarkIcon,
  Bars3Icon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'

// Database category interface
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

interface ProductsTabletViewProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedGroup: string
  setSelectedGroup: (group: string) => void
  isSidebarOpen: boolean
  setIsSidebarOpen: (open: boolean) => void
}

export default function ProductsTabletView({ 
  searchQuery, 
  setSearchQuery, 
  selectedGroup, 
  setSelectedGroup,
  isSidebarOpen,
  setIsSidebarOpen
}: ProductsTabletViewProps) {
  const [isCategorySidebarOpen, setIsCategorySidebarOpen] = useState(false)
  const [isProductSidebarOpen, setIsProductSidebarOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [editCategory, setEditCategory] = useState<Category | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showDeleteProductConfirm, setShowDeleteProductConfirm] = useState(false)
  const [isDeletingProduct, setIsDeletingProduct] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [showProductModal, setShowProductModal] = useState(false)
  const [modalProduct, setModalProduct] = useState<Product | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [showColorAssignmentModal, setShowColorAssignmentModal] = useState(false)
  const [showColorChangeModal, setShowColorChangeModal] = useState(false)
  const [showColumnsModal, setShowColumnsModal] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<{[key: string]: boolean}>({})
  const [showBranchesDropdown, setShowBranchesDropdown] = useState(false)
  const [selectedBranches, setSelectedBranches] = useState<{[key: string]: boolean}>({})
  const [isCategoriesHidden, setIsCategoriesHidden] = useState(false)

  // Ref for scrollable toolbar
  const toolbarRef = useRef<HTMLDivElement>(null)

  // Get products and branches data
  const { products, branches, isLoading, error, fetchProducts, createProduct, updateProduct, deleteProduct } = useProducts()
  const { fetchBranchInventory, fetchProductVariants } = useBranches()

  // Initialize selected branches when branches data loads
  useEffect(() => {
    if (branches.length > 0 && Object.keys(selectedBranches).length === 0) {
      const initialBranches: {[key: string]: boolean} = {}
      branches.forEach(branch => {
        initialBranches[branch.id] = true
      })
      setSelectedBranches(initialBranches)
    }
  }, [branches, selectedBranches])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.branches-dropdown')) {
        setShowBranchesDropdown(false)
      }
    }

    if (showBranchesDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showBranchesDropdown])

  // Handle branches selection
  const handleBranchToggle = (branchId: string) => {
    setSelectedBranches(prev => ({
      ...prev,
      [branchId]: !prev[branchId]
    }))
  }

  // Initialize visible columns state
  useEffect(() => {
    const allColumns = ['index', 'name', 'group', 'totalQuantity', 'buyPrice', 'sellPrice', 'wholeSalePrice', 'sellPrice1', 'sellPrice2', 'sellPrice3', 'sellPrice4', 'location', 'barcode', 'activity']
    
    branches.forEach(branch => {
      allColumns.push(`branch_${branch.id}`, `min_stock_${branch.id}`, `variants_${branch.id}`)
    })
    
    const initialVisible: {[key: string]: boolean} = {}
    allColumns.forEach(colId => {
      initialVisible[colId] = true
    })
    
    setVisibleColumns(initialVisible)
  }, [branches])

  // Generate dynamic table columns based on branches
  const dynamicTableColumns = useMemo(() => {
    const baseColumns = [
      { 
        id: 'index', 
        header: '#', 
        accessor: '#', 
        width: 60,
        render: (value: any, item: any, index: number) => (
          <span className="text-gray-400 font-medium">{index + 1}</span>
        )
      },
      { 
        id: 'name', 
        header: 'اسم المنتج', 
        accessor: 'name', 
        width: 200,
        render: (value: string) => <span className="text-white font-medium">{value}</span>
      },
      { 
        id: 'group', 
        header: 'المجموعة', 
        accessor: 'category', 
        width: 100,
        render: (value: any) => <span className="text-gray-300">{value?.name || 'غير محدد'}</span>
      },
      { 
        id: 'totalQuantity', 
        header: 'كمية كلية', 
        accessor: 'totalQuantity', 
        width: 120,
        render: (value: number) => (
          <span className="text-blue-400 font-medium">قطعة {value}</span>
        )
      },
      { 
        id: 'buyPrice', 
        header: 'سعر الشراء', 
        accessor: 'cost_price', 
        width: 120,
        render: (value: number) => <span className="text-white">{(value || 0).toFixed(2)}</span>
      },
      { 
        id: 'sellPrice', 
        header: 'سعر البيع', 
        accessor: 'price', 
        width: 120,
        render: (value: number) => <span className="text-white">{(value || 0).toFixed(2)}</span>
      },
      { 
        id: 'wholeSalePrice', 
        header: 'سعر الجملة', 
        accessor: 'wholesale_price', 
        width: 120,
        render: (value: number) => <span className="text-white">{(value || 0).toFixed(2)}</span>
      },
      { 
        id: 'sellPrice1', 
        header: 'سعر 1', 
        accessor: 'price1', 
        width: 100,
        render: (value: number) => <span className="text-white">{(value || 0).toFixed(2)}</span>
      },
      { 
        id: 'sellPrice2', 
        header: 'سعر 2', 
        accessor: 'price2', 
        width: 100,
        render: (value: number) => <span className="text-white">{(value || 0).toFixed(2)}</span>
      },
      { 
        id: 'sellPrice3', 
        header: 'سعر 3', 
        accessor: 'price3', 
        width: 100,
        render: (value: number) => <span className="text-white">{(value || 0).toFixed(2)}</span>
      },
      { 
        id: 'sellPrice4', 
        header: 'سعر 4', 
        accessor: 'price4', 
        width: 100,
        render: (value: number) => <span className="text-white">{(value || 0).toFixed(2)}</span>
      },
      { 
        id: 'location', 
        header: 'الموقع', 
        accessor: 'location', 
        width: 100,
        render: (value: string) => <span className="text-gray-300">{value || '-'}</span>
      },
      { 
        id: 'barcode', 
        header: 'الباركود', 
        accessor: 'barcode', 
        width: 150,
        render: (value: string) => <span className="text-gray-300 font-mono text-sm">{value || '-'}</span>
      }
    ]

    const branchColumns = branches
      .filter(branch => selectedBranches[branch.id])
      .map(branch => ({
        id: `branch_${branch.id}`,
        header: branch.name,
        accessor: `branch_${branch.id}`,
        width: 120,
        render: (value: any, item: Product) => {
          const inventoryData = item.inventoryData?.[branch.id]
          const quantity = inventoryData?.quantity || 0
          return (
            <span className="text-blue-400 font-medium">قطعة {quantity}</span>
          )
        }
      }))

    const minStockColumns = branches
      .filter(branch => selectedBranches[branch.id])
      .map(branch => ({
        id: `min_stock_${branch.id}`,
        header: `منخفض - ${branch.name}`,
        accessor: `min_stock_${branch.id}`,
        width: 150,
        render: (value: any, item: Product) => {
          const inventoryData = item.inventoryData?.[branch.id]
          const minStock = inventoryData?.min_stock || 0
          const quantity = inventoryData?.quantity || 0
          
          const isLowStock = quantity <= minStock && minStock > 0
          
          return (
            <span className={`font-medium ${isLowStock ? 'text-red-400' : 'text-yellow-400'}`}>
              {minStock} قطعة
            </span>
          )
        }
      }))

    const variantColumns = branches
      .filter(branch => selectedBranches[branch.id])
      .map(branch => ({
        id: `variants_${branch.id}`,
        header: `الأشكال والألوان - ${branch.name}`,
        accessor: `variants_${branch.id}`,
        width: 250,
        render: (value: any, item: Product) => {
          const variants = item.variantsData?.[branch.id] || []
          const colorVariants = variants.filter(v => v.variant_type === 'color')
          const shapeVariants = variants.filter(v => v.variant_type === 'shape')
          
          const getVariantColor = (variant: any) => {
            if (variant.variant_type === 'color') {
              const productColor = item.productColors?.find(c => c.name === variant.name)
              if (productColor?.color) {
                return productColor.color
              }
              
              try {
                if (variant.value && variant.value.startsWith('{')) {
                  const valueData = JSON.parse(variant.value)
                  if (valueData.color) {
                    return valueData.color
                  }
                }
              } catch (e) {
                // If parsing fails, use default
              }
            }
            return '#6B7280'
          }

          const getTextColor = (bgColor: string) => {
            const hex = bgColor.replace('#', '')
            const r = parseInt(hex.substr(0, 2), 16)
            const g = parseInt(hex.substr(2, 2), 16)
            const b = parseInt(hex.substr(4, 2), 16)
            
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
            
            return luminance > 0.5 ? '#000000' : '#FFFFFF'
          }

          const totalInventoryQuantity = item.inventoryData?.[branch.id]?.quantity || 0
          const assignedQuantity = [...colorVariants, ...shapeVariants].reduce((sum, variant) => sum + variant.quantity, 0)
          const unassignedQuantity = totalInventoryQuantity - assignedQuantity

          const specifiedVariants = [...colorVariants, ...shapeVariants].filter(v => v.name !== 'غير محدد')
          const unspecifiedVariants = [...colorVariants, ...shapeVariants].filter(v => v.name === 'غير محدد')
          const totalUnspecifiedQuantity = unspecifiedVariants.reduce((sum, v) => sum + v.quantity, 0) + unassignedQuantity

          return (
            <div className="flex flex-wrap gap-1">
              {specifiedVariants.map((variant, index) => {
                const bgColor = getVariantColor(variant)
                const textColor = getTextColor(bgColor)
                
                return (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border"
                    style={{
                      backgroundColor: bgColor,
                      color: textColor,
                      borderColor: bgColor === '#6B7280' ? '#6B7280' : bgColor
                    }}
                  >
                    {variant.name} ({variant.quantity})
                  </span>
                )
              })}
              
              {totalUnspecifiedQuantity > 0 && (
                <span
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white bg-gray-600 border border-gray-600"
                >
                  غير محدد الكلي ({totalUnspecifiedQuantity})
                </span>
              )}
            </div>
          )
        }
      }))

    const activityColumn = { 
      id: 'activity', 
      header: 'نشيط', 
      accessor: 'is_active', 
      width: 80,
      render: (value: boolean) => (
        <div className="flex justify-center">
          <div className={`w-3 h-3 rounded-full ${value ? 'bg-green-500' : 'bg-red-500'}`}></div>
        </div>
      )
    }

    const selectedBranchesCount = Object.values(selectedBranches).filter(Boolean).length

    const filteredBaseColumns = baseColumns.filter(col => {
      if (col.id === 'totalQuantity' && selectedBranchesCount === 1) {
        return false
      }
      return true
    })

    const allColumns = [...filteredBaseColumns, ...branchColumns, ...minStockColumns, ...variantColumns, activityColumn]
    
    return allColumns.filter(col => visibleColumns[col.id] !== false)
  }, [branches, visibleColumns, selectedBranches])

  // Refresh products data
  const handleRefresh = () => {
    fetchProducts()
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const toggleCategorySidebar = () => {
    setIsCategorySidebarOpen(!isCategorySidebarOpen)
    if (!isCategorySidebarOpen) {
      setIsEditing(false)
      setEditCategory(null)
    }
  }

  const handleEditCategory = (category: Category) => {
    setEditCategory(category)
    setIsEditing(true)
    setIsCategorySidebarOpen(true)
  }

  const handleCategorySelect = (category: Category | null) => {
    setSelectedCategory(category)
  }

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return
    
    if (selectedCategory.name === 'منتجات') {
      alert('لا يمكن حذف المجموعة الرئيسية "منتجات"')
      return
    }
    
    try {
      const { data: subcategories, error: subcatError } = await supabase
        .from('categories')
        .select('id')
        .eq('parent_id', selectedCategory.id)
        .eq('is_active', true)
      
      if (subcatError) throw subcatError
      
      if (subcategories && subcategories.length > 0) {
        alert('لا يمكن حذف المجموعة لأنها تحتوي على مجموعات فرعية')
        return
      }
      
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id')
        .eq('category_id', selectedCategory.id)
        .eq('is_active', true)
      
      if (prodError) throw prodError
      
      if (products && products.length > 0) {
        alert('لا يمكن حذف المجموعة لأنها تحتوي على منتجات')
        return
      }
      
      setShowDeleteConfirm(true)
      
    } catch (error) {
      console.error('Error checking category dependencies:', error)
      alert('حدث خطأ أثناء التحقق من المجموعة')
    }
  }

  const confirmDeleteCategory = async () => {
    if (!selectedCategory) return
    
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', selectedCategory.id)
      
      if (error) throw error
      
      setSelectedCategory(null)
      setShowDeleteConfirm(false)
      
      await fetchCategories()
      
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('حدث خطأ أثناء حذف المجموعة')
    } finally {
      setIsDeleting(false)
    }
  }

  const cancelDeleteCategory = () => {
    setShowDeleteConfirm(false)
  }

  const toggleProductSidebar = () => {
    setIsProductSidebarOpen(!isProductSidebarOpen)
    if (!isProductSidebarOpen) {
      setSelectedProduct(null)
    }
  }

  const handleEditProduct = () => {
    if (selectedProduct) {
      setIsProductSidebarOpen(true)
    }
  }

  const handleDeleteProduct = () => {
    if (selectedProduct) {
      setShowDeleteProductConfirm(true)
    }
  }

  const confirmDeleteProduct = async () => {
    if (!selectedProduct) return
    
    setIsDeletingProduct(true)
    try {
      await deleteProduct(selectedProduct.id)
      
      setSelectedProduct(null)
      setShowDeleteProductConfirm(false)
      
    } catch (error) {
      console.error('Error deleting product:', error)
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء حذف المنتج'
      alert(errorMessage)
    } finally {
      setIsDeletingProduct(false)
    }
  }

  const cancelDeleteProduct = () => {
    setShowDeleteProductConfirm(false)
  }

  const handleColumnsChange = (updatedColumns: {id: string, header: string, visible: boolean}[]) => {
    const newVisibleColumns: {[key: string]: boolean} = {}
    updatedColumns.forEach(col => {
      newVisibleColumns[col.id] = col.visible
    })
    setVisibleColumns(newVisibleColumns)
  }

  const getAllColumns = useMemo(() => {
    const baseColumns = [
      { id: 'index', header: '#' },
      { id: 'name', header: 'اسم المنتج' },
      { id: 'group', header: 'المجموعة' },
      { id: 'totalQuantity', header: 'كمية كلية' },
      { id: 'buyPrice', header: 'سعر الشراء' },
      { id: 'sellPrice', header: 'سعر البيع' },
      { id: 'wholeSalePrice', header: 'سعر الجملة' },
      { id: 'sellPrice1', header: 'سعر 1' },
      { id: 'sellPrice2', header: 'سعر 2' },
      { id: 'sellPrice3', header: 'سعر 3' },
      { id: 'sellPrice4', header: 'سعر 4' },
      { id: 'location', header: 'الموقع' },
      { id: 'barcode', header: 'الباركود' },
      { id: 'activity', header: 'نشيط' }
    ]

    const branchColumns = branches.map(branch => ([
      { id: `branch_${branch.id}`, header: branch.name },
      { id: `min_stock_${branch.id}`, header: `منخفض - ${branch.name}` },
      { id: `variants_${branch.id}`, header: `الأشكال والألوان - ${branch.name}` }
    ])).flat()

    const allColumns = [...baseColumns, ...branchColumns]
    
    return allColumns.map(col => ({
      id: col.id,
      header: col.header,
      visible: visibleColumns[col.id] !== false
    }))
  }, [branches, visibleColumns])

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const filteredProducts = products.filter(product =>
    product.name.includes(searchQuery) ||
    (product.barcode && product.barcode.includes(searchQuery))
  )

  // Toggle categories visibility
  const toggleCategoriesVisibility = () => {
    setIsCategoriesHidden(!isCategoriesHidden)
  }

  return (
    <div className="h-screen bg-[#2B3544] overflow-hidden">
      {/* Top Header */}
      <TopHeader onMenuClick={toggleSidebar} isMenuOpen={isSidebarOpen} />
      
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      
      {/* Main Content Container */}
      <div className="h-full pt-12 overflow-hidden flex flex-col">
        
        {/* Top Action Buttons Toolbar - Tablet Optimized with horizontal scrolling */}
        <div className="bg-[#374151] border-b border-gray-600 px-2 py-2 w-full">
          <div 
            ref={toolbarRef}
            className="flex items-center gap-1 overflow-x-auto scrollbar-hide"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <button 
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white cursor-pointer whitespace-nowrap bg-[#2B3544] hover:bg-[#434E61] rounded transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span className="text-sm">تحديث</span>
            </button>

            <button 
              onClick={toggleCategorySidebar}
              className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white cursor-pointer whitespace-nowrap bg-[#2B3544] hover:bg-[#434E61] rounded transition-colors"
            >
              <FolderPlusIcon className="h-4 w-4" />
              <span className="text-sm">مجموعة جديدة</span>
            </button>

            <button 
              onClick={() => selectedCategory && handleEditCategory(selectedCategory)}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer whitespace-nowrap rounded transition-colors ${
                selectedCategory && selectedCategory.name !== 'منتجات'
                  ? 'text-gray-300 hover:text-white bg-[#2B3544] hover:bg-[#434E61]' 
                  : 'text-gray-500 cursor-not-allowed bg-gray-700/50'
              }`}
              disabled={!selectedCategory || selectedCategory.name === 'منتجات'}
            >
              <PencilSquareIcon className="h-4 w-4" />
              <span className="text-sm">تحرير المجموعة</span>
            </button>

            <button 
              onClick={handleDeleteCategory}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer whitespace-nowrap rounded transition-colors ${
                selectedCategory && selectedCategory.name !== 'منتجات'
                  ? 'text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/30' 
                  : 'text-gray-500 cursor-not-allowed bg-gray-700/50'
              }`}
              disabled={!selectedCategory || selectedCategory.name === 'منتجات'}
            >
              <TrashIcon className="h-4 w-4" />
              <span className="text-sm">حذف المجموعة</span>
            </button>

            <button 
              onClick={toggleProductSidebar}
              className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white cursor-pointer whitespace-nowrap bg-[#2B3544] hover:bg-[#434E61] rounded transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="text-sm">منتج جديد</span>
            </button>

            <button 
              onClick={() => selectedProduct && handleEditProduct()}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer whitespace-nowrap rounded transition-colors ${
                selectedProduct
                  ? 'text-gray-300 hover:text-white bg-[#2B3544] hover:bg-[#434E61]' 
                  : 'text-gray-500 cursor-not-allowed bg-gray-700/50'
              }`}
              disabled={!selectedProduct}
            >
              <PencilSquareIcon className="h-4 w-4" />
              <span className="text-sm">تحرير المنتج</span>
            </button>

            <button 
              onClick={handleDeleteProduct}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer whitespace-nowrap rounded transition-colors ${
                selectedProduct
                  ? 'text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/30' 
                  : 'text-gray-500 cursor-not-allowed bg-gray-700/50'
              }`}
              disabled={!selectedProduct}
            >
              <TrashIcon className="h-4 w-4" />
              <span className="text-sm">حذف المنتج</span>
            </button>

            <button className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white cursor-pointer whitespace-nowrap bg-[#2B3544] hover:bg-[#434E61] rounded transition-colors">
              <PrinterIcon className="h-4 w-4" />
              <span className="text-sm">طباعة</span>
            </button>

            <button className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white cursor-pointer whitespace-nowrap bg-[#2B3544] hover:bg-[#434E61] rounded transition-colors">
              <DocumentArrowDownIcon className="h-4 w-4" />
              <span className="text-sm">حفظ كـ PDF</span>
            </button>

            <button className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white cursor-pointer whitespace-nowrap bg-[#2B3544] hover:bg-[#434E61] rounded transition-colors">
              <TagIcon className="h-4 w-4" />
              <span className="text-sm">بطاقات الأسعار</span>
            </button>

            <button className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white cursor-pointer whitespace-nowrap bg-[#2B3544] hover:bg-[#434E61] rounded transition-colors">
              <ArrowsUpDownIcon className="h-4 w-4" />
              <span className="text-sm">ترتيب</span>
            </button>

            <button className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white cursor-pointer whitespace-nowrap bg-[#2B3544] hover:bg-[#434E61] rounded transition-colors">
              <ArrowDownTrayIcon className="h-4 w-4" />
              <span className="text-sm">استيراد</span>
            </button>

            <button className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white cursor-pointer whitespace-nowrap bg-[#2B3544] hover:bg-[#434E61] rounded transition-colors">
              <ArrowUpTrayIcon className="h-4 w-4" />
              <span className="text-sm">تصدير</span>
            </button>

            <button 
              onClick={() => setShowColumnsModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white cursor-pointer whitespace-nowrap bg-[#2B3544] hover:bg-[#434E61] rounded transition-colors"
            >
              <TableCellsIcon className="h-4 w-4" />
              <span className="text-sm">الأعمدة</span>
            </button>

            <button 
              onClick={() => selectedProduct && setShowColorAssignmentModal(true)}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer whitespace-nowrap rounded transition-colors ${
                selectedProduct
                  ? 'text-gray-300 hover:text-white bg-[#2B3544] hover:bg-[#434E61]' 
                  : 'text-gray-500 cursor-not-allowed bg-gray-700/50'
              }`}
              disabled={!selectedProduct}
            >
              <TagIcon className="h-4 w-4" />
              <span className="text-sm">تحديد اللون</span>
            </button>

            <button 
              onClick={() => selectedProduct && setShowColorChangeModal(true)}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer whitespace-nowrap rounded transition-colors ${
                selectedProduct
                  ? 'text-orange-300 hover:text-orange-100 bg-orange-900/20 hover:bg-orange-900/30' 
                  : 'text-gray-500 cursor-not-allowed bg-gray-700/50'
              }`}
              disabled={!selectedProduct}
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span className="text-sm">تغيير اللون</span>
            </button>

          </div>
        </div>

        {/* Content Area with Sidebar and Main Content */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Product Groups Tree Sidebar - Can be hidden/shown */}
          {!isCategoriesHidden && (
            <CategoriesTreeView 
              onCategorySelect={handleCategorySelect}
              selectedCategoryId={selectedCategory?.id}
              showActionButtons={true}
            />
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Second Toolbar - Search and Controls */}
            <div className="bg-[#374151] border-b border-gray-600 px-6 py-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                {/* Left Side - Search and Controls */}
                <div className="flex items-center gap-4">
                  {/* Group Filter Dropdown with Categories Toggle Button */}
                  <div className="relative branches-dropdown flex items-center gap-2">
                    <button 
                      onClick={() => setShowBranchesDropdown(!showBranchesDropdown)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-sm font-medium transition-colors"
                    >
                      <span>{selectedGroup}</span>
                      <ChevronDownIcon className={`h-4 w-4 transition-transform ${showBranchesDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Categories Toggle Button - Right next to the dropdown button */}
                    <button 
                      onClick={toggleCategoriesVisibility}
                      className="p-2 text-gray-300 hover:text-white hover:bg-gray-600/30 rounded-md transition-colors"
                      title={isCategoriesHidden ? 'إظهار الفئات' : 'إخفاء الفئات'}
                    >
                      {isCategoriesHidden ? (
                        <Bars3Icon className="h-5 w-5" />
                      ) : (
                        <EyeSlashIcon className="h-5 w-5" />
                      )}
                    </button>
                    
                    {/* Branches Dropdown */}
                    {showBranchesDropdown && (
                      <div className="absolute top-full right-0 mt-2 w-72 bg-[#2B3544] border-2 border-[#4A5568] rounded-xl shadow-2xl z-[9999] overflow-hidden backdrop-blur-sm">
                        <div className="p-3">
                          <div className="space-y-2">
                            {branches.map(branch => (
                              <label
                                key={branch.id}
                                className="flex items-center gap-3 p-3 bg-[#374151] hover:bg-[#434E61] rounded-lg cursor-pointer transition-colors border border-gray-600/30"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedBranches[branch.id] || false}
                                  onChange={() => handleBranchToggle(branch.id)}
                                  className="w-5 h-5 text-blue-600 bg-[#2B3544] border-2 border-blue-500 rounded focus:ring-blue-500 focus:ring-2 accent-blue-600"
                                />
                                <span className="text-white text-base font-medium flex-1 text-right">
                                  {branch.name}
                                </span>
                                <span className="text-xs text-blue-300 bg-blue-900/30 px-2 py-1 rounded border border-blue-600/30">
                                  {branch.name.includes('مخزن') || branch.name.includes('شاكوس') ? 'مخزن' : 'فرع'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                        
                        <div className="px-4 py-2 border-t border-[#4A5568] bg-[#374151]">
                          <div className="text-center">
                            <span className="text-blue-400 font-medium text-sm">
                              {Object.values(selectedBranches).filter(Boolean).length} من أصل {branches.length} محدد
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* View Toggle */}
                  <div className="flex bg-[#2B3544] rounded-md overflow-hidden">
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={`p-2 transition-colors ${
                        viewMode === 'grid' 
                          ? 'bg-blue-600 text-white' 
                          : 'text-gray-400 hover:text-white hover:bg-gray-600'
                      }`}
                    >
                      <Squares2X2Icon className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => setViewMode('table')}
                      className={`p-2 transition-colors ${
                        viewMode === 'table' 
                          ? 'bg-blue-600 text-white' 
                          : 'text-gray-400 hover:text-white hover:bg-gray-600'
                      }`}
                    >
                      <ListBulletIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="اسم المنتج..."
                      className="w-80 pl-4 pr-10 py-2 bg-[#2B3544] border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#5DADE2] focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                {/* Right Side - Additional controls */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">عرض {filteredProducts.length} من أصل {products.length} منتج</span>
                </div>
              </div>
            </div>

            {/* Products Content Container */}
            <div className="flex-1 overflow-hidden bg-[#2B3544]">
              {viewMode === 'table' ? (
                <ResizableTable
                  className="h-full w-full"
                  columns={dynamicTableColumns}
                  data={filteredProducts}
                  selectedRowId={selectedProduct?.id || null}
                  onRowClick={(product, index) => {
                    if (selectedProduct?.id === product.id) {
                      setSelectedProduct(null)
                    } else {
                      setSelectedProduct(product as Product)
                    }
                  }}
                />
              ) : (
                // Grid View
                <div className="h-full overflow-y-auto scrollbar-hide p-4">
                  <div className="grid grid-cols-6 gap-4">
                    {filteredProducts.map((product, index) => (
                      <div
                        key={product.id}
                        onClick={() => {
                          if (selectedProduct?.id === product.id) {
                            setSelectedProduct(null)
                          } else {
                            setSelectedProduct(product as Product)
                          }
                        }}
                        className={`bg-[#374151] rounded-lg p-3 cursor-pointer transition-all duration-200 border-2 relative ${
                          selectedProduct?.id === product.id
                            ? 'border-blue-500 bg-[#434E61]'
                            : 'border-transparent hover:border-gray-500 hover:bg-[#434E61]'
                        }`}
                      >
                        {/* Hover Button */}
                        <div className="absolute top-2 right-2 group/button">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setModalProduct(product as Product)
                              const firstImage = product.allImages?.[0] || product.main_image_url || null
                              setSelectedImage(firstImage)
                              setShowProductModal(true)
                            }}
                            className="bg-black/70 hover:bg-black/90 text-white p-2 rounded-full opacity-0 group-hover/button:opacity-100 transition-all duration-200 z-10"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        </div>
                        {/* Product Image */}
                        <div className="w-full h-40 bg-[#2B3544] rounded-md mb-3 flex items-center justify-center overflow-hidden">
                          {product.main_image_url ? (
                            <img
                              src={product.main_image_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                target.nextElementSibling?.classList.remove('hidden')
                              }}
                            />
                          ) : null}
                          <div className={`w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center ${product.main_image_url ? 'hidden' : ''}`}>
                            <span className="text-2xl">😊</span>
                          </div>
                        </div>

                        {/* Product Name */}
                        <h3 className="text-white font-medium text-sm text-center mb-2 line-clamp-2">
                          {product.name}
                        </h3>

                        {/* Product Details */}
                        <div className="space-y-1 text-xs">
                          {(product.rating || 0) > 0 && (
                            <div className="flex justify-center items-center gap-1 mb-1">
                              <span className="text-yellow-400 text-xs">⭐</span>
                              <span className="text-yellow-400 font-medium text-xs">
                                {(product.rating || 0).toFixed(1)}
                              </span>
                              <span className="text-gray-500 text-xs">
                                ({product.rating_count || 0})
                              </span>
                            </div>
                          )}
                          
                          <div className="flex justify-center mb-2 flex-col items-center">
                            {product.isDiscounted ? (
                              <>
                                <div className="flex items-center gap-1">
                                  <span className="text-blue-400 font-medium text-sm">
                                    {(product.finalPrice || 0).toFixed(2)}
                                  </span>
                                  <span className="bg-red-600 text-white text-xs px-1 py-0.5 rounded">
                                    {product.discountLabel}
                                  </span>
                                </div>
                                <span className="text-gray-500 line-through text-xs">
                                  {(product.price || 0).toFixed(2)}
                                </span>
                              </>
                            ) : (
                              <span className="text-blue-400 font-medium text-sm">
                                {(product.price || 0).toFixed(2)}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-blue-400 font-medium">
                              {(product.inventoryData && Object.values(product.inventoryData).reduce((sum: number, inv: any) => sum + (inv?.quantity || 0), 0)) || 0}
                            </span>
                            <span className="text-gray-400">الكمية الإجمالية</span>
                          </div>
                          
                          {product.inventoryData && Object.entries(product.inventoryData).map(([locationId, inventory]: [string, any]) => {
                            const branch = branches.find(b => b.id === locationId)
                            const locationName = branch?.name || `موقع ${locationId.slice(0, 8)}`
                            
                            return (
                              <div key={locationId} className="flex justify-between items-center">
                                <span className="text-white">
                                  {inventory?.quantity || 0}
                                </span>
                                <span className="text-gray-400 truncate">
                                  {locationName}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Sidebar */}
      <CategorySidebar 
        isOpen={isCategorySidebarOpen} 
        onClose={() => {
          setIsCategorySidebarOpen(false)
          setIsEditing(false)
          setEditCategory(null)
        }}
        categories={categories}
        onCategoryCreated={fetchCategories}
        editCategory={editCategory}
        isEditing={isEditing}
        selectedCategory={selectedCategory}
      />

      {/* Product Sidebar */}
      <ProductSidebar 
        isOpen={isProductSidebarOpen} 
        onClose={() => {
          setIsProductSidebarOpen(false)
          setSelectedProduct(null)
        }}
        onProductCreated={() => {
          console.log('🔄 Refreshing products list after creation')
          fetchProducts()
          setIsProductSidebarOpen(false)
          setSelectedProduct(null)
        }}
        createProduct={createProduct}
        updateProduct={updateProduct}
        categories={categories}
        editProduct={selectedProduct}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={cancelDeleteCategory} />
          
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#3A4553] rounded-lg shadow-2xl border border-[#4A5568] max-w-md w-full">
              <div className="px-6 py-4 border-b border-[#4A5568]">
                <h3 className="text-lg font-medium text-white text-right">تأكيد الحذف</h3>
              </div>
              
              <div className="px-6 py-4">
                <p className="text-gray-300 text-right mb-2">
                  هل أنت متأكد من أنك تريد حذف هذه المجموعة؟
                </p>
                <p className="text-blue-400 font-medium text-right">
                  {selectedCategory?.name}
                </p>
              </div>
              
              <div className="px-6 py-4 border-t border-[#4A5568] flex gap-3 justify-end">
                <button
                  onClick={cancelDeleteCategory}
                  className="px-4 py-2 text-gray-300 hover:text-white bg-transparent hover:bg-gray-600/20 border border-gray-600 hover:border-gray-500 rounded transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmDeleteCategory}
                  disabled={isDeleting}
                  className={`px-4 py-2 rounded transition-colors ${
                    isDeleting
                      ? 'bg-red-600/50 text-red-300 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {isDeleting ? 'جاري الحذف...' : 'نعم، احذف'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Product Delete Confirmation Modal */}
      {showDeleteProductConfirm && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={cancelDeleteProduct} />
          
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#3A4553] rounded-lg shadow-2xl border border-[#4A5568] max-w-md w-full">
              <div className="px-6 py-4 border-b border-[#4A5568]">
                <h3 className="text-lg font-medium text-white text-right">تأكيد الحذف</h3>
              </div>
              
              <div className="px-6 py-4">
                <p className="text-gray-300 text-right mb-2">
                  هل أنت متأكد من أنك تريد حذف هذا المنتج؟
                </p>
                <p className="text-blue-400 font-medium text-right">
                  {selectedProduct?.name}
                </p>
                <p className="text-yellow-400 text-sm text-right mt-2">
                  تحذير: لا يمكن التراجع عن هذا الإجراء
                </p>
              </div>
              
              <div className="px-6 py-4 border-t border-[#4A5568] flex gap-3 justify-end">
                <button
                  onClick={cancelDeleteProduct}
                  className="px-4 py-2 text-gray-300 hover:text-white bg-transparent hover:bg-gray-600/20 border border-gray-600 hover:border-gray-500 rounded transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmDeleteProduct}
                  disabled={isDeletingProduct}
                  className={`px-4 py-2 rounded transition-colors ${
                    isDeletingProduct
                      ? 'bg-red-600/50 text-red-300 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {isDeletingProduct ? 'جاري الحذف...' : 'نعم، احذف'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Product Details Modal */}
      {showProductModal && modalProduct && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setShowProductModal(false)} />
          
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-[#2B3544] rounded-2xl shadow-2xl border border-[#4A5568] max-w-6xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide">
              <div className="sticky top-0 bg-[#2B3544] px-8 py-6 border-b border-[#4A5568] flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">📦</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">تفاصيل المنتج</h2>
                    <p className="text-blue-400 font-medium">{modalProduct.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProductModal(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-600/30 rounded-full transition-colors"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              {/* Modal Content - Simplified for tablet */}
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-[#374151] rounded-xl p-4 border border-[#4A5568]">
                      <h3 className="text-lg font-semibold text-white mb-3">معلومات المنتج</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">المجموعة</span>
                          <span className="text-white">{modalProduct.category?.name || 'غير محدد'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">سعر البيع</span>
                          <span className="text-green-400 font-bold">{(modalProduct.price || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">الكمية الإجمالية</span>
                          <span className="text-blue-400 font-bold">
                            {modalProduct.inventoryData && Object.values(modalProduct.inventoryData).reduce((sum: number, inv: any) => sum + (inv?.quantity || 0), 0) || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-[#374151] rounded-xl p-4 border border-[#4A5568]">
                      <h3 className="text-lg font-semibold text-white mb-3">صورة المنتج</h3>
                      <div className="w-full h-48 bg-[#2B3544] rounded-lg flex items-center justify-center overflow-hidden">
                        {modalProduct.main_image_url ? (
                          <img
                            src={modalProduct.main_image_url}
                            alt={modalProduct.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              target.nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                        ) : null}
                        <div className={`w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center ${modalProduct.main_image_url ? 'hidden' : ''}`}>
                          <span className="text-3xl">😊</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Color Assignment Modal */}
      {showColorAssignmentModal && selectedProduct && (
        <ColorAssignmentModal 
          product={selectedProduct}
          branches={branches}
          isOpen={showColorAssignmentModal}
          onClose={() => setShowColorAssignmentModal(false)}
          onAssignmentComplete={() => {
            fetchProducts()
            setShowColorAssignmentModal(false)
          }}
        />
      )}

      {/* Color Change Modal */}
      {showColorChangeModal && selectedProduct && (
        <ColorChangeModal 
          product={selectedProduct}
          branches={branches}
          isOpen={showColorChangeModal}
          onClose={() => setShowColorChangeModal(false)}
          onColorChangeComplete={() => {
            fetchProducts()
            setShowColorChangeModal(false)
          }}
        />
      )}

      {/* Columns Control Modal */}
      <ColumnsControlModal
        isOpen={showColumnsModal}
        onClose={() => setShowColumnsModal(false)}
        columns={getAllColumns}
        onColumnsChange={handleColumnsChange}
      />

      {/* Tablet-specific styles */}
      <style jsx global>{`
        /* Hide scrollbars but maintain functionality */
        .scrollbar-hide {
          scrollbar-width: none;
          -ms-overflow-style: none;
          -webkit-overflow-scrolling: touch;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        /* Touch-friendly scrolling for toolbar */
        .toolbar-scroll {
          scroll-behavior: smooth;
        }
        
        /* Utility classes for grid view */
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}
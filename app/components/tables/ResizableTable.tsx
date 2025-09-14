'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { updateColumnWidth, updateColumnOrder, loadTableConfig } from '@/app/lib/utils/tableStorage'

const EMPTY_SENSORS: any[] = []

interface Column {
  id: string
  header: string
  accessor: string
  minWidth?: number
  width?: number
  render?: (value: any, item: any, rowIndex: number) => React.ReactNode
}

interface ResizableTableProps {
  columns: Column[]
  data: any[]
  className?: string
  onRowClick?: (item: any, index: number) => void
  onRowDoubleClick?: (item: any, index: number) => void
  selectedRowId?: string | null
  reportType?: 'MAIN_REPORT' | 'PRODUCTS_REPORT' // for localStorage key
  onColumnsChange?: (columns: Column[]) => void // callback for parent component
  showToast?: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void
}

interface SortableHeaderProps {
  column: Column
  width: number
  onResize: (columnId: string, newWidth: number) => void
  onResizeStateChange: (isResizing: boolean) => void
  onResizeComplete?: (columnId: string, newWidth: number) => void
}

function SortableHeader({ column, width, onResize, onResizeStateChange, onResizeComplete }: SortableHeaderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: column.id,
    data: { type: 'column' }
  })

  const [isResizing, setIsResizing] = useState(false)
  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(0)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: `${width}px`,
    minWidth: `${width}px`,
    maxWidth: `${width}px`,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Set resizing state immediately
    setIsResizing(true)
    onResizeStateChange(true)

    // Store initial values
    resizeStartX.current = e.clientX
    resizeStartWidth.current = width

    // Prevent text selection during resize
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
  }, [width, onResizeStateChange])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartX.current
      const newWidth = Math.max(20, resizeStartWidth.current - deltaX) // Minimum 20px width
      onResize(column.id, newWidth)
    }

    const handleMouseUp = () => {
      console.log(`🖱️ Mouse up detected for column: ${column.id}, current width: ${width}px`)

      setIsResizing(false)
      onResizeStateChange(false)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''

      // Save the final width on mouse up (when user releases the mouse)
      if (onResizeComplete) {
        console.log(`💾 Calling onResizeComplete for ${column.id} with width ${width}px`)
        onResizeComplete(column.id, width) // Use current width state
      } else {
        console.warn(`⚠️ onResizeComplete not provided for column: ${column.id}`)
      }
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, column.id, onResize, onResizeStateChange])

  return (
    <th
      ref={setNodeRef}
      style={style}
      className="relative px-4 py-3 text-right font-medium bg-[#374151] border-b border-r border-gray-600 select-none"
      {...attributes}
    >
      {/* Resize areas - completely separate from draggable content */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-20"
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleResizeStart(e)
        }}
        style={{ pointerEvents: 'auto' }}
      />
      <div
        className="absolute -left-2 top-0 bottom-0 w-4 cursor-col-resize z-10"
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleResizeStart(e)
        }}
        style={{ pointerEvents: 'auto' }}
      />

      {/* Draggable header content */}
      <div
        className="flex items-center justify-between relative z-0"
        {...(isResizing ? {} : listeners)}
      >
        <span className="text-gray-200 truncate">{column.header}</span>
      </div>
    </th>
  )
}

export default function ResizableTable({
  columns: initialColumns,
  data,
  className = '',
  onRowClick,
  onRowDoubleClick,
  selectedRowId,
  reportType,
  onColumnsChange,
  showToast
}: ResizableTableProps) {
  const [columns, setColumns] = useState<Column[]>([])
  const [isAnyColumnResizing, setIsAnyColumnResizing] = useState(false)
  const [tableId, setTableId] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // Immediate save function for resize complete (on mouse up)
  const saveColumnWidth = useCallback((columnId: string, newWidth: number) => {
    if (!reportType) return

    console.log(`🎯 Saving column width: ${columnId} = ${newWidth}px`)

    // Get current saved config to preserve all existing settings
    const savedConfig = loadTableConfig(reportType)

    let columnsForStorage: any[]

    if (savedConfig && savedConfig.columns.length > 0) {
      // Update existing config with new width
      columnsForStorage = savedConfig.columns.map(col => ({
        id: col.id,
        width: col.id === columnId ? newWidth : col.width,
        visible: col.visible !== false, // ensure boolean
        order: col.order
      }))

      // Check if the column exists in saved config, if not add it
      const columnExists = savedConfig.columns.some(col => col.id === columnId)
      if (!columnExists) {
        const originalCol = columns.find(col => col.id === columnId)
        if (originalCol) {
          columnsForStorage.push({
            id: columnId,
            width: newWidth,
            visible: true,
            order: savedConfig.columns.length
          })
        }
      }
    } else {
      // Create new config from current columns
      console.log(`📝 Creating new config from current columns`)
      columnsForStorage = columns.map((col, index) => ({
        id: col.id,
        width: col.id === columnId ? newWidth : (col.width || 100),
        visible: true,
        order: index
      }))
    }

    console.log(`💾 Columns for storage:`, columnsForStorage.map(col => ({ id: col.id, width: col.width })))

    updateColumnWidth(reportType, columnId, newWidth, columnsForStorage)
    console.log(`📐 Column width saved successfully for ${reportType}: ${columnId} = ${newWidth}px`)

    // Show toast notification if available
    if (showToast) {
      showToast(`📐 تم حفظ عرض العمود بنجاح`, 'success', 1500)
    }
  }, [reportType, columns])

  // Immediate save function for column reorder
  const saveColumnOrder = useCallback((newOrder: string[], reorderedColumns: Column[]) => {
    if (!reportType) return

    console.log(`🎯 Saving column order:`, newOrder)

    // Get current saved config to preserve all existing settings
    const savedConfig = loadTableConfig(reportType)

    let columnsForStorage: any[]

    if (savedConfig && savedConfig.columns.length > 0) {
      // Update existing config with new order
      columnsForStorage = reorderedColumns.map((col, index) => {
        const savedCol = savedConfig.columns.find(saved => saved.id === col.id)
        return {
          id: col.id,
          width: col.width || savedCol?.width || 100,
          visible: savedCol?.visible !== false,
          order: index
        }
      })
    } else {
      // Create new config from reordered columns
      columnsForStorage = reorderedColumns.map((col, index) => ({
        id: col.id,
        width: col.width || 100,
        visible: true,
        order: index
      }))
    }

    updateColumnOrder(reportType, newOrder, columnsForStorage)
    console.log(`🔄 Column order saved successfully for ${reportType}`)

    // Show toast notification if available (with delay to avoid interference)
    if (showToast) {
      setTimeout(() => {
        showToast(`🔄 تم حفظ ترتيب الأعمدة بنجاح`, 'success', 1500)
      }, 100)
    }
  }, [reportType])

  // Stable column initialization function
  const initializeColumns = useCallback(() => {
    if (!reportType) {
      // No reportType - use basic columns
      setColumns(initialColumns.map(col => ({
        ...col,
        width: col.width || col.minWidth || 100
      })))
      return
    }

    try {
      // Load saved configuration from localStorage
      const savedConfig = loadTableConfig(reportType)

      if (savedConfig && savedConfig.columns.length > 0) {
        console.log(`🔄 Loading saved config for ${reportType}`)

        // Apply saved configuration: order, width, and visibility
        const configuredColumns = savedConfig.columns
          .filter(savedCol => savedCol.visible) // Only include visible columns
          .sort((a, b) => a.order - b.order) // Sort by saved order
          .map(savedCol => {
            const originalCol = initialColumns.find(col => col.id === savedCol.id)
            if (!originalCol) return null // Skip missing columns

            return {
              ...originalCol,
              width: savedCol.width // Apply saved width
            }
          })
          .filter(Boolean) as Column[] // Remove null values

        // Add any new columns that weren't in saved config (for backwards compatibility)
        const configuredIds = new Set(savedConfig.columns.map(col => col.id))
        const newColumns = initialColumns
          .filter(col => !configuredIds.has(col.id))
          .map(col => ({ ...col, width: col.width || col.minWidth || 100 }))

        const finalColumns = [...configuredColumns, ...newColumns]
        console.log(`✅ Loaded ${finalColumns.length} visible columns for ${reportType}`)
        setColumns(finalColumns)
      } else {
        // No saved config, use all initial columns with default widths
        const defaultColumns = initialColumns.map(col => ({
          ...col,
          width: col.width || col.minWidth || 100
        }))
        console.log(`📝 Using default columns for ${reportType}`)
        setColumns(defaultColumns)
      }
    } catch (error) {
      console.error('Error loading table config:', error)
      // Fallback to initial columns
      setColumns(initialColumns.map(col => ({
        ...col,
        width: col.width || col.minWidth || 100
      })))
    }
  }, [initialColumns, reportType])

  // Initialize table when component mounts or reportType changes
  useEffect(() => {
    initializeColumns()
  }, [initializeColumns])

  // Listen for storage changes from other components (like column visibility changes)
  useEffect(() => {
    if (!reportType) return

    const handleStorageChange = (event?: any) => {
      // Ignore events from the same component to avoid loops
      if (event?.detail?.reportType === reportType && event?.detail?.source === 'ResizableTable') {
        return
      }

      console.log(`🔄 Detected storage change for ${reportType}, refreshing columns...`)
      // Small delay to ensure localStorage has been updated and avoid render conflicts
      setTimeout(() => {
        try {
          initializeColumns()
        } catch (error) {
          console.error('Error refreshing columns after storage change:', error)
        }
      }, 200)
    }

    // Listen for custom storage events
    window.addEventListener('tableConfigChanged', handleStorageChange)
    // Also listen for direct storage events
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('tableConfigChanged', handleStorageChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [reportType, initializeColumns])

  // Fix hydration mismatch by setting tableId on client side only
  useEffect(() => {
    setTableId(`table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  }, [])

  // Monitor container width to determine scrollbar visibility
  useEffect(() => {
    const updateContainerWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth)
      }
    }

    updateContainerWidth()
    window.addEventListener('resize', updateContainerWidth)

    return () => {
      window.removeEventListener('resize', updateContainerWidth)
    }
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event

    if (active.id !== over.id) {
      setColumns((columns) => {
        const oldIndex = columns.findIndex(col => col.id === active.id)
        const newIndex = columns.findIndex(col => col.id === over.id)
        const reorderedColumns = arrayMove(columns, oldIndex, newIndex)

        // Defer save operation to avoid setState during render
        setTimeout(() => {
          if (reportType) {
            const newOrder = reorderedColumns.map(col => col.id)
            saveColumnOrder(newOrder, reorderedColumns)
          }
        }, 0)

        // Notify parent component of changes
        if (onColumnsChange) {
          onColumnsChange(reorderedColumns)
        }

        return reorderedColumns
      })
    }
  }, [reportType, onColumnsChange, saveColumnOrder])

  const emptyDragEnd = useCallback(() => {}, [])

  const handleColumnResize = useCallback((columnId: string, newWidth: number) => {
    setColumns(prev => {
      const updatedColumns = prev.map(col =>
        col.id === columnId ? { ...col, width: newWidth } : col
      )

      // Notify parent component of changes immediately for UI responsiveness
      if (onColumnsChange) {
        onColumnsChange(updatedColumns)
      }

      return updatedColumns
    })
  }, [onColumnsChange])

  // Handle resize complete (when mouse is released)
  const handleResizeComplete = useCallback((columnId: string, finalWidth: number) => {
    // Defer save operation to avoid potential setState during render
    setTimeout(() => {
      saveColumnWidth(columnId, finalWidth)
    }, 0)
  }, [saveColumnWidth])

  // Update container width whenever columns change
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth)
      }
    }
    updateWidth()
  }, [columns])

  const totalWidth = columns.reduce((sum, col) => sum + (col.width || 100), 0)
  // Add some buffer for borders and padding
  const needsHorizontalScroll = totalWidth > (containerWidth - 20) && containerWidth > 0

  return (
    <div className={`h-full ${className}`} ref={containerRef}>
      <div 
        className={`h-full ${
          needsHorizontalScroll ? 'custom-scrollbar' : 'scrollbar-hide overflow-y-auto'
        }`}
        style={{ 
          overflowX: needsHorizontalScroll ? 'auto' : 'hidden'
        }}
      >
        <DndContext
          id={tableId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={isAnyColumnResizing ? emptyDragEnd : handleDragEnd}
        >
          <table className="text-sm w-full" style={{ minWidth: `${totalWidth}px`, tableLayout: 'fixed' }}>
          <thead className="bg-[#374151] border-b border-gray-600 sticky top-0">
            <SortableContext items={columns.map(col => col.id)} strategy={horizontalListSortingStrategy}>
              <tr>
                {columns.map((column) => (
                  <SortableHeader
                    key={column.id}
                    column={column}
                    width={column.width || 100}
                    onResize={handleColumnResize}
                    onResizeStateChange={setIsAnyColumnResizing}
                    onResizeComplete={handleResizeComplete}
                  />
                ))}
              </tr>
            </SortableContext>
          </thead>
          <tbody className="bg-[#2B3544]">
            {data.map((item, rowIndex) => (
              <tr
                key={item.id || rowIndex}
                className={`border-b border-gray-700 cursor-pointer transition-colors ${
                  selectedRowId === item.id 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'hover:bg-[#374151]'
                }`}
                onClick={() => onRowClick?.(item, rowIndex)}
                onDoubleClick={() => onRowDoubleClick?.(item, rowIndex)}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className="px-4 py-3 text-gray-300 border-r border-gray-700"
                    style={{ 
                      width: `${column.width}px`, 
                      minWidth: `${column.width}px`,
                      maxWidth: `${column.width}px` 
                    }}
                  >
                    <div className="truncate">
                      {column.render 
                        ? column.render(item[column.accessor], item, rowIndex)
                        : column.accessor === '#' 
                        ? rowIndex + 1 
                        : item[column.accessor]
                      }
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          </table>
        </DndContext>
      </div>
    </div>
  )
}
'use client'

import { useState } from 'react'

interface Column {
  key: string
  title: string
  render?: (value: any, record: any) => React.ReactNode
}

interface DataTableProps<T = any> {
  data: T[]
  columns: Column[]
  showCheckbox?: boolean
  showActions?: boolean
  onRowSelect?: (selectedIds: (string | number)[]) => void
  className?: string
}

export default function DataTable<T extends { id: string | number }>({
  data,
  columns,
  showCheckbox = true,
  showActions = false,
  onRowSelect,
  className = ''
}: DataTableProps<T>) {
  const [selectedRows, setSelectedRows] = useState<(string | number)[]>([])

  const toggleRowSelection = (id: string | number) => {
    const newSelection = selectedRows.includes(id) 
      ? selectedRows.filter(rowId => rowId !== id)
      : [...selectedRows, id]
    
    setSelectedRows(newSelection)
    onRowSelect?.(newSelection)
  }

  const toggleAllSelection = () => {
    const newSelection = selectedRows.length === data.length 
      ? [] 
      : data.map(item => item.id)
    
    setSelectedRows(newSelection)
    onRowSelect?.(newSelection)
  }

  const isRowSelected = (id: string | number) => selectedRows.includes(id)
  const isAllSelected = selectedRows.length === data.length && data.length > 0

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm text-right">
        <thead className="bg-gray-700 text-gray-300">
          <tr>
            {showCheckbox && (
              <th className="p-3 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleAllSelection}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
              </th>
            )}
            {columns.map((column) => (
              <th key={column.key} className="p-3 text-right font-medium">
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-pos-darker divide-y divide-gray-700">
          {data.map((item) => (
            <tr 
              key={item.id}
              className={`hover:bg-gray-700 transition-colors ${
                isRowSelected(item.id) ? 'bg-blue-900/20' : ''
              }`}
            >
              {showCheckbox && (
                <td className="p-3 text-center">
                  <input
                    type="checkbox"
                    checked={isRowSelected(item.id)}
                    onChange={() => toggleRowSelection(item.id)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                </td>
              )}
              {columns.map((column) => (
                <td key={column.key} className="p-3 text-white">
                  {column.render 
                    ? column.render(item[column.key as keyof T], item)
                    : String(item[column.key as keyof T] || '-')
                  }
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td 
                colSpan={columns.length + (showCheckbox ? 1 : 0)} 
                className="p-8 text-center text-gray-400"
              >
                لا توجد بيانات للعرض
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
'use client'

import { useState } from 'react'
import { XMarkIcon, KeyIcon } from '@heroicons/react/24/outline'

interface AddPermissionModalProps {
  isOpen: boolean
  onClose: () => void
  onPermissionAdded: (permission: { name: string; description: string; accessLevel: string }) => void
}

export default function AddPermissionModal({ isOpen, onClose, onPermissionAdded }: AddPermissionModalProps) {
  const [permissionName, setPermissionName] = useState('')
  const [description, setDescription] = useState('')
  const [accessLevel, setAccessLevel] = useState('read')
  const [isLoading, setIsLoading] = useState(false)

  const accessLevels = [
    { value: 'read', label: 'قراءة', color: 'text-blue-400' },
    { value: 'write', label: 'كتابة', color: 'text-green-400' },
    { value: 'delete', label: 'حذف', color: 'text-red-400' },
    { value: 'admin', label: 'إدارة كاملة', color: 'text-purple-400' }
  ]

  const handleSave = async () => {
    if (!permissionName.trim() || !description.trim()) return

    setIsLoading(true)
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      onPermissionAdded({
        name: permissionName.trim(),
        description: description.trim(),
        accessLevel
      })
      
      setPermissionName('')
      setDescription('')
      setAccessLevel('read')
      onClose()
    } catch (error) {
      console.error('Error creating permission:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setPermissionName('')
    setDescription('')
    setAccessLevel('read')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-[#374151] rounded-lg p-6 w-[500px] max-w-md mx-4 border border-gray-600">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <KeyIcon className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">إضافة صلاحية جديدة</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Permission Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              اسم الصلاحية <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={permissionName}
              onChange={(e) => setPermissionName(e.target.value)}
              placeholder="أدخل اسم الصلاحية..."
              className="w-full bg-[#2B3544] text-white placeholder-gray-500 px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              الوصف <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="أدخل وصف الصلاحية..."
              rows={3}
              className="w-full bg-[#2B3544] text-white placeholder-gray-500 px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Access Level */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              مستوى الوصول
            </label>
            <div className="space-y-2">
              {accessLevels.map((level) => (
                <label key={level.value} className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="accessLevel"
                    value={level.value}
                    checked={accessLevel === level.value}
                    onChange={(e) => setAccessLevel(e.target.value)}
                    className="sr-only"
                    disabled={isLoading}
                  />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ml-3 ${
                    accessLevel === level.value 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-gray-600'
                  }`}>
                    {accessLevel === level.value && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${level.color}`}>
                    {level.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-8">
          <button
            onClick={handleClose}
            className="px-6 py-2 text-gray-300 bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
            disabled={isLoading}
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={!permissionName.trim() || !description.trim() || isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                جاري الحفظ...
              </>
            ) : (
              <>
                <KeyIcon className="h-4 w-4" />
                حفظ الصلاحية
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
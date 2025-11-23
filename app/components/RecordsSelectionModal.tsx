'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase/client'

interface Record {
  id: string
  name: string
  branch_id?: string | null
  is_primary: boolean | null
  is_active: boolean | null
  branch?: {
    name: string
  } | null
}

interface RecordsSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectRecord?: (record: Record) => void
}

export default function RecordsSelectionModal({ 
  isOpen, 
  onClose, 
  onSelectRecord 
}: RecordsSelectionModalProps) {
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null)
  const [records, setRecords] = useState<Record[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch records from database
  const fetchRecords = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('records')
        .select(`
          id,
          name,
          branch_id,
          is_primary,
          is_active,
          branch:branches(name)
        `)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('name', { ascending: true })
      
      if (error) {
        console.error('Error fetching records:', error)
        setError('فشل في تحميل السجلات')
        return
      }

      // Transform the data to match the Record type
      const transformedData = (data || []).map((record: any) => ({
        ...record,
        branch: Array.isArray(record.branch) ? record.branch[0] : record.branch
      }))

      setRecords(transformedData)
    } catch (error) {
      console.error('Error fetching records:', error)
      setError('حدث خطأ أثناء تحميل السجلات')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch records when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchRecords()
      setSelectedRecord(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleRecordSelect = (record: Record) => {
    setSelectedRecord(record)
  }

  const handleConfirm = () => {
    if (selectedRecord && onSelectRecord) {
      onSelectRecord(selectedRecord)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#374151] rounded-lg w-[800px] h-[600px] flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <div className="flex items-center gap-2">
            <ComputerDesktopIcon className="h-5 w-5 text-blue-400" />
            <h2 className="text-white text-lg font-semibold">اختيار السجل</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Table Header */}
          <div className="bg-[#2B3544] border-b border-gray-600">
            <div className="grid grid-cols-5 gap-4 p-3 text-gray-300 text-sm font-medium">
              <div className="text-center">#</div>
              <div className="text-right">الاسم</div>
              <div className="text-center">النوع</div>
              <div className="text-center">رئيسي</div>
              <div className="text-center">الحالة</div>
            </div>
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-400 text-lg">جاري تحميل السجلات...</p>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <ComputerDesktopIcon className="h-16 w-16 text-red-500 mb-4" />
                <p className="text-red-400 text-lg mb-2">خطأ في التحميل</p>
                <p className="text-gray-500 text-sm mb-4">{error}</p>
                <button
                  onClick={fetchRecords}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : records.length > 0 ? (
              <div className="divide-y divide-gray-600">
                {records.map((record, index) => (
                  <div
                    key={record.id}
                    className={`grid grid-cols-5 gap-4 p-3 hover:bg-[#2B3544] cursor-pointer transition-colors ${
                      selectedRecord?.id === record.id ? 'bg-blue-600/20 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => handleRecordSelect(record)}
                  >
                    <div className="text-center text-gray-400 text-sm">
                      {index + 1}
                    </div>
                    <div className="text-right text-white font-medium">
                      {record.name}
                    </div>
                    <div className="text-center text-gray-300 text-sm">
                      {record.branch?.name || 'عام'}
                    </div>
                    <div className="text-center">
                      <div className={`w-3 h-3 rounded-full mx-auto ${
                        record.is_primary ? 'bg-blue-500' : 'bg-gray-500'
                      }`}></div>
                    </div>
                    <div className="text-center">
                      <div className={`w-3 h-3 rounded-full mx-auto ${
                        record.is_active ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <ComputerDesktopIcon className="h-16 w-16 text-gray-500 mb-4" />
                <p className="text-gray-400 text-lg mb-2">لا توجد سجلات نشطة</p>
                <p className="text-gray-500 text-sm">لا توجد سجلات متاحة في قاعدة البيانات</p>
              </div>
            )}
          </div>

          {/* Footer Stats */}
          <div className="border-t border-gray-600 p-3 bg-[#2B3544]">
            <div className="flex justify-between items-center text-sm text-gray-400">
              <span>إجمالي السجلات: {records.length}</span>
              <span>المطلوب تحديد سجل من الجدول للمتابعة</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-600 p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedRecord}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
          >
            تأكيد الاختيار
          </button>
        </div>
      </div>
    </div>
  )
}
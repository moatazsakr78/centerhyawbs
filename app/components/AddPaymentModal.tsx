'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase/client'
import { useFormatPrice } from '@/lib/hooks/useCurrency'

interface AddPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  entityId: string
  entityType: 'customer' | 'supplier'
  entityName: string
  currentBalance: number
  onPaymentAdded?: () => void
}

export default function AddPaymentModal({
  isOpen,
  onClose,
  entityId,
  entityType,
  entityName,
  currentBalance,
  onPaymentAdded
}: AddPaymentModalProps) {
  const formatPrice = useFormatPrice()
  const [amount, setAmount] = useState('')
  const [recordId, setRecordId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [records, setRecords] = useState<any[]>([])
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)

  // Fetch records
  useEffect(() => {
    const fetchRecords = async () => {
      setIsLoadingRecords(true)
      try {
        const { data, error } = await supabase
          .from('records')
          .select('id, name, is_active')
          .eq('is_active', true)
          .order('name', { ascending: true })

        if (error) {
          console.error('Error fetching records:', error)
          return
        }

        setRecords(data || [])

        // Auto-select first record if available
        if (data && data.length > 0) {
          setRecordId(data[0].id)
        }
      } catch (error) {
        console.error('Error fetching records:', error)
      } finally {
        setIsLoadingRecords(false)
      }
    }

    if (isOpen) {
      fetchRecords()
    }
  }, [isOpen])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount('')
      setNotes('')
      setPaymentMethod('cash')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!amount || parseFloat(amount) <= 0) {
      alert('يرجى إدخال مبلغ صحيح')
      return
    }

    if (!recordId) {
      alert('يرجى اختيار السجل')
      return
    }

    const paymentAmount = parseFloat(amount)

    // Check if payment exceeds balance
    if (paymentAmount > currentBalance) {
      const confirmExceed = confirm(
        `المبلغ المدخل (${formatPrice(paymentAmount)}) أكبر من الرصيد الحالي (${formatPrice(currentBalance)}). هل تريد المتابعة؟`
      )
      if (!confirmExceed) return
    }

    setIsSubmitting(true)

    try {
      const table = entityType === 'customer' ? 'customer_payments' : 'supplier_payments'
      const idField = entityType === 'customer' ? 'customer_id' : 'supplier_id'

      const { data, error } = await supabase
        .from(table)
        .insert([
          {
            [idField]: entityId,
            amount: paymentAmount,
            payment_method: paymentMethod,
            notes: notes || null,
            payment_date: new Date().toISOString().split('T')[0],
          }
        ])
        .select()

      if (error) {
        console.error('Error adding payment:', error)
        alert('حدث خطأ أثناء إضافة الدفعة')
        return
      }

      // Success - close modal and refresh
      if (onPaymentAdded) {
        onPaymentAdded()
      }
      onClose()

    } catch (error) {
      console.error('Error adding payment:', error)
      alert('حدث خطأ أثناء إضافة الدفعة')
    } finally {
      setIsSubmitting(false)
    }
  }

  const remainingBalance = currentBalance - (parseFloat(amount) || 0)

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[60]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-[#2B3544] rounded-lg shadow-xl w-full max-w-md">

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-600">
            <h2 className="text-xl font-bold text-white">
              إضافة دفعة - {entityName}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">

            {/* Current Balance Display */}
            <div className="bg-blue-600/20 border border-blue-600 rounded p-4 text-center">
              <div className="text-sm text-blue-300 mb-1">الرصيد الحالي</div>
              <div className="text-2xl font-bold text-white">{formatPrice(currentBalance)}</div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2 text-right">
                مبلغ الدفعة <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 bg-[#1F2937] border border-gray-600 rounded text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="أدخل مبلغ الدفعة"
                required
              />
            </div>

            {/* Remaining Balance Display */}
            {amount && parseFloat(amount) > 0 && (
              <div className={`rounded p-3 text-center ${
                remainingBalance < 0
                  ? 'bg-red-600/20 border border-red-600'
                  : 'bg-green-600/20 border border-green-600'
              }`}>
                <div className="text-sm mb-1" style={{ color: remainingBalance < 0 ? '#FCA5A5' : '#86EFAC' }}>
                  الرصيد المتبقي
                </div>
                <div className="text-xl font-bold text-white">
                  {formatPrice(Math.abs(remainingBalance))}
                  {remainingBalance < 0 && ' (دفع زائد)'}
                </div>
              </div>
            )}

            {/* Record Selection */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2 text-right">
                السجل <span className="text-red-400">*</span>
              </label>
              {isLoadingRecords ? (
                <div className="text-gray-400 text-sm text-center py-2">جاري تحميل السجلات...</div>
              ) : records.length === 0 ? (
                <div className="text-red-400 text-sm text-center py-2">
                  لا توجد سجلات نشطة. يرجى إنشاء سجل أولاً.
                </div>
              ) : (
                <select
                  value={recordId}
                  onChange={(e) => setRecordId(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1F2937] border border-gray-600 rounded text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {records.map((record) => (
                    <option key={record.id} value={record.id}>
                      {record.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2 text-right">
                طريقة الدفع
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-2 bg-[#1F2937] border border-gray-600 rounded text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cash">نقدي</option>
                <option value="card">بطاقة</option>
                <option value="bank_transfer">تحويل بنكي</option>
                <option value="check">شيك</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2 text-right">
                ملاحظات
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-[#1F2937] border border-gray-600 rounded text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="أضف ملاحظات (اختياري)"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium transition-colors"
                disabled={isSubmitting}
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting || records.length === 0 || !amount || parseFloat(amount) <= 0}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'جاري الإضافة...' : 'إضافة الدفعة'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

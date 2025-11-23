'use client'

import { useState, useEffect } from 'react'
import { 
  XMarkIcon, 
  ClockIcon, 
  MagnifyingGlassIcon,
  DocumentTextIcon,
  PencilIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase/client'
import { markSaleAsUpdated, resetSaleUpdatedStatus } from '../lib/utils/salesUpdates'

interface Sale {
  id: string
  invoice_number: string
  total_amount: number
  tax_amount: number | null
  discount_amount: number | null
  payment_method: string
  created_at: string | null
  is_updated: boolean | null
  customer?: {
    name: string
  } | null
  branch?: {
    name: string
  } | null
  sale_items?: SaleItem[]
}

interface SaleItem {
  id: string
  quantity: number
  unit_price: number
  product: {
    name: string
    barcode?: string | null
  }
}

interface HistoryModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function HistoryModal({ 
  isOpen, 
  onClose 
}: HistoryModalProps) {
  const [sales, setSales] = useState<Sale[]>([])
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch sales history from database
  const fetchSalesHistory = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id,
          invoice_number,
          total_amount,
          tax_amount,
          discount_amount,
          payment_method,
          created_at,
          is_updated,
          customer:customers(name),
          branch:branches(name),
          sale_items(
            id,
            quantity,
            unit_price,
            product:products(name, barcode)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) {
        console.error('Error fetching sales history:', error)
        setError('فشل في تحميل تاريخ المبيعات')
        return
      }

      // Transform the data to match the Sale type
      const transformedData = (data || []).map((sale: any) => ({
        ...sale,
        customer: Array.isArray(sale.customer) ? sale.customer[0] : sale.customer,
        branch: Array.isArray(sale.branch) ? sale.branch[0] : sale.branch
      }))

      setSales(transformedData)
      
    } catch (error) {
      console.error('Error fetching sales history:', error)
      setError('حدث خطأ أثناء تحميل تاريخ المبيعات')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch sales when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSalesHistory()
      setSelectedSale(null)
      setSearchQuery('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSaleSelect = (sale: Sale) => {
    setSelectedSale(selectedSale?.id === sale.id ? null : sale)
  }

  const handleMarkAsUpdated = async (saleId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row selection
    
    const success = await markSaleAsUpdated(saleId)
    if (success) {
      // Refresh the sales list
      fetchSalesHistory()
    } else {
      alert('فشل في تحديث حالة الفاتورة')
    }
  }

  const handleResetUpdatedStatus = async (saleId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row selection
    
    const success = await resetSaleUpdatedStatus(saleId)
    if (success) {
      // Refresh the sales list
      fetchSalesHistory()
    } else {
      alert('فشل في إعادة تعيين حالة الفاتورة')
    }
  }

  // Filter sales based on search query
  const filteredSales = sales.filter(sale =>
    sale.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sale.customer?.name && sale.customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    sale.total_amount.toString().includes(searchQuery) ||
    (searchQuery.toLowerCase().includes('محدث') && sale.is_updated) ||
    (searchQuery.toLowerCase().includes('غير محدث') && !sale.is_updated)
  )

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'غير محدد'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return 'نقدي'
      case 'card': return 'بطاقة'
      case 'credit': return 'آجل'
      default: return method
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#374151] rounded-lg w-[1000px] h-[700px] flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-blue-400" />
            <h2 className="text-white text-lg font-semibold">تاريخ المبيعات</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-600 bg-[#2B3544]">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث في رقم الفاتورة، العميل، أو المبلغ..."
              className="w-full pl-4 pr-10 py-2 bg-[#374151] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sales List */}
          <div className="flex-1 flex flex-col">
            {/* Table Header */}
            <div className="bg-[#2B3544] border-b border-gray-600">
              <div className="grid grid-cols-8 gap-4 p-3 text-gray-300 text-sm font-medium">
                <div className="text-center">رقم الفاتورة</div>
                <div className="text-center">العميل</div>
                <div className="text-center">المبلغ الإجمالي</div>
                <div className="text-center">طريقة الدفع</div>
                <div className="text-center">محدث</div>
                <div className="text-center">التاريخ</div>
                <div className="text-center">العناصر</div>
                <div className="text-center">الإجراءات</div>
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-gray-400 text-lg">جاري تحميل تاريخ المبيعات...</p>
                </div>
              ) : error ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                  <DocumentTextIcon className="h-16 w-16 text-red-500 mb-4" />
                  <p className="text-red-400 text-lg mb-2">خطأ في التحميل</p>
                  <p className="text-gray-500 text-sm mb-4">{error}</p>
                  <button
                    onClick={fetchSalesHistory}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              ) : filteredSales.length > 0 ? (
                <div className="divide-y divide-gray-600">
                  {filteredSales.map((sale) => (
                    <div key={sale.id}>
                      <div
                        className={`grid grid-cols-8 gap-4 p-3 hover:bg-[#2B3544] cursor-pointer transition-colors ${
                          selectedSale?.id === sale.id ? 'bg-blue-600/20 border-l-4 border-blue-500' : ''
                        }`}
                        onClick={() => handleSaleSelect(sale)}
                      >
                        <div className="text-center text-white font-medium">
                          {sale.invoice_number}
                        </div>
                        <div className="text-center text-gray-300">
                          {sale.customer?.name || 'عميل مجهول'}
                        </div>
                        <div className="text-center text-green-400 font-medium">
                          {sale.total_amount.toFixed(2)}
                        </div>
                        <div className="text-center text-gray-300">
                          {getPaymentMethodText(sale.payment_method)}
                        </div>
                        <div className="text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            sale.is_updated 
                              ? 'bg-orange-900 text-orange-300 border border-orange-600/30' 
                              : 'bg-green-900 text-green-300 border border-green-600/30'
                          }`}>
                            {sale.is_updated ? 'نعم' : 'لا'}
                          </span>
                        </div>
                        <div className="text-center text-gray-400 text-sm">
                          {formatDate(sale.created_at)}
                        </div>
                        <div className="text-center text-blue-400">
                          {sale.sale_items?.length || 0} عنصر
                        </div>
                        <div className="text-center">
                          {sale.is_updated ? (
                            <button
                              onClick={(e) => handleResetUpdatedStatus(sale.id, e)}
                              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-1 mx-auto"
                              title="إعادة تعيين حالة التحديث"
                            >
                              <ArrowPathIcon className="h-3 w-3" />
                              إعادة تعيين
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleMarkAsUpdated(sale.id, e)}
                              className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors flex items-center gap-1 mx-auto"
                              title="وضع علامة كمحدث"
                            >
                              <PencilIcon className="h-3 w-3" />
                              تحديث
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Sale Details - Expandable */}
                      {selectedSale?.id === sale.id && sale.sale_items && (
                        <div className="bg-[#2B3544] border-l-4 border-blue-500 p-4">
                          <h4 className="text-white font-medium mb-3">تفاصيل الفاتورة:</h4>
                          <div className="space-y-2">
                            {sale.sale_items.map((item, index) => (
                              <div key={item.id} className="flex justify-between items-center p-2 bg-[#374151] rounded">
                                <div className="flex items-center gap-3">
                                  <span className="text-gray-400 text-sm">{index + 1}.</span>
                                  <span className="text-white">{item.product.name}</span>
                                  {item.product.barcode && (
                                    <span className="text-gray-500 text-xs">({item.product.barcode})</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="text-gray-300">الكمية: {item.quantity}</span>
                                  <span className="text-gray-300">السعر: {item.unit_price.toFixed(2)}</span>
                                  <span className="text-green-400 font-medium">
                                    الإجمالي: {(item.quantity * item.unit_price).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Sale Summary */}
                          <div className="mt-4 p-3 bg-[#1F2937] rounded-lg">
                            <div className="flex justify-between items-center text-sm mb-2">
                              <div className="space-y-1">
                                {sale.discount_amount && sale.discount_amount > 0 && (
                                  <div className="text-orange-400">خصم: {sale.discount_amount.toFixed(2)}</div>
                                )}
                                {sale.tax_amount && sale.tax_amount > 0 && (
                                  <div className="text-blue-400">ضريبة: {sale.tax_amount.toFixed(2)}</div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-green-400 font-bold text-lg">
                                  الإجمالي النهائي: {sale.total_amount.toFixed(2)}
                                </div>
                              </div>
                            </div>
                            
                            {/* Update Status Info */}
                            <div className="border-t border-gray-600 pt-2 mt-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-400">حالة التحديث:</span>
                                <span className={`px-2 py-1 rounded-full font-medium ${
                                  sale.is_updated 
                                    ? 'bg-orange-900 text-orange-300' 
                                    : 'bg-green-900 text-green-300'
                                }`}>
                                  {sale.is_updated ? 'تم التحديث' : 'لم يتم التحديث'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                  <DocumentTextIcon className="h-16 w-16 text-gray-500 mb-4" />
                  <p className="text-gray-400 text-lg mb-2">لا توجد مبيعات</p>
                  <p className="text-gray-500 text-sm">لا توجد مبيعات مسجلة في قاعدة البيانات</p>
                </div>
              )}
            </div>

            {/* Footer Stats */}
            <div className="border-t border-gray-600 p-3 bg-[#2B3544]">
              <div className="flex justify-between items-center text-sm text-gray-400">
                <span>إجمالي المبيعات: {filteredSales.length}</span>
                <span>إجمالي المبلغ: {filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-600 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  )
}
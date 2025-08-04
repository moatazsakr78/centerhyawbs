'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'

export interface Supplier {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
  category: string | null
  group_id: string | null
  account_balance: number | null
  credit_limit: number | null
  rank: string | null
  city: string | null
  country: string | null
  tax_id: string | null
  company_name: string | null
  notes: string | null
  total_purchases: number | null
  last_purchase: string | null
  loyalty_points: number | null
}

// Default supplier ID that should never be deleted
export const DEFAULT_SUPPLIER_ID = '00000000-0000-0000-0000-000000000001'

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSuppliers = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .or('is_active.is.null,is_active.eq.true')
        .order('created_at', { ascending: false })

      if (error) throw error

      setSuppliers((data || []).map((supplier: any) => ({
        ...supplier,
        loyalty_points: supplier.loyalty_points || 0
      })))
      setError(null)
    } catch (err) {
      console.error('Error fetching suppliers:', err)
      setError('فشل في تحميل الموردين')
      setSuppliers([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSupplierChange = (payload: any) => {
    console.log('Supplier change:', payload)
    if (payload.eventType === 'INSERT') {
      setSuppliers(prev => [payload.new, ...prev])
    } else if (payload.eventType === 'UPDATE') {
      setSuppliers(prev => prev.map(supplier => 
        supplier.id === payload.new.id ? payload.new : supplier
      ))
    } else if (payload.eventType === 'DELETE') {
      setSuppliers(prev => prev.filter(supplier => supplier.id !== payload.old.id))
    }
  }

  const isDefaultSupplier = (supplierId: string): boolean => {
    return supplierId === DEFAULT_SUPPLIER_ID
  }

  const getDefaultSupplier = (): Supplier | null => {
    return suppliers.find(supplier => supplier.id === DEFAULT_SUPPLIER_ID) || null
  }

  useEffect(() => {
    fetchSuppliers()

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('suppliers')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'suppliers' },
        handleSupplierChange
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    suppliers,
    isLoading,
    error,
    refetch: fetchSuppliers,
    isDefaultSupplier,
    getDefaultSupplier
  }
}
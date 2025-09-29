'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'

export interface Customer {
  id: string
  name: string
  phone: string | null
  backup_phone: string | null
  email: string | null
  address: string | null
  city: string | null
  loyalty_points: number | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
  group_id: string | null
  rank: string | null
  category: string | null
  credit_limit: number | null
  account_balance: number | null
  company_name: string | null
  contact_person: string | null
  country: string | null
  tax_id: string | null
  notes: string | null
  user_id: string | null
}

// Default customer ID that should never be deleted
export const DEFAULT_CUSTOMER_ID = '00000000-0000-0000-0000-000000000001'

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCustomers = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or('is_active.is.null,is_active.eq.true')
        .order('created_at', { ascending: false })

      if (error) throw error

      setCustomers(data || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching customers:', err)
      setError('فشل في تحميل العملاء')
      setCustomers([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCustomerChange = (payload: any) => {
    console.log('Customer change:', payload)
    if (payload.eventType === 'INSERT') {
      setCustomers(prev => [payload.new, ...prev])
    } else if (payload.eventType === 'UPDATE') {
      setCustomers(prev => prev.map(customer => 
        customer.id === payload.new.id ? payload.new : customer
      ))
    } else if (payload.eventType === 'DELETE') {
      setCustomers(prev => prev.filter(customer => customer.id !== payload.old.id))
    }
  }

  const isDefaultCustomer = (customerId: string): boolean => {
    return customerId === DEFAULT_CUSTOMER_ID
  }

  const getDefaultCustomer = (): Customer | null => {
    return customers.find(customer => customer.id === DEFAULT_CUSTOMER_ID) || null
  }

  useEffect(() => {
    fetchCustomers()

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('customers')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'customers' },
        handleCustomerChange
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    customers,
    isLoading,
    error,
    refetch: fetchCustomers,
    isDefaultCustomer,
    getDefaultCustomer
  }
}
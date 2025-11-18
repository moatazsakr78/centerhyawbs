'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'

export interface SelectionData {
  record: any | null
  customer: any | null
  branch: any | null
}

const STORAGE_KEY = 'pos_selections'
const DEFAULT_CUSTOMER_ID = '00000000-0000-0000-0000-000000000001' // العميل الافتراضي

export function usePersistentSelections() {
  const [selections, setSelections] = useState<SelectionData>({
    record: null,
    customer: null,
    branch: null
  })

  const [isLoaded, setIsLoaded] = useState(false)

  // Load default customer from database
  const loadDefaultCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', DEFAULT_CUSTOMER_ID)
        .maybeSingle()

      if (error) {
        return null
      }

      return data
    } catch (error) {
      return null
    }
  }

  // Load from localStorage on mount
  useEffect(() => {
    const initializeSelections = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        let loadedSelections: SelectionData = {
          record: null,
          customer: null,
          branch: null
        }

        if (stored) {
          loadedSelections = JSON.parse(stored)
        }

        // Always ensure default customer is set if no customer is selected
        if (!loadedSelections.customer) {
          const defaultCustomer = await loadDefaultCustomer()
          if (defaultCustomer) {
            loadedSelections.customer = defaultCustomer
          }
        }

        setSelections(loadedSelections)
      } catch (error) {
        console.error('Error loading selections from localStorage:', error)
        // Even if there's an error, try to load the default customer
        const defaultCustomer = await loadDefaultCustomer()
        if (defaultCustomer) {
          setSelections(prev => ({ ...prev, customer: defaultCustomer }))
        }
      } finally {
        setIsLoaded(true)
      }
    }

    initializeSelections()
  }, [])

  // Save to localStorage whenever selections change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(selections))
      } catch (error) {
        console.error('Error saving selections to localStorage:', error)
      }
    }
  }, [selections, isLoaded])

  const setRecord = (record: any) => {
    setSelections(prev => ({ ...prev, record }))
  }

  const setCustomer = (customer: any) => {
    setSelections(prev => ({ ...prev, customer }))
  }

  const setBranch = (branch: any) => {
    setSelections(prev => ({ ...prev, branch }))
  }

  const clearSelections = () => {
    setSelections({
      record: null,
      customer: null,
      branch: null
    })
  }

  // Reset customer to default customer
  const resetToDefaultCustomer = async () => {
    const defaultCustomer = await loadDefaultCustomer()
    if (defaultCustomer) {
      setSelections(prev => ({ ...prev, customer: defaultCustomer }))
    }
  }

  const isComplete = () => {
    return selections.record && selections.customer && selections.branch
  }

  const hasRequiredForCart = () => {
    // At minimum, branch must be selected for cart operations
    return selections.branch !== null
  }

  const hasRequiredForSale = () => {
    // All three selections required for completing sale
    return selections.record && selections.customer && selections.branch
  }

  return {
    selections,
    isLoaded,
    setRecord,
    setCustomer,
    setBranch,
    clearSelections,
    resetToDefaultCustomer,
    isComplete,
    hasRequiredForCart,
    hasRequiredForSale
  }
}
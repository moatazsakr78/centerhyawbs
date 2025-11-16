'use client';

import React, { createContext, useContext, ReactNode } from 'react';

/**
 * Context for pre-fetched data from Server Components
 * This allows us to pass static data to client components without refetching
 */

interface PreFetchedDataContextType {
  products: any[];
  categories: any[];
  sections: any[];
  settings: any;
}

const PreFetchedDataContext = createContext<PreFetchedDataContextType>({
  products: [],
  categories: [],
  sections: [],
  settings: null
});

export function PreFetchedDataProvider({
  children,
  value
}: {
  children: ReactNode;
  value: PreFetchedDataContextType;
}) {
  return (
    <PreFetchedDataContext.Provider value={value}>
      {children}
    </PreFetchedDataContext.Provider>
  );
}

export function usePreFetchedData() {
  return useContext(PreFetchedDataContext);
}

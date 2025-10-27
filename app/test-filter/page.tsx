'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import { useProductFilter } from '@/lib/hooks/useProductFilter';

export default function TestFilterPage() {
  const [settings, setSettings] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [testProduct, setTestProduct] = useState<any>(null);
  const [testResult, setTestResult] = useState<number | null>(null);
  const { displaySettings, getProductInventory } = useProductFilter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load display settings
    const { data: settingsData } = await (supabase as any)
      .from('product_display_settings')
      .select('*')
      .single();
    setSettings(settingsData);

    // Load inventory for "أسبراي دهون" product
    const { data: products } = await supabase
      .from('products')
      .select('id, name')
      .ilike('name', '%اسبراي دهون%')
      .limit(1);

    if (products && products.length > 0) {
      setTestProduct(products[0]);

      // Load inventory for this product
      const { data: invData } = await supabase
        .from('inventory')
        .select('*, branches(name)')
        .eq('product_id', products[0].id);
      setInventory(invData || []);
    }
  };

  const testFilter = async () => {
    if (!testProduct) return;
    const result = await getProductInventory(testProduct.id);
    setTestResult(result);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">🔍 تشخيص الفلتر</h1>

      {/* Display Settings */}
      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-bold mb-4">⚙️ إعدادات العرض (من قاعدة البيانات)</h2>
        <pre className="bg-gray-700 p-4 rounded text-sm overflow-x-auto">
          {JSON.stringify(settings, null, 2)}
        </pre>
      </div>

      {/* Display Settings from Hook */}
      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-bold mb-4">⚙️ إعدادات العرض (من Hook)</h2>
        <pre className="bg-gray-700 p-4 rounded text-sm overflow-x-auto">
          {JSON.stringify(displaySettings, null, 2)}
        </pre>
      </div>

      {/* Test Product */}
      {testProduct && (
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-2xl font-bold mb-4">📦 المنتج التجريبي</h2>
          <p className="text-lg mb-2">الاسم: {testProduct.name}</p>
          <p className="text-sm text-gray-400 mb-4">ID: {testProduct.id}</p>

          <h3 className="text-xl font-bold mb-2">المخزون:</h3>
          {inventory.length === 0 ? (
            <p className="text-yellow-400">⚠️ لا توجد سجلات مخزون لهذا المنتج!</p>
          ) : (
            <div className="space-y-2">
              {inventory.map((inv: any, idx: number) => (
                <div key={idx} className="bg-gray-700 p-3 rounded">
                  <p>الفرع: {inv.branches?.name || inv.branch_id}</p>
                  <p>الكمية: {inv.quantity}</p>
                  <p className="text-xs text-gray-400">Branch ID: {inv.branch_id}</p>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={testFilter}
            className="mt-4 bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded font-bold"
          >
            🧪 اختبار الفلتر
          </button>

          {testResult !== null && (
            <div className="mt-4 p-4 bg-gray-700 rounded">
              <p className="text-lg">
                نتيجة الفلتر: <span className={testResult > 0 ? 'text-green-400' : 'text-red-400'}>
                  {testResult}
                </span>
              </p>
              <p className="text-sm text-gray-400 mt-2">
                {testResult > 0 ? '✅ المنتج سيظهر في المتجر' : '❌ المنتج لن يظهر في المتجر'}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-yellow-900 border border-yellow-600 p-4 rounded-lg">
        <h3 className="font-bold mb-2">📝 ملاحظات:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>تأكد من أن display_mode = "show_with_stock"</li>
          <li>تأكد من أن selected_branches يحتوي على IDs الفروع المحددة</li>
          <li>تأكد من أن جدول inventory يحتوي على سجلات للمنتج</li>
          <li>إذا كانت الكمية الكلية = 0، يجب ألا يظهر المنتج</li>
        </ul>
      </div>
    </div>
  );
}

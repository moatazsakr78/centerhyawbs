'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from '@/app/components/layout/Sidebar';
import TopHeader from '@/app/components/layout/TopHeader';
import ResizableTable from '@/app/components/tables/ResizableTable';
import SimpleDateFilterModal, { DateFilter } from '@/app/components/SimpleDateFilterModal';
import { supabase } from '@/app/lib/supabase/client';
import ProductsFilterModal from '@/app/components/ProductsFilterModal';
import CustomersFilterModal from '@/app/components/CustomersFilterModal';
import ColumnsControlModal from '@/app/components/ColumnsControlModal';

// Wrapper component for async column loading
interface ColumnsControlModalWrapperProps {
  reportType: string;
  onClose: () => void;
  onColumnsChange: (columns: {id: string, header: string, visible: boolean}[]) => void;
  getColumnsForModal: (reportType: string) => Promise<{id: string, header: string, visible: boolean}[]>;
}

function ColumnsControlModalWrapper({
  reportType,
  onClose,
  onColumnsChange,
  getColumnsForModal
}: ColumnsControlModalWrapperProps) {
  const [columns, setColumns] = useState<{id: string, header: string, visible: boolean}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadColumns = async () => {
      try {
        setLoading(true);
        const cols = await getColumnsForModal(reportType);
        setColumns(cols);
      } catch (error) {
        console.error('Failed to load columns for modal:', error);
        // Show error state or fallback columns
        setColumns([]);
      } finally {
        setLoading(false);
      }
    };

    loadColumns();
  }, [reportType, getColumnsForModal]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-[#2B3544] rounded-lg p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
            <span>جاري تحميل إعدادات الأعمدة...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ColumnsControlModal
      isOpen={true}
      onClose={onClose}
      columns={columns}
      onColumnsChange={onColumnsChange}
    />
  );
}
import ToastProvider, { useToast } from '@/app/components/ui/ToastProvider';
import {
  loadTableConfig,
  saveTableConfig,
  updateColumnVisibility,
  hybridTableStorage
} from '@/app/lib/utils/hybridTableStorage';
import { databaseSettingsService } from '@/app/lib/services/databaseSettingsService';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  ArchiveBoxIcon,
  CurrencyDollarIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  ArrowsUpDownIcon,
  FunnelIcon,
  CalendarDaysIcon,
  PresentationChartBarIcon,
  DocumentChartBarIcon,
  ClockIcon,
  ArrowPathIcon,
  CalendarIcon,
  XMarkIcon,
  TableCellsIcon,
  StarIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';

// Sample reports data - matching the customer details table structure
const reportsData = [
  {
    id: 1,
    type: 'مبيعات يومية',
    date: '2024-01-15',
    amount: 'EGP 15,420.50',
    status: 'مكتمل',
    invoice_count: 45,
    customer_count: 32
  },
  {
    id: 2,
    type: 'مردودات',
    date: '2024-01-15',
    amount: 'EGP -1,200.00',
    status: 'مراجعة',
    invoice_count: 3,
    customer_count: 2
  },
  {
    id: 3,
    type: 'مبيعات أسبوعية',
    date: '2024-01-14',
    amount: 'EGP 89,350.75',
    status: 'مكتمل',
    invoice_count: 287,
    customer_count: 156
  }
];

// Table columns for reports
const tableColumns = [
  { 
    id: 'index', 
    header: '#', 
    accessor: '#', 
    width: 60,
    visible: true,
    render: (value: any, item: any, index: number) => (
      <span className="text-gray-400 font-medium">{index + 1}</span>
    )
  },
  { 
    id: 'type', 
    header: 'نوع التقرير', 
    accessor: 'type', 
    width: 150,
    visible: true,
    render: (value: string) => <span className="text-white font-medium">{value}</span>
  },
  { 
    id: 'date', 
    header: 'التاريخ', 
    accessor: 'date', 
    width: 120,
    visible: true,
    render: (value: string) => <span className="text-gray-300">{value}</span>
  },
  { 
    id: 'amount', 
    header: 'المبلغ الإجمالي', 
    accessor: 'amount', 
    width: 150,
    visible: true,
    render: (value: string) => <span className="text-white font-medium">{value}</span>
  },
  { 
    id: 'status', 
    header: 'الحالة', 
    accessor: 'status', 
    width: 100,
    visible: true,
    render: (value: string) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        value === 'مكتمل' 
          ? 'bg-green-500/20 text-green-400' 
          : value === 'مراجعة'
          ? 'bg-yellow-500/20 text-yellow-400'
          : 'bg-gray-500/20 text-gray-400'
      }`}>
        {value}
      </span>
    )
  },
  { 
    id: 'invoice_count', 
    header: 'عدد الفواتير', 
    accessor: 'invoice_count', 
    width: 100,
    visible: true,
    render: (value: number) => <span className="text-gray-300">{value}</span>
  },
  { 
    id: 'customer_count', 
    header: 'عدد العملاء', 
    accessor: 'customer_count', 
    width: 100,
    visible: true,
    render: (value: number) => <span className="text-gray-300">{value}</span>
  }
];

// Table columns for customers report
const customersTableColumns = [
  {
    id: 'index',
    header: '#',
    accessor: '#',
    width: 60,
    visible: true,
    render: (value: any, item: any, index: number) => (
      <span className="text-gray-400 font-medium">{index + 1}</span>
    )
  },
  {
    id: 'customer_name',
    header: 'اسم العميل',
    accessor: 'customer_name',
    width: 180,
    visible: true,
    render: (value: string) => <span className="text-white font-medium">{value || 'غير محدد'}</span>
  },
  {
    id: 'category',
    header: 'الفئة',
    accessor: 'category',
    width: 100,
    visible: true,
    render: (value: string) => <span className="text-gray-300">{value || 'عام'}</span>
  },
  {
    id: 'rank',
    header: 'الرتبة',
    accessor: 'rank',
    width: 100,
    visible: true,
    render: (value: string) => <span className="text-gray-300">{value || 'برونزي'}</span>
  },
  {
    id: 'phone',
    header: 'رقم الهاتف',
    accessor: 'phone',
    width: 120,
    visible: true,
    render: (value: string) => <span className="text-gray-300 font-mono">{value || 'غير محدد'}</span>
  },
  {
    id: 'backup_phone',
    header: 'الاحتياطي',
    accessor: 'backup_phone',
    width: 120,
    visible: true,
    render: (value: string) => <span className="text-gray-300 font-mono">{value || 'غير محدد'}</span>
  },
  {
    id: 'city',
    header: 'المدينة',
    accessor: 'city',
    width: 100,
    visible: true,
    render: (value: string) => <span className="text-gray-300">{value || 'غير محدد'}</span>
  },
  {
    id: 'created_at',
    header: 'تاريخ الانشاء',
    accessor: 'created_at',
    width: 100,
    visible: true,
    render: (value: string) => {
      if (!value) return <span className="text-gray-400">غير محدد</span>;
      const date = new Date(value);
      return <span className="text-gray-300">{date.toLocaleDateString('ar-SA')}</span>;
    }
  },
  {
    id: 'invoice_count',
    header: 'عدد الفواتير',
    accessor: 'invoice_count',
    width: 100,
    visible: true,
    render: (value: number) => <span className="text-blue-400 font-medium">{value || 0}</span>
  },
  {
    id: 'total_amount',
    header: 'الإجمالي',
    accessor: 'total_amount',
    width: 120,
    visible: true,
    render: (value: number) => <span className="text-green-400 font-medium">EGP {(value || 0).toFixed(2)}</span>
  },
  {
    id: 'total_profit',
    header: 'الربح',
    accessor: 'total_profit',
    width: 120,
    visible: true,
    render: (value: number) => {
      const profit = value || 0;
      const colorClass = profit >= 0 ? 'text-green-400' : 'text-red-400';
      return <span className={`${colorClass} font-medium`}>EGP {profit.toFixed(2)}</span>;
    }
  }
];

// Table columns for categories report
const categoriesTableColumns = [
  {
    id: 'index',
    header: '#',
    accessor: '#',
    width: 60,
    visible: true,
    render: (value: any, item: any, index: number) => (
      <span className="text-gray-400 font-medium">{index + 1}</span>
    )
  },
  {
    id: 'category_name',
    header: 'اسم التصنيف',
    accessor: 'category_name',
    width: 200,
    visible: true,
    render: (value: string) => <span className="text-white font-medium">{value || 'غير محدد'}</span>
  },
  {
    id: 'total_quantity_sold',
    header: 'الكمية المباعة',
    accessor: 'total_quantity_sold',
    width: 120,
    visible: true,
    render: (value: number) => <span className="text-gray-300">{value || 0}</span>
  },
  {
    id: 'branch_name',
    header: 'الفرع',
    accessor: 'branch_name',
    width: 100,
    visible: true,
    render: (value: string) => <span className="text-gray-300">{value || 'جميع الفروع'}</span>
  },
  {
    id: 'total_sales_amount',
    header: 'الاجمالي',
    accessor: 'total_sales_amount',
    width: 120,
    visible: true,
    render: (value: number) => <span className="text-white font-medium">EGP {(value || 0).toFixed(2)}</span>
  },
  {
    id: 'products_count',
    header: 'عدد المنتجات',
    accessor: 'products_count',
    width: 100,
    visible: true,
    render: (value: number) => <span className="text-gray-300">{value || 0}</span>
  },
  {
    id: 'avg_price',
    header: 'متوسط السعر',
    accessor: 'avg_price',
    width: 100,
    visible: true,
    render: (value: number) => <span className="text-gray-300">EGP {(value || 0).toFixed(2)}</span>
  }
];

// Table columns for products report
const productsTableColumns = [
  { 
    id: 'index', 
    header: '#', 
    accessor: '#', 
    width: 60,
    visible: true,
    render: (value: any, item: any, index: number) => (
      <span className="text-gray-400 font-medium">{index + 1}</span>
    )
  },
  { 
    id: 'category_name', 
    header: 'المجموعة', 
    accessor: 'category_name', 
    width: 120,
    visible: true,
    render: (value: string) => <span className="text-white font-medium">{value || 'غير محدد'}</span>
  },
  { 
    id: 'product_name', 
    header: 'اسم المنتج', 
    accessor: 'product_name', 
    width: 200,
    visible: true,
    render: (value: string) => <span className="text-white font-medium">{value}</span>
  },
  { 
    id: 'total_quantity_sold', 
    header: 'الكمية', 
    accessor: 'total_quantity_sold', 
    width: 80,
    visible: true,
    render: (value: number) => <span className="text-gray-300">{value || 0}</span>
  },
  { 
    id: 'branch_name', 
    header: 'الفرع', 
    accessor: 'branch_name', 
    width: 100,
    visible: true,
    render: (value: string) => <span className="text-gray-300">{value || 'جميع الفروع'}</span>
  },
  { 
    id: 'total_sales_amount', 
    header: 'الاجمالي', 
    accessor: 'total_sales_amount', 
    width: 120,
    visible: true,
    render: (value: number) => <span className="text-white font-medium">EGP {(value || 0).toFixed(2)}</span>
  },
  { 
    id: 'current_sale_price', 
    header: 'سعر البيع', 
    accessor: 'current_sale_price', 
    width: 100,
    visible: true,
    render: (value: string) => <span className="text-gray-300">EGP {parseFloat(value || '0').toFixed(2)}</span>
  },
  {
    id: 'total_sale_price',
    header: 'إجمالي سعر البيع',
    accessor: 'total_sale_price',
    width: 150,
    render: (value: any, item: any) => {
      const price = parseFloat(item.current_sale_price || '0');
      const quantity = item.priceBreakdown?.get(price) || 0;
      const total = quantity * price;
      return (
        <span className="text-white">
          <span className="text-blue-400">{quantity}</span>
          <span className="text-gray-300">*</span>
          <span className="text-green-400">{price.toFixed(2)}</span>
          <span className="text-gray-300"> = </span>
          <span className="text-white">{total.toFixed(2)}</span>
        </span>
      );
    }
  },
  { 
    id: 'wholesale_price', 
    header: 'سعر الجملة', 
    accessor: 'wholesale_price', 
    width: 100,
    render: (value: string) => <span className="text-gray-300">EGP {parseFloat(value || '0').toFixed(2)}</span>
  },
  {
    id: 'total_wholesale_price',
    header: 'إجمالي سعر الجملة',
    accessor: 'total_wholesale_price',
    width: 150,
    render: (value: any, item: any) => {
      const price = parseFloat(item.wholesale_price || '0');
      const quantity = item.priceBreakdown?.get(price) || 0;
      const total = quantity * price;
      return (
        <span className="text-white">
          <span className="text-blue-400">{quantity}</span>
          <span className="text-gray-300">*</span>
          <span className="text-green-400">{price.toFixed(2)}</span>
          <span className="text-gray-300"> = </span>
          <span className="text-white">{total.toFixed(2)}</span>
        </span>
      );
    }
  },
  { 
    id: 'price1', 
    header: 'سعر 1', 
    accessor: 'price1', 
    width: 80,
    render: (value: string) => <span className="text-gray-300">EGP {parseFloat(value || '0').toFixed(2)}</span>
  },
  {
    id: 'total_price1',
    header: 'إجمالي سعر 1',
    accessor: 'total_price1',
    width: 150,
    render: (value: any, item: any) => {
      const price = parseFloat(item.price1 || '0');
      const quantity = item.priceBreakdown?.get(price) || 0;
      const total = quantity * price;
      return (
        <span className="text-white">
          <span className="text-blue-400">{quantity}</span>
          <span className="text-gray-300">*</span>
          <span className="text-green-400">{price.toFixed(2)}</span>
          <span className="text-gray-300"> = </span>
          <span className="text-white">{total.toFixed(2)}</span>
        </span>
      );
    }
  },
  { 
    id: 'price2', 
    header: 'سعر 2', 
    accessor: 'price2', 
    width: 80,
    render: (value: string) => <span className="text-gray-300">EGP {parseFloat(value || '0').toFixed(2)}</span>
  },
  {
    id: 'total_price2',
    header: 'إجمالي سعر 2',
    accessor: 'total_price2',
    width: 150,
    render: (value: any, item: any) => {
      const price = parseFloat(item.price2 || '0');
      const quantity = item.priceBreakdown?.get(price) || 0;
      const total = quantity * price;
      return (
        <span className="text-white">
          <span className="text-blue-400">{quantity}</span>
          <span className="text-gray-300">*</span>
          <span className="text-green-400">{price.toFixed(2)}</span>
          <span className="text-gray-300"> = </span>
          <span className="text-white">{total.toFixed(2)}</span>
        </span>
      );
    }
  },
  { 
    id: 'price3', 
    header: 'سعر 3', 
    accessor: 'price3', 
    width: 80,
    render: (value: string) => <span className="text-gray-300">EGP {parseFloat(value || '0').toFixed(2)}</span>
  },
  {
    id: 'total_price3',
    header: 'إجمالي سعر 3',
    accessor: 'total_price3',
    width: 150,
    render: (value: any, item: any) => {
      const price = parseFloat(item.price3 || '0');
      const quantity = item.priceBreakdown?.get(price) || 0;
      const total = quantity * price;
      return (
        <span className="text-white">
          <span className="text-blue-400">{quantity}</span>
          <span className="text-gray-300">*</span>
          <span className="text-green-400">{price.toFixed(2)}</span>
          <span className="text-gray-300"> = </span>
          <span className="text-white">{total.toFixed(2)}</span>
        </span>
      );
    }
  },
  { 
    id: 'price4', 
    header: 'سعر 4', 
    accessor: 'price4', 
    width: 80,
    render: (value: string) => <span className="text-gray-300">EGP {parseFloat(value || '0').toFixed(2)}</span>
  },
  {
    id: 'total_price4',
    header: 'إجمالي سعر 4',
    accessor: 'total_price4',
    width: 150,
    render: (value: any, item: any) => {
      const price = parseFloat(item.price4 || '0');
      const quantity = item.priceBreakdown?.get(price) || 0;
      const total = quantity * price;
      return (
        <span className="text-white">
          <span className="text-blue-400">{quantity}</span>
          <span className="text-gray-300">*</span>
          <span className="text-green-400">{price.toFixed(2)}</span>
          <span className="text-gray-300"> = </span>
          <span className="text-white">{total.toFixed(2)}</span>
        </span>
      );
    }
  }
];

function ReportsPageContent() {
  const { showToast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('main'); // 'main' or 'periodic'
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>({ type: 'all' });
  const [showReportsSidebar, setShowReportsSidebar] = useState(true);
  const [showProductsFilter, setShowProductsFilter] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [showCustomersFilter, setShowCustomersFilter] = useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [selectedCustomerGroupIds, setSelectedCustomerGroupIds] = useState<string[]>([]);
  const [showProductsReport, setShowProductsReport] = useState(false);
  const [productsReportData, setProductsReportData] = useState<any[]>([]);
  const [showCategoriesReport, setShowCategoriesReport] = useState(false);
  const [categoriesReportData, setCategoriesReportData] = useState<any[]>([]);
  const [showCustomersReport, setShowCustomersReport] = useState(false);
  const [customersReportData, setCustomersReportData] = useState<any[]>([]);
  const [totalSalesAmount, setTotalSalesAmount] = useState<string>('0.00');
  const [loading, setLoading] = useState(false);
  const [openTabs, setOpenTabs] = useState<{ id: string; title: string; active: boolean }[]>([
    { id: 'main', title: 'التقارير', active: true }
  ]);
  const [activeTab, setActiveTab] = useState<string>('main');
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [currentReportType, setCurrentReportType] = useState<string>('');
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  const handlePeriodicReportsClick = () => {
    setCurrentView('periodic');
  };

  const handleBackToMain = () => {
    setCurrentView('main');
  };


  // Enhanced column management with improved event handling
  const handleColumnsChange = async (updatedColumns: {id: string, header: string, visible: boolean}[]) => {
    const reportType = currentReportType === 'products' ? 'PRODUCTS_REPORT' :
                      currentReportType === 'categories' ? 'CATEGORIES_REPORT' :
                      currentReportType === 'customers' ? 'CUSTOMERS_REPORT' : 'MAIN_REPORT';
    const currentColumns = reportType === 'PRODUCTS_REPORT' ? productsTableColumns :
                          reportType === 'CATEGORIES_REPORT' ? categoriesTableColumns :
                          reportType === 'CUSTOMERS_REPORT' ? customersTableColumns : tableColumns;

    try {
      // Create visibility map from updated columns
      const visibilityMap: {[key: string]: boolean} = {};
      updatedColumns.forEach(col => {
        visibilityMap[col.id] = col.visible;
      });

      // Get current saved config to preserve existing settings
      const savedConfig = await loadTableConfig(reportType as 'MAIN_REPORT' | 'PRODUCTS_REPORT' | 'CATEGORIES_REPORT' | 'CUSTOMERS_REPORT');

      // Build complete column configuration preserving widths and order
      const allColumns = currentColumns.map((col, index) => {
        const savedCol = savedConfig?.columns.find(saved => saved.id === col.id);
        const updatedCol = updatedColumns.find(updated => updated.id === col.id);

        return {
          id: col.id,
          width: savedCol?.width || col.width || 100,
          visible: updatedCol ? updatedCol.visible : (savedCol?.visible !== false),
          order: savedCol?.order !== undefined ? savedCol.order : index
        };
      });

      // Save to database through hybrid storage
      await updateColumnVisibility(reportType as 'MAIN_REPORT' | 'PRODUCTS_REPORT' | 'CATEGORIES_REPORT' | 'CUSTOMERS_REPORT', visibilityMap, allColumns);

      const visibleCount = Object.values(visibilityMap).filter(Boolean).length;

      // Remove success toast to avoid UI clutter
      // showToast(
      //   `✅ تم حفظ إعدادات الأعمدة - ${visibleCount} عمود ظاهر`,
      //   'success',
      //   2000
      // );

      // Trigger immediate table refresh for column visibility changes
      if (typeof window !== 'undefined') {
        // Dispatch event with clear identification for visibility changes only
        window.dispatchEvent(new CustomEvent('tableConfigChanged', {
          detail: {
            reportType: reportType === 'PRODUCTS_REPORT' ? 'products' :
                       reportType === 'CATEGORIES_REPORT' ? 'categories' :
                       reportType === 'CUSTOMERS_REPORT' ? 'customers' : 'main',
            source: 'ColumnManagement',
            action: 'visibilityUpdate',
            visibleCount,
            timestamp: Date.now()
          }
        }));

      }

      // Close modal immediately
      setShowColumnsModal(false);

    } catch (error) {
      console.error('❌ Failed to save column visibility:', error);
      showToast('❌ فشل في حفظ إعدادات الأعمدة', 'error', 3000);
    }
  };


  // Prepare columns data for the modal based on saved config with async loading
  const getColumnsForModal = async (reportType: string) => {
    const columns = reportType === 'products' ? productsTableColumns :
                   reportType === 'categories' ? categoriesTableColumns :
                   reportType === 'customers' ? customersTableColumns : tableColumns;
    const configType = reportType === 'products' ? 'PRODUCTS_REPORT' :
                      reportType === 'categories' ? 'CATEGORIES_REPORT' :
                      reportType === 'customers' ? 'CUSTOMERS_REPORT' : 'MAIN_REPORT';

    try {
      const savedConfig = await loadTableConfig(configType as 'MAIN_REPORT' | 'PRODUCTS_REPORT' | 'CATEGORIES_REPORT' | 'CUSTOMERS_REPORT');

      return columns.map(col => {
        const savedCol = savedConfig?.columns.find(saved => saved.id === col.id);
        return {
          id: col.id,
          header: col.header,
          visible: savedCol?.visible !== false // Default to true if not found
        };
      });
    } catch (error) {
      console.error('Failed to load columns for modal:', error);
      // Return default configuration
      return columns.map(col => ({
        id: col.id,
        header: col.header,
        visible: true
      }));
    }
  };


  // Tab management functions
  const addTab = (id: string, title: string) => {
    const existingTab = openTabs.find(tab => tab.id === id);
    if (!existingTab) {
      setOpenTabs(prev => [
        ...prev.map(tab => ({ ...tab, active: false })),
        { id, title, active: true }
      ]);
    } else {
      setOpenTabs(prev => prev.map(tab => ({
        ...tab,
        active: tab.id === id
      })));
    }
    setActiveTab(id);
  };

  const closeTab = (tabId: string) => {
    if (tabId === 'main') return; // Can't close main tab
    
    const newTabs = openTabs.filter(tab => tab.id !== tabId);
    setOpenTabs(newTabs);
    
    if (activeTab === tabId) {
      const lastTab = newTabs[newTabs.length - 1];
      const newActiveTab = lastTab?.id || 'main';
      setActiveTab(newActiveTab);
      setShowProductsReport(newActiveTab === 'products');
      
      // Clear products data if closing products tab
      if (tabId === 'products') {
        setProductsReportData([]);
      }
    }
  };

  const switchTab = (tabId: string) => {
    setOpenTabs(prev => prev.map(tab => ({
      ...tab,
      active: tab.id === tabId
    })));
    setActiveTab(tabId);
    
    // Update legacy showProductsReport state for compatibility
    setShowProductsReport(tabId === 'products');
    setShowCategoriesReport(tabId === 'categories');
    setShowCustomersReport(tabId === 'customers');
  };

  const openProductsReport = () => {
    // Check if products tab already exists
    const productsTabExists = openTabs.some(tab => tab.id === 'products');

    if (!productsTabExists) {
      // Add products tab
      setOpenTabs(prev => [
        ...prev.map(tab => ({ ...tab, active: false })),
        { id: 'products', title: 'الأصناف', active: true }
      ]);
      setActiveTab('products');
      setShowProductsReport(true);
      fetchProductsReport();
    } else {
      // Switch to existing products tab
      switchTab('products');
    }
  };

  const openCategoriesReport = () => {
    // Check if categories tab already exists
    const categoriesTabExists = openTabs.some(tab => tab.id === 'categories');

    if (!categoriesTabExists) {
      // Add categories tab
      setOpenTabs(prev => [
        ...prev.map(tab => ({ ...tab, active: false })),
        { id: 'categories', title: 'التصنيفات الرئيسية', active: true }
      ]);
      setActiveTab('categories');
      setShowCategoriesReport(true);
      fetchCategoriesReport();
    } else {
      // Switch to existing categories tab
      switchTab('categories');
    }
  };

  const openCustomersReport = () => {
    // Check if customers tab already exists
    const customersTabExists = openTabs.some(tab => tab.id === 'customers');

    if (!customersTabExists) {
      // Add customers tab
      setOpenTabs(prev => [
        ...prev.map(tab => ({ ...tab, active: false })),
        { id: 'customers', title: 'العملاء', active: true }
      ]);
      setActiveTab('customers');
      setShowCustomersReport(true);
      fetchCustomersReport();
    } else {
      // Switch to existing customers tab
      switchTab('customers');
    }
  };

  // Initialize system and load preferences on component mount
  useEffect(() => {
    // System health check and initialization
    const initializeSystem = async () => {
      try {
        // Check system status
        const systemStatus = await hybridTableStorage.getSystemStatus();

        // Health check with user feedback
        const healthCheck = await databaseSettingsService.healthCheck();
        if (!healthCheck.isHealthy) {
          if (healthCheck.errors.length > 0) {
            showToast('⚠️ نظام الإعدادات يعمل في الوضع الاحتياطي', 'info', 2000);
          }
        }

        // Flush any pending saves from previous sessions
        await hybridTableStorage.flushPendingSaves();

      } catch (error) {
        console.error('❌ System initialization failed:', error);
      }
    };

    // Calculate total sales
    const fetchTotalSales = async () => {
      try {
        const { data, error } = await supabase
          .from('sale_items')
          .select(`
            quantity,
            unit_price,
            sales!inner(created_at)
          `)
          .gte('sales.created_at', '2024-01-01');

        if (error) {
          console.error('❌ Error fetching total sales:', error);
          return;
        }

        const total = data?.reduce((sum: number, item: any) => {
          const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
          return sum + lineTotal;
        }, 0) || 0;

        setTotalSalesAmount(total.toFixed(2));
      } catch (error) {
        console.error('❌ Error calculating total sales:', error);
      }
    };

    // Initialize both systems
    initializeSystem();
    fetchTotalSales();

    // Cleanup function
    return () => {
      // Flush any pending saves on unmount
      hybridTableStorage.flushPendingSaves().catch(console.error);
    };
  }, []); // Empty dependency array for mount-only effect
  
  // Function to fetch customers report data with accurate profit calculation
  const fetchCustomersReport = async () => {
    setLoading(true);
    try {
      // Get customers with their group information
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select(`
          id,
          name,
          phone,
          backup_phone,
          city,
          category,
          rank,
          created_at,
          customer_groups(name)
        `)
        .eq('is_active', true);

      if (customersError) {
        console.error('Error fetching customers:', customersError);
        alert(`خطأ في جلب بيانات العملاء: ${customersError.message}`);
        return;
      }

      // Get sales data with detailed items for accurate profit calculation
      let salesQuery = supabase
        .from('sales')
        .select(`
          id,
          customer_id,
          total_amount,
          created_at,
          sale_items(
            id,
            quantity,
            unit_price,
            cost_price
          )
        `);

      // Apply date filters
      if (dateFilter.type === 'today') {
        const today = new Date().toISOString().split('T')[0];
        salesQuery = salesQuery.gte('created_at', today + 'T00:00:00');
      } else if (dateFilter.type === 'current_week') {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        salesQuery = salesQuery.gte('created_at', weekStart.toISOString());
      } else if (dateFilter.type === 'current_month') {
        const monthStart = new Date();
        monthStart.setDate(1);
        salesQuery = salesQuery.gte('created_at', monthStart.toISOString());
      } else if (dateFilter.type === 'custom' && dateFilter.startDate && dateFilter.endDate) {
        salesQuery = salesQuery
          .gte('created_at', dateFilter.startDate.toISOString())
          .lte('created_at', dateFilter.endDate.toISOString());
      } else {
        // Default to all time
        salesQuery = salesQuery.gte('created_at', '2024-01-01T00:00:00');
      }

      const { data: salesData, error: salesError } = await salesQuery;

      if (salesError) {
        console.error('Error fetching sales data:', salesError);
        alert(`خطأ في جلب بيانات المبيعات: ${salesError.message}`);
        return;
      }

      // Process data to calculate customer statistics with accurate profit
      const customerMap = new Map();

      // Initialize all customers with zero values
      customersData?.forEach((customer: any) => {
        customerMap.set(customer.id, {
          customer_id: customer.id,
          customer_name: customer.name,
          phone: customer.phone,
          backup_phone: customer.backup_phone,
          city: customer.city,
          category: customer.category,
          rank: customer.rank,
          created_at: customer.created_at,
          invoice_count: 0,
          total_amount: 0,
          total_profit: 0
        });
      });

      // Calculate sales statistics for each customer
      salesData?.forEach((sale: any) => {
        if (!sale.customer_id || !customerMap.has(sale.customer_id)) return;

        const customerStats = customerMap.get(sale.customer_id);
        customerStats.invoice_count += 1;
        customerStats.total_amount += parseFloat(sale.total_amount) || 0;

        // Calculate accurate profit from sale items
        // Profit = (unit_price - cost_price) * quantity for each item
        if (sale.sale_items && Array.isArray(sale.sale_items)) {
          sale.sale_items.forEach((item: any) => {
            const quantity = item.quantity || 0;
            const unitPrice = parseFloat(item.unit_price) || 0;
            const costPrice = parseFloat(item.cost_price) || 0;

            // Calculate profit per item: (selling price - cost price) × quantity
            const itemProfit = (unitPrice - costPrice) * quantity;
            customerStats.total_profit += itemProfit;
          });
        }
      });

      // Convert map to array and sort by total amount (highest first)
      const processedData = Array.from(customerMap.values()).sort((a, b) =>
        b.total_amount - a.total_amount
      );

      setCustomersReportData(processedData);

      // Update total sales amount to match the filtered customers
      const filteredTotal = processedData.reduce((sum, customer) =>
        sum + (customer.total_amount || 0), 0
      );
      setTotalSalesAmount(filteredTotal.toFixed(2));

    } catch (error) {
      console.error('Error fetching customers report:', error);
      alert('حدث خطأ أثناء جلب تقرير العملاء');
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch categories report data
  const fetchCategoriesReport = async () => {
    setLoading(true);
    try {
      let salesQuery = supabase
        .from('sale_items')
        .select(`
          product_id,
          quantity,
          unit_price,
          products(
            id,
            name,
            price,
            categories(
              id,
              name
            )
          ),
          sales(
            branch_id,
            created_at,
            branches(name)
          )
        `);

      // Apply date filters
      if (dateFilter.type === 'today') {
        const today = new Date().toISOString().split('T')[0];
        salesQuery = salesQuery.gte('sales.created_at', today + 'T00:00:00');
      } else if (dateFilter.type === 'current_week') {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        salesQuery = salesQuery.gte('sales.created_at', weekStart.toISOString());
      } else if (dateFilter.type === 'current_month') {
        const monthStart = new Date();
        monthStart.setDate(1);
        salesQuery = salesQuery.gte('sales.created_at', monthStart.toISOString());
      } else if (dateFilter.type === 'custom' && dateFilter.startDate && dateFilter.endDate) {
        salesQuery = salesQuery
          .gte('sales.created_at', dateFilter.startDate.toISOString())
          .lte('sales.created_at', dateFilter.endDate.toISOString());
      } else {
        salesQuery = salesQuery.gte('sales.created_at', '2024-01-01T00:00:00');
      }

      const { data: salesData, error: salesError } = await salesQuery;

      if (salesError) {
        console.error('Error fetching sales data:', salesError);
        alert(`خطأ في جلب البيانات: ${salesError.message}`);
        return;
      }

      // Process the data to aggregate by category
      const categoryMap = new Map();

      salesData?.forEach((saleItem: any) => {
        const product = saleItem.products;
        const category = product?.categories;
        const branch = saleItem.sales?.branches;
        const quantity = saleItem.quantity || 0;
        const unitPrice = parseFloat(saleItem.unit_price) || 0;
        const totalAmount = quantity * unitPrice;

        const categoryId = category?.id || 'uncategorized';
        const categoryName = category?.name || 'غير محدد';

        if (categoryMap.has(categoryId)) {
          const existing = categoryMap.get(categoryId);
          existing.total_quantity_sold += quantity;
          existing.total_sales_amount += totalAmount;
          existing.products_count = existing.products_count || new Set();
          existing.products_count.add(product?.id);
          existing.prices = existing.prices || [];
          existing.prices.push(unitPrice);
        } else {
          const productsSet = new Set();
          productsSet.add(product?.id);

          categoryMap.set(categoryId, {
            category_id: categoryId,
            category_name: categoryName,
            branch_name: branch?.name || 'غير محدد',
            total_quantity_sold: quantity,
            total_sales_amount: totalAmount,
            products_count: productsSet,
            prices: [unitPrice]
          });
        }
      });

      const processedData = Array.from(categoryMap.values()).map(category => ({
        ...category,
        products_count: category.products_count.size,
        avg_price: category.prices.length > 0 ?
          category.prices.reduce((sum: number, price: number) => sum + price, 0) / category.prices.length : 0
      })).sort((a, b) => b.total_quantity_sold - a.total_quantity_sold);

      setCategoriesReportData(processedData);

      // Update the total sales amount to match the filtered categories
      const filteredTotal = processedData.reduce((sum, category) => sum + (category.total_sales_amount || 0), 0);
      setTotalSalesAmount(filteredTotal.toFixed(2));
    } catch (error) {
      console.error('Error fetching categories report:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch products report data
  const fetchProductsReport = async () => {
    setLoading(true);
    try {
      let salesQuery = supabase
        .from('sale_items')
        .select(`
          product_id,
          quantity,
          unit_price,
          products(
            id,
            name,
            price,
            wholesale_price,
            price1,
            price2,
            price3,
            price4,
            categories(name)
          ),
          sales(
            branch_id,
            created_at,
            branches(name)
          )
        `);
        
      // Apply date filters
      if (dateFilter.type === 'today') {
        const today = new Date().toISOString().split('T')[0];
        salesQuery = salesQuery.gte('sales.created_at', today + 'T00:00:00');
      } else if (dateFilter.type === 'current_week') {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        salesQuery = salesQuery.gte('sales.created_at', weekStart.toISOString());
      } else if (dateFilter.type === 'current_month') {
        const monthStart = new Date();
        monthStart.setDate(1);
        salesQuery = salesQuery.gte('sales.created_at', monthStart.toISOString());
      } else if (dateFilter.type === 'custom' && dateFilter.startDate && dateFilter.endDate) {
        salesQuery = salesQuery
          .gte('sales.created_at', dateFilter.startDate.toISOString())
          .lte('sales.created_at', dateFilter.endDate.toISOString());
      } else {
        salesQuery = salesQuery.gte('sales.created_at', '2024-01-01T00:00:00');
      }
      
      const { data: salesData, error: salesError } = await salesQuery;

      if (salesError) {
        console.error('Error fetching sales data:', salesError);
        alert(`خطأ في جلب البيانات: ${salesError.message}`);
        return;
      }

      // Process the data to aggregate by product
      const productMap = new Map();

      salesData?.forEach((saleItem: any) => {
        const productId = saleItem.product_id;
        const product = saleItem.products;
        const branch = saleItem.sales?.branches;
        const quantity = saleItem.quantity || 0;
        const unitPrice = parseFloat(saleItem.unit_price) || 0;
        const totalAmount = quantity * unitPrice;

        if (productMap.has(productId)) {
          const existing = productMap.get(productId);
          existing.total_quantity_sold += quantity;
          existing.total_sales_amount += totalAmount;

          // Track quantities by actual selling price
          if (!existing.priceBreakdown) {
            existing.priceBreakdown = new Map();
          }
          const currentQty = existing.priceBreakdown.get(unitPrice) || 0;
          existing.priceBreakdown.set(unitPrice, currentQty + quantity);
        } else {
          // Initialize price breakdown
          const priceBreakdown = new Map();
          priceBreakdown.set(unitPrice, quantity);

          productMap.set(productId, {
            product_id: productId,
            product_name: product?.name || 'منتج غير محدد',
            category_name: product?.categories?.name || 'غير محدد',
            branch_name: branch?.name || 'غير محدد',
            total_quantity_sold: quantity,
            total_sales_amount: totalAmount,
            current_sale_price: product?.price || '0.00',
            wholesale_price: product?.wholesale_price || '0.00',
            price1: product?.price1 || '0.00',
            price2: product?.price2 || '0.00',
            price3: product?.price3 || '0.00',
            price4: product?.price4 || '0.00',
            priceBreakdown: priceBreakdown
          });
        }
      });
      
      const processedData = Array.from(productMap.values())
        .sort((a, b) => b.total_quantity_sold - a.total_quantity_sold);
      
      setProductsReportData(processedData);
      
      // Update the total sales amount to match the filtered products
      const filteredTotal = processedData.reduce((sum, product) => sum + (product.total_sales_amount || 0), 0);
      setTotalSalesAmount(filteredTotal.toFixed(2));
    } catch (error) {
      console.error('Error fetching products report:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleProductsReportClick = () => {
    addTab('products', 'الأصناف');
    setShowProductsReport(true);
    fetchProductsReport();
  };

  const handleCategoriesReportClick = () => {
    addTab('categories', 'التصنيفات الرئيسية');
    setShowCategoriesReport(true);
    fetchCategoriesReport();
  };

  const handleCustomersReportClick = () => {
    addTab('customers', 'العملاء');
    setShowCustomersReport(true);
    fetchCustomersReport();
  };
  
  const handleBackToMainReports = async () => {
    switchTab('main');
    setShowProductsReport(false);
    setShowCategoriesReport(false);
    setShowCustomersReport(false);
    setProductsReportData([]);
    setCategoriesReportData([]);
    setCustomersReportData([]);
    
    // Restore the original total sales amount
    try {
      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          quantity,
          unit_price,
          sales!inner(created_at)
        `)
        .gte('sales.created_at', '2024-01-01');
      
      if (!error && data) {
        const total = data.reduce((sum: number, item: any) => {
          const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
          return sum + lineTotal;
        }, 0);
        
        setTotalSalesAmount(total.toFixed(2));
      }
    } catch (error) {
      console.error('Error restoring total sales:', error);
    }
  };

  return (
    <div className="h-screen bg-[#2B3544] overflow-hidden">
      {/* Top Header */}
      <TopHeader onMenuClick={toggleSidebar} isMenuOpen={isSidebarOpen} />
      
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      
      {/* Main Content Container */}
      <div className="h-full pt-12 overflow-hidden flex flex-col">
        
        {/* Top Action Buttons Toolbar - Full Width */}
        <div className="bg-[#374151] border-b border-gray-600 px-4 py-2 w-full">
          <div className="flex items-center justify-start gap-1 overflow-x-auto scrollbar-hide">
            <button 
              onClick={() => setCurrentView('main')}
              className={`flex flex-col items-center p-2 cursor-pointer min-w-[80px] ${
                currentView === 'main' 
                  ? 'text-blue-400 bg-blue-500/10' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <DocumentTextIcon className="h-5 w-5 mb-1" />
              <span className="text-sm">التقارير</span>
            </button>

            <button className="flex flex-col items-center p-2 text-gray-300 hover:text-white cursor-pointer min-w-[80px]">
              <ArrowsUpDownIcon className="h-5 w-5 mb-1" />
              <span className="text-sm">ترتيب</span>
            </button>

            <button className="flex flex-col items-center p-2 text-gray-300 hover:text-white cursor-pointer min-w-[80px]">
              <DocumentArrowDownIcon className="h-5 w-5 mb-1" />
              <span className="text-sm">تصدير</span>
            </button>

            <button 
              onClick={openProductsReport}
              className={`flex flex-col items-center p-2 cursor-pointer min-w-[80px] ${
                selectedProductIds.length > 0 || selectedCategoryIds.length > 0
                  ? 'text-green-400 bg-green-500/10'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <FunnelIcon className="h-5 w-5 mb-1" />
              <span className="text-sm">المنتجات</span>
              {(selectedProductIds.length > 0 || selectedCategoryIds.length > 0) && (
                <span className="text-xs bg-green-500/20 text-green-400 px-1 rounded">
                  {selectedProductIds.length + selectedCategoryIds.length}
                </span>
              )}
            </button>

            <button 
              onClick={() => setShowCustomersFilter(true)}
              className={`flex flex-col items-center p-2 cursor-pointer min-w-[80px] ${
                selectedCustomerIds.length > 0 || selectedCustomerGroupIds.length > 0
                  ? 'text-green-400 bg-green-500/10'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <UserGroupIcon className="h-5 w-5 mb-1" />
              <span className="text-sm">العملاء</span>
              {(selectedCustomerIds.length > 0 || selectedCustomerGroupIds.length > 0) && (
                <span className="text-xs bg-green-500/20 text-green-400 px-1 rounded">
                  {selectedCustomerIds.length + selectedCustomerGroupIds.length}
                </span>
              )}
            </button>

            <button 
              onClick={() => setShowDateFilter(true)}
              className="flex flex-col items-center p-2 text-gray-300 hover:text-white cursor-pointer min-w-[80px]"
            >
              <CalendarDaysIcon className="h-5 w-5 mb-1" />
              <span className="text-sm">تواريخ</span>
            </button>

            <button className="flex flex-col items-center p-2 text-gray-300 hover:text-white cursor-pointer min-w-[80px]">
              <FunnelIcon className="h-5 w-5 mb-1" />
              <span className="text-sm">فروع ومخازن</span>
            </button>

            <button className="flex flex-col items-center p-2 text-gray-300 hover:text-white cursor-pointer min-w-[80px]">
              <PresentationChartBarIcon className="h-5 w-5 mb-1" />
              <span className="text-sm">عرض بياني</span>
            </button>

            <button className="flex flex-col items-center p-2 text-gray-300 hover:text-white cursor-pointer min-w-[80px]">
              <PrinterIcon className="h-5 w-5 mb-1" />
              <span className="text-sm">طباعة</span>
            </button>

            <button className="flex flex-col items-center p-2 text-gray-300 hover:text-white cursor-pointer min-w-[80px]">
              <DocumentChartBarIcon className="h-5 w-5 mb-1" />
              <span className="text-sm">تقرير مفصل</span>
            </button>


            <button 
              onClick={handlePeriodicReportsClick}
              className={`flex flex-col items-center p-2 cursor-pointer min-w-[80px] ${
                currentView === 'periodic' 
                  ? 'text-blue-400 bg-blue-500/10' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <ClockIcon className="h-5 w-5 mb-1" />
              <span className="text-sm">تقارير دورية</span>
            </button>

            <button className="flex flex-col items-center p-2 text-gray-300 hover:text-white cursor-pointer min-w-[80px]">
              <ArrowPathIcon className="h-5 w-5 mb-1" />
              <span className="text-sm">تحديث</span>
            </button>
          </div>
        </div>

        {/* Content Area with Sidebar and Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {currentView === 'periodic' ? (
            /* Periodic Reports Content */
            <div className="flex-1 p-4 overflow-y-auto scrollbar-hide">
              {/* Top Summary Cards */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                {/* Card 1 - Products Sold */}
                <div className="bg-[#374151] rounded-lg border border-gray-600 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-right">
                      <div className="text-3xl font-bold text-white mb-1">3,456</div>
                      <div className="text-red-400 text-sm font-medium">2.1%-</div>
                    </div>
                    <div className="p-3 bg-orange-500/20 rounded-lg">
                      <ArchiveBoxIcon className="h-8 w-8 text-orange-400" />
                    </div>
                  </div>
                  <div className="text-gray-300 text-sm text-right">المنتجات المباعة</div>
                </div>

                {/* Card 2 - Active Customers */}
                <div className="bg-[#374151] rounded-lg border border-gray-600 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-right">
                      <div className="text-3xl font-bold text-white mb-1">892</div>
                      <div className="text-green-400 text-sm font-medium">+15.2%</div>
                    </div>
                    <div className="p-3 bg-purple-500/20 rounded-lg">
                      <UserGroupIcon className="h-8 w-8 text-purple-400" />
                    </div>
                  </div>
                  <div className="text-gray-300 text-sm text-right">العملاء النشطون</div>
                </div>

                {/* Card 3 - Invoice Count */}
                <div className="bg-[#374151] rounded-lg border border-gray-600 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-right">
                      <div className="text-3xl font-bold text-white mb-1">1,234</div>
                      <div className="text-green-400 text-sm font-medium">+8.3%</div>
                    </div>
                    <div className="p-3 bg-blue-500/20 rounded-lg">
                      <ShoppingCartIcon className="h-8 w-8 text-blue-400" />
                    </div>
                  </div>
                  <div className="text-gray-300 text-sm text-right">عدد الفواتير</div>
                </div>

                {/* Card 4 - Total Sales */}
                <div className="bg-[#374151] rounded-lg border border-gray-600 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-right">
                      <div className="text-3xl font-bold text-white mb-1">₾ 45,230.50</div>
                      <div className="text-green-400 text-sm font-medium">+12.5%</div>
                    </div>
                    <div className="p-3 bg-green-500/20 rounded-lg">
                      <CurrencyDollarIcon className="h-8 w-8 text-green-400" />
                    </div>
                  </div>
                  <div className="text-gray-300 text-sm text-right">إجمالي المبيعات</div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-2 gap-4 h-64">
                {/* Category Distribution */}
                <div className="bg-[#374151] rounded-lg border border-gray-600 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white text-lg font-semibold text-right">توزيع الفئات</h3>
                    <ArchiveBoxIcon className="h-6 w-6 text-green-400" />
                  </div>
                  
                  <div className="flex h-full">
                    {/* Categories List */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between text-right">
                        <div className="text-white font-semibold">35%</div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-300 text-sm">الإلكترونيات</span>
                          <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-right">
                        <div className="text-white font-semibold">25%</div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-300 text-sm">الملابس</span>
                          <div className="w-3 h-3 rounded-full bg-green-400"></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-right">
                        <div className="text-white font-semibold">20%</div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-300 text-sm">المواد الغذائية</span>
                          <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-right">
                        <div className="text-white font-semibold">12%</div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-300 text-sm">الكتب</span>
                          <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-right">
                        <div className="text-white font-semibold">8%</div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-300 text-sm">أخرى</span>
                          <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                        </div>
                      </div>
                    </div>

                    {/* Compact Donut Chart */}
                    <div className="w-32 h-32 relative flex items-center justify-center">
                      <svg className="w-32 h-32 -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="12"
                          strokeDasharray="123 227"
                          strokeDashoffset="0"
                          className="transition-all duration-500"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="12"
                          strokeDasharray="88 262"
                          strokeDashoffset="-123"
                          className="transition-all duration-500"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          fill="none"
                          stroke="#F59E0B"
                          strokeWidth="12"
                          strokeDasharray="70 280"
                          strokeDashoffset="-211"
                          className="transition-all duration-500"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          fill="none"
                          stroke="#EF4444"
                          strokeWidth="12"
                          strokeDasharray="42 308"
                          strokeDashoffset="-281"
                          className="transition-all duration-500"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          fill="none"
                          stroke="#8B5CF6"
                          strokeWidth="12"
                          strokeDasharray="28 322"
                          strokeDashoffset="-323"
                          className="transition-all duration-500"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Weekly Sales */}
                <div className="bg-[#374151] rounded-lg border border-gray-600 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white text-lg font-semibold text-right">مبيعات الأسبوع</h3>
                    <ChartBarIcon className="h-6 w-6 text-blue-400" />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="text-white text-sm font-medium min-w-[50px] text-right">₾ 6,800</div>
                      <div className="flex-1 bg-gray-600 rounded-full h-6 relative">
                        <div className="h-6 bg-blue-500 rounded-full" style={{ width: '74%' }}></div>
                      </div>
                      <div className="text-gray-300 text-sm min-w-[50px] text-right">السبت</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-white text-sm font-medium min-w-[50px] text-right">₾ 7,200</div>
                      <div className="flex-1 bg-gray-600 rounded-full h-6 relative">
                        <div className="h-6 bg-blue-500 rounded-full" style={{ width: '78%' }}></div>
                      </div>
                      <div className="text-gray-300 text-sm min-w-[50px] text-right">الأحد</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-white text-sm font-medium min-w-[50px] text-right">₾ 5,600</div>
                      <div className="flex-1 bg-gray-600 rounded-full h-6 relative">
                        <div className="h-6 bg-blue-500 rounded-full" style={{ width: '61%' }}></div>
                      </div>
                      <div className="text-gray-300 text-sm min-w-[50px] text-right">الاثنين</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-white text-sm font-medium min-w-[50px] text-right">₾ 8,100</div>
                      <div className="flex-1 bg-gray-600 rounded-full h-6 relative">
                        <div className="h-6 bg-blue-500 rounded-full" style={{ width: '88%' }}></div>
                      </div>
                      <div className="text-gray-300 text-sm min-w-[50px] text-right">الثلاثاء</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-white text-sm font-medium min-w-[50px] text-right">₾ 7,500</div>
                      <div className="flex-1 bg-gray-600 rounded-full h-6 relative">
                        <div className="h-6 bg-blue-500 rounded-full" style={{ width: '82%' }}></div>
                      </div>
                      <div className="text-gray-300 text-sm min-w-[50px] text-right">الأربعاء</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-white text-sm font-medium min-w-[50px] text-right">₾ 9,200</div>
                      <div className="flex-1 bg-gray-600 rounded-full h-6 relative">
                        <div className="h-6 bg-green-500 rounded-full" style={{ width: '100%' }}></div>
                      </div>
                      <div className="text-gray-300 text-sm min-w-[50px] text-right">الخميس</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-white text-sm font-medium min-w-[50px] text-right">₾ 8,900</div>
                      <div className="flex-1 bg-gray-600 rounded-full h-6 relative">
                        <div className="h-6 bg-blue-500 rounded-full" style={{ width: '97%' }}></div>
                      </div>
                      <div className="text-gray-300 text-sm min-w-[50px] text-right">الجمعة</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Main Reports View */
            <>
              {/* Toggle Button */}
              <div className="flex">
                <button
                  onClick={() => setShowReportsSidebar(!showReportsSidebar)}
                  className="w-6 bg-[#374151] hover:bg-[#4B5563] border-l border-gray-600 flex items-center justify-center transition-colors duration-200"
                  title={showReportsSidebar ? 'إخفاء الشريط الجانبي' : 'إظهار الشريط الجانبي'}
                >
                  {showReportsSidebar ? (
                    <ChevronLeftIcon className="h-4 w-4 text-gray-300" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4 text-gray-300" />
                  )}
                </button>
              </div>

              {/* Right Sidebar */}
              {showReportsSidebar && (
                <div className="w-80 bg-[#3B4754] border-r border-gray-600 flex flex-col overflow-hidden">
                  {/* Normal Sidebar Content */}
                  <>
                      {/* Balance Section */}
                      <div className="p-3 border-b border-gray-600 flex-shrink-0">
                        <div className="bg-blue-600 rounded-lg p-3 text-center text-white">
                          <div className="text-xl font-bold mb-1">EGP {totalSalesAmount}</div>
                          <div className="text-xs opacity-90">{showProductsReport ? 'إجمالي المبيعات' : 'رصيد الحساب'}</div>
                        </div>
                      </div>

                      {/* Report Information - Scrollable */}
                      <div className="flex-1 overflow-y-auto scrollbar-hide">
                        {selectedReport && (
                          <div className="p-3 border-b border-gray-600">
                            <h3 className="text-white font-medium mb-2 text-right">معلومات التقرير</h3>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-white">{selectedReport.type}</span>
                                <span className="text-gray-400">نوع التقرير</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-white">{selectedReport.date}</span>
                                <span className="text-gray-400">تاريخ التقرير</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-white">{selectedReport.amount}</span>
                                <span className="text-gray-400">المبلغ الإجمالي</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-white">{selectedReport.invoice_count}</span>
                                <span className="text-gray-400">عدد الفواتير</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Summary Statistics */}
                        <div className="p-3 border-b border-gray-600">
                          <h3 className="text-white font-medium mb-2 text-right">إحصائيات التقرير</h3>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-white">1</span>
                              <span className="text-gray-400">عدد التقارير</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-white">EGP 480.00</span>
                              <span className="text-gray-400">إجمالي المشتريات</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-white">EGP 480.00</span>
                              <span className="text-gray-400">متوسط قيمة الطلبية</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-white">7/15/2025</span>
                              <span className="text-gray-400">آخر تحديث</span>
                            </div>
                          </div>
                        </div>

                        {/* Message Area */}
                        <div className="p-3 text-center text-gray-500 text-sm">
                          {selectedReport ? 'تفاصيل إضافية للتقرير المحدد' : 'اختر تقريراً لعرض التفاصيل'}
                        </div>
                      </div>

                      {/* Date Filter Button - Fixed at Bottom */}
                      <div className="p-2 border-t border-gray-600 flex-shrink-0 bg-[#3B4754]">
                        <button
                          onClick={() => setShowDateFilter(true)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded font-medium flex items-center justify-center gap-2 transition-colors text-sm"
                        >
                          <CalendarDaysIcon className="h-4 w-4" />
                          <span>التاريخ</span>
                        </button>

                        {/* Current Filter Display */}
                        {dateFilter.type !== 'all' && (
                          <div className="mt-1.5 text-center">
                            <span className="text-xs text-blue-400 break-words leading-tight">
                              {dateFilter.type === 'today' && 'عرض تقارير اليوم'}
                              {dateFilter.type === 'current_week' && 'عرض تقارير الأسبوع الحالي'}
                              {dateFilter.type === 'last_week' && 'عرض تقارير الأسبوع الماضي'}
                              {dateFilter.type === 'current_month' && 'عرض تقارير الشهر الحالي'}
                              {dateFilter.type === 'last_month' && 'عرض تقارير الشهر الماضي'}
                              {dateFilter.type === 'custom' && dateFilter.startDate && dateFilter.endDate &&
                                <span className="break-words">{`من ${dateFilter.startDate.toLocaleDateString('ar-SA')} إلى ${dateFilter.endDate.toLocaleDateString('ar-SA')}`}</span>}
                            </span>
                          </div>
                        )}
                      </div>
                  </>
                </div>
              )}

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tabs Bar - Only for table area, not sidebar */}
                <div className="bg-[#374151] border-b border-gray-600 flex-shrink-0">
                  <div className="flex items-center overflow-x-auto scrollbar-hide">
                    {openTabs.map((tab) => (
                      <div key={tab.id} className={`flex items-center border-r border-gray-600 ${
                        tab.active
                          ? 'bg-[#2B3544] text-white border-b-2 border-blue-400'
                          : 'text-gray-300 hover:text-white hover:bg-[#4B5563]'
                      }`}>
                        <button
                          onClick={() => switchTab(tab.id)}
                          className="px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors"
                        >
                          {tab.id === 'main' && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          )}
                          <span>{tab.title}</span>
                        </button>

                        {/* Column Manager Button - Only for non-main tabs */}
                        {tab.id !== 'main' && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setCurrentReportType(tab.id === 'main' ? 'main' : tab.id);
                              setShowColumnsModal(true);
                            }}
                            className="ml-1 p-1 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                            title="إدارة الأعمدة"
                          >
                            <TableCellsIcon className="w-4 h-4" />
                          </button>
                        )}

                        {/* Close Tab Button - Only for non-main tabs */}
                        {tab.id !== 'main' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              closeTab(tab.id);
                            }}
                            className="ml-1 p-1 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="إغلاق"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Table Container */}
                <div className="flex-1 overflow-hidden bg-[#2B3544]">
                  {activeTab === 'products' ? (
                    <>
                      {loading && (
                        <div className="flex items-center justify-center h-32">
                          <div className="text-white">جاري تحميل البيانات...</div>
                        </div>
                      )}
                      {!loading && (
                        <>
                          <ResizableTable
                            className="h-full w-full"
                            columns={productsTableColumns}
                            data={productsReportData}
                            selectedRowId={null}
                            reportType="PRODUCTS_REPORT"
                            showToast={showToast}
                            onRowClick={(product, index) => {
                              // Handle product row click
                            }}
                            onRowDoubleClick={(product, index) => {
                              // Handle double click if needed
                            }}
                          />
                        </>
                      )}
                    </>
                  ) : activeTab === 'categories' ? (
                    <>
                      {loading && (
                        <div className="flex items-center justify-center h-32">
                          <div className="text-white">جاري تحميل البيانات...</div>
                        </div>
                      )}
                      {!loading && (
                        <>
                          <ResizableTable
                            className="h-full w-full"
                            columns={categoriesTableColumns}
                            data={categoriesReportData}
                            selectedRowId={null}
                            reportType="CATEGORIES_REPORT"
                            showToast={showToast}
                            onRowClick={(category, index) => {
                              // Handle category row click
                            }}
                            onRowDoubleClick={(category, index) => {
                              // Handle double click if needed
                            }}
                          />
                        </>
                      )}
                    </>
                  ) : activeTab === 'customers' ? (
                    <>
                      {loading && (
                        <div className="flex items-center justify-center h-32">
                          <div className="text-white">جاري تحميل البيانات...</div>
                        </div>
                      )}
                      {!loading && (
                        <>
                          <ResizableTable
                            className="h-full w-full"
                            columns={customersTableColumns}
                            data={customersReportData}
                            selectedRowId={null}
                            reportType="CUSTOMERS_REPORT"
                            showToast={showToast}
                            onRowClick={(customer, index) => {
                              // Handle customer row click
                            }}
                            onRowDoubleClick={(customer, index) => {
                              // Handle double click if needed
                            }}
                          />
                        </>
                      )}
                    </>
                  ) : activeTab === 'main' ? (
                    /* Reports List Container */
                    <div className="h-full overflow-y-auto scrollbar-hide p-4">
                      {/* Reports Sections */}
                      <div className="space-y-6">
                        {/* Sales Reports */}
                        <div>
                          <h2 className="text-lg font-semibold text-white mb-3 text-right flex items-center gap-2">
                            <ChartBarIcon className="h-5 w-5 text-blue-400" />
                            المبيعات
                          </h2>
                          <div className="bg-[#374151] border border-gray-600 rounded-lg overflow-hidden">
                            {[
                              'الأصناف',
                              'التصنيفات الرئيسية',
                              'العملاء',
                              'الضرائب',
                              'المستخدمين',
                              'أنواع الدفع من قبل المستخدمين',
                              'أنواع الدفع من قبل العملاء',
                              'المستخدمين',
                              'فواتير العملاء',
                              'المبيعات اليومية',
                              'Hourly sales',
                              'Hourly sales by product groups',
                              'Table or order number',
                              'هامش الربح',
                              'مبيعات غير مدفوعة',
                              'الخردة',
                              'Voided items',
                              'Discounts granted',
                              'Items discounts',
                              'Stock movement'
                            ].map((report, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  if (report === 'الأصناف') {
                                    openProductsReport();
                                  } else if (report === 'التصنيفات الرئيسية') {
                                    openCategoriesReport();
                                  } else if (report === 'العملاء') {
                                    openCustomersReport();
                                  }
                                }}
                                className="group w-full bg-[#374151] hover:bg-[#3B4754] text-right text-white transition-all duration-200 flex items-center justify-between text-sm p-2"
                              >
                                {/* Left side - Report icon */}
                                <div className="flex items-center gap-2">
                                  <DocumentChartBarIcon className="w-4 h-4 text-blue-400" />
                                </div>

                                {/* Center - Report name */}
                                <div className="flex-1 text-right mr-1.5">
                                  <span>{report}</span>
                                </div>

                                {/* Right side - Star for favorites */}
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="p-1 hover:bg-yellow-500/20 rounded transition-colors cursor-pointer">
                                    <StarIcon className="w-4 h-4 text-yellow-400" />
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Purchase Reports */}
                        <div>
                          <h2 className="text-lg font-semibold text-white mb-3 text-right flex items-center gap-2">
                            <ShoppingCartIcon className="h-5 w-5 text-green-400" />
                            المشتريات
                          </h2>
                          <div className="bg-[#374151] border border-gray-600 rounded-lg overflow-hidden">
                            {[
                              'الأصناف',
                              'الموردين',
                              'مشتريات غير مدفوعة',
                              'Purchase discounts',
                              'Purchased items discounts',
                              'Purchase invoice list',
                              'Tax rates'
                            ].map((report, index) => (
                              <button
                                key={index}
                                className="group w-full bg-[#374151] hover:bg-[#3B4754] text-right text-white transition-all duration-200 flex items-center justify-between text-sm p-2"
                              >
                                {/* Left side - Report icon */}
                                <div className="flex items-center gap-2">
                                  <DocumentChartBarIcon className="w-4 h-4 text-blue-400" />
                                </div>

                                {/* Center - Report name */}
                                <div className="flex-1 text-right mr-1.5">
                                  <span>{report}</span>
                                </div>

                                {/* Right side - Star for favorites */}
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="p-1 hover:bg-yellow-500/20 rounded transition-colors cursor-pointer">
                                    <StarIcon className="w-4 h-4 text-yellow-400" />
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Loss and Damage */}
                        <div>
                          <h2 className="text-lg font-semibold text-white mb-3 text-right flex items-center gap-2">
                            <ArchiveBoxIcon className="h-5 w-5 text-red-400" />
                            Loss and damage
                          </h2>
                          <div className="bg-[#374151] border border-gray-600 rounded-lg overflow-hidden">
                            {[
                              'Products'
                            ].map((report, index) => (
                              <button
                                key={index}
                                className="group w-full bg-[#374151] hover:bg-[#3B4754] text-right text-white transition-all duration-200 flex items-center justify-between text-sm p-2"
                              >
                                {/* Left side - Report icon */}
                                <div className="flex items-center gap-2">
                                  <DocumentChartBarIcon className="w-4 h-4 text-blue-400" />
                                </div>

                                {/* Center - Report name */}
                                <div className="flex-1 text-right mr-1.5">
                                  <span>{report}</span>
                                </div>

                                {/* Right side - Star for favorites */}
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="p-1 hover:bg-yellow-500/20 rounded transition-colors cursor-pointer">
                                    <StarIcon className="w-4 h-4 text-yellow-400" />
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Inventory Control */}
                        <div>
                          <h2 className="text-lg font-semibold text-white mb-3 text-right flex items-center gap-2">
                            <ArchiveBoxIcon className="h-5 w-5 text-orange-400" />
                            مراقبة المخزون
                          </h2>
                          <div className="bg-[#374151] border border-gray-600 rounded-lg overflow-hidden">
                            {[
                              'قائمة المنتجات المروا طلبها',
                              'تحذير لطعامي المتوني'
                            ].map((report, index) => (
                              <button
                                key={index}
                                className="group w-full bg-[#374151] hover:bg-[#3B4754] text-right text-white transition-all duration-200 flex items-center justify-between text-sm p-2"
                              >
                                {/* Left side - Report icon */}
                                <div className="flex items-center gap-2">
                                  <DocumentChartBarIcon className="w-4 h-4 text-blue-400" />
                                </div>

                                {/* Center - Report name */}
                                <div className="flex-1 text-right mr-1.5">
                                  <span>{report}</span>
                                </div>

                                {/* Right side - Star for favorites */}
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="p-1 hover:bg-yellow-500/20 rounded transition-colors cursor-pointer">
                                    <StarIcon className="w-4 h-4 text-yellow-400" />
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Other Reports - Not implemented yet */
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">
                          {openTabs.find(tab => tab.id === activeTab)?.title}
                        </h3>
                        <p className="text-gray-400">هذا التقرير قيد التطوير</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

        {/* Date Filter Modal */}
        <SimpleDateFilterModal
          isOpen={showDateFilter}
          onClose={() => setShowDateFilter(false)}
          onDateFilterChange={(filter) => {
            setDateFilter(filter);
            if (showProductsReport) {
              // Re-fetch products report when date filter changes
              setTimeout(() => fetchProductsReport(), 100);
            }
            if (showCategoriesReport) {
              // Re-fetch categories report when date filter changes
              setTimeout(() => fetchCategoriesReport(), 100);
            }
            if (showCustomersReport) {
              // Re-fetch customers report when date filter changes
              setTimeout(() => fetchCustomersReport(), 100);
            }
          }}
          currentFilter={dateFilter}
        />

        {/* Products Filter Modal */}
        <ProductsFilterModal
          isOpen={showProductsFilter}
          onClose={() => setShowProductsFilter(false)}
          onFilterApply={(productIds, categoryIds) => {
            setSelectedProductIds(productIds)
            setSelectedCategoryIds(categoryIds)
            console.log('Selected Products:', productIds)
            console.log('Selected Categories:', categoryIds)
            if (showProductsReport) {
              // Re-fetch products report when product filter changes
              setTimeout(() => fetchProductsReport(), 100);
            }
          }}
          initialSelectedProducts={selectedProductIds}
          initialSelectedCategories={selectedCategoryIds}
        />

        {/* Customers Filter Modal */}
        <CustomersFilterModal
          isOpen={showCustomersFilter}
          onClose={() => setShowCustomersFilter(false)}
          onFilterApply={(customerIds, groupIds) => {
            setSelectedCustomerIds(customerIds)
            setSelectedCustomerGroupIds(groupIds)
            console.log('Selected Customers:', customerIds)
            console.log('Selected Customer Groups:', groupIds)
          }}
          initialSelectedCustomers={selectedCustomerIds}
          initialSelectedGroups={selectedCustomerGroupIds}
        />

        {/* Columns Control Modal with async loading */}
        {showColumnsModal && (
          <ColumnsControlModalWrapper
            reportType={currentReportType}
            onClose={() => setShowColumnsModal(false)}
            onColumnsChange={handleColumnsChange}
            getColumnsForModal={getColumnsForModal}
          />
        )}

    </div>
  );
}

export default function ReportsPage() {
  return (
    <ToastProvider>
      <ReportsPageContent />
    </ToastProvider>
  );
}


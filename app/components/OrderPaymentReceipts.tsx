'use client';

import { useState, useEffect } from 'react';
import { PaymentReceipt } from '@/lib/services/paymentService';
import ImageViewerModal from './ImageViewerModal';

interface OrderPaymentReceiptsProps {
  receipts: PaymentReceipt[];
  onVerifyAllReceipts: () => Promise<void>;
  formatPrice: (amount: number) => string;
}

interface VerifierInfo {
  name: string;
  email: string;
  verified_at: string;
}

export default function OrderPaymentReceipts({
  receipts,
  onVerifyAllReceipts,
  formatPrice
}: OrderPaymentReceiptsProps) {
  const [verifying, setVerifying] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showVerifierInfo, setShowVerifierInfo] = useState<string | null>(null);
  const [verifierInfo, setVerifierInfo] = useState<Record<string, VerifierInfo>>({});

  // Check if all receipts are verified
  const allVerified = receipts.every(r => r.payment_status === 'verified');
  const hasPendingReceipts = receipts.some(r => r.payment_status === 'pending');

  // Load verifier information for verified receipts
  useEffect(() => {
    const loadVerifierInfo = async () => {
      const verifiedReceipts = receipts.filter(r => r.payment_status === 'verified' && r.verified_by);

      for (const receipt of verifiedReceipts) {
        if (!receipt.verified_by || verifierInfo[receipt.id]) continue;

        try {
          const { supabase } = await import('@/app/lib/supabase/client');

          // Try to get from user_profiles first
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('id', receipt.verified_by)
            .single();

          if (profile) {
            setVerifierInfo(prev => ({
              ...prev,
              [receipt.id]: {
                name: profile.full_name || profile.email || 'مستخدم غير معروف',
                email: profile.email || '',
                verified_at: receipt.verified_at || ''
              }
            }));
          } else {
            // Fallback: try auth.users (admin access needed)
            setVerifierInfo(prev => ({
              ...prev,
              [receipt.id]: {
                name: 'موظف',
                email: '',
                verified_at: receipt.verified_at || ''
              }
            }));
          }
        } catch (error) {
          console.error('Error loading verifier info:', error);
        }
      }
    };

    loadVerifierInfo();
  }, [receipts]);

  const handleVerifyAll = async () => {
    if (!confirm('هل تريد تأكيد جميع التحويلات؟\n\n⚠️ لا يمكن التراجع عن هذا الإجراء')) {
      return;
    }

    setVerifying(true);
    try {
      await onVerifyAllReceipts();
    } catch (error) {
      console.error('Error verifying receipts:', error);
    } finally {
      setVerifying(false);
    }
  };

  const openImageViewer = (images: string[], index: number = 0) => {
    setSelectedImages(images);
    setSelectedImageIndex(index);
    setShowImageViewer(true);
  };

  // Close verifier info when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showVerifierInfo) {
        const target = event.target as HTMLElement;
        if (!target.closest('.verifier-info-container')) {
          setShowVerifierInfo(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showVerifierInfo]);

  if (receipts.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center border-2 border-dashed border-gray-300">
        <div className="text-gray-400 text-2xl mb-2">📄</div>
        <p className="text-sm text-gray-500">لم يتم رفع الإيصال بعد</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {/* All receipts in one merged component */}
        {receipts.map((receipt, index) => {
          const isVerified = receipt.payment_status === 'verified';
          const isPending = receipt.payment_status === 'pending';

          return (
            <div
              key={receipt.id}
              className={`border rounded-lg p-3 ${
                isVerified
                  ? 'border-green-400 bg-green-50'
                  : isPending
                  ? 'border-orange-300 bg-orange-50'
                  : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Receipt Image - Normal Size */}
                <button
                  onClick={() => openImageViewer(receipts.map(r => r.receipt_image_url), index)}
                  className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-blue-500 transition-all"
                >
                  <img
                    src={receipt.receipt_image_url}
                    alt={`إيصال ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>

                {/* Receipt Details - Normal Size */}
                <div className="flex-1 space-y-2">
                  {/* Amount */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">🔥 المبلغ المدفوع:</span>
                    <span className="text-base font-bold text-gray-900">
                      {receipt.detected_amount
                        ? formatPrice(receipt.detected_amount)
                        : 'غير محدد'}
                    </span>
                  </div>

                  {/* Account Number */}
                  {receipt.detected_account_number && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">📱 الرقم:</span>
                      <span className="text-sm font-mono text-gray-900">
                        {receipt.detected_account_number}
                      </span>
                    </div>
                  )}

                  {/* Transaction Date */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">📅 التاريخ:</span>
                    <span className="text-sm text-gray-900">
                      {receipt.transaction_date
                        ? new Date(receipt.transaction_date).toLocaleDateString('ar-EG', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : new Date(receipt.created_at).toLocaleDateString('ar-EG', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                      }
                    </span>
                  </div>
                </div>

                {/* Verified Badge */}
                {isVerified && (
                  <div className="relative verifier-info-container">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowVerifierInfo(showVerifierInfo === receipt.id ? null : receipt.id);
                      }}
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
                      style={{ backgroundColor: 'var(--primary-color)' }}
                      title="عرض معلومات التأكيد"
                    >
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </button>

                    {/* Verifier Info Popup */}
                    {showVerifierInfo === receipt.id && verifierInfo[receipt.id] && (
                      <div className="absolute top-12 left-0 z-50 bg-white border-2 border-gray-300 rounded-lg shadow-xl p-3 min-w-[200px]">
                        <div className="text-sm space-y-2">
                          <div className="font-semibold text-gray-800 border-b pb-2">
                            معلومات التأكيد
                          </div>
                          <div>
                            <span className="text-gray-600">تم التأكيد بواسطة:</span>
                            <div className="font-medium text-gray-900 mt-1">
                              {verifierInfo[receipt.id].name}
                            </div>
                            {verifierInfo[receipt.id].email && (
                              <div className="text-xs text-gray-500 mt-1">
                                {verifierInfo[receipt.id].email}
                              </div>
                            )}
                          </div>
                          {verifierInfo[receipt.id].verified_at && (
                            <div>
                              <span className="text-gray-600">التاريخ:</span>
                              <div className="text-xs text-gray-700 mt-1">
                                {new Date(verifierInfo[receipt.id].verified_at).toLocaleString('ar-EG', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Single Verify Button for all pending receipts */}
        {hasPendingReceipts && !allVerified && (
          <button
            onClick={handleVerifyAll}
            disabled={verifying}
            className="w-full py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
            style={{
              backgroundColor: 'var(--primary-color)',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              if (!verifying) {
                (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-hover-color)';
              }
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = 'var(--primary-color)';
            }}
          >
            {verifying ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                جاري التأكيد...
              </span>
            ) : (
              'تأكيد التحويل'
            )}
          </button>
        )}
      </div>

      {/* Image Viewer Modal */}
      <ImageViewerModal
        isOpen={showImageViewer}
        onClose={() => setShowImageViewer(false)}
        images={selectedImages}
        initialIndex={selectedImageIndex}
      />
    </>
  );
}

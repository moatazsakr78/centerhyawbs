'use client';

import React, { useState, useEffect } from 'react';
import { Product } from './shared/types';
import { useProductVoting, VoteStats } from '@/app/lib/hooks/useProductVoting';

interface ProductVoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  mode?: 'vote' | 'stats'; // New prop to control modal mode
}

export default function ProductVoteModal({ isOpen, onClose, product, mode = 'vote' }: ProductVoteModalProps) {
  const { voteStats, submitVote } = useProductVoting(String(product.id));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(mode === 'stats');

  // Update showResults when mode changes
  useEffect(() => {
    if (isOpen) {
      setShowResults(mode === 'stats');
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleVote = async (vote: 'yes' | 'no') => {
    setIsSubmitting(true);
    const success = await submitVote(vote);
    setIsSubmitting(false);

    if (success) {
      setShowResults(true);
      // Auto close after showing results
      setTimeout(() => {
        onClose();
        setTimeout(() => setShowResults(false), 300);
      }, 3000);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="إغلاق"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Product Info */}
        <div className="flex items-center gap-4 mb-6">
          {product.image && (
            <img
              src={product.image}
              alt={product.name}
              className="w-20 h-20 object-cover rounded-lg"
            />
          )}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
            <p className="text-sm text-gray-500">نفذت الكمية</p>
          </div>
        </div>

        {!showResults && mode !== 'stats' ? (
          <>
            {/* Question */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="text-xl font-bold text-gray-900 text-center mb-2">
                هل تريد منا توفير هذا المنتج مرة أخرى؟
              </h4>
              <p className="text-sm text-gray-600 text-center">
                رأيك مهم لنا! ساعدنا في معرفة المنتجات المحببة لديك
              </p>
            </div>

            {/* Vote Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => handleVote('yes')}
                disabled={isSubmitting}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                {isSubmitting ? 'جاري التصويت...' : 'نعم ✓'}
              </button>
              <button
                onClick={() => handleVote('no')}
                disabled={isSubmitting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                {isSubmitting ? 'جاري التصويت...' : 'لا ✗'}
              </button>
            </div>
          </>
        ) : (
          /* Results */
          <div className="space-y-4">
            {mode !== 'stats' && (
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">
                  شكراً لتصويتك!
                </h4>
                <p className="text-sm text-gray-600">
                  تم تسجيل رأيك بنجاح
                </p>
              </div>
            )}

            {/* Vote Statistics */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h5 className="font-semibold text-gray-900 text-center mb-3">نتائج التصويت</h5>

              {/* Yes Votes */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-green-700">نعم</span>
                  <span className="text-gray-600">
                    {voteStats.yesVotes} ({voteStats.yesPercentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-green-500 h-full transition-all duration-500 rounded-full"
                    style={{ width: `${voteStats.yesPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* No Votes */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-red-700">لا</span>
                  <span className="text-gray-600">
                    {voteStats.noVotes} ({voteStats.noPercentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-red-500 h-full transition-all duration-500 rounded-full"
                    style={{ width: `${voteStats.noPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Total */}
              <div className="pt-2 border-t border-gray-300 text-center">
                <span className="text-sm text-gray-600">
                  إجمالي الأصوات: <span className="font-semibold">{voteStats.totalVotes}</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

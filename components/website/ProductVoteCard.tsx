'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase/client';

interface VoteStats {
  total_votes: number;
  yes_votes: number;
  no_votes: number;
  yes_percentage: number;
  no_percentage: number;
}

interface ProductVoteCardProps {
  productId: string;
  productName: string;
  onVoteComplete?: () => void;
}

export default function ProductVoteCard({
  productId,
  productName,
  onVoteComplete
}: ProductVoteCardProps) {
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState<'yes' | 'no' | null>(null);
  const [voteStats, setVoteStats] = useState<VoteStats | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [userIdentifier, setUserIdentifier] = useState<string>('');

  // Generate or retrieve user identifier (session-based or IP-based)
  useEffect(() => {
    const getUserIdentifier = () => {
      // Try to get from localStorage (for consistent anonymous users)
      let identifier = localStorage.getItem('user_vote_id');

      if (!identifier) {
        // Generate a random identifier for this session
        identifier = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem('user_vote_id', identifier);
      }

      return identifier;
    };

    const identifier = getUserIdentifier();
    setUserIdentifier(identifier);

    // Check if user has already voted
    checkUserVote(identifier);
  }, [productId]);

  // Check if user has voted for this product
  const checkUserVote = async (identifier: string) => {
    try {
      const { data, error } = await (supabase as any)
        .rpc('has_user_voted', {
          p_product_id: productId,
          p_user_identifier: identifier
        });

      if (error) {
        console.error('Error checking vote:', error);
        return;
      }

      if (data && data.length > 0) {
        setHasVoted(data[0].has_voted);
        setUserVote(data[0].vote);

        // If user has voted, load statistics
        if (data[0].has_voted) {
          loadVoteStats();
        }
      }
    } catch (error) {
      console.error('Error checking user vote:', error);
    }
  };

  // Load vote statistics
  const loadVoteStats = async () => {
    try {
      const { data, error } = await (supabase as any)
        .rpc('get_product_vote_stats', {
          p_product_id: productId
        });

      if (error) {
        console.error('Error loading vote stats:', error);
        return;
      }

      if (data && data.length > 0) {
        setVoteStats(data[0]);
      }
    } catch (error) {
      console.error('Error loading vote stats:', error);
    }
  };

  // Handle vote submission
  const handleVote = async (vote: 'yes' | 'no') => {
    if (hasVoted || isVoting || !userIdentifier) return;

    setIsVoting(true);

    try {
      const { error } = await (supabase as any)
        .from('product_votes')
        .insert({
          product_id: productId,
          user_identifier: userIdentifier,
          vote: vote
        });

      if (error) {
        if (error.code === '23505') {
          // Duplicate vote - user has already voted
          console.log('User has already voted for this product');
          setHasVoted(true);
          setUserVote(vote);
          await loadVoteStats();
        } else {
          console.error('Error submitting vote:', error);
          alert('حدث خطأ أثناء التصويت. يرجى المحاولة مرة أخرى.');
        }
      } else {
        // Vote submitted successfully
        setHasVoted(true);
        setUserVote(vote);
        await loadVoteStats();

        if (onVoteComplete) {
          onVoteComplete();
        }
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      alert('حدث خطأ أثناء التصويت. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
      {/* Out of Stock Badge */}
      <div className="flex items-center justify-center mb-3">
        <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-500 text-white rounded-full text-sm font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          نفذت الكمية
        </span>
      </div>

      {!hasVoted ? (
        <>
          {/* Vote Question */}
          <div className="text-center mb-4">
            <p className="text-gray-800 dark:text-gray-200 font-medium text-sm mb-1">
              هل تريد أن نوفر هذا المنتج مرة أخرى؟
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-xs">
              صوّت لمساعدتنا في معرفة المنتجات المطلوبة
            </p>
          </div>

          {/* Vote Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleVote('yes')}
              disabled={isVoting}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:cursor-not-allowed"
            >
              {isVoting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>نعم</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleVote('no')}
              disabled={isVoting}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:cursor-not-allowed"
            >
              {isVoting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>لا</span>
                </>
              )}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Vote Confirmation */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              شكراً لك! تم تسجيل تصويتك
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-xs">
              صوّتت بـ <span className="font-semibold text-gray-800 dark:text-gray-200">{userVote === 'yes' ? 'نعم' : 'لا'}</span>
            </p>
          </div>

          {/* Vote Statistics */}
          {voteStats && voteStats.total_votes > 0 && (
            <div className="space-y-2">
              <div className="text-center text-xs text-gray-600 dark:text-gray-400 mb-2">
                <span className="font-medium">{voteStats.total_votes}</span> شخص صوتوا
              </div>

              {/* Yes Vote Bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-green-700 dark:text-green-400 font-medium">نعم</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {voteStats.yes_votes} ({voteStats.yes_percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-500 ease-out"
                    style={{ width: `${voteStats.yes_percentage}%` }}
                  ></div>
                </div>
              </div>

              {/* No Vote Bar */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-700 dark:text-gray-400 font-medium">لا</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {voteStats.no_votes} ({voteStats.no_percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-500 transition-all duration-500 ease-out"
                    style={{ width: `${voteStats.no_percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

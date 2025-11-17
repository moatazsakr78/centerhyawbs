'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AuthErrorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    const errorParam = searchParams.get('error')

    // Map error codes to Arabic messages
    const errorMessages: { [key: string]: string } = {
      Configuration: 'حدث خطأ في إعدادات المصادقة',
      AccessDenied: 'تم رفض الوصول',
      Verification: 'فشل التحقق من البريد الإلكتروني',
      OAuthSignin: 'حدث خطأ أثناء تسجيل الدخول بـ Google',
      OAuthCallback: 'حدث خطأ في معالجة الاستجابة من Google',
      OAuthCreateAccount: 'حدث خطأ أثناء إنشاء الحساب',
      EmailCreateAccount: 'حدث خطأ أثناء إنشاء الحساب بالبريد الإلكتروني',
      Callback: 'حدث خطأ في معالجة طلب المصادقة',
      OAuthAccountNotLinked: 'هذا البريد الإلكتروني مرتبط بحساب آخر',
      EmailSignin: 'حدث خطأ أثناء إرسال رابط تسجيل الدخول',
      CredentialsSignin: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      SessionRequired: 'يجب تسجيل الدخول للوصول لهذه الصفحة',
      Default: 'حدث خطأ غير متوقع'
    }

    setError(errorMessages[errorParam || ''] || errorMessages.Default)
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1F2937] via-[#2B3544] to-[#1F2937] flex items-center justify-center p-4">
      <div className="bg-[#2B3544] rounded-lg shadow-xl p-8 w-full max-w-md text-center">
        {/* Error Icon */}
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Error Title */}
        <h1 className="text-2xl font-bold text-white mb-4">
          فشل تسجيل الدخول
        </h1>

        {/* Error Message */}
        <p className="text-gray-300 mb-8">
          {error}
        </p>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full px-4 py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-medium rounded-lg transition-colors"
          >
            العودة لتسجيل الدخول
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            العودة للصفحة الرئيسية
          </button>
        </div>

        {/* Help Text */}
        <p className="mt-6 text-sm text-gray-400">
          إذا استمرت المشكلة، يرجى المحاولة مرة أخرى لاحقاً
        </p>
      </div>
    </div>
  )
}

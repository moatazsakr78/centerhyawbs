'use client'

import { useSession } from 'next-auth/react'
import { useUserProfile } from '@/lib/hooks/useUserProfile'

export default function DebugSessionPage() {
  const { data: session, status } = useSession()
  const { profile, loading } = useUserProfile()

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 Debug Session Info</h1>

        {/* Session Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📊 Session Status</h2>
          <p className="mb-2">
            <strong>Status:</strong>{' '}
            <span className={status === 'authenticated' ? 'text-green-400' : 'text-red-400'}>
              {status}
            </span>
          </p>
        </div>

        {/* NextAuth Session Data */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🔐 NextAuth Session Data</h2>
          {session?.user ? (
            <div className="space-y-2">
              <p><strong>User ID:</strong> {session.user.id || 'غير موجود'}</p>
              <p><strong>Email:</strong> {session.user.email || 'غير موجود'}</p>
              <p><strong>Name:</strong> {session.user.name || 'غير موجود'}</p>
              <p><strong>Image:</strong> {session.user.image || 'غير موجود'}</p>
              <p className="text-yellow-400 text-lg">
                <strong>Role (من Session):</strong> {session.user.role || '❌ غير موجود'}
              </p>
            </div>
          ) : (
            <p className="text-red-400">لا توجد بيانات session</p>
          )}

          <details className="mt-4">
            <summary className="cursor-pointer text-blue-400">عرض Full Session Object</summary>
            <pre className="mt-2 bg-gray-900 p-4 rounded overflow-auto text-xs">
              {JSON.stringify(session, null, 2)}
            </pre>
          </details>
        </div>

        {/* User Profile from Database */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">👤 User Profile (من قاعدة البيانات)</h2>
          {loading ? (
            <p>جاري التحميل...</p>
          ) : profile ? (
            <div className="space-y-2">
              <p><strong>Profile ID:</strong> {profile.id}</p>
              <p><strong>Full Name:</strong> {profile.full_name || 'غير موجود'}</p>
              <p className="text-yellow-400 text-lg">
                <strong>Role (من user_profiles):</strong> {profile.role || '❌ غير موجود'}
              </p>
              <p><strong>Is Admin:</strong> {profile.is_admin ? 'نعم ✅' : 'لا ❌'}</p>
              <p><strong>Branch ID:</strong> {profile.branch_id || 'غير موجود'}</p>
            </div>
          ) : (
            <p className="text-red-400">لا توجد بيانات profile</p>
          )}

          <details className="mt-4">
            <summary className="cursor-pointer text-blue-400">عرض Full Profile Object</summary>
            <pre className="mt-2 bg-gray-900 p-4 rounded overflow-auto text-xs">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </details>
        </div>

        {/* Analysis */}
        <div className="bg-blue-900 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">📝 التحليل</h2>
          <div className="space-y-2">
            {session?.user?.role ? (
              <p className="text-green-400">✅ الـ Role موجود في Session</p>
            ) : (
              <p className="text-red-400">❌ الـ Role مش موجود في Session - هنا المشكلة!</p>
            )}

            {profile?.role ? (
              <p className="text-green-400">✅ الـ Role موجود في Database</p>
            ) : (
              <p className="text-red-400">❌ الـ Role مش موجود في Database</p>
            )}

            {session?.user?.role && profile?.role && session.user.role !== profile.role && (
              <p className="text-orange-400">⚠️ الـ Role في Session مختلف عن الـ Database!</p>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">📋 التعليمات</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>لو الـ Role مش موجود في Session، لازم تعمل logout وتسجل دخول تاني</li>
            <li>لو الـ Role مش موجود في Database، لازم تضيفه من Supabase Table Editor</li>
            <li>خد screenshot من الصفحة دي وابعتها</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

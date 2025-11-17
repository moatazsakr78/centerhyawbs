import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { createClient } from "@supabase/supabase-js"

// Create Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
)

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // Google OAuth (FREE!)
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),

    // Email/Password
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "البريد الإلكتروني", type: "email" },
        password: { label: "كلمة المرور", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Use Supabase client to query public.auth_users table
          const { data: users, error } = await supabase
            .from('auth_users')
            .select('id, email, name, image, password_hash, role')
            .eq('email', credentials.email)
            .limit(1)

          if (error) {
            console.error('❌ Supabase query error:', error)
            return null
          }

          if (!users || users.length === 0) {
            console.log('❌ User not found:', credentials.email)
            return null
          }

          const user = users[0]

          if (!user || !user.password_hash) {
            console.log('❌ User has no password hash')
            return null
          }

          // Verify password
          const passwordValid = await bcrypt.compare(
            credentials.password as string,
            user.password_hash
          )

          if (!passwordValid) {
            console.log('❌ Invalid password for:', credentials.email)
            return null
          }

          console.log('✅ Login successful for:', credentials.email)

          // Return user object
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role
          }
        } catch (error) {
          console.error('❌ Auth error during login:', error)
          console.error('Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          })
          return null
        }
      }
    })
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth sign-in
      if (account?.provider === "google") {
        try {
          // Check if user exists using Supabase
          const { data: existingUsers, error: queryError } = await supabase
            .from('auth_users')
            .select('id')
            .eq('email', user.email!)
            .limit(1)

          if (queryError) {
            console.error('❌ Error checking existing user:', queryError)
            return false
          }

          // If user doesn't exist, create one
          if (!existingUsers || existingUsers.length === 0) {
            const { error: insertError } = await supabase
              .from('auth_users')
              .insert({
                email: user.email!,
                name: user.name || user.email!.split('@')[0],
                image: user.image || null,
                role: 'user',
                password_hash: '' // No password for OAuth users
              })

            if (insertError) {
              console.error('❌ Error creating user:', insertError)
              return false
            }

            console.log('✅ Created new user via Google OAuth:', user.email)
          }

          return true
        } catch (error) {
          console.error('❌ Error handling Google sign-in:', error)
          console.error('Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          })
          return false
        }
      }

      return true
    },

    async jwt({ token, user, account }) {
      // Add custom fields to JWT
      if (user) {
        // For Google users, fetch from database
        if (account?.provider === "google") {
          const { data: users, error } = await supabase
            .from('auth_users')
            .select('id, role')
            .eq('email', user.email!)
            .limit(1)

          if (!error && users && users.length > 0) {
            token.userId = users[0].id
            token.role = users[0].role
          }
        } else {
          token.userId = user.id
          token.role = user.role
        }
      }
      return token
    },

    async session({ session, token }) {
      // Add custom fields to session
      if (session.user) {
        session.user.id = token.userId as string
        session.user.role = token.role as string
      }
      return session
    }
  },

  pages: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    error: '/auth/error',
  },

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  secret: process.env.NEXTAUTH_SECRET,
})

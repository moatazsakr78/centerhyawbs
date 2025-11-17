import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import bcrypt from "bcryptjs"

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
          // Use direct PostgreSQL connection
          const { Pool } = await import('pg')
          const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
          })

          try {
            // Get user from database
            const result = await pool.query(
              'SELECT id, email, name, image, password_hash, role FROM auth_system.users WHERE email = $1',
              [credentials.email]
            )

            if (result.rows.length === 0) {
              return null
            }

            const user = result.rows[0]

            if (!user || !user.password_hash) {
              return null
            }

            // Verify password
            const passwordValid = await bcrypt.compare(
              credentials.password as string,
              user.password_hash
            )

            if (!passwordValid) {
              return null
            }

            // Return user object
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              role: user.role
            }
          } finally {
            await pool.end()
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
          const { Pool } = await import('pg')
          const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
          })

          try {
            // Check if user exists
            const existingUser = await pool.query(
              'SELECT id FROM auth_system.users WHERE email = $1',
              [user.email]
            )

            // If user doesn't exist, create one
            if (existingUser.rows.length === 0) {
              await pool.query(
                'INSERT INTO auth_system.users (email, name, image, role, password_hash) VALUES ($1, $2, $3, $4, $5)',
                [
                  user.email!,
                  user.name || user.email!.split('@')[0],
                  user.image || null,
                  'user',
                  '' // No password for OAuth users
                ]
              )
            }

            return true
          } finally {
            await pool.end()
          }
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
          const { Pool } = await import('pg')
          const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
          })

          try {
            const result = await pool.query(
              'SELECT id, role FROM auth_system.users WHERE email = $1',
              [user.email!]
            )

            if (result.rows.length > 0) {
              token.userId = result.rows[0].id
              token.role = result.rows[0].role
            }
          } finally {
            await pool.end()
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

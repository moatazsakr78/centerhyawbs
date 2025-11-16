/**
 * On-Demand Revalidation API
 *
 * This endpoint allows instant cache refresh when products are updated
 * Usage: POST /api/revalidate
 *
 * Body:
 * {
 *   "path": "/product/[id]" or "/"
 *   "secret": "your_secret_key"
 * }
 *
 * How to use from admin:
 * 1. When adding/editing a product, call this API
 * 2. The product page will refresh instantly
 * 3. Users see updates immediately (0 seconds delay!)
 */

import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, secret, productId } = body;

    // Security: Accept both client key and server secret for flexibility
    const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || 'dev-secret-123';
    const CLIENT_KEY = 'client-revalidate-request';

    // Allow either the server secret or the client key
    const isValidSecret = secret === REVALIDATE_SECRET || secret === CLIENT_KEY;

    if (!isValidSecret) {
      console.error('❌ Invalid revalidation secret:', secret);
      return NextResponse.json(
        { error: 'Invalid secret' },
        { status: 401 }
      );
    }

    // Revalidate specific paths
    if (path) {
      revalidatePath(path);
      console.log(`✅ Revalidated path: ${path}`);
    }

    // If productId provided, revalidate that product page
    if (productId) {
      revalidatePath(`/product/${productId}`);
      console.log(`✅ Revalidated product: ${productId}`);
    }

    // Always revalidate home page when products change
    revalidatePath('/');
    console.log(`✅ Revalidated home page`);

    return NextResponse.json({
      success: true,
      revalidated: true,
      paths: [path, productId ? `/product/${productId}` : null, '/'].filter(Boolean),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to revalidate',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Allow GET for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'On-Demand Revalidation API',
    usage: {
      method: 'POST',
      body: {
        secret: 'your_secret_key',
        path: '/product/[id] or /',
        productId: 'optional-product-uuid'
      }
    },
    note: 'This endpoint refreshes cached pages instantly when products are updated'
  });
}

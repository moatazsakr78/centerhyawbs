/**
 * Website Cache Revalidation Utilities
 *
 * Use these functions after CRUD operations to refresh the website instantly
 */

const REVALIDATE_SECRET = process.env.NEXT_PUBLIC_REVALIDATE_SECRET || 'dev-secret-123';

interface RevalidateResponse {
  success: boolean;
  revalidated?: boolean;
  paths?: string[];
  timestamp?: string;
  error?: string;
}

/**
 * Revalidate (refresh) the website home page
 * Call this after adding/editing/deleting products
 */
export async function revalidateHomePage(): Promise<RevalidateResponse> {
  try {
    const response = await fetch('/api/revalidate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: '/',
        secret: REVALIDATE_SECRET,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Home page revalidated:', data);
    return data;
  } catch (error) {
    console.error('❌ Failed to revalidate home page:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Revalidate (refresh) a specific product page
 * Call this after editing a product
 *
 * @param productId - The UUID of the product
 */
export async function revalidateProductPage(productId: string): Promise<RevalidateResponse> {
  try {
    const response = await fetch('/api/revalidate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId,
        secret: REVALIDATE_SECRET,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Product ${productId} revalidated:`, data);
    return data;
  } catch (error) {
    console.error(`❌ Failed to revalidate product ${productId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Revalidate both home page and specific product page
 * Call this after adding a new product or making major changes
 *
 * @param productId - The UUID of the product (optional)
 */
export async function revalidateAll(productId?: string): Promise<RevalidateResponse> {
  try {
    const response = await fetch('/api/revalidate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: '/',
        productId,
        secret: REVALIDATE_SECRET,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ All pages revalidated:', data);
    return data;
  } catch (error) {
    console.error('❌ Failed to revalidate pages:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Usage Examples:
 *
 * // After adding a new product:
 * await revalidateHomePage();
 *
 * // After editing a product:
 * await revalidateProductPage(productId);
 *
 * // After major changes (add/delete/bulk edit):
 * await revalidateAll();
 *
 * // You can also call it silently (don't wait):
 * revalidateHomePage().catch(console.error);
 */

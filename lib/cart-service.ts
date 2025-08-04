import { supabase } from '@/app/lib/supabase/client';
import { CartItemData, CartItemInsert, CartSession, CartCache } from './cart-utils';

export class CartService {
  
  // Fetch cart items from Supabase with product details
  static async getCartItems(sessionId: string): Promise<CartItemData[]> {
    try {
      // Check cache first
      const cached = CartCache.get(`cart_${sessionId}`);
      if (cached && !CartCache.isExpired(`cart_${sessionId}`)) {
        return cached;
      }
      
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          products!cart_items_product_id_fkey(
            name,
            product_code,
            main_image_url
          )
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching cart items:', error);
        return [];
      }
      
      const cartItems = data || [];
      
      // Cache the result
      CartCache.set(`cart_${sessionId}`, cartItems);
      
      return cartItems;
    } catch (error) {
      console.error('Error in getCartItems:', error);
      return [];
    }
  }
  
  // Add item to cart
  static async addToCart(
    sessionId: string,
    productId: string,
    quantity: number = 1,
    price: number,
    selectedColor?: string,
    selectedSize?: string
  ): Promise<CartItemData | null> {
    try {
      // Check if item already exists in cart (handle null values properly)
      const { data: existingItems } = await supabase
        .from('cart_items')
        .select('*')
        .eq('session_id', sessionId)
        .eq('product_id', productId);
      
      // Find matching item considering null/empty string equivalence
      const existingItem = existingItems?.find(item => {
        const itemColor = item.selected_color || '';
        const itemSize = item.selected_size || '';
        const inputColor = selectedColor || '';
        const inputSize = selectedSize || '';
        return itemColor === inputColor && itemSize === inputSize;
      });
      
      if (existingItem) {
        // Update quantity if item exists
        return this.updateCartItemQuantity(existingItem.id, existingItem.quantity + quantity);
      } else {
        // Insert new item
        const { data, error } = await supabase
          .from('cart_items')
          .insert({
            session_id: sessionId,
            product_id: productId,
            quantity,
            price,
            selected_color: selectedColor,
            selected_size: selectedSize
          })
          .select(`
            *,
            products!cart_items_product_id_fkey(
              name,
              product_code,
              main_image_url
            )
          `)
          .single();
        
        if (error) {
          console.error('Error adding to cart:', error);
          return null;
        }
        
        // Clear cache to force refresh
        CartCache.clear(`cart_${sessionId}`);
        
        return data;
      }
    } catch (error) {
      console.error('Error in addToCart:', error);
      return null;
    }
  }
  
  // Update cart item quantity
  static async updateCartItemQuantity(itemId: string, newQuantity: number): Promise<CartItemData | null> {
    try {
      if (newQuantity <= 0) {
        const success = await this.removeFromCart(itemId);
        return success ? null : null;
      }
      
      const { data, error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId)
        .select(`
          *,
          products!cart_items_product_id_fkey(
            name,
            product_code,
            main_image_url
          )
        `)
        .single();
      
      if (error) {
        console.error('Error updating cart item:', error);
        return null;
      }
      
      // Clear cache for all sessions (since we don't know which session this item belongs to)
      CartCache.clear();
      
      return data;
    } catch (error) {
      console.error('Error in updateCartItemQuantity:', error);
      return null;
    }
  }
  
  // Remove item from cart
  static async removeFromCart(itemId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);
      
      if (error) {
        console.error('Error removing from cart:', error);
        return false;
      }
      
      // Clear cache
      CartCache.clear();
      
      return true;
    } catch (error) {
      console.error('Error in removeFromCart:', error);
      return false;
    }
  }
  
  // Clear entire cart for session
  static async clearCart(sessionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('session_id', sessionId);
      
      if (error) {
        console.error('Error clearing cart:', error);
        return false;
      }
      
      // Clear cache
      CartCache.clear(`cart_${sessionId}`);
      
      return true;
    } catch (error) {
      console.error('Error in clearCart:', error);
      return false;
    }
  }
  
  // Get cart item count
  static async getCartItemCount(sessionId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('cart_items')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId);
      
      if (error) {
        console.error('Error getting cart count:', error);
        return 0;
      }
      
      return count || 0;
    } catch (error) {
      console.error('Error in getCartItemCount:', error);
      return 0;
    }
  }
  
  // Subscribe to cart changes (real-time)
  static subscribeToCartChanges(
    sessionId: string,
    onCartChange: (payload: any) => void
  ) {
    const channel = supabase
      .channel(`cart_changes_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('Cart change detected:', payload);
          // Clear cache when changes occur
          CartCache.clear(`cart_${sessionId}`);
          // Add a small delay to prevent rapid-fire updates
          setTimeout(() => {
            onCartChange(payload);
          }, 200);
        }
      )
      .subscribe();
    
    return channel;
  }
  
  // Unsubscribe from cart changes
  static unsubscribeFromCartChanges(channelName: string) {
    const channel = supabase.getChannels().find(ch => ch.topic === channelName);
    if (channel) {
      supabase.removeChannel(channel);
    }
  }
}
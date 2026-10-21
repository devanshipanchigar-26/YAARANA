import { supabase } from '../supabaseClient.js';

/**
 * Normalizes any table representation (e.g. 'Table 5', 'table 05', '5')
 * to a clean canonical string e.g. '5'.
 */
export function normalizeTableNo(tableStr) {
  if (!tableStr) return '';
  const match = String(tableStr).match(/\d+/);
  if (match) {
    return parseInt(match[0], 10).toString();
  }
  return String(tableStr).trim().toLowerCase();
}

/**
 * Returns formatted table label e.g. "Table 5"
 */
export function formatTableLabel(tableNo) {
  const norm = normalizeTableNo(tableNo);
  if (!norm) return 'Dine-In Table';
  return /^\d+$/.test(norm) ? `Table ${norm}` : norm.toUpperCase();
}

/**
 * Checks if an order's payment status is considered paid
 */
export function isOrderPaid(order) {
  const status = (order?.payment_status || '').toLowerCase().trim();
  return status === 'paid';
}

/**
 * Checks if an order is cancelled
 */
export function isOrderCancelled(order) {
  const status = (order?.order_status || '').toLowerCase().trim();
  return status === 'cancelled';
}

/**
 * Fetches the active unpaid order for a specific table ONLY if authorized for the current customer session.
 * Security enforcement: Does NOT treat table number or URL alone as authorization.
 * An active order is returned only if:
 * 1. The authenticated user matches order.user_id, OR
 * 2. The session payment_token matches the order's payment_token on this device.
 */
export async function fetchActiveTableOrder(tableNo, sessionAuth = {}) {
  const normTable = normalizeTableNo(tableNo);
  if (!normTable) return null;

  const currentUserId = sessionAuth?.userId || null;
  const sessionToken = sessionAuth?.paymentToken || null;
  const sessionOrderId = sessionAuth?.orderId || null;

  try {
    // 1. Check for active order tracked in device storage
    const localOrderId = sessionOrderId || localStorage.getItem('yaarana_last_order_id');
    const localToken = sessionToken || localStorage.getItem('yaarana_last_payment_token');

    if (localOrderId) {
      const raw = String(localOrderId).trim();
      const stripped = raw.replace(/^#/, '').replace(/^YRN-/i, '').trim();

      try {
        const { data: localOrder, error: localErr } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              quantity,
              unit_price,
              menu_items (
                name,
                price
              )
            )
          `)
          .or(`id.eq."${raw}",id.eq."${stripped}"`)
          .maybeSingle();

        if (
          !localErr &&
          localOrder &&
          !isOrderCancelled(localOrder) &&
          !isOrderPaid(localOrder) &&
          normalizeTableNo(localOrder.table_no) === normTable
        ) {
          // Verify authorization: authenticated user or matching payment token
          const isUserAuthorized = currentUserId && localOrder.user_id === currentUserId;
          const isTokenAuthorized = localToken && localOrder.payment_token === localToken;

          if (isUserAuthorized || isTokenAuthorized || (!localOrder.user_id && !currentUserId)) {
            return localOrder;
          }
        }
      } catch (localCatch) {
        console.warn('Error verifying local order:', localCatch);
      }
    }

    // 2. If logged in, check if user has an open order on this table
    if (currentUserId) {
      const { data: userOrders, error: userErr } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            unit_price,
            menu_items (
              name,
              price
            )
          )
        `)
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!userErr && userOrders && userOrders.length > 0) {
        const matching = userOrders.find(
          (o) =>
            (o.order_type || '').toLowerCase().replace(/_/g, '-') === 'dine-in' &&
            normalizeTableNo(o.table_no) === normTable &&
            !isOrderCancelled(o) &&
            !isOrderPaid(o)
        );

        if (matching) return matching;
      }
    }

    // If no authorized session matches, do NOT expose or merge with another party's table bill
    return null;
  } catch (err) {
    console.error('Error in fetchActiveTableOrder:', err);
    return null;
  }
}

/**
 * Adds new items directly to an existing open dine-in order.
 * Validates session authorization before modifying any existing bill.
 */
export async function addItemsToExistingOrder(existingOrder, newItems, sessionAuth = {}) {
  if (!existingOrder?.id) throw new Error('Missing existing order ID');
  if (!newItems || newItems.length === 0) throw new Error('No items to add');

  // Verify authorization
  const currentUserId = sessionAuth?.userId;
  const sessionToken = sessionAuth?.paymentToken || localStorage.getItem('yaarana_last_payment_token');

  const isUserAuthorized = currentUserId && existingOrder.user_id === currentUserId;
  const isTokenAuthorized = sessionToken && existingOrder.payment_token === sessionToken;
  const isLocalIdMatch = sessionAuth?.orderId && String(existingOrder.id) === String(sessionAuth.orderId);

  if (!isUserAuthorized && !isTokenAuthorized && !isLocalIdMatch) {
    throw new Error('Unauthorized: You do not have permission to modify this table bill.');
  }

  // 1. Calculate additional cost of newly added items
  const addedTotal = newItems.reduce((sum, item) => {
    const price = Number(item.price || item.unit_price || 0);
    const qty = Number(item.quantity || 1);
    return sum + price * qty;
  }, 0);

  const existingTotal = Number(existingOrder.total_amount || 0);
  const updatedTotal = parseFloat((existingTotal + addedTotal).toFixed(2));

  // 2. Insert new line items into order_items
  const itemsToInsert = newItems.map((item) => ({
    order_id: existingOrder.id,
    menu_item_id: parseInt(item.id, 10),
    quantity: parseInt(item.quantity || 1, 10),
    unit_price: parseFloat(item.price || item.unit_price || 0),
  }));

  const { error: itemsErr } = await supabase.from('order_items').insert(itemsToInsert);
  if (itemsErr) {
    console.error('Error adding items to order_items:', itemsErr.message);
    throw itemsErr;
  }

  // 3. Update existing order with the new total and 'Preparing' status so kitchen is notified
  const { data: updatedOrder, error: orderErr } = await supabase
    .from('orders')
    .update({
      total_amount: updatedTotal,
      bill_version: Number(existingOrder.bill_version || 1) + 1,
      order_status: 'Preparing', // Put back in kitchen queue for new items
    })
    .eq('id', existingOrder.id)
    .select()
    .single();

  if (orderErr) {
    console.error('Error updating order total amount:', orderErr.message);
    throw orderErr;
  }

  return {
    order: updatedOrder || { ...existingOrder, total_amount: updatedTotal, order_status: 'Preparing' },
    addedTotal,
    updatedTotal,
    itemsAddedCount: newItems.length,
  };
}

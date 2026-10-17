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
 * Fetches the active unpaid order for a specific table if one exists.
 * If found, new items in this meal session should be added to this exact same order/bill.
 */
export async function fetchActiveTableOrder(tableNo) {
  const normTable = normalizeTableNo(tableNo);
  if (!normTable) return null;

  try {
    // 1. First, check if there is an active order in localStorage for this customer/device
    const localOrderId = localStorage.getItem('yaarana_last_order_id');
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
          return localOrder;
        }
      } catch (localCatch) {
        console.warn('Error verifying local order:', localCatch);
      }
    }

    // 2. Fetch active unpaid dine-in orders for this table from Supabase
    const { data, error } = await supabase
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
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.warn('fetchActiveTableOrder Supabase error:', error.message);
      return null;
    }

    if (!data || data.length === 0) return null;

    const now = Date.now();
    // Filter unpaid, non-cancelled dine-in orders for this table (within last 12 hours)
    const tableOrders = data.filter((o) => {
      const type = (o.order_type || '').toLowerCase().replace(/_/g, '-');
      if (type !== 'dine-in') return false;
      if (normalizeTableNo(o.table_no) !== normTable) return false;
      if (isOrderCancelled(o) || isOrderPaid(o)) return false;
      const createdAt = o.created_at ? new Date(o.created_at).getTime() : 0;
      if (createdAt > 0 && now - createdAt > 12 * 60 * 60 * 1000) return false;
      return true;
    });

    if (tableOrders.length === 0) return null;

    // Return the active open order for this table
    return tableOrders[0];
  } catch (err) {
    console.error('Error fetching active table order:', err);
    return null;
  }
}

/**
 * Adds new items directly to an existing open dine-in order.
 * This updates total_amount, sets order_status to 'Preparing' so the kitchen sees the new items,
 * and inserts the new line items into order_items without creating a new order/bill.
 */
export async function addItemsToExistingOrder(existingOrder, newItems) {
  if (!existingOrder?.id) throw new Error('Missing existing order ID');
  if (!newItems || newItems.length === 0) throw new Error('No items to add');

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

import axios from 'axios';
import { query } from './database';

const MARKETPLACE_USER_SERVICE_URL =
  process.env.MARKETPLACE_USER_SERVICE_URL || 'http://host.docker.internal:4010/graphql';
const MARKETPLACE_ORDER_SERVICE_URL =
  process.env.MARKETPLACE_ORDER_SERVICE_URL || 'http://host.docker.internal:4012/graphql';
const MARKETPLACE_PAYMENT_SERVICE_URL =
  process.env.MARKETPLACE_PAYMENT_SERVICE_URL || 'http://host.docker.internal:4013/graphql';
const MARKETPLACE_ORDER_SERVICE_WEBHOOK_URL =
  process.env.MARKETPLACE_ORDER_SERVICE_WEBHOOK_URL || 'http://host.docker.internal:4012/webhook/shipment-status';

const normalizeShipmentRow = (row: any) => ({
  ...row,
  S_type: row.s_type,
  created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
});

async function fetchMarketplaceUser(customerId: string) {
  try {
    const queryText = `
      query GetUser($id: ID!) {
        user(id: $id) {
          user_id
          name
          email
          phone
          address
        }
      }
    `;

    const response = await axios.post(MARKETPLACE_USER_SERVICE_URL, {
      query: queryText,
      variables: { id: customerId },
    });

    if (response.data?.errors || !response.data?.data?.user) {
      return null;
    }

    return response.data.data.user;
  } catch (error: any) {
    console.error('Error fetching marketplace user:', error.message);
    return null;
  }
}

async function fetchLatestOrderByUser(userId: string) {
  try {
    const queryText = `
      query OrdersByUser($userId: ID!) {
        ordersByUser(userId: $userId) {
          order_id
          total_amount
          status
          order_date
        }
      }
    `;

    const response = await axios.post(MARKETPLACE_ORDER_SERVICE_URL, {
      query: queryText,
      variables: { userId },
    });

    if (response.data?.errors || !response.data?.data?.ordersByUser?.length) {
      return null;
    }

    return response.data.data.ordersByUser[0];
  } catch (error: any) {
    console.error('Error fetching marketplace order:', error.message);
    return null;
  }
}

async function fetchLatestPaymentByOrder(orderId: string) {
  try {
    const queryText = `
      query PaymentsByOrder($orderId: ID!) {
        paymentsByOrder(orderId: $orderId) {
          payment_id
          amount
          payment_status
          payment_date
        }
      }
    `;

    const response = await axios.post(MARKETPLACE_PAYMENT_SERVICE_URL, {
      query: queryText,
      variables: { orderId },
    });

    if (response.data?.errors || !response.data?.data?.paymentsByOrder?.length) {
      return null;
    }

    return response.data.data.paymentsByOrder[0];
  } catch (error: any) {
    console.error('Error fetching marketplace payment:', error.message);
    return null;
  }
}

async function ensureCustomerFromMarketplace(customerId: string) {
  const existing = await query('SELECT * FROM customers WHERE customer_id = $1', [customerId]);
  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const marketplaceUser = await fetchMarketplaceUser(customerId);
  if (!marketplaceUser) {
    throw new Error('Marketplace user not found');
  }

  const insertResult = await query(
    'INSERT INTO customers (customer_id, name, email, phone, address, C_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [
      marketplaceUser.user_id,
      marketplaceUser.name,
      marketplaceUser.email,
      marketplaceUser.phone || '-',
      marketplaceUser.address || '-',
      'Marketplace',
    ]
  );

  await query(
    "SELECT setval(pg_get_serial_sequence('customers', 'customer_id'), (SELECT MAX(customer_id) FROM customers))"
  );

  return insertResult.rows[0];
}

async function findOrderIdByShipmentId(shipmentId: string, customerId: string) {
  try {
    const queryText = `
      query OrdersByUser($userId: ID!) {
        ordersByUser(userId: $userId) {
          order_id
          shipment_id
        }
      }
    `;

    const response = await axios.post(MARKETPLACE_ORDER_SERVICE_URL, {
      query: queryText,
      variables: { userId: customerId },
    });

    if (response.data?.errors || !response.data?.data?.ordersByUser) {
      return null;
    }

    const orders = response.data.data.ordersByUser;
    const matchingOrder = orders.find((order: any) => 
      order.shipment_id && order.shipment_id.toString() === shipmentId.toString()
    );

    return matchingOrder ? matchingOrder.order_id : null;
  } catch (error: any) {
    console.error('Error finding order ID:', error.message);
    return null;
  }
}

async function sendWebhookToYapPerce(shipmentId: string, orderId: string | null, status: string) {
  if (!orderId) {
    console.log(`No order ID found for shipment ${shipmentId}, skipping webhook`);
    return;
  }

  try {
    await axios.post(MARKETPLACE_ORDER_SERVICE_WEBHOOK_URL, {
      shipmentId: shipmentId.toString(),
      orderId: orderId.toString(),
      status: status,
    });
    console.log(`Webhook sent to YapPerce: Order ${orderId} - Status: ${status}`);
  } catch (error: any) {
    console.error(`Failed to send webhook to YapPerce for order ${orderId}:`, error.message);
  }
}

export const resolvers = {
  Query: {
    shipments: async () => {
      const result = await query('SELECT * FROM shipments ORDER BY created_at DESC');
      return result.rows.map(normalizeShipmentRow);
    },
    shipment: async (_: any, { id }: { id: string }) => {
      const result = await query('SELECT * FROM shipments WHERE shipment_id = $1', [id]);
      const row = result.rows[0];
      return row ? normalizeShipmentRow(row) : null;
    },
    shipmentsByCustomer: async (_: any, { customer_id }: { customer_id: string }) => {
      const result = await query(
        'SELECT * FROM shipments WHERE customer_id = $1 ORDER BY created_at DESC',
        [customer_id]
      );
      return result.rows.map(normalizeShipmentRow);
    },
    shipmentsByStatus: async (_: any, { status }: { status: string }) => {
      const result = await query(
        'SELECT * FROM shipments WHERE status = $1 ORDER BY created_at DESC',
        [status]
      );
      return result.rows.map(normalizeShipmentRow);
    },
    shipmentsByVehicle: async (_: any, { vehicle_id }: { vehicle_id: string }) => {
      const result = await query(
        'SELECT * FROM shipments WHERE vehicle_id = $1 ORDER BY created_at DESC',
        [vehicle_id]
      );
      return result.rows.map(normalizeShipmentRow);
    },
  },
  Mutation: {
    createShipment: async (_: any, args: any) => {
      const {
        customer_id,
        origin_address,
        destination_address,
        S_type,
        weight,
        status,
        vehicle_id,
      } = args;

      const marketplaceCustomer = await ensureCustomerFromMarketplace(customer_id);
      const latestOrder = await fetchLatestOrderByUser(customer_id);
      const latestPayment = latestOrder
        ? await fetchLatestPaymentByOrder(String(latestOrder.order_id))
        : null;

      // If destination_address is "-" or empty, use customer's address
      let finalDestinationAddress = destination_address;
      if (!finalDestinationAddress || finalDestinationAddress === '-' || finalDestinationAddress.trim() === '') {
        finalDestinationAddress = marketplaceCustomer?.address || '-';
      }

      const result = await query(
        'INSERT INTO shipments (customer_id, origin_address, destination_address, S_type, weight, status, vehicle_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [customer_id, origin_address, finalDestinationAddress, S_type, weight, status, vehicle_id || null]
      );

      const shipmentRow = result.rows[0];
      const shipment = normalizeShipmentRow(shipmentRow);

      await query(
        'INSERT INTO tracking_updates (shipment_id, location, status, recipient_name, recipient_phone, recipient_address, item_name, barcode) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          shipment.shipment_id,
          origin_address,
          shipment.status,
          marketplaceCustomer?.name || null,
          marketplaceCustomer?.phone || null,
          shipment.destination_address || marketplaceCustomer?.address || null,
          latestOrder ? `Order ${latestOrder.order_id} - Total ${latestOrder.total_amount}` : null,
          latestPayment ? `PAY-${latestPayment.payment_id}` : null,
        ]
      );

      return shipment;
    },
    updateShipment: async (_: any, args: any) => {
      const { id, ...updates } = args;
      
      // Get old shipment data before updating
      const oldShipmentResult = await query('SELECT * FROM shipments WHERE shipment_id = $1', [id]);
      if (oldShipmentResult.rows.length === 0) {
        throw new Error('Shipment not found');
      }
      const oldShipment = normalizeShipmentRow(oldShipmentResult.rows[0]);
      const oldStatus = oldShipment.status;
      // Case-insensitive comparison for status
      const statusChanged = updates.status && updates.status.toLowerCase() !== oldStatus.toLowerCase();

      // If destination_address is "-" or empty, try to get it from customer
      if (updates.destination_address === '-' || updates.destination_address === '' || 
          (!updates.destination_address && (oldShipment.destination_address === '-' || oldShipment.destination_address === ''))) {
        const customerResult = await query('SELECT * FROM customers WHERE customer_id = $1', [oldShipment.customer_id]);
        if (customerResult.rows.length > 0 && customerResult.rows[0].address && customerResult.rows[0].address !== '-') {
          updates.destination_address = customerResult.rows[0].address;
        }
      }

      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.keys(updates).forEach((key) => {
        if (updates[key] !== undefined) {
          const dbField = key === 'S_type' ? 'S_type' : key;
          fields.push(`${dbField} = $${paramCount}`);
          values.push(updates[key]);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        return oldShipment;
      }

      values.push(id);
      const result = await query(
        `UPDATE shipments SET ${fields.join(', ')} WHERE shipment_id = $${paramCount} RETURNING *`,
        values
      );
      const row = result.rows[0];
      const updatedShipment = row ? normalizeShipmentRow(row) : null;

      if (!updatedShipment) {
        return null;
      }

      // If status changed, create tracking update
      if (statusChanged) {
        console.log(`Status changed from "${oldStatus}" to "${updates.status}" for shipment ${id}`);
        console.log(`Updated shipment status: ${updatedShipment.status}`);
        
        const customerResult = await query('SELECT * FROM customers WHERE customer_id = $1', [updatedShipment.customer_id]);
        const customer = customerResult.rows[0];
        const latestOrder = await fetchLatestOrderByUser(updatedShipment.customer_id);
        const latestPayment = latestOrder
          ? await fetchLatestPaymentByOrder(String(latestOrder.order_id))
          : null;

        // Determine location based on status (case-insensitive)
        // Use the new status from updates, not from updatedShipment (in case of case differences)
        const newStatus = updates.status || updatedShipment.status;
        const statusLower = newStatus.toLowerCase();
        let location = 'Order received';
        if (statusLower === 'in transit') {
          location = 'In transit';
        } else if (statusLower === 'delivered') {
          location = 'Delivered';
        } else if (statusLower === 'processing') {
          location = 'Processing';
        } else if (statusLower === 'pending') {
          location = 'Pending';
        }

        // Ensure status is normalized to match what was sent
        const normalizedStatus = updates.status || updatedShipment.status;
        
        await query(
          'INSERT INTO tracking_updates (shipment_id, location, status, recipient_name, recipient_phone, recipient_address, item_name, barcode, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)',
          [
            updatedShipment.shipment_id,
            location,
            normalizedStatus, // Use the normalized status from updates
            customer?.name || null,
            customer?.phone || null,
            updatedShipment.destination_address || customer?.address || null,
            latestOrder ? `Order ${latestOrder.order_id} - Total ${latestOrder.total_amount}` : null,
            latestPayment ? `PAY-${latestPayment.payment_id}` : null,
          ]
        );
        
        console.log(`Tracking update created for shipment ${updatedShipment.shipment_id} with status: ${normalizedStatus} and location: ${location}`);

        // Send webhook to YapPerce
        const orderId = await findOrderIdByShipmentId(updatedShipment.shipment_id.toString(), updatedShipment.customer_id.toString());
        await sendWebhookToYapPerce(updatedShipment.shipment_id.toString(), orderId, normalizedStatus);
      } else {
        console.log(`No status change for shipment ${id}. Old status: "${oldStatus}", New status: "${updates.status}"`);
      }

      return updatedShipment;
    },
    deleteShipment: async (_: any, { id }: { id: string }) => {
      const result = await query('DELETE FROM shipments WHERE shipment_id = $1', [id]);
      return result.rowCount! > 0;
    },
  },
  Shipment: {
    __resolveReference: async (reference: { shipment_id: string }) => {
      const result = await query('SELECT * FROM shipments WHERE shipment_id = $1', [
        reference.shipment_id,
      ]);
      const row = result.rows[0];
      return row ? normalizeShipmentRow(row) : null;
    },
    customer: (parent: any) => {
      if (!parent.customer_id) return null;
      return { customer_id: parent.customer_id };
    },
    vehicle: (parent: any) => {
      if (!parent.vehicle_id) return null;
      return { vehicle_id: parent.vehicle_id };
    },
  },
};

// Fetch recent orders
import { prisma } from './prisma';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabase';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function getRecentOrders(page = 0, pageSize = 10) {
  try {
    console.log('getRecentOrders');
    // Get total count for pagination
    const totalCount = await prisma.order.count();
    
    // Fetch orders
    const orders = await prisma.order.findMany({
      include: {
        OrderItem: {
          include: {
            Product: true
          }
        }
      },
      orderBy: {
        orderDate: 'desc'
      },
      skip: page * pageSize,
      take: pageSize
    });

    // Enhance with Supabase user data where available
    const enhancedOrders = await Promise.all(
      orders.map(async (order) => {
        try {
          // Skip if supabaseAdmin is not available (client-side)
          if (!supabaseAdmin) {
            console.log('supabaseAdmin not available, skipping user data enhancement');
            return order;
          }

          // Using Supabase Auth Admin API to get user data
          const { data: userData, error } = await supabaseAdmin.auth.admin.getUserById(order.userId);

          if (error || !userData || !userData.user) {
            console.log(`No Supabase user found for userId: ${order.userId}`);
            return order;
          }

          // Extract user metadata directly from the user object
          const userMetadata = userData.user.user_metadata || {};
          
          // Log the entire metadata object to see what's available
          console.log(`User ${order.userId} metadata:`, JSON.stringify(userMetadata, null, 2));
          
          // Return enhanced order with Supabase user data
          return {
            ...order,
            supabaseUser: {
              email: userMetadata.email || userMetadata.email,
              name: userMetadata.nombre || userMetadata.nombre,
              lastName: userMetadata.apellidos || userMetadata.apellidos,
              phone: userMetadata.telefono || userMetadata.telefono,
              address: userMetadata.direccion || userMetadata.direccion,
              instagramUser: userMetadata.instagramUser || ''
            }
          };
        } catch (error) {
          console.error('Error fetching Supabase user data:', error);
          return order;
        }
      })
    );

    return {
      data: enhancedOrders,
      pagination: {
        total: totalCount,
        page,
        pageSize,
        pageCount: Math.ceil(totalCount / pageSize)
      }
    };
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    throw error;
  }
}

export async function getOrderById(id: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        
        OrderItem: {
          include: {
            Product: true,
            DesignCustomization: {
              include: {
                Design: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      throw new Error(`Order with ID ${id} not found`);
    }

    // Skip if supabaseAdmin is not available (client-side)
    if (!supabaseAdmin) {
      console.log('supabaseAdmin not available, skipping user data enhancement');
      return order;
    }

    // Using Supabase Auth Admin API to get user data
    try {
      const { data: userData, error } = await supabaseAdmin.auth.admin.getUserById(order.userId);

      if (!error && userData && userData.user) {
        // Extract user metadata directly from the user object
        const userMetadata = userData.user.user_metadata || {};
        
        // Log the entire metadata to see what's available
        console.log(`User ${order.userId} metadata (getOrderById):`, JSON.stringify(userMetadata, null, 2));
        
        // Return enhanced order with Supabase user data
        return {
          ...order,
          supabaseUser: {
            email: userMetadata.email || userMetadata.email,
            name: userMetadata.nombre || userMetadata.nombre,
            lastName: userMetadata.apellidos || userMetadata.apellidos,
            phone: userMetadata.telefono || userMetadata.telefono,
            address: userMetadata.direccion || userMetadata.direccion,
            instagramUser: userMetadata.instagramUser || ''
          }
        };
      }
    } catch (error) {
      console.error('Error fetching Supabase user data:', error);
    }

    return order;
  } catch (error) {
    console.error(`Error fetching order with ID ${id}:`, error);
    throw error;
  }
}

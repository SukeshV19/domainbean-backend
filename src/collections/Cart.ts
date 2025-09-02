import type { CollectionConfig } from 'payload'

const Cart: CollectionConfig = {
  slug: 'cart',
  admin: {
    useAsTitle: 'user',
    defaultColumns: ['user', 'domains', 'createdAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      // Users can only read their own cart
      return {
        user: {
          equals: user.id
        }
      }
    },
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => {
      if (!user) return false
      // Users can only update their own cart
      return {
        user: {
          equals: user.id
        }
      }
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      // Users can only delete their own cart
      return {
        user: {
          equals: user.id
        }
      }
    },
  },
  fields: [
    {name: 'user',type: 'relationship',relationTo: 'customers',required: true,unique: true, index: true,},
    {name: 'domains',type: 'relationship',relationTo: 'domains',hasMany: true, 
      admin: {description: 'Array of domain IDs in the cart'},
    },
  ],
  timestamps: true,
}

export default Cart
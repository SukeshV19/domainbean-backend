import { CollectionConfig } from 'payload';

const Sales: CollectionConfig = {
  slug: 'sales',
  admin: { useAsTitle: 'domainId' },
  access: {
    read: ({ req }) => Boolean(req.user || (req as { apiKey?: string }).apiKey),
    create: ({ req }) => req.user?.role === 'customer',
    update: ({ req }) => req.user?.role === 'customer',
    delete: ({ req }) => req.user?.role === 'customer',
  },
  fields: [
    { name: 'domainId',type: 'relationship',relationTo: 'domains' },
    { name: 'sellerId', type: 'relationship', relationTo: 'customers' },
    { name: 'buyerId', type: 'relationship', relationTo: 'customers' },
    { name: 'price', type: 'text' },
    { name: 'type', type: 'select', options: ['installment', 'full'] }
  ],
};

export default Sales;

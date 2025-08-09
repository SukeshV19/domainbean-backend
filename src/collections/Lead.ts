import { CollectionConfig } from 'payload';

const Leads: CollectionConfig = {
  slug: 'leads',
  admin: { useAsTitle: 'domainId' },
  access: {
    read: ({ req }) => Boolean(req.user || (req as { apiKey?: string }).apiKey),
    create: ({ req }) => req.user?.role === 'customer',
    update: ({ req }) => req.user?.role === 'customer',
    delete: ({ req }) => req.user?.role === 'customer',
  },
  fields: [
    { name: "buyerId",type: 'relationship', relationTo: 'customers', required: true},
    { name: 'domainId',type: 'relationship',relationTo: 'domains', required: true },
    { name: "type", type: "select", options: ["Offer", "BIN"] },
    { name: "message", type: "text" },
    { name: "status", type: "select", options: ['Accepted', 'Paid', 'Payment failed'] }
  ],
};
export default Leads;

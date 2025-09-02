import { CollectionConfig } from 'payload';

const Installments: CollectionConfig = {
  slug: 'installments',
  admin: {useAsTitle: 'domainId',},
  fields: [
    { name: 'domainId', type: 'relationship', relationTo: 'domains' },
    { name: 'sellerId', type: 'relationship', relationTo: 'customers' },
    { name: 'buyerId', type: 'relationship', relationTo: 'customers' },
    { name: 'totalTime', type: 'text' },
    { name: 'interval', type: 'text' },
    { name: 'installmentPrice', type: 'number' },
    { name: 'nextInstallmentDate', type: 'date' },
    { name: 'history', type: 'array', fields:[
        { name: 'paymentDate', type: 'date' }
    ] }
  ],
}
export default Installments;
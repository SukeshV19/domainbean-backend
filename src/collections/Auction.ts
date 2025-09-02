import { CollectionConfig } from 'payload';

const Auction: CollectionConfig = {
  slug: 'auctions',
  admin: {useAsTitle: 'domainId',},
  access: {
    read: ({ req }) => {
        return Boolean(req.user || (req as { apiKey?: string }).apiKey)
      }
    },
  fields: [
    { name: 'domainId',type: 'relationship', relationTo: 'domains',required: true },
    { name: 'bids', type: 'array', fields: [
        {name: 'userId', type: 'relationship', relationTo: 'customers'},
        {name: 'price', type: 'text'},
        {name: "units", type: 'select', options: ['$', '₹']},
        {name: 'isProxy', type: 'checkbox', defaultValue: false}
    ] },
    { name: 'minBid', type: 'text' },
    { name: 'highestBid', type: 'text' },
    { name: 'biddingTime', type: 'date' },

    { name: 'proxy', type: 'array', fields:[
      { name: 'userId', type: 'relationship', relationTo: 'customers' },
      { name: 'maxBid', type: 'number' },
      { name: 'currentBid', type: 'number' }
    ]},
    { name: 'minInc', type: 'number', defaultValue: 1,
      hooks: {
      beforeChange: [
        ({ data }) => {
          const baseAmount = parseFloat(data?.highestBid || data?.minBid || '100')
          return Math.max(1, Math.ceil(baseAmount * 0.01)) 
        }
      ]
    }
    }
  ],
};

export default Auction;

import { CollectionConfig } from 'payload';

const Tables: CollectionConfig = {
  slug: 'tables',
  admin: { useAsTitle: 'title' },
  access: {
    read: ({ req }) => Boolean(req.user || (req as { apiKey?: string }).apiKey),
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    { name: 'title',type: 'text',required: true,
      admin: {
        description: 'Name of the table for reference'
      }
    },
    {name: 'headers',type: 'array',required: true,
      admin: {
        description: 'Table column headers'
      },
      fields: [
        { name: 'header', type: 'text', required: true }
      ]
    },
    {
      name: 'rows',
      type: 'array',
      admin: {
        description: 'Table data rows'
      },
      fields: [
        {name: 'cells',type: 'array',
          fields: [
            { name: 'value', type: 'text' }
          ]
        }
      ]
    }
  ],
};

export default Tables;

import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {useAPIKey: true,},
  fields: [
    {
      name: 'role',
      type: 'select',
      options: ['admin', 'reader'],
      required: true,
      defaultValue: 'reader',
    },
  ],
}


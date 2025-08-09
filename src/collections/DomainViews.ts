import { CollectionConfig } from 'payload';

const DomainViews: CollectionConfig = {
  slug: 'domainViews',
  admin: {useAsTitle: 'domainId',},
  fields: [
    { name: 'domainId',type: 'relationship',relationTo: 'domains', required: true, unique: true },
    { name: 'users',type: 'array', fields: [{name: 'userId', type: 'relationship', relationTo: 'customers'}] },
  ],
}

export default DomainViews;

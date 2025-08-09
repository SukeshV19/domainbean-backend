import { CollectionConfig } from 'payload';

const Domains: CollectionConfig = {
  slug: 'domains',
  admin: {useAsTitle: 'name',},
  fields: [
    { name: 'name',type: 'text',required: true },
    { name: 'slug',type: 'text',unique: true,required: true },
    { name: 'category', type: 'select', options: ['Bussiness', 'Commerce', 'Food', 'Medical', 'Education', 'Agriculture', "AI", 'Grocery'] },
    { name: 'currency', type: 'select', options: ['₹', '$'] },
    { name: 'price',type: 'number',required: true },
    { name: 'cost',type: 'number',required: true },
    { name: 'purchaseCost',type: 'number', admin: {description: 'Cost + Taxes'} },
    { name: 'minOffer',type: 'number' },
    { name: 'status',type: 'select',options: ['available', 'sold'],defaultValue: 'available' },
    { name: 'views',type: 'number',defaultValue: 0, admin: {readOnly: true }},
    { name: 'registrar',type: 'text' },
    { name: 'expDate',type: 'date', label: 'Expiration Date' },
    { name: 'regDate',type: 'date', label: 'Registration Date' },
    { name: 'description',type: 'text' },
    { name: 'ownedBy',type: 'relationship',relationTo: 'customers',hasMany: false },
  ],
};

export default Domains;

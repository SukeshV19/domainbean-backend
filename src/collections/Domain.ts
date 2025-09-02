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
    { name: 'cost',type: 'number'},
    { name: 'status',type: 'select',options: ['available', 'sold', 'auction','offer', 'installment'],defaultValue: 'available' },
    { name: 'views',type: 'number',defaultValue: 0, admin: {readOnly: true }},
    { name: 'registrar',type: 'text' },
    { name: 'description',type: 'text' },
    { name: 'ownedBy',type: 'relationship',relationTo: 'customers',hasMany: false },

    { name: 'acceptInstallment', type: 'checkbox', defaultValue: 'false' },
    { name: 'interestRate', type: 'number', defaultValue: 0 },
    { name: 'maxTimeLimit',type: 'select', options: ['3 months', '6 months', '1 year', '2 years', '3 years', '4 years', '5 years', 'null'], defaultValue: 'null' }
  ],
}
export default Domains;

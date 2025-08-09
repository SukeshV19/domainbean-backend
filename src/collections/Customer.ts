import { CollectionConfig } from 'payload';

const Customers: CollectionConfig = {
    slug: 'customers',
    admin: { useAsTitle: 'uname' },
    auth: {
        tokenExpiration: 24 * 60 * 60,
        verify: false,
        cookies: {
            secure: true,
            sameSite: 'None',
            domain: 'localhost'
        }
    },
    access: {
        create: () => true,
        admin: () => false
    },
    fields: [
        { name: 'uname', type: 'text', required: true },
        { name: 'email', type: 'email', required: true },
        { name: 'role', type: 'text', defaultValue: 'customer'}
    ],
}
export default Customers
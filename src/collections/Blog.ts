import { CollectionConfig } from 'payload';

const Blogs: CollectionConfig = {
    slug: 'blogs',
    admin: { useAsTitle: 'name', },
    access: {
        read: ({ req }) => {
            return Boolean(req.user || (req as { apiKey?: string }).apiKey)
        },
        create: ({ req: { user } }) => {
            return !!user && user.role === 'admin'
        },
        update: ({ req: { user } }) => {
            return !!user && user.role === 'admin'
        },
        delete: ({ req: { user } }) => {
            return !!user && user.role === 'admin'
        },
    },
    fields: [
        { name: 'name', type: 'text', required: true, },
        { name: 'shortNote', type: 'text'},
        { name: 'images', type: 'array', fields: [{ name: 'image', type: 'upload', relationTo: 'media' }] },
        { name: 'category', type: 'select', options: ['Domains', 'Pricing', 'Hosting', 'Security', 'Uses'] },
        { 
            name: 'sections', 
            type: 'array', 
            fields: [
                { name: 'heading', type: 'text', required: false },
                { name: 'image', type: 'upload', relationTo: 'media', required: false },
                { name: 'content', type: 'richText', required: false }
            ] 
        },
    ],
}
export default Blogs;

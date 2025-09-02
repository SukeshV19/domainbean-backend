import { CollectionConfig } from 'payload';
import blogCacheService from '../services/blogCache';

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
    hooks: {
        // After change hooks - clear cache when data changes
        afterChange: [
            async ({ doc, operation }) => {
                console.log(`[Blog ${operation}] Clearing cache after blog ${operation}`);
                blogCacheService.clear();
                return doc;
            }
        ],
        
        afterDelete: [
            async ({ doc }) => {
                console.log('[Blog Delete] Clearing cache after blog deletion');
                blogCacheService.clear();
                return doc;
            }
        ],

        // Before operation hook to intercept find operations and use cache
        beforeOperation: [
            async ({ args, operation }) => {
                // Only intercept find operations (not findByID)
                if (operation === 'read' && args.req?.method === 'GET') {
                    const url = args.req?.url || '';
                    // Check if this is a collection find (not single document)
                    if (url.includes('/api/blogs') && !url.includes('/api/blogs/')) {
                        const cached = blogCacheService.get();
                        if (cached) {
                            console.log('[Cache HIT] Returning cached blogs from beforeOperation');
                            // Store cached data in request for later use
                            if (args.req) {
                                (args.req as { __cachedBlogs?: typeof cached }).__cachedBlogs = cached;
                            }
                        }
                    }
                }
                return args;
            }
        ],

        // After read hook - cache the results
        afterRead: [
            async ({ doc, req, findMany }) => {
                // Only cache when reading many (list endpoint)
                if (findMany && req?.method === 'GET' && !(req as { __cachedBlogs?: unknown }).__cachedBlogs) {
                    // The results will be cached in the custom endpoint
                    console.log('[afterRead] Will cache results if not from cache');
                }
                return doc;
            }
        ],
    },
    
    endpoints: [
        {
            path: '/',
            method: 'get',
            handler: async (req) => {
                try {
                    // Check cache first
                    const cached = blogCacheService.get();
                    if (cached) {
                        console.log('[Endpoint] Returning cached blogs');
                        return Response.json(cached, {
                            headers: {
                                'X-Cache': 'HIT',
                                'Content-Type': 'application/json',
                            }
                        });
                    }

                    console.log('[Endpoint] Cache miss, fetching from database');
                    // If not cached, fetch all blogs
                    const blogs = await req.payload.find({
                        collection: 'blogs',
                        limit: 0, // Get all blogs, no pagination
                        depth: 2,
                        sort: '-createdAt', // Sort by newest first
                    });

                    // Cache the results
                    blogCacheService.set(blogs);
                    console.log(`[Endpoint] Cached ${blogs.docs?.length || 0} blogs`);
                    
                    return Response.json(blogs, {
                        headers: {
                            'X-Cache': 'MISS',
                            'Content-Type': 'application/json',
                        }
                    });
                } catch (error) {
                    console.error('Error fetching blogs:', error);
                    return Response.json(
                        { error: 'Failed to fetch blogs', details: error instanceof Error ? error.message : 'Unknown error' },
                        { status: 500 }
                    );
                }
            }
        },
        {
            path: '/cache/stats',
            method: 'get',
            handler: async () => {
                // Optional: endpoint to check cache statistics
                const stats = blogCacheService.getStats();
                return Response.json(stats);
            }
        },
        {
            path: '/cache/clear',
            method: 'post',
            handler: async (req) => {
                // Optional: endpoint to manually clear cache (admin only)
                if (!req.user || (req.user as { role?: string }).role !== 'admin') {
                    return Response.json(
                        { error: 'Unauthorized' },
                        { status: 403 }
                    );
                }
                blogCacheService.clear();
                return Response.json({ message: 'Cache cleared successfully' });
            }
        }
    ],
    
    fields: [
        { name: 'name', type: 'text', required: true, },
        { name: 'slug', type: 'text' },
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
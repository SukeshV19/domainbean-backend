import NodeCache from 'node-cache';

// Create a single cache instance for all blogs
// TTL: 30 minutes (1800 seconds)
const blogsCache = new NodeCache({
  stdTTL: 1800, // 30 minutes
  checkperiod: 600, // Check for expired keys every 10 minutes
  useClones: false, // Better performance
  deleteOnExpire: true,
});

const CACHE_KEY = 'all-blogs';

export const blogCacheService = {
  // Get all blogs from cache
  get: () => {
    const cached = blogsCache.get(CACHE_KEY);
    if (cached) {
      console.log('[Cache HIT] Returning cached blogs');
      return cached;
    }
    console.log('[Cache MISS] No cached blogs found');
    return null;
  },

  // Set blogs in cache
  set: (blogs: { docs?: unknown[] }) => {
    const success = blogsCache.set(CACHE_KEY, blogs);
    if (success) {
      console.log(`[Cache SET] Cached ${blogs.docs?.length || 0} blogs`);
    }
    return success;
  },

  // Clear the cache (call this when blogs are created/updated/deleted)
  clear: () => {
    blogsCache.del(CACHE_KEY);
    console.log('[Cache CLEAR] Blog cache cleared');
  },

  // Get cache statistics
  getStats: () => {
    const stats = blogsCache.getStats();
    const keys = blogsCache.keys();
    return {
      ...stats,
      hasData: keys.includes(CACHE_KEY),
      ttl: blogsCache.getTtl(CACHE_KEY),
    };
  },

  // Check if cache has data
  has: () => {
    return blogsCache.has(CACHE_KEY);
  },
};

export default blogCacheService;
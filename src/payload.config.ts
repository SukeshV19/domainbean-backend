import { postgresAdapter } from '@payloadcms/db-postgres'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import Blogs from './collections/Blog'
import Tables from './collections/Table'
import Customers from './collections/Customer'
import Domains from './collections/Domain'
import Sales from './collections/Sale'
import Leads from './collections/Lead'
import Auction from './collections/Auction'
import Cart from './collections/Cart'
import WishList from './collections/WishList'
import Installment from './collections/Installments'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  cors: [`${process.env.FRONTEND_URL}`, 'http://192.168.4.196:3001'],
  collections: [Users, Media, Blogs, Tables, Customers, Domains, Sales, Leads, Auction, Cart, WishList, Installment],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  sharp,
  plugins: [
    payloadCloudPlugin(),
  ],
})

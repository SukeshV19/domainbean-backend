import * as migration_20250802_081927 from './20250802_081927';
import * as migration_20250809_add_missing_user_columns from './20250809_add_missing_user_columns';
import * as migration_20250825_add_proxy_to_auctions from './20250825_add_proxy_to_auctions';
import * as migration_20250825_fix_cart_customers_tables from './20250825_fix_cart_customers_tables';

export const migrations = [
  {
    up: migration_20250802_081927.up,
    down: migration_20250802_081927.down,
    name: '20250802_081927'
  },
  {
    up: migration_20250809_add_missing_user_columns.up,
    down: migration_20250809_add_missing_user_columns.down,
    name: '20250809_add_missing_user_columns'
  },
  {
    up: migration_20250825_add_proxy_to_auctions.up,
    down: migration_20250825_add_proxy_to_auctions.down,
    name: '20250825_add_proxy_to_auctions'
  },
  {
    up: migration_20250825_fix_cart_customers_tables.up,
    down: migration_20250825_fix_cart_customers_tables.down,
    name: '20250825_fix_cart_customers_tables'
  },
];

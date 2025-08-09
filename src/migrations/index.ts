import * as migration_20250802_081927 from './20250802_081927';
import * as migration_20250809_fix_existing_schema from './20250809_fix_existing_schema';

export const migrations = [
  {
    up: migration_20250802_081927.up,
    down: migration_20250802_081927.down,
    name: '20250802_081927'
  },
  {
    up: migration_20250809_fix_existing_schema.up,
    down: migration_20250809_fix_existing_schema.down,
    name: '20250809_fix_existing_schema'
  },
];

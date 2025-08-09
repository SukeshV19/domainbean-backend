import * as migration_20250802_081927 from './20250802_081927';

export const migrations = [
  {
    up: migration_20250802_081927.up,
    down: migration_20250802_081927.down,
    name: '20250802_081927'
  },
];

import { Database } from './src/types/database';

type GenericTable = {
    Row: Record<string, unknown>
    Insert: Record<string, unknown>
    Update: Record<string, unknown>
    Relationships: any[]
}

type CheckTables = Database['public']['Tables'];

// If any table doesn't match GenericTable, this will error on that specific key.
type Verify<T extends Record<string, GenericTable>> = T;
type Result = Verify<CheckTables>;

/** mysql2-compatible result shape for INSERT/UPDATE/DELETE */
export interface ResultSetHeader {
  affectedRows: number;
  insertId: number;
}

/** Row shape from the database (loosely typed for practical controller code) */
export type RowDataPacket = Record<string, any>;

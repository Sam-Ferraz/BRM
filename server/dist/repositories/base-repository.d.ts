import { Pool, PoolClient } from 'pg';
export declare abstract class BaseRepository {
    protected pool: Pool;
    constructor();
    protected getClient(): Promise<PoolClient>;
    protected releaseClient(client: PoolClient): void;
    protected withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
}

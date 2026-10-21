/** Tipos del runtime de actores de Base44 (solo para comprobar el código en local; Base44 pone el de verdad). */
declare module 'base44:runtime/actors' {
  export type ActorConnectionIdentity =
    | Readonly<{ type: 'authenticated'; userId: string }>
    | Readonly<{ type: 'anonymous'; anonymousId: string }>;

  export interface Conn<Send = unknown> {
    id: string;
    identity?: ActorConnectionIdentity;
    send(data: Send): void;
    reject(code: number, reason: string): void;
  }

  export interface Storage {
    get<T>(key: string): Promise<T | undefined>;
    put(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<boolean>;
    deleteAll(): Promise<void>;
  }

  interface EntityHandler {
    filter(query: Record<string, unknown>, sort?: string, limit?: number): Promise<unknown>;
    create(data: Record<string, unknown>): Promise<unknown>;
    update(id: string, data: Record<string, unknown>): Promise<unknown>;
    delete(id: string): Promise<unknown>;
  }

  interface Client {
    entities: Record<string, EntityHandler>;
    asServiceRole: { entities: Record<string, EntityHandler> };
  }

  export abstract class Actor<Incoming = unknown, Outgoing = unknown> {
    abstract handleConnect(conn: Conn<Outgoing>): void | Promise<void>;
    abstract handleMessage(conn: Conn<Outgoing>, msg: Incoming): void | Promise<void>;
    abstract handleClose(conn: Conn<Outgoing>): void | Promise<void>;
    abstract handleTick(): void | Promise<void>;
    handleStart(): void | Promise<void>;
    protected handleWake(key: string): void | Promise<void>;
    protected schedule(key: string, at: number | Date): Promise<void>;
    protected cancelSchedule(key: string): Promise<void>;
    protected tickIntervalMs: number;
    protected shouldTick?(): boolean;
    protected broadcast(data: Outgoing): void;
    protected getConnections(): Conn<Outgoing>[];
    protected get instanceId(): string;
    protected get storage(): Storage;
    protected get client(): Client;
  }
}

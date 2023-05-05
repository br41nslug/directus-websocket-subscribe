/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Typescript types collection
 */
import type { ActionHandler, EventContext, FilterHandler, InitHandler, Query, Accountability, ApiExtensionContext as AEC } from '@directus/types';

export type WebsocketMessage = {
    type: string;
    collection?: string;
    query?: Query;
    data?: any;
    id?: any | false;
    ids?: Array<any> | false;
    uid?: string | false;
};

export type DirectusWebsocketConfig = {
    public: boolean;
    path: string;
    system: boolean;
    core: {
        get?: boolean;
        post?: boolean;
        patch?: boolean;
        delete?: boolean;
        subscribe?: boolean;
    } | false;
};

export type WebsocketClient = {
    id: string;
    socket: WebSocket;
    accountability: Accountability;
}

export type ClientEventContext = {
    parseMessage?: (msg: WebsocketMessage, request: any) => WebsocketMessage | void;
    onOpen?: (client: WebsocketClient, ev: Event) => any;
    onMessage?: (client: WebsocketClient, msg: WebsocketMessage) => Promise<any>;
    onError?: (client: WebsocketClient, ev: Event) => any;
    onClose?: (client: WebsocketClient, ev: CloseEvent) => any;
};

export type ClientHandler = (
    config: DirectusWebsocketConfig,
    context: ApiExtensionContext,
) => ClientEventContext | void;

export type ExtensionEmitter = {
    emitFilter<T>(
        event: string | string[],
        payload: T,
        meta: Record<string, any>,
        context: EventContext
    ): Promise<T>;
    emitAction(event: string | string[], meta: Record<string, any>, context: EventContext): void;
    emitInit(event: string, meta: Record<string, any>): Promise<void>;
    onFilter(event: string, handler: FilterHandler): void;
    onAction(event: string, handler: ActionHandler): void;
    onInit(event: string, handler: InitHandler): void;
    offFilter(event: string, handler: FilterHandler): void;
    offAction(event: string, handler: ActionHandler): void;
    offInit(event: string, handler: InitHandler): void;
    offAll(): void;
};

export type ApiExtensionContext = AEC & {
    emitter: ExtensionEmitter
};

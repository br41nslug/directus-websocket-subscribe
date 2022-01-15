/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Typescript types collection
 */
import { Query, Accountability, ApiExtensionContext } from '@directus/shared/types';

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
    system: {
        get: boolean;
        post: boolean;
        patch: boolean;
        delete: boolean;
        subscribe: boolean;
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
    context: ApiExtensionContext
) => ClientEventContext | void;
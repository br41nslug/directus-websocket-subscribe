/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Typescript types collection
 */
import { Query } from '@directus/shared/types';

export type WebsocketMessage = {
    type: string;
    collection?: string;
    query?: Query;
    data?: any;
    id?: any | false;
    ids?: Array<any> | false;
    uid?: string | false;
};

export type EventHandler = (payload: any) => void;

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
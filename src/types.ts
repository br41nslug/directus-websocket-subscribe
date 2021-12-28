/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Typescript types collection
 */

export type WebsocketMessage = {
    type: string;
    data: any;
    uid?: string;
};

export type EventHandler = (payload: any) => void;

export type DirectusWebsocketConfig = {
    public: boolean;
    path: string;
};
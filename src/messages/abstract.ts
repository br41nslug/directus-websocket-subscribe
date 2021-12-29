
import { ApiExtensionContext } from '@directus/shared/types';
import { WebsocketClient } from '../client';
import type { DirectusWebsocketConfig, WebsocketMessage } from '../types';

export interface MessageHandlerConstructor {
    new (config: DirectusWebsocketConfig, context: ApiExtensionContext): MessageHandler;
}

export interface MessageHandlerInterface {
    isEnabled(): boolean;
    getItemsService(collection: string, accountability: any): any;

    dispatchEvent(event: string, client: WebsocketClient, message?: WebsocketMessage): any;
    onMessage(client: WebsocketClient, message: WebsocketMessage): any;
    onConnected(client: WebsocketClient): any;
    onClosed(client: WebsocketClient): any;
}

export abstract class MessageHandler implements MessageHandlerInterface {
    protected context: ApiExtensionContext;
    protected config: DirectusWebsocketConfig;

    constructor(config: DirectusWebsocketConfig, context: ApiExtensionContext) {
        this.context = context;
        this.config = config;
    }

    isEnabled() {
        return true;
    }
    async getItemsService(collection: string, accountability: any) {
        const { 
            services: { ItemsService },
            database: knex, getSchema
        } = this.context;
        return new ItemsService(collection, {
            knex, accountability, schema: await getSchema()
        });
    }
    dispatchEvent(event: string, client: WebsocketClient, message?: WebsocketMessage) {
        try {
            switch (event) {
                case 'connected': return this.onConnected(client);
                case 'message': return this.onMessage(client, message!);
                case 'closed': return this.onClosed(client);
                default: throw new Error('undefined event: '+event);
            }
        } catch (err) {
            client.sendError(err, message);
        }
    }

    onMessage(_c: WebsocketClient, _m: WebsocketMessage): any {}
    onConnected(_c: WebsocketClient): any {}
    onClosed(_c: WebsocketClient): any {}
}
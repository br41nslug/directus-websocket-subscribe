import { MessageHandler } from './abstract';
import { WebsocketClient } from '../client';
import { WebsocketMessage } from '../types';
import { Query } from '@directus/shared/types';

export class SubscribeHandler extends MessageHandler {
    protected subscriptions: Record<string, Set<{
        id?: string | number;
        query?: Query;
        client: WebsocketClient
    }>> = {};

    isEnabled(): boolean {
        if ( ! this.config.system) {
            return false;
        }
        return this.config.system.subscribe;
    }
    subscribe(collection: string, client: WebsocketClient, conf: { id?: string, query?: Query } = {}) {
        if ( ! this.subscriptions[collection]) {
            this.subscriptions[collection] = new Set();
        }
        this.subscriptions[collection]?.add({
            ...conf, client
        });
    }
    unsubscribe(client: WebsocketClient) {
        for (const key of Object.keys(this.subscriptions)) {
			const subs = Array.from(this.subscriptions[key] || []);
			for (let i = subs.length - 1; i >= 0; i--) {
                const sub = subs[i];
                if ( ! sub) continue;
				if (sub.client === client) {
					this.subscriptions[key]?.delete(sub);
				}
			}
		}
    }
    dispatch(collection: string, msg: any) {
        this.subscriptions[collection]?.forEach(({ client }) => {    
            client.send(msg);
        });
    }

    async onMessage(client: WebsocketClient, message: WebsocketMessage) {
        if (message.type !== "SUBSCRIBE") return;
        const { logger } = this.context;
        const collection = message.collection || '';
        const service = await this.getItemsService(collection, client.accountability);
        // if not authorized the read should throw an error
        await service.readByQuery({ fields: ['*'], limit: 1 });
        // subscribe to events if all went well
        this.subscribe(collection, client, {
            id: message.id,
            query: message.query,
        });
        logger.info(`subscribed - ${message.collection} #${message.id}`);
    }
    onClosed(client: WebsocketClient) {
        this.unsubscribe(client);
    }
}
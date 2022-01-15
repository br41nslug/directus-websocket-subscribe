import { Query } from '@directus/shared/types';
import { ClientHandler, WebsocketMessage, WebsocketClient } from '../types';

export const subscribeHandler: ClientHandler = ({ system: cfg }, context) => {
    if ( ! cfg || ! cfg.subscribe) return;
    const { 
        services: { ItemsService },
        database: knex, getSchema,
        logger
    } = context;
    const subscriptions: Record<string, Set<{
        id?: string | number;
        query?: Query;
        client: WebsocketClient
    }>> = {};
    function subscribe(collection: string, client: WebsocketClient, conf: { id?: string, query?: Query } = {}) {
        if ( ! subscriptions[collection]) {
            subscriptions[collection] = new Set();
        }
        subscriptions[collection]?.add({
            ...conf, client
        });
    }
    function unsubscribe(client: WebsocketClient) {
        for (const key of Object.keys(subscriptions)) {
			const subs = Array.from(subscriptions[key] || []);
			for (let i = subs.length - 1; i >= 0; i--) {
                const sub = subs[i];
                if ( ! sub) continue;
				if (sub.client === client) {
					subscriptions[key]?.delete(sub);
				}
			}
		}
    }
    return {
        parseMessage(message: WebsocketMessage, request: any) {
            if (message.type !== "SUBSCRIBE") return;
            message.ids = request.ids || false;
            message.id = request.id || false;
            return message;
        },
        async onMessage(client: WebsocketClient, message: WebsocketMessage) {
            const service = new ItemsService(message.collection, {
                knex, schema: await getSchema(),
                accountability: client.accountability
            });
            // if not authorized the read should throw an error
            await service.readByQuery({ fields: ['*'], limit: 1 });
            // subscribe to events if all went well
            subscribe(message.collection || '', client, {
                id: message.id,
                query: message.query,
            });
            logger.info(`subscribed - ${message.collection} #${message.id}`);
        },
        onError(client: WebsocketClient) {
            unsubscribe(client);
        },
        onClose(client: WebsocketClient) {
            unsubscribe(client);
        },
        dispatch(collection: string, data: any) {
            subscriptions[collection]?.forEach(({ client }) => {    
                const msg = { type: 'SUBSCRIPTION', ...data };
                client.socket.send(JSON.stringify(msg));
            });
        },
    };
};
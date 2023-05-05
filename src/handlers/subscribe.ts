/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * SUBSCRIBE request handler
 */
import { Query } from '@directus/types';
import { ClientHandler, WebsocketMessage, WebsocketClient } from '../types';
import { Logger } from 'pino';

export const subscribeHandler: ClientHandler = ({ core: cfg }, context) => {
    if ( ! cfg || ! cfg.subscribe) return;
    const { 
        services: { ItemsService },
        database: knex, getSchema,
        logger, emitter
    } = context;
    const subscriptions: Record<string, Set<{
        uid?: string,
        id?: string | number;
        query?: Query;
        client: WebsocketClient
    }>> = {};
    function subscribe(collection: string, client: WebsocketClient, conf: Record<string, any> = {}) {
        if ( ! subscriptions[collection]) subscriptions[collection] = new Set();
        subscriptions[collection]?.add({ ...conf, client });
    }
    function unsubscribe(client: WebsocketClient, uid?: string|false|undefined) {
        for (const key of Object.keys(subscriptions)) {
			const subs = Array.from(subscriptions[key] || []);
			for (let i = subs.length - 1; i >= 0; i--) {
                const sub = subs[i];
                if ( ! sub) continue;
				if (sub.client === client && (!uid || sub.uid === uid)) {
					subscriptions[key]?.delete(sub);
				}
			}
		}
    }
    async function dispatch(collection: string, data: any) {
        const subs = subscriptions[collection] ?? new Set();
        for (const { client, query={}, uid } of subs) {
            const schema = await getSchema({ accountability: client.accountability });
            const service = new ItemsService(collection, {
                knex, schema, accountability: client.accountability
            });
            try {
                // get the payload based on the provided query
                const keys = data.key ? [ data.key ] : data.keys;
                let payload = data.action !== "delete" ? 
                    await service.readMany(keys, query) : data.payload;
                if (payload.length > 0) {
                    if (data.key) payload = payload[0];
                    const msg = await emitter.emitFilter<Record<string, any>>('websocket.subscribe.beforeSend', { 
                        type: 'SUBSCRIPTION', ...data, payload 
                    }, {}, {} as any);
                    if (uid) msg.uid = uid;
                    client.socket.send(JSON.stringify(msg));
                }
            } catch (err: any) { 
                // ignore these permission errors
                // logger.debug('[ WS ] permission error', err);
            }
        }
    }
    return {
        parseMessage(message: WebsocketMessage, request: any) {
            if (!["SUBSCRIBE","UNSUBSCRIBE"].includes(message.type)) return;
            message.ids = request?.ids || false;
            message.id = request?.id || false;
            return message;
        },
        async onMessage(client: WebsocketClient, message: WebsocketMessage) {
            if (message.type === "UNSUBSCRIBE") return unsubscribe(client, message?.uid);
            const collection = message.collection!;
            const service = new ItemsService(collection, {
                knex, schema: await getSchema(),
                accountability: client.accountability
            });
            // if not authorized the read should throw an error
            await service.readByQuery({ ...(message.query || {}), limit: 1 });
            // subscribe to events if all went well
            const sub: Record<string, any> = { id: message.id, query: message.query };
            if (message?.uid) sub.uid = message.uid;
            subscribe(collection, client, sub);
            logger.info(`subscribed - ${message.collection} #${message.id}`);
        },
        onError(client: WebsocketClient) {
            unsubscribe(client);
        },
        onClose(client: WebsocketClient) {
            unsubscribe(client);
        },
        dispatch,
        buildDispatcher(action: any, logger: Logger) {
            return (event: string, mutator?: (args:any)=>any) => {
                action(event, async (args: any) => {
                    let message = mutator ? mutator(args) : {};
                    message.action = event.split('.').pop();
                    message.collection = args.collection;
                    message.payload = args.payload;
                    logger.debug(`[ WS ] event ${event} `/*- ${JSON.stringify(message)}`*/);
                    dispatch(message.collection, message);
                });
            };
        }
    };
};
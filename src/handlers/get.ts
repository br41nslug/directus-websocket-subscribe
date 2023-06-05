/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * GET request handler
 */
import { ClientHandler, WebsocketClient, WebsocketMessage } from '../types';
import { outgoingResponse } from '../util';

export const getHandler: ClientHandler = ({ core: cfg }, context) => {
    if ( ! cfg || ! cfg.get) return;
    const { 
        services: { ItemsService },
        database: knex, getSchema
    } = context;
    return {
        parseMessage(message: WebsocketMessage) {
            if (message.type !== "GET") return;
            return message;
        },
        async onMessage(client: WebsocketClient, message: WebsocketMessage) {
            const service = new ItemsService(message.collection, {
                knex, schema: await getSchema(),
                accountability: client.accountability
            });
            const result = await service.readByQuery(message.query ?? {});
            client.socket.send(outgoingResponse(result, message));
        },
    };
};
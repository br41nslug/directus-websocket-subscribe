/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * PATCH request handler
 */
import { ClientHandler, WebsocketClient, WebsocketMessage } from '../types';
import { outgoingResponse } from '../util';

export const patchHandler: ClientHandler = ({ core: cfg }, context) => {
    if ( ! cfg || ! cfg.patch) return;
    const { 
        services: { ItemsService },
        database: knex, getSchema
    } = context;
    return {
        parseMessage(message: WebsocketMessage, request: any) {
            if (message.type !== "PATCH") return;
            message.data = request.data;
            message.ids = request.ids || false;
            message.id = request.id || false;
            return message;
        },
        async onMessage(client: WebsocketClient, message: WebsocketMessage) {
            const service = new ItemsService(message.collection, {
                knex, schema: await getSchema(),
                accountability: client.accountability
            });
            let result;
            if (message.ids) {
                const keys = await service.updateMany(message.ids, message.data);
                result = await service.readMany(keys, message.query ?? {});
            } else if (message.id) {
                const key = await service.updateOne(message.id, message.data);
                result = await service.readOne(key);
            } else {
                throw new Error("Either 'ids' or 'id' is required for a PATCH request");
            }
            client.socket.send(outgoingResponse(result, message));
        }
    }; 
};
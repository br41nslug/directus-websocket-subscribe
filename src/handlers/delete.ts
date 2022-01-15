import { ClientHandler, WebsocketMessage, WebsocketClient } from '../types';
import { outgoingResponse } from '../util';

export const deleteHandler: ClientHandler = ({ system: cfg }, context) => {
    if ( ! cfg || ! cfg.delete) return;
    const { 
        services: { ItemsService },
        database: knex, getSchema
    } = context;
    return {
        parseMessage(message: WebsocketMessage, request: any) {
            if (message.type !== "DELETE") return;
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
                await service.deleteMany(message.ids);
                result = message.ids;
            } else if (message.id) {
                await service.deleteOne(message.id);
                result = message.id;
            } else {
                throw new Error("Either 'ids' or 'id' is required for a DELETE request");
            }
            client.socket.send(outgoingResponse(result, message));
        },
    };
}
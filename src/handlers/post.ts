import { ClientHandler, WebsocketMessage, WebsocketClient } from '../types';
import { outgoingResponse } from '../util';

export const postHandler: ClientHandler = ({ system: cfg }, context) => {
    if ( ! cfg || ! cfg.post) return;
    const { 
        services: { ItemsService },
        database: knex, getSchema
    } = context;
    return {
        parseMessage(message: WebsocketMessage, request: any) {
            if (message.type !== "POST") return;
            message.data = request.data;
            return message;
        },
        async onMessage(client: WebsocketClient, message: WebsocketMessage) {
            const service = new ItemsService(message.collection, {
                knex, schema: await getSchema(),
                accountability: client.accountability
            });
            let result;
            if (Array.isArray(message.data)) {
                const keys = await service.createMany(message.data);
                result = await service.readMany(keys, message.query || {})
            } else {
                const key = await service.createOne(message.data);
                result = await service.readOne(key, message.query || {});
            }
            client.socket.send(outgoingResponse(result, message));
        },
    };
}
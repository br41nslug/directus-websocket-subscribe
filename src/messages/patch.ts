import { MessageHandler } from './abstract';
import { WebsocketClient } from '../client';
import { WebsocketMessage } from '../types';

export class PatchHandler extends MessageHandler {
    isEnabled(): boolean {
        if ( ! this.config.system) {
            return false;
        }
        return this.config.system.patch;
    }
    async onMessage(client: WebsocketClient, message: WebsocketMessage) {
        if (message.type !== "PATCH") return;
        const service = await this.getItemsService(message.collection || '', client.accountability);
        let result;
        if (message.ids) {
            const keys = await service.updateMany(message.ids, message.data);
            result = await service.readMany(keys, message.query);
        } else if (message.id) {
            const key = await service.updateOne(message.id, message.data);
            result = await service.readOne(result);
        } else {
            throw new Error("Either 'ids' or 'id' is required for a PATCH request");
        }
        client.send(result, message);
    }
}
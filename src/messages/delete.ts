import { MessageHandler } from './abstract';
import { WebsocketClient } from '../client';
import { WebsocketMessage } from '../types';

export class DeleteHandler extends MessageHandler {
    isEnabled(): boolean {
        if ( ! this.config.system) {
            return false;
        }
        return this.config.system.delete;
    }
    async onMessage(client: WebsocketClient, message: WebsocketMessage) {
        if (message.type !== "DELETE") return;
        const service = await this.getItemsService(message.collection || '', client.accountability);
        let result;
        if (message.ids) {
            await service.deleteMany(message.ids);
            result = message.ids;
        } else if (message.id) {
            await service.deleteOne(message.id);
            result = message.id;
        } else {
            throw new Error("Either 'ids' or 'id' is required for a PATCH request");
        }
        client.send(result, message);
    }
}
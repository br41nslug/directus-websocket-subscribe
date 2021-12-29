import { MessageHandler } from './abstract';
import { WebsocketClient } from '../client';
import { WebsocketMessage } from '../types';

export class PostHandler extends MessageHandler {
    isEnabled(): boolean {
        if ( ! this.config.system) {
            return false;
        }
        return this.config.system.post;
    }
    async onMessage(client: WebsocketClient, message: WebsocketMessage) {
        if (message.type !== "POST") return;
        const service = await this.getItemsService(message.collection || '', client.accountability);
        let result;
        if (Array.isArray(message.data)) {
            const keys = await service.createMany(message.data);
            result = await service.readMany(keys, message.query || {})
        } else {
            const key = await service.createOne(message.data);
            result = await service.readOne(key, message.query || {});
        }
        client.send(result, message);
    }
}
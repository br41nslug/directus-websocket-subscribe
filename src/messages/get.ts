import { MessageHandler } from './abstract';
import { WebsocketClient } from '../client';
import { WebsocketMessage } from '../types';

export class GetHandler extends MessageHandler {
    isEnabled(): boolean {
        if ( ! this.config.system) {
            return false;
        }
        return this.config.system.get;
    }
    async onMessage(client: WebsocketClient, message: WebsocketMessage) {
        if (message.type !== "GET") return;
        const service = await this.getItemsService(message.collection || '', client.accountability);
        const result = await service.readByQuery(message.query);
        client.send(result, message);
    }
}
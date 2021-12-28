/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Handles client specific logic
 */
import { v4 as uuid } from 'uuid';
import { EventDispatcher } from './events';

export class WebsocketClient extends EventDispatcher {
    protected socket: WebSocket;
    protected request: any;
    public id: string;

    constructor(socket: WebSocket, request: any) {
        super(['message', 'error', 'close']);
        this.id = uuid();
        this.socket = socket;
        this.request = request;
        this.bindEvents();
    }

    private bindEvents() {
        this.socket.addEventListener('message', (msg) => {
            this.dispatch('message', { client: this, msg })
        });
        this.socket.addEventListener('error', () => {
            this.dispatch('error', { client: this })
        });
        this.socket.addEventListener('close', () => {
            this.dispatch('close', { client: this })
        });
    }

}
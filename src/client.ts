/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Handles client specific logic
 */
import { Accountability } from '@directus/shared/types';
import { EventHandler, WebsocketMessage } from './types';
import { outgoingError, outgoingResponse } from './util';
const uuid = require('uuid');

export class WebsocketClient {
    readonly events = new Set(['message', 'closed']);
    protected socket: WebSocket;
    protected eventHandlers: Record<string, Set<EventHandler>> = {};
    public id: string;
    public accountability: Accountability;

    constructor(socket: WebSocket, request: any) {
        this.id = uuid.v4();
        this.socket = socket;
        this.accountability = request.accountability as Accountability;
        this.events.forEach((event) => {
            this.eventHandlers[event] = new Set();
        });
        this.bindEvents();
    }

    private bindEvents() {
        this.socket.addEventListener('message', (msg) => {
            this.dispatch('message', { client: this, msg });
        });
        const closeHandler = () => this.dispatch('closed', { client: this });
        this.socket.addEventListener('error', closeHandler);
        this.socket.addEventListener('close', closeHandler);
    }

    protected dispatch(event: string, payload: any) {
        if ( ! this.events.has(event)) {
            return console.error(`Event "${event}" not in (${Array.from(this.events).join(',')})`);
        }
        this.eventHandlers[event]?.forEach((callback) => {
            callback(payload);
        });
    }

    public on(event: string, handler: EventHandler) {
        if ( ! this.events.has(event)) {
            return console.error(`Event "${event}" not in (${Array.from(this.events).join(',')})`);
        }
        this.eventHandlers[event]?.add(handler);
    }

    public send(data: any, message?: WebsocketMessage) {
        this.socket.send(outgoingResponse(data, message));
    }

    public sendError(data: any, message: any) {
        this.socket.send(outgoingError(data, message));
    }
}
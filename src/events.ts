/**
 * Websocket Subscribe Extension
 * Designed for Directus 9
 * 
 * Abstract event/dispatch class.
 */

import { EventHandler } from "./types";

export abstract class EventDispatcher {
    protected $eventHandlers: Record<string, Set<EventHandler>> = {};
    protected $events: Set<string>;

    constructor(events: Iterable<string>) {
        this.$events = new Set(events);
        this.$events.forEach((event) => {
            this.$eventHandlers[event] = new Set();
        });
    }

    protected dispatch(event: string, payload: any) {
        if ( ! this.$events.has(event)) {
            return console.error(`Event "${event}" not in (${Array.from(this.$events).join(',')})`);
        }
        this.$eventHandlers[event]?.forEach((callback) => {
            callback(payload);
        });
    }

    public on(event: string, handler: EventHandler) {
        if ( ! this.$events.has(event)) {
            return console.error(`Event "${event}" not in (${Array.from(this.$events).join(',')})`);
        }
        this.$eventHandlers[event]?.add(handler);
    }

}
# Directus Websocket Subscribe
An extension to subscribe to directus updates over a websocket.

Currently this simply adds a websocket server on the `/websocket` path (this can be changed using an environment variable). You can require authentication on this endpoint or allow the public role to connect. When connected you can get/post/patch/delete items like the api following the api permission model. Besides mimicking the api this plugin adds the option to subscribe to collection updates!

You can test the websocket using the test html page [example/test.html](example/test.html) or any other tool able to connect to a websocket.

> Tested with Directus 9.19.2

## Features
- Follows directus permissions
- Websocket driven queries
- Websocket based subscriptions
- Subscription to directus system collections
- Query based subscription responses
- Environment based configuration
- Custom hook based configuration
- Custom hook based message handlers

## Installation
- Download or fork the repository
- Install the requirements\
  `npm install`
- Build the extension\
  `npm run build`
- Move the result to your extension folder\
  `mv dist extensions/hooks/directus-websocket-subscribe`
- Restart your Directus instance

# Configuration
This extension can be configured in a couple of ways. Either via a custom hook, environment variables or by editing this extension directly.

## Default configuration
```json
{
    "public": false,
    "path": "/websocket",
    "system": false,
    "core": { 
        "get": true,
        "post": true,
        "patch": true,
        "delete": true,
        "subscribe": true
    }
}
```
## Custom hook configuration
Because custom extension have access to their own event emitter now i just had to find a couple ways to use that. This extension can be configured by using the `onFilter('websocket.config', ...)` callback of the custom emitter.

### Example using directus-extension-sdk
```js
export default (_, { logger, emitter }) => {
  emitter.onFilter('websocket.config', (cfg) => {
    cfg.path = '/test'; // Change the websocket path
    cfg.public = true; // Enable public connections to the websocket
    cfg.system.delete = false; // Disable the delete handler
    return cfg;
  });
};
```
### Example using plain JS
```js
module.exports = function registerHook(_, { logger, emitter }) {
  emitter.onFilter('websocket.config', (cfg) => {
    cfg.path = '/test'; // Change the websocket path
    cfg.system = true; // Enable system collection events
    cfg.core.delete = false; // Disable the delete handler
    return cfg;
  });
};
```

## Environment Variables
All these settings can be done by environment variables too and these will override custom hook settings!
- `WEBSOCKET_PUBLIC: 'true' or 'false'`\
  If set to `true` the public role will be allowed to connect to the websocket
- `WEBSOCKET_PATH: '/websocket'`\
  You can change the websocket path using this setting.
- `WEBSOCKET_SYSTEM: 'true' or 'false'`\
  Enables/Disables subscribe events for system collections.
- `WEBSOCKET_CORE: 'true' or 'false'`\
  Enables/Disables all built-in handlers.
- `WEBSOCKET_CORE_GET: 'true' or 'false'`\
  Enables/Disables the built-in GET handler.
- `WEBSOCKET_CORE_POST: 'true' or 'false'`\
  Enables/Disables the built-in POST handler.
- `WEBSOCKET_CORE_PATCH: 'true' or 'false'`\
  Enables/Disables the built-in PATCH handler.
- `WEBSOCKET_CORE_DELETE: 'true' or 'false'`\
  Enables/Disables the built-in DELETE handler.
- `WEBSOCKET_CORE_SUBSCRIBE: 'true' or 'false'`\
  Enables/Disables the built-in SUBSCRIBE handler.
 
## Authentication
If the `WEBSOCKET_PUBLIC` variable is set to `true` you'll be allowed to connect to the websocket without any api token. If no token was used the public permissions will apply for the duration of the open connection. If a token is supplied the roles/permissions associated with that token will apply for the duration of the connection.
Like the API the token can be supplied as a header `Authorization: Bearer [TOKEN]` or as get parameter `ws://localhost:8055/websocket?access_token=[TOKEN]`.

# Message Handlers
All built-in handlers except `SUBSCRIBE` allow for a `uid` to be sent with the request which will be injected into the `RESULT` so you can identify which response belongs to which request.

When you hit an error (usually permissions) it will return an object like this:
```json
{
  "type": "ERROR",
  "data": "You don't have permission to access this."
}
```

## Core handlers
> Note: singletons are not supported yet.

### GET Handler
**Request**
```json
{
  "type": "GET",
  "collection": "test",
  "query": {
    "limit": 2
  }
}
```
The `type` property is case insensitive! \
The query object follows the `ItemService.readByQuery` options. \
**Response**
```json
{
  "type": "RESPONSE",
  "data": [/*List of requested items*/]
}
```
### POST Handler
**Request**
```json
{
  "type": "post",
  "collection": "test",
  "data": {
    "test": "test123"
  }
}
``` 
```json
{
  "type": "post",
  "collection": "test",
  "data": [
    { "test": "test123" },
    { "test": "test456" }
  ]
}
```
The `type` property is case insensitive! \
The query object follows the `ItemService.createOne` or `ItemService.createMany` options. \
**Response**
```json
{
  "type": "RESPONSE",
  "data": [
    { "id": 6, "test": "test123" },
    { "id": 7, "test": "test456" }
  ]
}
```
### PATCH Handler
**Request**
```json
{
  "type": "PATCH",
  "collection": "test",
  "id": 7,
  "data": {
    "test": "test321"}
  }
```
```json
{
  "type": "PATCH",
  "collection": "test",
  "ids": [7, 6],
  "data": {
    "test": "test42"
  }
}
```
The `type` property is case insensitive! \
The query object follows the `ItemService.updateOne` or `ItemService.updateMany` options. \
**Response**
```json
{
  "type": "RESPONSE",
  "data": {
    "id": 7,
    "test": "test321"
  }
}
```
### DELETE Handler
**Request**
```json
{
  "type": "DELETE",
  "collection": "test",
  "id": 3
}
```
```json
{
  "type": "DELETE",
  "collection": "test",
  "ids": [7, 6]
}
```
The `type` property is case insensitive! \
The query object follows the `ItemService.deleteOne` or `ItemService.deleteMany` options. \
**Response**
```json
{
  "type": "RESPONSE",
  "data": [7, 6]
}
```
### SUBSCRIBE Handler
**Request**
```json
{
  "type": "subscribe",
  "collection": "test"
  "query"?: {
    "fields": ["id", "fieldA", "relation.*"]
  }
}
```
The subscribe type will require the `read` permissions on the collection you want to receive events for. The `query` here is optional but allows you to define what kind of informations you'd like to receive with your subscription acception the same query option `ItemsService.readMany(ids, query)` does.\
> Note: it is possible to get no results/messages on events due to the filters defined in the query
**Hooked actions**
- `items.create`
- `items.update`
- `items.delete`

**Response**
> Note: response payload will depend on the provided query and default to the full accessible object
```json
{
  "type": "SUBSCRIPTION",
  "action": "create",
  "payload": {
    "id": 1,
    "test": "test123",
  },
  "key": 1,
  "collection": "test"
}
```
```json
{
  "type": "SUBSCRIPTION",
  "action": "update",
  "payload": [
    {
      "name": "test123456"
    }
  ],
  "keys": [
    "1"
  ],
  "collection": "test"
}
```
```json
{
  "type": "SUBSCRIPTION",
  "action": "delete",
  "payload": [
    "1"
  ],
  "collection": "test"
}
```

### Subscription filter
Using a custom hook you can manipulate the response sent by the built-in SUBSCRIBE handler. The `websocket.subscribe.beforeSend` filter callback provides the message it would send as a parameter and the dispatcher will send the returned value to all clients subcribed to the original event.\
Note: You cannot manipulate which clients the message is sent to\
**Example using directus-extension-sdk**
```js
export default (_, { services, database: knex, getSchema, emitter }) => {
  emitter.onFilter('websocket.subscribe.beforeSend', async (message) => {
    if (message.action === 'update') {
      // read the full item when an update occurs
      const service = new services.ItemsService(message.collection, {
        knex, schema: await getSchema(), accountability: { admin: true }
      });
      message.payload = await service.readMany(message.keys);
    }
    return message;
  });
};
```
**Example using plain JS**
```js
module.exports = function registerHook(_, { 
  services, database: knex, getSchema, emitter
}) {
  emitter.onFilter('websocket.subscribe.beforeSend', async (message) => {
    if (message.action === 'update') {
      // read the full item when an update occurs
      const service = new services.ItemsService(message.collection, {
        knex, schema: await getSchema(), accountability: { admin: true }
      });
      message.payload = await service.readMany(message.keys);
    }
    return message;
  });
};
```
**Example resulting response**
```json
{
  "type": "SUBSCRIPTION",
  "action": "update",
  "collection": "test",
  "payload": [
    {
      "id": 1,
      "test": "update 123",
      "status": "published",
      "sort": null
    }
  ],
  "keys": [
    "1"
  ]
}
```

## Custom handlers
It is possible to extend this extension using another custom extension! Yes thats a lot of extending! This allow you to add custom callbacks for handling all websocket client events and sending custom messages over the websocket.

For the actual docs on how to create Hooks i'll refer to the Directus documentation. For the examples here i'll use ES6 style javascript without using the `directus-extension-sdk` but it should be trivial to adapt for use with the SDK.
> Note: For now this is JS only because can't be bothered yet to export the required types in a sensible way. 

A very basic extension bootstrap without the actual handler code would look something like this:
```js
module.exports = function registerHook(_, { emitter }) {
    emitter.onFilter('websocket.register', (registerHandler) => {
        registerHandler(customHandlerFunction);
    });
};
```

### Registering Handlers

If you just want something running now! here you can find a [quick and dirty proof of concept](examples/custom-integration/index.js).

The register function passed to the filter event accepts 1 parameter which should be a function (of type `ClientHandler` in this extension) and returns the output of this `ClientHandler` when executed.

The handler function is passed the internal configuation as `config` (definition can be found elsewhere in this documentation) and the `context` which is the `ApiExtensionContext` for the running directus-websocket-subscribe instance.

The return object can look like this: (extra properties are not a problem!)
```typescript
type ClientEventContext = {
    parseMessage?: (msg: WebsocketMessage, request: any) => 
        WebsocketMessage | void;
    onOpen?: (client: WebsocketClient, ev: Event) => any;
    onMessage?: (client: WebsocketClient, msg: WebsocketMessage) => 
        Promise<any>;
    onError?: (client: WebsocketClient, ev: Event) => any;
    onClose?: (client: WebsocketClient, ev: CloseEvent) => any;
}
type WebsocketMessage = {
    type: string;
    collection?: string;
    query?: Query;
    data?: any;
    id?: any | false;
    ids?: Array<any> | false;
    uid?: string | false;
}
type WebsocketClient = {
    id: string;
    socket: WebSocket;
    accountability: Accountability;
}
```
Even though the `parseMessage` function is optional it is crucial in deciding whether `onMessage` callback will be triggered! If `parseMessage` either is or returns `falsy` then the handler will be skipped for the current incoming message.
Besides that these events are almost directly mirrored from the low-level websocket events.

```js
function customEchoHandler(config, context) {
  return {
    parseMessage(message) {
      if (message.type !== "ECHO") return;
      return message;
    },
    async onMessage(client, message) {
      client.socket.send(JSON.stringify(message));
    },
  };
}
```
```js
function customGetHandler(config, context) {
    const { 
        services: { ItemsService },
        database: knex, getSchema
    } = context;
    return {
        parseMessage(message) {
            if (message.type !== "EXAMPLE") return;
            return message;
        },
        async onMessage(client, message) {
            const service = new ItemsService(message.collection, {
                knex, schema: await getSchema(),
                accountability: client.accountability
            });
            const result = await service.readByQuery(message.query);
            const msg = { type: 'RESPONSE', data: result };
            if (message?.uid) msg.uid = message.uid;
            client.socket.send(JSON.stringify(msg));
        },
    };
}
```

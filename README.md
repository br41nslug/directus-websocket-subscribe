# Directus Websocket Subscribe
An extension to subscribe to directus updates over a websocket.

Currently this simply adds a websocket server on the `/websocket` path (this can be changed using an environment variable). You can require authentication on this endpoint or allow the public role to connect. When connected you can get/post/patch/delete items like the api following the api permission model. Besides mimicking the api this plugin adds the option to subscribe to collection updates!

You can test the websocket using the test html page [example/test.html](example/test.html).

## Installation
- Download or fork the repository
- Install the requirements\
  `npm install`
- Build the extension\
  `npm run build`
- Move the result to your extension folder\
  `mv dist extensions/hooks/directus-websocket-subscribe`
- Restart your Directus instance

> Disclaimer: this is absolutely still in alpha status and should not get near any sort of production environment!
 
## Authentication
If the `WEBSOCKET_PUBLIC` variable is set to `true` you'll be allowed to connect to the websocket without any api token. If no token was used the public permissions will apply for the duration of the open connection. If a token is supplied the roles/permissions associated with that token will apply for the duration of the connection.
Like the API the token can be supplied as a header `Authorization: Bearer [TOKEN]` or as get parameter `ws://localhost:8055/websocket?access_token=[TOKEN]`.

## Message Handlers
All built-in handlers except `SUBSCRIBE` allow for a `uid` to be sent with the request which will be injected into the `RESULT` so you can identify which response belongs to which request.

When you hit an error (usually permissions) it will return an object like this:
```json
{
  "type": "ERROR",
  "data": "You don't have permission to access this."
}
```

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
}
```
The subscribe type will require the `read` permissions on the collection you want to receive events for.\
**Hooked actions**
- `items.create`
- `items.update`
- `items.delete`

**Response**
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
  "payload": {
    "name": "test123456"
  },
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

# Configuration
This extension can be configured in a couple of ways. Either via a custom hook, environment variables or by editing this extension directly.

## Default configuration
```json
{
    "public": false,
    "path": "/websocket",
    "system": { 
        "get": true,
        "post": true,
        "patch": true,
        "delete": true,
        "subscribe": true
    }
}
```


## Custom filter hook
Because custom extension have access to their own event emitter now i just had to find a couple ways to use that. This extension can be configured by using the `onFilter('websocket.config', ...)` callback of the custom emitter.

### Example using directus-extension-sdk
```js
export default (_, { logger, emitter }) => {
  emitter.onFilter('websocket.config', (cfg) => {
    cfg.path = '/test'; // Change the websocket path
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
    cfg.system.delete = false; // Disable the delete handler
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
- `WEBSOCKET_SYSTEM_GET: 'true' or 'false'`\
  Enables/Disables the built-in GET handler
- `WEBSOCKET_SYSTEM_POST: 'true' or 'false'`\
  Enables/Disables the built-in POST handler
- `WEBSOCKET_SYSTEM_PATCH: 'true' or 'false'`\
  Enables/Disables the built-in PATCH handler
- `WEBSOCKET_SYSTEM_DELETE: 'true' or 'false'`\
  Enables/Disables the built-in DELETE handler
- `WEBSOCKET_SYSTEM_SUBSCRIBE: 'true' or 'false'`\
  Enables/Disables the built-in SUBSCRIBE handler


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

## Authentication
If the `WEBSOCKET_PUBLIC` variable is set to `true` you'll be allowed to connect to the websocket without any api token. If no token was used the public permissions will apply for the duration of the open connection. If a token is supplied the roles/permissions associated with that token will apply for the duration of the connection.
Like the API the token can be supplied as a header `Authorization: Bearer [TOKEN]` or as get parameter `ws://localhost:8055/websocket?api_token=[TOKEN]`.

## Message Types
All types except `SUBSCRIBE` allow for a `uid` to be sent with the request which will be injected into the `RESULT` so you can identify which response belongs to which request.

When you hit an error (usually permissions) it will return an object like this: `{"type": "ERROR", "data": {"status": 403, "code": "FORBIDDEN"}}`.

> Note: singletons are not supported yet.

### GET
You request data by sending a message like this to the server: `{"type":"get", "collection":"test", "query":{"limit":2}}`.
Where the query object follows the `ItemService.readByQuery` options.
The server should respond with an object like this: `{"type":"RESPONSE","data":[...]}`.
### POST
You can create new items by sending a message like this to the server: `{"type":"post", "collection":"test", "data":{"test":"test123"}}` or `{"type":"post", "collection":"test", "data":[{"test":"test123"},{"test":"test456"}]}`.
Where the query object follows the `ItemService.createOne` or `ItemService.createMany` options.
The server should respond with an object like this: `{"type":"RESPONSE","data":[{"id":6,"test":"test123"},{"id":7,"test":"test456"}]}`.
### PATCH
You can update items by sending a message like this to the server: `{"type": "PATCH", "collection": "test", "id": 7, "data": {"test":"test321"}}` or `{"type": "PATCH", "collection": "test", "ids": [7,6], "data": {"test":"test42"}}`.
Where the query object follows the `ItemService.updateOne` or `ItemService.updateMany` options.
The server should respond with an object like this: `{"type":"RESPONSE","data":{"id":7,"test":"test321"}}`.
### DELETE
You can delete items by sending a message like this to the server: `{"type": "DELETE", "collection": "test", "id": 3}` or `{"type": "PATCH", "collection": "test", "ids": [7,6]}`.
Where the query object follows the `ItemService.deleteOne` or `ItemService.deleteMany` options.
The server should respond with an object like this: `{"type":"RESPONSE","data":[7,6]}`.
### SUBSCRIBE
You can subscribe to updates of any collection like this: `{"type":"subscribe", "collection":"test"}`.
The subscribe type will require the `read` permissions on the collection you want to receive events for.
When subscribed you will receive updates like a custom hook would (actions: `items.create`,`items.update`,`items.delete`) but over the websocket!
The update objects will look like this: `{"action":"update","payload":{"test":"new value","status":"published"},"keys":["3"],"collection":"test"}`

> Disclaimer: this is absolutely still in alpha status and should not get near any sort of production environment!

## Environment Variables
- `WEBSOCKET_ENABLED: 'true' or 'false'`\
  Enables the websocket! If set to false all functions will be aborted
- `WEBSOCKET_PUBLIC: 'true' or 'false'`\
  If set to `true` the public role will be allowed to connect to the websocket
- `WEBSOCKET_PATH: '/websocket'`\
  You can change the websocket path using this setting.
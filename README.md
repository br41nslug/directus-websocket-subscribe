# Directus Websocket Subscribe
An extension to subscribe to directus updates over a websocket.

Currently this simply adds a websocket server on the "/websocket" path (this can be changed using an environment variable). You can require authentication on this endpoint or allow the public role to connect. When connected you can get/post/patch/delete items like the api following the api permission model. Besides mimicking the api this plugin adds the option to subscribe to collection updates!

You can test the websocket using the test html page [example/test.html](example/test.html).

## Installation
Download, build and upload to `/directus/extensions/hooks/directus-websocket-subscribe`

## Authentication
If the `WEBSOCKET_PUBLIC` variable is set to `true` you'll be allowed to connect to the websocket without any api token. If no token was used the public permissions will apply for the duration of the open connection. If a static token is supplied the roles/permissions associated with that token will apply for the duration of the connection (it will copy the api permissions as close as possible).
Like the API the token can be supplied as a header `Authorization: Bearer [TOKEN]` or as get parameter `ws://localhost:8055/websocket?api_token=[TOKEN4]`.
> Note: generated tokens are not supported yet!

## Message Types
### GET
You request data by sending a message like this to the server: `{"type":"get", "collection":"test", "query":{"limit":2}}`.
Where the query object follows the ItemService.readByQuery options.
The server should respond with an object like this: `{"type":"RESPONSE","data":[...]}`.
### POST
### PATCH
### DELETE
### SUBSCRIBE
You can subscribe to updates of any collection like this: `{"type":"subscribe", "collection":"test"}`.
The subscribe type will require the `read` permissions on the collection you want to receive events for.
When subscribed you will receive updates like a custom hook would (actions: `items.create`,`items.update`,`items.delete`) but over the websocket!
The update objects will look like this: `{"action":"update","payload":{"test":"new value","status":"published"},"keys":["3"],"collection":"test"}`

> Disclaimer: this is absolutely in alpha status and should not get near any sort of production environment! This should definitely not be considered secure in any way!

## Environment Variables
- `WEBSOCKET_ENABLED: 'true' or 'false'`\
  Enables the websocket! If set to false all functions will be aborted
- `WEBSOCKET_PUBLIC: 'true' or 'false'`\
  If set to `true` the public role will be allowed to connect to the websocket
- `WEBSOCKET_PATH: '/websocket'`\
  You can change the websocket path using this setting.
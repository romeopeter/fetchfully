# simple-fetcher
An object-first wrapper for the JavaScript fetch API

2. Default Logic for POST, PATCH, DELETE
For mutation requests:

* POST: The developer only specifies the data to send; the logic automatically adds it as the body.
* PATCH: The developer specifies what needs to be updated, and it sends that data in the request.
* DELETE: Only the action is required, and the request sends no body unless needed (in some cases, APIs may accept a body with DELETE).
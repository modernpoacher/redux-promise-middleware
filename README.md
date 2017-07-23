# Zashiki Promise Middleware

Zashiki Promise Middleware is a fork of the successful and popular [Redux Promise Middleware v4.3.0](https://github.com/pburtchaell/redux-promise-middleware/releases/tag/4.3.0) by Patrick Burtchaell, et al, and adapted for Zashiki by Modern Poacher Limited.

For an introduction, you should review the [Redux Promise Middleware](https://github.com/pburtchaell/redux-promise-middleware) package and [its documentation](https://github.com/pburtchaell/redux-promise-middleware/tree/master/docs). 

## Differences

When Zashiki Promise Middleware receives an action with a Promise payload, it dispatches two additional actions: a "pending" action, and then either a "fulfilled" or "rejected" action when the Promise is resolved. This is consistent with Redux Promise Middleware.


Zashiki Promise Middleware handles errors in "pending", "fulfilled" or "rejected" actions slightly differently to Redux Promise Middleware.

Any of the additional actions may encounter errors, but they will be caught and raised only when the Promise has been fulfilled or rejected: 

1. _Promise Middleware should always dispatch a "pending" action, and either a "fulfilled" or "rejected" action_
2. _An error in the "pending" or "fulfilled" actions should never dispatch a "rejected" action_
3. _The error in a rejected Promise must be raised_
4. _An error in any of the "pending", "fulfilled" or "rejected" actions must be raised_

It is possible for a Promise to be fulfilled yet raise an error if any of the additional actions encounter an error; similarly, it is possible for a Promise to be rejected and for any of the additional actions to encounter an error, too. 

To address this, Zashiki Promise Middleware extends and exports the `Error` class as `PromiseError`.

When a Promise is rejected, the middleware returns an `Error` instance. When another error is encountered, the middleware returns a `PromiseError` instance, and appends that other error as the property `error`. In this way, all of the errors can be accessed as a chain on the instance raised to the caller.

---
Copyright &copy; 2015 Patrick Burtchaell. [Licensed with The MIT License (MIT)](https://github.com/modernpoacher/Zashiki.PromiseMiddleware/blob/master/LICENSE).
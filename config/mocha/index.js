/* eslint no-unused-vars: 0, no-unused-expressions: 0, no-shadow: 0 */
import Bluebird from 'bluebird'
import { createStore, applyMiddleware } from 'redux'
import configureStore from 'redux-mock-store'
import promiseMiddleware, { PENDING, FULFILLED, REJECTED } from '~/src'

describe('Zashiki Promise Middleware:', () => {
  let store
  let promiseAction
  let pendingAction
  let fulfilledAction
  let rejectedAction

  const promiseValue = 'foo'
  const promiseError = new Error('bar')

  const CUSTOM_PENDING_PREFIX = 'CUSTOM_PENDING'
  const CUSTOM_FULFILLED_PREFIX = 'CUSTOM_FULFILLED'
  const CUSTOM_REJECTED_PREFIX = 'CUSTOM_REJECTED'
  const customTypes = [
    CUSTOM_PENDING_PREFIX,
    CUSTOM_FULFILLED_PREFIX,
    CUSTOM_REJECTED_PREFIX
  ]

  const optimisticUpdateData = { foo: true }
  const metaData = { bar: true }
  const lastMiddlewareData = { baz: true }

  const defaultPromiseAction = {
    type: 'ACTION',
    payload: new Promise(resolve => resolve(promiseValue))
  }

  const defaultPendingAction = {
    type: 'ACTION_PENDING'
  }

  const defaultFulfilledAction = {
    type: 'ACTION_FULFILLED',
    payload: promiseValue
  }

  const defaultRejectedAction = {
    type: 'ACTION_REJECTED',
    payload: promiseError,
    error: true
  }

  const nextHandler = promiseMiddleware()

  it('must export correct default promise status', () => {
    chai.assert.equal(PENDING, 'PENDING')
    chai.assert.equal(FULFILLED, 'FULFILLED')
    chai.assert.equal(REJECTED, 'REJECTED')
  })

  it('must return a function to handle next', () => {
    chai.assert.isFunction(nextHandler)
    chai.assert.strictEqual(nextHandler.length, 1)
  })

  /**
   * Make two fake middleware to surround promiseMiddleware in chain,
   * Give both of them a spy property to assert on their usage
   */
  // first middleware mimics redux-thunk
  function firstMiddlewareThunk (ref, next) {
    this.spy = sinon.spy((action) => {
      if (typeof action === 'function') {
        return action(ref.dispatch, ref.getState)
      }

      return next(action)
    })

    return this.spy
  }

  // final middleware returns the action merged with dummy data
  function lastMiddlewareModifies (next) {
    this.spy = sinon.spy((action) => {
      next(action)

      return {
        ...action,
        ...lastMiddlewareData
      }
    })

    return this.spy
  }

  /*
   * Function for creating a dumb store using fake middleware stack
   */
  const makeStore = (config, reducer = () => null) => applyMiddleware(
    ref => next => firstMiddlewareThunk.call(firstMiddlewareThunk, ref, next),
    promiseMiddleware(config),
    () => next => lastMiddlewareModifies.call(lastMiddlewareModifies, next)
  )(createStore)(reducer)

  beforeEach(() => {
    store = makeStore()
  })

  afterEach(() => {
    firstMiddlewareThunk.spy.reset()
    lastMiddlewareModifies.spy.reset()
  })

  context('When action is not a promise:', () => {
    const mockAction = { type: 'ACTION' }

    it('invokes next with the action', () => {
      store.dispatch(mockAction)
      expect(lastMiddlewareModifies.spy).to.have.been.calledWith(mockAction)
    })

    it('returns the return from next middleware', () => {
      expect(store.dispatch(mockAction)).to.eql({
        ...mockAction,
        ...lastMiddlewareData
      })
    })

    it('does not dispatch any other actions', () => {
      const mockStore = configureStore([promiseMiddleware()])
      const store = mockStore({})
      store.dispatch(mockAction)

      expect([mockAction]).to.eql(store.getActions())
    })
  })

  context('When action has promise payload:', () => {
    beforeEach(() => {
      promiseAction = defaultPromiseAction
      pendingAction = defaultPendingAction
      rejectedAction = defaultRejectedAction
      fulfilledAction = defaultFulfilledAction
    })

    afterEach(() => {
      promiseAction = defaultPromiseAction
      pendingAction = defaultPendingAction
      rejectedAction = defaultRejectedAction
      fulfilledAction = defaultFulfilledAction
    })

    /**
     * This tests if the middleware dispatches a pending action when the payload
     * property has a Promise object as the value. This is considered an "implicit"
     * promise payload.
     */
    it('dispatches a pending action for implicit promise payload', () => {
      store.dispatch(promiseAction)
      expect(lastMiddlewareModifies.spy).to.have.been.calledWith(pendingAction)
    })

    /**
     * This tests if the middleware dispatches a pending action
     * when the payload has a `promise` property with a Promise object
     * as the value. This is considered an "explicit" promise payload because
     * the `promise` property explicitly describes the value.
     */
    it('dispatches a pending action for explicit promise payload', () => {
      store.dispatch({
        type: promiseAction.type,
        payload: {
          promise: promiseAction.payload
        }
      })
      expect(lastMiddlewareModifies.spy).to.have.been.calledWith(pendingAction)
    })

    /**
     * If the promise action is dispatched with a data property, that property and value
     * must be included in the pending action the middleware dispatches. This property
     * is used for optimistic updates.
     */
    it('pending action optionally contains optimistic update payload from data property', () => {
      store.dispatch({
        type: promiseAction.type,
        payload: {
          promise: promiseAction.payload,
          data: optimisticUpdateData
        }
      })
      expect(lastMiddlewareModifies.spy).to.have.been.calledWith(
        Object.assign({}, pendingAction, {
          payload: optimisticUpdateData
        })
      )
    })

    it('pending action optionally contains falsy optimistic update payload', () => {
      store.dispatch({
        type: promiseAction.type,
        payload: {
          promise: promiseAction.payload,
          data: 0
        }
      })

      expect(lastMiddlewareModifies.spy).to.have.been.calledWith(
        Object.assign({}, pendingAction, {
          payload: 0
        })
      )
    })

    /**
     * If the promise action is dispatched with a meta property, the meta property
     * and value must be included in the pending action.
     */
    it('pending action contains meta property', () => {
      store.dispatch(Object.assign({}, promiseAction, {
        meta: metaData
      }))
      expect(lastMiddlewareModifies.spy).to.have.been.calledWith(
        Object.assign({}, pendingAction, {
          meta: metaData
        })
      )
    })

    it('pending action contains falsy meta property', () => {
      store.dispatch(Object.assign({}, promiseAction, {
        meta: 0
      }))
      expect(lastMiddlewareModifies.spy).to.have.been.calledWith(
        Object.assign({}, pendingAction, {
          meta: 0
        })
      )
    })

    /**
     * The middleware should allow global custom action types included
     * in the config when the middleware is constructed.
     */
    it('permits configuration of pending action `type`', () => {
      store = makeStore({ types: customTypes })
      store.dispatch(promiseAction)

      expect(lastMiddlewareModifies.spy).to.have.been.calledWith(
        Object.assign({}, pendingAction, {
          type: `${promiseAction.type}_${CUSTOM_PENDING_PREFIX}`
        })
      )
    })
  })

  context('When promise is fulfilled:', () => {
    beforeEach(() => {
      promiseAction = {
        type: defaultPromiseAction.type,
        payload: new Promise(resolve => resolve(promiseValue))
      }

      fulfilledAction = defaultFulfilledAction
    })

    /**
     * If the dispatch() call fails when dispatching the _FULFILLED action
     * (for example, errors in connected component renders()), don't change it
     * to a promise rejection
     */
    it('does not send a rejected action if dispatch fails', done => {
      const fulfilledType = `${promiseAction.type}_FULFILLED`
      store = makeStore(undefined, (state, action) => {
        if (action.type === fulfilledType) {
          throw new Error()
        } else {
          return null
        }
      })
      const actionDispatched = store.dispatch(promiseAction)

      actionDispatched.then(
        (action) => {
          expect(action).to.eql({
            type: fulfilledType,
            payload: promiseValue
          })
        },
        () => {
          expect(true).to.equal(false) // Expect this is not called
        }
      ).then(done, done)
    })

    /**
     * This test ensures the original promise object is not mutated. In the case
     * a promise library is used, adding methods to the promise class, the
     * middleware should not remove those methods.
     */
    it('does not mutate the promise', done => {
      const actionDispatched = store.dispatch({
        type: defaultPromiseAction.type,
        payload: Bluebird.resolve(promiseValue)
      })

      // Expect the promise returned has orginal methods available
      expect(actionDispatched.any).to.be.a('function')

      actionDispatched.then(
        (action) => {
          expect(action).to.eql(fulfilledAction)
        },
        () => {
          expect(true).to.equal(false) // Expect this is not called
        }
      ).then(done, done)
    })

    context('When resolve value is null:', () => {
      const nullResolveAction = {
        type: defaultPromiseAction.type,
        payload: Promise.resolve(null)
      }

      it('resolved action is dispatched', done => {
        const actionDispatched = store.dispatch(nullResolveAction)

        actionDispatched.then(
          (action) => {
            expect(action).to.eql({
              type: `${nullResolveAction.type}_FULFILLED`
            })
          },
          () => {
            expect(true).to.equal(false) // Expect this is not called
          }
        ).then(done, done)
      })

      it('resolved action `payload` property is undefined', done => {
        const actionDispatched = store.dispatch(nullResolveAction)

        actionDispatched.then(
          (action) => {
            expect(action.payload).to.be.undefined
          },
          () => {
            expect(true).to.equal(false) // Expect this is not called
          }
        ).then(done, done)
      })
    })

    context('When resolve value is false:', () => {
      const falseResolveAction = {
        type: defaultPromiseAction.type,
        payload: Promise.resolve(false)
      }

      it('resolved action is dispatched', done => {
        const actionDispatched = store.dispatch(falseResolveAction)

        actionDispatched.then(
          (action) => {
            expect(action).to.eql({
              type: `${falseResolveAction.type}_FULFILLED`,
              payload: false
            })
          },
          () => {
            expect(true).to.equal(false) // Expect this is not called
          }
        ).then(done, done)
      })

      /**
       * If the resolved promise value is false, then there should still be a
       * payload on the dispatched resolved action.
       */
      it('resolved action `payload` property is false', done => {
        const actionDispatched = store.dispatch(falseResolveAction)

        actionDispatched.then(
          (action) => {
            expect(action.payload).to.be.false
          },
          () => {
            expect(true).to.equal(false) // Expect this is not called
          }
        ).then(done, done)
      })
    })

    context('When resolve value is zero:', () => {
      const zeroResolveAction = {
        type: defaultPromiseAction.type,
        payload: Promise.resolve(0)
      }

      it('resolved action is dispatched', done => {
        const actionDispatched = store.dispatch(zeroResolveAction)

        actionDispatched.then(
          (action) => {
            expect(action).to.eql({
              type: `${zeroResolveAction.type}_FULFILLED`,
              payload: 0
            })
          },
          () => {
            expect(true).to.equal(false) // Expect this is not called
          }
        ).then(done, done)
      })

      /**
       * If the resolved promise value is zero, then there should still be a
       * payload on the dispatched resolved action.
       */
      it('resolved action `payload` property is zero', done => {
        const actionDispatched = store.dispatch(zeroResolveAction)

        actionDispatched.then(
          (action) => {
            expect(action.payload).to.eq(0)
          },
          () => {
            expect(true).to.equal(false) // Expect this is not called
          }
        ).then(done, done)
      })
    })

    it('persists `meta` property from original action', async () => {
      await store.dispatch({
        type: promiseAction.type,
        payload: promiseAction.payload,
        meta: metaData
      })

      expect(lastMiddlewareModifies.spy).to.have.been.calledWith({
        type: `${promiseAction.type}_FULFILLED`,
        payload: promiseValue,
        meta: metaData
      })
    })

    it('permits configuration of fulfilled action `type`', done => {
      store = makeStore({
        types: customTypes
      })

      fulfilledAction = {
        type: `${promiseAction.type}_${CUSTOM_FULFILLED_PREFIX}`,
        payload: promiseValue
      }

      const actionDispatched = store.dispatch(promiseAction)

      actionDispatched
        .then((action) => {
          expect(action).to.eql(fulfilledAction)
        })
        .then(done)
    })
  })

  context('When promise is rejected:', () => {
    beforeEach(() => {
      promiseAction = {
        type: defaultPromiseAction.type,
        payload: new Promise(() => {
          throw promiseError
        })
      }

      rejectedAction = defaultRejectedAction
    })

    it('errors can be caught with `catch`', () => {
      const actionDispatched = store.dispatch(promiseAction)

      actionDispatched
        .then(() => expect(true).to.equal(false))
        .catch(error => {
          expect(error).to.be.instanceOf(Error)
          expect(error.message).to.equal(promiseError.message)
        })
    })

    it('errors can be caught with `then`', () => {
      const actionDispatched = store.dispatch(promiseAction)

      actionDispatched.then(
        () => expect(true).to.equal(false),
        (error) => {
          expect(error).to.be.instanceOf(Error)
          expect(error.message).to.equal(promiseError.message)
        }
      )
    })

    it('rejected action `error` property is true', () => {
      const mockStore = configureStore([
        promiseMiddleware()
      ])

      const store = mockStore({})

      store.dispatch(
        promiseAction
      ).catch(() => {
        const [
          pendingAction,
          rejectedAction
        ] = store.getActions()

        expect(pendingAction.error).to.be.undefined
        expect(rejectedAction.error).to.be.true
      })
    })

    xit('rejected action `payload` property is original rejected instance of Error', () => {
      const rejectedError = new Error('error')

      const store = configureStore([
        promiseMiddleware()
      ])({})

      store.dispatch({
        type: defaultPromiseAction.type,
        payload: Promise.reject(rejectedError)
      }).catch(() => {
        const [
          pendingAction,
          rejectedAction
        ] = store.getActions()

        expect(pendingAction.payload).to.be.undefined
        expect(rejectedAction.payload).to.be.equal(rejectedError)
      })
    })

    xit('promise returns original rejected instance of Error', () => {
      const rejectedError = new Error('error')

      const actionDispatched = store.dispatch({
        type: defaultPromiseAction.type,
        payload: Promise.reject(rejectedError)
      })

      actionDispatched
        .catch((error) => {
          expect(error).to.be.equal(rejectedError)
          expect(error.message).to.be.equal(rejectedError.message)
        })
    })

    it('permits configuration of rejected action `type`', () => {
      const mockStore = configureStore([
        promiseMiddleware({
          types: customTypes
        })
      ])

      const expectedRejectAction = {
        type: `${promiseAction.type}_${CUSTOM_REJECTED_PREFIX}`,
        error: rejectedAction.error,
        payload: rejectedAction.payload
      }

      const store = mockStore({})

      store.dispatch(
        promiseAction
      ).catch(() => {
        expect(store.getActions()).to.include(expectedRejectAction)
      })
    })
  })
})

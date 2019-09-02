/* eslint no-unused-vars: 0, no-unused-expressions: 0, no-shadow: 0 */
import { createStore, applyMiddleware } from 'redux'
import configureStore from 'redux-mock-store'
import promiseMiddleware, {
  PENDING,
  FULFILLED,
  REJECTED,
  PromiseError
} from '~/src'

describe('Zashiki Promise Middleware', () => {
  let promiseAction

  const foo = 'foo'
  const bar = 'bar'
  const baz = 'baz'

  const promiseValue = foo
  const promiseError = new Error(bar)

  const CUSTOM_PENDING = 'CUSTOM_PENDING'
  const CUSTOM_FULFILLED = 'CUSTOM_FULFILLED'
  const CUSTOM_REJECTED = 'CUSTOM_REJECTED'

  const customStatus = [
    CUSTOM_PENDING,
    CUSTOM_FULFILLED,
    CUSTOM_REJECTED
  ]

  const mockData = { foo }
  const metaData = { bar }

  /**
   * Two middleware functions surround promiseMiddleware in the chain.
   * Both of them have a spy
   */
  function antePromiseMiddleware ({ dispatch, getState }, next) {
    return (
      this.spy = sinon.spy((action) => {
        return (action instanceof Function)
          ? action(dispatch, getState)
          : next(action)
      })
    )
  }

  function postPromiseMiddleware (next) {
    return (
      this.spy = sinon.spy((action) => ({
        ...next(action),
        baz
      }))
    )
  }

  function antePromisePromiseMiddleware ({ dispatch, getState }, next) {
    return (
      this.spy = sinon.spy((action) => {
        return (action instanceof Function)
          ? Promise.resolve(action(dispatch, getState))
          : Promise.resolve(next(action))
      })
    )
  }

  function postPromisePromiseMiddleware (next) {
    return (
      this.spy = sinon.spy((action) => Promise.resolve({
        ...next(action),
        baz
      }))
    )
  }

  const makeStore = (config, reducer = (state = {}) => state) => applyMiddleware(
    store => next => antePromiseMiddleware.call(antePromiseMiddleware, store, next),
    promiseMiddleware(config),
    () => next => postPromiseMiddleware.call(postPromiseMiddleware, next)
  )(createStore)(reducer)

  const mockStore = (config = {}) => configureStore([promiseMiddleware(config)])({})

  const promStore = (config, reducer = (state = {}) => state) => applyMiddleware(
    store => next => antePromisePromiseMiddleware.call(antePromisePromiseMiddleware, store, next),
    promiseMiddleware(config),
    () => next => postPromisePromiseMiddleware.call(postPromisePromiseMiddleware, next)
  )(createStore)(reducer)

  afterEach(() => {
    delete antePromiseMiddleware.spy
    delete postPromiseMiddleware.spy
    delete antePromisePromiseMiddleware.spy
    delete postPromisePromiseMiddleware.spy
  })

  context('Always', () => {
    let store
    const next = promiseMiddleware()

    beforeEach(() => {
      store = mockStore({ status: customStatus })
    })

    it('exports the action statuses', () => {
      chai.assert.equal(PENDING, 'PENDING')
      chai.assert.equal(FULFILLED, 'FULFILLED')
      chai.assert.equal(REJECTED, 'REJECTED')
    })

    it('exports the class PromiseError', () => {
      chai.assert.isFunction(PromiseError)
    })

    it('returns the "next" function', () => {
      chai.assert.isFunction(next)
    })

    /**
     * The middleware should allow global custom action statuses included
     * in the config when the middleware is constructed.
     */
    it('configures the pending action "type"', done => {
      const promiseAction = {
        type: 'ACTION',
        payload: (
          Promise.resolve(promiseValue)
        )
      }

      const customAction = {
        type: `ACTION_${CUSTOM_PENDING}`
      }

      store.dispatch(promiseAction)
        .then(() => {
          expect(store.getActions())
            .to.deep.include(customAction)
        })
        .then(done)
        .catch(done)
    })

    it('configures the fulfilled action "type"', done => {
      const promiseAction = {
        type: 'ACTION',
        payload: (
          Promise.resolve(promiseValue)
        )
      }

      const customAction = {
        type: `ACTION_${CUSTOM_FULFILLED}`,
        payload: promiseValue
      }

      store.dispatch(promiseAction)
        .then(() => {
          expect(store.getActions())
            .to.deep.include(customAction)
        })
        .then(done)
        .catch(done)
    })

    it('configures the rejected action "type"', done => {
      const rejectsAction = {
        type: 'ACTION',
        payload: (
          Promise.reject(promiseError)
        )
      }

      const customAction = {
        type: `ACTION_${CUSTOM_REJECTED}`,
        error: true,
        payload: promiseError
      }

      store.dispatch(rejectsAction)
        .catch(() => {
          expect(store.getActions())
            .to.deep.include(customAction)
        })
        .then(done)
        .catch(done)
    })
  })

  context('When the action has a promise', () => {
    let store

    let pendingAction

    let implicitPromiseAction
    let explicitPromiseAction

    let explicitPromiseActionWithData
    let explicitPromiseActionWithZero

    let explicitPromiseActionWithMetaData
    let explicitPromiseActionWithMetaZero

    beforeEach(() => {
      store = mockStore({})

      pendingAction = {
        type: 'ACTION_PENDING'
      }

      implicitPromiseAction = {
        type: 'ACTION',
        payload: (
          Promise.resolve(promiseValue)
        )
      }

      explicitPromiseAction = {
        type: 'ACTION',
        payload: {
          promise: Promise.resolve(promiseValue)
        }
      }

      explicitPromiseActionWithData = {
        type: 'ACTION',
        payload: {
          promise: Promise.resolve(promiseValue),
          data: mockData
        }
      }

      explicitPromiseActionWithZero = {
        type: 'ACTION',
        payload: {
          promise: Promise.resolve(promiseValue),
          data: 0
        }
      }

      explicitPromiseActionWithMetaData = {
        type: 'ACTION',
        meta: metaData,
        payload: {
          promise: Promise.resolve(promiseValue)
        }
      }

      explicitPromiseActionWithMetaZero = {
        type: 'ACTION',
        meta: 0,
        payload: {
          promise: Promise.resolve(promiseValue)
        }
      }
    })

    /**
     * This tests if the middleware dispatches a pending action when the payload
     * property has a Promise object as the value. This is considered an "implicit"
     * promise payload.
     */
    it('dispatches a pending action for an implicit promise payload', done => {
      store.dispatch(implicitPromiseAction)
        .then(() => {
          expect(store.getActions())
            .to.deep.include(pendingAction)
        })
        .then(done)
        .catch(done)
    })

    /**
     * This tests if the middleware dispatches a pending action
     * when the payload has a "promise" property with a Promise object
     * as the value. This is considered an "explicit" promise payload because
     * the "promise" property explicitly describes the value.
     */
    it('dispatches a pending action for an explicit promise payload', done => {
      store.dispatch(explicitPromiseAction)
        .then(() => {
          expect(store.getActions())
            .to.deep.include(pendingAction)
        })
        .then(done)
        .catch(done)
    })

    /**
     * If the promise action is dispatched with a data property, that property and value
     * must be included in the pending action the middleware dispatches. This property
     * is used for optimistic updates.
     */
    it('pending action optionally contains payload "data" property', done => {
      store.dispatch(explicitPromiseActionWithData)
        .then(() => {
          expect(store.getActions())
            .to.deep.include(Object.assign({}, pendingAction, {
              payload: mockData
            }))
        })
        .then(done)
        .catch(done)
    })

    it('pending action optionally contains payload falsy "data" property', done => {
      store.dispatch(explicitPromiseActionWithZero)
        .then(() => {
          expect(store.getActions())
            .to.deep.include(Object.assign({}, pendingAction, {
              payload: 0
            }))
        })
        .then(done)
        .catch(done)
    })

    /**
     * If the promise action is dispatched with a "meta" property, the "meta" property
     * and value must be included in the pending action.
     */
    it('pending action contains "meta" property', done => {
      store.dispatch(explicitPromiseActionWithMetaData)
        .then(() => {
          expect(store.getActions())
            .to.deep.include(Object.assign({}, pendingAction, {
              meta: metaData
            }))
        })
        .then(done)
        .catch(done)
    })

    it('pending action contains falsy "meta" property', done => {
      store.dispatch(explicitPromiseActionWithMetaZero)
        .then(() => {
          expect(store.getActions())
            .to.deep.include(Object.assign({}, pendingAction, {
              meta: 0
            }))
        })
        .then(done)
        .catch(done)
    })

    context('When the promise is resolved', () => {
      let store

      let implicitPromiseActionWithMetaData
      let explicitPromiseActionWithMetaData

      beforeEach(() => {
        store = mockStore({})

        implicitPromiseActionWithMetaData = {
          type: 'ACTION',
          payload: (
            Promise.resolve(promiseValue)
          ),
          meta: metaData
        }

        explicitPromiseActionWithMetaData = {
          type: 'ACTION',
          payload: {
            promise: Promise.resolve(promiseValue)
          },
          meta: metaData
        }
      })

      it('sets the fulfilled action "meta" property to the action "meta" property for an implicit promise payload', done => {
        store.dispatch(implicitPromiseActionWithMetaData)
          .then(() => {
            expect(store.getActions())
              .to.deep.include({
                type: 'ACTION_FULFILLED',
                payload: promiseValue,
                meta: metaData
              })
          })
          .then(done)
          .catch(done)
      })

      it('sets the fulfilled action "meta" property to the action "meta" property for an explicit promise payload', done => {
        store.dispatch(explicitPromiseActionWithMetaData)
          .then(() => {
            expect(store.getActions())
              .to.deep.include({
                type: 'ACTION_FULFILLED',
                payload: promiseValue,
                meta: metaData
              })
          })
          .then(done)
          .catch(done)
      })

      context('When dispatch returns a promise', () => {
        let store

        let pendingAction
        let fulfilledAction
        let rejectedAction

        let implicitPromiseAction
        let explicitPromiseAction

        beforeEach(() => {
          store = promStore({})

          pendingAction = {
            type: 'ACTION_PENDING'
          }

          fulfilledAction = {
            type: 'ACTION_FULFILLED',
            payload: promiseValue
          }

          rejectedAction = {
            type: 'ACTION_REJECTED',
            payload: promiseError,
            error: true
          }

          implicitPromiseAction = {
            type: 'ACTION',
            payload: (
              Promise.resolve(promiseValue)
            )
          }

          explicitPromiseAction = {
            type: 'ACTION',
            payload: {
              promise: Promise.resolve(promiseValue)
            }
          }
        })

        it('dispatches a fulfilled action for an implicit promise payload', done => {
          store.dispatch(implicitPromiseAction)
            .then(() => {
              expect(postPromisePromiseMiddleware.spy)
                .to.have.been.calledWith(fulfilledAction)
            })
            .then(done)
            .catch(done)
        })

        it('dispatches a fulfilled action for an explicit promise payload', done => {
          store.dispatch(explicitPromiseAction)
            .then(() => {
              expect(postPromisePromiseMiddleware.spy)
                .to.have.been.calledWith(fulfilledAction)
            })
            .then(done)
            .catch(done)
        })

        it('returns the action for an implicit promise payload', done => {
          store.dispatch(implicitPromiseAction)
            .then((action) => {
              expect(action)
                .to.eql({
                  type: 'ACTION',
                  payload: promiseValue,
                  baz
                })
            })
            .then(done)
            .catch(done)
        })

        it('returns the action for an explicit promise payload', done => {
          store.dispatch(explicitPromiseAction)
            .then((action) => {
              expect(action)
                .to.eql({
                  type: 'ACTION',
                  payload: promiseValue,
                  baz
                })
            })
            .then(done)
            .catch(done)
        })

        context('When the fulfilled action fails', () => {
          let store

          beforeEach(() => {
            const reducer = (state = {}, { type } = {}) => {
              if (type === 'ACTION_FULFILLED') throw promiseError

              return ({ ...state, type })
            }

            store = promStore({}, reducer)
          })

          /**
           * If the dispatch() call fails when dispatching the _FULFILLED action
           * (for example, errors in connected component renders()), don't change it
           * to a promise rejection
           */
          it('does not dispatch a rejected action for an implicit promise payload', done => {
            store.dispatch(implicitPromiseAction)
              .catch(() => {
                expect(postPromisePromiseMiddleware.spy)
                  .to.have.been.calledWith(pendingAction)

                expect(postPromisePromiseMiddleware.spy)
                  .to.have.been.calledWith(fulfilledAction)

                expect(postPromisePromiseMiddleware.spy)
                  .not.to.have.been.calledWith(rejectedAction)
              })
              .then(done)
              .catch(done)
          })

          it('does not dispatch a rejected action for an explicit promise payload', done => {
            store.dispatch(explicitPromiseAction)
              .catch(() => {
                expect(postPromisePromiseMiddleware.spy)
                  .to.have.been.calledWith(pendingAction)

                expect(postPromisePromiseMiddleware.spy)
                  .to.have.been.calledWith(fulfilledAction)

                expect(postPromisePromiseMiddleware.spy)
                  .not.to.have.been.calledWith(rejectedAction)
              })
              .then(done)
              .catch(done)
          })
        })
      })

      context('When dispatch does not return a promise', () => {
        let store

        let fulfilledAction
        let rejectedAction

        beforeEach(() => {
          store = makeStore({})

          fulfilledAction = {
            type: 'ACTION_FULFILLED',
            payload: promiseValue
          }

          rejectedAction = {
            type: 'ACTION_REJECTED',
            payload: promiseError,
            error: true
          }
        })

        it('dispatches a fulfilled action for an implicit promise payload', done => {
          store.dispatch(implicitPromiseAction)
            .then(() => {
              expect(postPromiseMiddleware.spy)
                .to.have.been.calledWith(fulfilledAction)
            })
            .then(done)
            .catch(done)
        })

        it('dispatches a fulfilled action for an explicit promise payload', done => {
          store.dispatch(explicitPromiseAction)
            .then(() => {
              expect(postPromiseMiddleware.spy)
                .to.have.been.calledWith(fulfilledAction)
            })
            .then(done)
            .catch(done)
        })

        it('returns the action for an implicit promise payload', done => {
          store.dispatch(implicitPromiseAction)
            .then((action) => {
              expect(action)
                .to.eql({
                  type: 'ACTION',
                  payload: promiseValue,
                  baz
                })
            })
            .then(done)
            .catch(done)
        })

        it('returns the action for an explicit promise payload', done => {
          store.dispatch(explicitPromiseAction)
            .then((action) => {
              expect(action)
                .to.eql({
                  type: 'ACTION',
                  payload: promiseValue,
                  baz
                })
            })
            .then(done)
            .catch(done)
        })

        context('When the fulfilled action fails', () => {
          let store

          beforeEach(() => {
            const reducer = (state = {}, { type } = {}) => {
              if (type === 'ACTION_FULFILLED') throw promiseError

              return ({ ...state, type })
            }

            store = makeStore({}, reducer)
          })

          /**
           * If the dispatch() call fails when dispatching the _FULFILLED action
           * (for example, errors in connected component renders()), don't change it
           * to a promise rejection
           */
          it('does not dispatch a rejected action for an implicit promise payload', done => {
            store.dispatch(implicitPromiseAction)
              .catch(() => {
                expect(postPromiseMiddleware.spy)
                  .to.have.been.calledWith(pendingAction)

                expect(postPromiseMiddleware.spy)
                  .to.have.been.calledWith(fulfilledAction)

                expect(postPromiseMiddleware.spy)
                  .not.to.have.been.calledWith(rejectedAction)
              })
              .then(done)
              .catch(done)
          })

          it('does not dispatch a rejected action for an explicit promise payload', done => {
            store.dispatch(explicitPromiseAction)
              .catch(() => {
                expect(postPromiseMiddleware.spy)
                  .to.have.been.calledWith(pendingAction)

                expect(postPromiseMiddleware.spy)
                  .to.have.been.calledWith(fulfilledAction)

                expect(postPromiseMiddleware.spy)
                  .not.to.have.been.calledWith(rejectedAction)
              })
              .then(done)
              .catch(done)
          })
        })
      })

      context('When the resolved value is null', () => {
        let store

        let resolveAction

        beforeEach(() => {
          store = mockStore({})

          resolveAction = {
            type: 'ACTION',
            payload: (
              Promise.resolve(null)
            )
          }
        })

        it('dispatches a fulfilled action', done => {
          store.dispatch(resolveAction)
            .then(() => {
              expect(store.getActions())
                .to.deep.include({
                  type: 'ACTION_FULFILLED'
                })
            })
            .then(done)
            .catch(done)
        })

        /**
         *  Return is now the original action. Should it be the original action without the payload?
         */
        it('sets the resolved action "payload" property to undefined', done => {
          store.dispatch(resolveAction)
            .then(({ payload }) => {
              expect(payload)
                .to.be.undefined
            })
            .then(done)
            .catch(done)
        })
      })

      context('When the resolved value is false', () => {
        let store

        let implicitPromiseActionWithFalse

        beforeEach(() => {
          store = mockStore({})

          implicitPromiseActionWithFalse = {
            type: 'ACTION',
            payload: (
              Promise.resolve(false)
            )
          }
        })

        it('dispatches a resolved action', done => {
          store.dispatch(implicitPromiseActionWithFalse)
            .then(() => {
              expect(store.getActions())
                .to.deep.include({
                  type: 'ACTION_FULFILLED',
                  payload: false
                })
            })
            .then(done)
            .catch(done)
        })

        /**
         * If the resolved promise value is false, then there should still be a
         * payload on the dispatched resolved action.
         */
        it('sets the resolved action "payload" property to false', done => {
          store.dispatch(implicitPromiseActionWithFalse)
            .then(({ payload }) => {
              expect(payload)
                .to.be.false
            })
            .then(done)
            .catch(done)
        })
      })

      context('When the resolve value is zero', () => {
        let store

        let implicitPromiseActionWithZero

        beforeEach(() => {
          store = mockStore({})

          implicitPromiseActionWithZero = {
            type: 'ACTION',
            payload: (
              Promise.resolve(0)
            )
          }
        })

        it('dispatches a resolved action', done => {
          store.dispatch(implicitPromiseActionWithZero)
            .then(() => {
              expect(store.getActions())
                .to.deep.include({
                  type: 'ACTION_FULFILLED',
                  payload: 0
                })
            })
            .then(done)
            .catch(done)
        })

        /**
         * If the resolved promise value is zero, then there should still be a
         * payload on the dispatched resolved action.
         */
        it('sets the resolved action "payload" property to zero', done => {
          store.dispatch(implicitPromiseActionWithZero)
            .then(({ payload }) => {
              expect(payload)
                .to.eq(0)
            })
            .then(done)
            .catch(done)
        })
      })
    })

    context('When the promise is rejected', () => {
      let store

      let rejectedAction

      beforeEach(() => {
        store = mockStore({})

        rejectedAction = {
          type: 'ACTION_REJECTED',
          payload: promiseError,
          error: true
        }
      })

      it('dispatches a rejected action for an implicit promise payload', done => {
        const implicitPromiseAction = {
          type: 'ACTION',
          payload: (
            Promise.reject(promiseError)
          )
        }

        store.dispatch(implicitPromiseAction)
          .catch(() => {
            expect(store.getActions())
              .to.deep.include(rejectedAction)
          })
          .then(done)
          .catch(done)
      })

      it('dispatches a rejected action for an explicit promise payload', done => {
        const explicitPromiseAction = {
          type: 'ACTION',
          payload: {
            promise: Promise.reject(promiseError)
          }
        }

        store.dispatch(explicitPromiseAction)
          .catch(() => {
            expect(store.getActions())
              .to.deep.include(rejectedAction)
          })
          .then(done)
          .catch(done)
      })

      it('sets the rejected action "error" property to true', done => {
        const implicitPromiseAction = {
          type: 'ACTION',
          payload: (
            Promise.reject(promiseError)
          )
        }

        store.dispatch(implicitPromiseAction)
          .catch(() => {
            const { error } = store.getActions()[1]

            expect(error)
              .to.be.true
          })
          .then(done)
          .catch(done)
      })

      it('sets the rejected action "payload" property to the Error instance', done => {
        const implicitPromiseAction = {
          type: 'ACTION',
          payload: (
            Promise.reject(promiseError)
          )
        }

        store.dispatch(implicitPromiseAction)
          .catch(() => {
            const { payload: error } = store.getActions()[1]

            expect(error)
              .to.be.equal(promiseError)
          })
          .then(done)
          .catch(done)
      })

      it('returns the Error instance', done => {
        const implicitPromiseAction = {
          type: 'ACTION',
          payload: (
            Promise.reject(promiseError)
          )
        }

        store.dispatch(implicitPromiseAction)
          .catch((error) => {
            expect(error)
              .to.be.an.instanceof(Error)
          })
          .then(done)
          .catch(done)
      })
    })
  })

  context('When the action does not have a promise', () => {
    let mockAction

    beforeEach(() => {
      mockAction = { type: 'ACTION' }
    })

    it('invokes the "next" middleware with the action', done => {
      const store = makeStore() // MAKE

      Promise.resolve(store.dispatch(mockAction))
        .then(() => {
          expect(postPromiseMiddleware.spy)
            .to.have.been.calledWith(mockAction)
        })
        .then(done)
        .catch(done)
    })

    it('does not dispatch any other actions', done => {
      const store = mockStore() // MOCK

      Promise.resolve(store.dispatch(mockAction))
        .then(() => {
          expect([mockAction])
            .to.eql(store.getActions())
        })
        .then(done)
        .catch(done)
    })
  })
})

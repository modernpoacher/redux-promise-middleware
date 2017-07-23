/* eslint no-unsafe-finally: 0 */

import { isPromiseLike as isPromise } from 'is-promise-like'

export const PENDING = 'PENDING'
export const FULFILLED = 'FULFILLED'
export const REJECTED = 'REJECTED'

export class PromiseError extends Error {
  constructor ({ message, name, stack, ...error }, e) {
    super(message)
    Reflect
      .ownKeys(error)
      .forEach((key) => {
        this[key] = Reflect.get(error, key)
      })
    this.name = `PromiseError(${name})`
    this.stack = stack
    if (e) {
      this.error = new PromiseError(e)
    }
  }
}

const promiseError = (error, e) => new PromiseError(error, e)

const defaultStatus = [
  PENDING,
  FULFILLED,
  REJECTED
]

const isDefined = (value) => value !== undefined
const isError = (value) => (value || false) instanceof Error
const isPayload = (value) => isDefined(value) && value !== null

const hasExplicitPromise = ({ promise } = {}) => isPromise(promise)
const hasImplicitPromise = (promise) => isPromise(promise)
const hasPromise = (object) => hasImplicitPromise(object) || hasExplicitPromise(object)

const getExplicitPromise = ({ promise } = {}) => promise
const getImplicitPromise = (promise) => promise // eslint-disable-line
const getPromise = (object) => hasImplicitPromise(object) ? object : getExplicitPromise(object)

/**
 * @function promiseMiddleware
 * @description
 * @returns {function} thunk
 */
export default function promiseMiddleware ({ status = defaultStatus } = {}) {
  const [
    PENDING,
    FULFILLED,
    REJECTED
  ] = status

  const pending = (type, payload, meta) => ({
    type: `${type}_${PENDING}`,
    ...(isDefined(payload) ? { payload } : {}),
    ...(isDefined(meta) ? { meta } : {})
  })

  const fulfilled = (type, payload, meta) => ({
    type: `${type}_${FULFILLED}`,
    ...(isPayload(payload) ? { payload } : {}),
    ...(isDefined(meta) ? { meta } : {})
  })

  const rejected = (type, payload, meta, error) => ({
    type: `${type}_${REJECTED}`,
    ...(isPayload(payload) ? { payload } : {}),
    ...(isDefined(meta) ? { meta } : {}),
    ...(error ? { error } : {})
  })

  const resolved = (type, payload, meta) => ({
    type,
    ...(isPayload(payload) ? { payload } : {}),
    ...(isDefined(meta) ? { meta } : {})
  })

  return ({ dispatch }) => {
    /**
     *  Always: dispatches and resolves a "pending" action. This flux standard action object
     *  describes the "pending" state of the Promise, and includes any data
     *  (for optimistic updates) and/or meta properties from the original action
     */
    const resolvePending = ({ type, data, meta }) => {
      try {
        return Promise.resolve(dispatch(pending(type, data, meta)))
      } catch (e) {
        return Promise.reject(e)
      }
    }

    /**
     *  Either, 1: dispatches and resolves a "fulfilled" action. This flux standard action object
     *  describes the "fulfilled" state of the Promise, and has the resolved value
     *  as its "payload" property, as well as the meta property of the original action
     */
    const resolveFulfilled = ({ type, data, meta, error }) => (value) => {
      try {
        return (
          Promise.resolve(dispatch(fulfilled(type, value, meta)))
          .then(() => resolved(type, value, meta))
          .catch((e) => new PromiseError(e, error))
        )
      } catch (e) {
        return new PromiseError(e, error)
      }
    }

    /**
     *  Or, 2: dispatches and resolves a "rejected" action. This flux standard action object
     *  describes the "rejected" state of the Promise, and has the rejected reason
     *  as its "payload" property (which is an Error instance), as well as the meta property
     *  of the original action
     */
    const resolveRejected = ({ type, data, meta, error }) => (reason) => {
      try {
        return (
          Promise.resolve(dispatch(rejected(type, reason, meta, isError(reason))))
          .then(() => reason) // the rejected promise error
          .catch((e) => new PromiseError(reason, promiseError(e, error)))
        )
      } catch (e) {
        return new PromiseError(reason, promiseError(e, error))
      }
    }

    /**
     *  Any of the "pending", "fulfilled" or "rejected" actions might encounter their own
     *  errors, in which case they are caught and rejected at the end of the chain. If more
     *  than one error is encountered, they are appended as properties of the preceding
     *  error (or, if the Promise is rejected, they are appended as properties of that
     *  error). Assuming that none of the actions encounters an error and the Promise is
     *  fulfilled, the original action is given to the next middleware
     */
    return (next) => (action) => {
      const { payload } = action

      if (hasPromise(payload)) {
        const { type, meta } = action
        const { data } = payload
        const promise = getPromise(payload)
        const state = ({ type, data, meta })

        return resolvePending(state)
          .then(() => state)
          .catch((error) => ({ ...state, error }))
          .then((state) => (
            promise
              .then(resolveFulfilled(state))
              .catch(resolveRejected(state))
          ))
          .then((v) => isError(v) ? Promise.reject(v) : next(v))
      }

      /*
       *  Fall through
       */
      return next(action)
    }
  }
}

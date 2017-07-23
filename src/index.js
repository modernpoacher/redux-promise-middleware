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
export default function promiseMiddleware ({ status = defaultStatus, pendingStatus = () => undefined, fulfilledStatus = () => undefined, rejectedStatus = () => undefined } = {}) {
  const [
    PENDING_STATUS,
    FULFILLED_STATUS,
    REJECTED_STATUS
  ] = status

  function pending (type, payload, meta) {
    return {
      type: pendingStatus(type, PENDING_STATUS) || `${type}_${PENDING_STATUS}`,
      ...(isDefined(payload) ? { payload } : {}),
      ...(isDefined(meta) ? { meta } : {})
    }
  }

  function fulfilled (type, payload, meta) {
    return {
      type: fulfilledStatus(type, FULFILLED_STATUS) || `${type}_${FULFILLED_STATUS}`,
      ...(isPayload(payload) ? { payload } : {}),
      ...(isDefined(meta) ? { meta } : {})
    }
  }

  function rejected (type, payload, meta, error) {
    return {
      type: rejectedStatus(type, REJECTED_STATUS) || `${type}_${REJECTED_STATUS}`,
      ...(isPayload(payload) ? { payload } : {}),
      ...(isDefined(meta) ? { meta } : {}),
      ...(error ? { error } : {})
    }
  }

  function resolved (type, payload, meta) {
    return {
      type,
      ...(isPayload(payload) ? { payload } : {}),
      ...(isDefined(meta) ? { meta } : {})
    }
  }

  return ({ dispatch }) => {
    const resolvePending = ({ type, data, meta }) => {
      try {
        return Promise.resolve(dispatch(pending(type, data, meta)))
      } catch (e) {
        return Promise.reject(e)
      }
    }

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

    return (next) => (action) => {
      const { payload } = action

      if (hasPromise(payload)) {
        const { type, meta } = action
        const { data } = payload
        const promise = getPromise(payload)
        const state = ({ type, data, meta })

        /**
         * Dispatch the pending action. This flux standard action object
         * describes the pending state of a promise and will include any data
         * (for optimistic updates) and/or meta from the original action.
         */
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

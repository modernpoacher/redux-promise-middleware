import { isPromiseLike as isPromise } from 'is-promise-like'

export const PENDING = 'PENDING'
export const FULFILLED = 'FULFILLED'
export const REJECTED = 'REJECTED'

const defaultTypes = [
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
export default function promiseMiddleware ({ types = defaultTypes } = {}) {
  return ({ dispatch }) => (next) => ({ payload, ...action }) => {
    if (hasPromise(payload)) {
      const { type } = action
      const promise = getPromise(payload)
      const { data } = payload
      const [
        PENDING_SUFFIX,
        FULFILLED_SUFFIX,
        REJECTED_SUFFIX
      ] = types

      /**
       * @function getAction
       * @description Create a rejected or fulfilled flux standard action object.
       * @param {boolean} Is the action rejected?
       * @returns {object} action
       */
      const getAction = (value, isRejected) => ({
        ...action,
        type: isRejected ? `${type}_${REJECTED_SUFFIX}` : `${type}_${FULFILLED_SUFFIX}`,
        ...(isPayload(value) ? { payload: value } : {}),
        ...(isRejected ? { error: true } : {})
      })

      /**
       * Dispatch the pending action. This flux standard action object
       * describes the pending state of a promise and will include any data
       * (for optimistic updates) and/or meta from the original action.
       */
      next({
        ...action,
        type: `${type}_${PENDING_SUFFIX}`,
        ...(isDefined(data) ? { payload: data } : {})
      })

      /*
       * @function transform
       * @description Transforms a fulfilled value into a success object.
       * @returns {object}
       */
      const transform = (value) => getAction(value)

      /*
       * @function handleReject
       * @description Dispatch the rejected action.
       * @returns {void}
       */
      const handleReject = (reason) => {
        dispatch(getAction(reason, isError(reason)))
      }

      /*
       * @function handleFulfill
       * @description Dispatch the fulfilled action.
       * @param successValue The value from transformFulfill
       * @returns {void}
       */
      const handleFulfill = (action) => {
        dispatch(action)
      }

      /**
       * Dispatch a rejected or fulfilled action. This flux standard
       * action object will describe the resolved state of the promise. In
       * the case of a rejected promise, it will include an `error` property.
       *
       * In order to allow proper chaining of actions using `then`, a new
       * promise is constructed and returned. This promise will resolve
       * with two properties: (1) the value (if fulfilled) or reason
       * (if rejected) and (2) the flux standard action.
       *
       * Fulfilled object:
       * {
       *   type: 'ACTION_FULFILLED',
       *   payload: ...
       * }
       *
       * Rejected object:
       * {
       *   type: 'ACTION_REJECTED',
       *   payload: ...,
       *   error: true
       * }
       *
       */
      const PROMISE = promise.then(transform)

      return PROMISE
        .then(handleFulfill, handleReject)
        .then(() => PROMISE, () => PROMISE)
    } else {
      return next(({
        ...action,
        ...(isDefined(payload) ? { payload } : {})
      }))
    }
  }
}

/*
return promise
  .then(transform)
  .then((v) => (
    Promise.resolve()
      .then(handleFulfill, handleReject)
      .then(() => v, () => v)
  ))
*/

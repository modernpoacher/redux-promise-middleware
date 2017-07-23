'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.promiseError = exports.PromiseError = exports.REJECTED = exports.FULFILLED = exports.PENDING = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.default = promiseMiddleware;

var _isPromiseLike = require('is-promise-like');

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var PENDING = exports.PENDING = 'PENDING';
var FULFILLED = exports.FULFILLED = 'FULFILLED';
var REJECTED = exports.REJECTED = 'REJECTED';

var PromiseError = exports.PromiseError = function (_Error) {
  _inherits(PromiseError, _Error);

  function PromiseError(_ref, e) {
    var message = _ref.message,
        name = _ref.name,
        stack = _ref.stack,
        error = _objectWithoutProperties(_ref, ['message', 'name', 'stack']);

    _classCallCheck(this, PromiseError);

    var _this = _possibleConstructorReturn(this, (PromiseError.__proto__ || Object.getPrototypeOf(PromiseError)).call(this, message));

    Reflect.ownKeys(error).forEach(function (key) {
      _this[key] = Reflect.get(error, key);
    });
    _this.name = 'PromiseError(' + name + ')';
    _this.stack = stack;
    if (e) {
      _this.error = new PromiseError(e);
    }
    return _this;
  }

  return PromiseError;
}(Error);

var promiseError = exports.promiseError = function promiseError(error, e) {
  return new PromiseError(error, e);
};

var defaultStatus = [PENDING, FULFILLED, REJECTED];

var isDefined = function isDefined(value) {
  return value !== undefined;
};
var isError = function isError(value) {
  return (value || false) instanceof Error;
};
var isPayload = function isPayload(value) {
  return isDefined(value) && value !== null;
};

var hasExplicitPromise = function hasExplicitPromise() {
  var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      promise = _ref2.promise;

  return (0, _isPromiseLike.isPromiseLike)(promise);
};
var hasImplicitPromise = function hasImplicitPromise(promise) {
  return (0, _isPromiseLike.isPromiseLike)(promise);
};
var hasPromise = function hasPromise(object) {
  return hasImplicitPromise(object) || hasExplicitPromise(object);
};

var getExplicitPromise = function getExplicitPromise() {
  var _ref3 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      promise = _ref3.promise;

  return promise;
};
var getImplicitPromise = function getImplicitPromise(promise) {
  return promise;
}; // eslint-disable-line
var getPromise = function getPromise(object) {
  return hasImplicitPromise(object) ? object : getExplicitPromise(object);
};

/**
 * @function promiseMiddleware
 * @description
 * @returns {function} thunk
 */
function promiseMiddleware() {
  var _ref4 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      _ref4$status = _ref4.status,
      status = _ref4$status === undefined ? defaultStatus : _ref4$status;

  var _status = _slicedToArray(status, 3),
      PENDING = _status[0],
      FULFILLED = _status[1],
      REJECTED = _status[2];

  var pending = function pending(type, payload, meta) {
    return _extends({
      type: type + '_' + PENDING
    }, isDefined(payload) ? { payload: payload } : {}, isDefined(meta) ? { meta: meta } : {});
  };

  var fulfilled = function fulfilled(type, payload, meta) {
    return _extends({
      type: type + '_' + FULFILLED
    }, isPayload(payload) ? { payload: payload } : {}, isDefined(meta) ? { meta: meta } : {});
  };

  var rejected = function rejected(type, payload, meta, error) {
    return _extends({
      type: type + '_' + REJECTED
    }, isPayload(payload) ? { payload: payload } : {}, isDefined(meta) ? { meta: meta } : {}, error ? { error: error } : {});
  };

  var resolved = function resolved(type, payload, meta) {
    return _extends({
      type: type
    }, isPayload(payload) ? { payload: payload } : {}, isDefined(meta) ? { meta: meta } : {});
  };

  return function (_ref5) {
    var dispatch = _ref5.dispatch;

    /**
     *  Always: dispatches and resolves a "pending" action. This flux standard action
     *  object describes the "pending" state of the Promise, and includes any data (for
     *  optimistic updates) and/or meta properties from the original action
     */
    var resolvePending = function resolvePending(_ref6) {
      var type = _ref6.type,
          data = _ref6.data,
          meta = _ref6.meta;

      try {
        return Promise.resolve(dispatch(pending(type, data, meta)));
      } catch (e) {
        return Promise.reject(e);
      }
    };

    /**
     *  Either, 1: dispatches and resolves a "fulfilled" action. This flux standard
     *  action object describes the "fulfilled" state of the Promise, and has the
     *  resolved value as its "payload" property, as well as the meta property of the
     *  original action
     */
    var resolveFulfilled = function resolveFulfilled(_ref7) {
      var type = _ref7.type,
          data = _ref7.data,
          meta = _ref7.meta,
          error = _ref7.error;
      return function (value) {
        try {
          return Promise.resolve(dispatch(fulfilled(type, value, meta))).then(function () {
            return resolved(type, value, meta);
          }).catch(function (e) {
            return error ? new PromiseError(error, e) : new PromiseError(e);
          });
        } catch (e) {
          return new PromiseError(e, error);
        }
      };
    };

    /**
     *  Or, 2: dispatches and resolves a "rejected" action. This flux standard action
     *  object describes the "rejected" state of the Promise, and has the rejected
     *  reason as its "payload" property (which is an Error instance), as well as the
     *  meta property of the original action
     */
    var resolveRejected = function resolveRejected(_ref8) {
      var type = _ref8.type,
          data = _ref8.data,
          meta = _ref8.meta,
          error = _ref8.error;
      return function (reason) {
        try {
          return Promise.resolve(dispatch(rejected(type, reason, meta, isError(reason)))).then(function () {
            return reason;
          }) // the rejected promise error
          .catch(function (e) {
            return new PromiseError(reason, error ? new PromiseError(error, e) : new PromiseError(e));
          });
        } catch (e) {
          return new PromiseError(reason, error ? new PromiseError(error, e) : new PromiseError(e));
        }
      };
    };

    /**
     *  Any of the "pending", "fulfilled" or "rejected" actions might encounter their
     *  own errors, in which case they are caught and rejected at the end of the chain.
     *  If more than one error is encountered, they are appended as properties of the
     *  preceding error (or, if the Promise is rejected, they are appended as
     *  properties of that error). Assuming that none of the actions encounters an
     *  error and the Promise is fulfilled, the original action is given to the next
     *  middleware
     */
    return function (next) {
      return function (action) {
        var payload = action.payload;


        if (hasPromise(payload)) {
          var type = action.type,
              meta = action.meta;
          var data = payload.data;

          var promise = getPromise(payload);
          var state = { type: type, data: data, meta: meta };

          return resolvePending(state).then(function () {
            return state;
          }).catch(function (error) {
            return _extends({}, state, { error: error });
          }).then(function (state) {
            return promise.then(resolveFulfilled(state)).catch(resolveRejected(state));
          }).then(function (v) {
            return isError(v) ? Promise.reject(v) : next(v);
          });
        }

        /*
         *  Fall through
         */
        return next(action);
      };
    };
  };
}
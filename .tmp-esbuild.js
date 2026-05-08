var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/react/cjs/react.development.js
var require_react_development = __commonJS({
  "node_modules/react/cjs/react.development.js"(exports, module) {
    "use strict";
    if (true) {
      (function() {
        "use strict";
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(new Error());
        }
        var ReactVersion = "18.3.1";
        var REACT_ELEMENT_TYPE = Symbol.for("react.element");
        var REACT_PORTAL_TYPE = Symbol.for("react.portal");
        var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
        var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
        var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
        var REACT_PROVIDER_TYPE = Symbol.for("react.provider");
        var REACT_CONTEXT_TYPE = Symbol.for("react.context");
        var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
        var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
        var REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list");
        var REACT_MEMO_TYPE = Symbol.for("react.memo");
        var REACT_LAZY_TYPE = Symbol.for("react.lazy");
        var REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen");
        var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
        var FAUX_ITERATOR_SYMBOL = "@@iterator";
        function getIteratorFn(maybeIterable) {
          if (maybeIterable === null || typeof maybeIterable !== "object") {
            return null;
          }
          var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];
          if (typeof maybeIterator === "function") {
            return maybeIterator;
          }
          return null;
        }
        var ReactCurrentDispatcher = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactCurrentBatchConfig = {
          transition: null
        };
        var ReactCurrentActQueue = {
          current: null,
          // Used to reproduce behavior of `batchedUpdates` in legacy mode.
          isBatchingLegacy: false,
          didScheduleLegacyUpdate: false
        };
        var ReactCurrentOwner = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactDebugCurrentFrame = {};
        var currentExtraStackFrame = null;
        function setExtraStackFrame(stack) {
          {
            currentExtraStackFrame = stack;
          }
        }
        {
          ReactDebugCurrentFrame.setExtraStackFrame = function(stack) {
            {
              currentExtraStackFrame = stack;
            }
          };
          ReactDebugCurrentFrame.getCurrentStack = null;
          ReactDebugCurrentFrame.getStackAddendum = function() {
            var stack = "";
            if (currentExtraStackFrame) {
              stack += currentExtraStackFrame;
            }
            var impl = ReactDebugCurrentFrame.getCurrentStack;
            if (impl) {
              stack += impl() || "";
            }
            return stack;
          };
        }
        var enableScopeAPI = false;
        var enableCacheElement = false;
        var enableTransitionTracing = false;
        var enableLegacyHidden = false;
        var enableDebugTracing = false;
        var ReactSharedInternals = {
          ReactCurrentDispatcher,
          ReactCurrentBatchConfig,
          ReactCurrentOwner
        };
        {
          ReactSharedInternals.ReactDebugCurrentFrame = ReactDebugCurrentFrame;
          ReactSharedInternals.ReactCurrentActQueue = ReactCurrentActQueue;
        }
        function warn(format) {
          {
            {
              for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
              }
              printWarning("warn", format, args);
            }
          }
        }
        function error(format) {
          {
            {
              for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
              }
              printWarning("error", format, args);
            }
          }
        }
        function printWarning(level, format, args) {
          {
            var ReactDebugCurrentFrame2 = ReactSharedInternals.ReactDebugCurrentFrame;
            var stack = ReactDebugCurrentFrame2.getStackAddendum();
            if (stack !== "") {
              format += "%s";
              args = args.concat([stack]);
            }
            var argsWithFormat = args.map(function(item) {
              return String(item);
            });
            argsWithFormat.unshift("Warning: " + format);
            Function.prototype.apply.call(console[level], console, argsWithFormat);
          }
        }
        var didWarnStateUpdateForUnmountedComponent = {};
        function warnNoop(publicInstance, callerName) {
          {
            var _constructor = publicInstance.constructor;
            var componentName = _constructor && (_constructor.displayName || _constructor.name) || "ReactClass";
            var warningKey = componentName + "." + callerName;
            if (didWarnStateUpdateForUnmountedComponent[warningKey]) {
              return;
            }
            error("Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.", callerName, componentName);
            didWarnStateUpdateForUnmountedComponent[warningKey] = true;
          }
        }
        var ReactNoopUpdateQueue = {
          /**
           * Checks whether or not this composite component is mounted.
           * @param {ReactClass} publicInstance The instance we want to test.
           * @return {boolean} True if mounted, false otherwise.
           * @protected
           * @final
           */
          isMounted: function(publicInstance) {
            return false;
          },
          /**
           * Forces an update. This should only be invoked when it is known with
           * certainty that we are **not** in a DOM transaction.
           *
           * You may want to call this when you know that some deeper aspect of the
           * component's state has changed but `setState` was not called.
           *
           * This will not invoke `shouldComponentUpdate`, but it will invoke
           * `componentWillUpdate` and `componentDidUpdate`.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueForceUpdate: function(publicInstance, callback, callerName) {
            warnNoop(publicInstance, "forceUpdate");
          },
          /**
           * Replaces all of the state. Always use this or `setState` to mutate state.
           * You should treat `this.state` as immutable.
           *
           * There is no guarantee that `this.state` will be immediately updated, so
           * accessing `this.state` after calling this method may return the old value.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} completeState Next state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueReplaceState: function(publicInstance, completeState, callback, callerName) {
            warnNoop(publicInstance, "replaceState");
          },
          /**
           * Sets a subset of the state. This only exists because _pendingState is
           * internal. This provides a merging strategy that is not available to deep
           * properties which is confusing. TODO: Expose pendingState or don't use it
           * during the merge.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} partialState Next partial state to be merged with state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} Name of the calling function in the public API.
           * @internal
           */
          enqueueSetState: function(publicInstance, partialState, callback, callerName) {
            warnNoop(publicInstance, "setState");
          }
        };
        var assign = Object.assign;
        var emptyObject = {};
        {
          Object.freeze(emptyObject);
        }
        function Component(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        Component.prototype.isReactComponent = {};
        Component.prototype.setState = function(partialState, callback) {
          if (typeof partialState !== "object" && typeof partialState !== "function" && partialState != null) {
            throw new Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
          }
          this.updater.enqueueSetState(this, partialState, callback, "setState");
        };
        Component.prototype.forceUpdate = function(callback) {
          this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
        };
        {
          var deprecatedAPIs = {
            isMounted: ["isMounted", "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."],
            replaceState: ["replaceState", "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."]
          };
          var defineDeprecationWarning = function(methodName, info) {
            Object.defineProperty(Component.prototype, methodName, {
              get: function() {
                warn("%s(...) is deprecated in plain JavaScript React classes. %s", info[0], info[1]);
                return void 0;
              }
            });
          };
          for (var fnName in deprecatedAPIs) {
            if (deprecatedAPIs.hasOwnProperty(fnName)) {
              defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
            }
          }
        }
        function ComponentDummy() {
        }
        ComponentDummy.prototype = Component.prototype;
        function PureComponent(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
        pureComponentPrototype.constructor = PureComponent;
        assign(pureComponentPrototype, Component.prototype);
        pureComponentPrototype.isPureReactComponent = true;
        function createRef() {
          var refObject = {
            current: null
          };
          {
            Object.seal(refObject);
          }
          return refObject;
        }
        var isArrayImpl = Array.isArray;
        function isArray(a) {
          return isArrayImpl(a);
        }
        function typeName(value) {
          {
            var hasToStringTag = typeof Symbol === "function" && Symbol.toStringTag;
            var type = hasToStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            return type;
          }
        }
        function willCoercionThrow(value) {
          {
            try {
              testStringCoercion(value);
              return false;
            } catch (e) {
              return true;
            }
          }
        }
        function testStringCoercion(value) {
          return "" + value;
        }
        function checkKeyStringCoercion(value) {
          {
            if (willCoercionThrow(value)) {
              error("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", typeName(value));
              return testStringCoercion(value);
            }
          }
        }
        function getWrappedName(outerType, innerType, wrapperName) {
          var displayName = outerType.displayName;
          if (displayName) {
            return displayName;
          }
          var functionName = innerType.displayName || innerType.name || "";
          return functionName !== "" ? wrapperName + "(" + functionName + ")" : wrapperName;
        }
        function getContextName(type) {
          return type.displayName || "Context";
        }
        function getComponentNameFromType(type) {
          if (type == null) {
            return null;
          }
          {
            if (typeof type.tag === "number") {
              error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue.");
            }
          }
          if (typeof type === "function") {
            return type.displayName || type.name || null;
          }
          if (typeof type === "string") {
            return type;
          }
          switch (type) {
            case REACT_FRAGMENT_TYPE:
              return "Fragment";
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_PROFILER_TYPE:
              return "Profiler";
            case REACT_STRICT_MODE_TYPE:
              return "StrictMode";
            case REACT_SUSPENSE_TYPE:
              return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
              return "SuspenseList";
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_CONTEXT_TYPE:
                var context = type;
                return getContextName(context) + ".Consumer";
              case REACT_PROVIDER_TYPE:
                var provider = type;
                return getContextName(provider._context) + ".Provider";
              case REACT_FORWARD_REF_TYPE:
                return getWrappedName(type, type.render, "ForwardRef");
              case REACT_MEMO_TYPE:
                var outerName = type.displayName || null;
                if (outerName !== null) {
                  return outerName;
                }
                return getComponentNameFromType(type.type) || "Memo";
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return getComponentNameFromType(init(payload));
                } catch (x) {
                  return null;
                }
              }
            }
          }
          return null;
        }
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        var RESERVED_PROPS = {
          key: true,
          ref: true,
          __self: true,
          __source: true
        };
        var specialPropKeyWarningShown, specialPropRefWarningShown, didWarnAboutStringRefs;
        {
          didWarnAboutStringRefs = {};
        }
        function hasValidRef(config) {
          {
            if (hasOwnProperty.call(config, "ref")) {
              var getter = Object.getOwnPropertyDescriptor(config, "ref").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.ref !== void 0;
        }
        function hasValidKey(config) {
          {
            if (hasOwnProperty.call(config, "key")) {
              var getter = Object.getOwnPropertyDescriptor(config, "key").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.key !== void 0;
        }
        function defineKeyPropWarningGetter(props, displayName) {
          var warnAboutAccessingKey = function() {
            {
              if (!specialPropKeyWarningShown) {
                specialPropKeyWarningShown = true;
                error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingKey.isReactWarning = true;
          Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: true
          });
        }
        function defineRefPropWarningGetter(props, displayName) {
          var warnAboutAccessingRef = function() {
            {
              if (!specialPropRefWarningShown) {
                specialPropRefWarningShown = true;
                error("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingRef.isReactWarning = true;
          Object.defineProperty(props, "ref", {
            get: warnAboutAccessingRef,
            configurable: true
          });
        }
        function warnIfStringRefCannotBeAutoConverted(config) {
          {
            if (typeof config.ref === "string" && ReactCurrentOwner.current && config.__self && ReactCurrentOwner.current.stateNode !== config.__self) {
              var componentName = getComponentNameFromType(ReactCurrentOwner.current.type);
              if (!didWarnAboutStringRefs[componentName]) {
                error('Component "%s" contains the string ref "%s". Support for string refs will be removed in a future major release. This case cannot be automatically converted to an arrow function. We ask you to manually fix this case by using useRef() or createRef() instead. Learn more about using refs safely here: https://reactjs.org/link/strict-mode-string-ref', componentName, config.ref);
                didWarnAboutStringRefs[componentName] = true;
              }
            }
          }
        }
        var ReactElement = function(type, key, ref, self, source, owner, props) {
          var element = {
            // This tag allows us to uniquely identify this as a React Element
            $$typeof: REACT_ELEMENT_TYPE,
            // Built-in properties that belong on the element
            type,
            key,
            ref,
            props,
            // Record the component responsible for creating this element.
            _owner: owner
          };
          {
            element._store = {};
            Object.defineProperty(element._store, "validated", {
              configurable: false,
              enumerable: false,
              writable: true,
              value: false
            });
            Object.defineProperty(element, "_self", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: self
            });
            Object.defineProperty(element, "_source", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: source
            });
            if (Object.freeze) {
              Object.freeze(element.props);
              Object.freeze(element);
            }
          }
          return element;
        };
        function createElement(type, config, children) {
          var propName;
          var props = {};
          var key = null;
          var ref = null;
          var self = null;
          var source = null;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              {
                warnIfStringRefCannotBeAutoConverted(config);
              }
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            self = config.__self === void 0 ? null : config.__self;
            source = config.__source === void 0 ? null : config.__source;
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                props[propName] = config[propName];
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i = 0; i < childrenLength; i++) {
              childArray[i] = arguments[i + 2];
            }
            {
              if (Object.freeze) {
                Object.freeze(childArray);
              }
            }
            props.children = childArray;
          }
          if (type && type.defaultProps) {
            var defaultProps = type.defaultProps;
            for (propName in defaultProps) {
              if (props[propName] === void 0) {
                props[propName] = defaultProps[propName];
              }
            }
          }
          {
            if (key || ref) {
              var displayName = typeof type === "function" ? type.displayName || type.name || "Unknown" : type;
              if (key) {
                defineKeyPropWarningGetter(props, displayName);
              }
              if (ref) {
                defineRefPropWarningGetter(props, displayName);
              }
            }
          }
          return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
        }
        function cloneAndReplaceKey(oldElement, newKey) {
          var newElement = ReactElement(oldElement.type, newKey, oldElement.ref, oldElement._self, oldElement._source, oldElement._owner, oldElement.props);
          return newElement;
        }
        function cloneElement(element, config, children) {
          if (element === null || element === void 0) {
            throw new Error("React.cloneElement(...): The argument must be a React element, but you passed " + element + ".");
          }
          var propName;
          var props = assign({}, element.props);
          var key = element.key;
          var ref = element.ref;
          var self = element._self;
          var source = element._source;
          var owner = element._owner;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              owner = ReactCurrentOwner.current;
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            var defaultProps;
            if (element.type && element.type.defaultProps) {
              defaultProps = element.type.defaultProps;
            }
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                if (config[propName] === void 0 && defaultProps !== void 0) {
                  props[propName] = defaultProps[propName];
                } else {
                  props[propName] = config[propName];
                }
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i = 0; i < childrenLength; i++) {
              childArray[i] = arguments[i + 2];
            }
            props.children = childArray;
          }
          return ReactElement(element.type, key, ref, self, source, owner, props);
        }
        function isValidElement(object) {
          return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
        }
        var SEPARATOR = ".";
        var SUBSEPARATOR = ":";
        function escape(key) {
          var escapeRegex = /[=:]/g;
          var escaperLookup = {
            "=": "=0",
            ":": "=2"
          };
          var escapedString = key.replace(escapeRegex, function(match) {
            return escaperLookup[match];
          });
          return "$" + escapedString;
        }
        var didWarnAboutMaps = false;
        var userProvidedKeyEscapeRegex = /\/+/g;
        function escapeUserProvidedKey(text) {
          return text.replace(userProvidedKeyEscapeRegex, "$&/");
        }
        function getElementKey(element, index) {
          if (typeof element === "object" && element !== null && element.key != null) {
            {
              checkKeyStringCoercion(element.key);
            }
            return escape("" + element.key);
          }
          return index.toString(36);
        }
        function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
          var type = typeof children;
          if (type === "undefined" || type === "boolean") {
            children = null;
          }
          var invokeCallback = false;
          if (children === null) {
            invokeCallback = true;
          } else {
            switch (type) {
              case "string":
              case "number":
                invokeCallback = true;
                break;
              case "object":
                switch (children.$$typeof) {
                  case REACT_ELEMENT_TYPE:
                  case REACT_PORTAL_TYPE:
                    invokeCallback = true;
                }
            }
          }
          if (invokeCallback) {
            var _child = children;
            var mappedChild = callback(_child);
            var childKey = nameSoFar === "" ? SEPARATOR + getElementKey(_child, 0) : nameSoFar;
            if (isArray(mappedChild)) {
              var escapedChildKey = "";
              if (childKey != null) {
                escapedChildKey = escapeUserProvidedKey(childKey) + "/";
              }
              mapIntoArray(mappedChild, array, escapedChildKey, "", function(c) {
                return c;
              });
            } else if (mappedChild != null) {
              if (isValidElement(mappedChild)) {
                {
                  if (mappedChild.key && (!_child || _child.key !== mappedChild.key)) {
                    checkKeyStringCoercion(mappedChild.key);
                  }
                }
                mappedChild = cloneAndReplaceKey(
                  mappedChild,
                  // Keep both the (mapped) and old keys if they differ, just as
                  // traverseAllChildren used to do for objects as children
                  escapedPrefix + // $FlowFixMe Flow incorrectly thinks React.Portal doesn't have a key
                  (mappedChild.key && (!_child || _child.key !== mappedChild.key) ? (
                    // $FlowFixMe Flow incorrectly thinks existing element's key can be a number
                    // eslint-disable-next-line react-internal/safe-string-coercion
                    escapeUserProvidedKey("" + mappedChild.key) + "/"
                  ) : "") + childKey
                );
              }
              array.push(mappedChild);
            }
            return 1;
          }
          var child;
          var nextName;
          var subtreeCount = 0;
          var nextNamePrefix = nameSoFar === "" ? SEPARATOR : nameSoFar + SUBSEPARATOR;
          if (isArray(children)) {
            for (var i = 0; i < children.length; i++) {
              child = children[i];
              nextName = nextNamePrefix + getElementKey(child, i);
              subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
            }
          } else {
            var iteratorFn = getIteratorFn(children);
            if (typeof iteratorFn === "function") {
              var iterableChildren = children;
              {
                if (iteratorFn === iterableChildren.entries) {
                  if (!didWarnAboutMaps) {
                    warn("Using Maps as children is not supported. Use an array of keyed ReactElements instead.");
                  }
                  didWarnAboutMaps = true;
                }
              }
              var iterator = iteratorFn.call(iterableChildren);
              var step;
              var ii = 0;
              while (!(step = iterator.next()).done) {
                child = step.value;
                nextName = nextNamePrefix + getElementKey(child, ii++);
                subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
              }
            } else if (type === "object") {
              var childrenString = String(children);
              throw new Error("Objects are not valid as a React child (found: " + (childrenString === "[object Object]" ? "object with keys {" + Object.keys(children).join(", ") + "}" : childrenString) + "). If you meant to render a collection of children, use an array instead.");
            }
          }
          return subtreeCount;
        }
        function mapChildren(children, func, context) {
          if (children == null) {
            return children;
          }
          var result = [];
          var count = 0;
          mapIntoArray(children, result, "", "", function(child) {
            return func.call(context, child, count++);
          });
          return result;
        }
        function countChildren(children) {
          var n = 0;
          mapChildren(children, function() {
            n++;
          });
          return n;
        }
        function forEachChildren(children, forEachFunc, forEachContext) {
          mapChildren(children, function() {
            forEachFunc.apply(this, arguments);
          }, forEachContext);
        }
        function toArray(children) {
          return mapChildren(children, function(child) {
            return child;
          }) || [];
        }
        function onlyChild(children) {
          if (!isValidElement(children)) {
            throw new Error("React.Children.only expected to receive a single React element child.");
          }
          return children;
        }
        function createContext(defaultValue) {
          var context = {
            $$typeof: REACT_CONTEXT_TYPE,
            // As a workaround to support multiple concurrent renderers, we categorize
            // some renderers as primary and others as secondary. We only expect
            // there to be two concurrent renderers at most: React Native (primary) and
            // Fabric (secondary); React DOM (primary) and React ART (secondary).
            // Secondary renderers store their context values on separate fields.
            _currentValue: defaultValue,
            _currentValue2: defaultValue,
            // Used to track how many concurrent renderers this context currently
            // supports within in a single renderer. Such as parallel server rendering.
            _threadCount: 0,
            // These are circular
            Provider: null,
            Consumer: null,
            // Add these to use same hidden class in VM as ServerContext
            _defaultValue: null,
            _globalName: null
          };
          context.Provider = {
            $$typeof: REACT_PROVIDER_TYPE,
            _context: context
          };
          var hasWarnedAboutUsingNestedContextConsumers = false;
          var hasWarnedAboutUsingConsumerProvider = false;
          var hasWarnedAboutDisplayNameOnConsumer = false;
          {
            var Consumer = {
              $$typeof: REACT_CONTEXT_TYPE,
              _context: context
            };
            Object.defineProperties(Consumer, {
              Provider: {
                get: function() {
                  if (!hasWarnedAboutUsingConsumerProvider) {
                    hasWarnedAboutUsingConsumerProvider = true;
                    error("Rendering <Context.Consumer.Provider> is not supported and will be removed in a future major release. Did you mean to render <Context.Provider> instead?");
                  }
                  return context.Provider;
                },
                set: function(_Provider) {
                  context.Provider = _Provider;
                }
              },
              _currentValue: {
                get: function() {
                  return context._currentValue;
                },
                set: function(_currentValue) {
                  context._currentValue = _currentValue;
                }
              },
              _currentValue2: {
                get: function() {
                  return context._currentValue2;
                },
                set: function(_currentValue2) {
                  context._currentValue2 = _currentValue2;
                }
              },
              _threadCount: {
                get: function() {
                  return context._threadCount;
                },
                set: function(_threadCount) {
                  context._threadCount = _threadCount;
                }
              },
              Consumer: {
                get: function() {
                  if (!hasWarnedAboutUsingNestedContextConsumers) {
                    hasWarnedAboutUsingNestedContextConsumers = true;
                    error("Rendering <Context.Consumer.Consumer> is not supported and will be removed in a future major release. Did you mean to render <Context.Consumer> instead?");
                  }
                  return context.Consumer;
                }
              },
              displayName: {
                get: function() {
                  return context.displayName;
                },
                set: function(displayName) {
                  if (!hasWarnedAboutDisplayNameOnConsumer) {
                    warn("Setting `displayName` on Context.Consumer has no effect. You should set it directly on the context with Context.displayName = '%s'.", displayName);
                    hasWarnedAboutDisplayNameOnConsumer = true;
                  }
                }
              }
            });
            context.Consumer = Consumer;
          }
          {
            context._currentRenderer = null;
            context._currentRenderer2 = null;
          }
          return context;
        }
        var Uninitialized = -1;
        var Pending = 0;
        var Resolved = 1;
        var Rejected = 2;
        function lazyInitializer(payload) {
          if (payload._status === Uninitialized) {
            var ctor = payload._result;
            var thenable = ctor();
            thenable.then(function(moduleObject2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var resolved = payload;
                resolved._status = Resolved;
                resolved._result = moduleObject2;
              }
            }, function(error2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var rejected = payload;
                rejected._status = Rejected;
                rejected._result = error2;
              }
            });
            if (payload._status === Uninitialized) {
              var pending = payload;
              pending._status = Pending;
              pending._result = thenable;
            }
          }
          if (payload._status === Resolved) {
            var moduleObject = payload._result;
            {
              if (moduleObject === void 0) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?", moduleObject);
              }
            }
            {
              if (!("default" in moduleObject)) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))", moduleObject);
              }
            }
            return moduleObject.default;
          } else {
            throw payload._result;
          }
        }
        function lazy(ctor) {
          var payload = {
            // We use these fields to store the result.
            _status: Uninitialized,
            _result: ctor
          };
          var lazyType = {
            $$typeof: REACT_LAZY_TYPE,
            _payload: payload,
            _init: lazyInitializer
          };
          {
            var defaultProps;
            var propTypes;
            Object.defineProperties(lazyType, {
              defaultProps: {
                configurable: true,
                get: function() {
                  return defaultProps;
                },
                set: function(newDefaultProps) {
                  error("React.lazy(...): It is not supported to assign `defaultProps` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  defaultProps = newDefaultProps;
                  Object.defineProperty(lazyType, "defaultProps", {
                    enumerable: true
                  });
                }
              },
              propTypes: {
                configurable: true,
                get: function() {
                  return propTypes;
                },
                set: function(newPropTypes) {
                  error("React.lazy(...): It is not supported to assign `propTypes` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  propTypes = newPropTypes;
                  Object.defineProperty(lazyType, "propTypes", {
                    enumerable: true
                  });
                }
              }
            });
          }
          return lazyType;
        }
        function forwardRef(render) {
          {
            if (render != null && render.$$typeof === REACT_MEMO_TYPE) {
              error("forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...)).");
            } else if (typeof render !== "function") {
              error("forwardRef requires a render function but was given %s.", render === null ? "null" : typeof render);
            } else {
              if (render.length !== 0 && render.length !== 2) {
                error("forwardRef render functions accept exactly two parameters: props and ref. %s", render.length === 1 ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined.");
              }
            }
            if (render != null) {
              if (render.defaultProps != null || render.propTypes != null) {
                error("forwardRef render functions do not support propTypes or defaultProps. Did you accidentally pass a React component?");
              }
            }
          }
          var elementType = {
            $$typeof: REACT_FORWARD_REF_TYPE,
            render
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!render.name && !render.displayName) {
                  render.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        var REACT_MODULE_REFERENCE;
        {
          REACT_MODULE_REFERENCE = Symbol.for("react.module.reference");
        }
        function isValidElementType(type) {
          if (typeof type === "string" || typeof type === "function") {
            return true;
          }
          if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden || type === REACT_OFFSCREEN_TYPE || enableScopeAPI || enableCacheElement || enableTransitionTracing) {
            return true;
          }
          if (typeof type === "object" && type !== null) {
            if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
            // types supported by any Flight configuration anywhere since
            // we don't know which Flight build this will end up being used
            // with.
            type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== void 0) {
              return true;
            }
          }
          return false;
        }
        function memo(type, compare) {
          {
            if (!isValidElementType(type)) {
              error("memo: The first argument must be a component. Instead received: %s", type === null ? "null" : typeof type);
            }
          }
          var elementType = {
            $$typeof: REACT_MEMO_TYPE,
            type,
            compare: compare === void 0 ? null : compare
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!type.name && !type.displayName) {
                  type.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        function resolveDispatcher() {
          var dispatcher = ReactCurrentDispatcher.current;
          {
            if (dispatcher === null) {
              error("Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem.");
            }
          }
          return dispatcher;
        }
        function useContext(Context) {
          var dispatcher = resolveDispatcher();
          {
            if (Context._context !== void 0) {
              var realContext = Context._context;
              if (realContext.Consumer === Context) {
                error("Calling useContext(Context.Consumer) is not supported, may cause bugs, and will be removed in a future major release. Did you mean to call useContext(Context) instead?");
              } else if (realContext.Provider === Context) {
                error("Calling useContext(Context.Provider) is not supported. Did you mean to call useContext(Context) instead?");
              }
            }
          }
          return dispatcher.useContext(Context);
        }
        function useState(initialState) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useState(initialState);
        }
        function useReducer(reducer, initialArg, init) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useReducer(reducer, initialArg, init);
        }
        function useRef2(initialValue) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useRef(initialValue);
        }
        function useEffect2(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useEffect(create, deps);
        }
        function useInsertionEffect(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useInsertionEffect(create, deps);
        }
        function useLayoutEffect(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useLayoutEffect(create, deps);
        }
        function useCallback(callback, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useCallback(callback, deps);
        }
        function useMemo(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useMemo(create, deps);
        }
        function useImperativeHandle(ref, create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useImperativeHandle(ref, create, deps);
        }
        function useDebugValue(value, formatterFn) {
          {
            var dispatcher = resolveDispatcher();
            return dispatcher.useDebugValue(value, formatterFn);
          }
        }
        function useTransition() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useTransition();
        }
        function useDeferredValue(value) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useDeferredValue(value);
        }
        function useId() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useId();
        }
        function useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
        }
        var disabledDepth = 0;
        var prevLog;
        var prevInfo;
        var prevWarn;
        var prevError;
        var prevGroup;
        var prevGroupCollapsed;
        var prevGroupEnd;
        function disabledLog() {
        }
        disabledLog.__reactDisabledLog = true;
        function disableLogs() {
          {
            if (disabledDepth === 0) {
              prevLog = console.log;
              prevInfo = console.info;
              prevWarn = console.warn;
              prevError = console.error;
              prevGroup = console.group;
              prevGroupCollapsed = console.groupCollapsed;
              prevGroupEnd = console.groupEnd;
              var props = {
                configurable: true,
                enumerable: true,
                value: disabledLog,
                writable: true
              };
              Object.defineProperties(console, {
                info: props,
                log: props,
                warn: props,
                error: props,
                group: props,
                groupCollapsed: props,
                groupEnd: props
              });
            }
            disabledDepth++;
          }
        }
        function reenableLogs() {
          {
            disabledDepth--;
            if (disabledDepth === 0) {
              var props = {
                configurable: true,
                enumerable: true,
                writable: true
              };
              Object.defineProperties(console, {
                log: assign({}, props, {
                  value: prevLog
                }),
                info: assign({}, props, {
                  value: prevInfo
                }),
                warn: assign({}, props, {
                  value: prevWarn
                }),
                error: assign({}, props, {
                  value: prevError
                }),
                group: assign({}, props, {
                  value: prevGroup
                }),
                groupCollapsed: assign({}, props, {
                  value: prevGroupCollapsed
                }),
                groupEnd: assign({}, props, {
                  value: prevGroupEnd
                })
              });
            }
            if (disabledDepth < 0) {
              error("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
            }
          }
        }
        var ReactCurrentDispatcher$1 = ReactSharedInternals.ReactCurrentDispatcher;
        var prefix;
        function describeBuiltInComponentFrame(name, source, ownerFn) {
          {
            if (prefix === void 0) {
              try {
                throw Error();
              } catch (x) {
                var match = x.stack.trim().match(/\n( *(at )?)/);
                prefix = match && match[1] || "";
              }
            }
            return "\n" + prefix + name;
          }
        }
        var reentry = false;
        var componentFrameCache;
        {
          var PossiblyWeakMap = typeof WeakMap === "function" ? WeakMap : Map;
          componentFrameCache = new PossiblyWeakMap();
        }
        function describeNativeComponentFrame(fn, construct) {
          if (!fn || reentry) {
            return "";
          }
          {
            var frame = componentFrameCache.get(fn);
            if (frame !== void 0) {
              return frame;
            }
          }
          var control;
          reentry = true;
          var previousPrepareStackTrace = Error.prepareStackTrace;
          Error.prepareStackTrace = void 0;
          var previousDispatcher;
          {
            previousDispatcher = ReactCurrentDispatcher$1.current;
            ReactCurrentDispatcher$1.current = null;
            disableLogs();
          }
          try {
            if (construct) {
              var Fake = function() {
                throw Error();
              };
              Object.defineProperty(Fake.prototype, "props", {
                set: function() {
                  throw Error();
                }
              });
              if (typeof Reflect === "object" && Reflect.construct) {
                try {
                  Reflect.construct(Fake, []);
                } catch (x) {
                  control = x;
                }
                Reflect.construct(fn, [], Fake);
              } else {
                try {
                  Fake.call();
                } catch (x) {
                  control = x;
                }
                fn.call(Fake.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (x) {
                control = x;
              }
              fn();
            }
          } catch (sample) {
            if (sample && control && typeof sample.stack === "string") {
              var sampleLines = sample.stack.split("\n");
              var controlLines = control.stack.split("\n");
              var s = sampleLines.length - 1;
              var c = controlLines.length - 1;
              while (s >= 1 && c >= 0 && sampleLines[s] !== controlLines[c]) {
                c--;
              }
              for (; s >= 1 && c >= 0; s--, c--) {
                if (sampleLines[s] !== controlLines[c]) {
                  if (s !== 1 || c !== 1) {
                    do {
                      s--;
                      c--;
                      if (c < 0 || sampleLines[s] !== controlLines[c]) {
                        var _frame = "\n" + sampleLines[s].replace(" at new ", " at ");
                        if (fn.displayName && _frame.includes("<anonymous>")) {
                          _frame = _frame.replace("<anonymous>", fn.displayName);
                        }
                        {
                          if (typeof fn === "function") {
                            componentFrameCache.set(fn, _frame);
                          }
                        }
                        return _frame;
                      }
                    } while (s >= 1 && c >= 0);
                  }
                  break;
                }
              }
            }
          } finally {
            reentry = false;
            {
              ReactCurrentDispatcher$1.current = previousDispatcher;
              reenableLogs();
            }
            Error.prepareStackTrace = previousPrepareStackTrace;
          }
          var name = fn ? fn.displayName || fn.name : "";
          var syntheticFrame = name ? describeBuiltInComponentFrame(name) : "";
          {
            if (typeof fn === "function") {
              componentFrameCache.set(fn, syntheticFrame);
            }
          }
          return syntheticFrame;
        }
        function describeFunctionComponentFrame(fn, source, ownerFn) {
          {
            return describeNativeComponentFrame(fn, false);
          }
        }
        function shouldConstruct(Component2) {
          var prototype = Component2.prototype;
          return !!(prototype && prototype.isReactComponent);
        }
        function describeUnknownElementTypeFrameInDEV(type, source, ownerFn) {
          if (type == null) {
            return "";
          }
          if (typeof type === "function") {
            {
              return describeNativeComponentFrame(type, shouldConstruct(type));
            }
          }
          if (typeof type === "string") {
            return describeBuiltInComponentFrame(type);
          }
          switch (type) {
            case REACT_SUSPENSE_TYPE:
              return describeBuiltInComponentFrame("Suspense");
            case REACT_SUSPENSE_LIST_TYPE:
              return describeBuiltInComponentFrame("SuspenseList");
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_FORWARD_REF_TYPE:
                return describeFunctionComponentFrame(type.render);
              case REACT_MEMO_TYPE:
                return describeUnknownElementTypeFrameInDEV(type.type, source, ownerFn);
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return describeUnknownElementTypeFrameInDEV(init(payload), source, ownerFn);
                } catch (x) {
                }
              }
            }
          }
          return "";
        }
        var loggedTypeFailures = {};
        var ReactDebugCurrentFrame$1 = ReactSharedInternals.ReactDebugCurrentFrame;
        function setCurrentlyValidatingElement(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              ReactDebugCurrentFrame$1.setExtraStackFrame(stack);
            } else {
              ReactDebugCurrentFrame$1.setExtraStackFrame(null);
            }
          }
        }
        function checkPropTypes(typeSpecs, values, location, componentName, element) {
          {
            var has = Function.call.bind(hasOwnProperty);
            for (var typeSpecName in typeSpecs) {
              if (has(typeSpecs, typeSpecName)) {
                var error$1 = void 0;
                try {
                  if (typeof typeSpecs[typeSpecName] !== "function") {
                    var err = Error((componentName || "React class") + ": " + location + " type `" + typeSpecName + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof typeSpecs[typeSpecName] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                    err.name = "Invariant Violation";
                    throw err;
                  }
                  error$1 = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
                } catch (ex) {
                  error$1 = ex;
                }
                if (error$1 && !(error$1 instanceof Error)) {
                  setCurrentlyValidatingElement(element);
                  error("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", componentName || "React class", location, typeSpecName, typeof error$1);
                  setCurrentlyValidatingElement(null);
                }
                if (error$1 instanceof Error && !(error$1.message in loggedTypeFailures)) {
                  loggedTypeFailures[error$1.message] = true;
                  setCurrentlyValidatingElement(element);
                  error("Failed %s type: %s", location, error$1.message);
                  setCurrentlyValidatingElement(null);
                }
              }
            }
          }
        }
        function setCurrentlyValidatingElement$1(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              setExtraStackFrame(stack);
            } else {
              setExtraStackFrame(null);
            }
          }
        }
        var propTypesMisspellWarningShown;
        {
          propTypesMisspellWarningShown = false;
        }
        function getDeclarationErrorAddendum() {
          if (ReactCurrentOwner.current) {
            var name = getComponentNameFromType(ReactCurrentOwner.current.type);
            if (name) {
              return "\n\nCheck the render method of `" + name + "`.";
            }
          }
          return "";
        }
        function getSourceInfoErrorAddendum(source) {
          if (source !== void 0) {
            var fileName = source.fileName.replace(/^.*[\\\/]/, "");
            var lineNumber = source.lineNumber;
            return "\n\nCheck your code at " + fileName + ":" + lineNumber + ".";
          }
          return "";
        }
        function getSourceInfoErrorAddendumForProps(elementProps) {
          if (elementProps !== null && elementProps !== void 0) {
            return getSourceInfoErrorAddendum(elementProps.__source);
          }
          return "";
        }
        var ownerHasKeyUseWarning = {};
        function getCurrentComponentErrorInfo(parentType) {
          var info = getDeclarationErrorAddendum();
          if (!info) {
            var parentName = typeof parentType === "string" ? parentType : parentType.displayName || parentType.name;
            if (parentName) {
              info = "\n\nCheck the top-level render call using <" + parentName + ">.";
            }
          }
          return info;
        }
        function validateExplicitKey(element, parentType) {
          if (!element._store || element._store.validated || element.key != null) {
            return;
          }
          element._store.validated = true;
          var currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);
          if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
            return;
          }
          ownerHasKeyUseWarning[currentComponentErrorInfo] = true;
          var childOwner = "";
          if (element && element._owner && element._owner !== ReactCurrentOwner.current) {
            childOwner = " It was passed a child from " + getComponentNameFromType(element._owner.type) + ".";
          }
          {
            setCurrentlyValidatingElement$1(element);
            error('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', currentComponentErrorInfo, childOwner);
            setCurrentlyValidatingElement$1(null);
          }
        }
        function validateChildKeys(node, parentType) {
          if (typeof node !== "object") {
            return;
          }
          if (isArray(node)) {
            for (var i = 0; i < node.length; i++) {
              var child = node[i];
              if (isValidElement(child)) {
                validateExplicitKey(child, parentType);
              }
            }
          } else if (isValidElement(node)) {
            if (node._store) {
              node._store.validated = true;
            }
          } else if (node) {
            var iteratorFn = getIteratorFn(node);
            if (typeof iteratorFn === "function") {
              if (iteratorFn !== node.entries) {
                var iterator = iteratorFn.call(node);
                var step;
                while (!(step = iterator.next()).done) {
                  if (isValidElement(step.value)) {
                    validateExplicitKey(step.value, parentType);
                  }
                }
              }
            }
          }
        }
        function validatePropTypes(element) {
          {
            var type = element.type;
            if (type === null || type === void 0 || typeof type === "string") {
              return;
            }
            var propTypes;
            if (typeof type === "function") {
              propTypes = type.propTypes;
            } else if (typeof type === "object" && (type.$$typeof === REACT_FORWARD_REF_TYPE || // Note: Memo only checks outer props here.
            // Inner props are checked in the reconciler.
            type.$$typeof === REACT_MEMO_TYPE)) {
              propTypes = type.propTypes;
            } else {
              return;
            }
            if (propTypes) {
              var name = getComponentNameFromType(type);
              checkPropTypes(propTypes, element.props, "prop", name, element);
            } else if (type.PropTypes !== void 0 && !propTypesMisspellWarningShown) {
              propTypesMisspellWarningShown = true;
              var _name = getComponentNameFromType(type);
              error("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", _name || "Unknown");
            }
            if (typeof type.getDefaultProps === "function" && !type.getDefaultProps.isReactClassApproved) {
              error("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
            }
          }
        }
        function validateFragmentProps(fragment) {
          {
            var keys = Object.keys(fragment.props);
            for (var i = 0; i < keys.length; i++) {
              var key = keys[i];
              if (key !== "children" && key !== "key") {
                setCurrentlyValidatingElement$1(fragment);
                error("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", key);
                setCurrentlyValidatingElement$1(null);
                break;
              }
            }
            if (fragment.ref !== null) {
              setCurrentlyValidatingElement$1(fragment);
              error("Invalid attribute `ref` supplied to `React.Fragment`.");
              setCurrentlyValidatingElement$1(null);
            }
          }
        }
        function createElementWithValidation(type, props, children) {
          var validType = isValidElementType(type);
          if (!validType) {
            var info = "";
            if (type === void 0 || typeof type === "object" && type !== null && Object.keys(type).length === 0) {
              info += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
            }
            var sourceInfo = getSourceInfoErrorAddendumForProps(props);
            if (sourceInfo) {
              info += sourceInfo;
            } else {
              info += getDeclarationErrorAddendum();
            }
            var typeString;
            if (type === null) {
              typeString = "null";
            } else if (isArray(type)) {
              typeString = "array";
            } else if (type !== void 0 && type.$$typeof === REACT_ELEMENT_TYPE) {
              typeString = "<" + (getComponentNameFromType(type.type) || "Unknown") + " />";
              info = " Did you accidentally export a JSX literal instead of a component?";
            } else {
              typeString = typeof type;
            }
            {
              error("React.createElement: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", typeString, info);
            }
          }
          var element = createElement.apply(this, arguments);
          if (element == null) {
            return element;
          }
          if (validType) {
            for (var i = 2; i < arguments.length; i++) {
              validateChildKeys(arguments[i], type);
            }
          }
          if (type === REACT_FRAGMENT_TYPE) {
            validateFragmentProps(element);
          } else {
            validatePropTypes(element);
          }
          return element;
        }
        var didWarnAboutDeprecatedCreateFactory = false;
        function createFactoryWithValidation(type) {
          var validatedFactory = createElementWithValidation.bind(null, type);
          validatedFactory.type = type;
          {
            if (!didWarnAboutDeprecatedCreateFactory) {
              didWarnAboutDeprecatedCreateFactory = true;
              warn("React.createFactory() is deprecated and will be removed in a future major release. Consider using JSX or use React.createElement() directly instead.");
            }
            Object.defineProperty(validatedFactory, "type", {
              enumerable: false,
              get: function() {
                warn("Factory.type is deprecated. Access the class directly before passing it to createFactory.");
                Object.defineProperty(this, "type", {
                  value: type
                });
                return type;
              }
            });
          }
          return validatedFactory;
        }
        function cloneElementWithValidation(element, props, children) {
          var newElement = cloneElement.apply(this, arguments);
          for (var i = 2; i < arguments.length; i++) {
            validateChildKeys(arguments[i], newElement.type);
          }
          validatePropTypes(newElement);
          return newElement;
        }
        function startTransition(scope, options) {
          var prevTransition = ReactCurrentBatchConfig.transition;
          ReactCurrentBatchConfig.transition = {};
          var currentTransition = ReactCurrentBatchConfig.transition;
          {
            ReactCurrentBatchConfig.transition._updatedFibers = /* @__PURE__ */ new Set();
          }
          try {
            scope();
          } finally {
            ReactCurrentBatchConfig.transition = prevTransition;
            {
              if (prevTransition === null && currentTransition._updatedFibers) {
                var updatedFibersCount = currentTransition._updatedFibers.size;
                if (updatedFibersCount > 10) {
                  warn("Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table.");
                }
                currentTransition._updatedFibers.clear();
              }
            }
          }
        }
        var didWarnAboutMessageChannel = false;
        var enqueueTaskImpl = null;
        function enqueueTask(task) {
          if (enqueueTaskImpl === null) {
            try {
              var requireString = ("require" + Math.random()).slice(0, 7);
              var nodeRequire = module && module[requireString];
              enqueueTaskImpl = nodeRequire.call(module, "timers").setImmediate;
            } catch (_err) {
              enqueueTaskImpl = function(callback) {
                {
                  if (didWarnAboutMessageChannel === false) {
                    didWarnAboutMessageChannel = true;
                    if (typeof MessageChannel === "undefined") {
                      error("This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning.");
                    }
                  }
                }
                var channel = new MessageChannel();
                channel.port1.onmessage = callback;
                channel.port2.postMessage(void 0);
              };
            }
          }
          return enqueueTaskImpl(task);
        }
        var actScopeDepth = 0;
        var didWarnNoAwaitAct = false;
        function act(callback) {
          {
            var prevActScopeDepth = actScopeDepth;
            actScopeDepth++;
            if (ReactCurrentActQueue.current === null) {
              ReactCurrentActQueue.current = [];
            }
            var prevIsBatchingLegacy = ReactCurrentActQueue.isBatchingLegacy;
            var result;
            try {
              ReactCurrentActQueue.isBatchingLegacy = true;
              result = callback();
              if (!prevIsBatchingLegacy && ReactCurrentActQueue.didScheduleLegacyUpdate) {
                var queue = ReactCurrentActQueue.current;
                if (queue !== null) {
                  ReactCurrentActQueue.didScheduleLegacyUpdate = false;
                  flushActQueue(queue);
                }
              }
            } catch (error2) {
              popActScope(prevActScopeDepth);
              throw error2;
            } finally {
              ReactCurrentActQueue.isBatchingLegacy = prevIsBatchingLegacy;
            }
            if (result !== null && typeof result === "object" && typeof result.then === "function") {
              var thenableResult = result;
              var wasAwaited = false;
              var thenable = {
                then: function(resolve, reject) {
                  wasAwaited = true;
                  thenableResult.then(function(returnValue2) {
                    popActScope(prevActScopeDepth);
                    if (actScopeDepth === 0) {
                      recursivelyFlushAsyncActWork(returnValue2, resolve, reject);
                    } else {
                      resolve(returnValue2);
                    }
                  }, function(error2) {
                    popActScope(prevActScopeDepth);
                    reject(error2);
                  });
                }
              };
              {
                if (!didWarnNoAwaitAct && typeof Promise !== "undefined") {
                  Promise.resolve().then(function() {
                  }).then(function() {
                    if (!wasAwaited) {
                      didWarnNoAwaitAct = true;
                      error("You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);");
                    }
                  });
                }
              }
              return thenable;
            } else {
              var returnValue = result;
              popActScope(prevActScopeDepth);
              if (actScopeDepth === 0) {
                var _queue = ReactCurrentActQueue.current;
                if (_queue !== null) {
                  flushActQueue(_queue);
                  ReactCurrentActQueue.current = null;
                }
                var _thenable = {
                  then: function(resolve, reject) {
                    if (ReactCurrentActQueue.current === null) {
                      ReactCurrentActQueue.current = [];
                      recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                    } else {
                      resolve(returnValue);
                    }
                  }
                };
                return _thenable;
              } else {
                var _thenable2 = {
                  then: function(resolve, reject) {
                    resolve(returnValue);
                  }
                };
                return _thenable2;
              }
            }
          }
        }
        function popActScope(prevActScopeDepth) {
          {
            if (prevActScopeDepth !== actScopeDepth - 1) {
              error("You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. ");
            }
            actScopeDepth = prevActScopeDepth;
          }
        }
        function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
          {
            var queue = ReactCurrentActQueue.current;
            if (queue !== null) {
              try {
                flushActQueue(queue);
                enqueueTask(function() {
                  if (queue.length === 0) {
                    ReactCurrentActQueue.current = null;
                    resolve(returnValue);
                  } else {
                    recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                  }
                });
              } catch (error2) {
                reject(error2);
              }
            } else {
              resolve(returnValue);
            }
          }
        }
        var isFlushing = false;
        function flushActQueue(queue) {
          {
            if (!isFlushing) {
              isFlushing = true;
              var i = 0;
              try {
                for (; i < queue.length; i++) {
                  var callback = queue[i];
                  do {
                    callback = callback(true);
                  } while (callback !== null);
                }
                queue.length = 0;
              } catch (error2) {
                queue = queue.slice(i + 1);
                throw error2;
              } finally {
                isFlushing = false;
              }
            }
          }
        }
        var createElement$1 = createElementWithValidation;
        var cloneElement$1 = cloneElementWithValidation;
        var createFactory = createFactoryWithValidation;
        var Children = {
          map: mapChildren,
          forEach: forEachChildren,
          count: countChildren,
          toArray,
          only: onlyChild
        };
        exports.Children = Children;
        exports.Component = Component;
        exports.Fragment = REACT_FRAGMENT_TYPE;
        exports.Profiler = REACT_PROFILER_TYPE;
        exports.PureComponent = PureComponent;
        exports.StrictMode = REACT_STRICT_MODE_TYPE;
        exports.Suspense = REACT_SUSPENSE_TYPE;
        exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = ReactSharedInternals;
        exports.act = act;
        exports.cloneElement = cloneElement$1;
        exports.createContext = createContext;
        exports.createElement = createElement$1;
        exports.createFactory = createFactory;
        exports.createRef = createRef;
        exports.forwardRef = forwardRef;
        exports.isValidElement = isValidElement;
        exports.lazy = lazy;
        exports.memo = memo;
        exports.startTransition = startTransition;
        exports.unstable_act = act;
        exports.useCallback = useCallback;
        exports.useContext = useContext;
        exports.useDebugValue = useDebugValue;
        exports.useDeferredValue = useDeferredValue;
        exports.useEffect = useEffect2;
        exports.useId = useId;
        exports.useImperativeHandle = useImperativeHandle;
        exports.useInsertionEffect = useInsertionEffect;
        exports.useLayoutEffect = useLayoutEffect;
        exports.useMemo = useMemo;
        exports.useReducer = useReducer;
        exports.useRef = useRef2;
        exports.useState = useState;
        exports.useSyncExternalStore = useSyncExternalStore;
        exports.useTransition = useTransition;
        exports.version = ReactVersion;
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(new Error());
        }
      })();
    }
  }
});

// node_modules/react/index.js
var require_react = __commonJS({
  "node_modules/react/index.js"(exports, module) {
    "use strict";
    if (false) {
      module.exports = null;
    } else {
      module.exports = require_react_development();
    }
  }
});

// src/constants.js
var COURT = {
  width: 10.97,
  singlesW: 8.23,
  halfW: 10.97 / 2,
  length: 23.77,
  halfL: 23.77 / 2,
  serviceLineY: 6.4,
  netHeight: 0.86
};
var PHYSICS = {
  gravity: -9.81,
  dragCoeff: 0.55,
  ballRadius: 0.033,
  ballMass: 0.057,
  airDensity: 1.2,
  restitution: 0.75,
  // groundFriction: 0.82→0.78. Com as velocidades aumentadas (CAL v2), a bola pós-quique
  // ainda viajava rápido demais. 0.78 aplica mais desaceleração horizontal no bounce.
  // Impacto: FLAT 155km/h → pós-quique ~117→107km/h (topspin), ~105→96km/h (backspin).
  groundFriction: 0.78,
  magnusCoeff: 0.25,
  // FIX P1.1: coeficiente único de spin no quique — usado em handleGroundBounce
  // E em predictTrajectory. Antes eram 0.075 e 0.055 respectivamente (36% de divergência),
  // causando previsões sistemáticamente erradas para topspin/kick.
  spinBounceCoeff: 0.075
};
var TIMING = {
  preServeDelay: 1.2,
  serveWindup: 0.4,
  pointPauseMs: 800,
  hitCooldown: 0.25,
  swingDuration: 0.18
};
var THRESHOLDS = {
  ballStopSpeed: 0.5,
  netTolerance: 0.05,
  outTolerance: 0.05,
  reachStretch: 0.75,
  errorRallyMin: 1,
  netZone: 1.8,
  // errorRallyMin: UE pode acontecer a partir do 1º rally shot
  ballHitMaxZ: 2.5,
  ballHitMinSpd: 0.25,
  // era 0.5 — bola lenta mas fora do reach → não bate
  ballHitMinSpdWithinReach: 0.1,
  // override: se dentro do reach, aceita velocidade baixíssima (slice morto)
  outerPlayerY: 6,
  // metres beyond baseline players can run — alinhado com chaseOutLimitY (era 4.5, criava zona inalcançável)
  outerPlayerX: 2.2,
  // metres beyond sideline players can run (new)
  // ── Após 1º quique válido dentro, bola pode sair e ser rebatida de fora.
  // Se ultrapassar esses limites sem ser rebatida → winner por abandono.
  chaseOutLimitY: 6,
  // metros além da baseline (halfL + 6m)
  chaseOutLimitX: 4,
  // metros além da lateral (halfW + 4m)
  pressureBallZ: 0.45,
  pressureReach: 0.65,
  forcedErrorDiff: 0.72,
  // [FIX v1] era 0.48 — diff=d/effectiveReach; muito baixo → UE=0
  forcedErrorPressure: 0.82,
  // [FIX v1.1] era hardcoded 0.65 — steady-state neutro ≈ 0.43, antes quase todo erro virava FE
  // ── Saque Gaussiano: sigma base de dispersão de mira (metros) ──────────────
  // 1º saque: sigma escalonado por srv1Prec do jogador (0=máximo erro, 100=mínimo)
  // 2º saque: sigma menor (conservador) mas aumenta com fadiga e pressão
  serveGaussSigma1: 0.28,
  // sigma base no 1º saque (alto risco = maior variância)
  serveGaussSigma2: 0.14,
  // sigma base no 2º saque (conservador)
  // Shot quality thresholds
  qualityDefensive: 0.4,
  // [PATCH v1] raised 0.27→0.40: below this → forced defensive shot
  qualityNeutral: 0.58,
  // [PATCH v1] raised 0.60→0.58: below this → no winners/banana
  arrivalEarly: 0.12,
  // seconds early = full timing quality (era 0.20 — muito difícil de atingir → sempre "atrasado")
  arrivalLate: -0.18
  // seconds = 0 timing quality (rushed)
};
var PLAYER_CFG = {
  speed: 5.4,
  reach: 0.85,
  maxAccel: 10,
  maxDecel: 16,
  friction: 10
};
var STAMINA = {
  decayPerShot: 0.04,
  // stamina lost per shot hit during rally (patch rápido)
  recoveryPerPoint: 0.13,
  // less instant recovery between points
  recoveryPerGame: 0.05,
  // lighter recovery on changeover
  recoveryPerSet: 0.14,
  // sets recover, but don't erase fatigue
  speedMinFactor: 0.78,
  // min movement speed multiplier at 0 stamina
  reachMinFactor: 0.83,
  // min reach multiplier at 0 stamina
  errorBoostMax: 0.012,
  // max extra error rate at 0 stamina — reduzido de 0.022: fadiga → movimento lento, não erros diretos
  logThreshold: 0.32,
  // log fatigue warning when dropping below this
  // ── Sprint stamina drain (per second, scaled by intensity above jog threshold) ─
  sprintDecayRate: 0.032,
  // stamina/s at full sprint above jog threshold
  sprintThreshold: 0.72
  // fraction of maxSpd above which sprint drain kicks in
};
var DT = 1 / 120;
var SCALE = 26;
var CL = 23.77 * SCALE;
var CW = 10.97 * SCALE;
var BALL_AREA = Math.PI * 0.033 ** 2;
var GameState = Object.freeze({
  PRE_SERVE: "PRE_SERVE",
  SERVING: "SERVING",
  RALLY: "RALLY",
  POINT_END: "POINT_END",
  GAME_OVER: "GAME_OVER",
  MEDICAL_TIMEOUT: "MEDICAL_TIMEOUT"
});
var SpinType = Object.freeze({ FLAT: 0, TOPSPIN: 1, SLICE: -1 });
var ShotType = Object.freeze({
  TOPSPIN: "TOPSPIN",
  FLAT: "FLAT",
  SLICE: "SLICE",
  DROP: "DROP",
  LOB_DEF: "LOB_DEF",
  LOB_ATK: "LOB_ATK",
  BANANA: "BANANA",
  VOLLEY: "VOLLEY",
  SMASH: "SMASH",
  PASSING: "PASSING",
  SHORT_ANGLE: "SHORT_ANGLE",
  // aceleração curta com ângulo extremo — alto risco/recompensa
  SLICE_SHORT: "SLICE_SHORT",
  // slice curto (não drop) — backspin, cai na meia-quadra, força corrida baixa
  HALF_VOLLEY: "HALF_VOLLEY"
  // golpe imediatamente após o quique — bola baixíssima (tornozelo/canela)
});
var INERTIA = {
  overrunThreshold: 3,
  // m/s — speed above which overrun applies on dir change
  overrunDecelMult: 0.62,
  // maxDecel fraction when overrunning (player "slides")
  reversal180Dot: -0.7,
  // dot(vel,targetDir) below this = 180° reversal
  reversal180AccelMult: 0.55,
  // accel fraction during 180° change (swap footwork)
  reversal180Frames: 3,
  // frames the 180° penalty lasts
  staminaAccelMin: 0.7,
  // min accel fraction at 0 stamina
  // ── Slide-stop / planta do pé ─────────────────────────────────────────────
  // Quando jogador está perto do target E em alta velocidade, aplica freada brusca
  // simulando o "slide" / deslizada de quadra — impede que passe direto pela bola.
  slideBrakeRadius: 1.1,
  // m — distância do target que ativa o brake
  slideBrakeSpeedMin: 2.2,
  // m/s — vel. mínima para ativar o brake
  slideBrakeDecelMult: 2.8,
  // multiplicador de maxDecel durante o brake
  postHitStaminaThresh: 0.35,
  // stamina below which post-hit pause activates
  postHitPauseMin: 0.08,
  // s (80ms)
  postHitPauseMax: 0.15,
  // s (150ms)
  giveUpMargin: -0.5
  // arrival margin (s) below which AI abandons chase
};
var MOVEMENT = {
  lateralSpeedMult: 0.87,
  // speed cap fraction when moving laterally
  backwardSpeedMult: 0.8,
  // speed cap fraction when moving away from net
  // ── Velocidade de base contínua ─────────────────────────────────
  urgencyReturn: 0.42,
  // caminhada de retorno à base (reduzida — era 0.65, muito rápida)
  urgencyWalk: 0.28,
  // velocidade mínima ao perseguir com muito tempo (piso, não para)
  // Tiers mantidos para compatibilidade (serve return usa urgencyJog/Run/Sprint)
  urgencyJog: 0.74,
  urgencyRun: 0.97,
  urgencySprint: 1.1
};
var SCORE_LABELS = ["0", "15", "30", "40", "Ad"];
var LOB_TYPES = /* @__PURE__ */ new Set(["LOB_DEF", "LOB_ATK"]);
var SHOT_DECAY_MULT = {
  FLAT: 1.1,
  // flat hit — powerful, moderate effort
  TOPSPIN: 1,
  // baseline topspin — standard
  SLICE: 0.75,
  // slice — low effort, defensive
  DROP: 0.8,
  // dropshot — wrist finesse, low energy
  LOB_DEF: 0.65,
  // defensive lob — passive, low strain
  LOB_ATK: 1.05,
  // attacking lob — more deliberate effort
  BANANA: 1.3,
  // heavy topspin cross — intense hip rotation
  VOLLEY: 0.85,
  // volley — short stroke, moderate effort
  SMASH: 1.45,
  // overhead smash — maximum physical output
  PASSING: 1.2,
  // passing shot — explosive from stretched position
  SHORT_ANGLE: 1.25,
  // short angle — extreme lateral torque
  SLICE_SHORT: 0.85,
  // short slice — controlled, moderate effort
  HALF_VOLLEY: 0.95
  // half volley — compact punch, awkward low contact
};
var COURT_ZONES = {
  T: { winnerMod: 0.5, ueMod: 1.15, pressMod: 0.28 },
  // center-T deep — constraining, low UE risk
  WIDE: { winnerMod: 0.7, ueMod: 1.3, pressMod: 0.55 },
  // near sideline — forces lateral sprint
  BODY: { winnerMod: 0.18, ueMod: 1.05, pressMod: 0.18 },
  // into body — jamming, low stretch
  DEEP: { winnerMod: 0.35, ueMod: 1.12, pressMod: 0.4 },
  // deep central — sustained baseline pressure
  SHORT_ANGLE: { winnerMod: 0.82, ueMod: 1.55, pressMod: 0.7 },
  // short + wide — extreme lateral + forward sprint
  DROP_ZONE: { winnerMod: 0.88, ueMod: 1.75, pressMod: 0.65 },
  // near net — complete direction change required
  NEUTRAL: { winnerMod: 0.22, ueMod: 1, pressMod: 0.08 }
  // mid-court central — low stress
};

// src/TraitSystem.js
var MUTEX_PAIRS = [
  ["TIEBREAK_KILLER", "CAMPEAO_TB"],
  ["CANHAO_SAQUE", "DF_ZERO"],
  ["REI_SAIBRO", "MAGO_GRAMA"],
  ["ESPECIALISTA_BO5", "ESPECIALISTA_KO"],
  ["SANGUE_QUENTE", "MAQUINA"],
  ["BOLA_DE_NEVE", "INERCIAL"],
  ["SUPERPRODIGIO", "LATE_BLOOMER"],
  ["VOLATILIDADE_CALC", "BASE_SOLIDA"]
];
function buildMutexMap() {
  const map = {};
  for (const [a, b] of MUTEX_PAIRS) {
    map[a] = map[a] ?? [];
    map[b] = map[b] ?? [];
    map[a].push(b);
    map[b].push(a);
  }
  return map;
}
var MUTEX_MAP = buildMutexMap();
var TRAIT_CATALOG = {
  // ────────────────────────────────────────────────────────────────
  // SEÇÃO 1: CLUTCH & MENTALIDADE
  // ────────────────────────────────────────────────────────────────
  TIEBREAK_KILLER: {
    id: "TIEBREAK_KILLER",
    name: "Tiebreak Killer",
    section: "clutch",
    mutex: ["CAMPEAO_TB"],
    tiers: {
      NEG: {
        name: "Terror do Tiebreak",
        desc: "-20% em pontos decisivos no tiebreak. Serve hesitante, erros desnecess\xE1rios.",
        effects: { clutchMult: 0.8, errorMult: 1.2, context: ["tiebreak"] }
      },
      COM: {
        name: "Tiebreak Killer",
        desc: "+15% clutch e precis\xE3o nos pontos de tiebreak.",
        effects: { clutchMult: 1.15, strengthBonus: 1.5, context: ["tiebreak"] }
      },
      RAR: {
        name: "Tiebreak Killer",
        desc: "+25% clutch + forma m\xEDnima BOA_FORMA garantida em tiebreaks.",
        effects: { clutchMult: 1.25, strengthBonus: 2.5, formFloor: "BOA_FORMA", context: ["tiebreak"] }
      },
      LEN: {
        name: "Tiebreak Killer",
        desc: "+35% em todos durante tiebreak. Forma nunca abaixo de GRANDE_FORMA. Imune a doubles em tiebreak.",
        effects: { clutchMult: 1.35, strengthBonus: 3.5, formFloor: "GRANDE_FORMA", context: ["tiebreak"] }
      }
    },
    sombra: { challenge: "Ganhar 10 tiebreaks na carreira", target: 10, metric: "tiebreaksWon" }
  },
  MP_SAVER: {
    id: "MP_SAVER",
    name: "Match Point Saver",
    section: "clutch",
    tiers: {
      NEG: {
        name: "Paralisia Total",
        desc: "-25% em todos ao enfrentar match point. Aumenta chance de double fault.",
        effects: { clutchMult: 0.75, errorMult: 1.3, serveMult: 0.85, context: ["matchPoint"] }
      },
      COM: {
        name: "Match Point Saver",
        desc: "+15% em todos quando enfrenta match point. Erros for\xE7ados reduzidos.",
        effects: { clutchMult: 1.15, errorMult: 0.9, context: ["matchPoint"] }
      },
      RAR: {
        name: "Match Point Saver",
        desc: "+25% em todos + primeiro saque mais preciso em situa\xE7\xE3o de match point.",
        effects: { clutchMult: 1.25, errorMult: 0.85, serveMult: 1.15, context: ["matchPoint"] }
      },
      LEN: {
        name: "Match Point Saver",
        desc: "+35% em todos. Double fault imposs\xEDvel em match point. Advers\xE1rio sofre -10%.",
        effects: { clutchMult: 1.35, errorMult: 0.8, serveMult: 1.2, opponentDebuff: 0.1, context: ["matchPoint"] }
      }
    },
    sombra: { challenge: "Salvar 5 match points ao longo da carreira", target: 5, metric: "matchPointsSaved" }
  },
  QUINTO_SET: {
    id: "QUINTO_SET",
    name: "Sangue Frio no 5\xBA Set",
    section: "clutch",
    tiers: {
      NEG: {
        name: "Colapso no Final",
        desc: "-20% stamina e clutch no 5\xBA set (BO5) ou set decisivo.",
        effects: { clutchMult: 0.8, staminaMult: 0.8, context: ["fifthSet"] }
      },
      COM: {
        name: "Sangue Frio",
        desc: "+20% em todos no 5\xBA set. Erros n\xE3o for\xE7ados reduzidos.",
        effects: { clutchMult: 1.2, strengthBonus: 2, context: ["fifthSet"] }
      },
      RAR: {
        name: "Sangue Frio",
        desc: "+30% em todos no set decisivo + stamina tratada como 100% nesse set.",
        effects: { clutchMult: 1.3, strengthBonus: 3, staminaMult: 1.3, context: ["fifthSet"] }
      },
      LEN: {
        name: "Imortal no Decisivo",
        desc: "+40% em todos + stamina virtualmente n\xE3o cai + forma sempre IMPAR\xC1VEL no 5\xBA set.",
        effects: { clutchMult: 1.4, strengthBonus: 4, staminaMult: 3.5, formFloor: "IMPARAVEL", context: ["fifthSet"] }
      }
    },
    sombra: { challenge: "Ganhar 3 partidas que chegaram ao 5\xBA set", target: 3, metric: "fifthSetWins" }
  },
  DECISIVO: {
    id: "DECISIVO",
    name: "Decisivo",
    section: "clutch",
    tiers: {
      NEG: {
        name: "Choke Artist",
        desc: "-20% em pontos de game (30-40, deuce, game point) e sets decisivos.",
        effects: { clutchMult: 0.8, errorMult: 1.2, context: ["decisiveMoment"] }
      },
      COM: {
        name: "Decisivo",
        desc: "+15% clutch em pontos de break e game points.",
        effects: { clutchMult: 1.15, context: ["decisiveMoment"] }
      },
      RAR: {
        name: "Decisivo",
        desc: "+25% em todos em pontos decisivos + primeiro saque sobe 1 n\xEDvel de qualidade.",
        effects: { clutchMult: 1.25, serveMult: 1.1, context: ["decisiveMoment"] }
      },
      LEN: {
        name: "Decisivo",
        desc: "+35% em qualquer ponto decisivo. Hold rate em momentos cruciais quase perfeito.",
        effects: { clutchMult: 1.35, strengthBonus: 3, serveMult: 1.15, context: ["decisiveMoment"] }
      }
    },
    sombra: { challenge: "Ganhar 15 break points decisivos", target: 15, metric: "decisiveBreakPoints" }
  },
  INSTINTO_SLAM: {
    id: "INSTINTO_SLAM",
    name: "Instinto de Slam",
    section: "clutch",
    tiers: {
      NEG: {
        name: "Assombrado pelo Slam",
        desc: "-15% clutch e serve em qualquer partida de Grand Slam.",
        effects: { clutchMult: 0.85, serveMult: 0.9, context: ["grandSlam"] }
      },
      COM: {
        name: "Instinto de Slam",
        desc: "+10% em todos em Grand Slams. Nervosismo inicial reduzido.",
        effects: { clutchMult: 1.1, strengthBonus: 1, context: ["grandSlam"] }
      },
      RAR: {
        name: "Instinto de Slam",
        desc: "+20% em todos em GS + forma GRANDE_FORMA m\xEDnimo durante todo o torneio.",
        effects: { clutchMult: 1.2, strengthBonus: 2, formFloor: "GRANDE_FORMA", context: ["grandSlam"] }
      },
      LEN: {
        name: "Instinto de Slam",
        desc: "+30% em GS + forma IMPAR\xC1VEL garantida a partir das quartas. Lendas s\xE3o feitas aqui.",
        effects: { clutchMult: 1.3, strengthBonus: 3.5, formFloor: "IMPARAVEL", context: ["grandSlam"] }
      }
    },
    sombra: { challenge: "Vencer qualquer Grand Slam", target: 1, metric: "grandSlamTitles" }
  },
  VIRADISTA: {
    id: "VIRADISTA",
    name: "Remontada 2 Sets",
    section: "clutch",
    tiers: {
      NEG: {
        name: "Fechado Mentalmente",
        desc: "-20% quando perdendo 2 sets a 0. J\xE1 se entregou.",
        effects: { clutchMult: 0.8, errorMult: 1.25, context: ["down2Sets"] }
      },
      COM: {
        name: "Remontada",
        desc: "+15% quando perdendo 2 sets a 0. Recusa desistir.",
        effects: { clutchMult: 1.15, strengthBonus: 2, context: ["down2Sets"] }
      },
      RAR: {
        name: "Remontada",
        desc: "+25% quando perdendo 2 a 0. Advers\xE1rio come\xE7a a sentir a press\xE3o.",
        effects: { clutchMult: 1.25, strengthBonus: 3, opponentDebuff: 0.05, context: ["down2Sets"] }
      },
      LEN: {
        name: "Lenda da Remontada",
        desc: "+40% quando perdendo 2 a 0. Advers\xE1rio sufoca. Forma m\xEDnima GRANDE_FORMA.",
        effects: { clutchMult: 1.4, strengthBonus: 4.5, opponentDebuff: 0.12, formFloor: "GRANDE_FORMA", context: ["down2Sets"] }
      }
    },
    sombra: { challenge: "Completar 3 remontadas de 2 sets a 0", target: 3, metric: "comebacks2Sets" }
  },
  FENIX: {
    id: "FENIX",
    name: "F\xEAnix",
    section: "clutch",
    tiers: {
      NEG: {
        name: "Esp\xEDrito Partido",
        desc: "Ap\xF3s set perdido por 6-0 ou 6-1, -20% no pr\xF3ximo set. Desmoralizado.",
        effects: { strengthBonus: -2.5, errorMult: 1.2, context: ["afterBagel"] }
      },
      COM: {
        name: "F\xEAnix",
        desc: "Ap\xF3s set perdido por 6-0 ou 6-1, +15% no pr\xF3ximo set. Raiva que vira for\xE7a.",
        effects: { strengthBonus: 2, clutchMult: 1.15, context: ["afterBagel"] }
      },
      RAR: {
        name: "F\xEAnix",
        desc: 'Ap\xF3s "bagel" ou "breadstick", +25% no set seguinte. Ressurge nas cinzas.',
        effects: { strengthBonus: 3, clutchMult: 1.25, context: ["afterBagel"] }
      },
      LEN: {
        name: "Ave F\xEAnix",
        desc: "Ap\xF3s qualquer set perdido feio, +40%. O golpe duro acende algo sobrenatural.",
        effects: { strengthBonus: 4.5, clutchMult: 1.4, formFloor: "GRANDE_FORMA", context: ["afterBagel"] }
      }
    }
  },
  LEAO_ENCURRALADO: {
    id: "LEAO_ENCURRALADO",
    name: "Le\xE3o Encurralado",
    section: "clutch",
    tiers: {
      NEG: {
        name: "Paralisia por Press\xE3o",
        desc: "Quando favorito absoluto, -15%. A expectativa paralisa.",
        effects: { strengthBonus: -1.5, errorMult: 1.15, context: ["heavyFavorite"] }
      },
      COM: {
        name: "Le\xE3o Encurralado",
        desc: "Como azar\xE3o, +10%. Liberdade de jogar sem press\xE3o.",
        effects: { strengthBonus: 1.5, clutchMult: 1.1, context: ["underdog"] }
      },
      RAR: {
        name: "Le\xE3o Encurralado",
        desc: "Como azar\xE3o, +20%. Advers\xE1rio relaxa, ele aproveita.",
        effects: { strengthBonus: 2.5, clutchMult: 1.2, opponentDebuff: 0.05, context: ["underdog"] }
      },
      LEN: {
        name: "Le\xE3o Encurralado",
        desc: "Como azar\xE3o, +35%. Imprevis\xEDvel, perigoso, devastador.",
        effects: { strengthBonus: 4, clutchMult: 1.35, opponentDebuff: 0.1, context: ["underdog"] }
      }
    }
  },
  ATRITO_RALLY: {
    id: "ATRITO_RALLY",
    name: "Atrito de Rally",
    section: "clutch",
    tiers: {
      NEG: {
        name: "Cansativo Demais",
        desc: "Rallies longos drenam mais: stamina -20% extra em rallies de +8 bolas.",
        effects: { staminaMult: 0.8, context: ["longRally"] }
      },
      COM: {
        name: "Atrito de Rally",
        desc: "Em rallies de +8 bolas, +10% em todos. Gosta do desgaste.",
        effects: { strengthBonus: 1, errorMult: 0.9, context: ["longRally"] }
      },
      RAR: {
        name: "Atrito de Rally",
        desc: "Em rallies longos, +20%. Stamina protegida. Advers\xE1rio desgasta mais.",
        effects: { strengthBonus: 2, staminaMult: 1.1, opponentDebuff: 0.05, context: ["longRally"] }
      },
      LEN: {
        name: "M\xE1quina de Atrito",
        desc: "Rallies longos viram sua arma. +30%, stamina intacta, advers\xE1rio quebra mais r\xE1pido.",
        effects: { strengthBonus: 3.5, staminaMult: 1.2, opponentDebuff: 0.12, context: ["longRally"] }
      }
    }
  },
  GUERREIRO: {
    id: "GUERREIRO",
    name: "Guerreiro",
    section: "clutch",
    tiers: {
      NEG: {
        name: "Lutador Ing\xEAnuo",
        desc: "Esfor\xE7o excessivo drena mais stamina: -15% de efici\xEAncia por tentar demais.",
        effects: { staminaMult: 0.85, context: ["always"] }
      },
      COM: {
        name: "Guerreiro",
        desc: "+8% em todos os momentos. Nunca desiste, nunca diminui o ritmo.",
        effects: { strengthBonus: 1, errorMult: 0.95, context: ["always"] }
      },
      RAR: {
        name: "Guerreiro",
        desc: "+15% em todos + erros n\xE3o for\xE7ados reduzidos. Intensidade sem desperd\xEDcio.",
        effects: { strengthBonus: 2, errorMult: 0.88, context: ["always"] }
      },
      LEN: {
        name: "Guerreiro Eterno",
        desc: "+22% em todos. Stamina protegida. Qualquer ponto pode ser o decisivo.",
        effects: { strengthBonus: 3, errorMult: 0.82, staminaMult: 1.15, context: ["always"] }
      }
    }
  },
  AVALANCHE: {
    id: "AVALANCHE",
    name: "Avalanche de Games",
    section: "clutch",
    tiers: {
      NEG: {
        name: "Fragil com Vantagem",
        desc: "Quando lidera por 3+ games no set, -15%. Fica passivo, deixa advers\xE1rio voltar.",
        effects: { strengthBonus: -1.5, errorMult: 1.2, context: ["bigLead"] }
      },
      COM: {
        name: "Avalanche",
        desc: "Quando lidera por 3+ games no set, +12%. Fecha sem dar respiro.",
        effects: { strengthBonus: 1.5, clutchMult: 1.12, context: ["bigLead"] }
      },
      RAR: {
        name: "Avalanche",
        desc: "Com vantagem de 3+ games, +22%. Advers\xE1rio sufoca sem conseguir reagir.",
        effects: { strengthBonus: 2.5, clutchMult: 1.22, opponentDebuff: 0.05, context: ["bigLead"] }
      },
      LEN: {
        name: "Avalanche Implac\xE1vel",
        desc: "Com 3+ games de vantagem, +35%. Fecha conjuntos sem parar.",
        effects: { strengthBonus: 4, clutchMult: 1.35, opponentDebuff: 0.1, context: ["bigLead"] }
      }
    }
  },
  // ────────────────────────────────────────────────────────────────
  // SEÇÃO 2: SAQUE
  // ────────────────────────────────────────────────────────────────
  IMPLACAVEL_SERV: {
    id: "IMPLACAVEL_SERV",
    name: "Implac\xE1vel no Servi\xE7o",
    section: "serve",
    tiers: {
      NEG: {
        name: "Saque Fr\xE1gil",
        desc: "-15% em saque quando sob press\xE3o. Erros no segundo saque sobem.",
        effects: { serveMult: 0.85, errorMult: 1.15, context: ["pressure"] }
      },
      COM: {
        name: "Implac\xE1vel",
        desc: "+12% em precis\xE3o e velocidade de saque em pontos de break.",
        effects: { serveMult: 1.12, context: ["breakPoint"] }
      },
      RAR: {
        name: "Implac\xE1vel",
        desc: "+20% no saque em break points. Double fault praticamente imposs\xEDvel.",
        effects: { serveMult: 1.2, errorMult: 0.9, context: ["breakPoint"] }
      },
      LEN: {
        name: "Saque Impar\xE1vel",
        desc: "+30% no saque em qualquer momento decisivo. Hold rate excepcional.",
        effects: { serveMult: 1.3, strengthBonus: 2.5, errorMult: 0.85, context: ["decisiveMoment"] }
      }
    }
  },
  REI_QUADRA: {
    id: "REI_QUADRA",
    name: "Rei da Quadra",
    section: "serve",
    tiers: {
      NEG: {
        name: "Nervoso em Casa",
        desc: "-10% geral quando jogando como cabe\xE7a de chave #1 ou #2 em torneio.",
        effects: { strengthBonus: -1, clutchMult: 0.92, context: ["topSeed"] }
      },
      COM: {
        name: "Rei da Quadra",
        desc: "+10% quando joga como favorito em seu forte. Dom\xEDnio total.",
        effects: { strengthBonus: 1.5, context: ["topSeed"] }
      },
      RAR: {
        name: "Rei da Quadra",
        desc: "+18% como cabe\xE7a de chave 1/2. Advers\xE1rios j\xE1 chegam intimidados.",
        effects: { strengthBonus: 2.5, opponentDebuff: 0.06, context: ["topSeed"] }
      },
      LEN: {
        name: "Imperador",
        desc: "+28% como cabe\xE7a 1/2. A quadra \xE9 dele. Advers\xE1rios capitulam.",
        effects: { strengthBonus: 4, opponentDebuff: 0.12, context: ["topSeed"] }
      }
    }
  },
  SANGUE_QUENTE: {
    id: "SANGUE_QUENTE",
    name: "Sangue Quente",
    section: "serve",
    mutex: ["MAQUINA"],
    tiers: {
      NEG: {
        name: "Explosivo Incontrol\xE1vel",
        desc: "Em pontos de raiva/contesta\xE7\xE3o, -15% e erros sobem. Emocional demais.",
        effects: { strengthBonus: -1.5, errorMult: 1.25, context: ["hotMoment"] }
      },
      COM: {
        name: "Sangue Quente",
        desc: "Raiva canalizada: ap\xF3s perder um ponto pol\xEAmico, +12% no pr\xF3ximo game.",
        effects: { strengthBonus: 1.5, clutchMult: 1.12, context: ["afterControversy"] }
      },
      RAR: {
        name: "Fogo no Sangue",
        desc: "+20% ap\xF3s qualquer ponto perdido de forma frustrante. A raiva \xE9 combust\xEDvel.",
        effects: { strengthBonus: 2.5, clutchMult: 1.2, context: ["afterFrustration"] }
      },
      LEN: {
        name: "Inferno Vivo",
        desc: "+32% quando raivoso. A quadra queima, o advers\xE1rio sente.",
        effects: { strengthBonus: 4, clutchMult: 1.32, opponentDebuff: 0.08, context: ["afterFrustration"] }
      }
    }
  },
  DESTRUIDOR_MORAL: {
    id: "DESTRUIDOR_MORAL",
    name: "Destruidor de Moral",
    section: "serve",
    tiers: {
      NEG: {
        name: "Vulner\xE1vel",
        desc: "-10% geral. Advers\xE1rio motivado pelo seu jeito de jogar.",
        effects: { strengthBonus: -1, opponentDebuff: -0.05, context: ["always"] }
      },
      COM: {
        name: "Destruidor",
        desc: "Ap\xF3s break ou vantagem clara, advers\xE1rio perde 5% de force por 1 game.",
        effects: { opponentDebuff: 0.05, context: ["afterBreak"] }
      },
      RAR: {
        name: "Destruidor",
        desc: "Ap\xF3s qualquer vit\xF3ria de game convincente, advers\xE1rio fica -10%.",
        effects: { opponentDebuff: 0.1, context: ["afterDominantGame"] }
      },
      LEN: {
        name: "Demolidor de Almas",
        desc: "Presen\xE7a constante debuffa advers\xE1rio em -12% durante toda a partida.",
        effects: { opponentDebuff: 0.12, context: ["always"] }
      }
    }
  },
  CANHAO_SAQUE: {
    id: "CANHAO_SAQUE",
    name: "Canh\xE3o de Saque",
    section: "serve",
    mutex: ["DF_ZERO"],
    tiers: {
      NEG: {
        name: "Saque Indisciplinado",
        desc: "Alta velocidade, alta double fault. Erros no 2\xBA saque frequentes.",
        effects: { serveMult: 1.1, errorMult: 1.35, context: ["serve"] }
      },
      COM: {
        name: "Canh\xE3o",
        desc: "+15% velocidade e penetra\xE7\xE3o de saque. Aces frequentes.",
        effects: { serveMult: 1.15, strengthBonus: 1.5, context: ["serve"] }
      },
      RAR: {
        name: "Canh\xE3o",
        desc: "+25% no saque. Retornadores do mundo t\xEAm dificuldade de estabelecer ritmo.",
        effects: { serveMult: 1.25, strengthBonus: 2.5, opponentDebuff: 0.05, context: ["serve"] }
      },
      LEN: {
        name: "M\xEDssil",
        desc: "+35% no saque. Aces em s\xE9rie. Advers\xE1rio entra em set abalado.",
        effects: { serveMult: 1.35, strengthBonus: 3.5, opponentDebuff: 0.08, context: ["serve"] }
      }
    }
  },
  PRECISAO_CIRURGICA: {
    id: "PRECISAO_CIRURGICA",
    name: "Precis\xE3o Cir\xFArgica",
    section: "serve",
    tiers: {
      NEG: {
        name: "Falta de Pot\xEAncia",
        desc: "Precis\xE3o sem for\xE7a: serve entra mas n\xE3o penetra. Retornadores adoram.",
        effects: { serveMult: 0.88, opponentDebuff: -0.05, context: ["serve"] }
      },
      COM: {
        name: "Preciso",
        desc: "+12% precis\xE3o no saque. Menos duplas faltas, mais pressionamento de linhas.",
        effects: { serveMult: 1.12, errorMult: 0.85, context: ["serve"] }
      },
      RAR: {
        name: "Cir\xFArgico",
        desc: "+20% precis\xE3o. Dupla falta quase imposs\xEDvel. Explora\xE7\xE3o perfeita dos \xE2ngulos.",
        effects: { serveMult: 1.2, errorMult: 0.78, context: ["serve"] }
      },
      LEN: {
        name: "Laser",
        desc: "+30% precis\xE3o. Cada saque tem destino. Dupla falta literalmente imposs\xEDvel.",
        effects: { serveMult: 1.3, errorMult: 0.7, context: ["serve"] }
      }
    }
  },
  SEGUNDO_SAQUE_ARMA: {
    id: "SEGUNDO_SAQUE_ARMA",
    name: "Segundo Servi\xE7o Arma",
    section: "serve",
    tiers: {
      NEG: {
        name: "Segundo Saque Fraco",
        desc: "2\xBA saque muito defensivo. Advers\xE1rios atacam f\xE1cil e ganham pontos.",
        effects: { serveMult: 0.8, opponentDebuff: -0.08, context: ["secondServe"] }
      },
      COM: {
        name: "2\xBA Saque S\xF3lido",
        desc: "2\xBA saque com +12% de penetra\xE7\xE3o. N\xE3o facilita, n\xE3o perde pontos de gra\xE7a.",
        effects: { serveMult: 1.12, context: ["secondServe"] }
      },
      RAR: {
        name: "2\xBA Saque Arma",
        desc: "2\xBA saque t\xE3o bom quanto 1\xBA de muitos. +20% + advers\xE1rio n\xE3o consegue atacar.",
        effects: { serveMult: 1.2, opponentDebuff: 0.08, context: ["secondServe"] }
      },
      LEN: {
        name: "2\xBA Saque Letal",
        desc: "2\xBA saque \xE9 armadilha. +30% penetra\xE7\xE3o. Advers\xE1rios perdem pontos no retorno.",
        effects: { serveMult: 1.3, opponentDebuff: 0.14, context: ["secondServe"] }
      }
    }
  },
  KICK_MASTER: {
    id: "KICK_MASTER",
    name: "Kick Master",
    section: "serve",
    tiers: {
      NEG: {
        name: "Kick Inconsistente",
        desc: "2\xBA saque com kick imprevis\xEDvel \u2014 sobe fora da zona e facilita o retorno. Advers\xE1rio ataca f\xE1cil.",
        effects: { serveMult: 0.82, opponentDebuff: -0.06, context: ["secondServe"] }
      },
      COM: {
        name: "Kick",
        desc: "+10% no 2\xBA saque com kick. Sobe alto, advers\xE1rio tem dificuldade.",
        effects: { serveMult: 1.1, context: ["secondServe"] }
      },
      RAR: {
        name: "Kick Intenso",
        desc: "+20% kick. Rebote alto fora da zona de conforto. Retorno virado.",
        effects: { serveMult: 1.2, opponentDebuff: 0.06, context: ["secondServe"] }
      },
      LEN: {
        name: "Kick Explosivo",
        desc: "+30% kick. O rebote imposs\xEDvel. Rival praticamente perde o ponto no retorno.",
        effects: { serveMult: 1.3, opponentDebuff: 0.12, context: ["secondServe"] }
      }
    }
  },
  DF_ZERO: {
    id: "DF_ZERO",
    name: "Dupla Falta Zero",
    section: "serve",
    mutex: ["CANHAO_SAQUE"],
    tiers: {
      NEG: {
        name: "DF Frequente",
        desc: "Duplas faltas nos piores momentos. Erros de saque aumentam sob press\xE3o.",
        effects: { errorMult: 1.3, serveMult: 0.9, context: ["pressure"] }
      },
      COM: {
        name: "Sem Duplas",
        desc: "Dupla falta reduzida em 40%. Segundo saque confi\xE1vel.",
        effects: { errorMult: 0.7, context: ["serve"] }
      },
      RAR: {
        name: "DF Zero",
        desc: "Dupla falta raridade absoluta. Confian\xE7a no 2\xBA saque impactante.",
        effects: { errorMult: 0.5, serveMult: 1.1, context: ["serve"] }
      },
      LEN: {
        name: "Perfei\xE7\xE3o no Saque",
        desc: "Double fault imposs\xEDvel. Cada saque, independente do placar, cai bem.",
        effects: { errorMult: 0.1, serveMult: 1.2, context: ["serve"] }
      }
    }
  },
  // ────────────────────────────────────────────────────────────────
  // SEÇÃO 3: GOLPES DE FUNDO
  // ────────────────────────────────────────────────────────────────
  FH_ASSASSINO: {
    id: "FH_ASSASSINO",
    name: "Forehand Assassino",
    section: "strokes",
    tiers: {
      NEG: {
        name: "FH Inconsistente",
        desc: "FH pode decidir partidas de forma errada. Erros gratuitos aumentam 20%.",
        effects: { errorMult: 1.2, context: ["forehand"] }
      },
      COM: {
        name: "FH Assassino",
        desc: "+15% pot\xEAncia e \xE2ngulo no forehand. Winner production sobe.",
        effects: { strengthBonus: 1.5, context: ["forehand"] }
      },
      RAR: {
        name: "FH Assassino",
        desc: "+25% no forehand. A partir do 5\xBA rally, a amea\xE7a fica permanente.",
        effects: { strengthBonus: 2.5, opponentDebuff: 0.05, context: ["forehand"] }
      },
      LEN: {
        name: "FH Devastador",
        desc: "+35% forehand. Arma mais temida do circuito. Advers\xE1rios fogem dele.",
        effects: { strengthBonus: 4, opponentDebuff: 0.1, context: ["forehand"] }
      }
    }
  },
  BH_FERRO: {
    id: "BH_FERRO",
    name: "Backhand de Ferro",
    section: "strokes",
    tiers: {
      NEG: {
        name: "BH Buraco",
        desc: "Backhand \xE9 ponto fraco explorado. Advers\xE1rios constroem jogadas por ali.",
        effects: { strengthBonus: -1.5, opponentDebuff: -0.08, context: ["backhand"] }
      },
      COM: {
        name: "BH S\xF3lido",
        desc: "+12% no backhand. Ningu\xE9m explora mais esse lado.",
        effects: { strengthBonus: 1.2, errorMult: 0.9, context: ["backhand"] }
      },
      RAR: {
        name: "BH de Ferro",
        desc: "+22% no BH. Defesa e ataque do mesmo lado. Advers\xE1rios mudam plano de jogo.",
        effects: { strengthBonus: 2.5, errorMult: 0.82, opponentDebuff: 0.05, context: ["backhand"] }
      },
      LEN: {
        name: "BH Lend\xE1rio",
        desc: "+32% BH. Um dos melhores do circuito. Ponto de partida para winners.",
        effects: { strengthBonus: 3.8, errorMult: 0.75, opponentDebuff: 0.1, context: ["backhand"] }
      }
    }
  },
  RETRIEVER_ETERNO: {
    id: "RETRIEVER_ETERNO",
    name: "Retriever Eterno",
    section: "strokes",
    tiers: {
      NEG: {
        name: "Defensivo Demais",
        desc: "Corre tudo mas nunca atacar. Advers\xE1rios ficam confort\xE1veis.",
        effects: { strengthBonus: -1, context: ["defense"] }
      },
      COM: {
        name: "Retriever",
        desc: "+12% em defesa e cobertura. Devuelve bolas que outros errariam.",
        effects: { strengthBonus: 1.2, errorMult: 0.88, context: ["defense"] }
      },
      RAR: {
        name: "Retriever Eterno",
        desc: "+22% em defesa. Stamina protegida. Advers\xE1rios se desgastam tentando errar.",
        effects: { strengthBonus: 2.5, staminaMult: 1.1, opponentDebuff: 0.05, context: ["defense"] }
      },
      LEN: {
        name: "Parede Viva",
        desc: "+32% em defesa. Stamina m\xE1xima. Advers\xE1rios se entregam antes da quadra.",
        effects: { strengthBonus: 4, staminaMult: 1.25, opponentDebuff: 0.12, context: ["defense"] }
      }
    }
  },
  CONTRA_ATAQUE: {
    id: "CONTRA_ATAQUE",
    name: "Contra-ataque",
    section: "strokes",
    tiers: {
      NEG: {
        name: "Passivo Demais",
        desc: "Tenta contra-atacar mas timing errado. Mais erros, menos winners.",
        effects: { errorMult: 1.2, strengthBonus: -0.5, context: ["counterAttack"] }
      },
      COM: {
        name: "Contra-ataque",
        desc: "+15% quando responde a um winner do advers\xE1rio. Timing perfeito.",
        effects: { strengthBonus: 1.5, clutchMult: 1.1, context: ["counterAttack"] }
      },
      RAR: {
        name: "Contragolpe",
        desc: "+25% em contra-ataques. Advers\xE1rios ficam relutantes em arriscar.",
        effects: { strengthBonus: 2.5, opponentDebuff: 0.06, context: ["counterAttack"] }
      },
      LEN: {
        name: "Espelho da Morte",
        desc: "+35% em contra-ataque. Quanto mais o advers\xE1rio arrisca, pior fica para ele.",
        effects: { strengthBonus: 4, opponentDebuff: 0.12, context: ["counterAttack"] }
      }
    }
  },
  BOLA_PESADA: {
    id: "BOLA_PESADA",
    name: "Bola Pesada",
    section: "strokes",
    tiers: {
      NEG: {
        name: "Bola Leve",
        desc: "Golpes sem profundidade. Advers\xE1rios recebem confortavelmente e atacam.",
        effects: { strengthBonus: -1.5, opponentDebuff: -0.06, context: ["rally"] }
      },
      COM: {
        name: "Bola Pesada",
        desc: "+12% em impacto e profundidade. Advers\xE1rios recuam nos rallies.",
        effects: { strengthBonus: 1.5, context: ["rally"] }
      },
      RAR: {
        name: "Bola Esmagadora",
        desc: "+22% em peso de bola. Advers\xE1rios erram mais devolvendo.",
        effects: { strengthBonus: 2.5, opponentDebuff: 0.06, context: ["rally"] }
      },
      LEN: {
        name: "Peso Absurdo",
        desc: "+30% peso. Cada bola \xE9 uma parede. Advers\xE1rios chegam em desequil\xEDbrio.",
        effects: { strengthBonus: 3.8, opponentDebuff: 0.12, context: ["rally"] }
      }
    }
  },
  // ────────────────────────────────────────────────────────────────
  // SEÇÃO 4: FORMATOS
  // ────────────────────────────────────────────────────────────────
  ESPECIALISTA_BO5: {
    id: "ESPECIALISTA_BO5",
    name: "Especialista BO5",
    section: "format",
    mutex: ["ESPECIALISTA_KO"],
    tiers: {
      NEG: {
        name: "Melhor em BO3",
        desc: "-10% geral em partidas Best of 5. Melhor em formato curto.",
        effects: { strengthBonus: -1, context: ["bestOf5"] }
      },
      COM: {
        name: "BO5 S\xF3lido",
        desc: "+10% em partidas BO5. Ritmo diferente, mais confort\xE1vel.",
        effects: { strengthBonus: 1.5, context: ["bestOf5"] }
      },
      RAR: {
        name: "BO5 Especialista",
        desc: "+20% em BO5. Stamina gerida melhor. Advers\xE1rios desmoronam no 4\xBA-5\xBA.",
        effects: { strengthBonus: 2.5, staminaMult: 1.15, context: ["bestOf5"] }
      },
      LEN: {
        name: "Monstro de Grand Slam",
        desc: "+30% em BO5. Nenhum advers\xE1rio aguenta durante 3-5 sets contra ele.",
        effects: { strengthBonus: 3.8, staminaMult: 1.25, opponentDebuff: 0.08, context: ["bestOf5"] }
      }
    }
  },
  CAMPEAO_TB: {
    id: "CAMPEAO_TB",
    name: "Campe\xE3o de Tiebreak",
    section: "format",
    mutex: ["TIEBREAK_KILLER"],
    tiers: {
      NEG: {
        name: "Terror no Tiebreak",
        desc: "-20% em tiebreak. Formato decisivo, momento de travamento.",
        effects: { clutchMult: 0.8, context: ["tiebreak"] }
      },
      COM: {
        name: "Campe\xE3o de TB",
        desc: "+15% em tiebreaks. Confort\xE1vel com o formato mini-set.",
        effects: { clutchMult: 1.15, strengthBonus: 1.5, context: ["tiebreak"] }
      },
      RAR: {
        name: "Campe\xE3o de TB",
        desc: "+25% em tiebreaks. Saca melhor e retorna melhor nesses momentos.",
        effects: { clutchMult: 1.25, serveMult: 1.12, context: ["tiebreak"] }
      },
      LEN: {
        name: "Dono dos TBs",
        desc: "+35% em tiebreaks. Advers\xE1rios preferiram evitar. Formato \xE9 sua arma.",
        effects: { clutchMult: 1.35, strengthBonus: 3.5, serveMult: 1.15, context: ["tiebreak"] }
      }
    },
    sombra: { challenge: "Ganhar 10 tiebreaks na carreira", target: 10, metric: "tiebreaksWon" }
  },
  RELOGIO_BIOLOGICO: {
    id: "RELOGIO_BIOLOGICO",
    name: "Rel\xF3gio Biol\xF3gico",
    section: "format",
    tiers: {
      NEG: {
        name: "Contra-Rel\xF3gio",
        desc: "Partidas longas desgastam mais: stamina cai 25% mais r\xE1pido.",
        effects: { staminaMult: 0.75, context: ["longMatch"] }
      },
      COM: {
        name: "Rel\xF3gio Biol\xF3gico",
        desc: "Em partidas de 2h+, +10% geral. Corpo calibrado para longas batalhas.",
        effects: { strengthBonus: 1, staminaMult: 1.1, context: ["longMatch"] }
      },
      RAR: {
        name: "Cron\xF4metro Perfeito",
        desc: "Em partidas longas, +20% + reaquecimento autom\xE1tico entre sets.",
        effects: { strengthBonus: 2, staminaMult: 1.2, context: ["longMatch"] }
      },
      LEN: {
        name: "M\xE1quina do Tempo",
        desc: "+30% em partidas de 2h+. Parece mais fresco no final que no in\xEDcio.",
        effects: { strengthBonus: 3.5, staminaMult: 1.35, context: ["longMatch"] }
      }
    }
  },
  TERCEIRO_SET: {
    id: "TERCEIRO_SET",
    name: "Especialista no 3\xBA Set",
    section: "format",
    tiers: {
      NEG: {
        name: "Desmorona no 3\xBA",
        desc: "-15% no 3\xBA set em BO3. Fisicamente ou mentalmente j\xE1 foi.",
        effects: { strengthBonus: -1.5, staminaMult: 0.82, context: ["thirdSet"] }
      },
      COM: {
        name: "3\xBA Set S\xF3lido",
        desc: "+15% no 3\xBA set. Foco total no decisivo.",
        effects: { strengthBonus: 2, clutchMult: 1.15, context: ["thirdSet"] }
      },
      RAR: {
        name: "Especialista no 3\xBA",
        desc: "+25% no 3\xBA set. Stamina gerida. Advers\xE1rio cansou mais.",
        effects: { strengthBonus: 3, clutchMult: 1.25, staminaMult: 1.15, context: ["thirdSet"] }
      },
      LEN: {
        name: "Senhor do 3\xBA Set",
        desc: "+35% no 3\xBA. Forma GRANDE_FORMA garantida. Advers\xE1rios choram.",
        effects: { strengthBonus: 4, clutchMult: 1.35, formFloor: "GRANDE_FORMA", context: ["thirdSet"] }
      }
    }
  },
  // ────────────────────────────────────────────────────────────────
  // SEÇÃO 5: SUPERFÍCIES
  // ────────────────────────────────────────────────────────────────
  REI_SAIBRO: {
    id: "REI_SAIBRO",
    name: "Rei do Saibro",
    section: "surface",
    mutex: ["MAGO_GRAMA"],
    tiers: {
      NEG: {
        name: "Dificuldade no Saibro",
        desc: "-15% em saibro. Rally lento sufoca. Movimento dif\xEDcil.",
        effects: { strengthBonus: -2, context: ["surface:CLAY"] }
      },
      COM: {
        name: "Confort\xE1vel no Saibro",
        desc: "+12% em saibro. Constru\xE7\xE3o de ponto natural.",
        effects: { strengthBonus: 2, context: ["surface:CLAY"] }
      },
      RAR: {
        name: "Rei do Saibro",
        desc: "+22% em saibro. Posicionamento e paci\xEAncia superiores.",
        effects: { strengthBonus: 3.5, opponentDebuff: 0.05, context: ["surface:CLAY"] }
      },
      LEN: {
        name: "Soberano do P\xF3 de Tijolo",
        desc: "+32% em saibro. Invenc\xEDvel na superf\xEDcie. Advers\xE1rios sabem que n\xE3o t\xEAm chance.",
        effects: { strengthBonus: 5, opponentDebuff: 0.12, context: ["surface:CLAY"] }
      }
    },
    sombra: { challenge: "Vencer 5 partidas em saibro", target: 5, metric: "clayWins" }
  },
  MAGO_GRAMA: {
    id: "MAGO_GRAMA",
    name: "Mago da Grama",
    section: "surface",
    mutex: ["REI_SAIBRO"],
    tiers: {
      NEG: {
        name: "P\xE9ssimo na Grama",
        desc: "-15% na grama. Movimento dif\xEDcil, bounce imprevis\xEDvel.",
        effects: { strengthBonus: -2, context: ["surface:GRASS"] }
      },
      COM: {
        name: "Confort\xE1vel na Grama",
        desc: "+12% na grama. Serve-and-volley natural.",
        effects: { strengthBonus: 2, context: ["surface:GRASS"] }
      },
      RAR: {
        name: "Mago da Grama",
        desc: "+22% na grama. Saque e rede dominantes.",
        effects: { strengthBonus: 3.5, serveMult: 1.1, context: ["surface:GRASS"] }
      },
      LEN: {
        name: "Senhor de Wimbledon",
        desc: "+32% na grama. O melhor da hist\xF3ria na superf\xEDcie.",
        effects: { strengthBonus: 5, serveMult: 1.15, opponentDebuff: 0.1, context: ["surface:GRASS"] }
      }
    },
    sombra: { challenge: "Vencer 5 partidas na grama", target: 5, metric: "grassWins" }
  },
  HARDCOURT_NATIVO: {
    id: "HARDCOURT_NATIVO",
    name: "Hardcourt Nativo",
    section: "surface",
    tiers: {
      NEG: {
        name: "Lesionado pelo Hard",
        desc: "-10% em hard court + risco de les\xE3o aumentado.",
        effects: { strengthBonus: -1.5, context: ["surface:HARD"] }
      },
      COM: {
        name: "Nativo do Hard",
        desc: "+12% em hard court. Superficie favorita desde jovem.",
        effects: { strengthBonus: 2, context: ["surface:HARD"] }
      },
      RAR: {
        name: "Especialista Hard",
        desc: "+22% em hard. Prote\xE7\xE3o de les\xE3o. Movimento otimizado.",
        effects: { strengthBonus: 3.5, context: ["surface:HARD"] }
      },
      LEN: {
        name: "Rei do Cemento",
        desc: "+30% em hard. Superf\xEDcie que define sua grandeza.",
        effects: { strengthBonus: 4.5, opponentDebuff: 0.08, context: ["surface:HARD"] }
      }
    },
    sombra: { challenge: "Vencer 5 partidas em hard sem les\xE3o", target: 5, metric: "hardWinsNoInjury" }
  },
  INDOOR_SPEC: {
    id: "INDOOR_SPEC",
    name: "Especialista Indoor",
    section: "surface",
    tiers: {
      NEG: {
        name: "Indoor Perturbador",
        desc: "-12% indoor. Luz artificial e eco tiram foco.",
        effects: { strengthBonus: -1.5, context: ["surface:INDOOR"] }
      },
      COM: {
        name: "Indoor S\xF3lido",
        desc: "+12% indoor. Adaptado \xE0 velocidade e condi\xE7\xF5es internas.",
        effects: { strengthBonus: 2, context: ["surface:INDOOR"] }
      },
      RAR: {
        name: "Especialista Indoor",
        desc: "+22% indoor. Condi\xE7\xF5es onde ele brilha.",
        effects: { strengthBonus: 3.5, context: ["surface:INDOOR"] }
      },
      LEN: {
        name: "Imperador do Indoor",
        desc: "+30% indoor. Palcos cobertos, resultados extraordin\xE1rios.",
        effects: { strengthBonus: 4.5, opponentDebuff: 0.08, context: ["surface:INDOOR"] }
      }
    },
    sombra: { challenge: "Vencer 3 torneios indoor", target: 3, metric: "indoorTitles" }
  },
  ALL_SURFACE: {
    id: "ALL_SURFACE",
    name: "All Court",
    section: "surface",
    tiers: {
      NEG: {
        name: "Sem Especialidade",
        desc: "-5% em todas as superf\xEDcies. Competente em tudo, \xF3timo em nada.",
        effects: { strengthBonus: -0.8, context: ["always"] }
      },
      COM: {
        name: "All Court",
        desc: "+8% em todas as superf\xEDcies. Adapta\xE7\xE3o r\xE1pida a qualquer quadra.",
        effects: { strengthBonus: 1.2, context: ["always"] }
      },
      RAR: {
        name: "Mestre das Superf\xEDcies",
        desc: "+16% em todas. Cada superf\xEDcie traz conforto diferente.",
        effects: { strengthBonus: 2.2, context: ["always"] }
      },
      LEN: {
        name: "Rei de Todas",
        desc: "+25% em qualquer superf\xEDcie. Sem fraqueza, apenas for\xE7a.",
        effects: { strengthBonus: 3.5, context: ["always"] }
      }
    }
  },
  // ────────────────────────────────────────────────────────────────
  // SEÇÃO 6: TORNEIOS
  // ────────────────────────────────────────────────────────────────
  CACADOR_GS: {
    id: "CACADOR_GS",
    name: "Ca\xE7ador de Grand Slam",
    section: "tournament",
    tiers: {
      NEG: {
        name: "Amaldi\xE7oado pelo GS",
        desc: "-15% em qualquer Grand Slam. Maior palco, pior resultado.",
        effects: { strengthBonus: -2, clutchMult: 0.85, context: ["grandSlam"] }
      },
      COM: {
        name: "Ca\xE7ador",
        desc: "+10% em GS. Motiva\xE7\xE3o extra nos maiores torneios.",
        effects: { strengthBonus: 1.5, clutchMult: 1.1, context: ["grandSlam"] }
      },
      RAR: {
        name: "Ca\xE7ador de GS",
        desc: "+18% em GS. A ca\xE7ada ao t\xEDtulo principal \xE9 o que move.",
        effects: { strengthBonus: 2.5, clutchMult: 1.2, context: ["grandSlam"] }
      },
      LEN: {
        name: "Lenda dos Slams",
        desc: "+28% em GS. Feito para o palco mais importante.",
        effects: { strengthBonus: 4, clutchMult: 1.3, formFloor: "GRANDE_FORMA", context: ["grandSlam"] }
      }
    },
    sombra: { challenge: "Vencer qualquer Grand Slam", target: 1, metric: "grandSlamTitles" }
  },
  ESPECIALISTA_KO: {
    id: "ESPECIALISTA_KO",
    name: "Especialista KO",
    section: "tournament",
    mutex: ["ESPECIALISTA_BO5"],
    tiers: {
      NEG: {
        name: "Para nas Quartas",
        desc: "-15% em fases avan\xE7adas. Algo bloqueante nas quartas em diante.",
        effects: { strengthBonus: -1.5, context: ["quarterFinal+"] }
      },
      COM: {
        name: "KO S\xF3lido",
        desc: "+10% em fases eliminat\xF3rias. Confort\xE1vel com o peso de cada partida.",
        effects: { strengthBonus: 1.5, context: ["knockoutRound"] }
      },
      RAR: {
        name: "Especialista KO",
        desc: "+20% em eliminat\xF3rias. Cada vit\xF3ria alimenta a chama.",
        effects: { strengthBonus: 2.5, clutchMult: 1.15, context: ["knockoutRound"] }
      },
      LEN: {
        name: "Destilado do KO",
        desc: "+30% em eliminat\xF3rias. Torneio de mata-mata \xE9 seu elemento.",
        effects: { strengthBonus: 4, clutchMult: 1.25, context: ["knockoutRound"] }
      }
    },
    sombra: { challenge: "Atingir 3 semifinais em torneios diferentes", target: 3, metric: "semifinalReached" }
  },
  REI_DRAW: {
    id: "REI_DRAW",
    name: "Rei do Chaveamento",
    section: "tournament",
    tiers: {
      NEG: {
        name: "Azarado no Chaveamento",
        desc: "-10% quando enfrenta advers\xE1rios melhor ranqueados na primeira semana.",
        effects: { strengthBonus: -1, context: ["toughDraw"] }
      },
      COM: {
        name: "Rei do Draw",
        desc: "+8% quando enfrenta advers\xE1rios mais fracos no chaveamento.",
        effects: { strengthBonus: 1.2, context: ["easierDraw"] }
      },
      RAR: {
        name: "Dono do Chaveamento",
        desc: "+16% independente do chaveamento. Adapta jogo ao advers\xE1rio.",
        effects: { strengthBonus: 2, context: ["always"] }
      },
      LEN: {
        name: "Benefici\xE1rio Total",
        desc: "+25% e cria vantagem em qualquer chaveamento. Favorece a si mesmo.",
        effects: { strengthBonus: 3.2, opponentDebuff: 0.06, context: ["always"] }
      }
    }
  },
  CACADOR_SEEDS: {
    id: "CACADOR_SEEDS",
    name: "Ca\xE7ador de Seeds",
    section: "tournament",
    tiers: {
      NEG: {
        name: "Intimidado pelos Seeds",
        desc: "-15% quando enfrenta um top seed. O nome pesa.",
        effects: { strengthBonus: -1.5, clutchMult: 0.88, context: ["vsTopSeed"] }
      },
      COM: {
        name: "Ca\xE7ador",
        desc: "+10% contra top seeds. Nada a perder, tudo a ganhar.",
        effects: { strengthBonus: 1.5, clutchMult: 1.1, context: ["vsTopSeed"] }
      },
      RAR: {
        name: "Matador de Seeds",
        desc: "+20% vs seeds. Upsets s\xE3o especialidade.",
        effects: { strengthBonus: 2.5, clutchMult: 1.2, context: ["vsTopSeed"] }
      },
      LEN: {
        name: "Terror dos Favoritos",
        desc: "+30% vs seeds. Cada chaveamento com seed \xE9 oportunidade.",
        effects: { strengthBonus: 4, clutchMult: 1.3, opponentDebuff: 0.08, context: ["vsTopSeed"] }
      }
    }
  },
  // ────────────────────────────────────────────────────────────────
  // SEÇÃO 7: LEGADO
  // ────────────────────────────────────────────────────────────────
  RESSURGIMENTO: {
    id: "RESSURGIMENTO",
    name: "Ressurgimento",
    section: "legacy",
    tiers: {
      NEG: {
        name: "Involu\xE7\xE3o Constante",
        desc: "Ap\xF3s decl\xEDnio, atributos caem 10% mais r\xE1pido. Sem volta.",
        effects: { strengthBonus: -1.5, context: ["decline"] }
      },
      COM: {
        name: "Ressurgimento",
        desc: "Em decl\xEDnio, chance de mini-pico: +10% por uma temporada.",
        effects: { strengthBonus: 1.5, context: ["decline"] }
      },
      RAR: {
        name: "Renascimento",
        desc: "+20% em decl\xEDnio + decl\xEDnio atrasado em 1 temporada.",
        effects: { strengthBonus: 2.5, staminaMult: 1.1, context: ["decline"] }
      },
      LEN: {
        name: "Volta Lend\xE1ria",
        desc: "+30% em decl\xEDnio. A hist\xF3ria \xE9 reescrita na reta final.",
        effects: { strengthBonus: 4, context: ["decline"] }
      }
    }
  },
  MEMORIA_FOTOGRAFICA: {
    id: "MEMORIA_FOTOGRAFICA",
    name: "Mem\xF3ria Fotogr\xE1fica",
    section: "legacy",
    tiers: {
      NEG: {
        name: "Mem\xF3ria Curta",
        desc: "-10% em rematches. N\xE3o aprende com derrotas anteriores.",
        effects: { strengthBonus: -1, context: ["rematch"] }
      },
      COM: {
        name: "Mem\xF3ria",
        desc: "+12% em rematches. Lembra cada padr\xE3o do advers\xE1rio.",
        effects: { strengthBonus: 1.5, context: ["rematch"] }
      },
      RAR: {
        name: "An\xE1lise Profunda",
        desc: "+22% em rematches. Advers\xE1rios n\xE3o conseguem surpreender.",
        effects: { strengthBonus: 2.5, opponentDebuff: 0.06, context: ["rematch"] }
      },
      LEN: {
        name: "Arquivo Mental",
        desc: "+32% em rematches. Decodifica qualquer advers\xE1rio j\xE1 enfrentado.",
        effects: { strengthBonus: 4, opponentDebuff: 0.12, context: ["rematch"] }
      }
    }
  },
  PSICOLOGICO: {
    id: "PSICOLOGICO",
    name: "Domin\xE2ncia Psicol\xF3gica",
    section: "legacy",
    tiers: {
      NEG: {
        name: "Cabe\xE7a Fr\xE1gil",
        desc: "Advers\xE1rios que o derrotaram antes: -15%. N\xE3o supera os fantasmas.",
        effects: { clutchMult: 0.85, strengthBonus: -1.5, context: ["vsConqueror"] }
      },
      COM: {
        name: "Psicol\xF3gico",
        desc: "+12% contra advers\xE1rios que derrotou anteriormente.",
        effects: { strengthBonus: 1.5, context: ["vsDefeated"] }
      },
      RAR: {
        name: "Domin\xE2ncia Mental",
        desc: "+22% contra advers\xE1rios j\xE1 derrotados. H2H viram arma.",
        effects: { strengthBonus: 2.5, opponentDebuff: 0.07, context: ["vsDefeated"] }
      },
      LEN: {
        name: "Fantasma na Cabe\xE7a",
        desc: "+30% vs anteriores derrotados. Advers\xE1rio sabe que vai perder.",
        effects: { strengthBonus: 4, opponentDebuff: 0.15, context: ["vsDefeated"] }
      }
    }
  },
  ESPECIALISTA_REVANCHE: {
    id: "ESPECIALISTA_REVANCHE",
    name: "Especialista em Revanche",
    section: "legacy",
    tiers: {
      NEG: {
        name: "Incapaz de Vingar",
        desc: "-12% contra advers\xE1rios que derrotou. N\xE3o consegue ser consistente.",
        effects: { strengthBonus: -1.2, context: ["vsDefeated"] }
      },
      COM: {
        name: "Revanche",
        desc: "+12% quando perde para um advers\xE1rio pela segunda vez.",
        effects: { strengthBonus: 1.5, clutchMult: 1.12, context: ["rematchLoss"] }
      },
      RAR: {
        name: "Especialista em Revanche",
        desc: "+22% em revanche ap\xF3s derrota. Motiva\xE7\xE3o extra.",
        effects: { strengthBonus: 2.5, clutchMult: 1.22, context: ["rematchLoss"] }
      },
      LEN: {
        name: "Vendetta",
        desc: "+32% na revanche. A derrota anterior \xE9 o combust\xEDvel definitivo.",
        effects: { strengthBonus: 4, clutchMult: 1.32, context: ["rematchLoss"] }
      }
    }
  },
  RIVAL_ETERNO: {
    id: "RIVAL_ETERNO",
    name: "Rival Eterno",
    section: "legacy",
    tiers: {
      NEG: {
        name: "Sem Rival Definido",
        desc: "Sem rival que o motive. -5% geral em partidas importantes.",
        effects: { strengthBonus: -0.5, context: ["importantMatch"] }
      },
      COM: {
        name: "Rival",
        desc: "+12% quando enfrenta o rival principal (H2H mais disputado).",
        effects: { strengthBonus: 2, clutchMult: 1.15, context: ["vsRival"] }
      },
      RAR: {
        name: "Rival Eterno",
        desc: "+22% vs rival. O duelo define sua carreira.",
        effects: { strengthBonus: 3, clutchMult: 1.25, context: ["vsRival"] }
      },
      LEN: {
        name: "O Confronto do S\xE9culo",
        desc: "+32% vs rival. Todos os outros advers\xE1rios s\xE3o secund\xE1rios.",
        effects: { strengthBonus: 4.5, clutchMult: 1.35, context: ["vsRival"] }
      }
    }
  },
  // ────────────────────────────────────────────────────────────────
  // SEÇÃO 8: DESENVOLVIMENTO
  // ────────────────────────────────────────────────────────────────
  SUPERPRODIGIO: {
    id: "SUPERPRODIGIO",
    name: "Superprod\xEDgio",
    section: "development",
    mutex: ["LATE_BLOOMER"],
    tiers: {
      NEG: {
        name: "Press\xE3o do Prod\xEDgio",
        desc: "Expectativa muito alta antes dos 20. -10% at\xE9 completar 21 anos.",
        effects: { strengthBonus: -1, context: ["under21"] }
      },
      COM: {
        name: "Prod\xEDgio",
        desc: "Antes dos 21: +12% ao crescimento de atributos. Aprende ultra r\xE1pido.",
        effects: { strengthBonus: 1.5, context: ["under21"] }
      },
      RAR: {
        name: "Superprod\xEDgio",
        desc: "+22% antes dos 21. Pico de carreira pode chegar mais cedo.",
        effects: { strengthBonus: 2.5, context: ["under21"] }
      },
      LEN: {
        name: "Fen\xF4meno",
        desc: "+32% antes dos 21. Nenhum jovem chegou t\xE3o longe t\xE3o r\xE1pido.",
        effects: { strengthBonus: 4, context: ["under21"] }
      }
    }
  },
  DIAMANTE_BRUTO: {
    id: "DIAMANTE_BRUTO",
    name: "Diamante Bruto",
    section: "development",
    tiers: {
      NEG: {
        name: "Incompreendido",
        desc: "Potencial n\xE3o desenvolvido: pico de carreira 2 anos mais tarde, sem compensa\xE7\xE3o.",
        effects: { strengthBonus: -1, context: ["earlyCareer"] }
      },
      COM: {
        name: "Diamante Bruto",
        desc: "Per\xEDodo de ajuste: -5% nos 2 primeiros anos mas +15% nos 2 seguintes.",
        effects: { strengthBonus: 1.5, context: ["midCareer"] }
      },
      RAR: {
        name: "Pedra Preciosa",
        desc: "Ap\xF3s 3 anos pro: +20% ao crescimento de todos os atributos.",
        effects: { strengthBonus: 2.5, context: ["midCareer"] }
      },
      LEN: {
        name: "Ouro Puro",
        desc: "Ap\xF3s 3 anos pro: +30% crescimento. O melhor tarde do que nunca.",
        effects: { strengthBonus: 3.8, context: ["midCareer"] }
      }
    }
  },
  VETERANO_ETERNO: {
    id: "VETERANO_ETERNO",
    name: "Veterano Eterno",
    section: "development",
    tiers: {
      NEG: {
        name: "Cansado Demais",
        desc: "Ap\xF3s os 30: decl\xEDnio 20% mais r\xE1pido. O corpo j\xE1 n\xE3o aguenta.",
        effects: { strengthBonus: -2, context: ["over30"] }
      },
      COM: {
        name: "Veterano",
        desc: "Ap\xF3s os 30: decl\xEDnio 20% mais lento. Experi\xEAncia compensa.",
        effects: { strengthBonus: 1, staminaMult: 1.1, context: ["over30"] }
      },
      RAR: {
        name: "Veterano Eterno",
        desc: "Ap\xF3s os 30: +15% e decl\xEDnio m\xEDnimo. Jogo mais inteligente.",
        effects: { strengthBonus: 2, staminaMult: 1.2, context: ["over30"] }
      },
      LEN: {
        name: "Imortal",
        desc: "Ap\xF3s os 30: +25% e quase sem decl\xEDnio. A lenda n\xE3o envelhece.",
        effects: { strengthBonus: 3.5, staminaMult: 1.3, context: ["over30"] }
      }
    }
  },
  LATE_BLOOMER: {
    id: "LATE_BLOOMER",
    name: "Late Bloomer",
    section: "development",
    mutex: ["SUPERPRODIGIO"],
    tiers: {
      NEG: {
        name: "Muito Tarde",
        desc: "Pico chega aos 28+ mas nunca \xE9 t\xE3o alto. Potencial desperdi\xE7ado.",
        effects: { strengthBonus: -1, context: ["earlyCareer"] }
      },
      COM: {
        name: "Late Bloomer",
        desc: "Pico de carreira chegando mais tarde (26-28) mas com valores mais altos.",
        effects: { strengthBonus: 1.5, context: ["lateCareer"] }
      },
      RAR: {
        name: "Floresce Tarde",
        desc: "Entre 26-30: +20% crescimento. Os melhores anos ainda est\xE3o por vir.",
        effects: { strengthBonus: 2.5, context: ["lateCareer"] }
      },
      LEN: {
        name: "Destinado a Florir",
        desc: "Entre 25-32: pico mais alto de todos. A espera valeu.",
        effects: { strengthBonus: 4, context: ["lateCareer"] }
      }
    }
  },
  BLINDAGEM_CARREIRA: {
    id: "BLINDAGEM_CARREIRA",
    name: "Blindagem de Carreira",
    section: "development",
    tiers: {
      NEG: {
        name: "Carreira Inst\xE1vel",
        desc: "Eventos ruins afetam mais a trajet\xF3ria. Oscila\xE7\xF5es frequentes.",
        effects: { strengthBonus: -1, context: ["adversity"] }
      },
      COM: {
        name: "Blindagem",
        desc: "Eventos negativos de carreira t\xEAm 30% menos impacto nos atributos.",
        effects: { strengthBonus: 0.5, context: ["always"] }
      },
      RAR: {
        name: "Carreira Protegida",
        desc: "Adversidades reduzidas em 50%. Carreira mais linear e s\xF3lida.",
        effects: { strengthBonus: 1.5, context: ["always"] }
      },
      LEN: {
        name: "Carreira Inquebr\xE1vel",
        desc: "Adversidades quase n\xE3o afetam. A carreira segue independente do que acontece.",
        effects: { strengthBonus: 2.5, staminaMult: 1.1, context: ["always"] }
      }
    }
  },
  // ────────────────────────────────────────────────────────────────
  // SEÇÃO 9: ESTABILIDADE
  // ────────────────────────────────────────────────────────────────
  INERCIAL: {
    id: "INERCIAL",
    name: "Inercial",
    section: "stability",
    mutex: ["BOLA_DE_NEVE"],
    tiers: {
      NEG: {
        name: "In\xE9rcia Negativa",
        desc: "Ap\xF3s 2 derrotas seguidas, -15% por mais 1 partida. Dif\xEDcil sair do buraco.",
        effects: { strengthBonus: -1.5, context: ["afterConsecutiveLosses"] }
      },
      COM: {
        name: "Inercial Positivo",
        desc: "Ap\xF3s 2 vit\xF3rias seguidas, +10% na pr\xF3xima.",
        effects: { strengthBonus: 1.5, context: ["afterWinStreak"] }
      },
      RAR: {
        name: "Momentum Positivo",
        desc: "Ap\xF3s 3 vit\xF3rias seguidas, +20%.",
        effects: { strengthBonus: 2.5, context: ["afterWinStreak"] }
      },
      LEN: {
        name: "Impar\xE1vel em Sequ\xEAncia",
        desc: "Ap\xF3s 4+ vit\xF3rias, +30%. Quase imposs\xEDvel de parar quando em s\xE9rie.",
        effects: { strengthBonus: 4, context: ["afterWinStreak"] }
      }
    }
  },
  RECUPERACAO_RAPIDA: {
    id: "RECUPERACAO_RAPIDA",
    name: "Recupera\xE7\xE3o R\xE1pida",
    section: "stability",
    tiers: {
      NEG: {
        name: "Lento para Recuperar",
        desc: "Ap\xF3s derrota, -10% na partida seguinte. Emocional dif\xEDcil de gerir.",
        effects: { strengthBonus: -1, context: ["afterLoss"] }
      },
      COM: {
        name: "Recupera R\xE1pido",
        desc: "Ap\xF3s derrota, efeito m\xEDnimo na partida seguinte.",
        effects: { strengthBonus: 0.5, context: ["afterLoss"] }
      },
      RAR: {
        name: "Recupera\xE7\xE3o R\xE1pida",
        desc: "Ap\xF3s derrota, +10% de motiva\xE7\xE3o na seguinte. Raiva positiva.",
        effects: { strengthBonus: 1.5, clutchMult: 1.1, context: ["afterLoss"] }
      },
      LEN: {
        name: "Zero Mem\xF3ria de Derrota",
        desc: "Derrotas n\xE3o afetam. +15% na partida seguinte. Mindset perfeito.",
        effects: { strengthBonus: 2, clutchMult: 1.15, context: ["afterLoss"] }
      }
    }
  },
  PICO_ADRENALINA: {
    id: "PICO_ADRENALINA",
    name: "Pico de Adrenalina",
    section: "stability",
    tiers: {
      NEG: {
        name: "Ansiedade Pr\xE9-Match",
        desc: "Primeiro set: -15%. Nervo antes da partida prejudica in\xEDcio.",
        effects: { strengthBonus: -1.5, context: ["firstSet"] }
      },
      COM: {
        name: "Pico de Adrenalina",
        desc: "Primeiro set: +12%. Come\xE7a quente e intenso.",
        effects: { strengthBonus: 1.5, context: ["firstSet"] }
      },
      RAR: {
        name: "Explos\xE3o Inicial",
        desc: "Primeiro set: +22%. Advers\xE1rios n\xE3o conseguem se ajustar no in\xEDcio.",
        effects: { strengthBonus: 2.5, opponentDebuff: 0.06, context: ["firstSet"] }
      },
      LEN: {
        name: "Furac\xE3o de Largada",
        desc: "Primeiro set: +35%. O jogo pode acabar antes de come\xE7ar de verdade.",
        effects: { strengthBonus: 4, opponentDebuff: 0.12, context: ["firstSet"] }
      }
    }
  },
  BASE_SOLIDA: {
    id: "BASE_SOLIDA",
    name: "Base S\xF3lida",
    section: "stability",
    mutex: ["VOLATILIDADE_CALC"],
    tiers: {
      NEG: {
        name: "Sem Base",
        desc: "Atributos oscilam muito. Um dia 90%, outro 60%. Imprevis\xEDvel.",
        effects: { strengthBonus: -1, context: ["always"] }
      },
      COM: {
        name: "S\xF3lido",
        desc: "+5% est\xE1vel em todos. Nunca vai muito abaixo do seu n\xEDvel.",
        effects: { strengthBonus: 1, errorMult: 0.92, context: ["always"] }
      },
      RAR: {
        name: "Base S\xF3lida",
        desc: "+10% est\xE1vel. Oscila\xE7\xF5es m\xEDnimas. Sempre entrega o mesmo n\xEDvel.",
        effects: { strengthBonus: 1.8, errorMult: 0.85, context: ["always"] }
      },
      LEN: {
        name: "Granito",
        desc: "+16% consistente. Imposs\xEDvel ter um dia ruim.",
        effects: { strengthBonus: 2.8, errorMult: 0.78, context: ["always"] }
      }
    }
  },
  BOLA_DE_NEVE: {
    id: "BOLA_DE_NEVE",
    name: "Bola de Neve",
    section: "stability",
    mutex: ["INERCIAL"],
    tiers: {
      NEG: {
        name: "Desmoronamento",
        desc: "Quando come\xE7a a errar, os erros se acumulam. -20% ap\xF3s 2 erros seguidos.",
        effects: { errorMult: 1.3, strengthBonus: -1.5, context: ["afterErrors"] }
      },
      COM: {
        name: "Bola de Neve",
        desc: "Ap\xF3s winner ou break, +10% no ponto seguinte.",
        effects: { strengthBonus: 1.2, context: ["afterWinner"] }
      },
      RAR: {
        name: "Bola de Neve Crescente",
        desc: "Ap\xF3s sequ\xEAncia de winners ou breaks, +20%. Efeito cumulativo.",
        effects: { strengthBonus: 2.5, context: ["afterWinStreak"] }
      },
      LEN: {
        name: "Avalanche Mental",
        desc: "Em sequ\xEAncia, +30%. O efeito bola de neve nunca para.",
        effects: { strengthBonus: 4, opponentDebuff: 0.08, context: ["afterWinStreak"] }
      }
    }
  },
  MAQUINA: {
    id: "MAQUINA",
    name: "M\xE1quina",
    section: "stability",
    mutex: ["SANGUE_QUENTE"],
    tiers: {
      NEG: {
        name: "Rob\xF3tico",
        desc: "Falta de emo\xE7\xE3o: advers\xE1rios n\xE3o se intimida. Sem vantagem psicol\xF3gica.",
        effects: { opponentDebuff: -0.03, context: ["always"] }
      },
      COM: {
        name: "M\xE1quina",
        desc: "Emo\xE7\xF5es n\xE3o afetam performance. Sempre no mesmo n\xEDvel.",
        effects: { errorMult: 0.9, staminaMult: 1.05, context: ["always"] }
      },
      RAR: {
        name: "Androide",
        desc: "Zero vari\xE2ncia emocional. +12% consist\xEAncia total.",
        effects: { strengthBonus: 1.5, errorMult: 0.82, staminaMult: 1.12, context: ["always"] }
      },
      LEN: {
        name: "Terminator",
        desc: "+20% consist\xEAncia. Absolutamente inabal\xE1vel. Cada ponto executado perfeitamente.",
        effects: { strengthBonus: 2.5, errorMult: 0.75, staminaMult: 1.2, context: ["always"] }
      }
    }
  },
  INQUEBRAVEL: {
    id: "INQUEBRAVEL",
    name: "Inquebr\xE1vel",
    section: "stability",
    tiers: {
      NEG: {
        name: "Vulner\xE1vel",
        desc: "-10% em qualquer ponto cr\xEDtico. Cede sob a menor press\xE3o.",
        effects: { clutchMult: 0.9, context: ["pressure"] }
      },
      COM: {
        name: "Resistente",
        desc: "+10% resist\xEAncia a press\xE3o. Pontos cr\xEDticos n\xE3o o abalam.",
        effects: { clutchMult: 1.1, errorMult: 0.9, context: ["pressure"] }
      },
      RAR: {
        name: "Inquebr\xE1vel",
        desc: "+20% sob press\xE3o. Parece crescer quanto mais dif\xEDcil fica.",
        effects: { clutchMult: 1.2, errorMult: 0.82, context: ["pressure"] }
      },
      LEN: {
        name: "Muralha de A\xE7o",
        desc: "+30% sob qualquer press\xE3o. Literalmente n\xE3o se abala.",
        effects: { clutchMult: 1.3, errorMult: 0.75, context: ["pressure"] }
      }
    }
  },
  ESPECIALISTA_SERIE: {
    id: "ESPECIALISTA_SERIE",
    name: "Especialista em S\xE9ries",
    section: "stability",
    tiers: {
      NEG: {
        name: "Inconsistente na S\xE9rie",
        desc: "-10% em qualquer segundo jogo de s\xE9rie curta contra o mesmo advers\xE1rio.",
        effects: { strengthBonus: -1, context: ["rematch"] }
      },
      COM: {
        name: "Aprende R\xE1pido",
        desc: "+10% no segundo encontro com o mesmo advers\xE1rio na mesma temporada.",
        effects: { strengthBonus: 1.5, context: ["rematch"] }
      },
      RAR: {
        name: "Especialista em S\xE9ries",
        desc: "+20% no segundo encontro. Nunca cai para o mesmo advers\xE1rio duas vezes seguidas.",
        effects: { strengthBonus: 2.5, context: ["rematch"] }
      },
      LEN: {
        name: "Maestro da S\xE9rie",
        desc: "+30% no segundo encontro. Advers\xE1rios odeiam enfrent\xE1-lo pela segunda vez.",
        effects: { strengthBonus: 4, opponentDebuff: 0.08, context: ["rematch"] }
      }
    }
  },
  VOLATILIDADE_CALC: {
    id: "VOLATILIDADE_CALC",
    name: "Volatilidade Calculada",
    section: "stability",
    mutex: ["BASE_SOLIDA"],
    tiers: {
      NEG: {
        name: "Vol\xE1til Demais",
        desc: "Oscila\xE7\xF5es imprevis\xEDveis. Um dia destr\xF3i tops, outro perde para quem n\xE3o devia.",
        effects: { strengthBonus: -1, context: ["always"] }
      },
      COM: {
        name: "Calculado",
        desc: "Oscila\xE7\xF5es controladas. Alta variance = mais upsets, mais grandes vit\xF3rias.",
        effects: { strengthBonus: 0.5, context: ["always"] }
      },
      RAR: {
        name: "Volatilidade Calculada",
        desc: "Alta variance usada estrategicamente. +15% chance de upset, +15% de grande vit\xF3ria.",
        effects: { strengthBonus: 1.5, context: ["always"] }
      },
      LEN: {
        name: "Imprevis\xEDvel Total",
        desc: "Ningu\xE9m sabe o que vai acontecer. Variance m\xE1xima, mas controlada.",
        effects: { strengthBonus: 2.5, context: ["always"] }
      }
    }
  },
  // ────────────────────────────────────────────────────────────────
  // SEÇÃO 10: FÍSICO
  // ────────────────────────────────────────────────────────────────
  IRON_LEGS: {
    id: "IRON_LEGS",
    name: "Iron Legs",
    section: "physical",
    tiers: {
      NEG: {
        name: "Pernas de Algod\xE3o",
        desc: "Stamina cai 25% mais r\xE1pido em rallies longos. Pernas cansam primeiro.",
        effects: { staminaMult: 0.75, context: ["longRally"] }
      },
      COM: {
        name: "Pernas S\xF3lidas",
        desc: "Stamina decai 15% mais lento. Cobertura de quadra mantida por mais tempo.",
        effects: { staminaMult: 1.15, context: ["always"] }
      },
      RAR: {
        name: "Iron Legs",
        desc: "Stamina decai 25% mais lento. Parece incans\xE1vel em longas batalhas.",
        effects: { staminaMult: 1.25, strengthBonus: 1, context: ["always"] }
      },
      LEN: {
        name: "M\xE1quina Humana",
        desc: "Stamina quase n\xE3o cai. 3h de partida, mesmo n\xEDvel do in\xEDcio.",
        effects: { staminaMult: 1.4, strengthBonus: 2, context: ["always"] }
      }
    }
  },
  RECUPERACAO_FISICA: {
    id: "RECUPERACAO_FISICA",
    name: "Recupera\xE7\xE3o F\xEDsica",
    section: "physical",
    tiers: {
      NEG: {
        name: "Recupera\xE7\xE3o Lenta",
        desc: "Entre sets e partidas, recupera 20% mais lento. Ac\xFAmulo de fadiga.",
        effects: { staminaMult: 0.8, context: ["betweenSets"] }
      },
      COM: {
        name: "Recupera Bem",
        desc: "Entre sets, recupera 20% mais r\xE1pido. Ritmo f\xEDsico superior.",
        effects: { staminaMult: 1.2, context: ["betweenSets"] }
      },
      RAR: {
        name: "Recupera\xE7\xE3o F\xEDsica",
        desc: "Entre sets, recupera 35% mais r\xE1pido. Cada intervalo \xE9 uma recarga.",
        effects: { staminaMult: 1.35, strengthBonus: 0.5, context: ["betweenSets"] }
      },
      LEN: {
        name: "Regenerador",
        desc: "Recupera quase totalmente entre sets. Parece sempre fresco.",
        effects: { staminaMult: 1.5, strengthBonus: 1.5, context: ["betweenSets"] }
      }
    }
  },
  BLINDAGEM_LESAO: {
    id: "BLINDAGEM_LESAO",
    name: "Blindagem de Les\xE3o",
    section: "physical",
    tiers: {
      NEG: {
        name: "Fr\xE1gil",
        desc: "Risco de les\xE3o 40% maior. Qualquer esfor\xE7o excessivo tem consequ\xEAncia.",
        effects: { strengthBonus: -1, context: ["always"] }
      },
      COM: {
        name: "Saud\xE1vel",
        desc: "Risco de les\xE3o 30% menor. Corpo preparado para o circuito.",
        effects: { strengthBonus: 0.5, context: ["always"] }
      },
      RAR: {
        name: "Blindagem",
        desc: "Risco de les\xE3o 50% menor. Temporada completa quase garantida.",
        effects: { strengthBonus: 1.2, staminaMult: 1.1, context: ["always"] }
      },
      LEN: {
        name: "Corpo de A\xE7o",
        desc: "Les\xF5es rar\xEDssimas. Carreira longa e saud\xE1vel. Corpo que n\xE3o falha.",
        effects: { strengthBonus: 2, staminaMult: 1.2, context: ["always"] }
      }
    }
  },
  EXPLOSAO_INICIAL: {
    id: "EXPLOSAO_INICIAL",
    name: "Explos\xE3o Inicial",
    section: "physical",
    tiers: {
      NEG: {
        name: "Come\xE7o Lento",
        desc: "Primeiro game de cada set: -15%. Demora para entrar no ritmo.",
        effects: { strengthBonus: -1.5, context: ["firstGame"] }
      },
      COM: {
        name: "Largada Forte",
        desc: "Primeiro game de cada set: +12%. Entra explosivo.",
        effects: { strengthBonus: 1.5, context: ["firstGame"] }
      },
      RAR: {
        name: "Explos\xE3o Inicial",
        desc: "Primeiro game de cada set: +22%. Advers\xE1rios n\xE3o reagem a tempo.",
        effects: { strengthBonus: 2.5, opponentDebuff: 0.06, context: ["firstGame"] }
      },
      LEN: {
        name: "M\xEDssil na Largada",
        desc: "Primeiro game: +35%. A cada set, mesma explos\xE3o devastadora.",
        effects: { strengthBonus: 4, opponentDebuff: 0.12, context: ["firstGame"] }
      }
    }
  },
  STARTER_NATO: {
    id: "STARTER_NATO",
    name: "Starter Nato",
    section: "clutch",
    tiers: {
      NEG: {
        name: "Entra Frio",
        desc: "Primeiros games e in\xEDcio de set: demora a entrar no ritmo.",
        effects: { strengthBonus: -1.4, errorMult: 1.12, context: ["firstGame", "firstSet"] }
      },
      COM: {
        name: "Starter Nato",
        desc: "Chega ligado desde os primeiros games e tenta morder cedo.",
        effects: { strengthBonus: 1.2, clutchMult: 1.08, context: ["firstGame", "firstSet"] }
      },
      RAR: {
        name: "Starter Nato",
        desc: "Abre partidas ditando o ritmo. O advers\xE1rio demora a respirar.",
        effects: { strengthBonus: 2.1, clutchMult: 1.14, opponentDebuff: 0.04, context: ["firstGame", "firstSet"] }
      },
      LEN: {
        name: "Primeiro Soco",
        desc: "Entrada devastadora. O rival quase sempre come\xE7a atr\xE1s.",
        effects: { strengthBonus: 3.2, clutchMult: 1.2, opponentDebuff: 0.08, context: ["firstGame", "firstSet"] }
      }
    }
  },
  GIGANTE_CACADOR: {
    id: "GIGANTE_CACADOR",
    name: "Gigante Cacador",
    section: "clutch",
    tiers: {
      NEG: {
        name: "Apequena Contra Gigantes",
        desc: "Contra favoritos e top seeds, tende a jogar encolhido.",
        effects: { strengthBonus: -1.6, clutchMult: 0.88, context: ["vsTopSeed", "underdog"] }
      },
      COM: {
        name: "Gigante Cacador",
        desc: "Gosta do papel de zebra e cresce contra jogadores maiores.",
        effects: { strengthBonus: 1.4, clutchMult: 1.1, context: ["vsTopSeed", "underdog"] }
      },
      RAR: {
        name: "Gigante Cacador",
        desc: "Joga solto contra a elite e transforma medo em energia.",
        effects: { strengthBonus: 2.3, clutchMult: 1.18, opponentDebuff: 0.05, context: ["vsTopSeed", "underdog"] }
      },
      LEN: {
        name: "Matador de Favoritos",
        desc: "Quanto maior o palco e o favorito, mais esse jogador acredita.",
        effects: { strengthBonus: 3.4, clutchMult: 1.24, opponentDebuff: 0.09, context: ["vsTopSeed", "underdog"] }
      }
    }
  },
  FAVORITO_ANSIOSO: {
    id: "FAVORITO_ANSIOSO",
    name: "Favorito Ansioso",
    section: "clutch",
    tiers: {
      NEG: {
        name: "Favorito Ansioso",
        desc: "Quando deveria controlar o jogo, aperta demais e erra o timing.",
        effects: { strengthBonus: -1.4, errorMult: 1.16, context: ["heavyFavorite", "importantMatch"] }
      },
      COM: {
        name: "Controla a Pressao",
        desc: "Aceita o peso do favoritismo sem perder a clareza.",
        effects: { strengthBonus: 1.1, clutchMult: 1.08, context: ["heavyFavorite", "importantMatch"] }
      },
      RAR: {
        name: "Controla a Pressao",
        desc: "Quando \xE9 favorito, joga com frieza quase administrativa.",
        effects: { strengthBonus: 2, clutchMult: 1.14, context: ["heavyFavorite", "importantMatch"] }
      },
      LEN: {
        name: "Ditador de Chave",
        desc: "Favoritismo n\xE3o pesa; intimida. O jogo passa a girar ao redor dele.",
        effects: { strengthBonus: 3.1, clutchMult: 1.18, opponentDebuff: 0.07, context: ["heavyFavorite", "importantMatch"] }
      }
    }
  },
  PREDADOR_SEGUNDO_SAQUE: {
    id: "PREDADOR_SEGUNDO_SAQUE",
    name: "Predador do 2o Saque",
    section: "strokes",
    tiers: {
      NEG: {
        name: "Passivo no 2o Saque",
        desc: "Mesmo quando o segundo saque pede agress\xE3o, hesita e deixa o ponto escapar.",
        effects: { strengthBonus: -1.2, context: ["secondServe"] }
      },
      COM: {
        name: "Predador do 2o Saque",
        desc: "L\xEA bem segundos saques atac\xE1veis e assume a quadra cedo.",
        effects: { strengthBonus: 1.3, clutchMult: 1.06, context: ["secondServe"] }
      },
      RAR: {
        name: "Predador do 2o Saque",
        desc: "Faz o sacador temer o segundo servi\xE7o. Entra para machucar.",
        effects: { strengthBonus: 2.2, opponentDebuff: 0.05, context: ["secondServe"] }
      },
      LEN: {
        name: "Cacador de Servico",
        desc: "Segundo saque contra ele parece convite para sofrer.",
        effects: { strengthBonus: 3.2, clutchMult: 1.12, opponentDebuff: 0.08, context: ["secondServe"] }
      }
    }
  },
  FINAIS_FRAGEIS: {
    id: "FINAIS_FRAGEIS",
    name: "Finais Frageis",
    section: "clutch",
    tiers: {
      NEG: {
        name: "Finais Frageis",
        desc: "Grandes rodadas trazem tens\xE3o ruim e punem sua execu\xE7\xE3o.",
        effects: { strengthBonus: -1.5, clutchMult: 0.86, context: ["quarterFinal+", "importantMatch"] }
      },
      COM: {
        name: "Aguenta o Palco",
        desc: "N\xE3o se esconde nas fases grandes. Sustenta o n\xEDvel.",
        effects: { strengthBonus: 1.1, clutchMult: 1.08, context: ["quarterFinal+", "importantMatch"] }
      },
      RAR: {
        name: "Aguenta o Palco",
        desc: "Joga quartas, semis e finais com maturidade incomum.",
        effects: { strengthBonus: 2, clutchMult: 1.14, context: ["quarterFinal+", "importantMatch"] }
      },
      LEN: {
        name: "Palco e Casa",
        desc: "O brilho do torneio grande parece aumentar seu repert\xF3rio.",
        effects: { strengthBonus: 3, clutchMult: 1.2, opponentDebuff: 0.06, context: ["quarterFinal+", "importantMatch"] }
      }
    }
  },
  MARATONISTA: {
    id: "MARATONISTA",
    name: "Maratonista",
    section: "physical",
    tiers: {
      NEG: {
        name: "Perde Gasolina",
        desc: "Rallies longos e jogos extensos drenam mais do que deveriam.",
        effects: { strengthBonus: -1.2, staminaMult: 0.88, context: ["longRally", "longMatch"] }
      },
      COM: {
        name: "Maratonista",
        desc: "Quanto mais a partida alonga, mais confort\xE1vel se sente.",
        effects: { strengthBonus: 1.2, staminaMult: 1.08, context: ["longRally", "longMatch"] }
      },
      RAR: {
        name: "Maratonista",
        desc: "Adora partidas profundas. O desgaste tende a favorecer seu lado.",
        effects: { strengthBonus: 2.1, staminaMult: 1.14, context: ["longRally", "longMatch"] }
      },
      LEN: {
        name: "Pulmao de Aco",
        desc: "Nos rallies longos, joga como se o rel\xF3gio estivesse a seu favor.",
        effects: { strengthBonus: 3, staminaMult: 1.2, opponentDebuff: 0.05, context: ["longRally", "longMatch"] }
      }
    }
  }
};
var TRAIT_POOLS = {
  clutch: ["TIEBREAK_KILLER", "MP_SAVER", "QUINTO_SET", "DECISIVO", "INSTINTO_SLAM", "VIRADISTA", "FENIX", "LEAO_ENCURRALADO", "ATRITO_RALLY", "GUERREIRO", "AVALANCHE", "STARTER_NATO", "GIGANTE_CACADOR", "FAVORITO_ANSIOSO", "FINAIS_FRAGEIS"],
  serve: ["IMPLACAVEL_SERV", "REI_QUADRA", "SANGUE_QUENTE", "DESTRUIDOR_MORAL", "CANHAO_SAQUE", "PRECISAO_CIRURGICA", "SEGUNDO_SAQUE_ARMA", "KICK_MASTER", "DF_ZERO"],
  strokes: ["FH_ASSASSINO", "BH_FERRO", "RETRIEVER_ETERNO", "CONTRA_ATAQUE", "BOLA_PESADA", "PREDADOR_SEGUNDO_SAQUE"],
  format: ["ESPECIALISTA_BO5", "CAMPEAO_TB", "RELOGIO_BIOLOGICO", "TERCEIRO_SET"],
  surface: ["REI_SAIBRO", "MAGO_GRAMA", "HARDCOURT_NATIVO", "INDOOR_SPEC", "ALL_SURFACE"],
  tournament: ["CACADOR_GS", "ESPECIALISTA_KO", "REI_DRAW", "CACADOR_SEEDS"],
  legacy: ["RESSURGIMENTO", "MEMORIA_FOTOGRAFICA", "PSICOLOGICO", "ESPECIALISTA_REVANCHE", "RIVAL_ETERNO"],
  development: ["SUPERPRODIGIO", "DIAMANTE_BRUTO", "VETERANO_ETERNO", "LATE_BLOOMER", "BLINDAGEM_CARREIRA"],
  stability: ["INERCIAL", "RECUPERACAO_RAPIDA", "PICO_ADRENALINA", "BASE_SOLIDA", "BOLA_DE_NEVE", "MAQUINA", "INQUEBRAVEL", "ESPECIALISTA_SERIE", "VOLATILIDADE_CALC"],
  physical: ["IRON_LEGS", "RECUPERACAO_FISICA", "BLINDAGEM_LESAO", "EXPLOSAO_INICIAL", "MARATONISTA"]
};
var ALL_TRAIT_IDS = Object.values(TRAIT_POOLS).flat();
var TIER_PRIORITY = { NEG: 0, COM: 1, RAR: 2, LEN: 3 };
var DNA_SLOT_TARGETS = {
  FRACO: { positive: 1, negative: 1, maxTotal: 2 },
  NORMAL: { positive: 2, negative: 1, maxTotal: 3 },
  BOM: { positive: 2, negative: 1, maxTotal: 3 },
  ALTO: { positive: 3, negative: 1, maxTotal: 4 },
  EXCEPCIONAL: { positive: 3, negative: 1, maxTotal: 4 },
  GERACIONAL: { positive: 4, negative: 1, maxTotal: 5 }
};
var UNIVERSAL_NEGATIVE_POOL = ["DECISIVO", "MP_SAVER", "TIEBREAK_KILLER", "FINAIS_FRAGEIS", "FAVORITO_ANSIOSO", "EXPLOSAO_INICIAL", "MARATONISTA"];
var TRAIT_FAMILY_BY_SECTION = {
  clutch: "DNA",
  serve: "DNA",
  strokes: "TENDENCIA",
  format: "LEGADO",
  surface: "LEGADO",
  tournament: "LEGADO",
  legacy: "LEGADO",
  development: "DNA",
  stability: "TENDENCIA",
  physical: "CICATRIZ"
};
function pickFromWeighted(items, randomFn = Math.random) {
  const total = items.reduce((s, i) => s + (i.weight ?? 1), 0);
  let r = randomFn() * total;
  for (const item of items) {
    r -= item.weight ?? 1;
    if (r <= 0)
      return item;
  }
  return items[items.length - 1];
}
function areMutex(idA, idB) {
  return (MUTEX_MAP[idA] ?? []).includes(idB);
}
function hasConflict(existing, candidate) {
  return existing.some((e) => areMutex(e, candidate));
}
function getAttr(player, ...keys) {
  const attrs = player?.attrs ?? {};
  for (const key of keys) {
    const value = attrs?.[key];
    if (typeof value === "number" && Number.isFinite(value))
      return value;
  }
  return null;
}
function getPlayerAgeEstimate(player) {
  return player?.age ?? player?._age ?? null;
}
function inferTraitFamily(slot, def) {
  if (slot?.family)
    return slot.family;
  if (slot?.origin === "legacy" || slot?.unlockedVia === "milestone" || def?.section === "legacy" || def?.section === "surface" || def?.section === "tournament" || def?.section === "format") {
    return "LEGADO";
  }
  if (slot?.origin === "scar" || slot?.tier === "NEG" || slot?.resolvedViaSombra || def?.section === "physical") {
    return "CICATRIZ";
  }
  if (slot?.origin === "tendency" || def?.section === "strokes" || def?.section === "stability") {
    return "TENDENCIA";
  }
  return TRAIT_FAMILY_BY_SECTION[def?.section] ?? "DNA";
}
function normalizeSlot(slot, def = TRAIT_CATALOG?.[slot?.traitId]) {
  return {
    ...slot,
    origin: slot?.origin ?? (slot?.unlockedVia === "milestone" ? "legacy" : slot?.tier === "NEG" ? "scar" : "dna"),
    family: inferTraitFamily(slot, def)
  };
}
function normalizeSlots(slots = []) {
  return slots.filter((slot) => slot?.traitId && TRAIT_CATALOG[slot.traitId]).map((slot) => normalizeSlot(slot)).sort((a, b) => {
    const famA = ["DNA", "TENDENCIA", "CICATRIZ", "LEGADO"].indexOf(a.family);
    const famB = ["DNA", "TENDENCIA", "CICATRIZ", "LEGADO"].indexOf(b.family);
    if (famA !== famB)
      return famA - famB;
    return (TIER_PRIORITY[b.tier] ?? 0) - (TIER_PRIORITY[a.tier] ?? 0);
  });
}
function buildWeightedCandidates(ids, existingIds, tier, origin, weightFn) {
  return ids.filter((id) => !existingIds.includes(id) && !hasConflict(existingIds, id) && TRAIT_CATALOG[id]?.tiers?.[tier]).map((id) => ({
    id,
    weight: Math.max(0.1, weightFn?.(id) ?? 1),
    tier,
    origin,
    family: inferTraitFamily({ tier, origin }, TRAIT_CATALOG[id])
  }));
}
function inferNegativeTraitCandidates(player, existingIds) {
  const serve = getAttr(player, "saque", "srv1Vel");
  const mental = getAttr(player, "mentalidade", "regularidade", "leitura");
  const resistencia = getAttr(player, "resistencia", "explosividade");
  const age = getPlayerAgeEstimate(player);
  const styleId = String(player?.styleId ?? "").toUpperCase();
  return buildWeightedCandidates([...UNIVERSAL_NEGATIVE_POOL, ...TRAIT_POOLS.physical, ...TRAIT_POOLS.clutch], existingIds, "NEG", "scar", (id) => {
    let weight = 1;
    if (mental !== null && mental < 68 && ["DECISIVO", "MP_SAVER", "TIEBREAK_KILLER", "FINAIS_FRAGEIS", "FAVORITO_ANSIOSO"].includes(id))
      weight += (70 - mental) / 8;
    if (resistencia !== null && resistencia < 68 && ["MARATONISTA", "IRON_LEGS", "RECUPERACAO_FISICA"].includes(id))
      weight += (70 - resistencia) / 10;
    if (serve !== null && serve < 66 && ["DF_ZERO", "PRECISAO_CIRURGICA", "SEGUNDO_SAQUE_ARMA"].includes(id))
      weight += 1.2;
    if (styleId.includes("BIG") && ["DECISIVO", "FAVORITO_ANSIOSO"].includes(id))
      weight += 0.6;
    if (age !== null && age >= 30 && ["RELOGIO_BIOLOGICO", "MARATONISTA"].includes(id))
      weight += 0.9;
    return weight;
  });
}
function pickWeightedSlot(candidates, randomFn = Math.random) {
  if (!candidates.length)
    return null;
  const picked = pickFromWeighted(candidates, randomFn);
  return picked ? { tier: picked.tier, traitId: picked.id, origin: picked.origin, family: picked.family } : null;
}
function collectTraitContexts(player, env = {}) {
  const contexts = /* @__PURE__ */ new Set(["always"]);
  const surface = env.surface ?? env.courtSurface ?? env.courtMeta?.surface;
  if (surface)
    contexts.add(`surface:${String(surface).toUpperCase()}`);
  if (env.bestOf === 5)
    contexts.add("bestOf5");
  if (env.inTiebreak)
    contexts.add("tiebreak");
  if (env.totalSets === 4 && env.bestOf === 5)
    contexts.add("fifthSet");
  if (env.totalSets === 2 && env.bestOf === 3)
    contexts.add("thirdSet");
  if (env.totalSets === 0)
    contexts.add("firstSet");
  if (env.playerSets === 0 && env.oppSets === 2)
    contexts.add("down2Sets");
  if ((env.playerGames ?? 0) - (env.oppGames ?? 0) >= 3)
    contexts.add("bigLead");
  if (env.rally >= 8)
    contexts.add("longRally");
  if (env.longMatch || env.rally >= 15)
    contexts.add("longMatch");
  if (env.firstGame || (env.playerGames ?? 0) === 0 && (env.oppGames ?? 0) === 0)
    contexts.add("firstGame");
  if (env.isSlam)
    contexts.add("grandSlam");
  if (env.isServing)
    contexts.add("serve");
  if (env.isSecondServe)
    contexts.add("secondServe");
  if (env.isBreakPoint)
    contexts.add("breakPoint");
  if (env.isMatchPoint || env.isDefendingMatchPoint)
    contexts.add("matchPoint");
  if (env.isSetPoint || env.isMatchPoint || env.isBreakPoint || env.isGamePoint)
    contexts.add("decisiveMoment");
  if (env.pressure || env.isBreakPoint || env.isDefendingBreakPoint || env.isSetPoint || env.isMatchPoint || env.isDefendingMatchPoint)
    contexts.add("pressure");
  if (env.roundLabel) {
    const r = env.roundLabel;
    if (["F", "SF", "QF"].includes(r))
      contexts.add("knockoutRound");
    if (["F", "SF", "QF"].includes(r))
      contexts.add("quarterFinal+");
    if (r === "F")
      contexts.add("importantMatch");
  }
  const age = env.age ?? getPlayerAgeEstimate(player);
  const peakAge = env.peakAge ?? player?.peakAge ?? player?._peakAge ?? null;
  if (age !== null) {
    if (age < 21)
      contexts.add("under21");
    if (age < 22)
      contexts.add("earlyCareer");
    if (age >= 21 && age < 27)
      contexts.add("midCareer");
    if (age >= 27 && age < 31)
      contexts.add("lateCareer");
    if (age >= 31)
      contexts.add("over30");
    if (age >= 33)
      contexts.add("decline");
  }
  if (peakAge !== null && age !== null && Math.abs(age - peakAge) <= 2)
    contexts.add("nearPeak");
  const rankPos = env.rankPos ?? player?.rankPosition ?? player?._rankPosition ?? null;
  const oppRank = env.oppRank ?? null;
  if (rankPos !== null) {
    if (rankPos <= 5)
      contexts.add("topSeed");
    if (rankPos >= 50)
      contexts.add("underdog");
  }
  if (rankPos !== null && oppRank !== null) {
    if (oppRank <= 5 && rankPos > 20)
      contexts.add("vsTopSeed");
    if (rankPos <= 5 && oppRank > 20)
      contexts.add("heavyFavorite");
  }
  if (Array.isArray(env.extraContexts)) {
    for (const ctx2 of env.extraContexts)
      contexts.add(ctx2);
  }
  return [...contexts];
}
function getTraitEffects(player, ctx2) {
  const result = {
    strengthBonus: 0,
    clutchMult: 1,
    errorMult: 1,
    staminaMult: 1,
    serveMult: 1,
    opponentDebuff: 0,
    formFloor: null
  };
  if (!player.dna?.slots?.length)
    return result;
  const contextList = Array.isArray(ctx2?.contexts) ? ctx2.contexts : ctx2?.type ? [ctx2.type] : collectTraitContexts(player, ctx2 ?? {});
  const ctxSet = new Set(contextList.length ? contextList : ["always"]);
  for (const slot of player.dna.slots) {
    const traitDef = TRAIT_CATALOG[slot.traitId];
    if (!traitDef)
      continue;
    const tierData = traitDef.tiers[slot.tier];
    if (!tierData?.effects)
      continue;
    const fx = tierData.effects;
    const fxCtx = fx.context ?? ["always"];
    if (fxCtx.includes("never"))
      continue;
    const applies = fxCtx.some((c) => c === "always" || ctxSet.has(c));
    if (!applies)
      continue;
    if (fx.strengthBonus)
      result.strengthBonus += fx.strengthBonus;
    if (fx.clutchMult)
      result.clutchMult *= fx.clutchMult;
    if (fx.errorMult)
      result.errorMult *= fx.errorMult;
    if (fx.staminaMult)
      result.staminaMult *= fx.staminaMult;
    if (fx.serveMult)
      result.serveMult *= fx.serveMult;
    if (fx.opponentDebuff)
      result.opponentDebuff += fx.opponentDebuff;
    if (fx.formFloor) {
      const levels = ["BOA_FORMA", "GRANDE_FORMA", "IMPARAVEL"];
      const existing = result.formFloor ? levels.indexOf(result.formFloor) : -1;
      const candidate = levels.indexOf(fx.formFloor);
      if (candidate > existing)
        result.formFloor = fx.formFloor;
    }
  }
  return result;
}
function sanitizeTraitSlots(player) {
  if (!player?.dna?.slots)
    return player;
  const config = DNA_SLOT_TARGETS[player.dna.tier] ?? DNA_SLOT_TARGETS.NORMAL;
  let slots = normalizeSlots(player.dna.slots);
  const negatives = slots.filter((s) => s.tier === "NEG");
  const positives = slots.filter((s) => s.tier !== "NEG");
  if (!negatives.length) {
    const neg = pickWeightedSlot(inferNegativeTraitCandidates(player, slots.map((s) => s.traitId)));
    if (neg) {
      slots.push(normalizeSlot(neg));
      const traitDef = TRAIT_CATALOG[neg.traitId];
      if (traitDef?.sombra) {
        player.dna.sombras = [
          ...player.dna.sombras ?? [],
          {
            traitId: neg.traitId,
            progress: 0,
            target: traitDef.sombra.target,
            metric: traitDef.sombra.metric,
            challenge: traitDef.sombra.challenge,
            resolved: false
          }
        ];
      }
    }
  }
  slots = normalizeSlots(slots);
  const keepNeg = slots.filter((s) => s.tier === "NEG").slice(0, config.negative);
  const keepPos = slots.filter((s) => s.tier !== "NEG").slice(0, config.positive);
  player.dna.slots = normalizeSlots([...keepPos, ...keepNeg]).slice(0, config.maxTotal);
  return player;
}

// src/MatchHeat.js
var BASELINE = 18;
var DECAY_RATE = 0.012;
var AMPLIFIER = 2.35;
function calcExcitement(gs, winnerIdx, isWinner, isAce, ctx2) {
  let e = 0;
  const rally = gs.rally ?? 0;
  if (rally >= 30)
    e += 42;
  else if (rally >= 25)
    e += 35;
  else if (rally >= 20)
    e += 28;
  else if (rally >= 15)
    e += 22;
  else if (rally >= 12)
    e += 17;
  else if (rally >= 9)
    e += 12;
  else if (rally >= 6)
    e += 8;
  else if (rally >= 3)
    e += 3;
  else
    e -= 4;
  if (isAce)
    e += 8;
  if (isWinner && !isAce)
    e += 7;
  if (ctx2.isDoubleFault)
    e -= 8;
  if (ctx2.wasMatchPointSaved)
    e += 34;
  if (ctx2.wasBreakPointSaved)
    e += 16;
  if (ctx2.wasDeuce)
    e += 4;
  if (gs.inTiebreak)
    e += 8;
  return Math.max(-10, Math.min(48, e));
}
function exciteMult(e) {
  if (e >= 36)
    return 0.88;
  if (e >= 26)
    return 0.74;
  if (e >= 18)
    return 0.6;
  if (e >= 10)
    return 0.46;
  if (e >= 4)
    return 0.32;
  if (e >= 0)
    return 0.2;
  return 0.16;
}
function initHeat(gs) {
  gs.heat = {
    score: BASELINE,
    // 0–100, float interno
    peak: BASELINE,
    // maior valor atingido na partida
    _momentum: 0
    // impulso acumulado (decai entre pontos)
  };
}
function updateHeat(gs, winnerIdx, isWinner, isAce, ctx2) {
  if (!gs.heat)
    initHeat(gs);
  const h = gs.heat;
  const e = calcExcitement(gs, winnerIdx, isWinner, isAce, ctx2);
  const mult = exciteMult(e);
  h._momentum = h._momentum * 0.68 + e * 0.32;
  const target = Math.min(100, BASELINE + h._momentum * AMPLIFIER);
  const delta = (target - h.score) * mult;
  h.score += delta;
  h.score += (BASELINE - h.score) * DECAY_RATE;
  h.score = Math.max(0, Math.min(100, h.score));
  h.peak = Math.max(h.peak, h.score);
}
function readHeat(gs) {
  const score = gs?.heat?.score ?? BASELINE;
  const peak = gs?.heat?.peak ?? BASELINE;
  const n = Math.round(score);
  let tier;
  if (n >= 92)
    tier = { label: "\xC9PICO", color: "#FFD700", glow: "#FFD70088", pulse: true };
  else if (n >= 82)
    tier = { label: "CL\xC1SSICO", color: "#FF8C00", glow: "#FF8C0055", pulse: true };
  else if (n >= 72)
    tier = { label: "EM CHAMAS", color: "#FF5533", glow: "#FF553333", pulse: false };
  else if (n >= 58)
    tier = { label: "QUENTE", color: "#FF9944", glow: null, pulse: false };
  else if (n >= 40)
    tier = { label: "AQUECIDO", color: "#FFD700", glow: null, pulse: false };
  else if (n >= 24)
    tier = { label: "NEUTRO", color: "#7ab4ff", glow: null, pulse: false };
  else
    tier = { label: "MORNO", color: "#4A7A9B", glow: null, pulse: false };
  return { score: n, peak: Math.round(peak), tier };
}

// src/IndividualRating.jsx
var import_react = __toESM(require_react(), 1);
var clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function norm(value, avg, sigma) {
  const z = (value - avg) / sigma;
  const scale = z >= 0 ? 2.35 : 1.2;
  return clamp(6 + z * scale, 1.8, 10);
}
var TIERS = [
  { min: 9, label: "LEND\xC1RIO", color: "#FFD700", glow: "rgba(255,215,0,0.40)" },
  { min: 7.5, label: "EXCEPCIONAL", color: "#B0FF60", glow: "rgba(176,255,96,0.32)" },
  { min: 6.5, label: "S\xD3LIDO", color: "#60D0FF", glow: "rgba(96,208,255,0.26)" },
  { min: 5, label: "REGULAR", color: "#FFB060", glow: "rgba(255,176,96,0.22)" },
  { min: 3.5, label: "ABAIXO", color: "#FF8040", glow: "rgba(255,128,64,0.20)" },
  { min: 0, label: "FRACO", color: "#FF5050", glow: "rgba(255,80,80,0.20)" }
];
function getTier(score) {
  return TIERS.find((t) => score >= t.min) ?? TIERS[TIERS.length - 1];
}
function computeRating(stats, shotCount) {
  const s = stats ?? {};
  const shots = Math.max(
    s.qualityCount ?? 0,
    shotCount ?? 0,
    (s.winners ?? 0) + (s.unforcedErrors ?? 0) + (s.forcedErrors ?? 0) + 1
  );
  const qCount = Math.max(s.qualityCount ?? 0, 1);
  const avgQ = (s.qualitySum ?? 0) / qCount;
  const qualScore = (s.qualityCount ?? 0) > 5 ? norm(avgQ, 0.53, 0.1) : 7;
  const winnerRate = (s.winners ?? 0) / shots;
  const winnerScore = shots > 8 ? norm(winnerRate, 0.07, 0.05) : 7;
  const ueRate = (s.unforcedErrors ?? 0) / shots;
  const ueScore = shots > 8 ? clamp(norm(-ueRate, -0.07, 0.05), 2.5, 9.5) : 7;
  const totalErrors = (s.forcedErrors ?? 0) + (s.unforcedErrors ?? 0);
  const pressureRatio = totalErrors > 3 ? (s.forcedErrors ?? 0) / totalErrors : 0.55;
  const pressureScore = norm(pressureRatio, 0.45, 0.2);
  const qualityScore = qualScore * 0.5 + winnerScore * 0.15 + ueScore * 0.15 + pressureScore * 0.2;
  const srv1Tot = Math.max(s.serve1Total ?? 0, 1);
  const srv1Score = (s.serve1Total ?? 0) > 3 ? norm((s.serve1In ?? 0) / srv1Tot, 0.62, 0.09) : 7;
  const gSrv = Math.max(s.gamesServed ?? 0, 1);
  const dfRaw = (s.doubleFaults ?? 0) / gSrv;
  const dfScore = clamp(norm(-dfRaw, -0.35, 0.3), 1.5, 9);
  const aceRaw = (s.aces ?? 0) / gSrv;
  const aceScore = (s.gamesServed ?? 0) > 2 ? norm(aceRaw, 0.5, 0.4) : 7;
  const hasSpeed = (s.serve1AvgKmh ?? 0) > 50;
  const speedScore = hasSpeed ? norm(s.serve1AvgKmh, 185, 18) : 7;
  const serveScore = srv1Score * 0.4 + dfScore * 0.25 + aceScore * 0.2 + speedScore * 0.15;
  const atkPlayed = s.attackPointsPlayed ?? 0;
  const convScore = atkPlayed > 3 ? norm((s.attackPointsWon ?? 0) / atkPlayed, 0.65, 0.14) : 7;
  const defPlayed = s.defensePointsPlayed ?? 0;
  const stealScore = defPlayed > 3 ? norm((s.defensePointsWon ?? 0) / defPlayed, 0.25, 0.14) : 7;
  const tacticScore = convScore * 0.55 + stealScore * 0.45;
  const raw = clamp(
    qualityScore * 0.35 + serveScore * 0.3 + tacticScore * 0.35,
    0,
    10
  );
  const holdBonus = (() => {
    const g = s.gamesServed ?? 0;
    if (g < 3)
      return 0;
    const hp = (s.gamesHeld ?? 0) / g;
    return clamp((hp - 0.65) / 0.35 * 0.5, -0.5, 0.5);
  })();
  const score = clamp(raw + holdBonus, 0, 10);
  const srv1PctVal = (s.serve1Total ?? 0) > 3 ? (s.serve1In ?? 0) / srv1Tot : null;
  const convRateVal = atkPlayed > 3 ? (s.attackPointsWon ?? 0) / atkPlayed : null;
  const stlRateVal = defPlayed > 3 ? (s.defensePointsWon ?? 0) / defPlayed : null;
  return {
    score: Math.round(score * 10) / 10,
    components: {
      qualidade: { score: Math.round(qualityScore * 10) / 10, label: "QUALIDADE", weight: 0.35 },
      saque: { score: Math.round(serveScore * 10) / 10, label: "SAQUE", weight: 0.3 },
      tatica: { score: Math.round(tacticScore * 10) / 10, label: "T\xC1TICA", weight: 0.35 }
    },
    tier: getTier(score),
    detail: {
      avgQuality: Math.round(avgQ * 100) / 100,
      srv1Pct: srv1PctVal != null ? Math.round(srv1PctVal * 100) : "\u2014",
      convRate: convRateVal != null ? Math.round(convRateVal * 100) : "\u2014",
      stealRate: stlRateVal != null ? Math.round(stlRateVal * 100) : "\u2014",
      winnerRate: Math.round(winnerRate * 100),
      ueRate: Math.round(ueRate * 100),
      pressureRatio: Math.round(pressureRatio * 100)
    }
  };
}

// src/trace.js
var TRACE_ENABLED = true;
function createTrace() {
  return {
    points: [],
    // array completo — todos os pontos do jogo
    _current: null,
    _pointSeq: 0,
    _lastShot: null,
    _lastBouncedShot: null,
    // ── Acumuladores live para estatísticas globais ──
    _agg: {
      totalPoints: 0,
      winners: [0, 0],
      unforcedErrors: [0, 0],
      forcedErrors: [0, 0],
      aces: [0, 0],
      doubleFaults: [0, 0],
      netApproaches: [0, 0],
      netWon: [0, 0],
      breakPointsPlayed: 0,
      breakPointsConverted: 0,
      serveKmh1: [[], []],
      // [player0_1stServes, player1_1stServes]
      serveKmh2: [[], []],
      rallyLenBuckets: { "0": 0, "1": 0, "2-4": 0, "5-9": 0, "10+": 0 }
    }
  };
}
function traceStartPoint(gs) {
  if (!TRACE_ENABLED)
    return;
  if (!gs.trace)
    gs.trace = createTrace();
  const t = gs.trace;
  const p0 = gs.players[0];
  const p1 = gs.players[1];
  const SL = ["0", "15", "30", "40", "Ad"];
  const srv = gs.players[gs.server];
  const rcv = gs.players[1 - gs.server];
  const srvS = srv.score;
  const rcvS = rcv.score;
  const setsNeeded = gs.setsToWin ?? 2;
  const isBreakPoint = gs.inTiebreak ? false : rcvS >= 3 && (rcvS > srvS || rcvS === 4);
  const isGamePoint = !gs.inTiebreak && srvS >= 3 && (srvS > rcvS || srvS === 4) && !isBreakPoint;
  const serverCloseSet = srv.games >= 5 && srv.games > rcv.games;
  const rcvCloseSet = rcv.games >= 5 && rcv.games > srv.games;
  const isSetPoint = isGamePoint && serverCloseSet || isBreakPoint && rcvCloseSet;
  const isMatchPoint = isSetPoint && (isGamePoint && srv.sets === setsNeeded - 1 || isBreakPoint && rcv.sets === setsNeeded - 1);
  const isTiebreakMatchPoint = gs.inTiebreak && (gs.tbScore[0] >= 6 || gs.tbScore[1] >= 6) && Math.abs(gs.tbScore[0] - gs.tbScore[1]) >= 1 && (srv.sets === setsNeeded - 1 || rcv.sets === setsNeeded - 1);
  const sideLabel = gs.inTiebreak ? gs.tbPointsPlayed % 2 === 0 ? "DEUCE" : "AD" : (srvS + rcvS) % 2 === 0 ? "DEUCE" : "AD";
  const heatStart = readHeat(gs);
  const ratingsAtStart = gs.players.map((p) => _traceRatingSnapshot(p));
  t._pointSeq++;
  t._lastShot = null;
  t._lastBouncedShot = null;
  t._current = {
    pointId: t._pointSeq,
    set: `${p0.sets}-${p1.sets}`,
    game: `${p0.games}-${p1.games}`,
    score: `${SL[p0.score] ?? "?"}-${SL[p1.score] ?? "?"}`,
    server: gs.players[gs.server].name,
    serverId: gs.server,
    serverStyle: gs.players[gs.server].styleData?.abbr ?? "?",
    receiver: gs.players[1 - gs.server].name,
    courtSide: sideLabel,
    inTiebreak: gs.inTiebreak,
    tbScore: gs.inTiebreak ? [...gs.tbScore] : null,
    isBreakPoint,
    isGamePoint,
    isSetPoint,
    isMatchPoint: isMatchPoint || isTiebreakMatchPoint,
    pressureLabel: _pressureLabel(isMatchPoint || isTiebreakMatchPoint, isSetPoint, isBreakPoint, isGamePoint),
    staminaStart: [
      +((p0.stamina ?? 1) * 100).toFixed(0),
      +((p1.stamina ?? 1) * 100).toFixed(0)
    ],
    momentumStart: [
      +((p0.ctx?.momentum ?? 0.5) * 100).toFixed(0),
      +((p1.ctx?.momentum ?? 0.5) * 100).toFixed(0)
    ],
    heatAtStart: heatStart?.score ?? null,
    heatPeakAtStart: heatStart?.peak ?? null,
    heatTierStart: heatStart?.tier?.label ?? null,
    ratingsAtStart,
    serve: null,
    shots: [],
    endReason: null,
    endDetail: null,
    winner: null,
    winnerId: null,
    winnerType: null,
    rally: null,
    summary: null
  };
}
function traceLogShot(gs, player, shot, posQuality) {
  if (!TRACE_ENABLED)
    return;
  if (!gs.trace?._current)
    return;
  const t = gs.trace;
  const pt = t._current;
  const ball = gs.ball;
  const opp = gs.players[1 - player.id];
  const ctx2 = player.ctx;
  const at = player._aiTrace ?? {};
  const fs = player._finalShot ?? {};
  const shotPrefs = shot.prefsSnapshot ?? player.prefs ?? null;
  const familyScores = shot.familyScores ?? null;
  const familyRanking = familyScores ? Object.entries(familyScores).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([family, score]) => ({ family, score: +score.toFixed(3) })) : [];
  const subtypeRanking = (shot.subtypeScores ?? []).map((entry) => ({
    subtype: entry.subtype,
    score: +entry.score.toFixed(3)
  }));
  const HALF_L = 11.885;
  const depthBucket = (absY) => absY > HALF_L * 0.78 ? "DEEP" : absY > HALF_L * 0.45 ? "MID" : "SHORT";
  const widthBucket = (absX2) => absX2 > 2.8 ? "WIDE" : absX2 > 1.2 ? "MID" : "CENTRE";
  const playerSide = player.id === 0 ? 1 : -1;
  const absX = Math.abs(shot.targetX);
  const dirLabel = absX > 1.5 ? shot.targetX * playerSide > 0 ? "DTL" : "CC" : "BODY";
  const oppX = opp.pos.x;
  const oppY = Math.abs(opp.pos.y);
  const oppLat = widthBucket(Math.abs(oppX));
  const oppDep = depthBucket(oppY);
  const openSide = oppX > 0.5 ? "LEFT" : oppX < -0.5 ? "RIGHT" : "NONE";
  const ballTier = at.sc?.ballTier ?? null;
  let ballLabel = ballTier ?? "NEUTRAL";
  const ballReasons = [];
  if (posQuality < 0.42)
    ballReasons.push("qualidade_baixa");
  if ((ctx2.rallyPressure ?? 0) > 0.55)
    ballReasons.push("sob_press\xE3o");
  if (Math.abs(player.pos.x) > 3)
    ballReasons.push("wide");
  if (player._arrivalMargin != null && player._arrivalMargin < -0.05)
    ballReasons.push("atrasado");
  if (ball.pos.z < 0.5)
    ballReasons.push("bola_baixa");
  if (ball.pos.z > 1.5)
    ballReasons.push("bola_alta");
  const rawIntent = at.sc?.intent ?? ctx2.currentIntent ?? at.chosen?.intent ?? "BUILD";
  const intent = (shot?.family === "OVERHEAD" || shot?.family === "VOLLEY" || shot?.family === "HALF_VOLLEY") && rawIntent === "BUILD" ? "FINISH" : rawIntent;
  const intentReason = _intentReason(intent, at.sc, posQuality);
  const _sorted = (at.scored ?? []).sort((a, b) => b.EV - a.EV);
  const _top5 = _sorted.slice(0, 5);
  const _chosen = at.chosen ? _sorted.find((s) => s.c === at.chosen) : null;
  const _chosenInTop5 = _chosen && _top5.some((s) => s.c === at.chosen);
  const _display = _chosenInTop5 ? _top5 : _chosen ? [..._top5.slice(0, 4), _chosen] : _top5;
  const top5 = _display.map((s) => ({
    shotType: s.c.shotType,
    targetX: +s.c.targetX.toFixed(2),
    targetDepth: +s.c.targetDepth.toFixed(2),
    dir: _dirFrom(s.c.targetX, player.id),
    depth: depthBucket(Math.abs(s.c.targetDepth * HALF_L)),
    width: widthBucket(Math.abs(s.c.targetX)),
    power: Math.round((s.c.power ?? 0.65) * 100),
    ev: +s.EV.toFixed(3),
    safety: +s.sub.safety.toFixed(2),
    pressure: +s.sub.pressure.toFixed(2),
    finish: +s.sub.finish.toFixed(2),
    rhythm: +s.sub.rhythm.toFixed(2),
    angle: +(s.sub.angle ?? 0).toFixed(2),
    depth_score: +(s.sub.depth ?? 0).toFixed(2),
    desired_depth: s.desiredDepth != null ? +s.desiredDepth.toFixed(2) : null,
    tags: s.c.intentTags ?? [],
    isChosen: s.c === at.chosen
  }));
  const whyChosen = fs.wasOverridden ? `${fs.evShotType ?? at.chosen?.shotType ?? "?"} \u2192 ${fs.executedType} [${fs.overrideReason}]` : familyRanking.length ? _whyFamilyChosen(shot.family, familyRanking, shotPrefs, intent, posQuality) : _whyChosen(at.chosen, at.sc, top5, at.chosenDirLabel);
  const overrideInfo = fs.wasOverridden ? {
    evType: fs.evShotType,
    executedType: fs.executedType,
    reason: fs.overrideReason,
    chain: fs.overrideChain ?? []
  } : null;
  const isReturn = gs.rally === 1 && player.id !== gs.server;
  const hitTarget = player._hitTarget ?? null;
  const preHitBallSpeed = Math.sqrt((ball.vel.x ?? 0) ** 2 + (ball.vel.y ?? 0) ** 2 + (ball.vel.z ?? 0) ** 2);
  const movement = {
    state: player._movState ?? null,
    locomotion: player._locomotionMode ?? null,
    courtMode: ctx2?.courtMode ?? "BASE",
    transitionCooldown: ctx2?.transitionCooldown ?? 0,
    arrivalMargin: player._arrivalMargin != null ? +player._arrivalMargin.toFixed(3) : null,
    predCrossX: player._predCrossX != null ? +player._predCrossX.toFixed(2) : null,
    hitTarget: hitTarget ? {
      x: hitTarget.x != null ? +hitTarget.x.toFixed(2) : null,
      y: hitTarget.y != null ? +hitTarget.y.toFixed(2) : null,
      t: hitTarget.t != null ? +hitTarget.t.toFixed(3) : null
    } : null,
    opponentETA: fs.timings?.opponentETA ?? null,
    opponentETAComponents: fs.timings?.opponentETAComponents ?? null
  };
  const pendingBounce = gs.trace?._lastBouncedShot;
  if (pendingBounce && !pendingBounce.postBounce?.nextContact && (ball.bounceCount ?? 0) >= 1) {
    pendingBounce.postBounce = pendingBounce.postBounce ?? {};
    pendingBounce.postBounce.nextContact = {
      hitter: player.name,
      hitterId: player.id,
      timeSinceBounce: Number.isFinite(ball._timeSinceBounce) ? +ball._timeSinceBounce.toFixed(3) : null,
      hitHeight: shot.hitHeight != null ? +shot.hitHeight.toFixed(2) : null,
      preHitBallSpeed: +preHitBallSpeed.toFixed(1),
      state: player._movState ?? null,
      locomotion: player._locomotionMode ?? null
    };
    gs.trace._lastBouncedShot = null;
  }
  const shotTrace = {
    rallyIndex: gs.rally,
    isReturn,
    hitter: player.name,
    hitterId: player.id,
    receiver: opp.name,
    atNet: player.atNet,
    shotType: shot.type,
    shotFamily: shot.family ?? null,
    shotSubtype: shot.subtype ?? null,
    quality: +posQuality.toFixed(2),
    qualityBand: shot.qualityBand ?? null,
    ballLabel,
    ballReasons,
    rallyPatternApplied: at.rallyPatternApplied ?? null,
    signatureShotTriggered: null,
    signatureLabel: null,
    signatureEmoji: null,
    signatureSource: null,
    ballPos: { x: +ball.pos.x.toFixed(2), y: +ball.pos.y.toFixed(2), z: +ball.pos.z.toFixed(2) },
    hitterPos: { x: +player.pos.x.toFixed(2), y: +player.pos.y.toFixed(2) },
    oppPos: { x: +opp.pos.x.toFixed(2), y: +opp.pos.y.toFixed(2) },
    oppLateral: oppLat,
    oppDepth: oppDep,
    openSide,
    oppVeryDeep: at.sc?.oppVeryDeep ?? false,
    oppOut: +(at.sc?.oppOut ?? 0).toFixed(2),
    intent,
    intentReason,
    inControl: at.sc?.inControl ?? false,
    momentum: +(ctx2.momentum ?? 0.5).toFixed(2),
    stamina: +((player.stamina ?? 1) * 100).toFixed(0),
    target: {
      x: +shot.targetX.toFixed(2),
      y: +shot.targetY.toFixed(2),
      dir: dirLabel,
      depth: depthBucket(Math.abs(shot.targetY)),
      width: widthBucket(absX)
    },
    power: Math.round((shot.power ?? 30) * 3.6),
    spin: shot.spinType,
    spinX: shot.spinX != null ? +shot.spinX.toFixed(2) : null,
    spinZ: shot.spinZ != null ? +shot.spinZ.toFixed(2) : null,
    netClearance: shot.netClearance != null ? +shot.netClearance.toFixed(2) : null,
    hitHeight: shot.hitHeight != null ? +shot.hitHeight.toFixed(2) : null,
    preHitBallSpeed: +preHitBallSpeed.toFixed(1),
    zone: shot.zone ?? null,
    shotMaster: {
      subtype: shot.subtype ?? null,
      sigmaType: shot.sigmaType ?? null,
      errorMode: shot.errorMode ?? (shot.lowQConsequences?.errorMode ?? null),
      familyRanking,
      subtypeRanking,
      prefs: shotPrefs ? {
        buildStyle: shotPrefs.buildStyle ?? null,
        netGame: shotPrefs.netGame ?? null,
        rallyCadence: shotPrefs.rallyCadence ?? null,
        riskProfile: shotPrefs.riskProfile ?? null,
        adaptability: shotPrefs.adaptability ?? null
      } : null,
      bounceProfile: shot.bounceProfile ? {
        friction: shot.bounceProfile.friction ?? null,
        vertical: shot.bounceProfile.vertical ?? null,
        side: shot.bounceProfile.side ?? null,
        deadBall: !!shot.bounceProfile.deadBall
      } : null,
      lowQ: shot.lowQConsequences ? {
        depthLoss: shot.lowQConsequences.depthLoss ?? null,
        widthExpand: shot.lowQConsequences.widthExpand ?? null,
        netRisk: shot.lowQConsequences.netRisk ?? null,
        spinLoss: shot.lowQConsequences.spinLoss ?? null,
        errorMode: shot.lowQConsequences.errorMode ?? null
      } : null
    },
    top5,
    whyChosen,
    overrideInfo,
    evProbError: player._shotEvProb?.error != null ? +player._shotEvProb.error.toFixed(3) : null,
    evProbWin: player._shotEvProb?.win != null ? +player._shotEvProb.win.toFixed(3) : null,
    qualBreakdown: player._qualBreakdown ?? null,
    shotIntensity: shot._shotIntensity != null ? +shot._shotIntensity.toFixed(2) : null,
    rallyPressure: +(ctx2.rallyPressure ?? 0).toFixed(2),
    formMod: player._formMods?.qualityMod != null ? +player._formMods.qualityMod.toFixed(2) : null,
    movement,
    bounce: null,
    postBounce: null,
    landErr: null,
    outcome: null
  };
  pt.shots.push(shotTrace);
  gs.trace._lastShot = shotTrace;
}
function traceLogOutcome(gs, bounceX, bounceY, outcomeType, bounceMeta = null) {
  if (!TRACE_ENABLED)
    return;
  const shot = gs.trace?._lastShot;
  if (!shot)
    return;
  const err = shot.target ? +Math.sqrt((bounceX - shot.target.x) ** 2 + (bounceY - shot.target.y) ** 2).toFixed(2) : null;
  shot.bounce = {
    x: +bounceX.toFixed(2),
    y: +bounceY.toFixed(2),
    zone: _bounceZone(bounceX, bounceY)
  };
  shot.postBounce = bounceMeta ? {
    exitSpeedKmh: Number.isFinite(bounceMeta.exitSpeedKmh) ? +bounceMeta.exitSpeedKmh.toFixed(1) : null,
    exitVz: Number.isFinite(bounceMeta.exitVz) ? +bounceMeta.exitVz.toFixed(2) : null,
    apexHeight: Number.isFinite(bounceMeta.apexHeight) ? +bounceMeta.apexHeight.toFixed(2) : null,
    apexTime: Number.isFinite(bounceMeta.apexTime) ? +bounceMeta.apexTime.toFixed(3) : null,
    apexX: Number.isFinite(bounceMeta.apexX) ? +bounceMeta.apexX.toFixed(2) : null,
    apexY: Number.isFinite(bounceMeta.apexY) ? +bounceMeta.apexY.toFixed(2) : null,
    nextBounceTime: Number.isFinite(bounceMeta.nextBounceTime) ? +bounceMeta.nextBounceTime.toFixed(3) : null,
    nextBounceX: Number.isFinite(bounceMeta.nextBounceX) ? +bounceMeta.nextBounceX.toFixed(2) : null,
    nextBounceY: Number.isFinite(bounceMeta.nextBounceY) ? +bounceMeta.nextBounceY.toFixed(2) : null,
    nextContact: null
  } : null;
  shot.landErr = err;
  if (outcomeType)
    shot.outcome = outcomeType;
  gs.trace._lastBouncedShot = shot;
  gs.trace._lastShot = null;
}
function traceEndPoint(gs, winnerIdx, reason, isWinner) {
  if (!TRACE_ENABLED)
    return;
  if (!gs.trace?._current)
    return;
  const t = gs.trace;
  const pt = t._current;
  let endType = "UNKNOWN";
  if (reason.includes("WINNER") || reason.includes("bola parou") || isWinner)
    endType = "WINNER";
  else if (reason.includes("[FORA]") || reason.includes("fuga"))
    endType = "OUT";
  else if (reason.includes("[REDE]"))
    endType = "NET";
  else if (reason.includes("DUPLA FALTA"))
    endType = "DOUBLE_FAULT";
  else if (reason.includes("CAMPO PR\xD3PRIO"))
    endType = "CAMPO_PROPRIO";
  else if (reason.includes("FOR\xC7ADO") || reason.includes("forced"))
    endType = "FORCED_ERROR";
  else if (reason.includes("N\xC3O-FOR\xC7ADO") || reason.includes("unforced"))
    endType = "UNFORCED_ERROR";
  pt.endReason = endType;
  pt.endDetail = reason;
  pt.winner = gs.players[winnerIdx].name;
  pt.winnerId = winnerIdx;
  pt.rally = gs.rally;
  const heatEnd = readHeat(gs);
  pt.heatAtEnd = heatEnd?.score ?? null;
  pt.heatPeak = heatEnd?.peak ?? null;
  pt.heatTier = heatEnd?.tier?.label ?? null;
  pt.heatDelta = pt.heatAtStart != null && heatEnd?.score != null ? +(heatEnd.score - pt.heatAtStart).toFixed(1) : null;
  pt.ratingsAtEnd = gs.players.map((p) => _traceRatingSnapshot(p));
  if (endType === "WINNER") {
    const lastShot = pt.shots[pt.shots.length - 1];
    pt.winnerType = _classifyWinner(lastShot);
  }
  const pd = gs._pendingServeData;
  if (pd || gs.serveBounced) {
    pt.serve = pt.serve ?? {};
    if (pd) {
      pt.serve.kmh = pd.kmh;
      pt.serve.serveId = pd.serveId ?? null;
      pt.serve.physType = pd.physType;
      pt.serve.dir = pd.dir;
      pt.serve.plannedDir = pd.plannedDir ?? null;
      pt.serve.intent = pd.intent ?? null;
      pt.serve.isFirst = pd.isFirst;
      pt.serve.isSecond = pd.isSecond ?? !pd.isFirst;
      pt.serve.targetX = Number.isFinite(pd.targetX) ? +pd.targetX.toFixed(2) : null;
      pt.serve.targetY = Number.isFinite(pd.targetY) ? +pd.targetY.toFixed(2) : gs.ball?._serveTargetY != null ? +gs.ball._serveTargetY.toFixed(2) : null;
      pt.serve.netClearance = Number.isFinite(pd.netClearance) ? +pd.netClearance.toFixed(2) : null;
      pt.serve.spinX = Number.isFinite(pd.spinX) ? +pd.spinX.toFixed(2) : null;
      pt.serve.spinZ = Number.isFinite(pd.spinZ) ? +pd.spinZ.toFixed(2) : null;
      pt.serve.serveSQ = Number.isFinite(pd.serveSQ) ? +pd.serveSQ.toFixed(2) : null;
      pt.serve.sigmaX = Number.isFinite(pd.sigmaX) ? +pd.sigmaX.toFixed(3) : null;
      pt.serve.bounceProfile = pd.bounceProfile ?? null;
      pt.serve.faultMode = pd.faultMode ?? null;
    }
    pt.serve.serverWon = winnerIdx === gs.server;
    pt.serve.isAce = endType === "WINNER" && winnerIdx === gs.server && !gs.receiverTouched && gs.rally <= 1;
    pt.serve.isDF = endType === "DOUBLE_FAULT";
    pt.serve.rallyLen = gs.rally;
    const returnShot = pt.shots.find((s) => s.isReturn);
    if (returnShot?.bounce)
      pt.serve.returnBounce = returnShot.bounce;
    if (returnShot) {
      pt.serve.returnQuality = returnShot.quality;
      pt.serve.returnType = returnShot.shotType;
      pt.serve.returnIntent = returnShot.intent ?? null;
    }
  }
  const shots = pt.shots;
  const total = shots.length;
  if (total > 0) {
    const cc = shots.filter((s) => s.target?.dir === "CC").length;
    const dtl = shots.filter((s) => s.target?.dir === "DTL").length;
    const body = shots.filter((s) => s.target?.dir === "BODY").length;
    const deep = shots.filter((s) => s.target?.depth === "DEEP").length;
    const mid = shots.filter((s) => s.target?.depth === "MID").length;
    const sh = shots.filter((s) => s.target?.depth === "SHORT").length;
    const pct = (n) => total > 0 ? Math.round(n / total * 100) : 0;
    const patterns = _detectPatterns(shots);
    const approached = shots.some((s) => s.intent === "APPROACH");
    const netShots = shots.filter((s) => s.atNet);
    const avgQuality = +(shots.reduce((s, sh2) => s + sh2.quality, 0) / total).toFixed(2);
    const avgPower = Math.round(shots.reduce((s, sh2) => s + (sh2.power ?? 0), 0) / total);
    const maxSpeed = shots.reduce((m, sh2) => Math.max(m, sh2.power ?? 0), 0);
    const avgMom = +(shots.reduce((s, sh2) => s + sh2.momentum, 0) / total).toFixed(2);
    const intents = [...new Set(shots.map((s) => s.intent))];
    const spins = shots.reduce((acc, s) => {
      if (s.spin)
        acc[s.spin] = (acc[s.spin] ?? 0) + 1;
      return acc;
    }, {});
    pt.summary = {
      totalShots: total,
      ccPct: pct(cc),
      dtlPct: pct(dtl),
      bodyPct: pct(body),
      deepPct: pct(deep),
      midPct: pct(mid),
      shortPct: pct(sh),
      patternBroken: patterns.broken,
      dominantPattern: patterns.dominant,
      hadApproach: approached,
      netAttempts: netShots.length,
      movementStates: [...new Set(shots.map((s) => s.movement?.courtMode).filter(Boolean))],
      avgArrivalMargin: shots.length ? +shots.map((s) => s.movement?.arrivalMargin).filter((v) => v != null).reduce((sum, v, _, arr) => sum + v / Math.max(arr.length, 1), 0).toFixed(3) : null,
      avgQuality,
      avgPower,
      maxSpeed,
      avgMomentum: avgMom,
      intentsUsed: intents,
      spinDistribution: spins
    };
  }
  const agg = t._agg;
  agg.totalPoints++;
  if (endType === "WINNER")
    agg.winners[winnerIdx]++;
  if (endType === "UNFORCED_ERROR")
    agg.unforcedErrors[1 - winnerIdx]++;
  if (endType === "FORCED_ERROR")
    agg.forcedErrors[1 - winnerIdx]++;
  const sv = pt.serve;
  if (sv) {
    if (sv.isAce)
      agg.aces[gs.server]++;
    if (sv.isDF)
      agg.doubleFaults[gs.server]++;
    if (sv.kmh) {
      if (sv.isFirst !== false)
        agg.serveKmh1[gs.server].push(sv.kmh);
      else
        agg.serveKmh2[gs.server].push(sv.kmh);
    }
  }
  if (pt.isBreakPoint) {
    agg.breakPointsPlayed++;
    if (winnerIdx !== gs.server)
      agg.breakPointsConverted++;
  }
  if ((pt.summary?.netAttempts ?? 0) > 0) {
    agg.netApproaches[winnerIdx]++;
    agg.netWon[winnerIdx]++;
  }
  const rl = gs.rally ?? 0;
  const rb = rl === 0 ? "0" : rl === 1 ? "1" : rl <= 4 ? "2-4" : rl <= 9 ? "5-9" : "10+";
  agg.rallyLenBuckets[rb] = (agg.rallyLenBuckets[rb] ?? 0) + 1;
  t.points.push({ ...pt });
  t._current = null;
}
function _pressureLabel(isMatchPoint, isSetPoint, isBreakPoint, isGamePoint) {
  if (isMatchPoint)
    return "MATCH POINT";
  if (isSetPoint)
    return "SET POINT";
  if (isBreakPoint)
    return "BREAK POINT";
  if (isGamePoint)
    return "GAME POINT";
  return null;
}
function _whyFamilyChosen(family, familyRanking, prefs, intent, quality) {
  const rank = familyRanking?.find((r) => r.family === family);
  const top = familyRanking?.[0];
  const parts = [];
  if (family)
    parts.push(`family ${family}`);
  if (rank)
    parts.push(`score ${rank.score}`);
  if (top && top.family !== family)
    parts.push(`top was ${top.family}:${top.score}`);
  if (intent)
    parts.push(`intent ${intent}`);
  if (quality != null)
    parts.push(`Q ${quality.toFixed(2)}`);
  if (prefs) {
    parts.push(`${prefs.buildStyle}/${prefs.netGame}/${prefs.rallyCadence}/${prefs.riskProfile}`);
  }
  return parts.join(" | ");
}
function _classifyWinner(lastShot) {
  if (!lastShot)
    return "WINNER";
  const atNet = lastShot.atNet;
  const type = lastShot.shotType ?? "";
  if (atNet) {
    if (type.includes("VOLLEY") || type.includes("SMASH"))
      return "NET_WINNER";
    return "PASSING_SHOT";
  }
  if (type === "DROP_SHOT")
    return "DROP_WINNER";
  if (type === "SMASH")
    return "SMASH_WINNER";
  const dir = lastShot.target?.dir;
  if (dir === "DTL")
    return "WINNER_DTL";
  if (dir === "CC")
    return "WINNER_CC";
  return "WINNER_BODY";
}
function _bounceZone(x, y) {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const depth = ay > 11.885 * 0.78 ? "DEEP" : ay > 11.885 * 0.45 ? "MID" : "SHORT";
  const width = ax > 2.8 ? "WIDE" : ax > 1.2 ? "MID" : "CENTRE";
  return `${depth}_${width}`;
}
function _dirFrom(targetX, playerId) {
  const absX = Math.abs(targetX);
  if (absX <= 1.5)
    return "BODY";
  const sign = targetX * (playerId === 0 ? 1 : -1);
  return sign > 0 ? "DTL" : "CC";
}
function _intentReason(intent, sc, quality) {
  if (!sc)
    return intent;
  if (intent === "RESET") {
    if (sc.ballTier === "DIFFICULT")
      return "bola dif\xEDcil \u2192 recuperar posi\xE7\xE3o";
    if (sc.toughBall)
      return "bola dif\xEDcil \u2192 recuperar posi\xE7\xE3o";
    return "sob press\xE3o \u2192 priorizar seguran\xE7a";
  }
  if (intent === "BUILD")
    return sc.easyBall ? "construir press\xE3o" : "in\xEDcio de rally \u2192 paci\xEAncia";
  if (intent === "PRESSURE") {
    if (sc.oppOut > 0.45)
      return `oponente deslocado (${(sc.oppOut * 100).toFixed(0)}%) \u2192 pressionar`;
    if ((sc.momentum ?? 0.5) > 0.6)
      return "momentum alto \u2192 pressionar";
    if (sc.ballTier === "OPPORTUNITY" || sc.easyBall)
      return "bola f\xE1cil \u2192 pressionar";
    return "construindo press\xE3o";
  }
  if (intent === "FINISH") {
    if (sc.ballTier === "OPPORTUNITY" && sc.oppOut > 0.5)
      return "posi\xE7\xE3o dominante + quadra aberta \u2192 winner";
    return "bola f\xE1cil + controle \u2192 tentar winner";
  }
  if (intent === "APPROACH")
    return "bola curta \u2192 subir \xE0 rede";
  return intent;
}
function _whyChosen(chosen, sc, top5, chosenDirLabel) {
  if (!chosen)
    return null;
  const parts = [];
  const chosen5 = top5?.find((c) => c.isChosen);
  if (!sc)
    return `${chosen.shotType} escolhido pelo sistema`;
  const tags = chosen.intentTags ?? [];
  if (tags.includes("BREAK_PATTERN"))
    parts.push("quebrou padr\xE3o");
  if (tags.includes("OPEN"))
    parts.push("quadra aberta");
  if (tags.includes("APPROACH"))
    parts.push("sobe \xE0 rede");
  if (chosenDirLabel === "CC")
    parts.push("cross-court");
  else if (chosenDirLabel === "DTL")
    parts.push("down-the-line");
  else {
    if (tags.includes("CC"))
      parts.push("cross-court");
    if (tags.includes("DTL"))
      parts.push("down-the-line");
  }
  if (tags.includes("DEEP"))
    parts.push("profundo");
  if (tags.includes("DROP"))
    parts.push("drop shot t\xE1tico");
  if (tags.includes("SAFE"))
    parts.push("margem segura");
  if (sc.ballTier === "DIFFICULT" || sc.toughBall)
    parts.push("bola dif\xEDcil \u2192 priorizou seguran\xE7a");
  if ((sc.ballTier === "OPPORTUNITY" || sc.easyBall) && sc.inControl && sc.oppOut > 0.45)
    parts.push("vantagem clara \u2192 ataque");
  else if (sc.ballTier === "OPPORTUNITY" || sc.easyBall)
    parts.push("bola f\xE1cil");
  if (sc.oppVeryDeep)
    parts.push("oponente recuado");
  if (sc.oppOut > 0.5)
    parts.push(`oponente fora (${(sc.oppOut * 100).toFixed(0)}%)`);
  if (parts.length === 0 && chosen5) {
    const best = Object.entries({ seguran\u00E7a: chosen5.safety, press\u00E3o: chosen5.pressure, finaliza\u00E7\u00E3o: chosen5.finish, ritmo: chosen5.rhythm }).sort((a, b) => b[1] - a[1])[0];
    parts.push(`melhor ${best[0]} (${best[1].toFixed(2)})`);
  }
  return parts.join(" + ") || (chosen?.c?.shotType ? `${chosen.c.shotType} por EV m\xE1ximo` : "EV m\xE1ximo");
}
function _detectPatterns(shots) {
  if (shots.length < 3)
    return { broken: false, dominant: null };
  let runs = [], cur = shots[0]?.target?.dir, cnt = 1;
  for (let i = 1; i < shots.length; i++) {
    const d = shots[i]?.target?.dir;
    if (d === cur) {
      cnt++;
    } else {
      runs.push({ dir: cur, len: cnt });
      cur = d;
      cnt = 1;
    }
  }
  runs.push({ dir: cur, len: cnt });
  const broken = runs.some((r) => r.len >= 2) && runs.length > 1;
  const dominant = runs.sort((a, b) => b.len - a.len)[0];
  return { broken, dominant: dominant?.len >= 2 ? `${dominant.dir} \xD7${dominant.len}` : null };
}
function _traceRatingSnapshot(player) {
  if (!player)
    return null;
  const stats = player.stats ?? {};
  const shotCount = Math.max(
    player.shotCount ?? 0,
    stats.qualityCount ?? 0,
    (stats.attackShots ?? 0) + (stats.defenseShots ?? 0)
  );
  const rating = computeRating(stats, Math.max(shotCount, 1));
  return {
    playerId: player.id,
    player: player.name,
    score: rating?.score ?? null,
    tier: rating?.tier?.label ?? null
  };
}

// src/courtConfigs.js
var SURFACE = Object.freeze({
  GRASS: "GRASS",
  CLAY: "CLAY",
  HARD: "HARD",
  INDOOR: "INDOOR"
});
var COURTS = {
  // ═══════════════════════════════════════════════════════════════════════════
  //  WIMBLEDON — Centre Court (Grama)
  // ═══════════════════════════════════════════════════════════════════════════
  WIMBLEDON: {
    meta: {
      name: "Centre Court",
      location: "Wimbledon",
      icon: "\u{1F33F}",
      surface: SURFACE.GRASS,
      tier: "GRAND_SLAM",
      label: "Grama r\xE1pida",
      desc: "Bounce baixo e irregular. Serve & Volley domina. Adaptabilidade vale mais que consist\xEAncia."
    },
    physics: {
      restitution: 0.62,
      // bola fica baixa após bounce
      groundFriction: 0.65,
      // desliza mais (grama)
      windFactor: 0.12,
      // vento moderado (outdoor)
      altitudeFactor: 1
    },
    style: {
      // Estilos que ganham bônus nesta quadra
      favors: ["BIG_SERVER", "SRV_VOL", "NET_SPECIALIST", "POWER_BASELINER"],
      penalizes: ["CTR_PUNCHER", "GRINDER"],
      // topspin alto perde o efeito no bounce baixo
      // Modificadores numéricos aplicados em game.js
      serveBonus: 0.12,
      // % de vantagem extra no saque
      rallyLengthMult: 0.72,
      // rallies mais curtos
      staminaDecayMult: 0.9,
      // menos desgaste físico (pontos rápidos)
      bounceVariance: 0.08,
      // irregularidade do bounce (+erro possível)
      adaptabilityMod: 0.15,
      // adaptability mitiga a variância
      winnerMod: 1.2,
      // winners mais fáceis de fazer
      ueRiskMod: 1.1
      // mas também mais UE por irregularidade
    },
    visual: {
      surface: SURFACE.GRASS,
      courtColor: "#1a6e38",
      courtDark: "#155c30",
      runbackColor: "#0e2e18",
      lineColor: "rgba(240,248,240,0.92)",
      netColor: "#e8e0c0",
      stripeAlpha: 0.028,
      turfPattern: true,
      turfPx: 6,
      // Badge de superfície
      badge: "\u{1F33F} GRAMA",
      badgeColor: "#00FF88"
    }
  },
  // ═══════════════════════════════════════════════════════════════════════════
  //  ROLAND GARROS — Philippe Chatrier (Saibro)
  // ═══════════════════════════════════════════════════════════════════════════
  ROLAND_GARROS: {
    meta: {
      name: "Court Philippe Chatrier",
      location: "Roland Garros",
      icon: "\u{1F3FA}",
      surface: SURFACE.CLAY,
      tier: "GRAND_SLAM",
      label: "Saibro lento",
      desc: "Bounce alto e lento. Rallies longos. Stamina e consist\xEAncia decidem o ponto."
    },
    physics: {
      restitution: 0.85,
      // bounce alto — bola sobe muito
      groundFriction: 0.92,
      // muita aderência — bola freia no chão
      windFactor: 0.1,
      altitudeFactor: 1
    },
    style: {
      favors: ["CTR_PUNCHER", "RETRIEVER", "GRINDER"],
      penalizes: ["SRV_VOL", "BIG_SERVER", "POWER_BASELINER", "TAKEALLRISK"],
      serveBonus: -0.1,
      // saques menos decisivos
      rallyLengthMult: 1.65,
      // rallies muito longos
      staminaDecayMult: 1.3,
      // alto desgaste físico
      bounceVariance: 0.02,
      // bounce muito consistente
      adaptabilityMod: 0.05,
      winnerMod: 0.7,
      // winners difíceis de fazer
      ueRiskMod: 0.85,
      // mas menos UE
      slideBonus: true
      // players deslizam no saibro
    },
    visual: {
      surface: SURFACE.CLAY,
      courtColor: "#c1440e",
      courtDark: "#a83a0c",
      runbackColor: "#7a2a08",
      lineColor: "rgba(255,255,255,0.85)",
      netColor: "#f0e8d0",
      stripeAlpha: 0.022,
      turfPattern: false,
      clayPattern: true,
      // granulado de saibro
      badge: "\u{1F3FA} SAIBRO",
      badgeColor: "#FF6B35"
    }
  },
  // ═══════════════════════════════════════════════════════════════════════════
  //  US OPEN — Arthur Ashe (Quadra Dura)
  // ═══════════════════════════════════════════════════════════════════════════
  US_OPEN: {
    meta: {
      name: "Arthur Ashe Stadium",
      location: "US Open",
      icon: "\u{1F3D9}\uFE0F",
      surface: SURFACE.HARD,
      tier: "GRAND_SLAM",
      label: "Hard m\xE9dio",
      desc: "Bounce consistente. Terreno neutro \u2014 todos os estilos s\xE3o vi\xE1veis. All-Court Players dominam."
    },
    physics: {
      restitution: 0.74,
      groundFriction: 0.82,
      windFactor: 0.08,
      altitudeFactor: 1
    },
    style: {
      favors: ["ALL_COURT", "AGG_BASELINER", "TACTICAL_TECHNICIAN", "MOMENTUM_PLAYER"],
      penalizes: [],
      serveBonus: 0.02,
      rallyLengthMult: 1,
      staminaDecayMult: 1,
      bounceVariance: 0.01,
      adaptabilityMod: 0.02,
      winnerMod: 1,
      ueRiskMod: 1
    },
    visual: {
      surface: SURFACE.HARD,
      courtColor: "#2a5fa8",
      courtDark: "#1e4a88",
      runbackColor: "#102040",
      lineColor: "rgba(255,255,255,0.90)",
      netColor: "#d8d8d8",
      stripeAlpha: 0.018,
      turfPattern: false,
      hardPattern: true,
      // linhas de asfalto
      badge: "\u{1F3D9}\uFE0F HARD",
      badgeColor: "#00D4FF"
    }
  },
  // ═══════════════════════════════════════════════════════════════════════════
  //  ATP FINALS — O2 Arena (Indoor)
  // ═══════════════════════════════════════════════════════════════════════════
  O2_ARENA: {
    meta: {
      name: "O\u2082 Arena",
      location: "ATP Finals \u2013 Londres",
      icon: "\u{1F3DF}\uFE0F",
      surface: SURFACE.INDOOR,
      tier: "MASTERS",
      label: "Indoor r\xE1pido",
      desc: "Sem vento. Condi\xE7\xF5es perfeitas e controladas. Serve e agressividade dominam."
    },
    physics: {
      restitution: 0.68,
      groundFriction: 0.72,
      windFactor: 0,
      // indoor = sem vento
      altitudeFactor: 1
    },
    style: {
      favors: ["BIG_SERVER", "AGG_BASELINER", "POWER_BASELINER", "TAKEALLRISK"],
      penalizes: ["RETRIEVER", "GRINDER"],
      serveBonus: 0.08,
      rallyLengthMult: 0.85,
      staminaDecayMult: 0.88,
      // condições controladas — menos esforço
      bounceVariance: 0,
      // bounce perfeito
      adaptabilityMod: -0.05,
      // adaptability menos relevante (condições fixas)
      winnerMod: 1.15,
      ueRiskMod: 0.92
    },
    visual: {
      surface: SURFACE.INDOOR,
      courtColor: "#1a1a5a",
      courtDark: "#12124a",
      runbackColor: "#0a0a30",
      lineColor: "rgba(200,220,255,0.90)",
      netColor: "#8899cc",
      stripeAlpha: 0.025,
      turfPattern: false,
      indoorGlow: true,
      // efeito de luz artificial
      badge: "\u{1F3DF}\uFE0F INDOOR",
      badgeColor: "#AA88FF"
    }
  },
  // ═══════════════════════════════════════════════════════════════════════════
  //  QUEEN'S CLUB (Grama Rápida Premium)
  // ═══════════════════════════════════════════════════════════════════════════
  QUEENS_CLUB: {
    meta: {
      name: "Queen's Club",
      location: "Londres",
      icon: "\u26A1",
      surface: SURFACE.GRASS,
      tier: "PREMIUM",
      label: "Grama ultra-r\xE1pida",
      desc: "Bounce ultra-baixo. Prepara\xE7\xE3o para Wimbledon. Velocidade extrema \u2014 equivalente ao Storm Track."
    },
    physics: {
      restitution: 0.54,
      // ancora baixíssimo
      groundFriction: 0.58,
      windFactor: 0.14,
      altitudeFactor: 1
    },
    style: {
      favors: ["BIG_SERVER", "SRV_VOL", "NET_SPECIALIST", "POWER_BASELINER"],
      penalizes: ["CTR_PUNCHER", "RETRIEVER", "GRINDER"],
      serveBonus: 0.2,
      // serve muito poderoso aqui
      rallyLengthMult: 0.58,
      staminaDecayMult: 0.8,
      bounceVariance: 0.12,
      // grama velha — muito irregular
      adaptabilityMod: 0.2,
      winnerMod: 1.4,
      ueRiskMod: 1.25
    },
    visual: {
      surface: SURFACE.GRASS,
      courtColor: "#0f5228",
      courtDark: "#0a3d1e",
      runbackColor: "#061a0f",
      lineColor: "rgba(245,255,240,0.95)",
      netColor: "#e0dcc0",
      stripeAlpha: 0.035,
      turfPattern: true,
      turfPx: 4,
      // turfPattern mais fino = grama mais curta
      badge: "\u26A1 ULTRA GRASS",
      badgeColor: "#88FF44"
    }
  },
  // ═══════════════════════════════════════════════════════════════════════════
  //  MONTE CARLO (Saibro Lento Premium)
  // ═══════════════════════════════════════════════════════════════════════════
  MONTE_CARLO: {
    meta: {
      name: "Monte-Carlo Country Club",
      location: "M\xF4naco",
      icon: "\u{1F30A}",
      surface: SURFACE.CLAY,
      tier: "PREMIUM",
      label: "Saibro pesado",
      desc: "Saibro mais lento do circuito. Rally de 30+ golpes comum. Equivalente ao Eternal Spinner."
    },
    physics: {
      restitution: 0.9,
      // bounce altíssimo — bola sobe muito
      groundFriction: 0.94,
      // muito alto mas físicamente coerente (era 0.97 — criava física aberrante)
      windFactor: 0.06,
      // Mediterrâneo — vento calmo
      altitudeFactor: 1
    },
    style: {
      favors: ["CTR_PUNCHER", "RETRIEVER", "GRINDER"],
      penalizes: ["SRV_VOL", "BIG_SERVER", "AGG_BASELINER", "POWER_BASELINER"],
      serveBonus: -0.18,
      rallyLengthMult: 2.2,
      // rallies épicos
      staminaDecayMult: 1.55,
      bounceVariance: 0.03,
      adaptabilityMod: 0.04,
      winnerMod: 0.55,
      ueRiskMod: 0.78
    },
    visual: {
      surface: SURFACE.CLAY,
      courtColor: "#b83a0a",
      courtDark: "#9a3008",
      runbackColor: "#6a2006",
      lineColor: "rgba(255,255,255,0.88)",
      netColor: "#f0e0c8",
      stripeAlpha: 0.028,
      turfPattern: false,
      clayPattern: true,
      clayHeavy: true,
      // saibro mais escuro, mais textura
      badge: "\u{1F30A} SAIBRO PESADO",
      badgeColor: "#FF4422"
    }
  },
  // ═══════════════════════════════════════════════════════════════════════════
  //  INDIAN WELLS (Hard de Altitude)
  // ═══════════════════════════════════════════════════════════════════════════
  INDIAN_WELLS: {
    meta: {
      name: "Stadium 1",
      location: "Indian Wells",
      icon: "\u{1F335}",
      surface: SURFACE.HARD,
      tier: "PREMIUM",
      label: "Hard de altitude",
      desc: "Altitude aumenta velocidade da bola em 10%. Serve e flat shots valem ainda mais."
    },
    physics: {
      restitution: 0.74,
      groundFriction: 0.8,
      windFactor: 0.04,
      // deserto — vento seco mas calmo
      altitudeFactor: 1.1
      // +10% velocidade de bola (ar rarefeito)
    },
    style: {
      favors: ["BIG_SERVER", "AGG_BASELINER", "ALL_COURT", "POWER_BASELINER"],
      penalizes: ["RETRIEVER", "GRINDER"],
      serveBonus: 0.15,
      rallyLengthMult: 0.88,
      staminaDecayMult: 1.08,
      // altitude cansa mais
      bounceVariance: 0.01,
      adaptabilityMod: 0.03,
      winnerMod: 1.18,
      ueRiskMod: 1.05
    },
    visual: {
      surface: SURFACE.HARD,
      courtColor: "#3565b0",
      courtDark: "#28508a",
      runbackColor: "#182838",
      lineColor: "rgba(255,255,255,0.92)",
      netColor: "#d0d8e8",
      stripeAlpha: 0.016,
      turfPattern: false,
      hardPattern: true,
      desertAmbient: true,
      // fundo com tons de deserto
      badge: "\u{1F335} ALTITUDE",
      badgeColor: "#FFD700"
    }
  },
  // ═══════════════════════════════════════════════════════════════════════════
  //  BERCY (Indoor com Saibro — Paris Masters)
  // ═══════════════════════════════════════════════════════════════════════════
  BERCY: {
    meta: {
      name: "Palais Omnisports de Bercy",
      location: "Paris",
      icon: "\u{1F3AD}",
      surface: SURFACE.INDOOR,
      tier: "PREMIUM",
      label: "Indoor sobre saibro",
      desc: "Indoor com saibro compactado. Combina velocidade indoor com bounce alto. Ca\xF3tico e imprevis\xEDvel."
    },
    physics: {
      restitution: 0.8,
      // saibro compactado — bounce alto
      groundFriction: 0.86,
      windFactor: 0,
      // indoor
      altitudeFactor: 1
    },
    style: {
      favors: ["ALL_COURT", "MOMENTUM_PLAYER", "CTR_PUNCHER"],
      // navegar o caos + saibro alto
      penalizes: ["SRV_VOL", "NET_SPECIALIST"],
      // net approach difícil com bounce alto
      serveBonus: 0.04,
      rallyLengthMult: 1.22,
      staminaDecayMult: 1.15,
      bounceVariance: 0.07,
      // combinação incomum = imprevisível
      adaptabilityMod: 0.18,
      // adaptability é chave aqui
      winnerMod: 0.95,
      ueRiskMod: 1.18
      // mais erros pelo caos da superfície
    },
    visual: {
      surface: SURFACE.INDOOR,
      courtColor: "#4a2060",
      // roxo sobre terra
      courtDark: "#381848",
      runbackColor: "#200e30",
      lineColor: "rgba(220,200,255,0.88)",
      netColor: "#aa88cc",
      stripeAlpha: 0.02,
      turfPattern: false,
      clayPattern: true,
      indoorGlow: true,
      bercy: true,
      // combinação única
      badge: "\u{1F3AD} INDOOR CLAY",
      badgeColor: "#CC66FF"
    }
  }
};
function getCourtPhysics(courtKey) {
  const court = COURTS[courtKey];
  if (!court)
    return null;
  return {
    ...court.physics,
    surface: court.meta?.surface ?? court.visual?.surface ?? SURFACE.HARD,
    bounceVariance: court.style?.bounceVariance ?? 0,
    adaptabilityMod: court.style?.adaptabilityMod ?? 0
  };
}
function getCourtVisual(courtKey) {
  const court = COURTS[courtKey];
  if (!court)
    return COURTS.US_OPEN.visual;
  return court.visual;
}
function getCourtStyleMods(courtKey) {
  const s = COURTS[courtKey]?.style;
  if (!s)
    return {
      serveBonus: 0,
      rallyLengthMult: 1,
      staminaDecayMult: 1,
      bounceVariance: 0,
      adaptabilityMod: 0,
      winnerMod: 1,
      ueRiskMod: 1
    };
  return {
    serveBonus: s.serveBonus ?? 0,
    rallyLengthMult: s.rallyLengthMult ?? 1,
    staminaDecayMult: s.staminaDecayMult ?? 1,
    bounceVariance: s.bounceVariance ?? 0,
    adaptabilityMod: s.adaptabilityMod ?? 0,
    winnerMod: s.winnerMod ?? 1,
    ueRiskMod: s.ueRiskMod ?? 1,
    favors: s.favors ?? [],
    penalizes: s.penalizes ?? []
  };
}

// src/styles.js
var PLAY_STYLES = {
  AGG_BASELINER: { id: "AGG_BASELINER", label: "Aggressive Baseliner", abbr: "AGG.BASE", icon: "\u26A1", refs: "Djokovic \xB7 Alcaraz", barColor: "#FF6B35" },
  CTR_PUNCHER: { id: "CTR_PUNCHER", label: "Counter-Puncher", abbr: "CTR.PUNCH", icon: "\u{1F6E1}", refs: "Nadal \xB7 Murray", barColor: "#FF4444" },
  ALL_COURT: { id: "ALL_COURT", label: "All-Court Player", abbr: "ALL-CRT", icon: "\u{1F3AD}", refs: "Federer \xB7 Graf", barColor: "#FFD700" },
  SRV_VOL: { id: "SRV_VOL", label: "Serve & Volleyer", abbr: "SRV.VOL", icon: "\u{1F3C3}", refs: "McEnroe \xB7 Edberg", barColor: "#00FF88" },
  BIG_SERVER: { id: "BIG_SERVER", label: "Big Server", abbr: "BIG SRV", icon: "\u{1F4A3}", refs: "Isner \xB7 Karlovic", barColor: "#AA44FF" },
  RETRIEVER: { id: "RETRIEVER", label: "Retriever", abbr: "RETRIEV", icon: "\u{1F3C3}", refs: "Wozniacki \xB7 Ferrer", barColor: "#00AAFF" },
  TAKEALLRISK: { id: "TAKEALLRISK", label: "All-Risk Gunner", abbr: "T.A.RISK", icon: "\u{1F3AF}", refs: "Kyrgios \xB7 peak Safin", barColor: "#FF0055" },
  GRINDER: { id: "GRINDER", label: "Grinder", abbr: "GRINDER", icon: "\u2699\uFE0F", refs: "Hewitt \xB7 Robredo", barColor: "#FF8800" },
  POWER_BASELINER: { id: "POWER_BASELINER", label: "Power Baseliner", abbr: "PWR.BASE", icon: "\u{1F525}", refs: "Medvedev \xB7 peak Agassi", barColor: "#FF3300" },
  TACTICAL_TECHNICIAN: { id: "TACTICAL_TECHNICIAN", label: "Tactical Technician", abbr: "TACT.TEC", icon: "\u{1F52C}", refs: "Henin \xB7 Stosur", barColor: "#00CCFF" },
  NET_SPECIALIST: { id: "NET_SPECIALIST", label: "Net Specialist", abbr: "NET.SPEC", icon: "\u{1F578}\uFE0F", refs: "Navratilova \xB7 Rafter", barColor: "#88FF44" },
  MOMENTUM_PLAYER: { id: "MOMENTUM_PLAYER", label: "Momentum Player", abbr: "MOM.PLAY", icon: "\u{1F3A2}", refs: "Monfils \xB7 peak Tsonga", barColor: "#FF00AA" }
};
PLAY_STYLES.PWR_BASE = PLAY_STYLES.POWER_BASELINER;
PLAY_STYLES.TACT_TEC = PLAY_STYLES.TACTICAL_TECHNICIAN;
PLAY_STYLES.NET_SPEC = PLAY_STYLES.NET_SPECIALIST;
PLAY_STYLES.ADPT_TAC = PLAY_STYLES.TACTICAL_TECHNICIAN;
var STYLE_KEYS = Object.keys(PLAY_STYLES).filter(
  (k) => !["PWR_BASE", "TACT_TEC", "NET_SPEC", "ADPT_TAC"].includes(k)
);
var SIGNATURE_SHOTS = {
  INSIDE_OUT_FH: { id: "INSIDE_OUT_FH", label: "Inside-Out Forehand", icon: "\u{1F3BE}" },
  INSIDE_IN_FH: { id: "INSIDE_IN_FH", label: "Forehand Inside-In", icon: "\u2197\uFE0F" },
  BANANA_FH: { id: "BANANA_FH", label: "Banana de Forehand", icon: "\u{1F34B}" },
  HEAVY_TOPSPIN_CC: { id: "HEAVY_TOPSPIN_CC", label: "Cruzado Pesado", icon: "\u2699\uFE0F" },
  HEAVY_TOP_CC: { id: "HEAVY_TOP_CC", label: "Topspin Pesado Cruzado", icon: "\u{1F300}" },
  HEAVY_TOP_DTL: { id: "HEAVY_TOP_DTL", label: "Topspin Pesado Paralelo", icon: "\u26A1" },
  HEAVY_TOP_BODY: { id: "HEAVY_TOP_BODY", label: "Topspin no Corpo", icon: "\u{1F3AF}" },
  SHORT_ANGLE_FH: { id: "SHORT_ANGLE_FH", label: "\xC2ngulo Curto FH", icon: "\u{1F4D0}" },
  RUNNING_FH: { id: "RUNNING_FH", label: "Forehand em Corrida", icon: "\u{1F4A8}" },
  DTL_BH: { id: "DTL_BH", label: "Backhand DTL", icon: "\u{1F3AF}" },
  BANANA_BH: { id: "BANANA_BH", label: "Banana de Backhand", icon: "\u{1F34C}" },
  SLICE_BH: { id: "SLICE_BH", label: "Slice de Backhand", icon: "\u{1F30A}" },
  BH_CHIP_RETURN: { id: "BH_CHIP_RETURN", label: "Chip de Backhand", icon: "\u2702\uFE0F" },
  TOPSPIN_CROSS: { id: "TOPSPIN_CROSS", label: "Topspin Cruzado", icon: "\u{1F4A5}" },
  DROP_SHOT: { id: "DROP_SHOT", label: "Drop Shot", icon: "\u{1FAB6}" },
  MOONBALL: { id: "MOONBALL", label: "Moonball", icon: "\u{1F315}" },
  TOPSPIN_PASS: { id: "TOPSPIN_PASS", label: "Passing Topspin", icon: "\u{1F3F9}" },
  SLICE_APPROACH: { id: "SLICE_APPROACH", label: "Slice de Aproxima\xE7\xE3o", icon: "\u{1F3AD}" },
  BIG_SERVE: { id: "BIG_SERVE", label: "Saque Dominador", icon: "\u26A1" },
  FLAT_SERVE_T: { id: "FLAT_SERVE_T", label: "Saque no T", icon: "\u{1F531}" },
  WIDE_SLICE_SERVE: { id: "WIDE_SLICE_SERVE", label: "Saque Slice Aberto", icon: "\u2199\uFE0F" },
  VOLLEY_FINISH: { id: "VOLLEY_FINISH", label: "Voleio Finalizador", icon: "\u{1F94A}" },
  DROP_VOLLEY: { id: "DROP_VOLLEY", label: "Drop Volley", icon: "\u{1FAE7}" },
  SWINGING_VOLLEY: { id: "SWINGING_VOLLEY", label: "Swing Volley", icon: "\u2694\uFE0F" },
  FLAT_WINNER: { id: "FLAT_WINNER", label: "Winner Flat", icon: "\u{1F525}" },
  LOB_ATTACK: { id: "LOB_ATTACK", label: "Lob Ofensivo", icon: "\u{1F308}" },
  SERVE_COMMANDER: { id: "SERVE_COMMANDER", label: "Serve Commander", icon: "\u{1F396}\uFE0F" },
  FOREHAND_FREAK: { id: "FOREHAND_FREAK", label: "Forehand Freak", icon: "\u{1F3BE}" }
};
var SIGNATURE_SHOT_KEYS = Object.keys(SIGNATURE_SHOTS);
var RALLY_PATTERNS = {
  CROSS_HEAVY: { id: "CROSS_HEAVY", label: "Cruzado Dominante", icon: "\u2197" },
  DTL_HUNTER: { id: "DTL_HUNTER", label: "Ca\xE7ador DTL", icon: "\u2192" },
  DEEP_GRINDER: { id: "DEEP_GRINDER", label: "Fund\xE3o Implac\xE1vel", icon: "\u2B07" },
  SHORT_ANGLE_BUILDER: { id: "SHORT_ANGLE_BUILDER", label: "Construtor de \xC2ngulos", icon: "\u{1F4D0}" },
  CENTRE_CONTROL: { id: "CENTRE_CONTROL", label: "Controle Central", icon: "\u2295" },
  AGGRESSIVE_EARLY: { id: "AGGRESSIVE_EARLY", label: "Ataque Precoce", icon: "\u26A1" },
  SERVE_PLUS_ONE: { id: "SERVE_PLUS_ONE", label: "Serve + 1", icon: "\u{1F3AF}" },
  NET_APPROACH: { id: "NET_APPROACH", label: "Aproxima\xE7\xE3o da Rede", icon: "\u{1F94A}" },
  DEFENSIVE_BASE: { id: "DEFENSIVE_BASE", label: "Base Defensiva", icon: "\u{1F6E1}" },
  RHYTHM_DISRUPTION: { id: "RHYTHM_DISRUPTION", label: "Quebra de Ritmo", icon: "\u{1F300}" },
  SLICE_DISRUPTOR: { id: "SLICE_DISRUPTOR", label: "Disruptor de Slice", icon: "\u{1F30A}" },
  SERVE_COMMANDER: { id: "SERVE_COMMANDER", label: "Serve Commander", icon: "\u{1F396}\uFE0F" }
};
var RALLY_PATTERN_KEYS = Object.keys(RALLY_PATTERNS);

// src/shotPhysics.js
var SPIN_MAP = {
  SAFE: 1,
  TOPSPIN: 1,
  SLICE: -1,
  DROP: -1,
  LOB: 1,
  ACCEL: 0,
  SHORT_ACCEL: 1,
  BANANA: 1,
  SLICE_SHORT: -1,
  VOLLEY: 0,
  SMASH: 0,
  // Legacy aliases
  NORMAL: 1,
  SHORT: 0,
  FLAT: 0,
  HEAVY_TOP: 1,
  PASSING: 1,
  DEF_LOB: 0,
  AGG_LOB: 1,
  LOB_DEF: 0,
  LOB_ATK: 1,
  SHORT_ANGLE: 1,
  HALF_VOLLEY: 0
};

// src/math.js
var v3 = (x, y, z = 0) => ({ x, y, z });
var v2 = (x, y) => ({ x, y });
var scale3 = (v, s) => ({ x: v.x * s, y: v.y * s, z: v.z * s });
var mag3 = (v) => Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
var norm3 = (v) => {
  const m = mag3(v) || 1e-9;
  return scale3(v, 1 / m);
};
var dist2 = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
var clamp2 = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
var rand = (a, b) => a + Math.random() * (b - a);
var movAvg = (cur, n, val) => cur + (val - cur) / (n + 1);
var cross3 = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x
});

// src/contactCoefficients.js
var CONTACT = {
  // Timing: janela de chegada (segundos)
  // Timing calibrado para pros: chegam na bola com margem razoável na maioria dos golpes.
  TIMING_EARLY: 0.1,
  // >= este → timing perfeito (1.0)
  TIMING_LATE: -0.12,
  // <= este → timing no piso (TIMING_FLOOR)
  TIMING_FLOOR: 0.72,
  // era 0.65 — pro chega na bola; sob pressão ainda acerta
  // Prep: preparação do swing
  PREP_BASE: 0.84,
  // era 0.82
  PREP_WEIGHT: 0.16,
  // Balance: equilíbrio no momento do golpe — penalidades mais suaves
  BALANCE_VEL_SCALE: 0.04,
  // era 0.06 — correndo lateralmente ainda controla
  BALANCE_DIST_SCALE: 0.07,
  // era 0.10
  // Fatigue: curvatura da queda de qualidade por stamina
  // Expoente moderado: técnica sofre com cansaço real — jogador cansado erra mais.
  // stam=1.0→1.00 | stam=0.7→0.91 | stam=0.5→0.84 | stam=0.3→0.74 | stam=0→piso
  // O piso foi reduzido: cansaço extremo SIM afeta a técnica, além do físico.
  FATIGUE_EXPONENT: 0.35,
  // era 0.25 — queda um pouco mais acentuada
  FATIGUE_FLOOR: 0.52,
  // era 0.70 — cansado extremo cai para 52% de fator
  // Pressure: penalidade tática (booleano) — suavizada, timing/balance já capturam pressão
  PRESSURE_PENALTY: 0.04,
  // era 0.10 — dupla penalidade eliminada
  // Spin: penalidade por spin alto na bola recebida
  SPIN_SCALE: 4e-3,
  // Volley: penalidade por tipo de voleio
  VOLLEY_EMERGENCY_PENALTY: 0.3,
  VOLLEY_POSITION_PENALTY: 0.1,
  // Half Volley: golpe de bloqueio imediatamente após o quique.
  // Contato em altura de tornozelo/canela — timing puro, sem backswing.
  // Mais difícil que voleio de posição, mais fácil que voleio de emergência.
  HALF_VOLLEY_PENALTY: 0.2,
  // Signature Shot: bônus de qualidade quando o jogador executa seu golpe característico.
  // Aplicado sobre finalQuality após aiDecideShot confirmar o golpe escolhido.
  // SIG_QUALITY_MULT: multiplica finalQuality (1.22 = até +22%)
  // SIG_QUALITY_CAP:  teto — mesmo com bônus não vai além de 92% (ainda pode errar)
  SIG_QUALITY_MULT: 1.22,
  SIG_QUALITY_CAP: 0.92
};

// src/ContactModel.js
function evaluateContact(ctx2, player, ball, arrivalMargin, lateralVelocity, distFromOptimal, prepScore = 0, prepQualityCeiling = 1) {
  const timingRaw = clamp2(
    (arrivalMargin - CONTACT.TIMING_LATE) / (CONTACT.TIMING_EARLY - CONTACT.TIMING_LATE),
    0,
    1
  );
  const timingFactor = CONTACT.TIMING_FLOOR + timingRaw * (1 - CONTACT.TIMING_FLOOR);
  const prepFactor = clamp2(CONTACT.PREP_BASE + prepScore * CONTACT.PREP_WEIGHT, 0, 1);
  const balancePenalty = lateralVelocity * CONTACT.BALANCE_VEL_SCALE + distFromOptimal * CONTACT.BALANCE_DIST_SCALE;
  const balanceFactor = clamp2(1 - balancePenalty, 0, 1);
  const staminaFrac = clamp2(player.stamina ?? 1, 0, 1);
  const rawFatigue = Math.pow(staminaFrac, CONTACT.FATIGUE_EXPONENT);
  const fatigueFactor = clamp2(rawFatigue, CONTACT.FATIGUE_FLOOR ?? 0.7, 1);
  const pressurePenalty = ctx2?.underPressure ? CONTACT.PRESSURE_PENALTY : 0;
  const pressureFactor = clamp2(1 - pressurePenalty, 0, 1);
  const spinMag = Math.sqrt(
    (ball.spin?.x ?? 0) ** 2 + (ball.spin?.y ?? 0) ** 2 + (ball.spin?.z ?? 0) ** 2
  );
  const spinControlFactor = clamp2(1 - spinMag * CONTACT.SPIN_SCALE, 0, 1);
  const vt = player._volleyType;
  const volleyPenalty = vt === "emergency" ? CONTACT.VOLLEY_EMERGENCY_PENALTY : vt === "position" ? CONTACT.VOLLEY_POSITION_PENALTY : 0;
  const volleyFactor = 1 - volleyPenalty;
  const halfVolleyFactor = player._halfVolleyContext ? 1 - CONTACT.HALF_VOLLEY_PENALTY : 1;
  const rawQuality = clamp2(
    timingFactor * prepFactor * balanceFactor * fatigueFactor * pressureFactor * spinControlFactor * volleyFactor * halfVolleyFactor,
    0.02,
    1
  );
  const quality = clamp2(rawQuality, 0.02, prepQualityCeiling);
  return {
    quality,
    timingFactor,
    prepFactor,
    balanceFactor,
    fatigueFactor,
    pressureFactor,
    spinControlFactor,
    volleyFactor,
    halfVolleyFactor
  };
}

// src/aiCoefficients.js
var AI = {
  // Multiplicador global de erro via EV — reduzir se UE total subir demais após Fase C
  ERROR_SCALE: 1,
  // Escala de conversão de evProbError → delta no ueChance de game.js
  // (evProbError - EV_ERROR_BASELINE) * EV_ERROR_WEIGHT = delta aplicado no lugar de shotTypeRisk
  EV_ERROR_BASELINE: 0.06,
  // probabilidade de erro "neutra" — abaixo reduz UE, acima aumenta
  EV_ERROR_WEIGHT: 0.3,
  // sensibilidade: quanto o evProbError influencia o ueChance
  MOMENTUM: {
    EWMA_ALPHA: 0.1,
    HIGH_THRESHOLD: 0.75,
    LOW_THRESHOLD: 0.3,
    BREAK_THRESHOLD: 0.18
  },
  INTENT: {
    // Bola difícil
    TOUGH_RESET_PROB: 0.72,
    // toughBall → RESET
    // Janela de serviço: sacador com bola fraca do adversário
    SERVE_ADV_FINISH: 0.65,
    // weakReturnBoost alto → FINISH
    SERVE_ADV_PRESSURE: 0.75,
    // weakReturnBoost médio → PRESSURE
    // Bola fácil
    EASY_INCONTROL_BASE: 0.7,
    // inControl + oppOut>0.55 → FINISH
    EASY_INCONTROL_CONSERV: 0.55,
    // inControl + oppOut<=0.55 → FINISH
    EASY_NOCONTROL_PRESSURE: 0.45,
    // sem controle → PRESSURE
    EASY_NOCONTROL_BUILD: 0.35,
    // sem controle + pior → BUILD
    // Neutro
    NEUTRAL_EARLY_BUILD: 0.7,
    // early rally → BUILD
    NEUTRAL_OPEN_PRESS: 0.6,
    // oppOut + mom altos → PRESSURE
    NEUTRAL_PRESSURE_RESET: 0.65,
    // oppPressure alto → RESET
    NEUTRAL_BASE_PRESSURE: 0.82,
    // distribuição default: <0.50 BUILD, <0.82 PRESSURE, else FINISH
    // Modificadores de estilo
    AGG_EASY_FINISH: 0.4,
    // AGG_BASELINER PRESSURE → chance de FINISH
    SRVVOL_NEUTRAL_PRESSURE: 0.6,
    // SRV_VOL BUILD → PRESSURE
    BIG_EASY_FINISH: 0.55,
    // BIG_SERVER easyBall → FINISH
    BIG_NEUTRAL_PRESSURE: 0.65
    // BIG_SERVER neutralBall BUILD → PRESSURE
  },
  SOFTMAX_TEMPERATURE: {
    BASE: 0.18,
    HIGH_MOOD: 0.22,
    LOW_MOOD: 0.12
  },
  // FIX: EV_FLOOR_RATIO relaxado de 0.72/0.82 → 0.62/0.72.
  // Antes: BODY/CTR dominava o EV (risco direcional 0.70 = menor), candidatos de ângulo
  // caíam abaixo do floor e eram descartados ANTES do softmax.
  // Agora: candidatos de DTL/WIDE/SHORT_ANGLE chegam ao pool e competem via temperatura.
  EV_FLOOR_RATIO: {
    RALLY: 0.62,
    // era NORMAL (renomeado — sem relação com shot type)
    FINISH: 0.72
  },
  EV_FLOOR_ABS_GAP: {
    RALLY: 0.14,
    // era NORMAL
    FINISH: 0.12
  },
  // ── FASE 1.3 — Rigidez tática por estilo ──────────────────────────────
  // Controla com quantas repetições fracassadas o flag _matchRead.insisting vira true.
  // 1.0 = máximo rígido (nunca insiste), 0.0 = mínimo (muda de plano a qualquer falha).
  // Na prática: rigidity * 5 = número de shots repetidos sem sucesso antes de insisting=true.
  TACTICAL_RIGIDITY: {
    GRINDER: 0.8,
    // joga o mesmo padrão até funcionar — identidade do estilo
    RETRIEVER: 0.75,
    // defesa paciente, não muda por capricho
    NET_SPECIALIST: 0.7,
    // rígido na estratégia de rede — não recua por uma falha
    SRV_VOL: 0.7,
    // serve-and-volley é o plano, sempre
    CTR_PUNCHER: 0.6,
    // adapta quando necessário
    AGG_BASELINER: 0.55,
    POWER_BASELINER: 0.5,
    ALL_COURT: 0.45,
    // versátil por natureza
    BIG_SERVER: 0.55,
    MOMENTUM_PLAYER: 0.4,
    // muda rápido conforme o humor do jogo
    TACTICAL_TECHNICIAN: 0.3,
    // ajusta o plano frequentemente — DNA do estilo
    TAKEALLRISK: 0.2
    // caótico — muda a qualquer momento
  }
};

// src/attributes.js
function softCap(v, threshold = 90, scale = 0.45) {
  if (v <= threshold)
    return v;
  return threshold + (v - threshold) * scale;
}
function getWingPotencia(attrs, isBackhand) {
  return isBackhand ? attrs.bhPotencia ?? attrs.potencia ?? 60 : attrs.fhPotencia ?? attrs.potencia ?? 65;
}
function getWingControle(attrs, isBackhand) {
  return isBackhand ? attrs.bhControle ?? attrs.controle ?? 60 : attrs.fhControle ?? attrs.controle ?? 60;
}
function computePlayerMods(attrs) {
  const speedMult = 0.72 + attrs.velocidade / 100 * 0.5;
  const accelMult = 0.72 + attrs.explosividade / 100 * 0.56;
  const decelMult = 0.72 + softCap(attrs.explosividade) / 100 * 0.56;
  const reachBonus = (attrs.explosividade - 50) / 100 * 0.22;
  const staminaDecayMult = 1.55 - softCap(attrs.resistencia, 88, 0.35) / 100 * 1.05;
  const defensaMult = 0.6 + softCap(attrs.defesa, 88, 0.45) / 100 * 0.65;
  const fhBallSpeedMult = 0.7 + attrs.fhPotencia / 100 * 0.56;
  const fhPrecisaoFactor = 0.7 + softCap(attrs.fhControle, 90, 0.45) / 100 * 0.59;
  const bhBallSpeedMult = 0.7 + attrs.bhPotencia / 100 * 0.56;
  const bhPrecisaoFactor = 0.7 + softCap(attrs.bhControle, 90, 0.45) / 100 * 0.59;
  const topspinMult = 0.6 + attrs.topspin / 100 * 0.75;
  const sliceMult = 0.6 + attrs.slice / 100 * 0.75;
  const serveForcaMult1 = 0.7 + attrs.saqueForca / 100 * 0.56;
  const serveForcaMult2 = 0.78 + attrs.saqueForca / 100 * 0.38;
  const servePrecisaoMult = 0.8 + attrs.saquePrecisao / 100 * 0.45;
  const serveScatter = Math.max(0.35, 1.4 - attrs.saquePrecisao / 100);
  const returnMult = 0.45 + softCap(attrs.devolucao, 90, 0.4) / 100 * 0.52;
  const volleyMult = 0.55 + attrs.volley / 100 * 0.8;
  const reflexoQualBonus = (attrs.volley - 50) / 100 * 0.35;
  const lobCovMult = 0.55 + attrs.volley / 100 * 0.55;
  const smashMult = 0.55 + attrs.smash / 100 * 0.8;
  const netVSAvg = (attrs.volley + attrs.smash) / 2;
  const netApproachMult = 0.4 + netVSAvg / 100 * 1.4;
  const leituraFactor = attrs.leitura / 100;
  const visaoFactor = attrs.visaoTatica / 100;
  const patienceRallyMin = Math.round(2 + (100 - attrs.visaoTatica) / 100 * 6);
  const mentalFactor = attrs.mentalidade / 100;
  const pressaoFactor = mentalFactor;
  const clutchFactor = mentalFactor;
  const recupFactor = attrs.recuperacao / 100;
  const adaptacaoFactor = attrs.adaptacao / 100;
  const varFactor = attrs.regularidade / 100;
  return {
    // Corpo
    speedMult,
    accelMult,
    decelMult,
    reachBonus,
    staminaDecayMult,
    defensaMult,
    // Golpes asa-específicos
    fhBallSpeedMult,
    fhPrecisaoFactor,
    bhBallSpeedMult,
    bhPrecisaoFactor,
    topspinMult,
    sliceMult,
    // Saque & Retorno
    serveForcaMult1,
    serveForcaMult2,
    servePrecisaoMult,
    serveScatter,
    returnMult,
    // Rede
    volleyMult,
    smashMult,
    netApproachMult,
    reflexoQualBonus,
    lobCovMult,
    // Leitura & Tática
    leituraFactor,
    visaoFactor,
    patienceRallyMin,
    // Cabeça
    mentalFactor,
    pressaoFactor,
    clutchFactor,
    recupFactor,
    adaptacaoFactor,
    varFactor,
    // ── Compat aliases para código ainda não migrado ────────────────
    ballSpeedMult: fhBallSpeedMult,
    // fallback: FH como default
    precisaoFactor: fhPrecisaoFactor,
    netMult: volleyMult,
    volleyFactor: volleyMult,
    serveMult1: serveForcaMult1,
    serveMult2: serveForcaMult2,
    agressFactor: visaoFactor,
    agresDecFactor: visaoFactor
  };
}
function migrateAttrsToV3(oldAttrs) {
  if (!oldAttrs)
    return null;
  if (oldAttrs.fhPotencia !== void 0 && oldAttrs.saqueForca !== void 0) {
    return { ...oldAttrs };
  }
  if (oldAttrs.potencia !== void 0) {
    const potencia = oldAttrs.potencia ?? 65;
    const controle = oldAttrs.controle ?? 65;
    const saque = oldAttrs.saque ?? 65;
    const jdr = oldAttrs.jogoDeRede ?? 60;
    const aggr = oldAttrs.agressividade ?? 60;
    const leitura = oldAttrs.leitura ?? 65;
    const mental = oldAttrs.mentalidade ?? 70;
    const reg = oldAttrs.regularidade ?? 70;
    const vel = oldAttrs.velocidade ?? 70;
    const res = oldAttrs.resistencia ?? 70;
    return {
      velocidade: vel,
      explosividade: oldAttrs.explosividade ?? 70,
      resistencia: res,
      defesa: Math.round(controle * 0.5 + vel * 0.3 + res * 0.2),
      fhPotencia: potencia,
      fhControle: controle,
      bhPotencia: Math.round(potencia * 0.92),
      bhControle: Math.round(controle * 0.95),
      topspin: oldAttrs.topspin ?? 65,
      slice: oldAttrs.slice ?? 65,
      saqueForca: saque,
      saquePrecisao: saque,
      devolucao: oldAttrs.devolucao ?? 65,
      volley: jdr,
      smash: Math.round(jdr * 0.9),
      leitura,
      visaoTatica: Math.round(leitura * 0.6 + aggr * 0.4),
      mentalidade: mental,
      regularidade: reg,
      recuperacao: Math.round(mental * 0.7 + reg * 0.3),
      adaptacao: Math.round(leitura * 0.5 + mental * 0.5)
    };
  }
  return {
    velocidade: oldAttrs.velocidade ?? 70,
    explosividade: oldAttrs.explosividade ?? 70,
    resistencia: oldAttrs.resistencia ?? 70,
    defesa: Math.round((oldAttrs.velocidade ?? 70) * 0.3 + (oldAttrs.consistencia ?? 70) * 0.5 + (oldAttrs.resistencia ?? 70) * 0.2),
    fhPotencia: oldAttrs.fhPotencia ?? oldAttrs.potencia ?? 65,
    fhControle: Math.round((oldAttrs.fhPotencia ?? 65) * 0.4 + (oldAttrs.consistencia ?? 65) * 0.6),
    bhPotencia: oldAttrs.bhPotencia ?? Math.round((oldAttrs.potencia ?? 65) * 0.92),
    bhControle: Math.round((oldAttrs.bhPotencia ?? 60) * 0.4 + (oldAttrs.consistencia ?? 65) * 0.6),
    topspin: oldAttrs.topspin ?? 65,
    slice: oldAttrs.slice ?? 65,
    saqueForca: Math.round(((oldAttrs.srv1Vel ?? 70) + (oldAttrs.srv2Efeito ?? 60)) / 2),
    saquePrecisao: Math.round(((oldAttrs.srv1Prec ?? 70) + (oldAttrs.srv2Efeito ?? 65)) / 2),
    devolucao: oldAttrs.devolucaoSaque ?? 65,
    volley: Math.round(((oldAttrs.volley ?? 60) + (oldAttrs.instintoRede ?? 55) + (oldAttrs.reflexo ?? 60)) / 3),
    smash: Math.round(((oldAttrs.coberturaLob ?? 55) + (oldAttrs.reflexo ?? 60)) / 2),
    leitura: oldAttrs.leituraDeJogo ?? 65,
    visaoTatica: Math.round((oldAttrs.leituraDeJogo ?? 65) * 0.6 + (oldAttrs.agresDecisoria ?? 60) * 0.4),
    mentalidade: oldAttrs.mentalidade ?? 70,
    regularidade: Math.round((oldAttrs.consistencia ?? 70) * 0.5 + (oldAttrs.mentalidade ?? 70) * 0.3 + (oldAttrs.paciencia ?? 65) * 0.2),
    recuperacao: Math.round(((oldAttrs.recuperacao ?? 65) + (oldAttrs.mentalidade ?? 70)) / 2),
    adaptacao: Math.round((oldAttrs.leituraDeJogo ?? 65) * 0.5 + (oldAttrs.mentalidade ?? 70) * 0.5)
  };
}
function matchDayVar(regularidade) {
  const stability = regularidade / 100;
  const badChance = 0.3 * (1 - stability * 0.8);
  const greatChance = 0.12 * (0.75 + stability * 0.25);
  const r = Math.random();
  if (r < badChance)
    return -(0.03 + Math.random() * 0.09);
  if (r < badChance + greatChance)
    return 0.01 + Math.random() * 0.07;
  const u = Math.random(), v = Math.random();
  const normal = Math.sqrt(-2 * Math.log(u || 1e-3)) * Math.cos(2 * Math.PI * v);
  return normal * 0.015 * (1 - stability * 0.6);
}
function recoveryBoost(recuperacao) {
  const r = recuperacao / 100;
  const boostChance = 0.1 + r * 0.45;
  const spiralChance = 0.25 - r * 0.22;
  const roll = Math.random();
  if (roll < spiralChance)
    return -(0.02 + Math.random() * 0.06);
  if (roll < spiralChance + boostChance)
    return 0.03 + Math.random() * 0.08;
  return 0;
}

// src/EnvironmentSystem.js
var TIME_PRESETS = {
  morning: { hour: 10, ambientColor: "#b8d8f0", skyTint: "#a0c8e8", shadowDir: -0.7, bright: 0.88 },
  afternoon: { hour: 14, ambientColor: "#ffd88a", skyTint: "#f0c060", shadowDir: 0, bright: 1 },
  evening: { hour: 18, ambientColor: "#ff9040", skyTint: "#e06020", shadowDir: 0.6, bright: 0.78 },
  indoor: { hour: 20, ambientColor: "#e8eeff", skyTint: "#c0ccff", shadowDir: 0, bright: 0.95 }
};
var COURT_ENV = {
  WIMBLEDON: {
    wind: { maxStrength: 3, baseDir: 0.7, gustProb: 0.018, gustMult: 1.6 },
    humidity: 0.6,
    timePreset: "afternoon",
    description: "Sea breeze, moderate gusts"
  },
  ROLAND_GARROS: {
    wind: { maxStrength: 2.2, baseDir: 1.2, gustProb: 0.01, gustMult: 1.4 },
    humidity: 0.72,
    // heavy Parisian humidity
    timePreset: "afternoon",
    description: "Humid, calm winds. Heavy clay."
  },
  US_OPEN: {
    wind: { maxStrength: 2.8, baseDir: -0.5, gustProb: 0.015, gustMult: 1.5 },
    humidity: 0.55,
    timePreset: "afternoon",
    description: "New York wind, unpredictable"
  },
  O2_ARENA: {
    wind: { maxStrength: 0, baseDir: 0, gustProb: 0, gustMult: 1 },
    humidity: 0.4,
    timePreset: "indoor",
    description: "Controlled indoor environment"
  },
  QUEENS_CLUB: {
    wind: { maxStrength: 3.8, baseDir: 0.9, gustProb: 0.022, gustMult: 1.8 },
    humidity: 0.55,
    timePreset: "morning",
    description: "Strong London gusts, morning dew"
  },
  MONTE_CARLO: {
    wind: { maxStrength: 1.5, baseDir: 0.3, gustProb: 8e-3, gustMult: 1.3 },
    humidity: 0.68,
    timePreset: "afternoon",
    description: "Mediterranean calm, warm air"
  },
  INDIAN_WELLS: {
    wind: { maxStrength: 1.8, baseDir: -0.2, gustProb: 0.012, gustMult: 1.4 },
    humidity: 0.22,
    // desert dry
    timePreset: "afternoon",
    description: "Desert dry, altitude boost"
  },
  BERCY: {
    wind: { maxStrength: 0, baseDir: 0, gustProb: 0, gustMult: 1 },
    humidity: 0.48,
    timePreset: "indoor",
    description: "Indoor Parisian atmosphere"
  }
};
function osc(time, freq1, freq2, phase1 = 0, phase2 = 0.7) {
  return Math.sin(time * freq1 + phase1) * 0.6 + Math.sin(time * freq2 + phase2) * 0.4;
}
function initEnvironment(gs) {
  const courtKey = gs.courtKey ?? "US_OPEN";
  const preset = COURT_ENV[courtKey] ?? COURT_ENV.US_OPEN;
  const timeP = TIME_PRESETS[preset.timePreset] ?? TIME_PRESETS.afternoon;
  const physics = gs.courtPhysics ?? {};
  const isIndoor = gs.courtMeta?.surface === "INDOOR";
  const baseDir = preset.wind.baseDir + (Math.random() - 0.5) * 0.6;
  gs.environment = {
    // ── Wind ──────────────────────────────────────────────────
    windDir: baseDir,
    // radians (0 = court length direction)
    windStrength: isIndoor ? 0 : preset.wind.maxStrength * Math.random() * 0.6,
    maxWindStrength: preset.wind.maxStrength,
    gustProb: preset.wind.gustProb,
    gustMult: preset.wind.gustMult,
    gustActive: false,
    gustTimer: 0,
    gustDuration: 0,
    gustTarget: 0,
    windTimer: Math.random() * 100,
    // random start phase
    isIndoor,
    // ── Altitude ──────────────────────────────────────────────
    // Altitude real em metros derivada do altitudeFactor da quadra.
    // Fórmula barométrica padrão: ρ = ρ₀ × e^(-h/8500)
    // altitudeFactor 1.00 → nível do mar (0m)   → ρ = 1.200
    // altitudeFactor 1.05 → ~425m (Miami/AO)    → ρ ≈ 1.141
    // altitudeFactor 1.10 → ~840m (Indian Wells) → ρ ≈ 1.101
    altitudeFactor: physics.altitudeFactor ?? 1,
    altitudeMetres: Math.log(physics.altitudeFactor ?? 1) * 8500,
    airDensity: 1.2 * Math.exp(-Math.log(physics.altitudeFactor ?? 1)),
    // dragMult mantido para compatibilidade com código legado (não mais usado em physics)
    dragMult: 1 / (physics.altitudeFactor ?? 1),
    // ── Humidity ──────────────────────────────────────────────
    humidity: preset.humidity,
    // Extra groundFriction from humidity (clay especially)
    humidityFrictionAdd: gs.courtMeta?.surface === "CLAY" ? preset.humidity * 0.06 : 0,
    // ── Time of day / Light ────────────────────────────────────
    timePreset: preset.timePreset,
    ambientColor: timeP.ambientColor,
    skyTint: timeP.skyTint,
    shadowDir: timeP.shadowDir,
    bright: timeP.bright,
    hour: timeP.hour,
    // ── Meta ────────────────────────────────────────────────────
    courtKey,
    description: preset.description,
    // ── Live display info ──────────────────────────────────────
    windDisplayKmh: 0,
    // computed each update
    windDisplayDir: "",
    // 'N', 'NE', etc.
    // ── Running time ───────────────────────────────────────────
    time: 0
  };
  _updateWindDisplay(gs.environment);
}
function updateEnvironment(gs, dt) {
  const env = gs.environment;
  if (!env)
    return;
  env.time += dt;
  if (env.isIndoor)
    return;
  env.windDir += osc(env.time, 0.03, 0.07) * dt * 0.12;
  const baseStrength = env.maxWindStrength * (0.35 + 0.65 * Math.abs(osc(env.time, 0.05, 0.13, 1.1, 2.3)));
  env.windStrength = baseStrength;
  if (env.gustActive) {
    env.gustTimer -= dt;
    if (env.gustTimer <= 0) {
      env.gustActive = false;
      env.gustTimer = 0;
    }
  } else {
    if (Math.random() < env.gustProb * dt * 60) {
      env.gustActive = true;
      env.gustDuration = 0.8 + Math.random() * 1.5;
      env.gustTimer = env.gustDuration;
      env.gustDir = env.windDir + (Math.random() - 0.5) * 0.8;
      env.gustStrength = env.windStrength * env.gustMult;
      if (gs.log && env.gustStrength > 2.5) {
        const kmh = Math.round(env.gustStrength * 3.6);
        gs.log.push(`\u{1F4A8} [RAJADA] ${kmh} km/h`);
      }
    }
  }
  env.humidity += (Math.random() - 0.5) * 2e-3 * dt;
  env.humidity = Math.max(0.1, Math.min(0.95, env.humidity));
  env.humidityFrictionAdd = gs.courtMeta?.surface === "CLAY" ? env.humidity * 0.06 : 0;
  _updateWindDisplay(env);
}
function applyWindToBall(ball, env, dt) {
  if (!env || !ball.inFlight)
    return;
  if (env.isIndoor)
    return;
  const activeDir = env.gustActive ? env.gustDir : env.windDir;
  const activeStrength = env.gustActive ? env.gustStrength : env.windStrength;
  if (activeStrength < 0.05)
    return;
  const windVx = Math.cos(activeDir) * activeStrength;
  const windVy = Math.sin(activeDir) * activeStrength * 0.5;
  const diffX = windVx - ball.vel.x;
  const diffY = windVy - ball.vel.y;
  const airDensity = env.airDensity ?? 1.2;
  const { PHYSICS: _P, BALL_AREA: _A } = { PHYSICS: { ballMass: 0.057 }, BALL_AREA: Math.PI * 0.033 ** 2 };
  const windForceCoef = 0.5 * 0.55 * airDensity * (Math.PI * 0.033 ** 2) / 0.057 * 0.08;
  const heightFactor = Math.min(1, 0.15 + ball.pos.z * 0.85);
  ball.vel.x += diffX * windForceCoef * dt * heightFactor;
  ball.vel.y += diffY * windForceCoef * dt * heightFactor;
}
function _updateWindDisplay(env) {
  const activeStrength = env.gustActive ? env.gustStrength : env.windStrength;
  const activeDir = env.gustActive ? env.gustDir : env.windDir;
  env.windDisplayKmh = Math.round(activeStrength * 3.6);
  const deg = (activeDir * 180 / Math.PI % 360 + 360) % 360;
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  env.windDisplayDir = dirs[Math.round(deg / 45) % 8];
}

// src/playerPrefs.js
function generatePrefs(attrs) {
  const {
    agressividade: ag = 60,
    controle: ct = 60,
    leitura: lr = 60,
    mentalidade: mn = 60,
    topspin: ts = 60,
    jogoDeRede: jr = 60,
    slice: sl = 60,
    saqueForca: sf = attrs?.saque ?? 60,
    saquePrecisao: sp = attrs?.saque ?? 60,
    visaoTatica: vt = attrs?.agressividade ?? 60
  } = attrs;
  let buildStyle;
  if (ag >= 82 && ts >= 80)
    buildStyle = "CROSS_DOMINANT";
  else if (ag >= 72 && lr >= 82)
    buildStyle = "DTL_HUNTER";
  else if (ag >= 68)
    buildStyle = "CROSS_BUILDER";
  else if (ct >= 85 && ag <= 55)
    buildStyle = "CENTRE_CONTROL";
  else if (lr >= 82)
    buildStyle = "VARIED";
  else
    buildStyle = "CROSS_BUILDER";
  let netGame;
  if (jr >= 82 && ag >= 72)
    netGame = "HUNTER";
  else if (jr >= 74 || ag >= 80)
    netGame = "PROACTIVE";
  else if (jr >= 62 || ag >= 68)
    netGame = "OPPORTUNIST";
  else if (jr <= 55 && ag <= 55)
    netGame = "AVOIDS";
  else
    netGame = "RELUCTANT";
  let rallyCadence;
  if (ag >= 88)
    rallyCadence = "EXPLOSIVE";
  else if (ag >= 76)
    rallyCadence = "EARLY_ATTACK";
  else if (ag >= 62)
    rallyCadence = "BALANCED";
  else if (ct >= 82 && ag <= 55)
    rallyCadence = "PATIENT";
  else
    rallyCadence = "MEASURED";
  let riskProfile;
  if (ag >= 88 && ct <= 72)
    riskProfile = "ALLOUT";
  else if (ag >= 80)
    riskProfile = "GAMBLER";
  else if (ag >= 65)
    riskProfile = "CALCULATED";
  else if (ct >= 85 && ag <= 55)
    riskProfile = "SAFETY_FIRST";
  else if (ct >= 75 && ag <= 65)
    riskProfile = "SAFE";
  else
    riskProfile = "CALCULATED";
  const adaptability = Math.round(mn * 0.55 + lr * 0.45);
  let serveProfile;
  if (sf >= 86 && sp >= 74)
    serveProfile = "CANNON";
  else if (sp >= 85 && vt >= 78)
    serveProfile = "PRECISION";
  else if (ts >= 82 && sp >= 72)
    serveProfile = "KICK_BUILDER";
  else if (sl >= 80 && ag >= 68)
    serveProfile = "WIDE_OPENER";
  else if (sf >= 74 && (vt >= 74 || jr >= 70))
    serveProfile = "BODY_JAMMER";
  else
    serveProfile = "BALANCED";
  let serve1Bias = "MIXED";
  let serve2Bias = "SAFE";
  switch (serveProfile) {
    case "CANNON":
      serve1Bias = "POWER";
      serve2Bias = sp >= 76 ? "T" : "BODY";
      break;
    case "PRECISION":
      serve1Bias = "T";
      serve2Bias = "T";
      break;
    case "BODY_JAMMER":
      serve1Bias = "BODY";
      serve2Bias = "BODY";
      break;
    case "WIDE_OPENER":
      serve1Bias = "WIDE";
      serve2Bias = sl >= 74 ? "SLICE" : "SAFE";
      break;
    case "KICK_BUILDER":
      serve1Bias = ts >= 76 ? "SHAPE" : "T";
      serve2Bias = "KICK";
      break;
    default:
      serve1Bias = sf >= 78 ? "POWER" : sp >= 76 ? "T" : "MIXED";
      serve2Bias = ts >= 72 ? "KICK" : "SAFE";
      break;
  }
  let pressureServe;
  if (mn >= 84 && sp >= 80)
    pressureServe = "SPOT";
  else if (sf >= 87 && ag >= 76)
    pressureServe = "BOLD";
  else if (ts >= 80 && sp >= 70)
    pressureServe = "KICK_TRUST";
  else if (vt >= 76 && sf >= 72)
    pressureServe = "BODY_LOCK";
  else
    pressureServe = "SAFE_RESET";
  return {
    buildStyle,
    netGame,
    rallyCadence,
    riskProfile,
    adaptability,
    serveProfile,
    serve1Bias,
    serve2Bias,
    pressureServe
  };
}
function mergeGeneratedPrefs(attrs, prefs = {}) {
  const generated = generatePrefs(attrs ?? {});
  return { ...generated, ...prefs ?? {} };
}

// src/ballOutputEngine.js
var SHOT_SIGMA = {
  // σBase calibrado para Q_médio=70%: FLAT DTL com Q=70% → P(erro)~8-10%
  // ATP pros erram ~28-32 NF/jogo — maioria em shots agressivos perto das linhas.
  // NOTA: σBase agora é modulado por Q em computeSigmaX (não é 100% fixo).
  // Em OPPORTUNITY (Q=86-95%), σBase é reduzido ~50%. Em DIFFICULT (Q<25%), quase integral.
  // Valores reduzidos para refletir que em alta qualidade o erro base é menor.
  FLAT: { \u03C3Base: 0.26, \u03C3XMax: 0.95, \u03C3AMax: 6, sqThresh: 0.75, dirRisk: { CC: 1, DTL: 1.6, WIDE: 2.2 } },
  SAFE: { \u03C3Base: 0.08, \u03C3XMax: 0.52, \u03C3AMax: 3.2, sqThresh: 0.42, dirRisk: { CC: 1, DTL: 1.3, WIDE: 1.6 } },
  TOPSPIN: { \u03C3Base: 0.15, \u03C3XMax: 0.72, \u03C3AMax: 4.5, sqThresh: 0.55, dirRisk: { CC: 1, DTL: 1.6, WIDE: 2.2 } },
  HEAVY_TOP: { \u03C3Base: 0.2, \u03C3XMax: 0.82, \u03C3AMax: 5, sqThresh: 0.6, dirRisk: { CC: 1, DTL: 1.6, WIDE: 2.2 } },
  SLICE: { \u03C3Base: 0.09, \u03C3XMax: 0.65, \u03C3AMax: 3.5, sqThresh: 0.48, dirRisk: { CC: 1, DTL: 1.4, WIDE: 1.8 } },
  SLICE_SHORT: { \u03C3Base: 0.09, \u03C3XMax: 0.58, \u03C3AMax: 4, sqThresh: 0.52, dirRisk: { CC: 1, DTL: 1.4, WIDE: 1.8 } },
  DROP: { \u03C3Base: 0.12, \u03C3XMax: 0.45, \u03C3AMax: 9, sqThresh: 0.62, dirRisk: { CC: 1, DTL: 1.2, WIDE: 1.6 } },
  BANANA: { \u03C3Base: 0.16, \u03C3XMax: 0.7, \u03C3AMax: 4.5, sqThresh: 0.62, dirRisk: { CC: 1.2, DTL: 1.4, WIDE: 2.4 } },
  PASSING: { \u03C3Base: 0.2, \u03C3XMax: 0.72, \u03C3AMax: 5, sqThresh: 0.58, dirRisk: { CC: 1, DTL: 1.8, WIDE: 2.4 } },
  SHORT_ANGLE: { \u03C3Base: 0.22, \u03C3XMax: 0.76, \u03C3AMax: 5, sqThresh: 0.65, dirRisk: { CC: 1, DTL: 1.5, WIDE: 2.6 } },
  // ACCEL e SHORT_ACCEL — os mais agressivos do sistema, σ mais alto
  ACCEL: { \u03C3Base: 0.22, \u03C3XMax: 0.95, \u03C3AMax: 6, sqThresh: 0.7, dirRisk: { CC: 1, DTL: 1.7, WIDE: 2.3 } },
  SHORT_ACCEL: { \u03C3Base: 0.17, \u03C3XMax: 0.78, \u03C3AMax: 5.2, sqThresh: 0.62, dirRisk: { CC: 1, DTL: 1.5, WIDE: 2.4 } },
  // ── Net shots ────────────────────────────────────────────────────────────
  VOLLEY: {
    \u03C3Base: 0.1,
    \u03C3XMax: 0.6,
    \u03C3AMax: 4,
    sqThresh: 0.58,
    dirRisk: { CC: 1, DTL: 1.5, WIDE: 2 },
    reflexSigmaXMult: 2.2,
    reflexSigmaAMult: 2.3
  },
  HALF_VOLLEY: { \u03C3Base: 0.2, \u03C3XMax: 0.9, \u03C3AMax: 6.5, sqThresh: 0.72, dirRisk: { CC: 1, DTL: 1.6, WIDE: 2 } },
  SMASH: { \u03C3Base: 0.12, \u03C3XMax: 0.72, \u03C3AMax: 5.5, sqThresh: 0.68, dirRisk: { CC: 1, DTL: 1.3, WIDE: 1.8 } },
  LOB: { \u03C3Base: 0.15, \u03C3XMax: 0.9, \u03C3AMax: 2.8, sqThresh: 0.48, dirRisk: { CC: 1, DTL: 1.2, WIDE: 1.5 } },
  // Legacy aliases mantidos para compatibilidade
  LOB_DEF: { \u03C3Base: 0.16, \u03C3XMax: 1.05, \u03C3AMax: 2.5, sqThresh: 0.45, dirRisk: { CC: 1, DTL: 1.2, WIDE: 1.4 } },
  LOB_ATK: { \u03C3Base: 0.14, \u03C3XMax: 0.8, \u03C3AMax: 3, sqThresh: 0.55, dirRisk: { CC: 1, DTL: 1.3, WIDE: 1.6 } }
};
var DEFAULT_SIGMA = { \u03C3Base: 0.1, \u03C3XMax: 0.65, \u03C3AMax: 4.5, sqThresh: 0.65, dirRisk: { CC: 1, DTL: 1.6, WIDE: 2 } };
function detectDirection(targetX, playerX, halfS) {
  const absT = Math.abs(targetX);
  if (absT > halfS * 0.82)
    return "WIDE";
  const px = playerX ?? 0;
  if (Math.abs(px) > 0.5 && Math.sign(targetX) === Math.sign(px))
    return "DTL";
  return "CC";
}
function ctrlDiv(ctrlAttr) {
  const t = (ctrlAttr ?? 50) / 100;
  return 0.52 + t * t * 1.13 + t * 0.18;
}
function potenciaSigmaBias(potAttr) {
  return -0.1 + potAttr / 100 * 0.25;
}
function computeSigmaX(shotType, sq, targetX, halfS, ctrlAttr, potAttr, swingType, playerX) {
  const s = SHOT_SIGMA[shotType] ?? DEFAULT_SIGMA;
  let sigmaBase = s.\u03C3XMax;
  if (swingType === "REFLEX" && s.reflexSigmaXMult) {
    sigmaBase *= s.reflexSigmaXMult;
  }
  const dir = detectDirection(targetX, playerX ?? 0, halfS);
  const dirMult = s.dirRisk[dir] ?? 1;
  const rawCDiv = ctrlDiv(ctrlAttr ?? 50);
  const cDiv = Math.min(rawCDiv, 1.8);
  const pBias = 1 + potenciaSigmaBias(potAttr ?? 50);
  const sqFactor = Math.pow(Math.max(0, 1 - sq), 0.75);
  const sigmaBaseFactor = 0.3 + Math.pow(Math.max(0, 1 - sq), 0.6) * 0.7;
  const sigmaFixed = (s.\u03C3Base ?? 0) * sigmaBaseFactor;
  const sigma = (sigmaFixed + sigmaBase * sqFactor) * dirMult * pBias / cDiv;
  return Math.max(0, sigma);
}
function applyAngleNoise(baseClearance, shotType, sq, ctrlAttr, swingType) {
  const s = SHOT_SIGMA[shotType] ?? DEFAULT_SIGMA;
  let sigmaAngleDeg = s.\u03C3AMax * (1 - sq) / ctrlDiv(ctrlAttr ?? 50);
  if (swingType === "REFLEX" && s.reflexSigmaAMult) {
    sigmaAngleDeg *= s.reflexSigmaAMult;
  }
  const u1 = Math.max(1e-7, Math.random());
  const u2 = Math.random();
  const rNorm = Math.min(2.5, Math.sqrt(-2 * Math.log(u1))) * Math.cos(2 * Math.PI * u2);
  const clearanceNoise = rNorm * sigmaAngleDeg * 0.042;
  const appliedNoise = clearanceNoise < 0 ? clearanceNoise : clearanceNoise * 0.4;
  return Math.max(0.01, baseClearance + appliedNoise);
}
function getAtpSpinMultipliers(shotType, attrs, mods, sq = 1) {
  const topAttr = attrs?.topspin ?? 50;
  const slcAttr = attrs?.slice ?? 50;
  const netAttr = attrs?.smash ?? attrs?.jogoDeRede ?? 50;
  const atpTopMult = 0.72 + topAttr / 100 * 0.77;
  const atpSlcMult = 0.72 + slcAttr / 100 * 0.77;
  const atpNetMult = 0.72 + netAttr / 100 * 0.77;
  const spinQFactor = 0.3 + Math.pow(Math.max(0, sq), 0.8) * 0.7;
  const styleTopspin = mods?.topspinMult ?? 1;
  const styleSlice = mods?.sliceMult ?? 1;
  const styleSmash = 1;
  return {
    topspinMult: Math.min(1.8, atpTopMult * spinQFactor * styleTopspin),
    sliceMult: Math.min(1.8, atpSlcMult * spinQFactor * styleSlice),
    smashMult: Math.min(1.6, atpNetMult * spinQFactor * styleSmash)
  };
}

// src/physics.js
var DEFAULT_INTERCEPT_PROFILE = Object.freeze({
  preferredContactZ: 0.75,
  minContactZ: 0.45,
  maxContactZ: 1.2,
  contactBand: 0.32,
  yTolerance: 1.35,
  delayBand: 0.78,
  riseBonus: 0.16,
  fallPenalty: 0.18,
  lowBallBonus: 0.04
});
var SURFACE_INTERCEPT_PROFILES = Object.freeze({
  GRASS: Object.freeze({
    preferredContactZ: 0.58,
    minContactZ: 0.32,
    maxContactZ: 0.95,
    contactBand: 0.24,
    yTolerance: 1.05,
    delayBand: 0.42,
    riseBonus: 0.26,
    fallPenalty: 0.32,
    lowBallBonus: 0.18
  }),
  INDOOR: Object.freeze({
    preferredContactZ: 0.63,
    minContactZ: 0.36,
    maxContactZ: 1.02,
    contactBand: 0.26,
    yTolerance: 1.1,
    delayBand: 0.46,
    riseBonus: 0.23,
    fallPenalty: 0.28,
    lowBallBonus: 0.13
  }),
  HARD: Object.freeze({
    preferredContactZ: 0.74,
    minContactZ: 0.42,
    maxContactZ: 1.16,
    contactBand: 0.3,
    yTolerance: 1.25,
    delayBand: 0.6,
    riseBonus: 0.18,
    fallPenalty: 0.2,
    lowBallBonus: 0.06
  }),
  CLAY: Object.freeze({
    preferredContactZ: 0.92,
    minContactZ: 0.5,
    maxContactZ: 1.34,
    contactBand: 0.36,
    yTolerance: 1.5,
    delayBand: 0.92,
    riseBonus: 0.1,
    fallPenalty: 0.1,
    lowBallBonus: -0.04
  })
});
function computeAcceleration(ball, airDensity = PHYSICS.airDensity) {
  const vel = ball.vel, spd = mag3(vel);
  const dragMag = 0.5 * PHYSICS.dragCoeff * BALL_AREA * airDensity * spd * spd;
  const Fd = spd > 0.01 ? scale3(norm3(vel), -dragMag) : v3(0, 0, 0);
  const spinMag = mag3(ball.spin);
  const spinRatio = spinMag * PHYSICS.ballRadius / Math.max(spd, 1);
  const clEff = clamp2(0.15 + spinRatio * 0.42, 0.08, 0.38);
  const Fm = scale3(
    cross3(ball.spin, vel),
    clEff * airDensity * BALL_AREA * PHYSICS.ballRadius
  );
  return {
    x: (Fd.x + Fm.x) / PHYSICS.ballMass,
    y: (Fd.y + Fm.y) / PHYSICS.ballMass,
    z: PHYSICS.gravity + (Fd.z + Fm.z) / PHYSICS.ballMass
  };
}
function launchBall(ball, fromPos, targetX, targetY, spinType, power, netClearance = 0.35, hitHeight = 0.9, actualSpinX = null, actualSpinZ = null, options = null) {
  const dx = targetX - fromPos.x, dy = targetY - fromPos.y;
  const hDist = Math.sqrt(dx * dx + dy * dy);
  if (hDist < 0.01)
    return;
  const flightProfile = options?.flightProfile ?? null;
  ball.pos.z = hitHeight;
  if (flightProfile?.mode === "drop_rewrite") {
    const dirX = dx / hDist;
    const dirY = dy / hDist;
    const dropNetZ = flightProfile.netMinZ ?? COURT.netHeight + 0.01;
    const preferredNetZ = flightProfile.preferredNetZ ?? dropNetZ + 0.06;
    const gravity = PHYSICS.gravity;
    const baseMinTime = flightProfile.minTime ?? 0.56;
    const baseMaxTime = flightProfile.maxTime ?? 0.92;
    const baseMinSpeed = flightProfile.minSpeed ?? 5;
    const baseMaxSpeed = flightProfile.maxSpeed ?? 8.8;
    const longCarryBoost = Math.max(0, hDist - 9);
    const minTime = Math.max(0.72, baseMinTime - longCarryBoost * 0.018);
    const maxTime = Math.max(minTime + 0.24, baseMaxTime - longCarryBoost * 0.03);
    const minSpeed = baseMinSpeed + longCarryBoost * 0.55;
    const maxSpeed = baseMaxSpeed + longCarryBoost * 0.95;
    const minApexZ = flightProfile.apexMinZ ?? Math.max(dropNetZ + 0.1, hitHeight + 0.18, 0.46);
    const maxApexZ = flightProfile.apexMaxZ ?? Math.max(minApexZ + 0.28, 1.18);
    const preferredApexZ = clamp2(
      flightProfile.preferredApexZ ?? minApexZ + Math.min(0.18, Math.max(0.06, (maxApexZ - minApexZ) * 0.5)),
      minApexZ,
      maxApexZ
    );
    const endZ = PHYSICS.ballRadius;
    const dropSpinX = actualSpinX !== null ? clamp2(actualSpinX * 0.04, -1.8, 1.8) : 0;
    const dropSpinZ = actualSpinZ !== null ? clamp2(actualSpinZ * 0.1, -0.9, 0.9) : 0;
    let chosen = null;
    let bestScore = Infinity;
    const simulateDrop = (hSpeed, vz) => {
      const dt = 1 / 180;
      const spinDecay = 1 - 5e-3 * (PHYSICS.airDensity / PHYSICS.airDensity);
      const sim = {
        pos: { x: fromPos.x, y: fromPos.y, z: hitHeight },
        vel: { x: dirX * hSpeed, y: dirY * hSpeed, z: vz },
        spin: { x: dropSpinX, y: 0, z: dropSpinZ }
      };
      let last = { x: sim.pos.x, y: sim.pos.y, z: sim.pos.z };
      let apexZ = sim.pos.z;
      let zAtNet = null;
      let tAtNet = null;
      for (let i = 0; i < 540; i++) {
        const acc = computeAcceleration(sim, PHYSICS.airDensity);
        sim.vel.x += acc.x * dt;
        sim.vel.y += acc.y * dt;
        sim.vel.z += acc.z * dt;
        sim.pos.x += sim.vel.x * dt;
        sim.pos.y += sim.vel.y * dt;
        sim.pos.z += sim.vel.z * dt;
        sim.spin.x *= spinDecay;
        sim.spin.y *= spinDecay;
        sim.spin.z *= spinDecay;
        apexZ = Math.max(apexZ, sim.pos.z);
        if (zAtNet === null && Math.sign(last.y) !== Math.sign(sim.pos.y)) {
          const frac = Math.abs(last.y) / (Math.abs(sim.pos.y - last.y) || 1e-9);
          zAtNet = last.z + (sim.pos.z - last.z) * frac;
          tAtNet = (i + frac) * dt;
        }
        if (sim.pos.z <= endZ && sim.vel.z < 0) {
          const frac = (last.z - endZ) / (last.z - sim.pos.z || 1e-9);
          return {
            landingX: last.x + (sim.pos.x - last.x) * frac,
            landingY: last.y + (sim.pos.y - last.y) * frac,
            landingT: (i + frac) * dt,
            apexZ,
            zAtNet: zAtNet ?? hitHeight,
            tAtNet: tAtNet ?? 0
          };
        }
        last = { x: sim.pos.x, y: sim.pos.y, z: sim.pos.z };
      }
      return null;
    };
    for (let apexStep = 0; apexStep <= 9; apexStep++) {
      const apexBlend = apexStep / 9;
      const apexZ = minApexZ + (maxApexZ - minApexZ) * apexBlend;
      if (apexZ <= hitHeight + 0.04)
        continue;
      const vz = Math.sqrt(Math.max(0, 2 * gravity * (apexZ - hitHeight)));
      if (vz <= 0)
        continue;
      for (let speedStep = 0; speedStep <= 18; speedStep++) {
        const speedBlend = speedStep / 18;
        const hSpeed = minSpeed + (maxSpeed - minSpeed) * speedBlend;
        const sim = simulateDrop(hSpeed, vz);
        if (!sim)
          continue;
        if (sim.zAtNet < dropNetZ)
          continue;
        if (sim.landingT < minTime || sim.landingT > maxTime)
          continue;
        const landingError = Math.hypot(sim.landingX - targetX, sim.landingY - targetY);
        const score = landingError * 5.5 + Math.abs(sim.zAtNet - preferredNetZ) * 2.2 + Math.abs(sim.apexZ - preferredApexZ) * 1.8 + Math.abs(sim.landingT - (minTime + maxTime) * 0.5) * 0.8;
        if (score < bestScore) {
          bestScore = score;
          chosen = { hSpeed, vz };
        }
      }
    }
    if (!chosen) {
      for (let apexStep = 0; apexStep <= 12; apexStep++) {
        const apexBlend = apexStep / 12;
        const apexZ = Math.max(hitHeight + 0.1, 0.42) + (Math.max(maxApexZ, 1.4) - Math.max(hitHeight + 0.1, 0.42)) * apexBlend;
        const vz = Math.sqrt(Math.max(0, 2 * gravity * (apexZ - hitHeight)));
        if (vz <= 0)
          continue;
        for (let speedStep = 0; speedStep <= 22; speedStep++) {
          const speedBlend = speedStep / 22;
          const hSpeed = Math.max(minSpeed, 9) + (Math.max(maxSpeed, 30) - Math.max(minSpeed, 9)) * speedBlend;
          const sim = simulateDrop(hSpeed, vz);
          if (!sim)
            continue;
          if (sim.zAtNet < COURT.netHeight + 0.05)
            continue;
          const landingError = Math.hypot(sim.landingX - targetX, sim.landingY - targetY);
          const score = landingError * 6.2 + Math.max(0, preferredNetZ - sim.zAtNet) * 1.8 + Math.abs(sim.apexZ - preferredApexZ) * 0.9;
          if (score < bestScore) {
            bestScore = score;
            chosen = { hSpeed, vz };
          }
        }
      }
    }
    if (!chosen) {
      const targetTime = clamp2(hDist / 18, Math.max(0.72, minTime * 0.9), maxTime);
      const fallbackSpeed = clamp2(hDist / Math.max(targetTime, 1e-6), Math.max(minSpeed, 10), Math.max(maxSpeed, 28));
      const fallbackTime = hDist / Math.max(fallbackSpeed, 1e-6);
      const fallbackApexVz = Math.sqrt(Math.max(0, 2 * gravity * Math.max(0, preferredApexZ - hitHeight)));
      const fallbackVz = Math.max(
        1.2,
        fallbackApexVz,
        (endZ - hitHeight + 0.5 * gravity * fallbackTime * fallbackTime) / fallbackTime
      );
      chosen = { hSpeed: fallbackSpeed, vz: fallbackVz };
    }
    ball.vel.x = dirX * chosen.hSpeed;
    ball.vel.y = dirY * chosen.hSpeed;
    ball.vel.z = chosen.vz;
    ball.inFlight = true;
    ball.bounceCount = 0;
    ball.spin.x = dropSpinX;
    ball.spin.z = dropSpinZ;
    return;
  }
  ball.vel.x = dx / hDist * power;
  ball.vel.y = dy / hDist * power;
  const sm = power * 0.6;
  if (spinType === 1) {
    ball.spin.x = -sm * 1.2 * Math.sign(ball.vel.y);
    ball.spin.z = sm * 0.2;
  } else if (spinType === -1) {
    ball.spin.x = sm * 0.7 * Math.sign(ball.vel.y);
    ball.spin.z = sm * 0.6;
  } else {
    ball.spin.x = -sm * 0.1 * Math.sign(ball.vel.y);
    ball.spin.z = 0;
  }
  if (actualSpinX !== null)
    ball.spin.x = actualSpinX;
  if (actualSpinZ !== null)
    ball.spin.z = actualSpinZ;
  const SPIN_SCALE_SOLVER = 3;
  const solverSpinScale = actualSpinX !== null ? SPIN_SCALE_SOLVER : 1;
  const SIM_DT = 1 / 120;
  const SIM_STEPS = 3500;
  const NET_MIN_Z = flightProfile?.netMinZ ?? COURT.netHeight + 0.02;
  function simFlight(vzCandidate) {
    const bsim = {
      vel: { x: ball.vel.x, y: ball.vel.y, z: vzCandidate },
      spin: { x: ball.spin.x * solverSpinScale, y: (ball.spin.y || 0) * solverSpinScale, z: ball.spin.z * solverSpinScale }
    };
    let px = fromPos.x, py = fromPos.y, pz = hitHeight;
    let zAtNet = null;
    for (let i = 0; i < SIM_STEPS; i++) {
      bsim.pos = { x: px, y: py, z: pz };
      const acc = computeAcceleration(bsim);
      bsim.vel.x += acc.x * SIM_DT;
      bsim.vel.y += acc.y * SIM_DT;
      bsim.vel.z += acc.z * SIM_DT;
      const prevPy = py, prevPz = pz;
      px += bsim.vel.x * SIM_DT;
      py += bsim.vel.y * SIM_DT;
      pz += bsim.vel.z * SIM_DT;
      if (zAtNet === null && Math.sign(prevPy) !== Math.sign(py) && Math.sign(prevPy) !== 0) {
        const f = Math.abs(prevPy) / (Math.abs(prevPy) + Math.abs(py) || 1e-9);
        zAtNet = prevPz + f * (pz - prevPz);
      }
      if (pz <= PHYSICS.ballRadius && bsim.vel.z < 0) {
        const clearsNet = zAtNet !== null && zAtNet >= NET_MIN_Z;
        return { landY: py, zAtNet, clearsNet };
      }
    }
    return { landY: py, zAtNet, clearsNet: false };
  }
  const LAND_TOL = 0.2;
  const vySign = ball.vel.y >= 0 ? 1 : -1;
  let vzLo = -18, vzHi = 12, vzBest = -3;
  let bestErr = Infinity;
  for (let iter = 0; iter < 28; iter++) {
    const vzMid = (vzLo + vzHi) * 0.5;
    const { landY } = simFlight(vzMid);
    const err = landY - targetY;
    const absErr = Math.abs(err);
    if (absErr < bestErr) {
      bestErr = absErr;
      vzBest = vzMid;
    }
    if (absErr < LAND_TOL)
      break;
    if (err * vySign > 0)
      vzHi = vzMid;
    else
      vzLo = vzMid;
  }
  const { clearsNet: bestClears, zAtNet: bestZNet } = simFlight(vzBest);
  let vzFinal = vzBest;
  if (!bestClears) {
    let vzSearch = vzBest;
    let foundClear = false;
    const OUT_GUARD = COURT.halfL - 0.15;
    for (let step = 0; step < 80; step++) {
      vzSearch += 0.06;
      const { clearsNet, landY } = simFlight(vzSearch);
      if (clearsNet) {
        if (Math.abs(landY) <= OUT_GUARD) {
          vzFinal = vzSearch;
          foundClear = true;
        }
        break;
      }
    }
    if (!foundClear) {
      vzFinal = vzBest;
    }
  }
  if (flightProfile) {
    const profileVzMin = flightProfile.vzMin ?? -20;
    const profileVzMax = flightProfile.vzMax ?? 28;
    const searchMax = Math.min(vzFinal, profileVzMax);
    const maxLandingError = flightProfile.maxLandingError ?? 1.05;
    const strictArc = !!flightProfile.strictArc;
    let chosenVz = null;
    for (let step = 0; step <= 26; step++) {
      const t = step / 26;
      const vzProbe = profileVzMin + (searchMax - profileVzMin) * t;
      const probe = simFlight(vzProbe);
      if (!probe.clearsNet)
        continue;
      if (Math.abs(probe.landY - targetY) <= maxLandingError) {
        chosenVz = vzProbe;
        break;
      }
    }
    if (chosenVz !== null) {
      vzFinal = chosenVz;
    } else {
      const clampedVz = clamp2(vzFinal, profileVzMin, profileVzMax);
      const clampedProbe = simFlight(clampedVz);
      if (strictArc) {
        vzFinal = clampedVz;
      } else if (clampedProbe.clearsNet) {
        vzFinal = clampedVz;
      }
    }
  }
  ball.vel.z = clamp2(vzFinal, -20, 28);
  ball.inFlight = true;
  ball.bounceCount = 0;
}

// src/ShotMaster.js
var QUALITY_BANDS = Object.freeze({
  ELITE: 0.84,
  SOLID: 0.66,
  STRESSED: 0.46,
  SCRAMBLE: 0.26
});
var SHOT_FAMILY = Object.freeze({
  TOPSPIN_DRIVE: "TOPSPIN_DRIVE",
  FLAT_DRIVE: "FLAT_DRIVE",
  SLICE: "SLICE",
  DROP_SHOT: "DROP_SHOT",
  LOB: "LOB",
  VOLLEY: "VOLLEY",
  HALF_VOLLEY: "HALF_VOLLEY",
  OVERHEAD: "OVERHEAD"
});
var LEGACY_TYPE = Object.freeze({
  TOPSPIN_DRIVE: "TOPSPIN",
  FLAT_DRIVE: "FLAT",
  SLICE: "SLICE",
  DROP_SHOT: "DROP",
  LOB_DEF: "LOB_DEF",
  LOB_ATK: "LOB_ATK",
  VOLLEY: "VOLLEY",
  HALF_VOLLEY: "HALF_VOLLEY",
  OVERHEAD: "SMASH"
});
var GROUND_SUBTYPE = Object.freeze({
  TOPSPIN_NEUTRAL: "TOPSPIN_NEUTRAL",
  HEAVY_TOP: "HEAVY_TOP",
  ACCEL: "ACCEL",
  SHORT_ACCEL: "SHORT_ACCEL",
  PASSING: "PASSING",
  BANANA: "BANANA",
  FLAT_FINISH: "FLAT_FINISH",
  SLICE_NEUTRAL: "SLICE_NEUTRAL",
  SLICE_SKID: "SLICE_SKID",
  SLICE_SHORT: "SLICE_SHORT"
});
var GROUND_BLUEPRINTS = Object.freeze({
  [GROUND_SUBTYPE.TOPSPIN_NEUTRAL]: Object.freeze({
    subtype: GROUND_SUBTYPE.TOPSPIN_NEUTRAL,
    family: SHOT_FAMILY.TOPSPIN_DRIVE,
    legacyType: "TOPSPIN",
    sigmaType: "TOPSPIN",
    speedKmhFH: [110, 132],
    speedKmhBH: [100, 124],
    clearance: [0.58, 1.16],
    hitHeight: [0.68, 1.1],
    spinForward: [24, 42],
    spinLateral: [0.1, 1],
    bounce: Object.freeze({ friction: 0.84, vertical: 1.36, side: 0.028, deadBall: false }),
    lowQ: Object.freeze({ depthLoss: 0.2, widthExpand: 0.68, netRisk: 0.04, spinLoss: 0.1 })
  }),
  [GROUND_SUBTYPE.HEAVY_TOP]: Object.freeze({
    subtype: GROUND_SUBTYPE.HEAVY_TOP,
    family: SHOT_FAMILY.TOPSPIN_DRIVE,
    legacyType: "HEAVY_TOP",
    sigmaType: "HEAVY_TOP",
    speedKmhFH: [114, 136],
    speedKmhBH: [102, 126],
    clearance: [0.7, 1.28],
    hitHeight: [0.72, 1.12],
    spinForward: [30, 50],
    spinLateral: [0.08, 0.9],
    bounce: Object.freeze({ friction: 0.82, vertical: 1.42, side: 0.022, deadBall: false }),
    lowQ: Object.freeze({ depthLoss: 0.16, widthExpand: 0.6, netRisk: 0.03, spinLoss: 0.06 })
  }),
  [GROUND_SUBTYPE.ACCEL]: Object.freeze({
    subtype: GROUND_SUBTYPE.ACCEL,
    family: SHOT_FAMILY.TOPSPIN_DRIVE,
    legacyType: "ACCEL",
    sigmaType: "ACCEL",
    speedKmhFH: [124, 146],
    speedKmhBH: [112, 138],
    clearance: [0.44, 0.82],
    hitHeight: [0.66, 1.02],
    spinForward: [16, 32],
    spinLateral: [0.12, 1],
    bounce: Object.freeze({ friction: 0.86, vertical: 1.24, side: 0.026, deadBall: false }),
    lowQ: Object.freeze({ depthLoss: 0.14, widthExpand: 0.84, netRisk: 0.06, spinLoss: 0.12 })
  }),
  [GROUND_SUBTYPE.SHORT_ACCEL]: Object.freeze({
    subtype: GROUND_SUBTYPE.SHORT_ACCEL,
    family: SHOT_FAMILY.TOPSPIN_DRIVE,
    legacyType: "SHORT_ACCEL",
    sigmaType: "SHORT_ACCEL",
    speedKmhFH: [116, 138],
    speedKmhBH: [106, 128],
    clearance: [0.42, 0.74],
    hitHeight: [0.58, 0.94],
    spinForward: [14, 28],
    spinLateral: [0.4, 1.4],
    bounce: Object.freeze({ friction: 0.84, vertical: 1.18, side: 0.03, deadBall: false }),
    lowQ: Object.freeze({ depthLoss: 0.16, widthExpand: 0.9, netRisk: 0.06, spinLoss: 0.12 })
  }),
  [GROUND_SUBTYPE.PASSING]: Object.freeze({
    subtype: GROUND_SUBTYPE.PASSING,
    family: SHOT_FAMILY.TOPSPIN_DRIVE,
    legacyType: "PASSING",
    sigmaType: "PASSING",
    speedKmhFH: [118, 144],
    speedKmhBH: [108, 134],
    clearance: [0.4, 0.82],
    hitHeight: [0.64, 1],
    spinForward: [18, 34],
    spinLateral: [0.16, 1.2],
    bounce: Object.freeze({ friction: 0.84, vertical: 1.22, side: 0.03, deadBall: false }),
    lowQ: Object.freeze({ depthLoss: 0.15, widthExpand: 0.9, netRisk: 0.06, spinLoss: 0.12 })
  }),
  [GROUND_SUBTYPE.BANANA]: Object.freeze({
    subtype: GROUND_SUBTYPE.BANANA,
    family: SHOT_FAMILY.TOPSPIN_DRIVE,
    legacyType: "BANANA",
    sigmaType: "BANANA",
    speedKmhFH: [112, 136],
    speedKmhBH: [102, 128],
    clearance: [0.64, 1.18],
    hitHeight: [0.7, 1.08],
    spinForward: [26, 46],
    spinLateral: [0.8, 2],
    bounce: Object.freeze({ friction: 0.82, vertical: 1.38, side: 0.042, deadBall: false }),
    lowQ: Object.freeze({ depthLoss: 0.18, widthExpand: 0.82, netRisk: 0.05, spinLoss: 0.1 })
  }),
  [GROUND_SUBTYPE.FLAT_FINISH]: Object.freeze({
    subtype: GROUND_SUBTYPE.FLAT_FINISH,
    family: SHOT_FAMILY.FLAT_DRIVE,
    legacyType: "FLAT",
    sigmaType: "FLAT",
    speedKmhFH: [126, 148],
    speedKmhBH: [112, 138],
    clearance: [0.3, 0.64],
    hitHeight: [0.64, 1],
    spinForward: [4, 14],
    spinLateral: [0, 0.6],
    bounce: Object.freeze({ friction: 0.95, vertical: 0.94, side: 0.014, deadBall: false }),
    lowQ: Object.freeze({ depthLoss: 0.12, widthExpand: 0.92, netRisk: 0.08, spinLoss: 0.02 })
  }),
  [GROUND_SUBTYPE.SLICE_NEUTRAL]: Object.freeze({
    subtype: GROUND_SUBTYPE.SLICE_NEUTRAL,
    family: SHOT_FAMILY.SLICE,
    legacyType: "SLICE",
    sigmaType: "SLICE",
    speedKmhFH: [82, 104],
    speedKmhBH: [76, 98],
    clearance: [0.14, 0.4],
    hitHeight: [0.34, 0.76],
    spinForward: [-28, -14],
    spinLateral: [0.1, 0.8],
    bounce: Object.freeze({ friction: 0.54, vertical: 0.78, side: 0.03, deadBall: false }),
    lowQ: Object.freeze({ depthLoss: 0.16, widthExpand: 0.58, netRisk: 0.04, spinLoss: 0.14 })
  }),
  [GROUND_SUBTYPE.SLICE_SKID]: Object.freeze({
    subtype: GROUND_SUBTYPE.SLICE_SKID,
    family: SHOT_FAMILY.SLICE,
    legacyType: "SLICE",
    sigmaType: "SLICE",
    speedKmhFH: [88, 112],
    speedKmhBH: [80, 104],
    clearance: [0.1, 0.28],
    hitHeight: [0.3, 0.68],
    spinForward: [-30, -18],
    spinLateral: [0.1, 0.9],
    bounce: Object.freeze({ friction: 0.48, vertical: 0.66, side: 0.034, deadBall: false }),
    lowQ: Object.freeze({ depthLoss: 0.18, widthExpand: 0.6, netRisk: 0.05, spinLoss: 0.16 })
  }),
  [GROUND_SUBTYPE.SLICE_SHORT]: Object.freeze({
    subtype: GROUND_SUBTYPE.SLICE_SHORT,
    family: SHOT_FAMILY.SLICE,
    legacyType: "SLICE_SHORT",
    sigmaType: "SLICE_SHORT",
    speedKmhFH: [78, 98],
    speedKmhBH: [74, 94],
    clearance: [0.14, 0.34],
    hitHeight: [0.3, 0.68],
    spinForward: [-26, -16],
    spinLateral: [0.2, 0.9],
    bounce: Object.freeze({ friction: 0.52, vertical: 0.7, side: 0.03, deadBall: false }),
    lowQ: Object.freeze({ depthLoss: 0.12, widthExpand: 0.55, netRisk: 0.04, spinLoss: 0.14 })
  })
});
var SHOT_LIBRARY = Object.freeze({
  [SHOT_FAMILY.TOPSPIN_DRIVE]: Object.freeze({
    speedKmhFH: [118, 138],
    speedKmhBH: [104, 124],
    clearance: [0.52, 1.1],
    hitHeight: [0.66, 1.08],
    spinForward: [18, 40],
    spinLateral: [0.2, 1.4],
    depth: [0.66, 0.92],
    bounce: Object.freeze({ friction: 0.86, vertical: 1.34, side: 0.035, deadBall: false }),
    lowQ: Object.freeze({ depthLoss: 0.22, widthExpand: 0.85, netRisk: 0.05, spinLoss: 0.12 })
  }),
  [SHOT_FAMILY.FLAT_DRIVE]: Object.freeze({
    speedKmhFH: [122, 146],
    speedKmhBH: [110, 136],
    clearance: [0.28, 0.68],
    hitHeight: [0.64, 1.02],
    spinForward: [5, 15],
    spinLateral: [0, 0.7],
    depth: [0.7, 0.88],
    bounce: Object.freeze({ friction: 0.95, vertical: 0.96, side: 0.015, deadBall: false }),
    lowQ: Object.freeze({ depthLoss: 0.14, widthExpand: 0.82, netRisk: 0.06, spinLoss: 0.02 })
  }),
  [SHOT_FAMILY.SLICE]: Object.freeze({
    speedKmhFH: [78, 108],
    speedKmhBH: [74, 102],
    clearance: [0.1, 0.42],
    hitHeight: [0.34, 0.76],
    spinForward: [-26, -12],
    spinLateral: [0.1, 1],
    depth: [0.48, 0.84],
    bounce: Object.freeze({ friction: 0.56, vertical: 0.72, side: 0.028, deadBall: false }),
    lowQ: Object.freeze({ depthLoss: 0.18, widthExpand: 0.65, netRisk: 0.04, spinLoss: 0.18 })
  }),
  [SHOT_FAMILY.DROP_SHOT]: Object.freeze({
    speedKmhFH: [58, 90],
    speedKmhBH: [54, 84],
    clearance: [0.1, 0.24],
    hitHeight: [0.2, 0.45],
    spinForward: [-34, -18],
    spinLateral: [0, 0.6],
    depth: [0.18, 0.36],
    bounce: Object.freeze({ friction: 0.38, vertical: 0.62, side: 0.012, deadBall: true }),
    lowQ: Object.freeze({ depthLoss: -0.04, widthExpand: 0.38, netRisk: 0.08, spinLoss: 0.16 })
  }),
  [SHOT_FAMILY.LOB]: Object.freeze({
    speedKmhFH: [74, 118],
    speedKmhBH: [70, 112],
    clearance: [2.2, 5.2],
    hitHeight: [0.78, 1.45],
    spinForward: [-6, 22],
    spinLateral: [0, 0.7],
    depth: [0.78, 0.97],
    bounce: Object.freeze({ friction: 0.82, vertical: 1.04, side: 0.018, deadBall: false }),
    lowQ: Object.freeze({ depthLoss: 0.1, widthExpand: 0.72, netRisk: 0.01, spinLoss: 0.1 })
  }),
  [SHOT_FAMILY.VOLLEY]: Object.freeze({
    speedKmhFH: [72, 122],
    speedKmhBH: [68, 116],
    clearance: [0.14, 0.46],
    hitHeight: [0.9, 1.58],
    spinForward: [-4, 10],
    spinLateral: [0, 0.5],
    depth: [0.52, 0.86],
    bounce: Object.freeze({ friction: 0.86, vertical: 0.86, side: 0.015, deadBall: false }),
    lowQ: Object.freeze({ depthLoss: 0.18, widthExpand: 0.92, netRisk: 0.1, spinLoss: 0.04 })
  }),
  [SHOT_FAMILY.HALF_VOLLEY]: Object.freeze({
    speedKmhFH: [74, 110],
    speedKmhBH: [70, 104],
    clearance: [0.1, 0.34],
    hitHeight: [0.22, 0.55],
    spinForward: [-8, 10],
    spinLateral: [0, 0.4],
    depth: [0.44, 0.78],
    bounce: Object.freeze({ friction: 0.8, vertical: 0.82, side: 0.012, deadBall: false }),
    lowQ: Object.freeze({ depthLoss: 0.22, widthExpand: 0.96, netRisk: 0.14, spinLoss: 0.08 })
  }),
  [SHOT_FAMILY.OVERHEAD]: Object.freeze({
    speedKmhFH: [128, 172],
    speedKmhBH: [124, 164],
    clearance: [0.18, 0.55],
    hitHeight: [2.05, 2.95],
    spinForward: [2, 12],
    spinLateral: [0, 0.2],
    depth: [0.78, 0.96],
    bounce: Object.freeze({ friction: 0.92, vertical: 0.98, side: 0.01, deadBall: false }),
    lowQ: Object.freeze({ depthLoss: 0.08, widthExpand: 0.82, netRisk: 0.08, spinLoss: 0.03 })
  })
});
var SERVE_PHYS = Object.freeze({
  FLAT: "FLAT",
  SLICE: "SLICE",
  KICK: "KICK"
});
var SERVE_BLUEPRINTS = Object.freeze({
  "FLAT-T": Object.freeze({
    id: "FLAT-T",
    physType: SERVE_PHYS.FLAT,
    legacySpin: 0,
    dir: "T",
    tags: Object.freeze(["RUSH"]),
    clearance: Object.freeze([0.4, 0.56]),
    xAbsRange: Object.freeze([0.1, 0.6]),
    yFrac1: Object.freeze([0.6, 0.72]),
    yFrac2: Object.freeze([0.54, 0.64]),
    speedMult1: 1,
    speedMult2: 0.82,
    sideSpinMult: 0.1,
    bounce: Object.freeze({ friction: 0.94, vertical: 0.98, side: 4e-3, deadBall: false })
  }),
  "FLAT-WIDE": Object.freeze({
    id: "FLAT-WIDE",
    physType: SERVE_PHYS.FLAT,
    legacySpin: 0,
    dir: "WIDE",
    tags: Object.freeze(["OPEN"]),
    clearance: Object.freeze([0.42, 0.58]),
    xAbsRange: Object.freeze([1.4, 2.4]),
    yFrac1: Object.freeze([0.6, 0.7]),
    yFrac2: Object.freeze([0.54, 0.62]),
    speedMult1: 1.02,
    speedMult2: 0.8,
    sideSpinMult: 0.1,
    bounce: Object.freeze({ friction: 0.93, vertical: 0.98, side: 5e-3, deadBall: false })
  }),
  "FLAT-BODY": Object.freeze({
    id: "FLAT-BODY",
    physType: SERVE_PHYS.FLAT,
    legacySpin: 0,
    dir: "BODY",
    tags: Object.freeze(["JAM"]),
    clearance: Object.freeze([0.4, 0.56]),
    xAbsRange: Object.freeze([0.5, 1.4]),
    yFrac1: Object.freeze([0.6, 0.7]),
    yFrac2: Object.freeze([0.54, 0.62]),
    speedMult1: 1,
    speedMult2: 0.82,
    sideSpinMult: 0.1,
    bounce: Object.freeze({ friction: 0.94, vertical: 0.98, side: 4e-3, deadBall: false })
  }),
  "SLICE-WIDE": Object.freeze({
    id: "SLICE-WIDE",
    physType: SERVE_PHYS.SLICE,
    legacySpin: -1,
    dir: "WIDE",
    tags: Object.freeze(["OPEN"]),
    clearance: Object.freeze([0.34, 0.46]),
    xAbsRange: Object.freeze([1, 1.95]),
    yFrac1: Object.freeze([0.58, 0.69]),
    yFrac2: Object.freeze([0.52, 0.61]),
    speedMult1: 0.9,
    speedMult2: 0.86,
    sideSpinMult: 1.18,
    bounce: Object.freeze({ friction: 0.82, vertical: 0.88, side: 0.018, deadBall: false })
  }),
  "SLICE-T": Object.freeze({
    id: "SLICE-T",
    physType: SERVE_PHYS.SLICE,
    legacySpin: -1,
    dir: "T",
    tags: Object.freeze(["RUSH"]),
    clearance: Object.freeze([0.32, 0.43]),
    xAbsRange: Object.freeze([0.1, 0.7]),
    yFrac1: Object.freeze([0.58, 0.69]),
    yFrac2: Object.freeze([0.52, 0.61]),
    speedMult1: 0.88,
    speedMult2: 0.84,
    sideSpinMult: 1.08,
    bounce: Object.freeze({ friction: 0.83, vertical: 0.9, side: 0.016, deadBall: false })
  }),
  "KICK-BODY": Object.freeze({
    id: "KICK-BODY",
    physType: SERVE_PHYS.KICK,
    legacySpin: 1,
    dir: "BODY",
    tags: Object.freeze(["JAM", "SAFE"]),
    clearance: Object.freeze([0.52, 0.7]),
    xAbsRange: Object.freeze([0.4, 1.3]),
    yFrac1: Object.freeze([0.56, 0.66]),
    yFrac2: Object.freeze([0.5, 0.62]),
    speedMult1: 0.82,
    speedMult2: 0.92,
    sideSpinMult: 0.45,
    bounce: Object.freeze({ friction: 0.88, vertical: 1.18, side: 0.012, deadBall: false })
  }),
  "KICK-T": Object.freeze({
    id: "KICK-T",
    physType: SERVE_PHYS.KICK,
    legacySpin: 1,
    dir: "T",
    tags: Object.freeze(["SAFE"]),
    clearance: Object.freeze([0.46, 0.64]),
    xAbsRange: Object.freeze([0.1, 0.6]),
    yFrac1: Object.freeze([0.56, 0.66]),
    yFrac2: Object.freeze([0.5, 0.62]),
    speedMult1: 0.8,
    speedMult2: 0.9,
    sideSpinMult: 0.45,
    bounce: Object.freeze({ friction: 0.89, vertical: 1.2, side: 0.012, deadBall: false })
  })
});
function kmhToMs(v) {
  return v / 3.6;
}
function clamp01(v) {
  return clamp2(v, 0, 1);
}
function gauss(mean = 0, sigma = 1) {
  const u1 = Math.max(1e-9, Math.random());
  const u2 = Math.random();
  return mean + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
function shotHand(player, ballX, explicitWing) {
  if (typeof explicitWing === "boolean")
    return explicitWing;
  const hand = player.handedness ?? "right";
  if (hand === "left")
    return ballX > (player.pos?.x ?? 0);
  return ballX < (player.pos?.x ?? 0);
}
function getWingAttrs(player, isBackhand) {
  const attrs = player.attrs ?? {};
  return {
    power: getWingPotencia(attrs, isBackhand),
    control: getWingControle(attrs, isBackhand),
    topspin: attrs.topspin ?? 50,
    slice: attrs.slice ?? 50,
    volley: attrs.volley ?? attrs.jogoDeRede ?? 50,
    smash: attrs.smash ?? attrs.jogoDeRede ?? 50,
    reading: attrs.leitura ?? 50,
    tactics: attrs.visaoTatica ?? attrs.agressividade ?? 50,
    defense: attrs.defesa ?? 50,
    returnSkill: attrs.devolucao ?? 50,
    regularity: attrs.regularidade ?? 50,
    mentality: attrs.mentalidade ?? 50,
    adaptability: attrs.adaptacao ?? 50
  };
}
function resolveQualityBand(q) {
  if (q >= QUALITY_BANDS.ELITE)
    return "ELITE";
  if (q >= QUALITY_BANDS.SOLID)
    return "SOLID";
  if (q >= QUALITY_BANDS.STRESSED)
    return "STRESSED";
  if (q >= QUALITY_BANDS.SCRAMBLE)
    return "SCRAMBLE";
  return "EMERGENCY";
}
function chooseLobType(opponentAtNet, q, control) {
  if (!opponentAtNet)
    return LEGACY_TYPE.LOB_DEF;
  if (q > 0.62 && control > 58)
    return LEGACY_TYPE.LOB_ATK;
  return LEGACY_TYPE.LOB_DEF;
}
function getPlayerPrefs(player) {
  return {
    buildStyle: "CROSS_BUILDER",
    netGame: "OPPORTUNIST",
    rallyCadence: "BALANCED",
    riskProfile: "CALCULATED",
    adaptability: 60,
    ...player?.prefs ?? {}
  };
}
function getCadenceUnlock(prefs) {
  return {
    PATIENT: 4.4,
    MEASURED: 3.3,
    BALANCED: 2.4,
    EARLY_ATTACK: 1.4,
    EXPLOSIVE: 0.7
  }[prefs.rallyCadence] ?? 2.4;
}
function getServeIdentityPrefs(player) {
  const merged = mergeGeneratedPrefs(player?.attrs ?? {}, player?.prefs ?? {});
  if (player)
    player.prefs = merged;
  return merged;
}
function makeServeCandidate(blueprintId, tags = null) {
  const blueprint = SERVE_BLUEPRINTS[blueprintId];
  return {
    id: blueprintId,
    dir: blueprint?.dir ?? "T",
    tags: [...tags ?? blueprint?.tags ?? []],
    blueprint
  };
}
function generateServeCandidates(isSecondServe, servePower = 0.7) {
  const cands = [];
  if (!isSecondServe) {
    cands.push(makeServeCandidate("FLAT-T"));
    cands.push(makeServeCandidate("FLAT-WIDE"));
    cands.push(makeServeCandidate("FLAT-BODY"));
    cands.push(makeServeCandidate("SLICE-WIDE"));
    cands.push(makeServeCandidate("SLICE-T"));
    cands.push(makeServeCandidate("KICK-BODY"));
    cands.push(makeServeCandidate("KICK-T"));
    if (servePower >= 0.85)
      cands.push(makeServeCandidate("FLAT-WIDE", ["OPEN", "RUSH"]));
    if (servePower <= 0.55)
      cands.push(makeServeCandidate("KICK-T", ["SAFE"]));
  } else {
    cands.push(makeServeCandidate("KICK-BODY"));
    cands.push(makeServeCandidate("KICK-T"));
    cands.push(makeServeCandidate("SLICE-WIDE", ["OPEN", "SAFE"]));
    cands.push(makeServeCandidate("SLICE-T", ["SAFE"]));
    if (servePower >= 0.9)
      cands.push(makeServeCandidate("FLAT-BODY", ["JAM", "SAFE"]));
  }
  return cands;
}
function servePressureScore(candidate, sCtx) {
  const dir = candidate.dir;
  const physType = candidate.blueprint?.physType ?? SERVE_PHYS.FLAT;
  let score = 0.45;
  if (dir === "WIDE") {
    score += clamp01(1 - Math.abs(sCtx.rvX) / 2) * 0.35;
    if (sCtx.rvIsWide)
      score -= 0.18;
  }
  if (dir === "BODY")
    score += sCtx.rvIsInside ? 0.28 : 0.1;
  if (dir === "T")
    score += sCtx.rvIsWide ? 0.25 : 0.08;
  if (physType === SERVE_PHYS.SLICE)
    score += 0.1;
  if (physType === SERVE_PHYS.KICK)
    score += sCtx.rvIsInside ? 0.14 : 0.06;
  return clamp01(score);
}
function serveSafetyScore(candidate, sCtx) {
  const dir = candidate.dir;
  const physType = candidate.blueprint?.physType ?? SERVE_PHYS.FLAT;
  let score = 0.72;
  if (physType === SERVE_PHYS.KICK)
    score += sCtx.isSecondServe ? 0.22 : 0.1;
  if (physType === SERVE_PHYS.FLAT)
    score -= sCtx.isSecondServe ? 0.32 : 0.1;
  if (physType === SERVE_PHYS.SLICE)
    score -= sCtx.isSecondServe ? 0.08 : 0.02;
  if (dir === "WIDE")
    score -= sCtx.isSecondServe ? 0.22 : 0.08;
  if (dir === "T")
    score -= 0.04;
  if (sCtx.isBreakPoint && sCtx.isSecondServe)
    score += 0.1;
  if (sCtx.stamina < 0.55)
    score -= 0.07;
  if (sCtx.recentFaults >= 2 && sCtx.isSecondServe)
    score += 0.08;
  return clamp01(score);
}
function serveRewardScore(candidate, sCtx) {
  const dir = candidate.dir;
  const physType = candidate.blueprint?.physType ?? SERVE_PHYS.FLAT;
  let score = 0.3;
  if (physType === SERVE_PHYS.FLAT && dir === "WIDE" && !sCtx.isSecondServe)
    score += 0.3;
  if (physType === SERVE_PHYS.FLAT && dir === "T" && !sCtx.isSecondServe)
    score += 0.2;
  if (physType === SERVE_PHYS.SLICE && dir === "WIDE")
    score += 0.18;
  if ((sCtx.serveForceAttr ?? 60) >= 82 && physType === SERVE_PHYS.FLAT)
    score += 0.12;
  if ((sCtx.netAttr ?? 50) >= 78 && dir === "WIDE")
    score += 0.1;
  if (sCtx.isSecondServe)
    score *= 0.5;
  if (sCtx.serve1InStreak >= 3 && physType === sCtx.lastPhysType)
    score += 0.08;
  return clamp01(score);
}
function servePatternScore(candidate, sCtx) {
  const hist = sCtx.serveHistory ?? [];
  if (hist.length < 2)
    return 0.55;
  let score = 0.55;
  const recent = hist.slice(-3);
  const physType = candidate.blueprint?.physType ?? SERVE_PHYS.FLAT;
  const sameDir = recent.filter((h) => h.dir === candidate.dir).length;
  if (sameDir >= 2)
    score -= 0.25;
  else if (sameDir === 0)
    score += 0.18;
  const samePhys = recent.filter((h) => h.physType === physType).length;
  if (samePhys >= 2)
    score -= 0.12;
  else if (samePhys === 0)
    score += 0.1;
  return clamp01(score);
}
function serveIdentityScore(candidate, sCtx) {
  const prefs = sCtx.servePrefs ?? {};
  const dir = candidate.dir;
  const physType = candidate.blueprint?.physType ?? SERVE_PHYS.FLAT;
  let score = 0.52;
  switch (prefs.serveProfile) {
    case "CANNON":
      if (!sCtx.isSecondServe && physType === SERVE_PHYS.FLAT)
        score += 0.22;
      if (!sCtx.isSecondServe && (dir === "T" || dir === "WIDE"))
        score += 0.1;
      if (sCtx.isSecondServe && dir === "WIDE")
        score -= 0.14;
      if (sCtx.isSecondServe && physType === SERVE_PHYS.KICK)
        score -= 0.06;
      break;
    case "PRECISION":
      if (dir === "T")
        score += 0.18;
      if (physType === SERVE_PHYS.SLICE && dir === "T")
        score += 0.06;
      if (sCtx.isSecondServe && physType === SERVE_PHYS.FLAT && dir === "WIDE")
        score -= 0.14;
      break;
    case "BODY_JAMMER":
      if (dir === "BODY")
        score += 0.22;
      if (physType === SERVE_PHYS.FLAT || physType === SERVE_PHYS.KICK)
        score += 0.04;
      if (dir === "WIDE")
        score -= 0.08;
      break;
    case "WIDE_OPENER":
      if (dir === "WIDE")
        score += 0.22;
      if (physType === SERVE_PHYS.SLICE && dir === "WIDE")
        score += 0.08;
      if (dir === "BODY")
        score -= 0.07;
      break;
    case "KICK_BUILDER":
      if (physType === SERVE_PHYS.KICK)
        score += sCtx.isSecondServe ? 0.24 : 0.12;
      if (sCtx.isSecondServe && physType === SERVE_PHYS.FLAT)
        score -= 0.14;
      if (dir === "T")
        score += 0.05;
      break;
    default:
      if (dir !== "BODY" && !sCtx.isSecondServe)
        score += 0.03;
      break;
  }
  if (!sCtx.isSecondServe) {
    switch (prefs.serve1Bias) {
      case "POWER":
        if (physType === SERVE_PHYS.FLAT)
          score += 0.16;
        break;
      case "T":
        if (dir === "T")
          score += 0.14;
        break;
      case "BODY":
        if (dir === "BODY")
          score += 0.14;
        break;
      case "WIDE":
        if (dir === "WIDE")
          score += 0.14;
        break;
      case "SHAPE":
        if (physType !== SERVE_PHYS.FLAT)
          score += 0.12;
        break;
      default:
        score += 0.03;
        break;
    }
  } else {
    switch (prefs.serve2Bias) {
      case "KICK":
        if (physType === SERVE_PHYS.KICK)
          score += 0.2;
        break;
      case "T":
        if (dir === "T")
          score += 0.12;
        break;
      case "BODY":
        if (dir === "BODY")
          score += 0.12;
        break;
      case "SLICE":
        if (physType === SERVE_PHYS.SLICE)
          score += 0.16;
        break;
      case "SAFE":
        if (physType === SERVE_PHYS.KICK)
          score += 0.12;
        if (dir === "WIDE" && physType === SERVE_PHYS.FLAT)
          score -= 0.12;
        break;
      default:
        score += 0.02;
        break;
    }
  }
  if (sCtx.isBreakPoint) {
    switch (prefs.pressureServe) {
      case "BOLD":
        if (!sCtx.isSecondServe && physType === SERVE_PHYS.FLAT)
          score += 0.16;
        if (sCtx.isSecondServe && dir === "WIDE")
          score -= 0.08;
        break;
      case "SPOT":
        if (dir === "T")
          score += 0.16;
        if (physType === SERVE_PHYS.SLICE && dir === "T")
          score += 0.05;
        break;
      case "BODY_LOCK":
        if (dir === "BODY")
          score += 0.18;
        break;
      case "KICK_TRUST":
        if (physType === SERVE_PHYS.KICK)
          score += 0.18;
        break;
      case "SAFE_RESET":
        if (sCtx.isSecondServe && physType === SERVE_PHYS.KICK)
          score += 0.14;
        if (physType === SERVE_PHYS.FLAT && dir === "WIDE")
          score -= 0.12;
        break;
      default:
        break;
    }
  }
  return clamp01(score);
}
function serveTacticalScore(candidate, sCtx) {
  const state = sCtx.tacticalState;
  if (!state)
    return 0.52;
  let score = 0.52;
  score += state.dirBias?.[candidate.dir] ?? 0;
  if (state.hotDir === candidate.dir)
    score += 0.08;
  if (state.varyFrom === candidate.dir)
    score -= 0.18;
  if (state.counterOpenDir === candidate.dir)
    score += 0.1;
  if (state.anticipatedDir === candidate.dir)
    score -= 0.08 + (state.patternPressure ?? 0) * 0.08;
  return clamp01(score);
}
function scoreServeCandidate(candidate, sCtx) {
  const pressure = servePressureScore(candidate, sCtx);
  const reward = serveRewardScore(candidate, sCtx);
  const safety = serveSafetyScore(candidate, sCtx);
  const pattern = servePatternScore(candidate, sCtx);
  const identity = serveIdentityScore(candidate, sCtx);
  const tactical = serveTacticalScore(candidate, sCtx);
  const ev = sCtx.isSecondServe ? 0.16 * pressure + 0.08 * reward + 0.39 * safety + 0.1 * pattern + 0.14 * identity + 0.13 * tactical : 0.24 * pressure + 0.18 * reward + 0.16 * safety + 0.1 * pattern + 0.18 * identity + 0.14 * tactical;
  return { c: candidate, EV: ev, sub: { pressure, reward, safety, pattern, identity, tactical } };
}
function serveTemperature(sCtx) {
  let temp = 0.18;
  if (sCtx.rvIsInside && !sCtx.isSecondServe)
    temp *= 0.75;
  if (sCtx.rvIsWide)
    temp *= 0.8;
  if (sCtx.isSecondServe)
    temp *= 0.7;
  if (sCtx.isBreakPoint && sCtx.isSecondServe)
    temp *= 0.6;
  return clamp2(temp, 0.06, 0.32);
}
function softmaxPick(scored, temperature) {
  if (!scored?.length)
    return null;
  const maxEV = Math.max(...scored.map((s) => s.EV));
  const exps = scored.map((s) => Math.exp((s.EV - maxEV) / temperature));
  const total = exps.reduce((sum, v) => sum + v, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < scored.length; i++) {
    roll -= exps[i];
    if (roll <= 0)
      return scored[i];
  }
  return scored[scored.length - 1];
}
function deriveServeIntent(candidate) {
  const tags = candidate?.tags ?? [];
  if (tags.includes("OPEN"))
    return tags.includes("RUSH") ? "RUSH" : "OPEN";
  if (tags.includes("JAM"))
    return "JAM";
  if (tags.includes("SAFE"))
    return "SAFE";
  if (tags.includes("RUSH"))
    return "RUSH";
  return "SAFE";
}
function pushServeHistory(matchCtx, entry) {
  if (!matchCtx)
    return;
  matchCtx.serveHistory = matchCtx.serveHistory || [];
  matchCtx.serveHistory.push(entry);
  if (matchCtx.serveHistory.length > 8)
    matchCtx.serveHistory.shift();
}
function computeServePatternState(serverMc, receiverMc, isSecondServe, serveLeft) {
  const hist = (serverMc?.serveHistory || []).filter((h) => h.isSec === isSecondServe).slice(-6);
  const result = {
    anticipatedDir: null,
    hotDir: null,
    varyFrom: null,
    counterOpenDir: null,
    dirBias: { WIDE: 0, T: 0, BODY: 0 },
    patternPressure: 0
  };
  if (!hist.length)
    return result;
  const recentSide = hist.filter((h) => h.serveLeft === serveLeft).slice(-4);
  const sample = recentSide.length >= 2 ? recentSide : hist;
  const dirCounts = { WIDE: 0, T: 0, BODY: 0 };
  sample.forEach((h) => {
    if (dirCounts[h.dir] != null)
      dirCounts[h.dir]++;
  });
  const ordered = Object.entries(dirCounts).sort((a, b) => b[1] - a[1]);
  result.hotDir = ordered[0][1] > 0 ? ordered[0][0] : null;
  result.varyFrom = ordered[0][1] >= 2 ? ordered[0][0] : null;
  result.anticipatedDir = ordered[0][1] >= 2 ? ordered[0][0] : null;
  if (result.varyFrom === "WIDE")
    result.counterOpenDir = "BODY";
  else if (result.varyFrom === "BODY")
    result.counterOpenDir = "T";
  else if (result.varyFrom === "T")
    result.counterOpenDir = "WIDE";
  result.patternPressure = clamp01((ordered[0][1] - 1) / 3);
  result.dirBias[result.hotDir] += 0.06 * result.patternPressure;
  if (result.counterOpenDir)
    result.dirBias[result.counterOpenDir] += 0.1;
  const receiverRead = receiverMc?.returnReadState ?? {};
  if (receiverRead.anticipatedDir && result.dirBias[receiverRead.anticipatedDir] != null) {
    result.dirBias[receiverRead.anticipatedDir] -= 0.06;
  }
  return result;
}
function bucketServeDirection(targetX) {
  const absX = Math.abs(targetX);
  if (absX < 0.8)
    return "T";
  if (absX < 1.6)
    return "BODY";
  return "WIDE";
}
function getServeBounceProfile(blueprint, surface) {
  const profile = { ...blueprint?.bounce ?? {} };
  const court = String(surface ?? "HARD").toUpperCase();
  if (court === "CLAY") {
    profile.friction *= blueprint.physType === SERVE_PHYS.FLAT ? 0.96 : 0.92;
    profile.vertical *= blueprint.physType === SERVE_PHYS.KICK ? 1.08 : blueprint.physType === SERVE_PHYS.SLICE ? 1.05 : 1.02;
    profile.side *= blueprint.physType === SERVE_PHYS.SLICE ? 0.92 : 0.96;
  } else if (court === "GRASS") {
    profile.friction *= blueprint.physType === SERVE_PHYS.SLICE ? 0.88 : 0.92;
    profile.vertical *= blueprint.physType === SERVE_PHYS.KICK ? 0.94 : 0.92;
    profile.side *= blueprint.physType === SERVE_PHYS.SLICE ? 1.08 : 1;
  }
  return profile;
}
function executeServe(ball, server, receiver, opts = {}) {
  const isSecondServe = !!opts.isSecondServe;
  const serveLeft = !!opts.serveLeft;
  const isBreakPoint = !!opts.isBreakPoint;
  const serveForceAttr = server?.attrs?.saqueForca ?? server?.attrs?.saque ?? 60;
  const servePrecisionAttr = server?.attrs?.saquePrecisao ?? server?.attrs?.saque ?? 70;
  const servePower = serveForceAttr / 100;
  const servePrefs = getServeIdentityPrefs(server);
  const serveHistory = server?.ctx?.matchCtx?.serveHistory || [];
  const tacticalState = computeServePatternState(server?.ctx?.matchCtx, receiver?.ctx?.matchCtx, isSecondServe, serveLeft);
  const receiverX = receiver?.pos?.x ?? 0;
  const receiverY = receiver?.pos?.y ?? 0;
  const receiverBaseY = (receiver?.side ?? -1) * (COURT.halfL + 2);
  const scoreCtx = {
    isSecondServe,
    isBreakPoint,
    serveForceAttr,
    netAttr: ((server?.attrs?.volley ?? server?.attrs?.jogoDeRede ?? 50) + (server?.attrs?.smash ?? server?.attrs?.jogoDeRede ?? 50)) / 2,
    rvX: receiverX,
    rvIsWide: Math.abs(receiverX) > 1.1,
    rvIsInside: Math.abs(receiverY) < Math.abs(receiverBaseY) - 0.8,
    rvIsDeep: Math.abs(receiverY) > Math.abs(receiverBaseY) + 0.5,
    stamina: server?.stamina ?? 1,
    serveHistory,
    serve1InStreak: server?.ctx?.matchCtx?.serve1InStreak || 0,
    recentFaults: server?.ctx?.matchCtx?.recentFaults || 0,
    lastPhysType: serveHistory.length ? serveHistory[serveHistory.length - 1].physType : null,
    servePrefs,
    tacticalState
  };
  const candidates = generateServeCandidates(isSecondServe, servePower);
  const scored = candidates.map((c) => scoreServeCandidate(c, scoreCtx));
  const picked = softmaxPick(scored, serveTemperature(scoreCtx)) ?? scored[0];
  const blueprint = picked.c.blueprint;
  const traitFx = opts.traitFx ?? { serveMult: 1 };
  const traitServeMult = isSecondServe ? traitFx.serveMult ?? 1 : (traitFx.serveMult ?? 1) > 1 ? 1 + ((traitFx.serveMult ?? 1) - 1) * 0.6 : traitFx.serveMult ?? 1;
  const serveMods1 = clamp2((server?.mods?.serveMult1 ?? 1) * traitServeMult, 0.85, 1.3);
  const serveMods2 = clamp2((server?.mods?.serveMult2 ?? 1) * traitServeMult, 0.85, 1.24);
  const baseServe1Min = 42 + serveForceAttr * 0.11;
  const baseServe1Max = 51 + serveForceAttr * 0.16;
  const baseServe2Min = 34 + serveForceAttr * 0.07;
  const baseServe2Max = 39 + serveForceAttr * 0.1;
  let servePowerMs;
  if (!isSecondServe) {
    servePowerMs = rand(baseServe1Min, baseServe1Max) * serveMods1 * blueprint.speedMult1;
  } else {
    servePowerMs = rand(baseServe2Min, baseServe2Max) * serveMods2 * blueprint.speedMult2;
  }
  servePowerMs *= 1 + (opts.courtServeBonus ?? 0);
  if (serveForceAttr >= 85 && !isSecondServe && blueprint.physType === SERVE_PHYS.FLAT) {
    servePowerMs *= 1.03 + (serveForceAttr - 85) * 2e-3;
  }
  servePowerMs = Math.min(servePowerMs, 64.8);
  const servePrecisionMult = clamp2(server?.mods?.servePrecisaoMult ?? 1, 0.85, 1.3);
  const serveScatterMult = clamp2((server?.mods?.serveScatter ?? 0.75) / 0.75, 0.7, 1.3);
  const servePrecisionStability = clamp2(0.9 + (servePrecisionMult - 1) * 0.9, 0.78, 1.2);
  const fatiguePenalty = (1 - (server?.stamina ?? 1)) * (isSecondServe ? 0.06 : 0.1);
  const breakPenalty = isBreakPoint && isSecondServe ? (1 - (server?.mods?.pressaoFactor ?? 0.7)) * 0.2 : 0;
  const baseFaultRate = isSecondServe ? clamp2((0.035 + (1 - servePrecisionAttr / 100) * 0.16) / servePrecisionStability, 0.02, 0.2) : clamp2((0.27 + (1 - servePrecisionAttr / 100) * 0.4) / servePrecisionStability, 0.1, 0.52);
  const faultProb = clamp2(baseFaultRate + fatiguePenalty + breakPenalty, 0, 0.55);
  const faultProbFinal = clamp2(faultProb / (server?._formMods?.serveMod ?? 1), 0, 0.55);
  const yFracRange = isSecondServe ? blueprint.yFrac2 : blueprint.yFrac1;
  let targetY = -(server?.side ?? 1) * COURT.serviceLineY * rand(yFracRange[0], yFracRange[1]);
  let targetX = (serveLeft ? 1 : -1) * rand(blueprint.xAbsRange[0], blueprint.xAbsRange[1]);
  let isLongFault = false;
  let isNetFault = false;
  let isWideFault = false;
  let faultMode = null;
  if (Math.random() < faultProbFinal) {
    const faultRoll = Math.random();
    const longThreshold = isSecondServe ? 0.3 : 0.6;
    const wideThreshold = isSecondServe ? 0.75 : 0.8;
    faultMode = faultRoll < longThreshold ? "LONG" : faultRoll < wideThreshold ? "WIDE" : "NET";
    if (faultMode === "LONG") {
      const longMult = isSecondServe ? 2 + Math.random() * 0.18 : 1.76 + Math.random() * 0.2;
      targetY *= longMult;
      isLongFault = true;
    } else if (faultMode === "WIDE") {
      targetX = Math.sign(targetX || (serveLeft ? 1 : -1)) * (COURT.singlesW / 2 + 0.25 + Math.random() * 0.6);
      isWideFault = true;
    } else {
      isNetFault = true;
    }
  }
  const serveSQMult = clamp2(0.92 + (servePrecisionMult - 1) * 0.55, 0.84, 1.14);
  const fatigueSQ = 0.88 + (server?.stamina ?? 1) * 0.12;
  const secondPenalty = isSecondServe ? 0.08 : 0;
  const serveSQ = clamp2((0.52 + servePrecisionAttr / 100 * 0.43) * fatigueSQ * serveSQMult - secondPenalty, 0.36, 0.95);
  const serveSigmaType = blueprint.physType === SERVE_PHYS.KICK ? "TOPSPIN" : blueprint.physType === SERVE_PHYS.SLICE ? "SLICE" : "FLAT";
  let serveSigmaX = computeSigmaX(
    serveSigmaType,
    serveSQ,
    targetX,
    COURT.singlesW / 2,
    servePrecisionAttr,
    50,
    "FULL",
    server?.pos?.x ?? 0
  ) * serveScatterMult;
  if (blueprint.physType === SERVE_PHYS.SLICE)
    serveSigmaX *= 1.28;
  targetX += gauss(0, serveSigmaX);
  targetY += gauss(0, serveSigmaX * 0.65);
  if (isSecondServe)
    targetX *= 0.88;
  const sideLimit = COURT.singlesW / 2 - 0.5;
  const minX = serveLeft ? 0 : -sideLimit;
  const maxX = serveLeft ? sideLimit : 0;
  if (!isWideFault)
    targetX = clamp2(targetX, minX, maxX);
  const minAbsY = COURT.serviceLineY * 0.08;
  const maxAbsY = COURT.serviceLineY * 0.96;
  if (!isLongFault) {
    const tYSign = Math.sign(targetY) || -(server?.side ?? 1);
    targetY = tYSign * clamp2(Math.abs(targetY), minAbsY, maxAbsY);
  }
  const netClearance = rand(blueprint.clearance[0], blueprint.clearance[1]);
  ball.pos.x = server?.pos?.x ?? 0;
  ball.pos.y = server?.pos?.y ?? 0;
  launchBall2(ball, { x: server?.pos?.x ?? 0, y: server?.pos?.y ?? 0 }, targetX, targetY, blueprint.legacySpin, servePowerMs, netClearance, 2.5);
  ball._serveNetTouched = false;
  ball._lipNet = false;
  if (isNetFault) {
    ball.vel.z = -(Math.abs(ball.vel.z) + 1.5 + Math.random() * 1);
  }
  const serveSpinMults = getAtpSpinMultipliers(
    blueprint.physType === SERVE_PHYS.KICK ? "HEAVY_TOP" : blueprint.physType === SERVE_PHYS.SLICE ? "SLICE" : "FLAT",
    server?.attrs,
    server?.mods,
    serveSQ
  );
  const speedForSpin = servePowerMs * 0.6;
  if (blueprint.physType === SERVE_PHYS.KICK) {
    const kickVariance = (Math.random() + Math.random() - 1) * 0.12;
    ball.spin.x = -speedForSpin * 2.8 * serveSpinMults.topspinMult * Math.sign(ball.vel.y);
    ball.spin.z = speedForSpin * (blueprint.sideSpinMult + kickVariance) * (serveLeft ? 1 : -1);
  } else if (blueprint.physType === SERVE_PHYS.SLICE) {
    ball.spin.x = speedForSpin * 0.6 * serveSpinMults.sliceMult * Math.sign(ball.vel.y);
    ball.spin.z = speedForSpin * blueprint.sideSpinMult * (serveLeft ? 1 : -1);
  } else {
    ball.spin.x = -speedForSpin * 0.15 * Math.sign(ball.vel.y);
    ball.spin.z = 0;
  }
  ball._serveExitKmh = Math.round(mag3(ball.vel) * 3.6);
  ball._isSecondServe = isSecondServe;
  ball._serveTargetY = targetY;
  ball._servePhysType = blueprint.physType;
  ball._serveBlueprintId = blueprint.id;
  ball._serveBounceProfile = getServeBounceProfile(blueprint, opts.surface);
  ball.lastHitBy = server?.id ?? 0;
  server._lastQuality = clamp2(0.38 + (ball._serveExitKmh - 110) / 265, 0.35, 0.93);
  return {
    serve: {
      id: blueprint.id,
      name: blueprint.id,
      physType: blueprint.physType,
      dir: bucketServeDirection(targetX),
      plannedDir: blueprint.dir,
      intent: deriveServeIntent(picked.c),
      isFirst: !isSecondServe,
      isSecond: isSecondServe,
      kmh: ball._serveExitKmh,
      serveSQ,
      sigmaX: serveSigmaX,
      netClearance,
      targetX,
      targetY,
      spinX: ball.spin.x,
      spinZ: ball.spin.z,
      bounceProfile: { ...ball._serveBounceProfile },
      faultMode,
      serveLeft,
      pointNum: opts.pointNum ?? null
    },
    ev: {
      picked,
      scored,
      context: scoreCtx,
      servePrefs,
      tacticalState
    }
  };
}
function scoreFamilies(player, opponent, quality, opts, attrs, isBackhand) {
  const prefs = getPlayerPrefs(player);
  const q = clamp01(quality);
  const ballZ = opts.ballZ ?? 0.8;
  const rally = opts.gsRally ?? player?.ctx?.rallyBalls ?? 0;
  const currentIntent = opts.currentIntent ?? player?.ctx?.currentIntent ?? "BUILD";
  const isBuildIntent = currentIntent === "BUILD";
  const isPressureIntent = currentIntent === "PRESSURE";
  const isFinishIntent = currentIntent === "FINISH";
  const surface = String(opts.surface ?? "").toUpperCase();
  const isClay = surface === "CLAY";
  const oppAtNet = !!opponent?.atNet;
  const selfAtNet = !!player?.atNet || player._volleyType === "position";
  const oppDepth = Math.abs(opponent?.pos?.y ?? 0) / COURT.halfL;
  const onReturn = rally === 0;
  const styleLock = clamp01(1 - (prefs.adaptability ?? 60) / 100);
  const biasStrength = 0.6 + styleLock * 0.55;
  const attackReadiness = clamp01((rally + q * 2.4 - getCadenceUnlock(prefs)) / 2.8 + 0.5);
  const attackBall = q > 0.64 && ballZ > 0.46 && ballZ < 1.2;
  const dropWindow = !onReturn && !oppAtNet && oppDepth > 0.74 && ballZ > 0.28 && ballZ < 0.9;
  const scores = {
    [SHOT_FAMILY.TOPSPIN_DRIVE]: 0.5 + q * 0.4 + (attrs.topspin - 50) * 6e-3,
    [SHOT_FAMILY.FLAT_DRIVE]: 0.06 + q * 0.4 + (attrs.power - 50) * 6e-3 - (1 - q) * 0.3,
    [SHOT_FAMILY.SLICE]: 0.14 + (1 - q) * 0.46 + (attrs.slice - 50) * 8e-3 + (ballZ < 0.55 ? 0.18 : 0),
    [SHOT_FAMILY.DROP_SHOT]: (dropWindow ? 0.18 : -0.12) + (oppDepth > 0.72 ? 0.22 : 0) + (attrs.slice - 50) * 6e-3 + (q > 0.58 ? 0.12 : -0.1),
    [SHOT_FAMILY.LOB]: oppAtNet ? 0.42 + q * 0.18 + attrs.reading * 2e-3 : -0.1,
    [SHOT_FAMILY.VOLLEY]: selfAtNet ? 0.52 + attrs.volley * 6e-3 + q * 0.2 : -0.2,
    [SHOT_FAMILY.HALF_VOLLEY]: ballZ < 0.18 ? 0.16 + attrs.control * 3e-3 + attrs.volley * 2e-3 + (q < 0.38 ? 0.08 : -0.06) : ballZ < 0.24 ? -0.04 + attrs.control * 15e-4 : -0.42,
    [SHOT_FAMILY.OVERHEAD]: ballZ > 2.05 ? 0.62 + attrs.smash * 5e-3 + q * 0.08 + (selfAtNet ? 0.12 : 0) : -0.48
  };
  if (onReturn) {
    scores[SHOT_FAMILY.TOPSPIN_DRIVE] += attrs.returnSkill * 4e-3;
    scores[SHOT_FAMILY.FLAT_DRIVE] += q > 0.74 ? attrs.returnSkill * 2e-3 : -0.14;
    scores[SHOT_FAMILY.DROP_SHOT] -= 0.3;
  }
  if (isBackhand)
    scores[SHOT_FAMILY.FLAT_DRIVE] -= 0.04;
  if (oppAtNet)
    scores[SHOT_FAMILY.FLAT_DRIVE] += 0.1;
  if (!attackBall)
    scores[SHOT_FAMILY.FLAT_DRIVE] -= 0.18;
  if (ballZ < 0.52 || ballZ > 1.08)
    scores[SHOT_FAMILY.FLAT_DRIVE] -= 0.16;
  if (selfAtNet && ballZ > 1.95)
    scores[SHOT_FAMILY.OVERHEAD] += 0.12;
  if (isClay) {
    scores[SHOT_FAMILY.TOPSPIN_DRIVE] += 0.06;
    if (dropWindow)
      scores[SHOT_FAMILY.DROP_SHOT] += 0.08 + attrs.slice * 15e-4;
  }
  if (isBuildIntent) {
    scores[SHOT_FAMILY.TOPSPIN_DRIVE] += 0.1 + attackReadiness * 0.04;
    scores[SHOT_FAMILY.FLAT_DRIVE] -= 0.26 * (1 - attackReadiness) + 0.08;
    if (!dropWindow)
      scores[SHOT_FAMILY.DROP_SHOT] -= 0.08;
  }
  if (isPressureIntent) {
    scores[SHOT_FAMILY.FLAT_DRIVE] += attackBall ? 0.04 * (0.45 + attackReadiness) : -0.1;
    scores[SHOT_FAMILY.TOPSPIN_DRIVE] += 0.03;
    if (dropWindow)
      scores[SHOT_FAMILY.DROP_SHOT] += 0.12;
  }
  if (isFinishIntent) {
    scores[SHOT_FAMILY.FLAT_DRIVE] += attackBall ? 0.1 * (0.6 + attackReadiness) + (q > 0.84 ? 0.06 : 0) : -0.12;
    scores[SHOT_FAMILY.TOPSPIN_DRIVE] -= attackBall ? 0.08 : 0.02;
    if (dropWindow)
      scores[SHOT_FAMILY.DROP_SHOT] += 0.16;
  }
  if (q < 0.22) {
    scores[SHOT_FAMILY.FLAT_DRIVE] -= 0.35;
    scores[SHOT_FAMILY.DROP_SHOT] -= 0.26;
  }
  switch (prefs.rallyCadence) {
    case "PATIENT":
      scores[SHOT_FAMILY.TOPSPIN_DRIVE] += 0.18 * biasStrength;
      scores[SHOT_FAMILY.SLICE] += 0.14 * biasStrength;
      scores[SHOT_FAMILY.FLAT_DRIVE] -= 0.22 * biasStrength * (1.1 - attackReadiness);
      scores[SHOT_FAMILY.DROP_SHOT] -= 0.1 * biasStrength * (1.15 - attackReadiness);
      if (isClay && dropWindow)
        scores[SHOT_FAMILY.DROP_SHOT] += 0.05 * biasStrength;
      break;
    case "MEASURED":
      scores[SHOT_FAMILY.TOPSPIN_DRIVE] += 0.12 * biasStrength;
      scores[SHOT_FAMILY.SLICE] += 0.08 * biasStrength;
      scores[SHOT_FAMILY.FLAT_DRIVE] -= 0.14 * biasStrength * (1.05 - attackReadiness);
      break;
    case "BALANCED":
      scores[SHOT_FAMILY.FLAT_DRIVE] -= 0.1 * biasStrength * (1 - attackReadiness * 0.45);
      break;
    case "EARLY_ATTACK":
      scores[SHOT_FAMILY.FLAT_DRIVE] += 0.14 * biasStrength * (0.65 + attackReadiness);
      scores[SHOT_FAMILY.TOPSPIN_DRIVE] -= 0.05 * biasStrength;
      scores[SHOT_FAMILY.VOLLEY] += 0.08 * biasStrength;
      if (dropWindow)
        scores[SHOT_FAMILY.DROP_SHOT] += 0.05 * biasStrength;
      break;
    case "EXPLOSIVE":
      scores[SHOT_FAMILY.FLAT_DRIVE] += 0.2 * biasStrength * (0.75 + attackReadiness);
      scores[SHOT_FAMILY.VOLLEY] += 0.12 * biasStrength;
      scores[SHOT_FAMILY.OVERHEAD] += 0.06 * biasStrength;
      scores[SHOT_FAMILY.TOPSPIN_DRIVE] -= 0.06 * biasStrength;
      if (dropWindow)
        scores[SHOT_FAMILY.DROP_SHOT] += 0.07 * biasStrength;
      break;
    default:
      break;
  }
  switch (prefs.riskProfile) {
    case "SAFETY_FIRST":
      scores[SHOT_FAMILY.TOPSPIN_DRIVE] += 0.16 * biasStrength;
      scores[SHOT_FAMILY.SLICE] += 0.12 * biasStrength;
      scores[SHOT_FAMILY.LOB] += 0.06 * biasStrength;
      scores[SHOT_FAMILY.FLAT_DRIVE] -= 0.18 * biasStrength;
      scores[SHOT_FAMILY.DROP_SHOT] -= 0.1 * biasStrength;
      break;
    case "SAFE":
      scores[SHOT_FAMILY.TOPSPIN_DRIVE] += 0.1 * biasStrength;
      scores[SHOT_FAMILY.SLICE] += 0.06 * biasStrength;
      scores[SHOT_FAMILY.FLAT_DRIVE] -= 0.08 * biasStrength;
      break;
    case "CALCULATED":
      scores[SHOT_FAMILY.FLAT_DRIVE] -= 0.12 * biasStrength * (1 - attackReadiness * 0.35);
      break;
    case "GAMBLER":
      scores[SHOT_FAMILY.FLAT_DRIVE] += 0.16 * biasStrength;
      scores[SHOT_FAMILY.DROP_SHOT] += 0.18 * biasStrength * (0.58 + attackReadiness);
      scores[SHOT_FAMILY.VOLLEY] += 0.06 * biasStrength;
      break;
    case "ALLOUT":
      scores[SHOT_FAMILY.FLAT_DRIVE] += 0.24 * biasStrength;
      scores[SHOT_FAMILY.DROP_SHOT] += 0.2 * biasStrength * (0.62 + attackReadiness);
      scores[SHOT_FAMILY.VOLLEY] += 0.1 * biasStrength;
      scores[SHOT_FAMILY.OVERHEAD] += 0.05 * biasStrength;
      scores[SHOT_FAMILY.TOPSPIN_DRIVE] -= 0.12 * biasStrength;
      break;
    default:
      break;
  }
  switch (prefs.buildStyle) {
    case "CROSS_DOMINANT":
      scores[SHOT_FAMILY.TOPSPIN_DRIVE] += 0.12 * biasStrength;
      scores[SHOT_FAMILY.SLICE] += 0.04 * biasStrength;
      break;
    case "CROSS_BUILDER":
      scores[SHOT_FAMILY.TOPSPIN_DRIVE] += 0.08 * biasStrength;
      scores[SHOT_FAMILY.FLAT_DRIVE] -= 0.06 * biasStrength;
      if (attackReadiness > 0.86 && attackBall)
        scores[SHOT_FAMILY.FLAT_DRIVE] += 0.08 * biasStrength;
      break;
    case "DTL_HUNTER":
      scores[SHOT_FAMILY.FLAT_DRIVE] += 0.14 * biasStrength * (0.55 + attackReadiness);
      scores[SHOT_FAMILY.TOPSPIN_DRIVE] += 0.03 * biasStrength;
      break;
    case "VARIED":
      scores[SHOT_FAMILY.SLICE] += 0.08 * biasStrength;
      scores[SHOT_FAMILY.DROP_SHOT] += 0.16 * biasStrength * (0.46 + attackReadiness);
      scores[SHOT_FAMILY.FLAT_DRIVE] += 0.02 * biasStrength * (0.3 + attackReadiness);
      scores[SHOT_FAMILY.LOB] += 0.04 * biasStrength;
      break;
    case "CENTRE_CONTROL":
      scores[SHOT_FAMILY.TOPSPIN_DRIVE] += 0.1 * biasStrength;
      scores[SHOT_FAMILY.SLICE] += 0.1 * biasStrength;
      scores[SHOT_FAMILY.FLAT_DRIVE] -= 0.1 * biasStrength;
      break;
    default:
      break;
  }
  switch (prefs.netGame) {
    case "HUNTER":
      scores[SHOT_FAMILY.VOLLEY] += 0.18 * biasStrength;
      scores[SHOT_FAMILY.HALF_VOLLEY] += 0.03 * biasStrength;
      scores[SHOT_FAMILY.OVERHEAD] += 0.05 * biasStrength;
      scores[SHOT_FAMILY.SLICE] += 0.08 * biasStrength * (0.4 + attackReadiness);
      break;
    case "PROACTIVE":
      scores[SHOT_FAMILY.VOLLEY] += 0.12 * biasStrength;
      scores[SHOT_FAMILY.HALF_VOLLEY] += 0.02 * biasStrength;
      scores[SHOT_FAMILY.SLICE] += 0.06 * biasStrength * (0.4 + attackReadiness);
      break;
    case "AVOIDS":
      scores[SHOT_FAMILY.VOLLEY] -= 0.16 * biasStrength;
      scores[SHOT_FAMILY.HALF_VOLLEY] -= 0.12 * biasStrength;
      break;
    default:
      break;
  }
  return scores;
}
function pickFamily(scores) {
  let best = SHOT_FAMILY.TOPSPIN_DRIVE;
  let bestScore = -Infinity;
  for (const [family, score] of Object.entries(scores)) {
    const noisy = score + rand(-0.04, 0.04);
    if (noisy > bestScore) {
      bestScore = noisy;
      best = family;
    }
  }
  return best;
}
function buildTarget(player, opponent, family, quality, opts) {
  const prefs = getPlayerPrefs(player);
  const currentIntent = opts.currentIntent ?? player?.ctx?.currentIntent ?? "BUILD";
  const isBuildIntent = currentIntent === "BUILD";
  const isPressureIntent = currentIntent === "PRESSURE";
  const isFinishIntent = currentIntent === "FINISH";
  const side = player.side ?? 1;
  const oppX = opponent?.pos?.x ?? 0;
  const oppAtNet = !!opponent?.atNet;
  const ballX = opts.ballX ?? 0;
  const openSign = Math.abs(oppX) > 0.4 ? -Math.sign(oppX) : ballX <= 0 ? 1 : -1;
  const lineSign = Math.abs(ballX) > 0.25 ? Math.sign(ballX) : openSign;
  const styleLock = clamp01(1 - (prefs.adaptability ?? 60) / 100);
  const aggressive = quality > 0.68;
  let targetX = openSign * rand(1, 2.9);
  let depthFrac = rand(0.68, 0.9);
  switch (prefs.buildStyle) {
    case "CROSS_DOMINANT":
      targetX = openSign * rand(1.4, 2.9);
      depthFrac = rand(0.72, 0.9);
      break;
    case "CROSS_BUILDER":
      targetX = openSign * rand(1.2, 2.7);
      depthFrac = rand(0.74, 0.92);
      if (isPressureIntent || isFinishIntent) {
        targetX = lineSign * rand(1.5, 3);
        depthFrac = rand(0.8, 0.96);
      }
      break;
    case "DTL_HUNTER":
      targetX = lineSign * rand(1.1, 2.8);
      depthFrac = rand(0.78, 0.95);
      break;
    case "VARIED":
      if (isFinishIntent && Math.random() < 0.45) {
        targetX = lineSign * rand(1.8, 3.2);
      } else if (isPressureIntent && Math.random() < 0.38) {
        targetX = openSign * rand(1.6, 3.1);
      } else if (Math.random() < 0.35 + (1 - styleLock) * 0.25) {
        targetX = clamp2(-oppX * 0.58 + gauss(0, 0.42), -2.8, 2.8);
      } else if (Math.random() < 0.5) {
        targetX = openSign * rand(1.3, 3);
      } else {
        targetX = clamp2(gauss(0, 0.95), -2.35, 2.35);
      }
      depthFrac = rand(0.64, 0.93);
      break;
    case "CENTRE_CONTROL":
      targetX = clamp2(-oppX * 0.15 + gauss(0, 0.35), -1.2, 1.2);
      depthFrac = rand(0.8, 0.94);
      break;
    default:
      break;
  }
  if (family === SHOT_FAMILY.DROP_SHOT) {
    const dropSign = prefs.buildStyle === "CENTRE_CONTROL" ? clamp2(-oppX * 0.4, -0.6, 0.6) : openSign;
    targetX = Math.abs(dropSign) < 0.15 ? gauss(0, 0.35) : dropSign * rand(0.4, 1.5);
    depthFrac = prefs.riskProfile === "SAFETY_FIRST" ? rand(0.24, 0.34) : rand(0.2, 0.36);
  } else if (family === SHOT_FAMILY.LOB) {
    targetX = opponent?.pos?.x ? clamp2(-oppX * 0.75 + rand(-0.5, 0.5), -COURT.singlesW / 2 + 0.25, COURT.singlesW / 2 - 0.25) : targetX;
    depthFrac = oppAtNet ? rand(0.84, 0.96) : rand(0.76, 0.9);
  } else if (family === SHOT_FAMILY.VOLLEY || family === SHOT_FAMILY.HALF_VOLLEY) {
    targetX = prefs.buildStyle === "CENTRE_CONTROL" ? clamp2(gauss(0, 0.5), -1.2, 1.2) : openSign * rand(1, 2.3);
    depthFrac = aggressive ? rand(0.56, 0.82) : rand(0.46, 0.74);
  } else if (family === SHOT_FAMILY.OVERHEAD) {
    targetX = openSign * rand(1.6, 3);
    depthFrac = rand(0.84, 0.96);
  } else if (family === SHOT_FAMILY.SLICE) {
    depthFrac = aggressive ? rand(0.58, 0.82) : rand(0.46, 0.72);
  } else if (family === SHOT_FAMILY.FLAT_DRIVE) {
    depthFrac = rand(0.72, 0.88);
    targetX *= isFinishIntent ? 1.02 : isPressureIntent ? 1 : 0.96;
  }
  if (prefs.riskProfile === "SAFETY_FIRST") {
    targetX *= 0.94;
    depthFrac += 0.01;
  } else if (prefs.riskProfile === "SAFE") {
    targetX *= 0.98;
    depthFrac += 0.01;
  } else if (prefs.riskProfile === "GAMBLER") {
    targetX *= 1.06;
    depthFrac += 0.02;
  } else if (prefs.riskProfile === "ALLOUT") {
    targetX *= 1.12;
    depthFrac += 0.03;
  }
  if (isBuildIntent && family === SHOT_FAMILY.TOPSPIN_DRIVE) {
    depthFrac += 0.02;
  } else if (isPressureIntent && family !== SHOT_FAMILY.DROP_SHOT) {
    targetX *= prefs.buildStyle === "CENTRE_CONTROL" ? 1 : 1.08;
    depthFrac += 0.02;
  } else if (isFinishIntent && family !== SHOT_FAMILY.DROP_SHOT) {
    targetX *= prefs.buildStyle === "CENTRE_CONTROL" ? 1 : 1.14;
    depthFrac += 0.03;
  }
  const targetY = -side * clamp2(COURT.halfL * depthFrac, 1.2, COURT.halfL - 0.1);
  return { targetX, targetY };
}
function computeZone(targetX, targetY, family) {
  const absX = Math.abs(targetX);
  const absY = Math.abs(targetY);
  if (family === SHOT_FAMILY.DROP_SHOT)
    return "DROP_ZONE";
  if (absY < COURT.halfL * 0.42 && absX > 2.1)
    return "SHORT_ANGLE";
  if (absX > 2.6)
    return "WIDE";
  if (absX < 0.75 && absY > COURT.halfL * 0.72)
    return "T";
  if (absX < 1.1 && absY > COURT.halfL * 0.66)
    return "DEEP";
  if (absX < 0.95)
    return "BODY";
  return "NEUTRAL";
}
function isGroundFamily(family) {
  return family === SHOT_FAMILY.TOPSPIN_DRIVE || family === SHOT_FAMILY.FLAT_DRIVE || family === SHOT_FAMILY.SLICE;
}
function adjustRange(range, mult = 1, add = 0) {
  return [
    range[0] * mult + add,
    range[1] * mult + add
  ];
}
function cloneBounceProfile(profile) {
  return {
    friction: profile?.friction ?? 1,
    vertical: profile?.vertical ?? 1,
    side: profile?.side ?? 0,
    deadBall: !!profile?.deadBall
  };
}
function weightedAttrBias(attrs, weights) {
  let score = 0;
  for (const [key, weight] of Object.entries(weights)) {
    score += ((attrs[key] ?? 50) - 50) / 50 * weight;
  }
  return score;
}
function resolveGroundSurfaceProfile(blueprint, surface) {
  const court = String(surface ?? "HARD").toUpperCase();
  const profile = {
    ...blueprint,
    speedKmhFH: [...blueprint.speedKmhFH],
    speedKmhBH: [...blueprint.speedKmhBH],
    clearance: [...blueprint.clearance],
    hitHeight: [...blueprint.hitHeight],
    spinForward: [...blueprint.spinForward],
    spinLateral: [...blueprint.spinLateral],
    bounce: cloneBounceProfile(blueprint.bounce),
    lowQ: { ...blueprint.lowQ }
  };
  if (court === "CLAY") {
    if (blueprint.family === SHOT_FAMILY.TOPSPIN_DRIVE) {
      profile.speedKmhFH = adjustRange(profile.speedKmhFH, 0.98);
      profile.speedKmhBH = adjustRange(profile.speedKmhBH, 0.98);
      profile.clearance = adjustRange(profile.clearance, 1, 0.04);
      profile.spinForward = adjustRange(profile.spinForward, 1.08);
      profile.bounce.vertical *= blueprint.subtype === GROUND_SUBTYPE.HEAVY_TOP ? 1.1 : 1.06;
      profile.bounce.friction *= 0.95;
      profile.bounce.side -= 4e-3;
    } else if (blueprint.family === SHOT_FAMILY.FLAT_DRIVE) {
      profile.speedKmhFH = adjustRange(profile.speedKmhFH, 0.97);
      profile.speedKmhBH = adjustRange(profile.speedKmhBH, 0.97);
      profile.clearance = adjustRange(profile.clearance, 1, 0.02);
      profile.bounce.vertical *= 0.96;
      profile.bounce.friction *= 0.96;
    } else if (blueprint.family === SHOT_FAMILY.SLICE) {
      profile.clearance = adjustRange(profile.clearance, 1, 0.02);
      profile.bounce.vertical *= 1.1;
      profile.bounce.friction *= 1.1;
      profile.bounce.side -= 0.01;
      if (blueprint.subtype === GROUND_SUBTYPE.SLICE_SKID) {
        profile.bounce.vertical *= 1.04;
      }
    }
  } else if (court === "HARD") {
    if (blueprint.family === SHOT_FAMILY.TOPSPIN_DRIVE) {
      profile.speedKmhFH = adjustRange(profile.speedKmhFH, 1.01);
      profile.speedKmhBH = adjustRange(profile.speedKmhBH, 1.01);
      profile.bounce.vertical *= 0.96;
    } else if (blueprint.family === SHOT_FAMILY.FLAT_DRIVE) {
      profile.speedKmhFH = adjustRange(profile.speedKmhFH, 1.03);
      profile.speedKmhBH = adjustRange(profile.speedKmhBH, 1.03);
      profile.clearance = adjustRange(profile.clearance, 1, -0.01);
      profile.bounce.friction *= 1.02;
    } else if (blueprint.family === SHOT_FAMILY.SLICE) {
      profile.bounce.vertical *= 0.94;
      profile.bounce.side += 4e-3;
    }
  } else if (court === "GRASS") {
    if (blueprint.family === SHOT_FAMILY.TOPSPIN_DRIVE) {
      profile.speedKmhFH = adjustRange(profile.speedKmhFH, 0.99);
      profile.speedKmhBH = adjustRange(profile.speedKmhBH, 0.99);
      profile.bounce.vertical *= 0.9;
      profile.bounce.friction *= 1.04;
    } else if (blueprint.family === SHOT_FAMILY.FLAT_DRIVE) {
      profile.speedKmhFH = adjustRange(profile.speedKmhFH, 1.04);
      profile.speedKmhBH = adjustRange(profile.speedKmhBH, 1.04);
      profile.bounce.friction *= 0.98;
    } else if (blueprint.family === SHOT_FAMILY.SLICE) {
      profile.clearance = adjustRange(profile.clearance, 1, -0.01);
      profile.bounce.vertical *= 0.88;
      profile.bounce.friction *= 0.92;
      profile.bounce.side += 0.01;
    }
  }
  return profile;
}
function scoreGroundSubtype(blueprint, ctx2) {
  const {
    familyBase,
    prefs,
    attrs,
    q,
    ballZ,
    onReturn,
    oppAtNet,
    isClay,
    isHard,
    isBuildIntent,
    isPressureIntent,
    isFinishIntent,
    attackBall,
    underDuress,
    openBall,
    pressureLevel
  } = ctx2;
  let score = familyBase;
  const creative = (attrs.tactics - 50) / 50 * 0.05 + (attrs.adaptability - 50) / 50 * 0.04;
  switch (blueprint.subtype) {
    case GROUND_SUBTYPE.TOPSPIN_NEUTRAL:
      score += 0.18 + weightedAttrBias(attrs, { control: 0.18, topspin: 0.2, tactics: 0.08, regularity: 0.12, mentality: 0.04 });
      if (isBuildIntent)
        score += 0.22;
      if (isPressureIntent)
        score += 0.08;
      if (onReturn)
        score += 0.1;
      if (isClay)
        score += 0.1;
      if (prefs.buildStyle === "CROSS_BUILDER" || prefs.buildStyle === "CENTRE_CONTROL")
        score += 0.08;
      if (attackBall && prefs.riskProfile === "ALLOUT")
        score -= 0.06;
      break;
    case GROUND_SUBTYPE.HEAVY_TOP:
      score += 0.1 + weightedAttrBias(attrs, { power: 0.1, control: 0.08, topspin: 0.26, tactics: 0.06, regularity: 0.06 });
      if (isBuildIntent)
        score += 0.12;
      if (isPressureIntent)
        score += 0.1;
      if (isClay)
        score += 0.18;
      if (isHard)
        score -= 0.05;
      if (q < 0.34)
        score -= 0.1;
      if (onReturn)
        score -= 0.06;
      break;
    case GROUND_SUBTYPE.ACCEL:
      score += -0.02 + weightedAttrBias(attrs, { power: 0.18, control: 0.1, topspin: 0.1, tactics: 0.12, mentality: 0.06 });
      if (isBuildIntent)
        score -= 0.12;
      if (isPressureIntent)
        score += 0.16;
      if (isFinishIntent)
        score += 0.2;
      if (attackBall)
        score += 0.18;
      else
        score -= 0.18;
      if (isHard)
        score += 0.06;
      if (onReturn)
        score -= 0.06;
      if (q < 0.46)
        score -= 0.2;
      break;
    case GROUND_SUBTYPE.SHORT_ACCEL:
      score += -0.1 + weightedAttrBias(attrs, { power: 0.12, control: 0.12, topspin: 0.08, tactics: 0.14, reading: 0.08, mentality: 0.06 });
      if (isBuildIntent)
        score -= 0.18;
      if (isFinishIntent)
        score += 0.14;
      if (attackBall)
        score += 0.14;
      if (openBall)
        score += 0.12;
      if (prefs.riskProfile === "GAMBLER" || prefs.riskProfile === "ALLOUT")
        score += 0.08;
      if (prefs.riskProfile === "SAFE" || prefs.riskProfile === "SAFETY_FIRST")
        score -= 0.12;
      if (q < 0.54)
        score -= 0.14;
      break;
    case GROUND_SUBTYPE.PASSING:
      score += -0.14 + weightedAttrBias(attrs, { power: 0.12, control: 0.12, topspin: 0.06, reading: 0.16, tactics: 0.16, mentality: 0.06 });
      if (oppAtNet)
        score += 0.42;
      else
        score -= 0.2;
      if (isPressureIntent || isFinishIntent)
        score += 0.1;
      if (openBall)
        score += 0.06;
      if (q < 0.48)
        score -= 0.16;
      break;
    case GROUND_SUBTYPE.BANANA:
      score += -0.12 + weightedAttrBias(attrs, { power: 0.08, control: 0.1, topspin: 0.22, tactics: 0.1, adaptability: 0.08 });
      if (isPressureIntent || isFinishIntent)
        score += 0.08;
      if (openBall)
        score += 0.16;
      if (prefs.buildStyle === "VARIED")
        score += 0.1 + creative;
      if (isClay)
        score += 0.06;
      if (q < 0.54 || ballZ < 0.48)
        score -= 0.16;
      break;
    case GROUND_SUBTYPE.FLAT_FINISH:
      score += 0.02 + weightedAttrBias(attrs, { power: 0.22, control: 0.1, tactics: 0.1, mentality: 0.08 });
      if (isBuildIntent)
        score -= 0.35;
      if (isPressureIntent)
        score += 0.1;
      if (isFinishIntent)
        score += 0.26;
      if (attackBall)
        score += 0.2;
      else
        score -= 0.26;
      if (ballZ < 0.46 || ballZ > 1.12)
        score -= 0.18;
      if (onReturn)
        score -= 0.12;
      if (prefs.rallyCadence === "PATIENT" || prefs.rallyCadence === "MEASURED")
        score -= 0.1;
      if (prefs.riskProfile === "SAFE" || prefs.riskProfile === "SAFETY_FIRST" || prefs.riskProfile === "CALCULATED")
        score -= 0.14;
      if (prefs.riskProfile === "GAMBLER" || prefs.riskProfile === "ALLOUT")
        score += 0.12;
      break;
    case GROUND_SUBTYPE.SLICE_NEUTRAL:
      score += 0.1 + weightedAttrBias(attrs, { control: 0.1, slice: 0.22, defense: 0.12, regularity: 0.1, tactics: 0.06 });
      if (isBuildIntent)
        score += 0.16;
      if (isPressureIntent)
        score += 0.1;
      if (ballZ < 0.58)
        score += 0.18;
      if (underDuress)
        score += 0.14;
      if (isHard)
        score += 0.02;
      if (isClay)
        score -= 0.02;
      break;
    case GROUND_SUBTYPE.SLICE_SKID:
      score += -0.02 + weightedAttrBias(attrs, { control: 0.12, slice: 0.24, reading: 0.06, tactics: 0.06, mentality: 0.04 });
      if (isBuildIntent)
        score += 0.08;
      if (isPressureIntent)
        score += 0.1;
      if (isHard)
        score += 0.12;
      if (isClay)
        score -= 0.08;
      if (attackBall)
        score += 0.06;
      if (ballZ < 0.54)
        score += 0.08;
      break;
    case GROUND_SUBTYPE.SLICE_SHORT:
      score += -0.08 + weightedAttrBias(attrs, { control: 0.12, slice: 0.18, tactics: 0.14, reading: 0.1, adaptability: 0.08 });
      if (openBall)
        score += 0.1;
      if (ballZ < 0.62)
        score += 0.14;
      if (prefs.buildStyle === "VARIED")
        score += 0.08 + creative;
      if (prefs.riskProfile === "SAFE" || prefs.riskProfile === "SAFETY_FIRST")
        score -= 0.08;
      if (oppAtNet)
        score -= 0.06;
      if (q < 0.46)
        score -= 0.16;
      break;
    default:
      break;
  }
  score += pressureLevel * (((attrs.mentality ?? 50) - 50) / 50) * 0.08;
  return score;
}
function chooseGroundSubtype(player, opponent, quality, opts, attrs, prefs, family, familyScores) {
  const surface = String(opts.surface ?? "HARD").toUpperCase();
  const q = clamp01(quality);
  const ballZ = opts.ballZ ?? 0.8;
  const onReturn = (opts.gsRally ?? 0) === 0;
  const isBuildIntent = (opts.currentIntent ?? player?.ctx?.currentIntent ?? "BUILD") === "BUILD";
  const isPressureIntent = (opts.currentIntent ?? player?.ctx?.currentIntent ?? "BUILD") === "PRESSURE";
  const isFinishIntent = (opts.currentIntent ?? player?.ctx?.currentIntent ?? "BUILD") === "FINISH";
  const attackBall = q > 0.62 && ballZ > 0.42 && ballZ < 1.18;
  const underDuress = q < 0.42 || Math.abs(player?.pos?.x ?? 0) > 3;
  const openBall = Math.abs((opts.ballX ?? 0) - (player?.pos?.x ?? 0)) > 1.2;
  const pressureLevel = clamp01(((opts.scoreState?.importance ?? 1) - 1) / 1);
  const context = {
    familyBase: familyScores?.[family] ?? 0,
    prefs,
    attrs,
    q,
    ballZ,
    onReturn,
    oppAtNet: !!opponent?.atNet,
    isClay: surface === "CLAY",
    isHard: surface === "HARD",
    isBuildIntent,
    isPressureIntent,
    isFinishIntent,
    attackBall,
    underDuress,
    openBall,
    pressureLevel
  };
  const scored = Object.values(GROUND_BLUEPRINTS).filter((blueprint) => blueprint.family === family).map((blueprint) => ({
    blueprint,
    score: scoreGroundSubtype(blueprint, context)
  })).sort((a, b) => b.score - a.score);
  let picked = scored[0]?.blueprint ?? GROUND_BLUEPRINTS[GROUND_SUBTYPE.TOPSPIN_NEUTRAL];
  let best = -Infinity;
  for (const entry of scored) {
    const noisy = entry.score + rand(-0.04, 0.04);
    if (noisy > best) {
      best = noisy;
      picked = entry.blueprint;
    }
  }
  return {
    blueprint: picked,
    ranking: scored.slice(0, 5).map((entry) => ({
      subtype: entry.blueprint.subtype,
      score: +entry.score.toFixed(3)
    }))
  };
}
function tuneGroundTarget(player, opponent, blueprint, baseTarget, quality, opts) {
  const side = player.side ?? 1;
  const oppX = opponent?.pos?.x ?? 0;
  const ballX = opts.ballX ?? 0;
  const openSign = Math.abs(oppX) > 0.4 ? -Math.sign(oppX) : ballX <= 0 ? 1 : -1;
  const lineSign = Math.abs(ballX) > 0.25 ? Math.sign(ballX) || openSign : openSign;
  let targetX = baseTarget.targetX;
  let targetY = baseTarget.targetY;
  switch (blueprint.subtype) {
    case GROUND_SUBTYPE.TOPSPIN_NEUTRAL:
      targetX *= 0.92;
      targetY = -side * clamp2(Math.abs(targetY) + COURT.halfL * 0.02, COURT.halfL * 0.7, COURT.halfL * 0.92);
      break;
    case GROUND_SUBTYPE.HEAVY_TOP:
      targetX *= 0.86;
      targetY = -side * clamp2(Math.abs(targetY) + COURT.halfL * 0.08, COURT.halfL * 0.78, COURT.halfL * 0.96);
      break;
    case GROUND_SUBTYPE.ACCEL:
      targetX = clamp2(Math.abs(targetX) < 0.9 ? openSign * rand(1, 2.4) : targetX * 1.04, -COURT.singlesW / 2, COURT.singlesW / 2);
      targetY = -side * clamp2(Math.abs(targetY) + COURT.halfL * 0.04, COURT.halfL * 0.72, COURT.halfL * 0.94);
      break;
    case GROUND_SUBTYPE.SHORT_ACCEL:
      targetX = openSign * rand(1.8, 3);
      targetY = -side * clamp2(COURT.halfL * rand(0.48, 0.7), 1.6, COURT.halfL * 0.74);
      break;
    case GROUND_SUBTYPE.PASSING:
      targetX = clamp2(-oppX * 0.95 + gauss(0, 0.26), -COURT.singlesW / 2 + 0.08, COURT.singlesW / 2 - 0.08);
      targetY = -side * clamp2(COURT.halfL * rand(0.78, 0.94), COURT.halfL * 0.72, COURT.halfL * 0.96);
      break;
    case GROUND_SUBTYPE.BANANA:
      targetX = openSign * rand(2, 3.35);
      targetY = -side * clamp2(COURT.halfL * rand(0.66, 0.9), COURT.halfL * 0.64, COURT.halfL * 0.92);
      break;
    case GROUND_SUBTYPE.FLAT_FINISH:
      targetX = clamp2(Math.abs(targetX) < 0.85 ? lineSign * rand(1, 2.2) : targetX * 1.02, -COURT.singlesW / 2, COURT.singlesW / 2);
      targetY = -side * clamp2(COURT.halfL * rand(0.72, 0.9), COURT.halfL * 0.68, COURT.halfL * 0.92);
      break;
    case GROUND_SUBTYPE.SLICE_NEUTRAL:
      targetX *= 0.84;
      targetY = -side * clamp2(COURT.halfL * rand(0.54, 0.78), COURT.halfL * 0.5, COURT.halfL * 0.8);
      break;
    case GROUND_SUBTYPE.SLICE_SKID:
      targetX = clamp2(Math.abs(targetX) < 0.8 ? lineSign * rand(0.9, 2.1) : targetX * 1.02, -COURT.singlesW / 2, COURT.singlesW / 2);
      targetY = -side * clamp2(COURT.halfL * rand(0.66, 0.86), COURT.halfL * 0.6, COURT.halfL * 0.88);
      break;
    case GROUND_SUBTYPE.SLICE_SHORT:
      targetX = openSign * rand(1.4, 2.8);
      targetY = -side * clamp2(COURT.halfL * rand(0.44, 0.62), COURT.halfL * 0.4, COURT.halfL * 0.64);
      break;
    default:
      break;
  }
  return { targetX, targetY };
}
function chooseGroundErrorMode(blueprint, quality, attrs, opts) {
  const q = clamp01(quality);
  const pressureLevel = clamp01(((opts.scoreState?.importance ?? 1) - 1) / 1);
  const stability = clamp01(
    0.52 + ((attrs.control ?? 50) - 50) / 50 * 0.18 + ((attrs.regularity ?? 50) - 50) / 50 * 0.18 + ((attrs.mentality ?? 50) - 50) / 50 * 0.14 * pressureLevel
  );
  const errorChance = clamp01((0.64 - q) * 1.18 + (0.56 - stability) * 0.34);
  if (errorChance < 0.12 || Math.random() > errorChance)
    return "CLEAN";
  if (blueprint.family === SHOT_FAMILY.TOPSPIN_DRIVE) {
    if (blueprint.subtype === GROUND_SUBTYPE.ACCEL || blueprint.subtype === GROUND_SUBTYPE.SHORT_ACCEL || blueprint.subtype === GROUND_SUBTYPE.PASSING || blueprint.subtype === GROUND_SUBTYPE.BANANA) {
      return ["SAIL_LONG", "PULL_WIDE", "SHORT_NEUTRAL"][Math.floor(Math.random() * 3)];
    }
    return ["SHORT_NEUTRAL", "FLOAT_SHORT", "SAIL_LONG"][Math.floor(Math.random() * 3)];
  }
  if (blueprint.family === SHOT_FAMILY.FLAT_DRIVE) {
    return ["NET_CLIP", "LONG_MISS", "WIDE_MISS"][Math.floor(Math.random() * 3)];
  }
  if (blueprint.subtype === GROUND_SUBTYPE.SLICE_SHORT) {
    return ["FLOAT_SHORT", "NET_DUMP", "SITTER"][Math.floor(Math.random() * 3)];
  }
  return ["SITTER", "FLOAT_SHORT", "NET_DUMP"][Math.floor(Math.random() * 3)];
}
function applyGroundErrorMode(state, errorMode, blueprint) {
  switch (errorMode) {
    case "SHORT_NEUTRAL":
      state.targetY *= 0.86;
      state.speedKmh *= 0.92;
      state.clearance += 0.08;
      state.spinForward *= 0.94;
      break;
    case "FLOAT_SHORT":
      state.targetY *= 0.82;
      state.speedKmh *= 0.84;
      state.clearance += 0.14;
      state.spinForward *= 0.82;
      if (blueprint.family === SHOT_FAMILY.SLICE) {
        state.bounce.vertical *= 1.12;
        state.bounce.friction *= 1.14;
      }
      break;
    case "SAIL_LONG":
      state.targetY *= 1.1;
      state.speedKmh *= 1.03;
      state.clearance += 0.08;
      state.spinForward *= 0.86;
      break;
    case "PULL_WIDE":
    case "WIDE_MISS":
      state.targetX *= 1.2;
      state.speedKmh *= 0.97;
      break;
    case "NET_CLIP":
      state.clearance = Math.max(0.06, state.clearance - 0.14);
      state.speedKmh *= 0.96;
      break;
    case "LONG_MISS":
      state.targetY *= 1.12;
      state.speedKmh *= 1.04;
      state.clearance = Math.max(0.08, state.clearance - 0.02);
      break;
    case "SITTER":
      state.speedKmh *= 0.82;
      state.clearance += 0.08;
      state.spinForward *= 0.76;
      state.bounce.vertical *= 1.14;
      state.bounce.friction *= 1.12;
      state.bounce.side *= 0.85;
      break;
    case "NET_DUMP":
      state.clearance = Math.max(0.06, state.clearance - 0.1);
      state.speedKmh *= 0.92;
      state.spinForward *= 0.94;
      break;
    default:
      break;
  }
}
function buildGroundShotPlan(player, opponent, quality, opts, prefs, attrs, family, familyScores, isBackhand) {
  const { blueprint, ranking } = chooseGroundSubtype(player, opponent, quality, opts, attrs, prefs, family, familyScores);
  const profile = resolveGroundSurfaceProfile(blueprint, opts.surface);
  const baseTarget = buildTarget(player, opponent, family, quality, opts);
  const tunedTarget = tuneGroundTarget(player, opponent, profile, baseTarget, quality, opts);
  const q = clamp01(quality);
  const pressureLevel = clamp01(((opts.scoreState?.importance ?? 1) - 1) / 1);
  const powerBias = (attrs.power - 50) / 50;
  const controlBias = (attrs.control - 50) / 50;
  const topspinBias = (attrs.topspin - 50) / 50;
  const sliceBias = (attrs.slice - 50) / 50;
  const regularityBias = (attrs.regularity - 50) / 50;
  const mentalityBias = (attrs.mentality - 50) / 50;
  const cadenceBias = {
    PATIENT: -0.02,
    MEASURED: -0.01,
    BALANCED: 0,
    EARLY_ATTACK: 0.02,
    EXPLOSIVE: 0.04
  }[prefs.rallyCadence] ?? 0;
  const riskBias = {
    SAFETY_FIRST: -0.04,
    SAFE: -0.02,
    CALCULATED: 0,
    GAMBLER: 0.02,
    ALLOUT: 0.04
  }[prefs.riskProfile] ?? 0;
  const executionQ = clamp01(q + regularityBias * 0.05 + mentalityBias * 0.05 * pressureLevel);
  const speedRange = isBackhand ? profile.speedKmhBH : profile.speedKmhFH;
  const spinSkill = profile.family === SHOT_FAMILY.SLICE ? sliceBias : topspinBias;
  const spinMults = getAtpSpinMultipliers(profile.sigmaType, player?.attrs, player?.mods, executionQ);
  let speedKmh = clamp2(
    rand(speedRange[0], speedRange[1]) * (0.92 + executionQ * 0.14 + powerBias * 0.1 + controlBias * 0.05 + cadenceBias + riskBias),
    speedRange[0] * 0.78,
    speedRange[1] * 1.12
  );
  let clearance = clamp2(
    rand(profile.clearance[0], profile.clearance[1]) + 0.03 - controlBias * 0.05,
    0.08,
    profile.clearance[1] + 0.3
  );
  clearance = clamp2(
    applyAngleNoise(clearance, profile.sigmaType, executionQ, attrs.control, "FULL"),
    0.05,
    profile.clearance[1] + 0.28
  );
  const hitHeight = clamp2(rand(profile.hitHeight[0], profile.hitHeight[1]), 0.18, 2.2);
  let spinForward = rand(profile.spinForward[0], profile.spinForward[1]) * (0.92 + spinSkill * 0.16) * (profile.family === SHOT_FAMILY.SLICE ? spinMults.sliceMult : spinMults.topspinMult);
  let spinZ = gauss(0, rand(profile.spinLateral[0], profile.spinLateral[1])) * (0.66 + controlBias * 0.16);
  let targetX = tunedTarget.targetX;
  let targetY = Math.sign(tunedTarget.targetY || -player.side) * clamp2(Math.abs(tunedTarget.targetY), 0.9, COURT.halfL + 0.9);
  const errorMode = chooseGroundErrorMode(profile, executionQ, attrs, opts);
  const state = {
    targetX,
    targetY,
    speedKmh,
    clearance,
    spinForward,
    spinZ,
    bounce: cloneBounceProfile(profile.bounce)
  };
  applyGroundErrorMode(state, errorMode, profile);
  const sigmaX = computeSigmaX(
    profile.sigmaType,
    executionQ,
    state.targetX,
    COURT.singlesW / 2,
    attrs.control,
    attrs.power,
    "FULL",
    player?.pos?.x ?? 0
  );
  state.targetX += gauss(0, sigmaX);
  const ySign = Math.sign(state.targetY || -player.side);
  const maxAbsY = errorMode === "SAIL_LONG" || errorMode === "LONG_MISS" ? COURT.halfL + 1.6 : COURT.halfL + 0.8;
  const maxAbsX = errorMode === "WIDE_MISS" || errorMode === "PULL_WIDE" ? COURT.singlesW / 2 + 1.25 : COURT.singlesW / 2 + 0.5;
  state.targetY = ySign * clamp2(Math.abs(state.targetY), 0.9, maxAbsY);
  state.targetX = clamp2(state.targetX, -maxAbsX, maxAbsX);
  const spinType = state.spinForward > 4 ? "TOP" : state.spinForward < -4 ? "SLICE" : "FLAT";
  const controlAttrName = isBackhand ? "bhControle" : "fhControle";
  const powerAttrName = isBackhand ? "bhPotencia" : "fhPotencia";
  return {
    family,
    subtype: profile.subtype,
    type: profile.legacyType,
    sigmaType: profile.sigmaType,
    effectiveQuality: executionQ,
    spinType,
    power: kmhToMs(state.speedKmh),
    targetX: state.targetX,
    targetY: state.targetY,
    netClearance: clamp2(state.clearance, 0.05, profile.clearance[1] + 0.28),
    hitHeight,
    spinX: state.spinForward * -(player.side || 1),
    spinZ: state.spinZ,
    zone: computeZone(state.targetX, state.targetY, family),
    qualityBand: resolveQualityBand(executionQ),
    powerAttr: attrs.power,
    controlAttr: attrs.control,
    powerAttrName,
    controlAttrName,
    skillAttr: profile.family === SHOT_FAMILY.SLICE ? "slice" : "topspin",
    familyScores,
    subtypeScores: ranking,
    prefsSnapshot: prefs,
    bounceProfile: { ...state.bounce },
    lowQConsequences: { ...profile.lowQ, errorMode },
    errorMode,
    isBackhand,
    launchOptions: null
  };
}
function buildShotPlan(player, opponent, quality, opts = {}) {
  const prefs = getPlayerPrefs(player);
  const isBackhand = shotHand(player, opts.ballX ?? 0, opts.isBackhand);
  const attrs = getWingAttrs(player, isBackhand);
  const familyScores = scoreFamilies(player, opponent, quality, opts, attrs, isBackhand);
  const family = pickFamily(familyScores);
  if (isGroundFamily(family)) {
    return buildGroundShotPlan(player, opponent, quality, opts, prefs, attrs, family, familyScores, isBackhand);
  }
  const profile = SHOT_LIBRARY[family];
  const band = resolveQualityBand(quality);
  const { targetX: baseTargetX, targetY: baseTargetY } = buildTarget(player, opponent, family, quality, opts);
  const speedRange = isBackhand ? profile.speedKmhBH : profile.speedKmhFH;
  const powerBias = (attrs.power - 50) / 50;
  const controlBias = (attrs.control - 50) / 50;
  const topspinBias = (attrs.topspin - 50) / 50;
  const sliceBias = (attrs.slice - 50) / 50;
  const skillBias = family === SHOT_FAMILY.OVERHEAD ? (attrs.smash - 50) / 50 : family === SHOT_FAMILY.VOLLEY || family === SHOT_FAMILY.HALF_VOLLEY ? (attrs.volley - 50) / 50 : family === SHOT_FAMILY.SLICE || family === SHOT_FAMILY.DROP_SHOT ? sliceBias : topspinBias;
  const q = clamp01(quality);
  const lowQ = clamp01(1 - q);
  const currentIntent = opts.currentIntent ?? player?.ctx?.currentIntent ?? "BUILD";
  const isBuildIntent = currentIntent === "BUILD";
  const isPressureIntent = currentIntent === "PRESSURE";
  const isFinishIntent = currentIntent === "FINISH";
  const riskTuning = {
    SAFETY_FIRST: { speed: -0.04, clearance: 0.08, width: -0.1, depth: -0.03 },
    SAFE: { speed: -0.02, clearance: 0.04, width: -0.06, depth: -0.01 },
    CALCULATED: { speed: 0, clearance: 0, width: 0, depth: 0 },
    GAMBLER: { speed: 0.03, clearance: -0.04, width: 0.08, depth: 0.02 },
    ALLOUT: { speed: 0.06, clearance: -0.08, width: 0.12, depth: 0.04 }
  }[prefs.riskProfile] ?? { speed: 0, clearance: 0, width: 0, depth: 0 };
  const cadenceTuning = {
    PATIENT: { speed: -0.02, clearance: 0.05, depth: -0.02, spin: 0.04 },
    MEASURED: { speed: -0.01, clearance: 0.02, depth: -0.01, spin: 0.02 },
    BALANCED: { speed: 0, clearance: 0, depth: 0, spin: 0 },
    EARLY_ATTACK: { speed: 0.03, clearance: -0.03, depth: 0.02, spin: -0.02 },
    EXPLOSIVE: { speed: 0.05, clearance: -0.05, depth: 0.04, spin: -0.04 }
  }[prefs.rallyCadence] ?? { speed: 0, clearance: 0, depth: 0, spin: 0 };
  const netTuning = {
    HUNTER: { speed: 0.02, clearance: -0.02 },
    PROACTIVE: { speed: 0.01, clearance: -0.01 },
    OPPORTUNIST: { speed: 0, clearance: 0 },
    RELUCTANT: { speed: 0, clearance: 0.01 },
    AVOIDS: { speed: -0.01, clearance: 0.02 }
  }[prefs.netGame] ?? { speed: 0, clearance: 0 };
  const intentTuning = {
    speed: 0,
    clearance: 0,
    depth: 0,
    spin: 0,
    width: 0
  };
  if (family === SHOT_FAMILY.TOPSPIN_DRIVE) {
    if (isBuildIntent) {
      intentTuning.speed = -0.03;
      intentTuning.clearance = 0.05;
      intentTuning.depth = 0.03;
      intentTuning.spin = 0.1;
    } else if (isPressureIntent) {
      intentTuning.speed = 0.02;
      intentTuning.clearance = -0.02;
      intentTuning.depth = 0.02;
      intentTuning.spin = 0.02;
      intentTuning.width = 0.04;
    } else if (isFinishIntent) {
      intentTuning.speed = 0.04;
      intentTuning.clearance = -0.04;
      intentTuning.depth = 0.03;
      intentTuning.spin = -0.04;
      intentTuning.width = 0.07;
    }
  } else if (family === SHOT_FAMILY.FLAT_DRIVE) {
    if (isPressureIntent) {
      intentTuning.speed = 0.01;
      intentTuning.clearance = 0.01;
      intentTuning.depth = 0;
      intentTuning.width = 0.01;
    } else if (isFinishIntent) {
      intentTuning.speed = 0.02;
      intentTuning.clearance = 0;
      intentTuning.depth = 0;
      intentTuning.width = 0.02;
    }
  } else if (family === SHOT_FAMILY.DROP_SHOT) {
    if (isPressureIntent || isFinishIntent) {
      intentTuning.speed = -0.04;
      intentTuning.clearance = 0.03;
      intentTuning.depth = -0.03;
      intentTuning.width = 0.02;
    }
  } else if (family === SHOT_FAMILY.SLICE) {
    if (isBuildIntent) {
      intentTuning.speed = -0.01;
      intentTuning.clearance = 0.02;
      intentTuning.spin = 0.03;
    } else if (isFinishIntent) {
      intentTuning.speed = 0.01;
      intentTuning.width = 0.03;
    }
  }
  const widthSigma = (0.18 + lowQ * profile.lowQ.widthExpand) * (1.06 - controlBias * 0.18) * (1 + riskTuning.width + intentTuning.width);
  const depthShift = profile.lowQ.depthLoss * lowQ;
  const targetX = clamp2(baseTargetX + gauss(0, widthSigma), -COURT.singlesW / 2 - 1.8, COURT.singlesW / 2 + 1.8);
  const targetY = Math.sign(baseTargetY || -player.side) * clamp2(
    Math.abs(baseTargetY) - depthShift * COURT.halfL + (riskTuning.depth + cadenceTuning.depth + intentTuning.depth) * COURT.halfL,
    0.9,
    COURT.halfL + 1.8
  );
  const speedKmh = clamp2(
    rand(speedRange[0], speedRange[1]) * (0.92 + q * 0.14 + powerBias * 0.1 + skillBias * 0.05 + riskTuning.speed + cadenceTuning.speed + netTuning.speed + intentTuning.speed),
    speedRange[0] * 0.78,
    speedRange[1] * 1.08
  );
  const clearance = clamp2(
    rand(profile.clearance[0], profile.clearance[1]) + lowQ * profile.lowQ.netRisk - controlBias * 0.05 + riskTuning.clearance + cadenceTuning.clearance + netTuning.clearance + intentTuning.clearance,
    family === SHOT_FAMILY.DROP_SHOT ? 0.04 : 0.08,
    profile.clearance[1] + 0.3
  );
  const hitHeight = clamp2(rand(profile.hitHeight[0], profile.hitHeight[1]), 0.18, 2.95);
  const forwardBias = family === SHOT_FAMILY.SLICE || family === SHOT_FAMILY.DROP_SHOT ? sliceBias : topspinBias;
  const spinForward = rand(profile.spinForward[0], profile.spinForward[1]) * (0.9 + forwardBias * 0.18 - lowQ * profile.lowQ.spinLoss + cadenceTuning.spin + intentTuning.spin);
  const spinZ = gauss(0, rand(profile.spinLateral[0], profile.spinLateral[1])) * (0.65 + controlBias * 0.16);
  const spinType = spinForward > 4 ? "TOP" : spinForward < -4 ? "SLICE" : "FLAT";
  const type = family === SHOT_FAMILY.LOB ? chooseLobType(opponent?.atNet, q, attrs.control) : LEGACY_TYPE[family];
  return {
    family,
    type,
    effectiveQuality: q,
    spinType,
    power: kmhToMs(speedKmh),
    targetX,
    targetY,
    netClearance: clearance,
    hitHeight,
    spinX: spinForward * -(player.side || 1),
    spinZ,
    zone: computeZone(targetX, targetY, family),
    qualityBand: band,
    powerAttr: attrs.power,
    controlAttr: attrs.control,
    skillAttr: family === SHOT_FAMILY.OVERHEAD ? "smash" : family === SHOT_FAMILY.VOLLEY || family === SHOT_FAMILY.HALF_VOLLEY ? "volley" : isBackhand ? "bhControle" : "fhControle",
    familyScores,
    prefsSnapshot: prefs,
    bounceProfile: { ...profile.bounce },
    lowQConsequences: { ...profile.lowQ },
    isBackhand,
    launchOptions: family === SHOT_FAMILY.DROP_SHOT ? {
      flightProfile: {
        mode: "drop_rewrite",
        netMinZ: COURT.netHeight + 0.12,
        preferredNetZ: COURT.netHeight + 0.18,
        minTime: 0.82,
        maxTime: 1.8,
        minSpeed: 11,
        maxSpeed: 30,
        apexMinZ: 0.58,
        apexMaxZ: 1.4,
        preferredApexZ: 0.8
      }
    } : null
  };
}
function decideShotAndBuild(player, opponent, quality, opts = {}) {
  const shot = buildShotPlan(player, opponent, quality, opts);
  const shotQ = clamp01(shot.effectiveQuality ?? quality);
  const aiTrace = {
    chosen: {
      type: shot.type,
      family: shot.family,
      subtype: shot.subtype ?? null,
      qualityBand: shot.qualityBand,
      scores: shot.familyScores,
      _evProbWin: clamp01(shotQ * 0.55 + shot.powerAttr / 180)
    }
  };
  return { shot, aiTrace };
}
function executeRallyShot(ball, player, opponent, quality, opts = {}) {
  const { shot, aiTrace } = decideShotAndBuild(player, opponent, quality, opts);
  const q = clamp01(shot.effectiveQuality ?? quality);
  const runtime = {
    family: shot.family,
    subtype: shot.subtype ?? null,
    quality: q,
    bounce: { ...shot.bounceProfile },
    lowQ: { ...shot.lowQConsequences },
    spinType: shot.spinType,
    sigmaType: shot.sigmaType ?? null,
    errorMode: shot.errorMode ?? "CLEAN"
  };
  launchBall2(
    ball,
    player.pos,
    shot.targetX,
    shot.targetY,
    shot.spinType === "TOP" ? 1 : shot.spinType === "SLICE" ? -1 : 0,
    shot.power,
    shot.netClearance,
    shot.hitHeight,
    shot.spinX,
    shot.spinZ,
    shot.launchOptions
  );
  ball._shotRuntime = runtime;
  ball._isDropShot = shot.family === SHOT_FAMILY.DROP_SHOT;
  ball._deadBall = false;
  ball._servePhysType = null;
  ball._lastTargetX = shot.targetX;
  ball._lastTargetY = shot.targetY;
  ball._lastContactX = player.pos?.x ?? 0;
  ball._lastContactY = player.pos?.y ?? 0;
  ball.lastShotType = shot.type;
  player._aiTrace = aiTrace;
  return {
    shot,
    aiTrace,
    effectiveQuality: q,
    powerAttr: shot.powerAttr,
    controlAttr: shot.controlAttr,
    sigma: shot.sigmaType ? computeSigmaX(shot.sigmaType, q, shot.targetX, COURT.singlesW / 2, shot.controlAttr, shot.powerAttr, "FULL", player.pos?.x ?? 0) : Math.abs(shot.targetX - (ball._lastTargetX ?? shot.targetX))
  };
}
function computeAcceleration2(ball, airDensity = PHYSICS.airDensity) {
  const vel = ball.vel;
  const spd = mag3(vel);
  const dragMag = 0.5 * PHYSICS.dragCoeff * BALL_AREA * airDensity * spd * spd;
  const Fd = spd > 0.01 ? scale3(norm3(vel), -dragMag) : v3(0, 0, 0);
  const spinMag = mag3(ball.spin);
  const spinRatio = spinMag * PHYSICS.ballRadius / Math.max(spd, 1);
  const clEff = clamp2(0.15 + spinRatio * 0.42, 0.08, 0.38);
  const Fm = scale3(cross3(ball.spin, vel), clEff * airDensity * BALL_AREA * PHYSICS.ballRadius);
  return {
    x: (Fd.x + Fm.x) / PHYSICS.ballMass,
    y: (Fd.y + Fm.y) / PHYSICS.ballMass,
    z: PHYSICS.gravity + (Fd.z + Fm.z) / PHYSICS.ballMass
  };
}
function stepBallPhysics(ball, dt, airDensity = PHYSICS.airDensity) {
  if (!ball.inFlight)
    return;
  const acc = computeAcceleration2(ball, airDensity);
  ball._prevY = ball.pos.y;
  ball._prevZ = ball.pos.z;
  ball.vel.x += acc.x * dt;
  ball.vel.y += acc.y * dt;
  ball.vel.z += acc.z * dt;
  ball.pos.x += ball.vel.x * dt;
  ball.pos.y += ball.vel.y * dt;
  ball.pos.z += ball.vel.z * dt;
  const spinDecay = 1 - 5e-3 * (airDensity / PHYSICS.airDensity);
  ball.spin.x *= spinDecay;
  ball.spin.y *= spinDecay;
  ball.spin.z *= spinDecay;
  if (ball.bounceCount > 0) {
    ball._timeSinceBounce = (ball._timeSinceBounce ?? 999) + dt;
  }
  if (ball._deadBall && ball.pos.z <= PHYSICS.ballRadius + 0.05) {
    const drag = 1 - Math.min(1, 8.5 * dt);
    ball.vel.x *= drag;
    ball.vel.y *= drag;
  }
}
function cloneShotRuntime(runtime) {
  if (!runtime)
    return null;
  return {
    ...runtime,
    bounce: runtime.bounce ? { ...runtime.bounce } : null,
    lowQ: runtime.lowQ ? { ...runtime.lowQ } : null
  };
}
function applyGroundResponse(ball, courtPhys, randomize = true) {
  if (ball.pos.z > PHYSICS.ballRadius || ball.vel.z >= 0)
    return false;
  ball.pos.z = PHYSICS.ballRadius;
  const runtime = ball._shotRuntime ?? null;
  const isSliceServeBounce = ball._servePhysType === "SLICE" && ball.bounceCount === 0;
  const restitution = courtPhys?.restitution ?? PHYSICS.restitution;
  const baseFriction = Math.min(0.99, (courtPhys?.groundFriction ?? PHYSICS.groundFriction) + (courtPhys?.humidityFriction ?? 0));
  const effSpin = ball.spin.x * -(Math.sign(ball.vel.y) || 1);
  const isTopspinBounce = runtime?.family === SHOT_FAMILY.TOPSPIN_DRIVE && effSpin > 0;
  let verticalMult = effSpin < 0 ? clamp2(1 - Math.abs(effSpin) * 0.1, 0.42, 0.82) : 1;
  if (isTopspinBounce) {
    verticalMult = clamp2(1.08 + Math.abs(effSpin) * 0.055, 1.12, 1.42);
  }
  let friction = isSliceServeBounce ? baseFriction * 0.78 : effSpin > 0 ? baseFriction * 0.88 : baseFriction * 0.54;
  let sideCoeff = 0.028 + Math.min(0.025, Math.sqrt(ball.vel.x ** 2 + ball.vel.y ** 2) * 6e-4);
  if (runtime?.bounce) {
    verticalMult *= runtime.bounce.vertical ?? 1;
    friction *= runtime.bounce.friction ?? 1;
    sideCoeff += runtime.bounce.side ?? 0;
  }
  if (ball.bounceCount === 0 && ball._serveBounceProfile) {
    verticalMult *= ball._serveBounceProfile.vertical ?? 1;
    friction *= ball._serveBounceProfile.friction ?? 1;
    sideCoeff += ball._serveBounceProfile.side ?? 0;
  }
  ball.vel.z = -ball.vel.z * restitution + effSpin * PHYSICS.spinBounceCoeff;
  if (isSliceServeBounce) {
    ball.vel.z = Math.max(ball.vel.z * 1.28, 0.52);
  } else if (effSpin < 0) {
    ball.vel.z *= verticalMult;
  } else if (isTopspinBounce) {
    ball.vel.z *= verticalMult;
  }
  ball.vel.x *= friction;
  ball.vel.y *= friction;
  ball.vel.x += ball.spin.z * sideCoeff;
  if (runtime?.family === SHOT_FAMILY.DROP_SHOT && ball.bounceCount === 0) {
    ball.vel.x *= 0.48;
    ball.vel.y *= 0.48;
    ball.vel.z = clamp2(ball.vel.z * 0.58, 0.92, 1.28);
    ball._deadBall = true;
  } else if (runtime?.family === SHOT_FAMILY.SLICE && effSpin < -0.4 && ball.bounceCount === 0) {
    ball.vel.x *= 0.82;
    ball.vel.y *= 0.82;
    ball.vel.z *= 0.82;
    ball._deadBall = false;
  } else if (runtime?.bounce?.deadBall && ball.bounceCount === 0) {
    ball._deadBall = true;
  } else if (ball.bounceCount === 0) {
    ball._deadBall = false;
  }
  ball.spin.x *= -0.28;
  ball.spin.z *= 0.45;
  ball.bounceCount++;
  ball._timeSinceBounce = 0;
  const bVariance = randomize ? courtPhys?.bounceVariance ?? 0 : 0;
  if (bVariance > 0) {
    const ga = gauss(0, bVariance);
    ball.vel.z = Math.max(0, ball.vel.z + ga * 3.5);
    ball.vel.x += ga * 1.4;
  }
  if (isSliceServeBounce)
    ball._servePhysType = null;
  if (ball.bounceCount >= 1)
    ball._serveBounceProfile = null;
  return true;
}
function handleGroundBounce(ball, courtPhys) {
  return applyGroundResponse(ball, courtPhys, true);
}
function checkNetCollision(ball) {
  const prevY = ball._prevY ?? ball.pos.y;
  const currY = ball.pos.y;
  if (prevY === 0 || Math.sign(prevY) === Math.sign(currY))
    return false;
  const frac = Math.abs(prevY) / (Math.abs(prevY) + Math.abs(currY));
  const zAtNet = (ball._prevZ ?? ball.pos.z) + frac * (ball.pos.z - (ball._prevZ ?? ball.pos.z));
  const netTop = COURT.netHeight + THRESHOLDS.netTolerance;
  const lipZone = 0.04;
  if (zAtNet > COURT.netHeight - lipZone && zAtNet <= netTop + lipZone) {
    const lip = (zAtNet - (COURT.netHeight - lipZone)) / (2 * lipZone);
    const hitChance = 0.2 + lip * 0.6;
    if (Math.random() < hitChance) {
      ball.vel.y *= -0.3;
      ball.vel.z = Math.abs(ball.vel.z) * 0.5 + 1.2;
      ball.vel.x += (Math.random() - 0.5) * 1.8;
      ball._lipNet = true;
      return false;
    }
    return false;
  }
  return zAtNet <= netTop;
}
function checkOutOfBounds(ball) {
  return Math.abs(ball.pos.x) > COURT.singlesW / 2 + THRESHOLDS.outTolerance || Math.abs(ball.pos.y) > COURT.halfL + THRESHOLDS.outTolerance;
}
function checkServiceBox(ball, serverSide, serveLeft) {
  const yOk = serverSide > 0 ? ball.pos.y >= -COURT.serviceLineY && ball.pos.y <= 0 : ball.pos.y <= COURT.serviceLineY && ball.pos.y >= 0;
  if (!yOk)
    return false;
  if (Math.abs(ball.pos.x) > COURT.singlesW / 2)
    return false;
  if (serveLeft === true && ball.pos.x < -0.05)
    return false;
  if (serveLeft === false && ball.pos.x > 0.05)
    return false;
  return true;
}
function stepPhysics(gs, dt) {
  const ball = gs.ball;
  const spd = mag3(ball.vel);
  applyWindToBall(ball, gs.environment, dt);
  const sub = spd > 32 ? 6 : spd > 16 ? 4 : ball.pos.z < 0.28 ? 4 : 2;
  const subDt = dt / sub;
  const airDensity = gs.environment?.airDensity ?? PHYSICS.airDensity;
  for (let s = 0; s < sub; s++) {
    stepBallPhysics(ball, subDt, airDensity);
    if (handleGroundBounce(ball, gs.courtPhysics)) {
      gs.lastBouncePos = { ...ball.pos };
      gs._bounce(gs);
    }
  }
}
function predictTrajectory(ball, targetY, maxTime = 2.8, airDensityForPred = PHYSICS.airDensity, courtPhysForPred = null, interceptOpts = null) {
  const sim = {
    pos: { ...ball.pos },
    vel: { ...ball.vel },
    spin: { ...ball.spin },
    inFlight: true,
    bounceCount: ball.bounceCount ?? 0,
    _postBounce: (ball.bounceCount ?? 0) > 0,
    _optHitFound: false,
    _optHitScore: -Infinity,
    _servePhysType: ball._servePhysType ?? null,
    _isDropShot: !!ball._isDropShot,
    _deadBall: !!ball._deadBall,
    _shotRuntime: cloneShotRuntime(ball._shotRuntime)
  };
  const preferredContactZ = interceptOpts?.preferredContactZ ?? 0.75;
  const minContactZ = interceptOpts?.minContactZ ?? 0.45;
  const maxContactZ = interceptOpts?.maxContactZ ?? 1.2;
  const contactBand = interceptOpts?.contactBand ?? 0.32;
  const yTolerance = interceptOpts?.yTolerance ?? 1.35;
  const delayBand = interceptOpts?.delayBand ?? 0.78;
  const riseBonus = interceptOpts?.riseBonus ?? 0.16;
  const fallPenalty = interceptOpts?.fallPenalty ?? 0.18;
  const lowBallBonus = interceptOpts?.lowBallBonus ?? 0.04;
  let lastPos = { ...sim.pos };
  let crossPoint = null;
  let landPoint = null;
  const dt = 1 / 120;
  const steps = Math.floor(maxTime / dt);
  for (let i = 0; i < steps; i++) {
    const acc = computeAcceleration2(sim, airDensityForPred);
    sim.vel.x += acc.x * dt;
    sim.vel.y += acc.y * dt;
    sim.vel.z += acc.z * dt;
    lastPos = { ...sim.pos };
    sim.pos.x += sim.vel.x * dt;
    sim.pos.y += sim.vel.y * dt;
    sim.pos.z += sim.vel.z * dt;
    if (applyGroundResponse(sim, courtPhysForPred, false)) {
      if (!landPoint) {
        landPoint = { x: sim.pos.x, y: sim.pos.y, t: (i + 1) * dt };
      }
      sim._postBounce = true;
    }
    if (sim._postBounce && sim.pos.z >= minContactZ && sim.pos.z <= maxContactZ) {
      const distToTargetY = Math.abs(sim.pos.y - targetY);
      const z = sim.pos.z;
      const tNow = (i + 1) * dt;
      const timeSinceBounce = landPoint ? Math.max(0, tNow - landPoint.t) : tNow;
      const heightFit = 1 - clamp2(Math.abs(z - preferredContactZ) / Math.max(0.08, contactBand), 0, 1);
      const yFit = 1 - clamp2(distToTargetY / Math.max(0.5, yTolerance), 0, 1);
      const timingFit = 1 - clamp2(timeSinceBounce / Math.max(0.15, delayBand), 0, 1);
      const riseTerm = sim.vel.z >= 0 ? riseBonus : -fallPenalty;
      const lowBallTerm = z <= preferredContactZ ? lowBallBonus : 0;
      const candidateScore = heightFit * 2.5 + yFit * 1.7 + timingFit * 1.3 + riseTerm + lowBallTerm;
      if (!sim._optHitFound || candidateScore > sim._optHitScore) {
        sim._optHitFound = true;
        sim._optHitScore = candidateScore;
        sim._optHitX = sim.pos.x;
        sim._optHitY = sim.pos.y;
        sim._optHitZ = sim.pos.z;
        sim._optHitT = tNow;
      }
    }
    if (!crossPoint && Math.sign(lastPos.y - targetY) !== Math.sign(sim.pos.y - targetY)) {
      const f = Math.abs(targetY - lastPos.y) / (Math.abs(sim.pos.y - lastPos.y) || 1e-9);
      crossPoint = {
        x: lastPos.x + f * (sim.pos.x - lastPos.x),
        y: targetY,
        z: lastPos.z + f * (sim.pos.z - lastPos.z),
        t: (i + f) * dt
      };
      if (landPoint)
        break;
    }
    if (landPoint && mag3(sim.vel) < 0.4)
      break;
  }
  const optimalHitPoint = sim._optHitFound ? { x: sim._optHitX, y: sim._optHitY, z: sim._optHitZ, t: sim._optHitT } : null;
  return { crossPoint, landPoint, optimalHitPoint };
}
function launchDropBall(ball, fromPos, targetX, targetY, hitHeight, actualSpinX, actualSpinZ, options = null) {
  const dx = targetX - fromPos.x;
  const dy = targetY - fromPos.y;
  const hDist = Math.sqrt(dx * dx + dy * dy);
  if (hDist < 0.01)
    return;
  const dirX = dx / hDist;
  const dirY = dy / hDist;
  const fp = options?.flightProfile ?? {};
  const gravity = PHYSICS.gravity;
  const gravityMag = Math.abs(gravity);
  const dropNetZ = fp.netMinZ ?? COURT.netHeight + 0.08;
  const preferredNetZ = fp.preferredNetZ ?? dropNetZ + 0.06;
  const preferredApexZ = fp.preferredApexZ ?? 0.82;
  const minApexZ = Math.max(fp.apexMinZ ?? 0.56, hitHeight + 0.08);
  const maxApexZ = Math.max(fp.apexMaxZ ?? 1.42, minApexZ + 0.2);
  const carryBoost = Math.max(0, hDist - 8);
  const minSpeed = Math.max(fp.minSpeed ?? 12, 10 + carryBoost * 0.55);
  const maxSpeed = Math.max(fp.maxSpeed ?? 32, minSpeed + 8, 20 + carryBoost * 1.15);
  const minTime = Math.max(0.62, (fp.minTime ?? 0.78) - carryBoost * 0.01);
  const maxTime = Math.max(minTime + 0.24, (fp.maxTime ?? 1.75) - carryBoost * 0.02);
  const endZ = PHYSICS.ballRadius;
  const dropSpinX = actualSpinX !== null ? clamp2(actualSpinX * 0.03, -1.2, 1.2) : 0;
  const dropSpinZ = actualSpinZ !== null ? clamp2(actualSpinZ * 0.08, -0.7, 0.7) : 0;
  const simulateDrop = (hSpeed, vz) => {
    const dt = 1 / 180;
    const sim = {
      pos: { x: fromPos.x, y: fromPos.y, z: hitHeight },
      vel: { x: dirX * hSpeed, y: dirY * hSpeed, z: vz },
      spin: { x: dropSpinX, y: 0, z: dropSpinZ },
      inFlight: true,
      bounceCount: 0,
      _deadBall: false
    };
    let last = { x: sim.pos.x, y: sim.pos.y, z: sim.pos.z };
    let zAtNet = null;
    let apexZ = sim.pos.z;
    for (let i = 0; i < 540; i++) {
      stepBallPhysics(sim, dt, PHYSICS.airDensity);
      apexZ = Math.max(apexZ, sim.pos.z);
      if (zAtNet === null && Math.sign(last.y) !== Math.sign(sim.pos.y)) {
        const frac = Math.abs(last.y) / (Math.abs(sim.pos.y - last.y) || 1e-9);
        zAtNet = last.z + (sim.pos.z - last.z) * frac;
      }
      if (sim.pos.z <= endZ && sim.vel.z < 0) {
        const frac = (last.z - endZ) / (last.z - sim.pos.z || 1e-9);
        return {
          landingX: last.x + (sim.pos.x - last.x) * frac,
          landingY: last.y + (sim.pos.y - last.y) * frac,
          landingT: (i + frac) * dt,
          crossedNet: zAtNet !== null,
          zAtNet,
          apexZ
        };
      }
      last = { x: sim.pos.x, y: sim.pos.y, z: sim.pos.z };
    }
    return null;
  };
  let chosen = null;
  let bestScore = Infinity;
  for (let apexStep = 0; apexStep <= 14; apexStep++) {
    const apexBlend = apexStep / 14;
    const apexZ = minApexZ + (maxApexZ - minApexZ) * apexBlend;
    const vz = Math.sqrt(Math.max(0, 2 * gravityMag * (apexZ - hitHeight)));
    if (vz <= 0)
      continue;
    for (let speedStep = 0; speedStep <= 28; speedStep++) {
      const speedBlend = speedStep / 28;
      const hSpeed = minSpeed + (maxSpeed - minSpeed) * speedBlend;
      const sim = simulateDrop(hSpeed, vz);
      if (!sim)
        continue;
      if (!sim.crossedNet)
        continue;
      if (sim.zAtNet < dropNetZ)
        continue;
      if (sim.landingT < minTime || sim.landingT > maxTime)
        continue;
      const landingError = Math.hypot(sim.landingX - targetX, sim.landingY - targetY);
      const score = landingError * 7.5 + Math.abs(sim.zAtNet - preferredNetZ) * 1.6 + Math.abs(sim.apexZ - preferredApexZ) * 1;
      if (score < bestScore) {
        bestScore = score;
        chosen = { hSpeed, vz };
      }
    }
  }
  if (!chosen) {
    const fallbackTime = clamp2(hDist / 19, 0.65, 1.5);
    const fallbackSpeed = clamp2(hDist / Math.max(fallbackTime, 1e-6), minSpeed, maxSpeed);
    const fallbackVz = Math.max(
      1.1,
      Math.sqrt(Math.max(0, 2 * gravityMag * Math.max(0, preferredApexZ - hitHeight))),
      (endZ - hitHeight - 0.5 * gravity * fallbackTime * fallbackTime) / fallbackTime
    );
    chosen = { hSpeed: fallbackSpeed, vz: fallbackVz };
  }
  ball.pos.z = hitHeight;
  ball.vel.x = dirX * chosen.hSpeed;
  ball.vel.y = dirY * chosen.hSpeed;
  ball.vel.z = chosen.vz;
  ball.spin.x = dropSpinX;
  ball.spin.z = dropSpinZ;
  ball.inFlight = true;
  ball.bounceCount = 0;
}
function launchBall2(ball, fromPos, targetX, targetY, spinType, power, netClearance = 0.35, hitHeight = 0.9, actualSpinX = null, actualSpinZ = null, options = null) {
  if (options?.flightProfile?.mode === "drop_rewrite") {
    return launchDropBall(ball, fromPos, targetX, targetY, hitHeight, actualSpinX, actualSpinZ, options);
  }
  return launchBall(ball, fromPos, targetX, targetY, spinType, power, netClearance, hitHeight, actualSpinX, actualSpinZ, options);
}

// src/MovementMaster.js
function gauss2(mean = 0, sigma = 1) {
  const u1 = Math.max(1e-9, Math.random());
  const u2 = Math.random();
  return mean + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
function getStyleBaselineY(player) {
  const prefs = player.prefs;
  const BEHIND = 0.7;
  const cadenceOffset = prefs ? {
    EXPLOSIVE: 0.55,
    EARLY_ATTACK: 0.45,
    BALANCED: 0.35,
    MEASURED: 0.28,
    PATIENT: 0.2
  }[prefs.rallyCadence] ?? 0.35 : 0.4;
  const netOffset = prefs ? {
    HUNTER: 0.15,
    PROACTIVE: 0.08,
    OPPORTUNIST: 0,
    RELUCTANT: 0,
    AVOIDS: 0
  }[prefs.netGame] ?? 0 : 0;
  const riskOffset = prefs ? {
    SAFETY_FIRST: -0.1,
    SAFE: -0.05,
    CALCULATED: 0,
    GAMBLER: 0.05,
    ALLOUT: 0.1
  }[prefs.riskProfile] ?? 0 : 0;
  const buildOffset = prefs ? {
    CENTRE_CONTROL: -0.08,
    VARIED: 0,
    CROSS_BUILDER: 0.03,
    CROSS_DOMINANT: 0.06,
    DTL_HUNTER: 0.08
  }[prefs.buildStyle] ?? 0 : 0;
  const offset = Math.min(0.78, cadenceOffset + netOffset + riskOffset + buildOffset);
  const isPatient = prefs?.rallyCadence === "PATIENT" || prefs?.rallyCadence === "MEASURED";
  const retreatFactor = isPatient ? 0.4 : 1;
  const mom = player.ctx?.momentum ?? 0.5;
  const dynOff = offset + clamp2((0.5 - mom) * 1.2 * retreatFactor, -0.3, 0.6);
  const rawY = player.side * (COURT.halfL + BEHIND - dynOff);
  const minDepth = player.side * COURT.halfL;
  return player.side > 0 ? Math.max(rawY, minDepth + 0.05) : Math.min(rawY, minDepth - 0.05);
}
function getStyleDepthOffset(player) {
  const prefs = player.prefs;
  if (!prefs)
    return 1.6;
  const cadenceDepth = {
    PATIENT: 2.6,
    MEASURED: 2.2,
    BALANCED: 1.8,
    EARLY_ATTACK: 1,
    EXPLOSIVE: 0.7
  }[prefs.rallyCadence] ?? 1.8;
  const riskAdj = {
    SAFETY_FIRST: 0.4,
    SAFE: 0.2,
    CALCULATED: 0,
    GAMBLER: -0.2,
    ALLOUT: -0.4
  }[prefs.riskProfile] ?? 0;
  const netAdj = {
    HUNTER: -0.6,
    PROACTIVE: -0.3,
    OPPORTUNIST: 0,
    RELUCTANT: 0,
    AVOIDS: 0
  }[prefs.netGame] ?? 0;
  return Math.max(0.4, cadenceDepth + riskAdj + netAdj);
}
function getMovementState(player, gs) {
  const justHit = gs.ball.lastHitBy === player.id;
  if (justHit)
    return "RECOVER";
  if ((player.ctx._splitStepTimer ?? 0) > 0)
    return "SPLITSTEP";
  const ball = gs.ball;
  const ballComing = ball.inFlight && (player.side > 0 && ball.vel.y > 0 || player.side < 0 && ball.vel.y < 0);
  const ballOnMySide = Math.sign(ball.pos.y) === player.side || Math.abs(ball.pos.y) < 0.5;
  const bouncedOnOppSide = (ball.bounceCount ?? 0) >= 1 && Math.sign(ball.pos.y) !== player.side && Math.abs(ball.pos.y) > 0.5;
  const isReturnBounce = bouncedOnOppSide && (player.side > 0 && ball.vel.y > 0 || player.side < 0 && ball.vel.y < 0 || Math.abs(ball.pos.y) < 5 && ball.pos.z < 1.5);
  if (ballComing || ballOnMySide || isReturnBounce) {
    const margin = player._arrivalMargin ?? -1;
    const hitTgt = player._hitTarget ?? ball.pos;
    const d = dist2(player.pos, hitTgt);
    const reach = player.reach ?? 0.85;
    const bounced = (ball.bounceCount ?? 0) >= 1;
    const distToBall = Math.sqrt(
      (ball.pos.x - player.pos.x) ** 2 + (ball.pos.y - player.pos.y) ** 2
    );
    const ballReachConsistent = distToBall <= d * 4 + reach;
    const inHitWindow = d < reach * 1.5 && margin > 0.05 && bounced && distToBall < reach * 3.5 && ballReachConsistent;
    return inHitWindow ? "HIT" : "MOVE";
  }
  return "WAIT";
}
function computeWaitTarget(player, gs) {
  const opp = gs.players?.find((p) => p.id !== player.id);
  const lastShotX = player.ctx?._lastShotX ?? 0;
  const courtMode = player.ctx?.courtMode ?? "BASE";
  const isNetApproach = courtMode === "TRANSITION" || courtMode === "NET";
  const prefs = player.prefs ?? {};
  const adaptability = prefs.adaptability ?? 60;
  const bisectorX = clamp2(
    lastShotX * 0.2 + (opp?.pos.x ?? 0) * 0.1,
    -1.5,
    1.5
  );
  let finalX = bisectorX;
  if (!isNetApproach && player.prefs?.rallyCadence !== "EXPLOSIVE" && opp) {
    const hist = opp.ctx?.patternHistory ?? [];
    const isPatient = player.prefs?.rallyCadence === "PATIENT" || player.prefs?.rallyCadence === "MEASURED";
    const minHist = Math.max(2, (isPatient ? 3 : 4) - Math.round(adaptability / 45));
    if (hist.length >= minHist) {
      const last = hist.slice(-minHist);
      if (last.every((h) => h.dir === last[0].dir) && last[0].dir !== 0) {
        const antMultBase = isPatient ? 1.5 : player.prefs?.rallyCadence === "EXPLOSIVE" ? 0.5 : 1;
        const antMult = antMultBase * (0.85 + adaptability / 200);
        finalX = clamp2(finalX + last[0].dir * 0.25 * antMult, -2.5, 2.5);
      }
    }
  }
  if (!isNetApproach) {
    if (prefs.buildStyle === "CENTRE_CONTROL") {
      finalX = clamp2(finalX * 0.55, -1.4, 1.4);
    } else if (prefs.buildStyle === "CROSS_DOMINANT") {
      const anchorSign = Math.sign(lastShotX || finalX || 1);
      finalX = clamp2(finalX + anchorSign * 0.18, -2.4, 2.4);
    } else if (prefs.buildStyle === "DTL_HUNTER") {
      const lineSign = Math.sign(opp?.pos?.x ?? lastShotX ?? finalX ?? 0);
      finalX = clamp2(finalX - lineSign * 0.22, -2.5, 2.5);
    } else if (prefs.buildStyle === "VARIED") {
      finalX = clamp2(finalX + gauss2(0, 0.12 + adaptability / 100 * 0.08), -2.5, 2.5);
    }
  }
  if (player._positionBias && Math.abs(player._positionBias) > 0.01) {
    finalX = clamp2(finalX + player._positionBias, -2.5, 2.5);
  }
  let safeY;
  if (isNetApproach) {
    const netY = player.side * 2.8;
    const midY = player.side * (COURT.halfL * 0.4);
    safeY = courtMode === "NET" ? netY : midY;
  } else {
    const baselineY = getStyleBaselineY(player);
    safeY = player.side > 0 ? Math.max(baselineY, player.pos.y) : Math.min(baselineY, player.pos.y);
  }
  return { x: finalX, y: safeY };
}
var CONTACT_Z_BY_CADENCE = {
  EXPLOSIVE: 0.55,
  EARLY_ATTACK: 0.65,
  BALANCED: 0.75,
  MEASURED: 0.85,
  PATIENT: 1
};
var SURFACE_READ_TUNING = {
  GRASS: Object.freeze({ contactZDelta: -0.12, predTimeDelta: -0.3, slowBallThreshold: 9.2, serveContactZ: 0.52 }),
  INDOOR: Object.freeze({ contactZDelta: -0.08, predTimeDelta: -0.22, slowBallThreshold: 8.8, serveContactZ: 0.56 }),
  HARD: Object.freeze({ contactZDelta: 0, predTimeDelta: 0, slowBallThreshold: 8.3, serveContactZ: 0.6 }),
  CLAY: Object.freeze({ contactZDelta: 0.16, predTimeDelta: 0.42, slowBallThreshold: 7.4, serveContactZ: 0.76 })
};
function getSurfaceReadTuning(courtPhysics) {
  const surface = (courtPhysics?.surface ?? "HARD").toUpperCase();
  return SURFACE_READ_TUNING[surface] ?? SURFACE_READ_TUNING.HARD;
}
function getBallReadTuning(ball) {
  const family = ball?._shotRuntime?.family ?? null;
  if (family === "DROP_SHOT") {
    return { contactZDelta: -0.18, predTimeDelta: -0.2, slowBallThresholdDelta: 1.4, chaseForwardBias: 0.45 };
  }
  if (family === "SLICE") {
    return { contactZDelta: -0.1, predTimeDelta: -0.06, slowBallThresholdDelta: 0.7, chaseForwardBias: 0.18 };
  }
  if (family === "TOPSPIN_DRIVE") {
    return { contactZDelta: 0.15, predTimeDelta: 0.2, slowBallThresholdDelta: -0.6, chaseForwardBias: -0.02 };
  }
  if (family === "LOB") {
    return { contactZDelta: 0.14, predTimeDelta: 0.22, slowBallThresholdDelta: -0.3, chaseForwardBias: -0.12 };
  }
  return { contactZDelta: 0, predTimeDelta: 0, slowBallThresholdDelta: 0, chaseForwardBias: 0 };
}
function setLocomotionMode(player, mode) {
  player._locomotionMode = mode;
  return mode;
}
function computePredInterceptY(player, gs, surfaceRead) {
  if (player.atNet)
    return player.pos.y;
  const side = player.side > 0 ? 1 : -1;
  const ballY = gs.ball.pos.y;
  const ballVY = gs.ball.vel.y;
  const playerY = player.pos.y;
  const baselineY = getStyleBaselineY(player);
  const goingTowardPlayer = side > 0 ? ballVY > 0 : ballVY < 0;
  const projectedBallY = ballY + ballVY * 0.18;
  const mySideBallY = clamp2(projectedBallY, -COURT.halfL, COURT.halfL);
  const sameSideNow = Math.sign(ballY || side) === side;
  const shortAttackLine = side * (COURT.halfL * 0.52);
  const midCourtLine = side * (COURT.halfL * 0.72);
  const deepReadLine = side * (COURT.halfL * 0.88);
  if (!goingTowardPlayer && !sameSideNow) {
    return baselineY;
  }
  const anchoredBallY = side > 0 ? Math.max(mySideBallY, shortAttackLine) : Math.min(mySideBallY, shortAttackLine);
  if (!sameSideNow) {
    return anchoredBallY;
  }
  const isShortBall = side > 0 ? anchoredBallY < midCourtLine : anchoredBallY > midCourtLine;
  const isVeryShortBall = side > 0 ? anchoredBallY < shortAttackLine : anchoredBallY > shortAttackLine;
  if (isVeryShortBall) {
    return anchoredBallY;
  }
  if (isShortBall) {
    return side > 0 ? Math.max(anchoredBallY, playerY - 0.15) : Math.min(anchoredBallY, playerY + 0.15);
  }
  const depthBias = surfaceRead.predTimeDelta < 0 ? 0.58 : surfaceRead.predTimeDelta > 0 ? 0.78 : 0.68;
  const blendedY = playerY + (anchoredBallY - playerY) * depthBias;
  const guardedY = side > 0 ? clamp2(blendedY, deepReadLine, COURT.halfL) : clamp2(blendedY, -COURT.halfL, deepReadLine);
  return side > 0 ? Math.max(guardedY, baselineY - 0.25) : Math.min(guardedY, baselineY + 0.25);
}
function computeMoveTarget(player, gs) {
  const airDens = gs.environment?.airDensity ?? 1.2;
  const depthOffset = getStyleDepthOffset(player);
  const outerX = COURT.halfW + THRESHOLDS.outerPlayerX;
  const outerY = COURT.halfL + THRESHOLDS.outerPlayerY;
  const surfaceRead = getSurfaceReadTuning(gs.courtPhysics);
  const ballRead = getBallReadTuning(gs.ball);
  const currentIntent = player.ctx?.currentIntent ?? "BUILD";
  const baseContactZ = player.prefs ? CONTACT_Z_BY_CADENCE[player.prefs.rallyCadence] ?? 0.75 : 0.75;
  let contactZ = clamp2(baseContactZ + surfaceRead.contactZDelta + ballRead.contactZDelta, 0.32, 1.2);
  const predMaxTimeBase = player.atNet ? 1.2 : contactZ > 0.8 ? 3.2 : 2.8;
  let predMaxTime = Math.max(1.2, predMaxTimeBase + surfaceRead.predTimeDelta + ballRead.predTimeDelta);
  if (currentIntent === "PRESSURE") {
    contactZ = clamp2(contactZ - 0.03, 0.32, 1.2);
    predMaxTime = Math.max(1.1, predMaxTime - 0.06);
  } else if (currentIntent === "FINISH") {
    contactZ = clamp2(contactZ - 0.06, 0.32, 1.2);
    predMaxTime = Math.max(1.05, predMaxTime - 0.12);
  }
  const ballSpd3dSlow = Math.sqrt(gs.ball.vel.x ** 2 + gs.ball.vel.y ** 2 + gs.ball.vel.z ** 2);
  const isSlowBounced = (gs.ball.bounceCount ?? 0) >= 1 && ballSpd3dSlow < surfaceRead.slowBallThreshold + ballRead.slowBallThresholdDelta && ballSpd3dSlow > 0.05 && gs.ball.inFlight;
  if (isSlowBounced) {
    return {
      x: clamp2(gs.ball.pos.x, -outerX + 0.2, outerX - 0.2),
      y: clamp2(gs.ball.pos.y, -outerY, outerY),
      t: null
    };
  }
  const alreadyBounced = (gs.ball.bounceCount ?? 0) >= 1;
  const predY = computePredInterceptY(player, gs, surfaceRead);
  const { landPoint, optimalHitPoint, crossPoint } = predictTrajectory(
    gs.ball,
    predY,
    predMaxTime,
    airDens,
    gs.courtPhysics,
    { preferredContactZ: contactZ }
  );
  const currentMargin = player._arrivalMargin ?? 0;
  const isDesperate = currentMargin < -0.3;
  if (isDesperate && landPoint) {
    return {
      x: clamp2(landPoint.x, -outerX + 0.2, outerX - 0.2),
      y: clamp2(landPoint.y + player.side * (0.2 + ballRead.chaseForwardBias), -outerY, outerY),
      t: landPoint.t
    };
  }
  if (optimalHitPoint) {
    const optHitThresh = alreadyBounced ? outerY : COURT.halfL + 0.5;
    const optBeyond = player.side > 0 ? optimalHitPoint.y > optHitThresh : optimalHitPoint.y < -optHitThresh;
    if (optBeyond && landPoint) {
      return {
        x: clamp2(landPoint.x, -outerX + 0.2, outerX - 0.2),
        y: clamp2(landPoint.y + player.side * (0.3 + ballRead.chaseForwardBias), -outerY, outerY),
        t: landPoint.t
      };
    }
    const ballSpd = Math.sqrt(gs.ball.vel.x ** 2 + gs.ball.vel.y ** 2 + gs.ball.vel.z ** 2);
    const isSlowBall = ballSpd < 8;
    let hitY = optimalHitPoint.y;
    if (isSlowBall) {
      hitY = hitY + player.side * Math.min(depthOffset * 0.3 + ballRead.chaseForwardBias, 0.55);
    }
    const bounceVar = gs.courtMods?.bounceVariance ?? 0;
    const _ctrlForNoise = (player.attrs?.controle ?? 60) / 100;
    const consistFrac = _ctrlForNoise * 0.9;
    const noiseScale = (1 - (player.stamina ?? 1)) * 0.18 + (player.ctx?.rallyPressure ?? 0) * 0.45 + bounceVar * (1 - consistFrac) * 0.8;
    let hitX = optimalHitPoint.x;
    if (noiseScale > 0.04) {
      const u1 = Math.max(1e-9, Math.random()), u2 = Math.random();
      hitX += Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * noiseScale * 0.65;
    }
    return {
      x: clamp2(hitX, -outerX + 0.2, outerX - 0.2),
      y: clamp2(hitY, -outerY, outerY),
      t: optimalHitPoint.t
    };
  }
  if (landPoint) {
    const ballSpd3d = Math.sqrt(gs.ball.vel.x ** 2 + gs.ball.vel.y ** 2 + gs.ball.vel.z ** 2);
    const isSlowFb = ballSpd3d < 8;
    const isDeepBall = Math.abs(landPoint.y) > COURT.halfL * 0.78;
    const prefDeep = player.prefs?.rallyCadence === "PATIENT" || player.prefs?.rallyCadence === "MEASURED";
    const prefFwd = player.prefs?.netGame === "HUNTER" || player.prefs?.netGame === "PROACTIVE";
    const behind = isDeepBall ? prefDeep ? 1.2 : prefFwd ? 0.2 : 0.8 : isSlowFb ? prefDeep ? 0.5 : 0.2 : prefDeep ? 1.8 : prefFwd ? 0.3 : 1;
    return {
      x: clamp2(landPoint.x, -outerX + 0.2, outerX - 0.2),
      y: clamp2(landPoint.y + player.side * (behind + ballRead.chaseForwardBias), -outerY, outerY),
      t: landPoint.t
    };
  }
  if (crossPoint && crossPoint.z < 2.8) {
    return {
      x: clamp2(crossPoint.x, -outerX + 0.2, outerX - 0.2),
      y: player.pos.y,
      t: crossPoint.t
    };
  }
  return {
    x: clamp2(gs.ball.pos.x, -outerX + 0.3, outerX - 0.3),
    y: player.pos.y,
    t: null
  };
}
function computeRecoverTarget(player, gs) {
  const lastShotX = player.ctx?._lastShotX ?? 0;
  const bisectorX = clamp2(lastShotX * 0.2, -1.5, 1.5);
  const courtMode = player.ctx?.courtMode ?? "BASE";
  if (courtMode === "TRANSITION") {
    return computeTransitionPos(player, gs);
  }
  if (courtMode === "NET") {
    return computeNetPos(player, gs);
  }
  const baselineY = getStyleBaselineY(player);
  const biasX = player._positionBias ?? 0;
  return { x: clamp2(bisectorX + biasX, -2, 2), y: baselineY };
}
function computeNetPos(player, gs) {
  const opp = gs?.players?.find((p) => p.id !== player.id);
  const oppX = opp?.pos?.x ?? 0;
  const lastShotX = player.ctx?._lastShotX ?? 0;
  const prefs = player.prefs ?? {};
  const netDistFromNet = player.prefs ? {
    HUNTER: 2.2,
    PROACTIVE: 2.5,
    OPPORTUNIST: 2.8,
    RELUCTANT: 3.2,
    AVOIDS: 3.5
  }[player.prefs.netGame] ?? 2.8 : 2.8;
  const tPosX = clamp2(
    oppX * 0.35 + lastShotX * 0.15,
    -2.2,
    2.2
  );
  const buildAdjX = {
    CENTRE_CONTROL: clamp2(tPosX * 0.55, -1.5, 1.5),
    CROSS_DOMINANT: clamp2(tPosX + Math.sign(lastShotX || oppX || 1) * 0.15, -2.3, 2.3),
    DTL_HUNTER: clamp2(tPosX - Math.sign(oppX || lastShotX || 1) * 0.18, -2.3, 2.3)
  }[prefs.buildStyle];
  return {
    x: buildAdjX ?? tPosX,
    y: player.side * netDistFromNet
  };
}
function computeTransitionPos(player, gs) {
  const prefs = player.prefs ?? {};
  const lastShotX = player.ctx?._lastShotX ?? 0;
  const bisectorX = clamp2(lastShotX * 0.2, -2, 2);
  const approachLandX = player.ctx?._approachLandX ?? 0;
  const coverBaseX = clamp2(bisectorX * 0.6 + approachLandX * 0.4, -2.2, 2.2);
  const coverX = prefs.buildStyle === "CENTRE_CONTROL" ? clamp2(coverBaseX * 0.65, -1.6, 1.6) : prefs.buildStyle === "DTL_HUNTER" ? clamp2(coverBaseX - Math.sign(approachLandX || lastShotX || 1) * 0.16, -2.2, 2.2) : coverBaseX;
  const transYBase = COURT.halfL * 0.38;
  const transYOffset = {
    HUNTER: -0.18,
    PROACTIVE: -0.1,
    OPPORTUNIST: 0,
    RELUCTANT: 0.08,
    AVOIDS: 0.14
  }[prefs.netGame] ?? 0;
  const riskYOffset = {
    SAFETY_FIRST: 0.08,
    SAFE: 0.04,
    CALCULATED: 0,
    GAMBLER: -0.04,
    ALLOUT: -0.08
  }[prefs.riskProfile] ?? 0;
  const transY = player.side * (transYBase + transYOffset + riskYOffset);
  return { x: coverX, y: transY };
}
function isRealLob(player, gs) {
  const ball = gs.ball;
  if (!player.atNet)
    return false;
  if (ball.lastHitBy === player.id)
    return false;
  if (!ball.inFlight)
    return false;
  if (Math.sign(ball.pos.y) === player.side)
    return false;
  const lobZ = player.mods ? 2.8 + player.mods.lobCovMult * 0.4 : 2.8;
  return ball.pos.z > lobZ && ball.vel.z > 0;
}
function shouldRetreatFromLob(player, gs) {
  if (!isRealLob(player, gs))
    return false;
  const ball = gs.ball;
  const vz = ball.vel.z;
  const G = 9.8;
  const BALL_R = 0.07;
  const netY = player.side * 2.8;
  if (vz >= 0) {
    const tApex = vz / G;
    const yApex = ball.pos.y + ball.vel.y * tApex;
    return Math.abs(yApex) > Math.abs(netY) + 3;
  }
  const a = 0.5 * G, b = -vz, cc = BALL_R - ball.pos.z;
  const disc = b * b - 4 * a * cc;
  if (disc < 0)
    return true;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  if (t < 1e-3)
    return true;
  const landY = ball.pos.y + ball.vel.y * t;
  return Math.abs(landY) > Math.abs(netY) + 3;
}
function getMoveSpeed(player, target, arrivalMargin, physMaxSpd) {
  const d = dist2(player.pos, target) || 0;
  const accelRush = clamp2(1 + ((player.mods?.accelMult ?? 1) - 1) * 0.8, 0.96, 1.18);
  const speedRush = clamp2(1 + ((player.mods?.speedMult ?? 1) - 1) * 0.55, 0.96, 1.14);
  const rushBoost = clamp2(accelRush * 0.58 + speedRush * 0.42, 0.98, 1.16);
  if (arrivalMargin <= 0)
    return physMaxSpd * MOVEMENT.urgencySprint * rushBoost;
  const needed = d / (arrivalMargin * 0.85);
  const floorMult = arrivalMargin < 0.16 ? MOVEMENT.urgencyRun : arrivalMargin < 0.45 ? MOVEMENT.urgencyJog : MOVEMENT.urgencyWalk;
  const capMult = arrivalMargin < 0.08 ? MOVEMENT.urgencySprint * rushBoost : arrivalMargin < 0.22 ? MOVEMENT.urgencyRun * rushBoost : 1;
  return clamp2(needed, physMaxSpd * floorMult, physMaxSpd * capMult);
}
function applyTargetSmoothing(player, rawTarget, arrivalMargin) {
  if (!player._stableTarget) {
    player._stableTarget = { ...rawTarget };
    return rawTarget;
  }
  const courtMode = player.ctx?.courtMode ?? "BASE";
  const isNetApproach = courtMode === "TRANSITION" || courtMode === "NET";
  const alpha = isNetApproach ? 0.7 : arrivalMargin < 0.15 ? 0.9 : 0.5;
  player._stableTarget.x += (rawTarget.x - player._stableTarget.x) * alpha;
  player._stableTarget.y += (rawTarget.y - player._stableTarget.y) * alpha;
  return { ...player._stableTarget };
}
function applyWaitMovement(player, target, dt, state = "WAIT") {
  if (!dt || dt <= 0)
    return;
  const staminaFrac = player.stamina ?? 1;
  const baseSpeed = player.playerSpeed || PLAYER_CFG.speed;
  const physMax = baseSpeed * (STAMINA.speedMinFactor + staminaFrac * (1 - STAMINA.speedMinFactor));
  const OUTER_Y = COURT.halfL + THRESHOLDS.outerPlayerY;
  const OUTER_X = COURT.halfW + THRESHOLDS.outerPlayerX;
  const dyFull = target.y - player.pos.y;
  const spdY = physMax * MOVEMENT.urgencyJog * MOVEMENT.backwardSpeedMult;
  const stepY = Math.min(Math.abs(dyFull), spdY * dt);
  player.vel.y = Math.sign(dyFull) * spdY;
  player.pos.y = clamp2(
    player.pos.y + Math.sign(dyFull) * stepY,
    -OUTER_Y,
    OUTER_Y
  );
  const dxFull = target.x - player.pos.x;
  const movingBackward = dyFull * player.side > 0.04;
  const movingForward = dyFull * player.side < -0.04;
  const lateralHeavy = Math.abs(dxFull) > Math.abs(dyFull) * 1.2;
  if (lateralHeavy)
    setLocomotionMode(player, state === "RECOVER" ? "SHUFFLE_RECOVER" : "SHUFFLE_WAIT");
  else if (movingBackward)
    setLocomotionMode(player, "BACKPEDAL");
  else if (movingForward)
    setLocomotionMode(player, state === "RECOVER" ? "FORWARD_RECOVER" : "STEP_IN");
  else
    setLocomotionMode(player, state === "RECOVER" ? "SET_RECOVER" : "SET_WAIT");
  const spdX = physMax * 0.35;
  const stepX = Math.min(Math.abs(dxFull), spdX * dt);
  player.vel.x = Math.sign(dxFull) * spdX;
  player.pos.x = clamp2(
    player.pos.x + Math.sign(dxFull) * stepX,
    -OUTER_X,
    OUTER_X
  );
  if (!isFinite(player.vel.x))
    player.vel.x = 0;
  if (!isFinite(player.vel.y))
    player.vel.y = 0;
  if (!isFinite(player.pos.x))
    player.pos.x = 0;
  if (!isFinite(player.pos.y))
    player.pos.y = player.side * (COURT.halfL + 1);
}
function applyMovementPhysics(player, target, maxSpd, dt, gs) {
  const mods = player.mods;
  const outerY = COURT.halfL + THRESHOLDS.outerPlayerY;
  const outerX = COURT.halfW + THRESHOLDS.outerPlayerX;
  const staminaFrac = player.stamina ?? 1;
  const baseSpeed = player.playerSpeed || PLAYER_CFG.speed;
  const surface = gs.courtMeta?.surface ?? "HARD";
  const slideRadiusCoeff = surface === "CLAY" ? 1.5 : surface === "GRASS" ? 0.85 : 1;
  const slideDecelCoeff = surface === "CLAY" ? 0.65 : surface === "GRASS" ? 1.2 : 1;
  const ballComingToMe = gs.ball.inFlight && (player.side > 0 && gs.ball.vel.y > 0 || player.side < 0 && gs.ball.vel.y < 0);
  const ballOnMyCourtSide = gs.ball.inFlight && (Math.sign(gs.ball.pos.y) === player.side || Math.abs(gs.ball.pos.y) < 0.5);
  const isChasing = (ballComingToMe || ballOnMyCourtSide) && gs.ball.lastHitBy !== player.id;
  const dx = target.x - player.pos.x;
  const dy = target.y - player.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1e-9;
  const fwdDotRaw = -dy * player.side / dist;
  const movingBackward = dy * player.side > 0.1;
  const movingForward = dy * player.side < -0.1;
  const lateralHeavy = Math.abs(dx) > Math.abs(dy) * 1.15;
  const isDeepRetreat = movingBackward && dist > 3.5 && (gs.ball.pos.z > 2.55 || Math.abs(target.y) > Math.abs(player.pos.y) + 1.7);
  let dirMult = 1;
  if (dist > 0.15) {
    const fwdDot = fwdDotRaw;
    if (isDeepRetreat) {
      dirMult = 0.94;
      setLocomotionMode(player, "TURN_RUN");
    } else if (fwdDot < -0.18) {
      dirMult = MOVEMENT.backwardSpeedMult;
      setLocomotionMode(player, "BACKPEDAL");
    } else if (Math.abs(fwdDot) < 0.62) {
      const lateralMods = mods ? mods.decelMult : 1;
      const latBase = MOVEMENT.lateralSpeedMult;
      dirMult = latBase + (1 - latBase) * Math.min(1, (lateralMods - 0.72) / 0.56);
      setLocomotionMode(player, lateralHeavy ? "LATERAL_SHUFFLE" : "LATERAL_ADJUST");
    } else if (movingForward && isChasing) {
      dirMult = Math.min(1.08, dirMult * 1.03);
      setLocomotionMode(player, "FORWARD_SPRINT");
    } else {
      setLocomotionMode(player, "CHASE");
    }
  } else {
    setLocomotionMode(player, "MICRO_ADJUST");
  }
  const physMaxSpd = baseSpeed * (STAMINA.speedMinFactor + staminaFrac * (1 - STAMINA.speedMinFactor)) * dirMult;
  const rushAttr = clamp2(
    1 + ((mods?.accelMult ?? 1) - 1) * 0.75 + ((mods?.speedMult ?? 1) - 1) * 0.45,
    1,
    1.18
  );
  const rushBoost = isChasing && dist > 1.8 && maxSpd >= physMaxSpd * MOVEMENT.urgencyRun ? rushAttr : 1;
  const effectiveMaxSpd = Math.min(maxSpd, physMaxSpd * rushBoost);
  const dSpd = Math.min(effectiveMaxSpd, dist / 0.3 * effectiveMaxSpd);
  const dvx = (dist > 0.02 ? dx / dist * dSpd : 0) - player.vel.x;
  const dvy = (dist > 0.02 ? dy / dist * dSpd : 0) - player.vel.y;
  const dvMag = Math.sqrt(dvx * dvx + dvy * dvy) || 1e-9;
  const currSpd = Math.sqrt(player.vel.x ** 2 + player.vel.y ** 2);
  const dot = player.vel.x * dvx + player.vel.y * dvy;
  const maxAccelBase = player.playerAccel || PLAYER_CFG.maxAccel;
  const maxDecelBase = player.playerDecel || PLAYER_CFG.maxDecel;
  const effAccelBase = maxAccelBase * (INERTIA.staminaAccelMin + staminaFrac * (1 - INERTIA.staminaAccelMin));
  const wasPlanted = currSpd < 0.8;
  const footingState = player.ctx._footingState ?? "striding";
  const footingTimer = player.ctx._footingTimer ?? 0;
  let footingMult = footingState === "planted" ? 1.3 : footingState === "offBalance" ? 0.8 : 1;
  if (wasPlanted && !isChasing) {
    player.ctx._footingState = "planted";
    player.ctx._footingTimer = 0.08;
  } else if (footingState === "planted" && footingTimer <= 0) {
    player.ctx._footingState = "striding";
    player.ctx._footingTimer = 0;
  } else if (footingState === "offBalance") {
    player.ctx._footingTimer = Math.max(0, footingTimer - dt);
    if (player.ctx._footingTimer <= 0)
      player.ctx._footingState = "striding";
  } else if (footingState === "planted") {
    player.ctx._footingTimer = Math.max(0, footingTimer - dt);
  }
  if (player.ctx._postHitPause <= 0 && player._lastShotWhileRunning) {
    player.ctx._footingState = "offBalance";
    player.ctx._footingTimer = 0.15;
    player._lastShotWhileRunning = false;
  }
  let effAccel = effAccelBase * footingMult;
  if (player._locomotionMode === "TURN_RUN")
    effAccel *= 0.99;
  if (player._locomotionMode === "BACKPEDAL")
    effAccel *= 0.96;
  if (player._locomotionMode === "LATERAL_SHUFFLE")
    effAccel *= 1;
  let accel;
  if (dist < 0.15) {
    if (currSpd < 1.2) {
      player.vel.x *= 0.3;
      player.vel.y *= 0.3;
      player.pos.x += player.vel.x * dt;
      player.pos.y += player.vel.y * dt;
      setLocomotionMode(player, "PLANT");
      return;
    }
    accel = PLAYER_CFG.friction;
    player.ctx._reversalFrames = 0;
  } else if (dot < 0) {
    const targetDirDot = dist > 0.01 ? (player.vel.x * (dx / dist) + player.vel.y * (dy / dist)) / (currSpd || 1e-9) : 0;
    if (targetDirDot < INERTIA.reversal180Dot && currSpd > 1) {
      const _expMult = mods ? mods.accelMult : 1;
      const physFrames = Math.round(INERTIA.reversal180Frames / (_expMult || 1));
      player.ctx._reversalFrames = physFrames;
    }
    if (player.ctx._reversalFrames > 0) {
      player.ctx._reversalFrames--;
      const r180Mult = mods ? mods.accelMult : 1;
      accel = effAccel * INERTIA.reversal180AccelMult * r180Mult;
    } else if (currSpd > INERTIA.overrunThreshold) {
      const orMult = mods ? mods.decelMult : 1;
      accel = maxDecelBase * INERTIA.overrunDecelMult * orMult;
    } else {
      accel = maxDecelBase;
    }
  } else {
    const adaptiveBrakeRadius = Math.max(INERTIA.slideBrakeRadius, currSpd * 0.22) * slideRadiusCoeff;
    const isBraking = isChasing && dist < adaptiveBrakeRadius && currSpd > INERTIA.slideBrakeSpeedMin;
    if (isBraking) {
      const brakeIntensity = 1 - dist / adaptiveBrakeRadius;
      const brakeMult = 1 + (INERTIA.slideBrakeDecelMult * slideDecelCoeff - 1) * brakeIntensity;
      const lateralMods = mods ? mods.decelMult : 1;
      accel = maxDecelBase * brakeMult * lateralMods;
    } else {
      accel = effAccel;
    }
    player.ctx._reversalFrames = Math.max(0, player.ctx._reversalFrames - 1);
  }
  const frac = Math.min(1, accel * dt / dvMag);
  player.vel.x += dvx * frac;
  player.vel.y += dvy * frac;
  const spd = Math.sqrt(player.vel.x ** 2 + player.vel.y ** 2);
  if (spd > effectiveMaxSpd) {
    player.vel.x = player.vel.x / spd * effectiveMaxSpd;
    player.vel.y = player.vel.y / spd * effectiveMaxSpd;
  }
  if (!isFinite(player.vel.x))
    player.vel.x = 0;
  if (!isFinite(player.vel.y))
    player.vel.y = 0;
  player.pos.x += player.vel.x * dt;
  player.pos.y += player.vel.y * dt;
  if (!isFinite(player.pos.x))
    player.pos.x = 0;
  if (!isFinite(player.pos.y))
    player.pos.y = player.side * (COURT.halfL + 1);
  if (gs.ball.inFlight) {
    const sprintFrac = Math.max(0, (spd - STAMINA.sprintThreshold * effectiveMaxSpd) / (effectiveMaxSpd * (1 - STAMINA.sprintThreshold) || 1));
    if (sprintFrac > 0) {
      player.stamina = Math.max(0, player.stamina - STAMINA.sprintDecayRate * sprintFrac * dt);
    }
  }
  player.pos.y = player.side > 0 ? clamp2(player.pos.y, 0.5, outerY) : clamp2(player.pos.y, -outerY, -0.5);
  player.pos.x = clamp2(player.pos.x, -outerX, outerX);
  if (Math.abs(player.pos.x) >= outerX - 0.01)
    player.vel.x = 0;
  if (Math.abs(player.pos.y) >= outerY - 0.01)
    player.vel.y = 0;
}
function handleServeReturn(player, gs, dt) {
  const returnY = player.side * (COURT.halfL + 1.5);
  const outerY = COURT.halfL + THRESHOLDS.outerPlayerY;
  const outerX = COURT.halfW + THRESHOLDS.outerPlayerX;
  const ballDistFromNet = Math.abs(gs.ball.pos.y);
  const ballOnServerFar = Math.sign(gs.ball.pos.y) !== player.side && ballDistFromNet > COURT.serviceLineY;
  if (ballOnServerFar) {
    setLocomotionMode(player, "RETURN_READ");
    player.vel.x *= 0.55;
    player.vel.y *= 0.55;
    player.pos.x += player.vel.x * dt;
    player.pos.y += player.vel.y * dt;
    return;
  }
  if ((player._readPauseFrames ?? 0) === 0 && !player._readDelayInit) {
    const sKmh = gs.ball._serveExitKmh ?? 0;
    const retMult = player.mods?.returnMult ?? 0.82;
    const rawFrames = Math.max(0, (sKmh - 165) / 30);
    const skillMult = clamp2(1.25 - retMult * 0.25, 0.8, 1.1);
    player._readPauseFrames = Math.round(rawFrames * skillMult);
    player._readDelayInit = true;
  }
  let _reactionSpeedCap = 1;
  if ((player._readPauseFrames ?? 0) > 0) {
    setLocomotionMode(player, "RETURN_SPLIT");
    player._readPauseFrames--;
    const framesLeft = player._readPauseFrames;
    _reactionSpeedCap = clamp2(0.75 - framesLeft * 0.15, 0.45, 0.75);
    if (player._readPauseFrames === 0)
      player._readDelayInit = false;
  }
  const airDens = gs.environment?.airDensity ?? 1.2;
  const surfaceRead = getSurfaceReadTuning(gs.courtPhysics);
  const { landPoint: serveLand, optimalHitPoint: serveOpt } = predictTrajectory(
    gs.ball,
    returnY,
    Math.max(1.8, 2.8 + surfaceRead.predTimeDelta * 0.8),
    airDens,
    gs.courtPhysics,
    { preferredContactZ: surfaceRead.serveContactZ }
  );
  const serveLandAbsY = serveLand ? Math.abs(serveLand.y) : COURT.halfL;
  const serveIsShort = serveLandAbsY < COURT.halfL * 0.72;
  const serveIsVeryShort = serveLandAbsY < COURT.halfL * 0.5;
  const nearNet = player.side * 1.5;
  const deepCap = returnY;
  let target = { x: player.pos.x, y: returnY };
  if (serveOpt) {
    target.x = clamp2(serveOpt.x, -outerX + 0.2, outerX - 0.2);
    target.y = player.side > 0 ? clamp2(serveOpt.y, nearNet, deepCap) : clamp2(serveOpt.y, deepCap, nearNet);
  } else if (serveIsVeryShort && serveLand) {
    const rushY = serveLand.y + player.side * 0.5;
    target.x = clamp2(serveLand.x, -outerX + 0.2, outerX - 0.2);
    target.y = player.side > 0 ? clamp2(rushY, nearNet, deepCap) : clamp2(rushY, deepCap, nearNet);
  } else if (serveIsShort && serveLand) {
    const shortY = serveLand.y + player.side * 1;
    target.x = clamp2(serveLand.x, -outerX + 0.2, outerX - 0.2);
    target.y = player.side > 0 ? clamp2(shortY, nearNet, deepCap) : clamp2(shortY, deepCap, nearNet);
  } else if (serveLand) {
    target.x = clamp2(serveLand.x, -outerX + 0.2, outerX - 0.2);
    target.y = returnY;
  }
  const staminaFrac = player.stamina ?? 1;
  const baseSpeed = player.playerSpeed || PLAYER_CFG.speed;
  const maxSpd2Base = baseSpeed * (STAMINA.speedMinFactor + staminaFrac * (1 - STAMINA.speedMinFactor));
  const dx2 = target.x - player.pos.x;
  const dy2 = target.y - player.pos.y;
  const dist2_ = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1e-9;
  const serveRefT = serveOpt?.t ?? (serveLand?.t ?? 0.8);
  const margin2 = serveRefT - dist2_ / (maxSpd2Base || 0.1);
  const urgency2 = margin2 > 0.4 ? MOVEMENT.urgencyJog : margin2 > 0 ? MOVEMENT.urgencyRun : MOVEMENT.urgencySprint;
  if (urgency2 >= MOVEMENT.urgencySprint) {
    setLocomotionMode(player, "RETURN_SPRINT");
  } else if (urgency2 >= MOVEMENT.urgencyRun) {
    setLocomotionMode(player, "RETURN_RUN");
  } else {
    setLocomotionMode(player, "RETURN_SET");
  }
  const returnRush = clamp2(
    1 + ((player.mods?.accelMult ?? 1) - 1) * 0.7 + ((player.mods?.speedMult ?? 1) - 1) * 0.35,
    1,
    1.18
  );
  const maxSpd2 = maxSpd2Base * urgency2 * _reactionSpeedCap * (margin2 < 0.08 ? returnRush : 1 + (returnRush - 1) * 0.55);
  const dSpd2 = Math.min(maxSpd2, dist2_ / 0.4 * maxSpd2);
  const dvx2 = (dist2_ > 0.02 ? dx2 / dist2_ * dSpd2 : 0) - player.vel.x;
  const dvy2 = (dist2_ > 0.02 ? dy2 / dist2_ * dSpd2 : 0) - player.vel.y;
  const dvMag2 = Math.sqrt(dvx2 * dvx2 + dvy2 * dvy2) || 1e-9;
  const frac2 = Math.min(1, PLAYER_CFG.maxAccel * dt / dvMag2);
  player.vel.x += dvx2 * frac2;
  player.vel.y += dvy2 * frac2;
  const spd2 = Math.sqrt(player.vel.x ** 2 + player.vel.y ** 2);
  if (spd2 > maxSpd2) {
    player.vel.x = player.vel.x / spd2 * maxSpd2;
    player.vel.y = player.vel.y / spd2 * maxSpd2;
  }
  player.pos.x += player.vel.x * dt;
  player.pos.y += player.vel.y * dt;
  player.pos.y = player.side > 0 ? clamp2(player.pos.y, 0.5, outerY) : clamp2(player.pos.y, -outerY, -0.5);
  player.pos.x = clamp2(player.pos.x, -outerX, outerX);
}
function resetMovementRuntime(player) {
  player._arrivalMargin = void 0;
  player._predCrossX = void 0;
  player._readPauseFrames = 0;
  player._readDelayInit = false;
  player._stableTarget = void 0;
  player._recoverTarget = null;
  player._hitTarget = null;
  player._posLocked = false;
  player._locomotionMode = "RESET";
  player._lastSeenBounce = 0;
  player._nearMissTimer = 0;
  player._volleyType = null;
  player._halfVolleyContext = false;
  player._postHitRecoveryTimer = 0;
}
function updatePlayerMovement(player, gs, dt) {
  if (!dt || dt <= 0 || !isFinite(dt))
    return;
  const mods = player.mods;
  if (shouldRetreatFromLob(player, gs)) {
    player.atNet = false;
    player.ctx.courtMode = "BASE";
    player.ctx.transitionCooldown = 3;
    setLocomotionMode(player, "LOB_RETREAT");
  }
  const netY = player.side * 2.8;
  const isServeFlight = gs.isFirstBounce && player.id === gs.receiver && gs.ball.inFlight;
  if (isServeFlight) {
    return handleServeReturn(player, gs, dt);
  }
  if ((player.ctx._postHitPause ?? 0) > 0) {
    setLocomotionMode(player, "POST_HIT_HOLD");
    player.ctx._postHitPause -= dt;
    player.vel.x *= 0.75;
    player.vel.y *= 0.75;
    player.pos.x += player.vel.x * dt;
    player.pos.y += player.vel.y * dt;
    return;
  }
  if (player.ctx?.courtMode === "TRANSITION" && !player.atNet) {
    const netZoneY = player.side * (COURT.halfL * 0.42);
    const reachedNet = player.side > 0 ? player.pos.y <= netZoneY : player.pos.y >= netZoneY;
    if (reachedNet) {
      player.atNet = true;
      player.ctx.courtMode = "NET";
    }
  }
  if (player.atNet) {
    const netPos = computeNetPos(player, gs);
    player.basePos.x = netPos.x;
    player.basePos.y = netPos.y;
  } else {
    player.basePos.y = getStyleBaselineY(player);
  }
  const currBounce = gs.ball.bounceCount ?? 0;
  if (currBounce > (player._lastSeenBounce ?? 0)) {
    player._lastSeenBounce = currBounce;
    player._hitTarget = null;
    player._arrivalMargin = void 0;
    player._stableTarget = null;
  }
  const state = getMovementState(player, gs);
  const prevState = player._prevMovState;
  player._movState = state;
  player._prevMovState = state;
  const lastHitBy = gs.ball.lastHitBy;
  const oppJustHit = lastHitBy !== player.id && lastHitBy !== (player.ctx._lastSeenHitBy ?? null);
  player.ctx._lastSeenHitBy = lastHitBy;
  if (oppJustHit && state === "WAIT") {
    const currSpd = Math.sqrt(player.vel.x ** 2 + player.vel.y ** 2);
    if (currSpd > 1.5) {
      const dur = player.prefs ? {
        EXPLOSIVE: 0.06,
        EARLY_ATTACK: 0.07,
        BALANCED: 0.08,
        MEASURED: 0.09,
        PATIENT: 0.1
      }[player.prefs.rallyCadence] ?? 0.08 : 0.08;
      player.ctx._splitStepTimer = dur;
    }
  }
  if ((player.ctx._splitStepTimer ?? 0) > 0) {
    player.ctx._splitStepTimer = Math.max(0, player.ctx._splitStepTimer - dt);
    if (player.ctx._splitStepTimer === 0) {
      player.ctx._footingState = "planted";
      player.ctx._footingTimer = 0.08;
    }
  }
  if (state === "RECOVER" && prevState !== "RECOVER") {
    player._recoverTarget = computeRecoverTarget(player, gs);
  }
  if (state === "WAIT") {
    player._recoverTarget = null;
  }
  let rawTarget;
  if (state === "WAIT") {
    rawTarget = computeWaitTarget(player, gs);
  } else if (state === "MOVE") {
    const moveTarget = computeMoveTarget(player, gs);
    player._hitTarget = moveTarget;
    rawTarget = moveTarget;
    if (moveTarget?.t != null) {
      const staminaFrac2 = player.stamina ?? 1;
      const baseSpeed2 = player.playerSpeed || PLAYER_CFG.speed;
      const effSpeed = baseSpeed2 * (STAMINA.speedMinFactor + staminaFrac2 * (1 - STAMINA.speedMinFactor));
      const d = dist2(player.pos, moveTarget);
      player._arrivalMargin = moveTarget.t - d / (effSpeed || 0.1);
      player._predCrossX = moveTarget.x ?? player.pos.x;
    } else {
      player._arrivalMargin = void 0;
      player._predCrossX = void 0;
    }
    const ballComing3 = player.side > 0 && gs.ball.vel.y > 0 || player.side < 0 && gs.ball.vel.y < 0;
    const useVolleyAdj = player.atNet && gs.ball.bounceCount === 0 && ballComing3;
    if (gs.ball.bounceCount > 0 || useVolleyAdj) {
      const dToBall = Math.sqrt((player.pos.x - gs.ball.pos.x) ** 2 + (player.pos.y - gs.ball.pos.y) ** 2);
      const reachRef = player.reach ?? 0.85;
      const blendWin = useVolleyAdj ? reachRef * 3.5 : reachRef * 2.2;
      const blendStr = useVolleyAdj ? 0.8 : 0.65;
      if (dToBall < blendWin) {
        const blend = Math.max(0, 1 - dToBall / blendWin);
        rawTarget.x = rawTarget.x * (1 - blend * blendStr) + gs.ball.pos.x * (blend * blendStr);
      }
    }
  } else if (state === "SPLITSTEP") {
    rawTarget = { x: player.pos.x, y: player.pos.y };
  } else if (state === "HIT") {
    rawTarget = { x: player.pos.x, y: player.pos.y };
  } else {
    rawTarget = player._recoverTarget ?? computeRecoverTarget(player, gs);
  }
  if (state === "MOVE") {
    const ballSpd3d = Math.sqrt(gs.ball.vel.x ** 2 + gs.ball.vel.y ** 2 + gs.ball.vel.z ** 2);
    const isSlowBall = ballSpd3d < 7 && gs.ball.bounceCount >= 1;
    const giveUpThr = isSlowBall ? INERTIA.giveUpMargin - 1 : INERTIA.giveUpMargin;
    const arrivalFGU = player._arrivalMargin ?? 0;
    if (arrivalFGU < giveUpThr && gs.ball.inFlight) {
      const comingToMe = player.side > 0 && gs.ball.vel.y > 0 || player.side < 0 && gs.ball.vel.y < 0;
      const distToBall = Math.sqrt((player.pos.x - gs.ball.pos.x) ** 2 + (player.pos.y - gs.ball.pos.y) ** 2);
      if (comingToMe && distToBall > (player.reach ?? 1.5) * 4) {
        rawTarget.x = clamp2(rawTarget.x, player.pos.x - 1.5, player.pos.x + 1.5);
        rawTarget.y = player.basePos.y;
      }
    }
  }
  if (state === "WAIT" && gs.players) {
    const ballOnOppSide = Math.sign(gs.ball.pos.y) !== player.side;
    const cMode = player.ctx.courtMode ?? "BASE";
    if (ballOnOppSide && !player.atNet && cMode === "BASE") {
      const lastShotX = player.ctx._lastShotX ?? 0;
      player.basePos.x = clamp2(lastShotX * 0.2, -1.2, 1.2);
    }
  }
  if (state === "SPLITSTEP") {
    setLocomotionMode(player, "SPLITSTEP");
    player.vel.x *= 0.35;
    player.vel.y *= 0.35;
    player.pos.x += player.vel.x * dt;
    player.pos.y += player.vel.y * dt;
    return;
  }
  if (state === "HIT") {
    setLocomotionMode(player, "HIT_PLANT");
    player.vel.x *= 0.25;
    player.vel.y *= 0.25;
    player.pos.x += player.vel.x * dt;
    player.pos.y += player.vel.y * dt;
    return;
  }
  if (state === "WAIT" || state === "RECOVER") {
    applyWaitMovement(player, rawTarget, dt, state);
    return;
  }
  const margin = player._arrivalMargin ?? 0.3;
  const target = applyTargetSmoothing(player, rawTarget, margin);
  const staminaFrac = player.stamina ?? 1;
  const baseSpeed = player.playerSpeed || PLAYER_CFG.speed;
  const physMaxSpd = baseSpeed * (STAMINA.speedMinFactor + staminaFrac * (1 - STAMINA.speedMinFactor));
  const maxSpd = getMoveSpeed(player, target, margin, physMaxSpd);
  applyMovementPhysics(player, target, maxSpd, dt, gs);
}

// src/ai.js
function createCtx() {
  return {
    rallyBalls: 0,
    lobsReceived: 0,
    netFailed: 0,
    seriesWon: 0,
    momentum: 0.5,
    // FIX 14 — EWMA: média ponderada exponencialmente do momentum.
    // momentum = snapshot imediato ponto a ponto.
    // _momentumEWMA = tendência suavizada (decay 0.25 por ponto) — usada na temperatura.
    // Isso faz sequências longas criarem "avalanches" reais de momentum.
    _momentumEWMA: 0.5,
    // _moodFactor [0..1]: confiança acumulada. Sobe devagar com vitórias,
    // cai depressa em sequências de derrota. Afeta temperatura de decisão.
    _moodFactor: 0.5,
    // FIX 12 — footingState: 'planted' | 'striding' | 'offBalance'
    // planted: pés firmes → aceleração explosiva inicial alta
    // striding: corrida de cruzeiro → aceleração normal
    // offBalance: saiu da base ou pós-golpe desajeitado → aceleração reduzida
    _footingState: "planted",
    _footingTimer: 0,
    // segundos restantes no estado atual
    lastShotX: 0,
    consecutiveSameDir: 0,
    // FASE 1.1 — Recovery diagonal: guarda o targetX do último golpe.
    // Após bater, recupera ~55% em direção ao lado atacado (não ao centro).
    _lastShotX: 0,
    // FASE 1.2 — Net approach side: guarda o X de pouso do approach.
    // Voleador cobre preventivamente o ângulo natural de devolução.
    _approachLandX: 0,
    rallyPressure: 0,
    // [0-1] accumulated positional stress from opponent's shots
    // Inertia / movement state (reset each physics tick, not per point)
    _reversalFrames: 0,
    // countdown for 180° direction-change penalty
    _postHitPause: 0,
    // seconds remaining of post-hit fatigue freeze
    // ── Shot EV system: short-term pattern memory ──────────────
    // Circular buffer of last 6 shots: { dir, spin, depth }
    // dir: sign of targetX (+1 right / -1 left)
    // spin: 'TOP'|'SLICE'|'FLAT'
    // depth: 'DEEP'|'MID'|'SHORT'
    patternHistory: [],
    // last 6 shots — populated by EV system
    // 1-shot intent boost: when last shot opened court, next gets FINISH bonus
    nextIntentBoost: null,
    // 'FINISH' | null
    intentBoostTimer: 0,
    // shots remaining for boost (counts down per shot)
    // ── Tactical intent (BUILD/PRESSURE/FINISH/RESET) ────────────
    currentIntent: "BUILD",
    // decideIntent() output
    // ── Court mode: BASE | TRANSITION | NET ─────────────────────
    courtMode: "BASE",
    // replaces binary atNet for transitions
    transitionCooldown: 0,
    // shots before next TRANSITION allowed
    netIntent: 0,
    // [0..1] desire to build/finish point at net
    netIntentSource: null,
    // debug hint: weak_return | short_ball | slow_ball | pressure | neutral
    // ── Depth/width distribution tracking (per 50pts) ────────────
    depthStats: { SHORT: 0, MID: 0, DEEP: 0 },
    widthStats: { CENTRE: 0, MID: 0, WIDE: 0 },
    approachCount: 0,
    // approach shots attempted
    netFromTransition: 0,
    // times net approach came from TRANSITION
    // ── FASE 1 — Adaptação intra-match ───────────────────────────────
    // _matchRead: snapshot atualizado a cada shot — leitura do que está funcionando.
    // Persiste entre pontos (está em ctx raiz mas é lido via matchCtx).
    _matchRead: null,
    // { dtlWorking, crossWorking, netWorking, oppBhExposed, oppFhExposed, insisting } — ver readMatchContext()
    // _setAdjust: ajuste tático de curta duração aplicado no início de cada set.
    // Funciona como "coach interno" — penaliza shot types com alto erro no set anterior.
    _setAdjust: null,
    // { avoidShotType, preferSide, netStrategy, expiresAfter } — ver applySetAdjustment()
    // FASE 2.3 — Confiança contextual: tiebreak, rival, superfície.
    // Inicializado em initContextConf() no início de cada partida.
    // Afeta _moodFactor inicial (que começa em 0.5 por padrão).
    _contextConf: null,
    // { tiebreakConf, rivalConf, surfaceConf } — ver initContextConf()
    // Match-persistent pattern memory (NOT reset between points)
    matchCtx: {
      oppBhHits: 0,
      // times opponent targeted our backhand (left side)
      oppFhHits: 0,
      // times opponent targeted our forehand (right side)
      oppDrops: 0,
      // drop shots opponent used this match
      serveDir: null,
      // 'LEFT'|'RIGHT'|'BODY' — our last serve direction
      serveN: 0,
      // total serves this match (for serve+1 weighting)
      // ── Serve EV: history & intent ───────────────────────────
      serveHistory: [],
      // circular buffer (max 8): {dir, physType, isSec, outcome}
      serveIntent: null,
      // 'OPEN'|'JAM'|'SAFE'|'RUSH' — last serve plan
      serve1InStreak: 0,
      // consecutive 1st serves IN
      recentFaults: 0,
      // faults in last 4 serve attempts (for 2nd serve pressure)
      // ── Return EV: receiver tendencies ──────────────────────
      returnPosXBias: 0,
      // lateral bias of receiver position (-1..+1)
      returnDepthBias: 0,
      // depth bias: >0 = step in, <0 = step back
      returnAggroMode: 0,
      // 0..1 — how aggressively receiver is returning
      returnHistory: []
      // last 6 returns: {type, pressure}
    }
  };
}
function resetCtx(p) {
  const mc = p.ctx.matchCtx;
  const ewma = p.ctx._momentumEWMA ?? 0.5;
  const mood = p.ctx._moodFactor ?? 0.5;
  p.ctx.rallyBalls = 0;
  p.ctx.lobsReceived = 0;
  p.ctx._sigUsedThisPoint = false;
  p.ctx.lastShotX = 0;
  p.ctx.consecutiveSameDir = 0;
  p.ctx._bodySpamCount = 0;
  p.ctx._lastShotX = 0;
  p.ctx._approachLandX = 0;
  p.ctx._netApproachedThisPoint = false;
  p.ctx.rallyPressure = 0;
  p.ctx._reversalFrames = 0;
  p.ctx._postHitPause = 0;
  p.ctx.patternHistory = [];
  p.ctx.nextIntentBoost = null;
  p.ctx.intentBoostTimer = 0;
  p.ctx.currentIntent = "BUILD";
  p.ctx.courtMode = "BASE";
  p.ctx.transitionCooldown = 0;
  p.ctx.netIntent = 0;
  p.ctx.netIntentSource = null;
  p.ctx.matchCtx = mc;
  p.ctx._momentumEWMA = ewma;
  p.ctx._moodFactor = mood;
  if (p.ctx._setAdjust) {
    p.ctx._setAdjust.expiresAfter = (p.ctx._setAdjust.expiresAfter ?? 0) - 1;
    if (p.ctx._setAdjust.expiresAfter <= 0)
      p.ctx._setAdjust = null;
  }
  resetMovementRuntime(p);
}
function updateMomentum(gs, winnerIdx, scoreCtx) {
  const w = gs.players[winnerIdx], l = gs.players[1 - winnerIdx];
  w.ctx.seriesWon++;
  l.ctx.seriesWon = 0;
  const wImp = scoreCtx?.wImportance ?? 1;
  const lImp = scoreCtx?.lImportance ?? 1;
  const wImpMult = 0.375 + wImp * 0.625;
  const lImpMult = 0.375 + lImp * 0.625;
  const wMn = (w.attrs?.mentalidade ?? (w.mods?.mentalFactor ?? 0.6) * 100) / 100;
  const lMn = (l.attrs?.mentalidade ?? (l.mods?.mentalFactor ?? 0.6) * 100) / 100;
  const wClutch = 1 + (wMn - 0.5) * 0.2 * (wImp - 1);
  const lResilience = 1 - (lMn - 0.5) * 0.35;
  const BASE = 0.048;
  const wRecupMod = w.mods ? 0.7 + w.mods.recupFactor * 0.6 : 1;
  const lRecupMod = l.mods ? 0.7 + (1 - l.mods.recupFactor) * 0.6 : 1;
  const wDelta = BASE * wRecupMod * wImpMult * clamp2(wClutch, 0.8, 1.2);
  const lDelta = BASE * lRecupMod * lImpMult * clamp2(lResilience, 0.7, 1.3);
  w.ctx.momentum = clamp2(w.ctx.momentum + wDelta, 0, 1);
  l.ctx.momentum = clamp2(l.ctx.momentum - lDelta, 0, 1);
  if (l.atNet)
    l.ctx.netFailed++;
  if (w.ctx.seriesWon >= 4)
    gs.log.push(`${w.ctx.seriesWon >= 6 ? "\u{1F525}\u{1F525}" : "\u{1F525}"} ${w.name} em sequ\xEAncia (${w.ctx.seriesWon} pts)`);
  if (l.ctx.momentum < AI.MOMENTUM.BREAK_THRESHOLD)
    gs.log.push(`\u{1F4C9} ${l.name} sob press\xE3o`);
  const EWMA_ALPHA = AI.MOMENTUM.EWMA_ALPHA;
  w.ctx._momentumEWMA = clamp2(
    (1 - EWMA_ALPHA) * (w.ctx._momentumEWMA ?? 0.5) + EWMA_ALPHA * w.ctx.momentum,
    0,
    1
  );
  l.ctx._momentumEWMA = clamp2(
    (1 - EWMA_ALPHA) * (l.ctx._momentumEWMA ?? 0.5) + EWMA_ALPHA * l.ctx.momentum,
    0,
    1
  );
  const wSeries = w.ctx.seriesWon;
  const wMoodGain = wSeries >= 5 ? 0.035 : wSeries >= 3 ? 0.022 : 0.012;
  const lMoodLoss = l.ctx.seriesWon === 0 ? 0.02 : 0.012;
  w.ctx._moodFactor = clamp2((w.ctx._moodFactor ?? 0.5) + wMoodGain, 0.05, 0.95);
  l.ctx._moodFactor = clamp2((l.ctx._moodFactor ?? 0.5) - lMoodLoss, 0.05, 0.95);
}
function readMatchContext(player, opponent) {
  const mc = player.ctx.matchCtx ?? {};
  const oppMc = opponent.ctx.matchCtx ?? {};
  const pat = player.ctx.patternHistory ?? [];
  const adaptability = player.prefs?.adaptability ?? 55;
  const rigidity = clamp2(1 - adaptability / 100, 0.15, 0.85);
  const totalHits = (mc.oppBhHits ?? 0) + (mc.oppFhHits ?? 0);
  const dtlShots = pat.filter((s) => s.dir === Math.sign(player.side ?? 1)).length;
  const crossShots = pat.filter((s) => s.dir !== Math.sign(player.side ?? 1) && s.dir !== 0).length;
  const recentDtl = pat.length >= 3 ? dtlShots / pat.length > 0.55 : false;
  const oppPressureHigh = (opponent.ctx?.rallyPressure ?? 0) > 0.55;
  const dtlWorking = recentDtl && oppPressureHigh;
  const crossWorking = !recentDtl && crossShots >= 2 && oppPressureHigh;
  const netAttempts = player.ctx.netFromTransition ?? 0;
  const netFailed = player.ctx.netFailed ?? 0;
  const netWinRate = netAttempts > 2 ? Math.max(0, 1 - netFailed / netAttempts) : 0.5;
  const netWorking = netAttempts >= 3 && netWinRate >= 0.55;
  const bhRatio = totalHits >= 4 ? (mc.oppBhHits ?? 0) / totalHits : 0.5;
  const oppBhExposed = bhRatio < 0.35;
  const oppFhExposed = bhRatio > 0.65;
  const insistThreshold = Math.round(2 + rigidity * 3);
  let insisting = false;
  if (pat.length >= insistThreshold) {
    const recent = pat.slice(-insistThreshold);
    const sameDir = recent.every((s) => s.dir === recent[0].dir);
    const sameDepth = recent.every((s) => s.depth === recent[0].depth);
    insisting = sameDir && sameDepth && !oppPressureHigh;
  }
  player.ctx._matchRead = {
    dtlWorking,
    crossWorking,
    netWorking,
    oppBhExposed,
    oppFhExposed,
    insisting,
    netWinRate,
    momentum: player.ctx._momentumEWMA ?? 0.5,
    // Metadados para debug
    _netAttempts: netAttempts,
    _bhRatio: bhRatio
  };
}
function applySetAdjustment(player, _opponent) {
  const read = player.ctx._matchRead;
  if (!read)
    return;
  const adaptability = player.prefs?.adaptability ?? 55;
  const rigidity = clamp2(1 - adaptability / 100, 0.15, 0.85);
  const adjustThreshold = 0.3 + rigidity * 0.3;
  let avoidShotType = null;
  let preferSide = null;
  let netStrategy = null;
  if (read.insisting) {
    const pat = player.ctx.patternHistory ?? [];
    if (pat.length >= 3) {
      const counts = {};
      pat.forEach((s) => {
        if (s.spin)
          counts[s.spin] = (counts[s.spin] ?? 0) + 1;
      });
      const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (dominant && dominant[1] / pat.length > 0.55) {
        const spinToShot = { TOP: "TOPSPIN", SLICE: "SLICE", FLAT: "FLAT" };
        avoidShotType = spinToShot[dominant[0]] ?? null;
      }
    }
  }
  if (read.oppBhExposed && Math.random() > adjustThreshold)
    preferSide = "BH";
  if (read.oppFhExposed && Math.random() > adjustThreshold)
    preferSide = "FH";
  const netRate = read.netWinRate ?? 0.5;
  const netAttempts = read._netAttempts ?? 0;
  if (netAttempts >= 4) {
    if (netRate < 0.35 && Math.random() > adjustThreshold)
      netStrategy = "less";
    if (netRate > 0.65 && Math.random() > adjustThreshold)
      netStrategy = "more";
  }
  if (!avoidShotType && !preferSide && !netStrategy)
    return;
  const expiresAfter = Math.round(10 + (1 - rigidity) * 5);
  player.ctx._setAdjust = {
    avoidShotType,
    // string | null — shot type a penalizar
    preferSide,
    // 'BH' | 'FH' | null
    netStrategy,
    // 'more' | 'less' | null
    expiresAfter
  };
}
function initContextConf(player, opponent, surface, rivalSystem = null) {
  const rf = player.recentForm;
  const surfKey = (surface ?? "HARD").toUpperCase();
  const surfScore = rf?.surfaceForm?.[surfKey] ?? rf?.formScore ?? 0.5;
  const surfaceConf = surfScore;
  let rivalConf = 0.5;
  if (rivalSystem && player.id && opponent.id) {
    try {
      const rivalry = rivalSystem.getRivalry(player.id, opponent.id);
      if (rivalry && rivalry.totalMatches >= 3) {
        const playerIsP1 = rivalry.p1Id === player.id;
        const playerWins = playerIsP1 ? rivalry.p1Wins : rivalry.p2Wins;
        rivalConf = playerWins / rivalry.totalMatches;
      }
    } catch (_) {
    }
  }
  const tiebreakConf = rf?.tiebreakForm ?? 0.5;
  const contextConf = { tiebreakConf, rivalConf, surfaceConf };
  player.ctx._contextConf = contextConf;
  const moodAdjust = surfaceConf * 0.5 + // 50% da superfície
  rivalConf * 0.35 + // 35% do h2h
  tiebreakConf * 0.15;
  let baseMood = Math.max(0.35, Math.min(0.65, moodAdjust));
  const hot = rf?.hotStreak ?? 0;
  const cold = rf?.coldStreak ?? 0;
  if (hot >= 2)
    baseMood = Math.min(0.68, baseMood + Math.min(hot - 1, 4) * 0.02);
  if (cold >= 2)
    baseMood = Math.max(0.32, baseMood - Math.min(cold - 1, 4) * 0.02);
  player.ctx._moodFactor = baseMood;
}
function updateTiebreakConf(player, won) {
  if (!player?.ctx?._contextConf)
    return;
  const cc = player.ctx._contextConf;
  const current = cc.tiebreakConf ?? 0.5;
  const target = won ? 1 : 0;
  cc.tiebreakConf = current + (target - current) * 0.12;
  const moodAdj = cc.surfaceConf * 0.5 + cc.rivalConf * 0.35 + cc.tiebreakConf * 0.15;
  player.ctx._moodFactor = Math.max(0.3, Math.min(0.7, moodAdj));
}
function updateRallyPressure(gs, targetPlayerIdx, zone, targetX) {
  const player = gs.players[targetPlayerIdx];
  const zoneDef = COURT_ZONES[zone] ?? COURT_ZONES.NEUTRAL;
  const lateralFrac = Math.min(1, Math.abs(targetX) / (COURT.singlesW / 2));
  const delta = zoneDef.pressMod * 0.62 + lateralFrac * 0.38;
  player.ctx.rallyPressure = clamp2(
    (player.ctx.rallyPressure ?? 0) * 0.72 + delta * 0.3,
    0,
    1
  );
}
function aiDecideShot(player, ball, opponent, quality, opts = {}) {
  const optsWithBall = {
    ...opts,
    ballZ: ball?.pos?.z ?? 0,
    contactSpace: opts.contactSpace ?? player._contactSpace
  };
  const { shot, aiTrace } = decideShotAndBuild(player, opponent, quality, optsWithBall);
  player._aiTrace = aiTrace ?? {};
  return shot;
}

// src/MatchPlanSystem.js
var PLAN_DIRECTIVES = {
  ATTACK_BH: "ATTACK_BH",
  // atacar backhand adversário
  ATTACK_FH: "ATTACK_FH",
  // atacar forehand adversário
  SERVE_BODY: "SERVE_BODY",
  // servir no corpo em pontos grandes
  SERVE_WIDE: "SERVE_WIDE",
  // explorar serviço aberto
  FORCE_LONG: "FORCE_LONG",
  // forçar rallys longos
  NET_PRESSURE: "NET_PRESSURE",
  // subir à rede mais que o normal
  LIMIT_NET: "LIMIT_NET",
  // evitar rede (contra net specialist forte)
  EXPLOIT_SURFACE: "EXPLOIT_SURFACE",
  // explorar vantagem de superfície própria
  EARLY_AGGRESSION: "EARLY_AGGRESSION"
  // pressionar cedo, não construir o ponto
};
var NET_STYLES = /* @__PURE__ */ new Set(["NET_SPECIALIST", "SRV_VOL"]);
var NET_APPROACH_STYLES = /* @__PURE__ */ new Set(["NET_SPECIALIST", "SRV_VOL", "ALL_COURT", "AGG_BASELINER"]);
var RALLY_PATTERN_COUNTER = {
  CROSS_HEAVY: PLAN_DIRECTIVES.EARLY_AGGRESSION,
  // interromper o ritmo cruzado
  DEEP_GRINDER: PLAN_DIRECTIVES.FORCE_LONG,
  // aceitar o grind? Não — mudar o jogo
  SERVE_PLUS_ONE: PLAN_DIRECTIVES.FORCE_LONG,
  // neutralizar o serve+1 com rallys
  AGGRESSIVE_EARLY: PLAN_DIRECTIVES.FORCE_LONG,
  // absorver e contra-atacar
  NET_APPROACH: PLAN_DIRECTIVES.LIMIT_NET,
  // cuidado com subidas
  SHORT_ANGLE_BUILDER: PLAN_DIRECTIVES.ATTACK_BH,
  // tirar a iniciativa
  RHYTHM_DISRUPTION: PLAN_DIRECTIVES.EARLY_AGGRESSION,
  // não deixar o disruptor se estabelecer
  DEFENSIVE_BASE: PLAN_DIRECTIVES.EARLY_AGGRESSION,
  // forçar antes que o defensor se firme
  CENTRE_CONTROL: PLAN_DIRECTIVES.ATTACK_BH
  // desequilibrar o centro
};
var SERVE_BODY_STYLES = /* @__PURE__ */ new Set(["SRV_VOL", "BIG_SERVER", "AGG_BASELINER", "POWER_BASELINER"]);
var FH_DOMINANT_STYLES = /* @__PURE__ */ new Set([
  "AGG_BASELINER",
  "POWER_BASELINER",
  "TAKEALLRISK",
  "MOMENTUM_PLAYER"
]);
function scoutOpponent(player, opponent, surface, rivalSystem = null) {
  let weaker_side = _inferWeakerSideFromStyle(opponent.styleId);
  const mc = opponent.ctx?.matchCtx;
  if (mc) {
    const bh = mc.oppBhHits ?? 0;
    const fh = mc.oppFhHits ?? 0;
    if (bh + fh >= 3) {
      if (bh > fh * 1.4)
        weaker_side = "FH";
      else if (fh > bh * 1.4)
        weaker_side = "BH";
      else
        weaker_side = null;
    }
  }
  const surfForm = opponent.recentForm?.surfaceForm?.[surface] ?? 0.5;
  const formScore = opponent.recentForm?.formScore ?? 0.5;
  const rally_pattern = opponent.rallyPattern ?? null;
  const netFromCtx = mc?.netFromTransition ?? 0;
  const netFromStyle = NET_APPROACH_STYLES.has(opponent.styleId) ? 0.3 : 0.05;
  const net_frequency = netFromCtx > 0 ? netFromCtx : netFromStyle;
  const serve_tendency = mc?.serveHistory ?? [];
  let h2h_record = null;
  if (rivalSystem && player.id && opponent.id) {
    try {
      const rivalry = rivalSystem.getRivalry(player.id, opponent.id);
      if (rivalry && rivalry.totalMatches > 0) {
        const playerIsP1 = rivalry.p1Id === player.id;
        const playerWins = playerIsP1 ? rivalry.p1Wins : rivalry.p2Wins;
        h2h_record = {
          totalMatches: rivalry.totalMatches,
          playerWins,
          winRate: rivalry.totalMatches > 0 ? playerWins / rivalry.totalMatches : 0.5,
          type: rivalry.type ?? null
        };
      }
    } catch (_) {
    }
  }
  return {
    weaker_side,
    // 'BH' | 'FH' | null
    surface_form: surfForm,
    // 0..1 — forma do adversário nesta superfície
    form_score: formScore,
    // 0..1 — forma geral recente
    rally_pattern,
    // string | null
    net_frequency,
    // 0..1 — estimativa de frequência de subidas
    serve_tendency,
    // array de serviços registrados
    h2h_record,
    // { totalMatches, playerWins, winRate, type } | null
    signature_pattern: null
    // [will be rebuilt]
  };
}
function generateMatchPlan(player, opponent, surface, coach = null, rivalSystem = null) {
  const scout = scoutOpponent(player, opponent, surface, rivalSystem);
  const styleId = player.styleId ?? "ALL_COURT";
  const oppStyle = opponent.styleId ?? "ALL_COURT";
  const philosophy = coach?.philosophy ?? null;
  const directives = [];
  const reasonNotes = [];
  if (scout.weaker_side === "BH") {
    directives.push({ type: PLAN_DIRECTIVES.ATTACK_BH, strength: 0.7 });
    reasonNotes.push("atacar BH exposto do advers\xE1rio");
  } else if (scout.weaker_side === "FH") {
    directives.push({ type: PLAN_DIRECTIVES.ATTACK_FH, strength: 0.7 });
    reasonNotes.push("explorar FH fraco do advers\xE1rio");
  } else if (FH_DOMINANT_STYLES.has(oppStyle)) {
    directives.push({ type: PLAN_DIRECTIVES.ATTACK_BH, strength: 0.45 });
    reasonNotes.push("heur\xEDstica de estilo: BH tende a ser o lado fraco");
  }
  const counterDirective = scout.rally_pattern ? RALLY_PATTERN_COUNTER[scout.rally_pattern] ?? null : null;
  if (counterDirective && !_hasDirective(directives, counterDirective)) {
    directives.push({ type: counterDirective, strength: 0.55 });
    reasonNotes.push(`contra-padr\xE3o para ${scout.rally_pattern}`);
  }
  const playerSurfForm = player.recentForm?.surfaceForm?.[surface] ?? 0.5;
  const playerFormScore = player.recentForm?.formScore ?? 0.5;
  if (playerSurfForm > 0.62 && playerSurfForm > scout.surface_form + 0.1) {
    directives.push({ type: PLAN_DIRECTIVES.EXPLOIT_SURFACE, strength: 0.6 });
    reasonNotes.push("forma superior na superf\xEDcie");
  }
  if (NET_STYLES.has(oppStyle) || scout.net_frequency > 0.25) {
    if (!_hasDirective(directives, PLAN_DIRECTIVES.LIMIT_NET)) {
      directives.push({ type: PLAN_DIRECTIVES.LIMIT_NET, strength: 0.5 });
      reasonNotes.push("advers\xE1rio sobe \xE0 rede com frequ\xEAncia");
    }
  }
  if (NET_APPROACH_STYLES.has(styleId) && !NET_STYLES.has(oppStyle)) {
    if (!_hasDirective(directives, PLAN_DIRECTIVES.NET_PRESSURE)) {
      directives.push({ type: PLAN_DIRECTIVES.NET_PRESSURE, strength: 0.5 });
      reasonNotes.push("explorar voca\xE7\xE3o de rede do jogador");
    }
  }
  if (SERVE_BODY_STYLES.has(styleId)) {
    directives.push({ type: PLAN_DIRECTIVES.SERVE_BODY, strength: 0.45 });
    reasonNotes.push("estilo favorece saque no corpo");
  }
  if (philosophy === "OFFENSIVE") {
    if (!_hasDirective(directives, PLAN_DIRECTIVES.EARLY_AGGRESSION)) {
      directives.push({ type: PLAN_DIRECTIVES.EARLY_AGGRESSION, strength: 0.4 });
      reasonNotes.push("coach ofensivo \u2014 pressionar cedo");
    }
  } else if (philosophy === "DEFENSIVE") {
    if (!_hasDirective(directives, PLAN_DIRECTIVES.FORCE_LONG)) {
      directives.push({ type: PLAN_DIRECTIVES.FORCE_LONG, strength: 0.4 });
      reasonNotes.push("coach defensivo \u2014 alongar o rally");
    }
  }
  if (scout.h2h_record && scout.h2h_record.totalMatches >= 3) {
    const h2hWR = scout.h2h_record.winRate;
    if (h2hWR < 0.3 && !_hasDirective(directives, PLAN_DIRECTIVES.EARLY_AGGRESSION)) {
      directives.push({ type: PLAN_DIRECTIVES.EARLY_AGGRESSION, strength: 0.5 });
      reasonNotes.push("h2h desfavor\xE1vel \u2014 quebrar padr\xE3o usual");
    }
    if (h2hWR > 0.7) {
      reasonNotes.push("h2h favor\xE1vel \u2014 manter estrat\xE9gia");
    }
  }
  if (directives.length === 0) {
    directives.push({ type: PLAN_DIRECTIVES.ATTACK_BH, strength: 0.35 });
    reasonNotes.push("diretiva default \u2014 sem dados suficientes");
  }
  directives.sort((a, b) => b.strength - a.strength);
  const finalDirectives = directives.slice(0, 3);
  const dataFactor = (scout.rally_pattern ? 0.25 : 0) + (scout.weaker_side ? 0.25 : 0) + (scout.h2h_record ? 0.3 : 0) + (playerFormScore > 0.5 ? 0.2 : 0.1);
  const avgStrength = finalDirectives.reduce((s, d) => s + d.strength, 0) / finalDirectives.length;
  const confidence = Math.min(0.95, Math.max(0.25, avgStrength * (0.6 + dataFactor * 0.4)));
  return {
    directives: finalDirectives,
    confidence,
    notes: reasonNotes.join(" \xB7 "),
    _scout: scout
    // guardado para debug e narrativa (MatchNarrator fase 7)
  };
}
function initMatchPlans(playerA, playerB, surface, rivalSystem = null) {
  playerA._matchPlan = generateMatchPlan(playerA, playerB, surface, playerA.coach ?? null, rivalSystem);
  playerB._matchPlan = generateMatchPlan(playerB, playerA, surface, playerB.coach ?? null, rivalSystem);
}
function _hasDirective(directives, type) {
  return directives.some((d) => d.type === type);
}
function _inferWeakerSideFromStyle(styleId) {
  if (FH_DOMINANT_STYLES.has(styleId))
    return "BH";
  if (styleId === "CTR_PUNCHER" || styleId === "GRINDER")
    return "FH";
  return null;
}

// src/formas.jsx
var import_react2 = __toESM(require_react(), 1);
var FORM_STATES = [
  {
    id: "IMPARAVEL",
    label: "Impar\xE1vel",
    shortLabel: "IMPAR\xC1VEL",
    icon: "\u26A1",
    threshold: 75,
    modifier: 0.15,
    color: "#00E5FF",
    colorDim: "rgba(0,229,255,.18)",
    colorGlow: "rgba(0,229,255,.40)",
    side: "positive"
  },
  {
    id: "GRANDE_FORMA",
    label: "Grande Forma",
    shortLabel: "GRANDE FORMA",
    icon: "\u{1F525}",
    threshold: 40,
    modifier: 0.1,
    color: "#69F0AE",
    colorDim: "rgba(105,240,174,.15)",
    colorGlow: "rgba(105,240,174,.30)",
    side: "positive"
  },
  {
    id: "BOA_FORMA",
    label: "Boa Forma",
    shortLabel: "BOA FORMA",
    icon: "\u{1F4C8}",
    threshold: 15,
    modifier: 0.05,
    color: "#B9F6CA",
    colorDim: "rgba(185,246,202,.12)",
    colorGlow: "rgba(185,246,202,.20)",
    side: "positive"
  },
  {
    id: "NORMAL",
    label: "Normal",
    shortLabel: "NORMAL",
    icon: "\u27A1\uFE0F",
    threshold: -14,
    // min -14 / max +14
    modifier: 0,
    color: "#90A4AE",
    colorDim: "rgba(144,164,174,.12)",
    colorGlow: "rgba(144,164,174,.20)",
    side: "neutral"
  },
  {
    id: "PERFORMANDO_MAL",
    label: "Performando Mal",
    shortLabel: "PERF. MAL",
    icon: "\u{1F4C9}",
    threshold: -15,
    modifier: -0.05,
    color: "#FFAB40",
    colorDim: "rgba(255,171,64,.12)",
    colorGlow: "rgba(255,171,64,.25)",
    side: "negative"
  },
  {
    id: "FASE_RUIM",
    label: "Fase Ruim",
    shortLabel: "FASE RUIM",
    icon: "\u{1F327}\uFE0F",
    threshold: -40,
    modifier: -0.1,
    color: "#FF6E40",
    colorDim: "rgba(255,110,64,.12)",
    colorGlow: "rgba(255,110,64,.25)",
    side: "negative"
  },
  {
    id: "FUNDO_POCO",
    label: "Fundo do Po\xE7o",
    shortLabel: "FUNDO DO PO\xC7O",
    icon: "\u{1F480}",
    threshold: -75,
    modifier: -0.15,
    color: "#FF1744",
    colorDim: "rgba(255,23,68,.12)",
    colorGlow: "rgba(255,23,68,.30)",
    side: "negative"
  }
];
var FORM_STATE_MAP = Object.fromEntries(FORM_STATES.map((s) => [s.id, s]));
function getFormModifiers(player, surface) {
  const rf = player.recentForm ?? null;
  if (!rf)
    return { qualityMod: 1, errorMod: 1, serveMod: 1 };
  const base = rf.formScore ?? 0.5;
  const surfKey = (surface ?? "HARD").toUpperCase();
  const surfForm = rf.surfaceForm?.[surfKey] ?? base;
  let qualityMod = 0.88 + surfForm * 0.24;
  let errorMod = 1.1 - surfForm * 0.2;
  let serveMod = 0.92 + surfForm * 0.16;
  if (player.surfaceIdentity?.surface === surfKey) {
    qualityMod += 0.05;
    errorMod -= 0.03;
    serveMod += 0.03;
  }
  return { qualityMod, errorMod, serveMod };
}

// src/SignatureShots.js
var SIGNATURE_SHOTS2 = {
  // ══════════════════════════════════════════════════════════════════
  // FOREHAND
  // ══════════════════════════════════════════════════════════════════
  FH_TOPSPIN_CROSS: {
    label: "FH TOPSPIN CRUZADO",
    emoji: "\u{1F300}",
    baseType: "TOPSPIN",
    wing: "FH",
    description: "Topspin cruzado com quique mais alto e desvio lateral \u2014 sai do alcance ap\xF3s o quique.",
    attrThreshold: { fhPotencia: 72, topspin: 70 },
    activationBase: 0.32,
    physics: {
      pow: 1.05,
      spinFnMult: 1.7,
      spinZ: 0.4,
      depthRange: [0.68, 0.84],
      bounce: 1.5,
      bounceSpin: 1.8,
      curve: 0.5,
      targetXBias: "CROSS",
      riskMult: 1.1
    }
  },
  FH_TOPSPIN_DTL: {
    label: "FH PARALELO",
    emoji: "\u{1F526}",
    baseType: "TOPSPIN",
    wing: "FH",
    description: "DTL pesado com penetra\xE7\xE3o m\xE1xima \u2014 pouca curva, muito peso ap\xF3s o quique.",
    attrThreshold: { fhPotencia: 75, topspin: 65 },
    activationBase: 0.3,
    physics: {
      pow: 1.12,
      spinFnMult: 1.3,
      spinZ: 0.08,
      depthRange: [0.74, 0.9],
      bounce: 1.25,
      bounceSpin: 1.2,
      targetXBias: "DTL",
      riskMult: 1.15
    }
  },
  FH_INSIDE_OUT: {
    label: "FH INSIDE-OUT",
    emoji: "\u{1F504}",
    baseType: "TOPSPIN",
    wing: "FH",
    description: "Inside-out cl\xE1ssico: FH batido do lado BH com dire\xE7\xE3o cross extremo.",
    attrThreshold: { fhPotencia: 78, visaoTatica: 70 },
    activationBase: 0.28,
    physics: {
      pow: 1.08,
      spinFnMult: 1.4,
      spinZ: 0.55,
      depthRange: [0.62, 0.8],
      bounce: 1.3,
      bounceSpin: 1.6,
      curve: 0.6,
      targetXBias: "CROSS",
      riskMult: 1.18
    }
  },
  FH_FLAT_BOMB: {
    label: "FH PLANO",
    emoji: "\u{1F4A5}",
    baseType: "ACCEL",
    wing: "FH",
    description: "Flat de m\xE1xima velocidade, arco rasante \u2014 o canh\xE3o do FH.",
    attrThreshold: { fhPotencia: 82 },
    activationBase: 0.28,
    physics: {
      pow: 1.3,
      spinFnMult: 0.3,
      spinZ: 0.05,
      depthRange: [0.78, 0.92],
      bounce: 1.2,
      bounceSpin: 0.5,
      riskMult: 1.2
    }
  },
  FH_SHORT_ANGLE: {
    label: "FH \xC2NGULO CURTO",
    emoji: "\u{1F4D0}",
    baseType: "SHORT_ACCEL",
    wing: "FH",
    description: "Short-angle ofensivo: cai na meia-quadra, sai perpendicular \xE0 rede.",
    attrThreshold: { fhControle: 76, leitura: 70 },
    activationBase: 0.26,
    physics: {
      pow: 0.88,
      spinFnMult: 1.5,
      spinZ: 0.5,
      depthRange: [0.32, 0.5],
      bounce: 0.85,
      bounceSpin: 1.3,
      targetXBias: "WIDE",
      riskMult: 1.22
    }
  },
  FH_KICK: {
    label: "FH KICK",
    emoji: "\u{1F9B5}",
    baseType: "TOPSPIN",
    wing: "FH",
    description: "Topspin com arco alto \u2014 a bola sobe para o ombro/cabe\xE7a for\xE7ando erro.",
    attrThreshold: { topspin: 78, fhPotencia: 68 },
    activationBase: 0.3,
    physics: {
      pow: 0.88,
      spinFnMult: 2.1,
      spinZ: 0.12,
      depthRange: [0.7, 0.86],
      bounce: 1.9,
      bounceSpin: 2.2,
      arcBoost: 1.6,
      riskMult: 1.12
    }
  },
  FH_REVERSE: {
    label: "FH INVERTIDO",
    emoji: "\u{1F32A}\uFE0F",
    baseType: "TOPSPIN",
    wing: "FH",
    description: "Pulso invertido \u2014 spin contr\xE1rio ao esperado, desvio imprevis\xEDvel no quique.",
    attrThreshold: { fhPotencia: 84, topspin: 82, leitura: 76 },
    activationBase: 0.22,
    physics: {
      pow: 0.92,
      spinFnMult: 1.8,
      spinZ: -0.65,
      depthRange: [0.6, 0.76],
      bounce: 1.1,
      bounceSpin: 1.7,
      targetXBias: "DTL",
      riskMult: 1.28
    }
  },
  // ══════════════════════════════════════════════════════════════════
  // BACKHAND
  // ══════════════════════════════════════════════════════════════════
  BH_TOPSPIN_CROSS: {
    label: "BH TOPSPIN CRUZADO",
    emoji: "\u{1F300}",
    baseType: "TOPSPIN",
    wing: "BH",
    description: "BH cross com spin pesado \u2014 especialidade de Djokovic/Agassi.",
    attrThreshold: { bhPotencia: 70, topspin: 68 },
    activationBase: 0.32,
    physics: {
      pow: 1.05,
      spinFnMult: 1.65,
      spinZ: 0.38,
      depthRange: [0.66, 0.82],
      bounce: 1.45,
      bounceSpin: 1.7,
      curve: 0.45,
      targetXBias: "CROSS",
      riskMult: 1.1
    }
  },
  BH_BULLET_DTL: {
    label: "BH PARALELO",
    emoji: "\u{1F52B}",
    baseType: "ACCEL",
    wing: "BH",
    description: "A bala de BH \u2014 DTL plano com penetra\xE7\xE3o m\xE1xima. A arma de Wawrinka.",
    attrThreshold: { bhPotencia: 78, bhControle: 68 },
    activationBase: 0.28,
    physics: {
      pow: 1.2,
      spinFnMult: 0.6,
      spinZ: 0.08,
      depthRange: [0.76, 0.92],
      bounce: 1.3,
      bounceSpin: 0.8,
      targetXBias: "DTL",
      riskMult: 1.22
    }
  },
  BH_SLICE_DEEP: {
    label: "BH SLICE PROFUNDO",
    emoji: "\u{1F52A}",
    baseType: "SLICE",
    wing: "BH",
    description: "Backspin com quique rasteiro e profundo \u2014 mant\xE9m o advers\xE1rio longe.",
    attrThreshold: { bhControle: 72, slice: 70 },
    activationBase: 0.32,
    physics: {
      pow: 0.82,
      spinFnMult: 1.8,
      spinZ: 0.15,
      depthRange: [0.72, 0.88],
      bounce: 0.28,
      bounceSpin: 0.25,
      riskMult: 1.08
    }
  },
  BH_SLICE_SHORT: {
    label: "BH SLICE CURTO",
    emoji: "\u{1F5E1}\uFE0F",
    baseType: "DROP",
    wing: "BH",
    description: "Slice que cai na meia-quadra com quique m\xEDnimo \u2014 obriga o advers\xE1rio a avan\xE7ar.",
    attrThreshold: { bhControle: 74, slice: 68 },
    activationBase: 0.28,
    physics: {
      pow: 0.72,
      spinFnMult: 2,
      spinZ: 0.22,
      depthRange: [0.12, 0.26],
      // 1.4–3.1m da rede — slice curto real
      netClearance: 0.08,
      // passa baixo, rasante
      bounce: 0.2,
      bounceSpin: 0.18,
      riskMult: 1.14
    }
  },
  BH_LIFT: {
    label: "BH LIFT",
    emoji: "\u{1F315}",
    baseType: "TOPSPIN",
    wing: "BH",
    description: "BH com arco alto e spin pesado \u2014 moonball de BH que for\xE7a erro no ombro.",
    attrThreshold: { topspin: 72, bhControle: 68 },
    activationBase: 0.3,
    physics: {
      pow: 0.82,
      spinFnMult: 1.8,
      spinZ: 0.1,
      depthRange: [0.76, 0.9],
      bounce: 1.7,
      bounceSpin: 1.9,
      arcBoost: 1.8,
      riskMult: 1.1
    }
  },
  BH_FLAT: {
    label: "BH PLANO",
    emoji: "\u26A1",
    baseType: "TOPSPIN",
    wing: "BH",
    description: "BH flat r\xE1pido, pouco spin \u2014 surpreende por ser diferente do padr\xE3o topspin.",
    attrThreshold: { bhPotencia: 74, bhControle: 65 },
    activationBase: 0.26,
    physics: {
      pow: 1.18,
      spinFnMult: 0.35,
      spinZ: 0.05,
      depthRange: [0.72, 0.88],
      bounce: 1.15,
      bounceSpin: 0.45,
      riskMult: 1.16
    }
  },
  BH_CHIP_CHARGE: {
    label: "CHIP & CHARGE",
    emoji: "\u2694\uFE0F",
    baseType: "SLICE",
    wing: "BH",
    description: "Slice de BH curto + subida imediata \xE0 rede \u2014 padr\xE3o grama cl\xE1ssico.",
    attrThreshold: { slice: 72, volley: 68 },
    activationBase: 0.26,
    physics: {
      pow: 0.72,
      spinFnMult: 1.6,
      spinZ: 0.2,
      depthRange: [0.28, 0.44],
      bounce: 0.3,
      bounceSpin: 0.22,
      riskMult: 1.12
    }
  },
  // ══════════════════════════════════════════════════════════════════
  // SAQUE
  // ══════════════════════════════════════════════════════════════════
  SERVE_FLAT_BOMB: {
    label: "SAQUE EXPLOSIVO",
    emoji: "\u{1F4A3}",
    baseType: "SERVE",
    wing: "SERVE",
    description: "Velocidade acima do normal, pouco spin \u2014 ace power puro.",
    attrThreshold: { saqueForca: 78 },
    activationBase: 0.3,
    physics: {
      pow: 1.32,
      spinFnMult: 0.35,
      spinZ: 0.05,
      depthRange: [0.82, 0.96],
      bounce: 1.12,
      bounceSpin: 0.5,
      riskMult: 1.18
    }
  },
  SERVE_KICK_HIGH: {
    label: "KICK ALTO",
    emoji: "\u{1F680}",
    baseType: "SERVE",
    wing: "SERVE",
    description: "Kick com quique alt\xEDssimo, sai para o ombro \u2014 destr\xF3i backhand fraco.",
    attrThreshold: { saqueForca: 70, topspin: 55 },
    activationBase: 0.32,
    physics: {
      pow: 0.85,
      spinFnMult: 2.5,
      spinZ: 0.28,
      depthRange: [0.72, 0.86],
      bounce: 2.4,
      bounceSpin: 2.8,
      riskMult: 1.1
    }
  },
  SERVE_SLICE_WIDE: {
    label: "SLICE WIDE",
    emoji: "\u{1F40D}",
    baseType: "SERVE",
    wing: "SERVE",
    description: "Slice com curvatura extrema que expulsa o advers\xE1rio para fora da quadra.",
    attrThreshold: { saquePrecisao: 72, slice: 60 },
    activationBase: 0.3,
    physics: {
      pow: 0.9,
      spinFnMult: 1.8,
      spinZ: 0.92,
      depthRange: [0.65, 0.8],
      bounce: 0.75,
      bounceSpin: 0.8,
      curve: 1,
      targetXBias: "WIDE",
      riskMult: 1.14
    }
  },
  SERVE_JAM_BODY: {
    label: "SAQUE NO CORPO",
    emoji: "\u{1F3AF}",
    baseType: "SERVE",
    wing: "SERVE",
    description: 'Flat direto no corpo, sem espa\xE7o \u2014 o "jam" que bloqueia o retorno.',
    attrThreshold: { saquePrecisao: 74, visaoTatica: 68 },
    activationBase: 0.3,
    physics: {
      pow: 1.1,
      spinFnMult: 0.55,
      spinZ: 0.05,
      depthRange: [0.8, 0.94],
      bounce: 1.08,
      bounceSpin: 0.6,
      targetXBias: "BODY",
      riskMult: 1.08
    }
  },
  SERVE_T_LASER: {
    label: "SAQUE NO T",
    emoji: "\u{1F526}",
    baseType: "SERVE",
    wing: "SERVE",
    description: "Flat no T com coloca\xE7\xE3o cir\xFArgica \u2014 sem \xE2ngulo de retorno.",
    attrThreshold: { saquePrecisao: 76, leitura: 68 },
    activationBase: 0.3,
    physics: {
      pow: 1.15,
      spinFnMult: 0.5,
      spinZ: 0.05,
      depthRange: [0.82, 0.95],
      bounce: 1.05,
      bounceSpin: 0.6,
      targetXBias: "BODY",
      riskMult: 1.1
    }
  },
  // ══════════════════════════════════════════════════════════════════
  // VOLEIO
  // ══════════════════════════════════════════════════════════════════
  VOLLEY_TOUCH: {
    label: "VOLEIO DE TOQUE",
    emoji: "\u{1FAC0}",
    baseType: "VOLLEY",
    wing: "NET",
    description: "Absor\xE7\xE3o m\xE1xima \u2014 drop volley com quique quase nulo.",
    attrThreshold: { volley: 76, bhControle: 68 },
    activationBase: 0.3,
    physics: {
      pow: 0.28,
      spinFnMult: 2.2,
      spinZ: 0.1,
      depthRange: [0.08, 0.18],
      bounce: 0.18,
      bounceSpin: 0.12,
      riskMult: 1.18
    }
  },
  VOLLEY_PUNCH: {
    label: "VOLEIO SOCO",
    emoji: "\u{1F44A}",
    baseType: "VOLLEY",
    wing: "NET",
    description: "Punch flat com velocidade m\xE1xima \u2014 passa antes do advers\xE1rio reagir.",
    attrThreshold: { volley: 72, fhPotencia: 70 },
    activationBase: 0.32,
    physics: {
      pow: 1.42,
      spinFnMult: 0.55,
      spinZ: 0.1,
      depthRange: [0.74, 0.9],
      bounce: 1.22,
      bounceSpin: 0.65,
      riskMult: 1.14
    }
  },
  VOLLEY_ANGLE: {
    label: "VOLEIO \xC2NGULO",
    emoji: "\u{1F4D0}",
    baseType: "VOLLEY",
    wing: "NET",
    description: "Voleio cross com abertura extrema \u2014 sai da quadra lateralmente.",
    attrThreshold: { volley: 74, visaoTatica: 68 },
    activationBase: 0.28,
    physics: {
      pow: 0.9,
      spinFnMult: 1.2,
      spinZ: 0.45,
      depthRange: [0.28, 0.48],
      bounce: 0.75,
      bounceSpin: 0.9,
      targetXBias: "WIDE",
      riskMult: 1.2
    }
  },
  VOLLEY_CHIP: {
    label: "VOLEIO CHIP",
    emoji: "\u{1F342}",
    baseType: "VOLLEY",
    wing: "NET",
    description: "Backspin no voleio \u2014 cai curto e rasteiro, dif\xEDcil de levantar.",
    attrThreshold: { volley: 70, slice: 65 },
    activationBase: 0.3,
    physics: {
      pow: 0.55,
      spinFnMult: 1.8,
      spinZ: 0.18,
      depthRange: [0.12, 0.28],
      bounce: 0.22,
      bounceSpin: 0.2,
      riskMult: 1.14
    }
  },
  // ══════════════════════════════════════════════════════════════════
  // DROP SHOT
  // ══════════════════════════════════════════════════════════════════
  DROP_DEAD: {
    label: "DROP MORTO",
    emoji: "\u{1F480}",
    baseType: "DROP",
    wing: "ANY",
    description: "Backspin extremo \u2014 segundo quique quase n\xE3o sai do lugar.",
    attrThreshold: { fhControle: 74, slice: 62 },
    activationBase: 0.26,
    physics: {
      pow: 0.48,
      spinFnMult: 2.9,
      spinZ: 0.05,
      depthRange: [0.12, 0.24],
      netClearance: 0.07,
      bounce: 0.14,
      bounceSpin: 0.05,
      riskMult: 1.2
    }
  },
  DROP_LATERAL: {
    label: "DROP LATERAL",
    emoji: "\u{1F4A8}",
    baseType: "DROP",
    wing: "ANY",
    description: "Cai na meia-quadra com desvio lateral ap\xF3s o quique \u2014 advers\xE1rio cobre o errado.",
    attrThreshold: { fhControle: 72, slice: 60 },
    activationBase: 0.28,
    physics: {
      pow: 0.6,
      spinFnMult: 1.8,
      spinZ: 0.8,
      depthRange: [0.16, 0.3],
      netClearance: 0.08,
      bounce: 0.34,
      bounceSpin: 0.6,
      curve: 0.75,
      riskMult: 1.18
    }
  },
  DROP_FAKE: {
    label: "DROP ACELERADO",
    emoji: "\u{1F0CF}",
    baseType: "DROP",
    wing: "ANY",
    description: "Trajet\xF3ria de drop mas com quique que acelera \u2014 quebra totalmente a leitura.",
    attrThreshold: { fhControle: 74, leitura: 68 },
    activationBase: 0.26,
    physics: {
      pow: 0.88,
      spinFnMult: 1.2,
      spinZ: 0.18,
      depthRange: [0.2, 0.36],
      netClearance: 0.09,
      bounce: 1.45,
      bounceSpin: 1.8,
      riskMult: 1.16
    }
  },
  DROP_HIDDEN: {
    label: "DROP ESCONDIDO",
    emoji: "\u{1F3AD}",
    baseType: "DROP",
    wing: "ANY",
    description: "Mesmo gesto do topspin profundo \u2014 a bola cai na frente quando advers\xE1rio recuou.",
    attrThreshold: { fhControle: 76, leitura: 72 },
    activationBase: 0.25,
    physics: {
      pow: 0.72,
      // mantém o disfarce sem morrer antes da rede
      spinFnMult: 1.95,
      // bastante backspin para travar no quique
      spinZ: 0.08,
      depthRange: [0.12, 0.24],
      // continua curto, mas numa faixa viável
      netClearance: 0.08,
      // segue baixo sem virar erro automático
      bounce: 0.26,
      bounceSpin: 0.22,
      riskMult: 1.12
    }
  },
  // ══════════════════════════════════════════════════════════════════
  // ESPECIAIS
  // ══════════════════════════════════════════════════════════════════
  LOB_OFFENSIVE: {
    label: "LOB OFENSIVO",
    emoji: "\u{1F680}",
    baseType: "LOB",
    wing: "ANY",
    description: "Topspin pesado em arco \u2014 cai r\xE1pido, quica alto, foge do smash.",
    attrThreshold: { topspin: 70, leitura: 64 },
    activationBase: 0.28,
    physics: {
      pow: 1.08,
      spinFnMult: 2.1,
      spinZ: 0.12,
      depthRange: [0.74, 0.9],
      bounce: 1.9,
      bounceSpin: 2.3,
      riskMult: 1.14
    }
  },
  LOB_DEFENSIVE_PRECISE: {
    label: "LOB PRECISO",
    emoji: "\u{1F3DB}\uFE0F",
    baseType: "LOB",
    wing: "ANY",
    description: "Lob de corrida com backspin \u2014 cai fundo, timing do advers\xE1rio ruim.",
    attrThreshold: { defesa: 72, leitura: 66 },
    activationBase: 0.28,
    physics: {
      pow: 0.72,
      spinFnMult: 0.7,
      spinZ: 0.18,
      depthRange: [0.72, 0.88],
      bounce: 1.3,
      bounceSpin: 1.4,
      arcBoost: 2.5,
      riskMult: 1.06
    }
  },
  SMASH_BODY: {
    label: "SMASH NO CORPO",
    emoji: "\u{1F4A5}",
    baseType: "SMASH",
    wing: "NET",
    description: "Overhead direto no corpo \u2014 sem espa\xE7o, sem \xE2ngulo de defesa.",
    attrThreshold: { smash: 72 },
    activationBase: 0.3,
    physics: {
      pow: 1.2,
      spinFnMult: 0.6,
      spinZ: 0.08,
      depthRange: [0.72, 0.88],
      bounce: 1.18,
      bounceSpin: 0.65,
      targetXBias: "BODY",
      riskMult: 1.1
    }
  },
  TWEENER: {
    label: "TWEENER",
    emoji: "\u{1FA84}",
    baseType: "ACCEL",
    wing: "ANY",
    description: "Entre as pernas de costas para a rede \u2014 raridade absoluta.",
    attrThreshold: { fhPotencia: 80, visaoTatica: 82, leitura: 78 },
    activationBase: 0.16,
    physics: {
      pow: 1.05,
      spinFnMult: 1.2,
      spinZ: 0.25,
      depthRange: [0.62, 0.84],
      bounce: 1.1,
      bounceSpin: 1,
      riskMult: 1.3
    }
  }
};
function buildCompatibilityMap() {
  const map = {};
  for (const [key, sig] of Object.entries(SIGNATURE_SHOTS2)) {
    const entryKey = sig.baseType;
    if (!map[entryKey])
      map[entryKey] = {};
    for (const w of ["FH", "BH", "NET", "SERVE", "ANY", "BOTH"]) {
      if (sig.wing === w || sig.wing === "ANY" || sig.wing === "BOTH") {
        if (!map[entryKey][w])
          map[entryKey][w] = [];
        map[entryKey][w].push(key);
      }
    }
  }
  return map;
}
var COMPAT_MAP = buildCompatibilityMap();
var ALL_KEYS = Object.keys(SIGNATURE_SHOTS2);

// src/shotDecision.js
function initFormaDoDia() {
}

// src/vfx.js
var SHOT_LABELS = {
  FLAT: { label: "FLAT", emoji: "\u26A1", color: "#FFD700" },
  TOPSPIN: { label: "TOPSPIN", emoji: "\u{1F300}", color: "#00FF88" },
  SLICE: { label: "SLICE", emoji: "\u{1F52A}", color: "#00D4FF" },
  VOLLEY: { label: "VOLEIO", emoji: "\u{1F94A}", color: "#FF6B35" },
  DROP: { label: "DROP SHOT", emoji: "\u{1F4A7}", color: "#A78BFA" },
  SMASH: { label: "SMASH", emoji: "\u{1F4A5}", color: "#FF4444" },
  LOB_DEF: { label: "LOB", emoji: "\u2601\uFE0F", color: "#7ab4ff" },
  LOB_ATK: { label: "LOB ATK", emoji: "\u{1F680}", color: "#FF8844" },
  BANANA: { label: "BANANA", emoji: "\u{1F34C}", color: "#FFD700" },
  PASSING: { label: "PASSING", emoji: "\u{1F3AF}", color: "#00FF88" },
  HALF_VOLLEY: { label: "HALF VOLLEY", emoji: "\u26BD", color: "#FF9933" },
  SHORT_ANGLE: { label: "SHORT ANGLE", emoji: "\u{1F4D0}", color: "#FF2266" },
  SLICE_SHORT: { label: "SLICE SHORT", emoji: "\u{1F5E1}\uFE0F", color: "#FFCC44" },
  MISHIT: { label: "FRAME SHOT", emoji: "\u{1F4A2}", color: "#FF2244" },
  // Serve types
  "FLAT-T": { label: "SAQUE FLAT-T", emoji: "\u26A1", color: "#FFD700" },
  "FLAT-WIDE": { label: "SAQUE WIDE", emoji: "\u26A1", color: "#FFD700" },
  "FLAT-BODY": { label: "SAQUE BODY", emoji: "\u26A1", color: "#FF6B35" },
  "SLICE-WIDE": { label: "SAQUE SLICE", emoji: "\u{1F52A}", color: "#00D4FF" },
  "SLICE-T": { label: "SAQUE SLICE-T", emoji: "\u{1F52A}", color: "#00D4FF" },
  "KICK-BODY": { label: "SAQUE KICK", emoji: "\u{1F9B5}", color: "#00FF88" },
  "KICK-T": { label: "SAQUE KICK-T", emoji: "\u{1F9B5}", color: "#00FF88" }
};
var OUTCOME_HTML_TYPES = /* @__PURE__ */ new Set(["ACE", "WINNER", "OUT", "NET", "DOUBLE_FAULT"]);
function pushVFX(gs, type, label) {
  const ball = gs.ball;
  const isCenter = type === "GAME" || type === "SET";
  const x = isCenter ? 0 : clamp2(ball.pos.y * 26, -CL / 2 + 30, CL / 2 - 30);
  const y = isCenter ? 0 : clamp2(ball.pos.x * 26, -CW / 2 + 20, CW / 2 - 20);
  const rawCY = isCenter ? 0 : ball.pos.y;
  const rawCX = isCenter ? 0 : ball.pos.x;
  gs.vfxQueue.push({ type, label, born: performance.now(), x, y, rawCY, rawCX });
  if (OUTCOME_HTML_TYPES.has(type)) {
    if (!gs.pendingOutcomeLabels)
      gs.pendingOutcomeLabels = [];
    gs.pendingOutcomeLabels.push({ type, label, rawCY, rawCX, born: performance.now() });
  }
}
function pushShotVFX(gs, player, shotType, quality, mishit = false, isSignature = false, signatureLabel = null, signatureEmoji = null) {
  const x = clamp2(player.pos.y * SCALE, -CL / 2 + 40, CL / 2 - 40);
  const y = clamp2(player.pos.x * SCALE, -CW / 2 + 20, CW / 2 - 20);
  const cfg = SHOT_LABELS[shotType] || { label: shotType, emoji: "\u{1F3BE}", color: "#ffffff" };
  if (!gs.pendingHitLabels)
    gs.pendingHitLabels = [];
  const mishitCfg = mishit ? SHOT_LABELS["MISHIT"] || { label: "FRAME SHOT", emoji: "\u{1F4A2}", color: "#FF2244" } : null;
  gs.pendingHitLabels.push({
    playerId: player.id,
    playerSide: player.side,
    shotType,
    quality,
    color: mishitCfg ? mishitCfg.color : cfg.color,
    label: mishitCfg ? mishitCfg.label : isSignature && signatureLabel ? signatureLabel : cfg.label,
    emoji: mishitCfg ? mishitCfg.emoji : isSignature && signatureEmoji ? signatureEmoji : cfg.emoji,
    mishit: !!mishit,
    isSignature: !!isSignature,
    isBackhand: player._isBackhand ?? null
    // null = desconhecido (saque, etc.)
  });
}

// src/contactSpace.js
var HEIGHT_ZONES = [
  { name: "OVERHEAD", minZ: 2.2, qCeiling: 1 },
  // smash territory — qualidade depende do jogador
  { name: "HIGH", minZ: 1.7, qCeiling: 0.72 },
  // cabeça — só flat/topspin de emergência
  { name: "SHOULDER", minZ: 1.35, qCeiling: 0.88 },
  // ombro — topspin pesado ou flat agressivo
  { name: "SWEET", minZ: 0.85, qCeiling: 1 },
  // zona ideal ATP — todos os golpes
  { name: "HIP", minZ: 0.55, qCeiling: 0.8 },
  // quadril — transição, sem flat agressivo
  { name: "ANKLE", minZ: 0.25, qCeiling: 0.62 },
  // tornozelo/joelho — slice + topspin defensivo
  { name: "DIRT", minZ: 0, qCeiling: 0.45 }
  // chão — meia-volley forçada
];
var HEIGHT_Q_CEILING = Object.fromEntries(
  HEIGHT_ZONES.map((z) => [z.name, z.qCeiling])
);
var OFFSET_ZONES = [
  { name: "IDEAL", maxM: 0.3, qMult: 1 },
  // ponto perfeito — sem penalidade
  { name: "REACHABLE", maxM: 0.6, qMult: 0.88 },
  // alcançável — leve perda de controle
  { name: "STRETCH", maxM: 1, qMult: 0.7 },
  // braço esticado — perda real
  { name: "EXTREME", maxM: 1.4, qMult: 0.5 }
  // limite do corpo — apenas emergência
  // > 1.40m = MISS — tratado em tryHit via effectiveReach (não chega aqui)
];
var OFFSET_Q_MULT = Object.fromEntries(
  OFFSET_ZONES.map((z) => [z.name, z.qMult])
);
var PREP_WINDOW_CLASSES = [
  { name: "AMPLE", minMs: 900, swingMult: 1 },
  // tempo de sobra — full swing
  { name: "COMFORTABLE", minMs: 600, swingMult: 1 },
  // timing ideal ATP — full swing
  { name: "TIGHT", minMs: 400, swingMult: 0.82 },
  // pressionado — compact swing
  { name: "RUSH", minMs: 200, swingMult: 0.64 },
  // correndo — blocked swing
  { name: "EMERGENCY", minMs: -999, swingMult: 0.45 }
  // reação pura — reflex block
];
var PREP_SWING_MULT = Object.fromEntries(
  PREP_WINDOW_CLASSES.map((p) => [p.name, p.swingMult])
);
function computeHeightZone(z) {
  for (const zone of HEIGHT_ZONES) {
    if (z >= zone.minZ)
      return zone.name;
  }
  return "DIRT";
}
function computeOffsetZone(offsetM) {
  for (const zone of OFFSET_ZONES) {
    if (offsetM <= zone.maxM)
      return zone.name;
  }
  return "EXTREME";
}
function computePrepWindowClass(arrivalMarginS) {
  const ms = arrivalMarginS * 1e3;
  for (const cls of PREP_WINDOW_CLASSES) {
    if (ms >= cls.minMs)
      return cls.name;
  }
  return "EMERGENCY";
}
function computeContactSpace(ball, player) {
  const bz = ball.pos?.z ?? 0.914;
  const heightZone = computeHeightZone(bz);
  const heightQCeiling = HEIGHT_Q_CEILING[heightZone] ?? 1;
  const idealX = player._predCrossX ?? player.pos?.x ?? 0;
  const lateralOffset = Math.abs((ball.pos?.x ?? 0) - idealX);
  const offsetZone = computeOffsetZone(lateralOffset);
  const offsetQMult = OFFSET_Q_MULT[offsetZone] ?? 0.5;
  const arrivalMarginS = player._arrivalMargin ?? 0.5;
  const prepWindowClass = computePrepWindowClass(arrivalMarginS);
  const prepSwingMult = PREP_SWING_MULT[prepWindowClass] ?? 0.45;
  const qCeiling = Math.min(heightQCeiling, offsetQMult);
  return {
    // Altura
    heightZ: bz,
    heightZone,
    heightQCeiling,
    // Offset lateral
    lateralOffset,
    offsetZone,
    offsetQMult,
    // Prep window
    arrivalMarginS,
    prepWindowClass,
    prepSwingMult,
    // Teto combinado
    qCeiling
  };
}

// src/swingPrepEngine.js
var SWING_TYPES = {
  FULL: { id: "FULL", completionFactor: 1 },
  // backswing completo, transferência de peso
  COMPACT: { id: "COMPACT", completionFactor: 0.82 },
  // backswing reduzido, mais pulso
  BLOCKED: { id: "BLOCKED", completionFactor: 0.64 },
  // sem backswing — redirecionamento puro
  REFLEX: { id: "REFLEX", completionFactor: 0.45 }
  // reação instintiva pura
};
var PREP_WINDOW_TO_SWING = {
  AMPLE: "FULL",
  COMFORTABLE: "FULL",
  TIGHT: "COMPACT",
  RUSH: "BLOCKED",
  EMERGENCY: "REFLEX"
};
var OFFSET_SWING_DOWNGRADE = {
  IDEAL: 0,
  // sem downgrade
  REACHABLE: 0,
  // sem downgrade
  STRETCH: 1,
  // 1 nível abaixo: FULL→COMPACT, COMPACT→BLOCKED, BLOCKED→REFLEX
  EXTREME: 2
  // 2 níveis abaixo: FULL→BLOCKED, COMPACT→REFLEX, BLOCKED→REFLEX
};
var SWING_ORDER = ["REFLEX", "BLOCKED", "COMPACT", "FULL"];
function downgradeSwing(swingType, levels) {
  const idx = Math.max(0, SWING_ORDER.indexOf(swingType) - levels);
  return SWING_ORDER[Math.max(0, idx)];
}
function computeSwingPrep(contactSpace, player, ball) {
  const attrs = player.attrs ?? {};
  const stamina = player.stamina ?? 1;
  const baseSwing = PREP_WINDOW_TO_SWING[contactSpace.prepWindowClass] ?? "BLOCKED";
  const offsetLevels = OFFSET_SWING_DOWNGRADE[contactSpace.offsetZone] ?? 0;
  const halfVolley = player._halfVolleyContext ?? false;
  const emergencyVolley = player._volleyType === "emergency";
  const swingType = halfVolley || emergencyVolley ? "REFLEX" : downgradeSwing(baseSwing, offsetLevels);
  const leituraAttr = attrs.leitura ?? 50;
  const prepTimeBase = contactSpace.prepSwingMult;
  const leituraBonus = (leituraAttr - 50) / 100 * 0.16;
  const prepTimeFactor = clamp2(prepTimeBase + leituraBonus, 0.35, 1);
  const swingCompletionFactor = SWING_TYPES[swingType]?.completionFactor ?? 0.45;
  const lateralVel = Math.abs(player.vel?.x ?? 0);
  const velAttr = attrs.velocidade ?? 50;
  const velBonusMod = 0.85 + velAttr / 100 * 0.13;
  const balancePenalty = clamp2(lateralVel * 0.05 * velBonusMod, 0, 0.3);
  const balanceFactor = clamp2(1 - balancePenalty, 0.7, 1);
  const explosAttr = attrs.explosividade ?? 50;
  const footworkBase = {
    IDEAL: 1,
    REACHABLE: 0.93,
    STRETCH: 0.78,
    EXTREME: 0.62
  }[contactSpace.offsetZone] ?? 0.62;
  const explosBonus = (explosAttr - 50) / 100 * 0.1;
  const footworkFactor = clamp2(footworkBase + explosBonus, 0.55, 1);
  const fatigueMod = 0.85 + Math.pow(stamina, 0.6) * 0.15;
  const prepQuality = clamp2(
    prepTimeFactor * swingCompletionFactor * balanceFactor * footworkFactor * fatigueMod,
    0.2,
    1
  );
  return {
    swingType,
    prepQuality,
    // sub-fatores (para debug/trace)
    prepTimeFactor,
    swingCompletionFactor,
    balanceFactor,
    footworkFactor,
    fatigueMod
  };
}

// src/feasibilityMatrix.js
var SWING_LEVEL = { REFLEX: 0, BLOCKED: 1, COMPACT: 2, FULL: 3 };
var OFFSET_LEVEL = { IDEAL: 0, REACHABLE: 1, STRETCH: 2, EXTREME: 3 };
var SHOT_RULES = {
  // ── Groundstrokes básicos ────────────────────────────────────────────────
  NORMAL: {
    // Golpe de rally neutro — o mais comum do jogo. Permissivo por design.
    heightsAllowed: ["DIRT", "ANKLE", "HIP", "SWEET", "SHOULDER", "HIGH"],
    swingMinLevel: 0,
    // REFLEX — até em emergência se bate NORMAL
    offsetMaxLevel: 3,
    // EXTREME
    globalMaxQ: 1,
    heightQMap: { DIRT: 0.55, ANKLE: 0.72, HIP: 0.88, SWEET: 1, SHOULDER: 0.85, HIGH: 0.65 }
  },
  NORMAL: {
    // Golpe base — absorve papel do antigo SAFE (sempre executável) e NORMAL
    heightsAllowed: ["DIRT", "ANKLE", "HIP", "SWEET", "SHOULDER", "HIGH", "OVERHEAD"],
    swingMinLevel: 0,
    // REFLEX
    offsetMaxLevel: 3,
    // EXTREME
    globalMaxQ: 0.92,
    heightQMap: { DIRT: 0.58, ANKLE: 0.72, HIP: 0.86, SWEET: 0.92, SHOULDER: 0.82, HIGH: 0.68, OVERHEAD: 0.52 }
  },
  SHORT: {
    // Reset curto — exige algum controle mas é golpe defensivo
    heightsAllowed: ["ANKLE", "HIP", "SWEET", "SHOULDER"],
    swingMinLevel: 0,
    // REFLEX
    offsetMaxLevel: 2,
    // STRETCH
    globalMaxQ: 0.88,
    heightQMap: { ANKLE: 0.68, HIP: 0.82, SWEET: 0.88, SHOULDER: 0.75 }
  },
  FLAT: {
    heightsAllowed: ["HIP", "SWEET", "SHOULDER", "HIGH"],
    swingMinLevel: 2,
    // COMPACT
    offsetMaxLevel: 1,
    // REACHABLE
    globalMaxQ: 0.96,
    heightQMap: { HIP: 0.78, SWEET: 0.96, SHOULDER: 0.88, HIGH: 0.7 }
  },
  TOPSPIN: {
    heightsAllowed: ["DIRT", "ANKLE", "HIP", "SWEET", "SHOULDER"],
    swingMinLevel: 0,
    // REFLEX — topspin defensivo de emergência é padrão ATP (Murray, Djokovic, Alcaraz)
    offsetMaxLevel: 2,
    // STRETCH
    globalMaxQ: 1,
    heightQMap: { DIRT: 0.45, ANKLE: 0.72, HIP: 0.88, SWEET: 1, SHOULDER: 0.85 }
  },
  HEAVY_TOP: {
    heightsAllowed: ["HIP", "SWEET", "SHOULDER"],
    swingMinLevel: 3,
    // FULL — backswing + rotação completa obrigatórios
    offsetMaxLevel: 1,
    // REACHABLE
    globalMaxQ: 1,
    heightQMap: { HIP: 0.75, SWEET: 1, SHOULDER: 0.82 }
  },
  SLICE: {
    heightsAllowed: ["DIRT", "ANKLE", "HIP", "SWEET"],
    swingMinLevel: 0,
    // REFLEX — chip defensivo funciona mesmo em emergência
    offsetMaxLevel: 2,
    // STRETCH
    globalMaxQ: 0.92,
    heightQMap: { DIRT: 0.68, ANKLE: 0.88, HIP: 0.9, SWEET: 0.92 }
  },
  DROP: {
    // Drop shot — zona ideal HIP/SWEET mas ANKLE possível com penalidade
    heightsAllowed: ["ANKLE", "HIP", "SWEET"],
    swingMinLevel: 2,
    // COMPACT — Nadal faz drop de qualquer zona
    offsetMaxLevel: 1,
    // REACHABLE
    globalMaxQ: 0.85,
    heightQMap: { ANKLE: 0.55, HIP: 0.72, SWEET: 0.85 }
  },
  BANANA: {
    heightsAllowed: ["HIP", "SWEET", "SHOULDER"],
    swingMinLevel: 3,
    // FULL — geração de spin lateral exige rotação completa
    offsetMaxLevel: 1,
    // REACHABLE
    globalMaxQ: 0.88,
    heightQMap: { HIP: 0.72, SWEET: 0.88, SHOULDER: 0.8 }
  },
  ACCEL: {
    // Drive agressivo. ANKLE permite ataque com bolas mais baixas (ATP moderno).
    heightsAllowed: ["ANKLE", "HIP", "SWEET", "SHOULDER"],
    swingMinLevel: 1,
    // BLOCKED — Federer, Djokovic atacam de bolas baixas rotineiramente
    offsetMaxLevel: 1,
    // REACHABLE — offset extremo não gera potência
    globalMaxQ: 1,
    heightQMap: { ANKLE: 0.6, HIP: 0.8, SWEET: 1, SHOULDER: 0.88 }
  },
  SHORT_ACCEL: {
    // Ângulo curto — requer controle. ANKLE permitido com penalidade.
    heightsAllowed: ["ANKLE", "HIP", "SWEET", "SHOULDER"],
    swingMinLevel: 1,
    // BLOCKED
    offsetMaxLevel: 1,
    // REACHABLE
    globalMaxQ: 0.95,
    heightQMap: { ANKLE: 0.55, HIP: 0.78, SWEET: 0.95, SHOULDER: 0.84 }
  },
  HALF_VOLLEY: {
    heightsAllowed: ["DIRT", "ANKLE"],
    swingMinLevel: 0,
    // REFLEX — é uma reação pura pós-quique
    offsetMaxLevel: 2,
    // STRETCH
    globalMaxQ: 0.7,
    heightQMap: { DIRT: 0.52, ANKLE: 0.7 }
  },
  VOLLEY: {
    heightsAllowed: ["ANKLE", "HIP", "SWEET", "SHOULDER", "HIGH"],
    swingMinLevel: 1,
    // BLOCKED — punch/block sem backswing
    offsetMaxLevel: 1,
    // REACHABLE
    globalMaxQ: 0.95,
    heightQMap: { ANKLE: 0.72, HIP: 0.85, SWEET: 0.95, SHOULDER: 0.9, HIGH: 0.78 }
  },
  SMASH: {
    heightsAllowed: ["HIGH", "OVERHEAD"],
    swingMinLevel: 2,
    // COMPACT — rotação de ombros + ritmo
    offsetMaxLevel: 1,
    // REACHABLE
    globalMaxQ: 1,
    heightQMap: { HIGH: 0.9, OVERHEAD: 1 }
  },
  PASSING: {
    heightsAllowed: ["HIP", "SWEET", "SHOULDER"],
    swingMinLevel: 2,
    // COMPACT
    offsetMaxLevel: 2,
    // STRETCH — passing às vezes vem de bola lateral
    globalMaxQ: 0.92,
    heightQMap: { HIP: 0.8, SWEET: 0.92, SHOULDER: 0.82 }
  },
  SHORT_ANGLE: {
    heightsAllowed: ["SWEET", "SHOULDER"],
    swingMinLevel: 3,
    // FULL — ângulo extremo exige swing completo
    offsetMaxLevel: 1,
    // REACHABLE
    globalMaxQ: 0.88,
    heightQMap: { SWEET: 0.88, SHOULDER: 0.78 }
  },
  // ── Lobs — nomes reais do sistema ────────────────────────────────────────
  AGG_LOB: {
    heightsAllowed: ["SWEET", "SHOULDER"],
    swingMinLevel: 2,
    // COMPACT
    offsetMaxLevel: 1,
    // REACHABLE
    globalMaxQ: 0.82,
    heightQMap: { SWEET: 0.82, SHOULDER: 0.72 }
  },
  DEF_LOB: {
    heightsAllowed: ["ANKLE", "HIP", "SWEET"],
    swingMinLevel: 0,
    // REFLEX — defensivo de emergência
    offsetMaxLevel: 2,
    // STRETCH
    globalMaxQ: 0.75,
    heightQMap: { ANKLE: 0.62, HIP: 0.72, SWEET: 0.75 }
  },
  // LOB — nome real usado pelo pool de golpes (AGG_LOB/DEF_LOB são legados)
  LOB: {
    heightsAllowed: ["DIRT", "ANKLE", "HIP", "SWEET", "SHOULDER"],
    swingMinLevel: 0,
    // REFLEX — lob defensivo funciona de emergência
    offsetMaxLevel: 3,
    // EXTREME
    globalMaxQ: 0.82,
    heightQMap: { DIRT: 0.55, ANKLE: 0.65, HIP: 0.75, SWEET: 0.82, SHOULDER: 0.72 }
  },
  // Legacy aliases — nunca gerados pelo sistema atual mas mantidos por segurança
  LOB_ATK: {
    heightsAllowed: ["SWEET", "SHOULDER"],
    swingMinLevel: 2,
    offsetMaxLevel: 1,
    globalMaxQ: 0.82,
    heightQMap: { SWEET: 0.82, SHOULDER: 0.72 }
  },
  LOB_DEF: {
    heightsAllowed: ["ANKLE", "HIP", "SWEET"],
    swingMinLevel: 0,
    offsetMaxLevel: 2,
    globalMaxQ: 0.75,
    heightQMap: { ANKLE: 0.62, HIP: 0.72, SWEET: 0.75 }
  }
};
function buildFeasibilityMatrix(heightZone, offsetZone, swingType) {
  const currentSwingLevel = SWING_LEVEL[swingType] ?? 0;
  const currentOffsetLevel = OFFSET_LEVEL[offsetZone] ?? 3;
  const offsetQMult = OFFSET_Q_MULT[offsetZone] ?? 0.5;
  const data = {};
  for (const [shotType, rule] of Object.entries(SHOT_RULES)) {
    const heightOk = rule.heightsAllowed.includes(heightZone);
    const swingOk = currentSwingLevel >= rule.swingMinLevel;
    const offsetOk = currentOffsetLevel <= rule.offsetMaxLevel;
    const feasible = heightOk && swingOk && offsetOk;
    if (!feasible) {
      data[shotType] = { feasible: false, maxQuality: 0 };
      continue;
    }
    const heightQ = rule.heightQMap[heightZone] ?? 0;
    const maxQ = Math.min(rule.globalMaxQ, heightQ * offsetQMult);
    data[shotType] = { feasible: true, maxQuality: clamp2(maxQ, 0, 1) };
  }
  return {
    /**
     * Retorna true se o shot é fisicamente viável no contexto atual.
     * @param {string} shotType
     */
    isViable: (shotType) => data[shotType]?.feasible ?? true,
    // desconhecido = permitido
    /**
     * Retorna o teto máximo de qualidade para o shot neste contexto.
     * Retorna 0 se o shot não for viável.
     * @param {string} shotType
     */
    getMaxQuality: (shotType) => data[shotType]?.maxQuality ?? 0,
    /**
     * Retorna array com todos os shot types viáveis.
     */
    getViableShots: () => Object.keys(data).filter((k) => data[k].feasible),
    /** Dados completos para debug/trace. */
    _data: data,
    heightZone,
    offsetZone,
    swingType
  };
}

// src/sound.js
var ctx = null;
var soundOn = false;
var crowdGain = null;
var crowdNode = null;
var crowdLevel = 0;
var lastHitMs = 0;
var lastBounceMs = 0;
var customBuffers = {};
var DEFAULT_SETTINGS = {
  masterVolume: 0.85,
  hitVolume: 0.8,
  crowdVolume: 0.6,
  eventsVolume: 0.9,
  narratorVolume: 0.8,
  narratorEnabled: true,
  hitsEnabled: true,
  crowdEnabled: true,
  eventsEnabled: true,
  narratorLang: "pt-BR",
  narratorRate: 1.05,
  narratorPitch: 0.95
};
var settings = { ...DEFAULT_SETTINGS };
function loadSettings() {
  try {
    const raw = localStorage.getItem("hv_sound_settings");
    if (raw)
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (_) {
  }
}
loadSettings();
var DB_NAME = "hv_sounds";
var DB_STORE = "sounds";
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(DB_STORE, { keyPath: "type" });
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}
async function dbGet(type) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const req = tx.objectStore(DB_STORE).get(type);
    req.onsuccess = (e) => resolve(e.target.result?.data ?? null);
    req.onerror = (e) => reject(e.target.error);
  });
}
async function dbListKeys() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const req = tx.objectStore(DB_STORE).getAllKeys();
    req.onsuccess = (e) => resolve(e.target.result ?? []);
    req.onerror = (e) => reject(e.target.error);
  });
}
async function loadCustomBuffers() {
  if (!ctx)
    return;
  try {
    const keys = await dbListKeys();
    for (const type of keys) {
      const buf = await dbGet(type);
      if (buf) {
        try {
          customBuffers[type] = await ctx.decodeAudioData(buf.slice(0));
        } catch (_) {
        }
      }
    }
  } catch (_) {
  }
}
function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    buildCrowd();
    loadCustomBuffers();
  }
  return ctx;
}
function buildCrowd() {
  const ac = ctx;
  const len = ac.sampleRate * 3;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++)
    d[i] = (Math.random() * 2 - 1) * 0.55;
  const bp1 = ac.createBiquadFilter();
  bp1.type = "bandpass";
  bp1.frequency.value = 380;
  bp1.Q.value = 0.55;
  const bp2 = ac.createBiquadFilter();
  bp2.type = "bandpass";
  bp2.frequency.value = 210;
  bp2.Q.value = 0.4;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -22;
  comp.ratio.value = 5;
  crowdGain = ac.createGain();
  crowdGain.gain.value = 0;
  crowdNode = ac.createBufferSource();
  crowdNode.buffer = buf;
  crowdNode.loop = true;
  crowdNode.connect(bp1);
  bp1.connect(bp2);
  bp2.connect(crowdGain);
  crowdGain.connect(comp);
  comp.connect(ac.destination);
  crowdNode.start();
}
var _crowdCustomGain = null;
function masterGainVal(category) {
  const m = settings.masterVolume;
  if (category === "hit")
    return settings.hitsEnabled ? m * settings.hitVolume : 0;
  if (category === "crowd")
    return settings.crowdEnabled ? m * settings.crowdVolume : 0;
  if (category === "event")
    return settings.eventsEnabled ? m * settings.eventsVolume : 0;
  return m;
}
function tone(freq, dur, gain = 0.25, type = "sine", startTime = 0, category = "event") {
  const vol = masterGainVal(category);
  if (vol === 0)
    return;
  const ac = getCtx();
  const t = ac.currentTime + startTime;
  const osc2 = ac.createOscillator();
  const env = ac.createGain();
  osc2.type = type;
  osc2.frequency.value = freq;
  env.gain.setValueAtTime(1e-3, t);
  env.gain.exponentialRampToValueAtTime(gain * vol, t + 5e-3);
  env.gain.exponentialRampToValueAtTime(1e-3, t + dur);
  osc2.connect(env);
  env.connect(ac.destination);
  osc2.start(t);
  osc2.stop(t + dur + 0.01);
}
function noise(dur, gain = 0.12, filterFreq = 600, startTime = 0, category = "event") {
  const vol = masterGainVal(category);
  if (vol === 0)
    return;
  const ac = getCtx();
  const t = ac.currentTime + startTime;
  const len = Math.ceil(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++)
    d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const flt = ac.createBiquadFilter();
  flt.type = "bandpass";
  flt.frequency.value = filterFreq;
  flt.Q.value = 1.2;
  const env = ac.createGain();
  env.gain.setValueAtTime(1e-3, t);
  env.gain.exponentialRampToValueAtTime(gain * vol, t + 3e-3);
  env.gain.exponentialRampToValueAtTime(1e-3, t + dur);
  src.connect(flt);
  flt.connect(env);
  env.connect(ac.destination);
  src.start(t);
  src.stop(t + dur + 0.01);
}
function playBuffer(buf, gain = 1) {
  if (!buf || !ctx)
    return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const env = ctx.createGain();
  env.gain.value = gain * settings.masterVolume;
  src.connect(env);
  env.connect(ctx.destination);
  src.start();
}
function setCrowdLevel(level) {
  crowdLevel = Math.max(0, Math.min(1, level));
  if (!soundOn || !settings.crowdEnabled)
    return;
  if (customBuffers["CROWD_LOOP"] && _crowdCustomGain && ctx) {
    const t = crowdLevel * settings.crowdVolume * settings.masterVolume * 0.9;
    _crowdCustomGain.gain.linearRampToValueAtTime(Math.max(1e-3, t), ctx.currentTime + 0.8);
    if (crowdGain)
      crowdGain.gain.linearRampToValueAtTime(1e-3, ctx.currentTime + 0.4);
    return;
  }
  if (crowdGain && ctx) {
    const t = crowdLevel * settings.crowdVolume * settings.masterVolume * 0.22;
    crowdGain.gain.linearRampToValueAtTime(Math.max(1e-3, t), ctx.currentTime + 0.8);
  }
}
function crowdReact(intensity = 0.5) {
  if (!soundOn || !settings.crowdEnabled)
    return;
  const ac = getCtx();
  if (customBuffers["CROWD_LOOP"] && _crowdCustomGain) {
    const base2 = crowdLevel * settings.crowdVolume * settings.masterVolume * 0.9;
    const peak2 = Math.min(1, base2 + intensity * 0.5);
    _crowdCustomGain.gain.cancelScheduledValues(ac.currentTime);
    _crowdCustomGain.gain.setValueAtTime(base2, ac.currentTime);
    _crowdCustomGain.gain.linearRampToValueAtTime(peak2, ac.currentTime + 0.08);
    _crowdCustomGain.gain.exponentialRampToValueAtTime(Math.max(1e-3, base2), ac.currentTime + 2);
    return;
  }
  if (!crowdGain)
    return;
  const g = crowdGain.gain;
  const base = crowdLevel * settings.crowdVolume * settings.masterVolume * 0.22;
  const peak = Math.min(0.38, base + intensity * 0.28 * settings.masterVolume);
  g.cancelScheduledValues(ac.currentTime);
  g.setValueAtTime(base, ac.currentTime);
  g.linearRampToValueAtTime(peak, ac.currentTime + 0.08);
  g.exponentialRampToValueAtTime(Math.max(1e-3, base), ac.currentTime + 1.8);
}
var SCORE_PT = ["zero", "quinze", "trinta", "quarenta", "vantagem"];
var _narratorQueue = [];
var _narratorBusy = false;
var _lastNarrateMs = 0;
function flushNarrator() {
  if (_narratorBusy || _narratorQueue.length === 0)
    return;
  if (!("speechSynthesis" in window))
    return;
  const text = _narratorQueue.shift();
  _narratorBusy = true;
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = settings.narratorLang;
  utt.rate = settings.narratorRate;
  utt.pitch = settings.narratorPitch;
  utt.volume = settings.narratorVolume * settings.masterVolume;
  const voices = window.speechSynthesis.getVoices();
  const match = voices.find((v) => v.lang.startsWith(settings.narratorLang.split("-")[0]));
  if (match)
    utt.voice = match;
  utt.onend = () => {
    _narratorBusy = false;
    setTimeout(flushNarrator, 120);
  };
  utt.onerror = () => {
    _narratorBusy = false;
    setTimeout(flushNarrator, 120);
  };
  window.speechSynthesis.speak(utt);
}
function narrate(text) {
  if (!soundOn || !settings.narratorEnabled)
    return;
  if (!("speechSynthesis" in window))
    return;
  const now = performance.now();
  if (now - _lastNarrateMs < 350)
    return;
  _lastNarrateMs = now;
  if (_narratorQueue.length >= 2)
    _narratorQueue = _narratorQueue.slice(-1);
  _narratorQueue.push(text);
  flushNarrator();
}
function announceScore(gs, winnerIdx, event) {
  if (!soundOn || !settings.narratorEnabled)
    return;
  const p0 = gs.players[0], p1 = gs.players[1];
  const w = gs.players[winnerIdx];
  switch (event) {
    case "ACE":
      narrate(`Ace de ${w.name}!`);
      break;
    case "DOUBLE_FAULT":
      narrate(`Dupla falta`);
      break;
    case "MATCH":
      narrate(`Partida! Vence ${w.name}!`);
      break;
    case "GAME":
      narrate(`Game ${w.name}. ${p0.games} a ${p1.games}`);
      break;
    case "SET":
      narrate(`Set ${w.name}! ${p0.sets} a ${p1.sets} nos sets`);
      break;
    case "POINT": {
      if (gs.inTiebreak) {
        narrate(`${gs.tbScore[0]} a ${gs.tbScore[1]}`);
      } else if (p0.score === 3 && p1.score === 3) {
        narrate("Deuce");
      } else if (p0.score === 4) {
        narrate(`Vantagem ${p0.name}`);
      } else if (p1.score === 4) {
        narrate(`Vantagem ${p1.name}`);
      } else {
        const sS = SCORE_PT[gs.players[gs.server].score] ?? "";
        const rS = SCORE_PT[gs.players[gs.receiver].score] ?? "";
        if (gs.players[gs.server].score === gs.players[gs.receiver].score) {
          narrate(`${sS} igual`);
        } else {
          narrate(`${sS} a ${rS}`);
        }
      }
      break;
    }
    default:
      break;
  }
}
function playSound(type, meta = {}) {
  if (!soundOn)
    return;
  try {
    _play(type, meta);
  } catch (_) {
  }
}
function _crowdReactionForType(type) {
  const map = { ACE: 0.92, WINNER: 0.6, NET: 0.22, OUT: 0.22, DOUBLE_FAULT: 0.32, GAME: 0.72, SET: 1 };
  if (map[type] !== void 0)
    crowdReact(map[type]);
  if (type === "SET")
    setTimeout(() => {
      if (soundOn)
        crowdReact(0.82);
    }, 600);
  if (type === "GAME" || type === "SET")
    setTimeout(() => {
      if (soundOn)
        setCrowdLevel(0);
    }, type === "SET" ? 4200 : 2200);
}
function _play(type, meta = {}) {
  const now = performance.now();
  if (customBuffers[type]) {
    const cat = type === "HIT" || type === "BOUNCE" || type === "MISHIT" ? "hit" : "event";
    const vol = masterGainVal(cat);
    if (vol > 0)
      playBuffer(customBuffers[type], vol);
    _crowdReactionForType(type);
    return;
  }
  switch (type) {
    case "HIT": {
      if (now - lastHitMs < 75)
        return;
      lastHitMs = now;
      const freq = 280 + (meta.speed ?? 120) / 220 * 500;
      tone(freq, 0.055, 0.18, "triangle", 0, "hit");
      noise(0.032, 0.06, freq * 2.2, 0, "hit");
      break;
    }
    case "MISHIT": {
      if (now - lastHitMs < 75)
        return;
      lastHitMs = now;
      const mf = 115 + (meta.speed ?? 80) / 220 * 180;
      tone(mf, 0.04, 0.22, "sawtooth", 0, "hit");
      tone(mf * 1.38, 0.025, 0.12, "square", 0, "hit");
      noise(0.065, 0.09, mf * 1.8, 0, "hit");
      break;
    }
    case "BOUNCE": {
      if (now - lastBounceMs < 55)
        return;
      lastBounceMs = now;
      tone(108, 0.072, 0.14, "sine", 0, "hit");
      noise(0.06, 0.08, 178, 0, "hit");
      break;
    }
    case "NET": {
      tone(88, 0.09, 0.16, "sine");
      noise(0.08, 0.1, 148);
      crowdReact(0.22);
      break;
    }
    case "OUT": {
      tone(525, 0.06, 0.14, "square");
      tone(492, 0.06, 0.08, "square");
      crowdReact(0.22);
      break;
    }
    case "WINNER": {
      tone(440, 0.12, 0.22, "sine");
      tone(660, 0.2, 0.26, "sine", 0.1);
      crowdReact(0.6);
      break;
    }
    case "ACE": {
      tone(330, 0.1, 0.22, "sine");
      tone(440, 0.1, 0.24, "sine", 0.09);
      tone(550, 0.1, 0.26, "sine", 0.18);
      tone(660, 0.22, 0.3, "sine", 0.27);
      tone(880, 0.18, 0.18, "triangle", 0.3);
      crowdReact(0.92);
      break;
    }
    case "DOUBLE_FAULT": {
      tone(278, 0.14, 0.18, "sawtooth");
      tone(198, 0.18, 0.16, "sawtooth", 0.14);
      crowdReact(0.32);
      break;
    }
    case "GAME": {
      tone(392, 0.1, 0.2, "sine");
      tone(494, 0.1, 0.22, "sine", 0.09);
      tone(587, 0.25, 0.28, "sine", 0.18);
      tone(740, 0.2, 0.14, "triangle", 0.2);
      crowdReact(0.72);
      setTimeout(() => {
        if (soundOn)
          setCrowdLevel(0);
      }, 2200);
      break;
    }
    case "SET": {
      tone(262, 0.1, 0.22, "sine");
      tone(330, 0.1, 0.24, "sine", 0.08);
      tone(392, 0.1, 0.26, "sine", 0.16);
      tone(494, 0.1, 0.28, "sine", 0.24);
      tone(587, 0.35, 0.34, "sine", 0.32);
      tone(784, 0.3, 0.18, "triangle", 0.34);
      tone(523, 0.3, 0.16, "triangle", 0.34);
      crowdReact(1);
      setTimeout(() => {
        if (soundOn)
          crowdReact(0.82);
      }, 600);
      setTimeout(() => {
        if (soundOn)
          setCrowdLevel(0);
      }, 4200);
      break;
    }
    default:
      break;
  }
}

// src/PlayerTraits.js
var RAW_DNA = {
  // ── TIER 1 — LENDA (DNA 78–89) ──────────────────────────────────
  NAKAMURA: {
    score: 88,
    slots: [
      { tier: "RAR", traitId: "ALL_SURFACE" },
      // sem fraqueza em nenhuma quadra
      { tier: "RAR", traitId: "DECISIVO" },
      // clutch player absoluto
      { tier: "COM", traitId: "MAQUINA" },
      // sem emoção, sem vacilo
      { tier: "COM", traitId: "PRECISAO_CIRURGICA" },
      // srv1Prec 90
      { tier: "COM", traitId: "INQUEBRAVEL" }
      // mentalidade 88
    ]
  },
  BJORNSTAD: {
    score: 84,
    slots: [
      { tier: "RAR", traitId: "QUINTO_SET" },
      // ganhou Wimbledon em 5 sets
      { tier: "RAR", traitId: "ESPECIALISTA_BO5" },
      // 2 Slams, BO5 é seu elemento
      { tier: "COM", traitId: "ALL_SURFACE" },
      // sólido em tudo
      { tier: "COM", traitId: "GUERREIRO" },
      // luta cada ponto
      { tier: "COM", traitId: "DECISIVO" }
      // mentalidade 85
    ]
  },
  AJUBA: {
    score: 82,
    slots: [
      { tier: "RAR", traitId: "CANHAO_SAQUE" },
      // serve 99
      { tier: "RAR", traitId: "DESTRUIDOR_MORAL" },
      // Thunder, intimidação pura
      { tier: "COM", traitId: "MAGO_GRAMA" },
      // big server na grama
      { tier: "COM", traitId: "SANGUE_QUENTE" },
      // emocional, focado
      { tier: "COM", traitId: "PICO_ADRENALINA" },
      // explosão no início
      { tier: "NEG", traitId: "DECISIVO" }
      // mentalidade 69 — choca em pontos decisivos
    ]
  },
  OSEI: {
    score: 80,
    slots: [
      { tier: "RAR", traitId: "FH_ASSASSINO" },
      // fh 97 — arma mais temida
      { tier: "RAR", traitId: "SUPERPRODIGIO" },
      // 21 anos, 1 Slam e 4 Masters
      { tier: "COM", traitId: "BOLA_PESADA" },
      // impacto de peso
      { tier: "COM", traitId: "SANGUE_QUENTE" },
      // volatile development style
      { tier: "COM", traitId: "PICO_ADRENALINA" },
      // explosividade 96
      { tier: "NEG", traitId: "DECISIVO" }
      // mentalidade 62 — amadurecendo
    ]
  },
  DALMAU: {
    score: 79,
    slots: [
      { tier: "RAR", traitId: "FH_ASSASSINO" },
      // talento bruto
      { tier: "RAR", traitId: "SUPERPRODIGIO" },
      // LENDA jovem
      { tier: "COM", traitId: "SANGUE_QUENTE" },
      // instável
      { tier: "NEG", traitId: "DECISIVO" },
      // mentalidade 63
      { tier: "NEG", traitId: "MP_SAVER" }
      // paralisa em momentos críticos
    ]
  },
  BRENNAN_USA: {
    score: 79,
    slots: [
      { tier: "RAR", traitId: "CANHAO_SAQUE" },
      // serve 96
      { tier: "RAR", traitId: "HARDCOURT_NATIVO" },
      // americano, nasceu no hard
      { tier: "COM", traitId: "DESTRUIDOR_MORAL" },
      // aggressivo
      { tier: "COM", traitId: "INQUEBRAVEL" },
      // mentalidade 84
      { tier: "NEG", traitId: "REI_SAIBRO" }
      // detest clay
    ]
  },
  PORTER_USA: {
    score: 79,
    slots: [
      { tier: "RAR", traitId: "CANHAO_SAQUE" },
      // serve 92
      { tier: "RAR", traitId: "HARDCOURT_NATIVO" },
      // LENDA americana
      { tier: "COM", traitId: "GUERREIRO" },
      { tier: "COM", traitId: "AVALANCHE" },
      // fecha sets sem parar
      { tier: "NEG", traitId: "REI_SAIBRO" }
    ]
  },
  BLACKWOOD_USA: {
    score: 78,
    slots: [
      { tier: "RAR", traitId: "CANHAO_SAQUE" },
      // serve 88
      { tier: "RAR", traitId: "HARDCOURT_NATIVO" },
      { tier: "COM", traitId: "PICO_ADRENALINA" },
      { tier: "NEG", traitId: "REI_SAIBRO" },
      { tier: "NEG", traitId: "DECISIVO" }
      // mentalidade 60
    ]
  },
  QIN_HAOTIAN: {
    score: 78,
    slots: [
      { tier: "RAR", traitId: "FH_ASSASSINO" },
      // fh 78 e crescendo
      { tier: "RAR", traitId: "SUPERPRODIGIO" },
      // LENDA jovem chinesa
      { tier: "COM", traitId: "SANGUE_QUENTE" },
      { tier: "NEG", traitId: "DECISIVO" },
      // mentalidade 68
      { tier: "NEG", traitId: "MP_SAVER" }
    ]
  },
  // ── TIER 2 — ELITE PRINCIPAL (DNA 65–77) ────────────────────────
  VANTORINI: {
    score: 72,
    slots: [
      { tier: "RAR", traitId: "REI_SAIBRO" },
      // Roland d'Occitane 2023
      { tier: "COM", traitId: "FH_ASSASSINO" },
      // fh 94, topspin 97
      { tier: "COM", traitId: "GUERREIRO" },
      // garra italiana
      { tier: "NEG", traitId: "MAGO_GRAMA" }
      // hard court era fraqueza histórica
    ]
  },
  CHEN_WEI: {
    score: 70,
    slots: [
      { tier: "RAR", traitId: "RETRIEVER_ETERNO" },
      // the Great Wall
      { tier: "COM", traitId: "IRON_LEGS" },
      // resistencia 98
      { tier: "COM", traitId: "MAQUINA" },
      // sem emoção, só devolve
      { tier: "NEG", traitId: "EXPLOSAO_INICIAL" }
      // começa lento, aquece no rally
    ]
  },
  YAMAMOTO: {
    score: 72,
    slots: [
      { tier: "RAR", traitId: "INDOOR_SPEC" },
      // 2 Masters consecutivos indoor
      { tier: "COM", traitId: "MAGO_GRAMA" },
      // GRASS_WIZARD alcunha
      { tier: "COM", traitId: "PRECISAO_CIRURGICA" },
      // srv1Prec 92
      { tier: "NEG", traitId: "REI_SAIBRO" }
      // saibro é o antiestilo
    ]
  },
  MBEKI: {
    score: 68,
    slots: [
      { tier: "RAR", traitId: "CANHAO_SAQUE" },
      // serve 96
      { tier: "COM", traitId: "HARDCOURT_NATIVO" },
      // Cape Town hard court
      { tier: "NEG", traitId: "QUINTO_SET" }
      // sem Grand Slam, 5º set colapsa
    ]
  },
  FERRETTI: {
    score: 68,
    slots: [
      { tier: "RAR", traitId: "FH_ASSASSINO" },
      // fh 91
      { tier: "COM", traitId: "SUPERPRODIGIO" },
      // 23 anos, Masters campeão
      { tier: "NEG", traitId: "TIEBREAK_KILLER" }
      // perde regularidade sob pressão
    ]
  },
  OBRECHT: {
    score: 68,
    slots: [
      { tier: "RAR", traitId: "BASE_SOLIDA" },
      // consistencia 90, paciencia 97
      { tier: "COM", traitId: "ATRITO_RALLY" },
      // desgaste é sua arma
      { tier: "NEG", traitId: "EXPLOSAO_INICIAL" }
      // demora para criar ritmo
    ]
  },
  BERGLUND: {
    score: 68,
    slots: [
      { tier: "RAR", traitId: "ALL_SURFACE" },
      // 2 Masters em surfaces diferentes
      { tier: "COM", traitId: "BASE_SOLIDA" },
      // consistencia 85
      { tier: "COM", traitId: "GUERREIRO" }
    ]
  },
  MONTES_CHI: {
    score: 68,
    slots: [
      { tier: "RAR", traitId: "FH_ASSASSINO" },
      // fh 92
      { tier: "COM", traitId: "REI_SAIBRO" },
      // sul-americano de argila
      { tier: "COM", traitId: "GUERREIRO" },
      { tier: "NEG", traitId: "MAGO_GRAMA" }
    ]
  },
  HERRERA_ARG: {
    score: 68,
    slots: [
      { tier: "RAR", traitId: "REI_SAIBRO" },
      // argentino, saibro é casa
      { tier: "COM", traitId: "BASE_SOLIDA" },
      // consistencia 90, mentalidade 88
      { tier: "COM", traitId: "GUERREIRO" }
    ]
  },
  PETROV: {
    score: 68,
    slots: [
      { tier: "RAR", traitId: "BASE_SOLIDA" },
      // consistencia 86, paciencia 90
      { tier: "COM", traitId: "ATRITO_RALLY" },
      { tier: "COM", traitId: "BH_FERRO" }
      // bh 82
    ]
  },
  KONDRASHOV: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "FH_ASSASSINO" },
      // fh 88
      { tier: "COM", traitId: "HARDCOURT_NATIVO" },
      { tier: "NEG", traitId: "REI_SAIBRO" }
    ]
  },
  NZINGA: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "ALL_SURFACE" },
      // belga versátil
      { tier: "COM", traitId: "GUERREIRO" }
    ]
  },
  MORALES_ESP: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "REI_SAIBRO" },
      // espanhol — fh 93, clay blood
      { tier: "COM", traitId: "FH_ASSASSINO" },
      { tier: "NEG", traitId: "MAGO_GRAMA" }
    ]
  },
  ERIKSSON: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "BASE_SOLIDA" },
      // consistencia 86, paciencia 93
      { tier: "COM", traitId: "ATRITO_RALLY" }
    ]
  },
  FONTAINE: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "CANHAO_SAQUE" },
      // serve 89, SRV_VOL
      { tier: "COM", traitId: "INDOOR_SPEC" },
      { tier: "NEG", traitId: "REI_SAIBRO" }
    ]
  },
  DIALLO: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "FH_ASSASSINO" },
      // fh 88
      { tier: "COM", traitId: "HARDCOURT_NATIVO" }
    ]
  },
  MENSAH: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "ALL_SURFACE" },
      // ghanês, adaptado
      { tier: "COM", traitId: "HARDCOURT_NATIVO" }
    ]
  },
  KAMARA: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "FH_ASSASSINO" },
      // fh 82
      { tier: "COM", traitId: "HARDCOURT_NATIVO" }
    ]
  },
  HASSAN: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "ALL_SURFACE" },
      // egípcio, treinou em múltiplas
      { tier: "COM", traitId: "BASE_SOLIDA" }
    ]
  },
  ONYEKACHI: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "CANHAO_SAQUE" },
      // serve 88, BIG_SERVER
      { tier: "COM", traitId: "HARDCOURT_NATIVO" },
      { tier: "NEG", traitId: "REI_SAIBRO" }
    ]
  },
  MORRISON: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "FH_ASSASSINO" },
      // fh 88
      { tier: "COM", traitId: "HARDCOURT_NATIVO" }
    ]
  },
  DAVIDSON: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "CANHAO_SAQUE" },
      // serve 92
      { tier: "COM", traitId: "HARDCOURT_NATIVO" },
      { tier: "NEG", traitId: "REI_SAIBRO" }
    ]
  },
  THOMSON_AUS: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "CANHAO_SAQUE" },
      // serve 90
      { tier: "COM", traitId: "HARDCOURT_NATIVO" },
      { tier: "NEG", traitId: "REI_SAIBRO" }
    ]
  },
  O_BRIEN: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "INDOOR_SPEC" },
      // SRV_VOL indoor
      { tier: "COM", traitId: "MAGO_GRAMA" },
      { tier: "NEG", traitId: "REI_SAIBRO" }
    ]
  },
  CROFT: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "FH_ASSASSINO" },
      // fh 86
      { tier: "COM", traitId: "SANGUE_QUENTE" },
      { tier: "NEG", traitId: "TIEBREAK_KILLER" }
    ]
  },
  ALVAREZ_COL: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "FH_ASSASSINO" },
      // fh 90
      { tier: "COM", traitId: "HARDCOURT_NATIVO" }
    ]
  },
  VASQUEZ_MEX: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "FH_ASSASSINO" },
      // fh 90
      { tier: "COM", traitId: "BOLA_PESADA" }
    ]
  },
  RODRIGUEZ_COL: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "BASE_SOLIDA" },
      // consistencia 86, mentalidade 82
      { tier: "COM", traitId: "ATRITO_RALLY" }
    ]
  },
  WILSON_USA: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "ALL_SURFACE" },
      // all-court USA
      { tier: "COM", traitId: "INQUEBRAVEL" }
      // mentalidade 78
    ]
  },
  HENDERSON_CAN: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "ALL_SURFACE" },
      // canadense versátil
      { tier: "COM", traitId: "BASE_SOLIDA" }
    ]
  },
  GOMES_BRA: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "ALL_SURFACE" },
      { tier: "COM", traitId: "GUERREIRO" }
    ]
  },
  ZHANG_LEI: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "FH_ASSASSINO" },
      // fh 92, topspin 86
      { tier: "COM", traitId: "HARDCOURT_NATIVO" }
    ]
  },
  PARK_JUNHO: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "ALL_SURFACE" },
      // all-court coreano
      { tier: "COM", traitId: "INQUEBRAVEL" }
      // mentalidade 80
    ]
  },
  KIMURA: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "INDOOR_SPEC" },
      // SRV_VOL, indoor specialist
      { tier: "COM", traitId: "MAGO_GRAMA" },
      { tier: "NEG", traitId: "REI_SAIBRO" }
    ]
  },
  SHIN_HOJIN: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "FH_ASSASSINO" },
      // fh 86
      { tier: "COM", traitId: "HARDCOURT_NATIVO" }
    ]
  },
  NAKAMURA_H: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "ALL_SURFACE" },
      // all-court Nakamura
      { tier: "COM", traitId: "BASE_SOLIDA" }
    ]
  },
  INDO_RAHMAN: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "FH_ASSASSINO" },
      // fh 84
      { tier: "COM", traitId: "REI_SAIBRO" }
      // sul-asiático, clay blood
    ]
  },
  GU_MINGWEI: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "ALL_SURFACE" },
      // versátil chinês
      { tier: "COM", traitId: "SUPERPRODIGIO" }
      // jovem, crescendo
    ]
  },
  WU_TIANLONG: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "INDOOR_SPEC" },
      // SRV_VOL, indoor
      { tier: "COM", traitId: "CANHAO_SAQUE" },
      // serve 82
      { tier: "NEG", traitId: "REI_SAIBRO" }
    ]
  },
  KWON_MINSEOK: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "CANHAO_SAQUE" },
      // serve 86
      { tier: "NEG", traitId: "REI_SAIBRO" }
    ]
  },
  OUEDRAOGO: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "VOLATILIDADE_CALC" },
      // TAKEALLRISK
      { tier: "COM", traitId: "SANGUE_QUENTE" },
      { tier: "NEG", traitId: "DECISIVO" }
    ]
  },
  TSUKAMOTO: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "VOLATILIDADE_CALC" },
      // TAKEALLRISK
      { tier: "COM", traitId: "SANGUE_QUENTE" },
      { tier: "NEG", traitId: "DECISIVO" }
    ]
  },
  MORENO_MEX: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "VOLATILIDADE_CALC" },
      // TAKEALLRISK
      { tier: "COM", traitId: "SANGUE_QUENTE" },
      { tier: "NEG", traitId: "DECISIVO" }
    ]
  },
  VIDAL_CHI: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "RETRIEVER_ETERNO" },
      // RETRIEVER, res 86
      { tier: "COM", traitId: "IRON_LEGS" }
    ]
  },
  ANASTASIADIS: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "RETRIEVER_ETERNO" },
      // RETRIEVER, escola grega
      { tier: "COM", traitId: "ATRITO_RALLY" }
    ]
  },
  KOZLOWSKI: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "ALL_SURFACE" },
      // versátil polonês
      { tier: "COM", traitId: "INQUEBRAVEL" }
    ]
  },
  GUTTMANN: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "ALL_SURFACE" },
      { tier: "COM", traitId: "BASE_SOLIDA" }
    ]
  },
  WAGNER: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "ALL_SURFACE" },
      // suíço, versatilidade
      { tier: "COM", traitId: "BASE_SOLIDA" }
      // consistencia 87
    ]
  },
  BAKKE: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "ALL_SURFACE" },
      // norueguês versátil
      { tier: "COM", traitId: "GUERREIRO" }
    ]
  },
  HENRIKSEN: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "FH_ASSASSINO" },
      // fh 86
      { tier: "COM", traitId: "SANGUE_QUENTE" },
      // ataca desde o primeiro ball
      { tier: "NEG", traitId: "TIEBREAK_KILLER" }
      // perde consistência na reta final
    ]
  },
  RICHTER: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "CANHAO_SAQUE" },
      // serve 96, europeu
      { tier: "COM", traitId: "MAGO_GRAMA" },
      // grama + indoor
      { tier: "NEG", traitId: "REI_SAIBRO" }
    ]
  },
  MENDES_BRA: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "FH_ASSASSINO" },
      // fh 84
      { tier: "COM", traitId: "REI_SAIBRO" }
      // brasileiro, saibro
    ]
  },
  CHEN_USA: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "ALL_SURFACE" },
      { tier: "COM", traitId: "BASE_SOLIDA" }
    ]
  },
  JAMES_USA: {
    score: 65,
    slots: [
      { tier: "COM", traitId: "FH_ASSASSINO" },
      // fh 76
      { tier: "NEG", traitId: "DECISIVO" },
      // mentalidade 56
      { tier: "NEG", traitId: "TIEBREAK_KILLER" }
    ]
  },
  SVENSSON: {
    score: 65,
    slots: [
      { tier: "RAR", traitId: "ALL_SURFACE" },
      { tier: "COM", traitId: "BASE_SOLIDA" }
    ]
  },
  SAWATARI: {
    score: 65,
    slots: [
      { tier: "COM", traitId: "FH_ASSASSINO" },
      // fh 78
      { tier: "NEG", traitId: "DECISIVO" }
      // mentalidade 62
    ]
  },
  HASHIMOTO: {
    score: 65,
    slots: [
      { tier: "COM", traitId: "FH_ASSASSINO" },
      // fh 72
      { tier: "NEG", traitId: "TIEBREAK_KILLER" }
    ]
  },
  KIM_TAEHYUN: {
    score: 65,
    slots: [
      { tier: "COM", traitId: "ALL_SURFACE" },
      { tier: "COM", traitId: "GUERREIRO" }
    ]
  },
  ISHIDA: {
    score: 65,
    slots: [
      { tier: "COM", traitId: "ALL_SURFACE" },
      { tier: "COM", traitId: "BASE_SOLIDA" }
    ]
  },
  MARET: {
    score: 65,
    slots: [
      { tier: "COM", traitId: "RETRIEVER_ETERNO" },
      { tier: "COM", traitId: "BASE_SOLIDA" }
    ]
  },
  REID_NZ: {
    score: 65,
    slots: [
      { tier: "COM", traitId: "ALL_SURFACE" },
      { tier: "COM", traitId: "GUERREIRO" }
    ]
  },
  LINDSTR\u00D6M: {
    score: 68,
    slots: [
      { tier: "RAR", traitId: "SUPERPRODIGIO" },
      // 20 anos, já no circuito, explosão
      { tier: "COM", traitId: "ALL_SURFACE" },
      { tier: "NEG", traitId: "MP_SAVER" }
      // jovem, ainda trava em momentos grandes
    ]
  },
  DUBOIS: {
    score: 68,
    slots: [
      { tier: "RAR", traitId: "FH_ASSASSINO" },
      // fh 88
      { tier: "COM", traitId: "SUPERPRODIGIO" },
      // 22 anos, ATP 500 aos 21
      { tier: "NEG", traitId: "DECISIVO" }
    ]
  },
  // ── TIER 3 — CAMPEAO / VETERANOS (DNA 40–59) ────────────────────
  KASPERK: {
    score: 54,
    slots: [
      { tier: "COM", traitId: "RETRIEVER_ETERNO" },
      // 10 anos top 20 defendendo
      { tier: "COM", traitId: "ATRITO_RALLY" },
      // paciencia 96
      { tier: "NEG", traitId: "INSTINTO_SLAM" }
      // 3 finais de Slam, nunca ganhou
    ]
  },
  VOLKOV: {
    score: 56,
    slots: [
      { tier: "COM", traitId: "INDOOR_SPEC" },
      // 2 Masters Indoor
      { tier: "COM", traitId: "MAGO_GRAMA" },
      // SRV_VOL na grama
      { tier: "NEG", traitId: "REI_SAIBRO" }
    ]
  },
  CARDENAS: {
    score: 55,
    slots: [
      { tier: "COM", traitId: "REI_SAIBRO" },
      // 4 Masters no saibro
      { tier: "COM", traitId: "LATE_BLOOMER" },
      // late bloomer, pico aos 29
      { tier: "NEG", traitId: "MAGO_GRAMA" }
    ]
  },
  PETRAKIS: {
    score: 58,
    slots: [
      { tier: "COM", traitId: "RETRIEVER_ETERNO" },
      // parede grega
      { tier: "COM", traitId: "VETERANO_ETERNO" },
      // 31 anos, top 15 há 6 anos
      { tier: "NEG", traitId: "FH_ASSASSINO" }
      // fh 58 — buraco no jogo
    ]
  },
  KOVACS: {
    score: 55,
    slots: [
      { tier: "COM", traitId: "MEMORIA_FOTOGRAFICA" },
      // lê o adversário antes do jogo
      { tier: "COM", traitId: "VETERANO_ETERNO" },
      // 33 anos, Finals 2021
      { tier: "NEG", traitId: "RECUPERACAO_FISICA" }
      // corpo velho, recuperação lenta
    ]
  },
  REINHOLT: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "MAQUINA" },
      // alemão, zero emoção
      { tier: "COM", traitId: "VETERANO_ETERNO" },
      // 32 anos, mentor
      { tier: "NEG", traitId: "CANHAO_SAQUE" }
      // serve 70 — ponto fraco no saque
    ]
  },
  SOUZA: {
    score: 88,
    slots: [
      { tier: "LEN", traitId: "SUPERPRODIGIO" },
      // fenômeno geracional — +32% antes dos 21
      { tier: "RAR", traitId: "DIAMANTE_BRUTO" },
      // talento bruto ainda lapidando
      { tier: "COM", traitId: "SANGUE_QUENTE" },
      // emocional, instintivo
      { tier: "COM", traitId: "FH_ASSASSINO" }
      // forehand 96, arma principal
    ]
  },
  DELACROIX: {
    score: 70,
    slots: [
      { tier: "RAR", traitId: "VOLATILIDADE_CALC" },
      // genial e imprevisível
      { tier: "COM", traitId: "SANGUE_QUENTE" },
      // caótico, emocional
      { tier: "COM", traitId: "PICO_ADRENALINA" },
      // explosão no início
      { tier: "NEG", traitId: "INERCIAL" }
      // quando cai, cai fundo
    ]
  },
  MARCHETTI: {
    score: 55,
    slots: [
      { tier: "COM", traitId: "MEMORIA_FOTOGRAFICA" },
      // xadrez → leitura de jogo
      { tier: "COM", traitId: "ALL_SURFACE" }
    ]
  },
  PAPADIMITRIOU: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "RETRIEVER_ETERNO" },
      // discípulo de Petrakis
      { tier: "COM", traitId: "ATRITO_RALLY" }
      // paciencia 92
    ]
  },
  CASTILLO_MARCOS: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "REI_SAIBRO" },
      // 4 Masters de saibro, espanhol
      { tier: "COM", traitId: "ESPECIALISTA_KO" },
      // bom nas eliminatórias
      { tier: "NEG", traitId: "INSTINTO_SLAM" }
      // 4 semis de Roland, zero títulos
    ]
  },
  SAUVAGE: {
    score: 50,
    slots: [
      { tier: "COM", traitId: "VOLATILIDADE_CALC" },
      // TAKEALLRISK
      { tier: "NEG", traitId: "DECISIVO" }
      // mentalidade 57
    ]
  },
  MOREAU: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "RETRIEVER_ETERNO" },
      // paciencia 94
      { tier: "COM", traitId: "ATRITO_RALLY" }
    ]
  },
  HAAKONSEN: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "CANHAO_SAQUE" },
      // serve 94
      { tier: "NEG", traitId: "REI_SAIBRO" }
    ]
  },
  RODRIGUES_P: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "ATRITO_RALLY" },
      { tier: "COM", traitId: "RETRIEVER_ETERNO" }
      // paciencia 89
    ]
  },
  BIANCHI: {
    score: 50,
    slots: [
      { tier: "COM", traitId: "VOLATILIDADE_CALC" },
      // TAKEALLRISK italiano
      { tier: "NEG", traitId: "TIEBREAK_KILLER" }
    ]
  },
  LECHNER: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "INDOOR_SPEC" },
      // SRV_VOL austríaco
      { tier: "COM", traitId: "MAGO_GRAMA" },
      { tier: "NEG", traitId: "REI_SAIBRO" }
    ]
  },
  VANDENBERGHE: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "RETRIEVER_ETERNO" },
      // paciencia 86
      { tier: "COM", traitId: "ATRITO_RALLY" }
    ]
  },
  TESCHNER: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "BASE_SOLIDA" },
      // paciencia 87, consistente
      { tier: "COM", traitId: "ATRITO_RALLY" }
    ]
  },
  BLANCHARD: {
    score: 50,
    slots: [
      { tier: "COM", traitId: "VOLATILIDADE_CALC" },
      // TAKEALLRISK
      { tier: "COM", traitId: "SANGUE_QUENTE" },
      { tier: "NEG", traitId: "DECISIVO" }
    ]
  },
  CASTELLANO: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "BASE_SOLIDA" },
      // paciencia 88, espanhol
      { tier: "COM", traitId: "REI_SAIBRO" }
    ]
  },
  WEBER_HANS: {
    score: 50,
    slots: [
      { tier: "COM", traitId: "ALL_SURFACE" },
      // suíço, versátil
      { tier: "COM", traitId: "BASE_SOLIDA" }
    ]
  },
  AL_RASHID: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "CANHAO_SAQUE" },
      // serve 90
      { tier: "NEG", traitId: "REI_SAIBRO" }
    ]
  },
  TRAORE: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "RETRIEVER_ETERNO" },
      // paciencia 90
      { tier: "COM", traitId: "ATRITO_RALLY" }
    ]
  },
  NKOSI: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "BASE_SOLIDA" },
      // paciencia 86, RSA
      { tier: "COM", traitId: "ATRITO_RALLY" }
    ]
  },
  ABDI: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "RETRIEVER_ETERNO" },
      // paciencia 88
      { tier: "COM", traitId: "IRON_LEGS" }
      // resistencia 88
    ]
  },
  BEN_SAAD: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "FH_ASSASSINO" },
      // fh 84
      { tier: "COM", traitId: "REI_SAIBRO" },
      { tier: "NEG", traitId: "MAGO_GRAMA" }
    ]
  },
  IBRAHIM_MAR: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "REI_SAIBRO" },
      // marroquino, saibro
      { tier: "COM", traitId: "BASE_SOLIDA" }
    ]
  },
  FLETCHER: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "BASE_SOLIDA" },
      // CTR_PUNCHER australiano
      { tier: "COM", traitId: "ATRITO_RALLY" }
    ]
  },
  NGUYEN_AUS: {
    score: 65,
    slots: [
      { tier: "COM", traitId: "ALL_SURFACE" },
      { tier: "COM", traitId: "BASE_SOLIDA" }
    ]
  },
  HARRIS_NZ: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "BASE_SOLIDA" },
      // CTR_PUNCHER, paciencia 82
      { tier: "COM", traitId: "ATRITO_RALLY" }
    ]
  },
  SMITH_AUS: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "RETRIEVER_ETERNO" },
      // RETRIEVER, resistencia 94
      { tier: "COM", traitId: "IRON_LEGS" }
    ]
  },
  BAKER_AUS: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "ALL_SURFACE" },
      // ALL_COURT australiano
      { tier: "COM", traitId: "BASE_SOLIDA" }
    ]
  },
  PRICE_AUS: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "BASE_SOLIDA" },
      // CTR_PUNCHER
      { tier: "COM", traitId: "RETRIEVER_ETERNO" }
    ]
  },
  FERNANDEZ_ARG: {
    score: 50,
    slots: [
      { tier: "COM", traitId: "VOLATILIDADE_CALC" },
      // TAKEALLRISK
      { tier: "COM", traitId: "SANGUE_QUENTE" },
      { tier: "NEG", traitId: "DECISIVO" }
    ]
  },
  SANTOS_BRA: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "RETRIEVER_ETERNO" },
      // RETRIEVER, resistencia 90
      { tier: "COM", traitId: "IRON_LEGS" }
    ]
  },
  REYES_MEX: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "FH_ASSASSINO" },
      // fh 84
      { tier: "COM", traitId: "REI_SAIBRO" }
    ]
  },
  WEBB_USA: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "CANHAO_SAQUE" },
      // serve 88
      { tier: "NEG", traitId: "REI_SAIBRO" }
    ]
  },
  OLIVEIRA_BRA: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "INDOOR_SPEC" },
      // SRV_VOL brasileiro
      { tier: "NEG", traitId: "REI_SAIBRO" }
    ]
  },
  FUENTES_CHI: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "FH_ASSASSINO" },
      // fh 82
      { tier: "COM", traitId: "REI_SAIBRO" },
      { tier: "NEG", traitId: "MAGO_GRAMA" }
    ]
  },
  ROJAS_COL: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "BASE_SOLIDA" },
      // CTR_PUNCHER, paciencia 84
      { tier: "COM", traitId: "RETRIEVER_ETERNO" }
    ]
  },
  TORRES_ARG: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "BASE_SOLIDA" },
      // CTR_PUNCHER, paciencia 86
      { tier: "COM", traitId: "ATRITO_RALLY" }
    ]
  },
  MIRANDA_BRA: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "INDOOR_SPEC" },
      // SRV_VOL
      { tier: "NEG", traitId: "REI_SAIBRO" }
    ]
  },
  SANTOS_PER: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "RETRIEVER_ETERNO" },
      // RETRIEVER, paciencia 82
      { tier: "COM", traitId: "ATRITO_RALLY" }
    ]
  },
  BARROS_LUCAS: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "FH_ASSASSINO" },
      // fh 87
      { tier: "NEG", traitId: "MP_SAVER" }
    ]
  },
  LI_WEN: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "RETRIEVER_ETERNO" },
      // paciencia 92, consistencia 90
      { tier: "COM", traitId: "ATRITO_RALLY" }
    ]
  },
  HONDA: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "BASE_SOLIDA" },
      // paciencia 88
      { tier: "COM", traitId: "ATRITO_RALLY" }
    ]
  },
  TANAKA: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "CANHAO_SAQUE" },
      // serve 90
      { tier: "NEG", traitId: "REI_SAIBRO" }
    ]
  },
  BAEK_JISOO: {
    score: 52,
    slots: [
      { tier: "COM", traitId: "RETRIEVER_ETERNO" },
      // RETRIEVER, paciencia 90
      { tier: "COM", traitId: "IRON_LEGS" }
    ]
  },
  LEE_SANGHOON: {
    score: 50,
    slots: [
      { tier: "COM", traitId: "ALL_SURFACE" },
      { tier: "COM", traitId: "BASE_SOLIDA" }
    ]
  },
  WANG_CHEN: {
    score: 50,
    slots: [
      { tier: "COM", traitId: "BASE_SOLIDA" },
      // consistencia 80, paciencia 76
      { tier: "COM", traitId: "MAQUINA" }
      // mentalidade 80
    ]
  },
  MATSUDA: {
    score: 50,
    slots: [
      { tier: "COM", traitId: "BASE_SOLIDA" },
      // paciencia 82
      { tier: "COM", traitId: "ATRITO_RALLY" }
    ]
  },
  SEO_DONGHUN: {
    score: 50,
    slots: [
      { tier: "COM", traitId: "RETRIEVER_ETERNO" },
      // RETRIEVER, paciencia 84
      { tier: "COM", traitId: "IRON_LEGS" }
    ]
  },
  NGUYEN_MINH: {
    score: 50,
    slots: [
      { tier: "COM", traitId: "RETRIEVER_ETERNO" },
      // RETRIEVER, paciencia 84
      { tier: "COM", traitId: "ATRITO_RALLY" }
    ]
  },
  SUZUKI: {
    score: 50,
    slots: [
      { tier: "COM", traitId: "BASE_SOLIDA" },
      // CTR_PUNCHER, paciencia 84
      { tier: "COM", traitId: "ATRITO_RALLY" }
    ]
  },
  // ── TIER 4 — COMUM (DNA 30–39) ──────────────────────────────────
  SCHREIBER: {
    score: 38,
    slots: [
      { tier: "COM", traitId: "RETRIEVER_ETERNO" },
      // RETRIEVER
      { tier: "NEG", traitId: "EXPLOSAO_INICIAL" },
      // começa lento
      { tier: "NEG", traitId: "TIEBREAK_KILLER" }
      // trava no decisivo
    ]
  }
};
function buildSombras(slots) {
  const sombras = [];
  for (const slot of slots) {
    if (slot.tier !== "NEG")
      continue;
    const def = TRAIT_CATALOG[slot.traitId];
    if (!def?.sombra)
      continue;
    sombras.push({
      traitId: slot.traitId,
      progress: 0,
      target: def.sombra.target,
      metric: def.sombra.metric,
      challenge: def.sombra.challenge,
      resolved: false
    });
  }
  return sombras;
}
function getDnaTier(score) {
  if (score >= 100)
    return "GERACIONAL";
  if (score >= 90)
    return "EXCEPCIONAL";
  if (score >= 75)
    return "ALTO";
  if (score >= 60)
    return "BOM";
  if (score >= 40)
    return "NORMAL";
  return "FRACO";
}
function applyPlayerTraits(namedPlayers) {
  for (const [key, rawDna] of Object.entries(RAW_DNA)) {
    const player = namedPlayers[key];
    if (!player)
      continue;
    if (player.dna)
      continue;
    player.dna = {
      score: rawDna.score,
      tier: getDnaTier(rawDna.score),
      slots: rawDna.slots.map((slot) => ({
        ...slot,
        origin: slot.tier === "NEG" ? "scar" : "dna"
      })),
      milestones: [],
      sombras: buildSombras(rawDna.slots),
      metrics: {},
      history: [{ type: "MANUAL_SEED", total: rawDna.slots.length }],
      tags: []
    };
    sanitizeTraitSlots(player);
  }
  for (const player of Object.values(namedPlayers)) {
    if (player.dna)
      continue;
    const fallbackScore = {
      GERACIONAL: 92,
      LENDA: 80,
      ELITE: 67,
      CAMPEAO: 52,
      COMUM: 38,
      ABAIXO_DA_MEDIA: 22
    }[player.potential ?? "COMUM"] ?? 40;
    player.dna = {
      score: fallbackScore,
      tier: getDnaTier(fallbackScore),
      slots: [],
      milestones: [],
      sombras: [],
      metrics: {},
      history: [],
      tags: []
    };
  }
}
var PLAYERS_WITH_MANUAL_TRAITS = Object.keys(RAW_DNA);

// src/players.js
var NAMED_PLAYERS = {
  // ══════════════════════════════════════════════════════════════
  // 1 — MARCO VANTORINI  |  ITA  |  AGG_BASELINER
  // ══════════════════════════════════════════════════════════════
  VANTORINI: {
    id: "VANTORINI",
    photo: "https://files.catbox.moe/xukqks.png",
    name: "Vantorini",
    nickname: "Il Cannone",
    nationality: "ITA",
    age: 26,
    height: 1.85,
    weight: 79,
    styleId: "PWR_BASE",
    color: "#FF6B35",
    tagline: "Argila \xE9 o lar. Qualquer quadra \xE9 o inferno do advers\xE1rio.",
    bio: "Na argila, \xE9 um deus. O Empire Open 2025 \u2014 grand slam no hard \u2014 mostrou que ele est\xE1 expandindo seu universo. O forehand topspin com 97 de atributo gera \xE2ngulos que desafiam a f\xEDsica. Subiu ao profissionalismo em 2019 e conquistou seu primeiro Slam no Roland d'Occitane 2023. Est\xE1 no melhor t\xEAnis da vida.",
    career: "Profissional desde 2019. Primeiro Slam no Roland d'Occitane 2023. Cinco tops 4 consecutivos em Meridian mostram a dificuldade no hard \u2014 mas o Empire Open 2025 mudou essa narrativa.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 4,
    initialPts: 9840,
    birthYear: 1999,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 27,
    rallyPattern: "CROSS_HEAVY",
    signaturePattern: "SERVE_COMMANDER",
    naturalSignature: "FH_TOPSPIN_CROSS",
    alcunha: "FOREHAND_FREAK",
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      // CORPO — motor atlético explosivo, resistência de ferro
      velocidade: 89,
      explosividade: 95,
      resistencia: 92,
      defesa: 80,
      // GOLPES — FH devastador (99), BH sólido mas não a arma principal
      fhPotencia: 99,
      fhControle: 75,
      bhPotencia: 85,
      bhControle: 78,
      topspin: 99,
      slice: 72,
      // SAQUE & RETORNO — força brutal, precisão razoável
      saqueForca: 87,
      saquePrecisao: 76,
      devolucao: 76,
      // REDE — baseliner puro, quase nunca sobe
      volley: 58,
      smash: 64,
      // LEITURA & DECISÃO — leitura de alto nível, visão tática agressiva
      leitura: 91,
      visaoTatica: 90,
      // CABEÇA — mentalmente sólido, consistência de top 5
      mentalidade: 84,
      regularidade: 86,
      recuperacao: 80,
      adaptacao: 78
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "AVOIDS",
      rallyCadence: "PATIENT",
      riskProfile: "GAMBLER",
      adaptability: 62
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ══════════════════════════════════════════════════════════════
  // 2 — LARS KASPERK  |  DEN  |  CTR_PUNCHER
  // ══════════════════════════════════════════════════════════════
  KASPERK: {
    id: "KASPERK",
    photo: "https://files.catbox.moe/cbr6rs.png",
    name: "Kasperk",
    nickname: "The Nordic Wall",
    nationality: "DEN",
    age: 30,
    height: 1.93,
    weight: 88,
    styleId: "GRINDER",
    color: "#C8D4FF",
    tagline: "Deixa o advers\xE1rio se destruir.",
    bio: "Nunca ganhou um Slam. Chegou em tr\xEAs finais. O slice backhand abre \xE2ngulos que parecem imposs\xEDveis para o corpo que tem. A paci\xEAncia (96) \xE9 um atributo que devia ser ilegal. Advers\xE1rios perdem antes de jogar a primeira bola \u2014 e em 10 anos no top 20, Lars Kasperk nunca precisou de mais do que isso.",
    career: "10 anos no top 20. O Masters Desert 2022 foi o maior t\xEDtulo. Tr\xEAs finais de Slam perdidas \u2014 todas para Nakamura. O Slam escapa como areia entre os dedos.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 18,
    initialPts: 3980,
    birthYear: 1995,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 28,
    rallyPattern: "DEFENSIVE_BASE",
    signaturePattern: "BH_WALL",
    naturalSignature: "BH_SLICE_DEEP",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      // CORPO — não o mais explosivo, mas consistente
      velocidade: 80,
      explosividade: 78,
      resistencia: 85,
      defesa: 88,
      // GOLPES — BH slice letal (97 controle), FH ferramenta de construção
      fhPotencia: 62,
      fhControle: 91,
      bhPotencia: 70,
      bhControle: 97,
      topspin: 73,
      slice: 99,
      // SAQUE & RETORNO — saque de colocação, retorno excelente
      saqueForca: 68,
      saquePrecisao: 79,
      devolucao: 85,
      // REDE — raramente sobe, preferência por fundo
      volley: 52,
      smash: 50,
      // LEITURA — leitura de elite, visão tática mais passiva
      leitura: 89,
      visaoTatica: 62,
      // CABEÇA — solidez mental e consistência altíssima
      mentalidade: 82,
      regularidade: 88,
      recuperacao: 85,
      adaptacao: 80
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "AVOIDS",
      rallyCadence: "MEASURED",
      riskProfile: "CALCULATED",
      adaptability: 76
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ══════════════════════════════════════════════════════════════
  // 3 — WEI CHEN  |  CHN  |  RETRIEVER
  // ══════════════════════════════════════════════════════════════
  CHEN_WEI: {
    id: "CHEN_WEI",
    photo: "https://files.catbox.moe/pou3kw.png",
    name: "Chen Wei",
    nickname: "The Great Wall",
    nationality: "CHN",
    age: 22,
    height: 1.78,
    weight: 72,
    styleId: "RETRIEVER",
    color: "#FF4444",
    tagline: "Cada bola volta. Cada bola, sempre.",
    bio: "O produto de Pequim que faz o imposs\xEDvel parecer trivial. Cada bola volta. Sempre. Advers\xE1rios querem saber quando ele vai errar. Analistas dizem que a pergunta n\xE3o tem resposta. Com dois Masters aos 21 anos, Chen Wei cresce em ritmo de furac\xE3o.",
    career: "Profissional desde 2021. Dois Masters com 21 anos. Crescendo em ritmo hist\xF3rico. A China domina por cima e por baixo da linha de base.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 12,
    initialPts: 5480,
    birthYear: 2003,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 26,
    rallyPattern: "DEEP_GRINDER",
    signaturePattern: "BH_WALL",
    naturalSignature: "LOB_DEFENSIVE_PRECISE",
    alcunha: "THE_WALL",
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      // CORPO — velocidade e resistência sobrenaturais, defesa incomparável
      velocidade: 95,
      explosividade: 82,
      resistencia: 99,
      defesa: 99,
      // GOLPES — sem arma ofensiva real, FH e BH de controle puro
      fhPotencia: 52,
      fhControle: 96,
      bhPotencia: 50,
      bhControle: 99,
      topspin: 72,
      slice: 90,
      // SAQUE & RETORNO — saque fraco, devolução de elite
      saqueForca: 58,
      saquePrecisao: 74,
      devolucao: 92,
      // REDE — raramente sobe, sem instinto de net game
      volley: 42,
      smash: 48,
      // LEITURA — antecipação perfeita, tática passiva (não ataca)
      leitura: 96,
      visaoTatica: 52,
      // CABEÇA — mentalidade e regularidade de robô
      mentalidade: 90,
      regularidade: 95,
      recuperacao: 92,
      adaptacao: 70
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "HUNTER",
      rallyCadence: "EXPLOSIVE",
      riskProfile: "SAFE",
      adaptability: 91
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ══════════════════════════════════════════════════════════════
  // 4 — ALEXEI VOLKOV  |  RUS  |  SRV_VOL
  // ══════════════════════════════════════════════════════════════
  VOLKOV: {
    id: "VOLKOV",
    photo: "https://files.catbox.moe/39f0uc.png",
    name: "Volkov",
    nickname: "Kapitan",
    nationality: "RUS",
    age: 28,
    height: 1.9,
    weight: 84,
    styleId: "SRV_VOL",
    color: "#4488FF",
    tagline: "Primeiro ponto do rally tamb\xE9m \xE9 o \xFAltimo.",
    bio: "O saque bomba + rede fria = Volkov. Taticamente limitado fora da grama, mas nessa superf\xEDcie \xE9 quase inatac\xE1vel. O rosto n\xE3o muda, a pontua\xE7\xE3o muda sempre a favor dele. Desenvolveu o estilo de jogo definitivo entre 23 e 25 anos. Dois Masters Indoor e o pico de carreira est\xE1 chegando.",
    career: "Desenvolveu o estilo definitivo entre 23-25 anos. Dois Masters Indoor. Pico de carreira chegando. Na grama, torna-se quase intrat\xE1vel.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 22,
    initialPts: 3380,
    birthYear: 1997,
    potential: "CAMPEAO",
    developmentStyle: "EARLY_BLOOMER",
    peakAge: 23,
    rallyPattern: "SERVE_PLUS_ONE",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "SERVE_T_LASER",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      // CORPO — explosivo para subir à rede, não o mais rápido de fundo
      velocidade: 75,
      explosividade: 85,
      resistencia: 72,
      defesa: 62,
      // GOLPES — golpes de fundo funcionais, slice para abrir caminho à rede
      fhPotencia: 74,
      fhControle: 68,
      bhPotencia: 68,
      bhControle: 65,
      topspin: 56,
      slice: 80,
      // SAQUE & RETORNO — saque é a arma principal: força E precisão de elite
      saqueForca: 94,
      saquePrecisao: 88,
      devolucao: 60,
      // REDE — volley divino (97), smash letal (92). O melhor net player
      volley: 97,
      smash: 92,
      // LEITURA — visão tática agressiva, sabe quando subir
      leitura: 78,
      visaoTatica: 88,
      // CABEÇA — mentalmente sólido, regularidade média
      mentalidade: 80,
      regularidade: 76,
      recuperacao: 74,
      adaptacao: 72
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "PROACTIVE",
      rallyCadence: "BALANCED",
      riskProfile: "CALCULATED",
      adaptability: 77
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ══════════════════════════════════════════════════════════════
  // 5 — TEMI AJUBA  |  NGR  |  BIG_SERVER
  // ══════════════════════════════════════════════════════════════
  AJUBA: {
    id: "AJUBA",
    photo: "https://files.catbox.moe/lflfjl.png",
    name: "Ajuba",
    nickname: "Thunder",
    nationality: "NGR",
    age: 24,
    height: 2.01,
    weight: 98,
    styleId: "BIG_SERVER",
    color: "#00FF88",
    tagline: "O saque que n\xE3o se devolve.",
    bio: "O saque mais devastador do circuito. 99 de velocidade \u2014 o n\xFAmero n\xE3o mente. O primeiro Slam (Empire Open 2024) mudou a conversa: \xE9 lenda ou pode ser? Com 24 anos ainda construindo o jogo de fundo, mas quando entra no modo destrui\xE7\xE3o, ningu\xE9m devolve.",
    career: "Profissional desde 2021. Primeiro Slam (Empire Open 2024) com 23 anos. Tr\xEAs Masters. A trajet\xF3ria de lenda est\xE1 aberta.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 7,
    initialPts: 7240,
    birthYear: 2001,
    potential: "LENDA",
    developmentStyle: "EARLY_BLOOMER",
    peakAge: 23,
    rallyPattern: "SERVE_PLUS_ONE",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "SERVE_FLAT_BOMB",
    alcunha: "SERVE_GOD",
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      // CORPO — físico razoável, não é atleta de destaque
      velocidade: 72,
      explosividade: 80,
      resistencia: 76,
      defesa: 60,
      // GOLPES — FH pesado mas impreciso, BH fraco de controle
      fhPotencia: 98,
      fhControle: 55,
      bhPotencia: 82,
      bhControle: 52,
      topspin: 72,
      slice: 64,
      // SAQUE & RETORNO — saque é absurdo: força 99 + precisão 92
      saqueForca: 99,
      saquePrecisao: 92,
      devolucao: 76,
      // REDE — boa rede para aproveitar o saque, smash letal
      volley: 82,
      smash: 88,
      // LEITURA — visão tática de elite (sabe aproveitar o ace)
      leitura: 88,
      visaoTatica: 96,
      // CABEÇA — mentalidade razoável, pode vacilar sob pressão real
      mentalidade: 75,
      regularidade: 72,
      recuperacao: 68,
      adaptacao: 70
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "HUNTER",
      rallyCadence: "PATIENT",
      riskProfile: "ALLOUT",
      adaptability: 63
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ══════════════════════════════════════════════════════════════
  // 6 — BAPTISTE DELACROIX  |  FRA  |  TAKEALLRISK
  // ══════════════════════════════════════════════════════════════
  DELACROIX: {
    id: "DELACROIX",
    photo: "https://files.catbox.moe/tl8t33.png",
    name: "Delacroix",
    nickname: "L'Artiste",
    nationality: "FRA",
    age: 25,
    height: 1.8,
    weight: 75,
    styleId: "TACT_TEC",
    color: "#FF0055",
    tagline: "Le risque, c'est le jeu.",
    bio: "Ca\xF3tico, genial, imprevis\xEDvel. Quando est\xE1 no dia, ningu\xE9m o para. Quando n\xE3o est\xE1, perde em sets retos para o #80. O drop shot nas quintas bolas de rally \xE9 uma obra de arte. O Masters de Monte Rosso 2024 foi um statement de que o talento pode se tornar consistente. O circuito ainda n\xE3o sabe o que fazer com ele.",
    career: "Revelado cedo, prometeu muito desde os 18. O Masters de Monte Rosso 2024 foi o grande statement. Ainda esperando a consist\xEAncia que igualaria o talento.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 15,
    initialPts: 4720,
    birthYear: 2e3,
    potential: "ELITE",
    developmentStyle: "VOLATILE",
    peakAge: 25,
    rallyPattern: "AGGRESSIVE_EARLY",
    signaturePattern: "SHORT_ANGLE_ASSASSIN",
    naturalSignature: "FH_FLAT_BOMB",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      // CORPO — atlético e explosivo, resistência medíocre
      velocidade: 88,
      explosividade: 92,
      resistencia: 70,
      defesa: 72,
      // GOLPES — poder bruto absurdo, controle inexistente
      fhPotencia: 96,
      fhControle: 42,
      bhPotencia: 90,
      bhControle: 40,
      topspin: 88,
      slice: 80,
      // SAQUE & RETORNO — saque potente mas scatter enorme
      saqueForca: 85,
      saquePrecisao: 62,
      devolucao: 48,
      // REDE — instinto de net game, mas sem consistência
      volley: 74,
      smash: 78,
      // LEITURA — não lê o jogo, não planeja
      leitura: 38,
      visaoTatica: 45,
      // CABEÇA — mentalidade frágil, zebra em qualquer direção
      mentalidade: 32,
      regularidade: 28,
      recuperacao: 40,
      adaptacao: 30
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "HUNTER",
      rallyCadence: "MEASURED",
      riskProfile: "GAMBLER",
      adaptability: 51
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ══════════════════════════════════════════════════════════════
  // 7 — RAFAEL MAURICIO  |  BRA  |  AGG_BASELINER
  // ══════════════════════════════════════════════════════════════
  SOUZA: {
    id: "SOUZA",
    photo: "https://files.catbox.moe/ruujh3.png",
    name: "Rafael Mauricio",
    nickname: "Fen\xF4meno",
    nationality: "BRA",
    age: 19,
    height: 1.88,
    weight: 83,
    styleId: "AGG_BASELINER",
    color: "#FFD700",
    tagline: "O t\xEAnis ainda n\xE3o sabe o que est\xE1 por vir.",
    bio: "Dezenove anos, forehand que rasga a quadra, saque que explode. Rafael Mauricio ainda erra muito \u2014 a consist\xEAncia vai vir. Mas quando tudo encaixa por dois ou tr\xEAs games, voc\xEA v\xEA algo que o circuito n\xE3o viu h\xE1 d\xE9cadas. O Brasil j\xE1 sabe: este menino vai ser o maior.",
    career: "Profissional aos 18. Primeiro t\xEDtulo ATP 250 antes de completar 19 anos. O circuito ainda est\xE1 aprendendo a lidar com ele.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 38,
    initialPts: 1820,
    birthYear: 2006,
    potential: "LENDA",
    developmentStyle: "EXPLOSIVE",
    peakAge: 25,
    rallyPattern: "SHORT_ANGLE_BUILDER",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "FH_KICK",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false,
      ovrTarget: null
      // força re-sorteio com o novo potencial LENDA (teto 94)
    },
    attrs: {
      // CORPO — atletismo de alta qualidade
      velocidade: 90,
      explosividade: 94,
      resistencia: 85,
      defesa: 78,
      // GOLPES — FH explosivo (96 potência), BH fraco de controle
      fhPotencia: 96,
      fhControle: 52,
      bhPotencia: 80,
      bhControle: 58,
      topspin: 95,
      slice: 62,
      // SAQUE & RETORNO — saque razoável, retorno fraco
      saqueForca: 80,
      saquePrecisao: 72,
      devolucao: 56,
      // REDE — sobe ocasionalmente, sem muita sofisticação
      volley: 64,
      smash: 70,
      // LEITURA — visão tática presente mas leitura limitada
      leitura: 52,
      visaoTatica: 76,
      // CABEÇA — cabeça inconstante, irregular
      mentalidade: 65,
      regularidade: 60,
      recuperacao: 62,
      adaptacao: 55
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "AVOIDS",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "CALCULATED",
      adaptability: 51
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ══════════════════════════════════════════════════════════════
  // 8 — RODRIGO CARDENAS  |  ARG  |  AGG_BASELINER
  // ══════════════════════════════════════════════════════════════
  CARDENAS: {
    id: "CARDENAS",
    photo: "https://files.catbox.moe/7gqb6a.png",
    name: "Cardenas",
    nickname: "El Toro",
    nationality: "ARG",
    age: 29,
    height: 1.82,
    weight: 80,
    styleId: "AGG_BASELINER",
    color: "#74ACDF",
    tagline: "La pelota siempre vuelve m\xE1s r\xE1pida.",
    bio: "Buenos Aires o formou. A garra argentina est\xE1 em cada grito, cada punho cerrado. Late bloomer chegando ao pico aos 29 \u2014 quatro Masters, todos no saibro. Nunca foi favorito, sempre surpreendeu. A temporada 2025 \xE9 a melhor da carreira.",
    career: "Late bloomer chegando ao pico aos 29. Quatro Masters \u2014 todos no saibro. Nunca favorito, sempre surpreendente. 2025 \xE9 a temporada definitiva.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 19,
    initialPts: 3840,
    birthYear: 1996,
    potential: "CAMPEAO",
    developmentStyle: "LATE_BLOOMER",
    peakAge: 30,
    rallyPattern: "CROSS_HEAVY",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "FH_SHORT_ANGLE",
    alcunha: "CLAY_KING",
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      // CORPO — atleticamente completo e equilibrado
      velocidade: 84,
      explosividade: 86,
      resistencia: 82,
      defesa: 80,
      // GOLPES — FH e BH equilibrados, nenhuma fraqueza clara
      fhPotencia: 80,
      fhControle: 80,
      bhPotencia: 76,
      bhControle: 78,
      topspin: 78,
      slice: 82,
      // SAQUE & RETORNO — saque equilibrado e consistente
      saqueForca: 80,
      saquePrecisao: 82,
      devolucao: 76,
      // REDE — volley competente, parte do jogo all-court
      volley: 78,
      smash: 74,
      // LEITURA — leitura e tática de alto nível
      leitura: 84,
      visaoTatica: 80,
      // CABEÇA — mentalmente muito completo, alta adaptação
      mentalidade: 80,
      regularidade: 82,
      recuperacao: 78,
      adaptacao: 82
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "PROACTIVE",
      rallyCadence: "EXPLOSIVE",
      riskProfile: "SAFETY_FIRST",
      adaptability: 77
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ══════════════════════════════════════════════════════════════
  // 9 — KENJI NAKAMURA  |  JPN  |  ALL_COURT
  // ══════════════════════════════════════════════════════════════
  NAKAMURA: {
    id: "NAKAMURA",
    photo: "https://files.catbox.moe/q4ojf4.png",
    name: "Nakamura",
    nickname: "Seijaku",
    nationality: "JPN",
    age: 27,
    height: 1.75,
    weight: 70,
    styleId: "ALL_COURT",
    color: "#FF8C42",
    tagline: "O ponto ideal existe. Eu o encontro.",
    bio: "O n\xFAmero 1 do mundo opera com precis\xE3o cir\xFArgica. Sem fraquezas claras, sem momentos de p\xE2nico. Dois Slams em 2025 \u2014 Meridian e Roland. Profissional desde 2018, conquistou o primeiro Slam aos 24. Alguma coisa na express\xE3o vazia dele sugere que isso \xE9 apenas o come\xE7o.",
    career: "Profissional desde 2018. Primeiro t\xEDtulo ATP 250 com 20 anos. Primeiro Slam aos 24. Quatro Slams, oito Masters. Considerado favorito para dominar a pr\xF3xima d\xE9cada.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 1,
    initialPts: 12840,
    birthYear: 1998,
    potential: "LENDA",
    developmentStyle: "STEADY",
    peakAge: 27,
    rallyPattern: "SHORT_ANGLE_BUILDER",
    signaturePattern: "SLICE_DISRUPTOR",
    naturalSignature: "DROP_HIDDEN",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      // CORPO — completo atleticamente, especialmente veloz
      velocidade: 88,
      explosividade: 82,
      resistencia: 88,
      defesa: 86,
      // GOLPES — controle de elite em ambos os lados, sem arma bruta
      fhPotencia: 76,
      fhControle: 90,
      bhPotencia: 72,
      bhControle: 88,
      topspin: 80,
      slice: 85,
      // SAQUE & RETORNO — saque de precisão cirúrgica
      saqueForca: 75,
      saquePrecisao: 90,
      devolucao: 84,
      // REDE — net game refinado, parte integral do seu jogo
      volley: 86,
      smash: 80,
      // LEITURA — leitura de elite, adaptação tática excepcional
      leitura: 92,
      visaoTatica: 86,
      // CABEÇA — máquina: regularidade e recuperação excelentes
      mentalidade: 88,
      regularidade: 90,
      recuperacao: 86,
      adaptacao: 88
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "RELUCTANT",
      rallyCadence: "BALANCED",
      riskProfile: "CALCULATED",
      adaptability: 96
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ══════════════════════════════════════════════════════════════
  // 10 — STAVROS PETRAKIS  |  GRE  |  RETRIEVER
  // ══════════════════════════════════════════════════════════════
  PETRAKIS: {
    id: "PETRAKIS",
    photo: "https://files.catbox.moe/xgnya3.png",
    name: "Petrakis",
    nickname: "Anatol\xED",
    nationality: "GRE",
    age: 31,
    height: 1.83,
    weight: 82,
    styleId: "RETRIEVER",
    color: "#00AAFF",
    tagline: "A bola n\xE3o cai enquanto eu estiver de p\xE9.",
    bio: "O veterano da resist\xEAncia. A velocidade n\xE3o \xE9 mais a de antes, mas a leitura de jogo (94) compensa tudo. Cada rally \xE9 uma maratona que ele j\xE1 planejou antes de come\xE7ar. Advers\xE1rios jovens ficam frustrados. Petrakis sorri \u2014 top 15 por seis anos consecutivos.",
    career: "Top 15 por seis anos consecutivos. Em queda suave mas ainda perigoso. A Gr\xE9cia tem no t\xEAnis um her\xF3i improv\xE1vel e inabal\xE1vel.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 27,
    initialPts: 2760,
    birthYear: 1994,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 28,
    rallyPattern: "DEFENSIVE_BASE",
    signaturePattern: "DEEP_COURT_GRINDER",
    naturalSignature: "BH_SLICE_DEEP",
    alcunha: "THE_WALL",
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      // CORPO — resistência de argila, não o mais explosivo
      velocidade: 78,
      explosividade: 76,
      resistencia: 90,
      defesa: 84,
      // GOLPES — BH controle (92) e slice (94) como armas principais
      fhPotencia: 68,
      fhControle: 86,
      bhPotencia: 78,
      bhControle: 92,
      topspin: 75,
      slice: 94,
      // SAQUE & RETORNO — saque de colocação, devolução sólida
      saqueForca: 70,
      saquePrecisao: 80,
      devolucao: 82,
      // REDE — raramente sobe, sem instinto de net game
      volley: 54,
      smash: 52,
      // LEITURA — leitura alta, tática mais defensiva
      leitura: 88,
      visaoTatica: 70,
      // CABEÇA — solidez e regularidade para longas campanhas
      mentalidade: 80,
      regularidade: 86,
      recuperacao: 84,
      adaptacao: 76
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "PROACTIVE",
      rallyCadence: "MEASURED",
      riskProfile: "SAFETY_FIRST",
      adaptability: 94
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ══════════════════════════════════════════════════════════════
  // 11 — ERIK BJORNSTAD  |  NOR  |  ALL_COURT
  // ══════════════════════════════════════════════════════════════
  BJORNSTAD: {
    id: "BJORNSTAD",
    photo: "https://files.catbox.moe/n9wkcq.png",
    name: "Bjornstad",
    nickname: "Fjord",
    nationality: "NOR",
    age: 29,
    height: 1.91,
    weight: 85,
    styleId: "ALL_COURT",
    color: "#EF2B2D",
    tagline: "Do fundo \xE0 rede, sem avisar.",
    bio: "Championships of Albion 2025 foi seu. Cinco sets contra Nakamura, tiebreak no quinto, 14-12. A noite mais longa de Wimbledon em anos. Bjornstad \xE9 o advers\xE1rio que Nakamura teme \u2014 consist\xEAncia top-3 por tr\xEAs temporadas seguidas, dois Slams, seis Masters.",
    career: "Profissional 2017. Dois Slams, seis Masters. Consist\xEAncia top-3 por tr\xEAs temporadas seguidas \u2014 rara para um ALL_COURT n\xE3o-favorito de superf\xEDcie.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 2,
    initialPts: 11560,
    birthYear: 1996,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 28,
    rallyPattern: "CENTRE_CONTROL",
    signaturePattern: "SLICE_DISRUPTOR",
    naturalSignature: "BH_SLICE_DEEP",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      // CORPO — velocidade e resistência para correr a noite toda
      velocidade: 94,
      explosividade: 86,
      resistencia: 96,
      defesa: 97,
      // GOLPES — controle em ambos os lados, sem punch ofensivo real
      fhPotencia: 58,
      fhControle: 88,
      bhPotencia: 62,
      bhControle: 90,
      topspin: 70,
      slice: 86,
      // SAQUE & RETORNO — devolução de elite (95), saque fraco
      saqueForca: 65,
      saquePrecisao: 75,
      devolucao: 95,
      // REDE — não é seu habitat
      volley: 50,
      smash: 55,
      // LEITURA — antecipação perfeita, tática mais reativa
      leitura: 92,
      visaoTatica: 60,
      // CABEÇA — solidez mental e recuperação de monstro
      mentalidade: 88,
      regularidade: 92,
      recuperacao: 90,
      adaptacao: 74
    },
    prefs: {
      buildStyle: "CROSS_BUILDER",
      netGame: "AVOIDS",
      rallyCadence: "MEASURED",
      riskProfile: "ALLOUT",
      adaptability: 89
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ══════════════════════════════════════════════════════════════
  // 12 — RYU YAMAMOTO  |  JPN  |  SRV_VOL
  // ══════════════════════════════════════════════════════════════
  YAMAMOTO: {
    id: "YAMAMOTO",
    photo: "https://files.catbox.moe/3i0rf0.png",
    name: "Yamamoto",
    nickname: "Katana",
    nationality: "JPN",
    age: 26,
    height: 1.77,
    weight: 74,
    styleId: "NET_SPEC",
    color: "#FFFFFF",
    tagline: "Um golpe. Um ponto. Fim.",
    bio: "O serve-volleyer mais t\xE9cnico do circuito. O saque n\xE3o \xE9 o mais r\xE1pido, mas a varia\xE7\xE3o \xE9 absurda. Dois Masters consecutivos na temporada indoor. Joga t\xE3o quieto que o est\xE1dio esquece que ele est\xE1 l\xE1 \u2014 at\xE9 a pontua\xE7\xE3o aparecer. Na grama, torna-se quase intrat\xE1vel.",
    career: "Revelado no circuito de grama em 2021. Dois Masters consecutivos em indoor. Nunca chegou al\xE9m das semis de um Slam, mas o n\xEDvel est\xE1 subindo.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 11,
    initialPts: 5680,
    birthYear: 1999,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 26,
    rallyPattern: "NET_APPROACH",
    signaturePattern: "NET_CLOSER",
    naturalSignature: "FH_TOPSPIN_CROSS",
    alcunha: "GRASS_WIZARD",
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      // CORPO — explosivo, físico de alta qualidade
      velocidade: 86,
      explosividade: 90,
      resistencia: 84,
      defesa: 76,
      // GOLPES — FH de topspin pesado, BH é ponto fraco
      fhPotencia: 90,
      fhControle: 64,
      bhPotencia: 72,
      bhControle: 62,
      topspin: 95,
      slice: 68,
      // SAQUE & RETORNO — saque mediano, retorno inconsistente
      saqueForca: 78,
      saquePrecisao: 70,
      devolucao: 68,
      // REDE — sobe raramente
      volley: 60,
      smash: 65,
      // LEITURA — visão tática presente, leitura em desenvolvimento
      leitura: 72,
      visaoTatica: 80,
      // CABEÇA — inconstante, pode entrar em espiral
      mentalidade: 74,
      regularidade: 72,
      recuperacao: 70,
      adaptacao: 66
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "OPPORTUNIST",
      rallyCadence: "MEASURED",
      riskProfile: "SAFETY_FIRST",
      adaptability: 77
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ══════════════════════════════════════════════════════════════
  // 13 — SIPHO MBEKI  |  RSA  |  BIG_SERVER
  // ══════════════════════════════════════════════════════════════
  MBEKI: {
    id: "MBEKI",
    photo: "https://files.catbox.moe/noozms.png",
    name: "Mbeki",
    nickname: "Cape Storm",
    nationality: "RSA",
    age: 25,
    height: 1.95,
    weight: 93,
    styleId: "PWR_BASE",
    color: "#009B77",
    tagline: "Velocidade n\xE3o tem substituto.",
    bio: "Cape Town exportou um servidor monstruoso. Saque a 96, forehand que martela. O jogo de fundo ainda constr\xF3i regularidade, mas o mapa mental do circuito j\xE1 sabe: na grama, Mbeki \xE9 perigo m\xE1ximo. Dois Masters e potencial de muito mais.",
    career: "Profissional 2021. Dois Masters. Top 13 com 25 anos. Potencial de muito mais por vir.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 13,
    initialPts: 5200,
    birthYear: 2e3,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 26,
    rallyPattern: "SERVE_PLUS_ONE",
    signaturePattern: "SERVE_COMMANDER",
    naturalSignature: "FH_FLAT_BOMB",
    alcunha: "SERVE_GOD",
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      // CORPO — atletismo absurdo, explosividade máxima
      velocidade: 92,
      explosividade: 96,
      resistencia: 88,
      defesa: 74,
      // GOLPES — FH devastador, BH funcional mas não arma
      fhPotencia: 95,
      fhControle: 60,
      bhPotencia: 84,
      bhControle: 62,
      topspin: 86,
      slice: 72,
      // SAQUE & RETORNO — saque poderoso, scatter médio
      saqueForca: 88,
      saquePrecisao: 72,
      devolucao: 72,
      // REDE — smash potente quando sobe
      volley: 66,
      smash: 76,
      // LEITURA — tático mas não o mais lúcido sob pressão
      leitura: 66,
      visaoTatica: 74,
      // CABEÇA — mentalidade sólida, alguma irregularidade
      mentalidade: 78,
      regularidade: 74,
      recuperacao: 76,
      adaptacao: 68
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "OPPORTUNIST",
      rallyCadence: "PATIENT",
      riskProfile: "SAFE",
      adaptability: 75
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ══════════════════════════════════════════════════════════════
  // 14 — BALINT KOVACS  |  HUN  |  ALL_COURT
  // ══════════════════════════════════════════════════════════════
  KOVACS: {
    id: "KOVACS",
    photo: "https://files.catbox.moe/bd1vsp.png",
    name: "Kovacs",
    nickname: "O Estrategista",
    nationality: "HUN",
    age: 33,
    height: 1.86,
    weight: 83,
    styleId: "ADPT_TAC",
    color: "#CE3232",
    tagline: "Trinta anos jogando. O advers\xE1rio ainda n\xE3o sabe o que vem.",
    bio: "33 anos, um banco de dados mental incompar\xE1vel. A leitura de tend\xEAncias t\xE1ticas \xE9 assustadora \u2014 ele sabe o que o advers\xE1rio vai fazer antes que ele saiba. O drop shot (92) ainda surpreende. O Finals de 2021 foi o ponto alto. Uma joia em seus anos finais.",
    career: "Uma das carreiras mais longas e est\xE1veis do circuito. Nunca foi n\xFAmero 1 mas esteve no top 10 por quatro temporadas. O Finals de 2021 foi o ponto alto.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 35,
    initialPts: 2180,
    birthYear: 1992,
    potential: "CAMPEAO",
    developmentStyle: "LATE_BLOOMER",
    peakAge: 30,
    rallyPattern: "RHYTHM_DISRUPTION",
    signaturePattern: "LATE_MATCH_HUNTER",
    naturalSignature: "BH_TOPSPIN_CROSS",
    alcunha: "SORCERER",
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      // CORPO — atleticamente equilibrado
      velocidade: 82,
      explosividade: 84,
      resistencia: 86,
      defesa: 82,
      // GOLPES — FH e BH com números quase idênticos — all-court puro
      fhPotencia: 78,
      fhControle: 82,
      bhPotencia: 76,
      bhControle: 80,
      topspin: 80,
      slice: 80,
      // SAQUE & RETORNO — completo e sem fraqueza
      saqueForca: 78,
      saquePrecisao: 80,
      devolucao: 80,
      // REDE — competente, usa quando precisa
      volley: 76,
      smash: 72,
      // LEITURA — leitura e tática sólidas
      leitura: 82,
      visaoTatica: 78,
      // CABEÇA — cabeça equilibrada, adapta bem
      mentalidade: 78,
      regularidade: 80,
      recuperacao: 76,
      adaptacao: 80
    },
    prefs: {
      buildStyle: "CROSS_BUILDER",
      netGame: "RELUCTANT",
      rallyCadence: "MEASURED",
      riskProfile: "GAMBLER",
      adaptability: 95
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ══════════════════════════════════════════════════════════════
  // 15 — KWAME OSEI  |  GHA  |  AGG_BASELINER
  // ══════════════════════════════════════════════════════════════
  OSEI: {
    id: "OSEI",
    photo: "https://files.catbox.moe/6545gv.png",
    name: "Osei",
    nickname: "Raw Power",
    nationality: "GHA",
    age: 21,
    height: 1.92,
    weight: 89,
    styleId: "AGG_BASELINER",
    color: "#FFCB05",
    tagline: "Jovem, bruto, e ainda melhorando.",
    bio: "21 anos, corpo de atleta ol\xEDmpico, forehand com 97 de pot\xEAncia. Um Slam e quatro Masters em menos de dois anos \u2014 velocidade de ascens\xE3o hist\xF3rica. A combina\xE7\xE3o de velocidade e poder \xE9 assustadora. Quando o mental amadurecer, ser\xE1 o maior da sua gera\xE7\xE3o.",
    career: "Profissional desde 2023. Um Slam e quatro Masters em menos de dois anos. Velocidade de ascens\xE3o hist\xF3rica. A Gana aguarda o maior de todos.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 6,
    initialPts: 7680,
    birthYear: 2004,
    potential: "LENDA",
    developmentStyle: "VOLATILE",
    peakAge: 24,
    rallyPattern: "CROSS_HEAVY",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "SERVE_KICK_HIGH",
    alcunha: "THE_ROCKET",
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      // CORPO — físico funcional, não é atleta de destaque
      velocidade: 76,
      explosividade: 82,
      resistencia: 74,
      defesa: 62,
      // GOLPES — golpes de fundo limitados, controle baixo
      fhPotencia: 82,
      fhControle: 58,
      bhPotencia: 72,
      bhControle: 55,
      topspin: 68,
      slice: 60,
      // SAQUE & RETORNO — saque absurdo: força 98 + precisão 86
      saqueForca: 98,
      saquePrecisao: 86,
      devolucao: 64,
      // REDE — smash letal para completar o sistema de saque
      volley: 74,
      smash: 80,
      // LEITURA — táticas básicas, jogo simples
      leitura: 68,
      visaoTatica: 72,
      // CABEÇA — inconstante, não tem o mental de Ajuba
      mentalidade: 70,
      regularidade: 66,
      recuperacao: 64,
      adaptacao: 62
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "PROACTIVE",
      rallyCadence: "PATIENT",
      riskProfile: "GAMBLER",
      adaptability: 74
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ══════════════════════════════════════════════════════════════
  // 16 — IGOR REINHOLT  |  GER  |  CTR_PUNCHER
  // ══════════════════════════════════════════════════════════════
  REINHOLT: {
    id: "REINHOLT",
    photo: "https://files.catbox.moe/p9hpou.png",
    name: "Reinholt",
    nickname: "Dieselmotor",
    nationality: "GER",
    age: 32,
    height: 1.87,
    weight: 86,
    styleId: "GRINDER",
    color: "#AAAAAA",
    tagline: "Sem erros, sem surpresas, sem derrota.",
    bio: "O computador est\xE1 ficando mais lento. A velocidade caiu, mas o BH (88) e a consist\xEAncia (94) ainda constroem pontos perfeitos. Alem\xE3o cl\xE1ssico, disciplinado, sem estrelismo. Chegou ao #5 em 2022. Em decl\xEDnio mas ainda produtivo \u2014 e mentor informal dos mais jovens.",
    career: "Alem\xE3o cl\xE1ssico, disciplinado, sem estrelismo. Chegou ao #5 em 2022. Em decl\xEDnio mas ainda produtivo. Mentor informal dos mais jovens.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 29,
    initialPts: 2640,
    birthYear: 1993,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 29,
    rallyPattern: "DEEP_GRINDER",
    signaturePattern: "BH_WALL",
    naturalSignature: "BH_SLICE_DEEP",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      // CORPO — resistência sólida, defesa desenvolvida
      velocidade: 86,
      explosividade: 80,
      resistencia: 92,
      defesa: 90,
      // GOLPES — controle nos dois lados, sem potência real
      fhPotencia: 62,
      fhControle: 84,
      bhPotencia: 64,
      bhControle: 86,
      topspin: 72,
      slice: 84,
      // SAQUE & RETORNO — retorno excelente, saque fraco
      saqueForca: 68,
      saquePrecisao: 78,
      devolucao: 88,
      // REDE — defensivo, não é habitat natural
      volley: 52,
      smash: 56,
      // LEITURA — leitura alta, tática passiva
      leitura: 86,
      visaoTatica: 64,
      // CABEÇA — mentalmente consistente, boa recuperação
      mentalidade: 80,
      regularidade: 84,
      recuperacao: 82,
      adaptacao: 72
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "AVOIDS",
      rallyCadence: "MEASURED",
      riskProfile: "ALLOUT",
      adaptability: 80
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ══════════════════════════════════════════════════════════════
  // ══  EUROPA — JOGADORES ADICIONAIS  ═══════════════════════════
  // ══════════════════════════════════════════════════════════════
  // ── FERRETTI  |  ITA  |  AGG_BASELINER  ────────────────
  FERRETTI: {
    id: "FERRETTI",
    photo: "https://files.catbox.moe/zeuytf.png",
    name: "Ferretti",
    nickname: "Il Veloce",
    nationality: "ITA",
    age: 23,
    height: 1.84,
    weight: 78,
    styleId: "PWR_BASE",
    color: "#FF9944",
    tagline: "O forehand que faz a quadra ficar pequena.",
    bio: "O sucessor escolhido de Vantorini pelos italianos. Ferretti ainda comete erros imperdo\xE1veis mas quando o forehand entra em modo de galeria... a quadra fica pequena.",
    career: "Pro desde 2021. Campe\xE3o do Monte Rosso Masters 2024 com 22 anos. A trajet\xF3ria aponta para cima.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 21,
    initialPts: 3540,
    birthYear: 2002,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 26,
    rallyPattern: "AGGRESSIVE_EARLY",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "FH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      // CORPO — atleticamente sólido
      velocidade: 84,
      explosividade: 88,
      resistencia: 80,
      defesa: 76,
      // GOLPES — FH potente, BH razoável
      fhPotencia: 88,
      fhControle: 72,
      bhPotencia: 76,
      bhControle: 70,
      topspin: 90,
      slice: 68,
      // SAQUE & RETORNO — saque médio
      saqueForca: 78,
      saquePrecisao: 70,
      devolucao: 72,
      // REDE — baseliner, raramente sobe
      volley: 58,
      smash: 62,
      // LEITURA — visão tática presente
      leitura: 76,
      visaoTatica: 82,
      // CABEÇA — inconsistente sob pressão
      mentalidade: 72,
      regularidade: 70,
      recuperacao: 68,
      adaptacao: 66
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "PROACTIVE",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "SAFE",
      adaptability: 72
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── OBRECHT  |  GER  |  CTR_PUNCHER  ────────────────
  OBRECHT: {
    id: "OBRECHT",
    photo: "https://files.catbox.moe/pu3q3c.png",
    name: "Obrecht",
    nickname: "Der Maschine",
    nationality: "GER",
    age: 28,
    height: 1.91,
    weight: 88,
    styleId: "TACT_TEC",
    color: "#88AACC",
    tagline: "O resultado j\xE1 est\xE1 decidido antes de come\xE7ar.",
    bio: "Alem\xE3o met\xF3dico. O counter-punch n\xE3o \xE9 dram\xE1tico, \xE9 fatal. Paci\xEAncia de pedra, posicionamento perfeito, erro quase inexistente. Caminha pelo tour como se o resultado j\xE1 estivesse decidido.",
    career: "Top 20 desde 2021. Dois Masters em hard court. Nunca emocionante, sempre eficaz.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 14,
    initialPts: 4980,
    birthYear: 1997,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 28,
    rallyPattern: "RHYTHM_DISRUPTION",
    signaturePattern: "SHORT_ANGLE_ASSASSIN",
    naturalSignature: "BH_SLICE_DEEP",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      // CORPO — equilibrado
      velocidade: 80,
      explosividade: 78,
      resistencia: 84,
      defesa: 80,
      // GOLPES — controle bilateral excelente, potência moderada
      fhPotencia: 74,
      fhControle: 88,
      bhPotencia: 78,
      bhControle: 86,
      topspin: 76,
      slice: 88,
      // SAQUE & RETORNO — saque de precisão
      saqueForca: 72,
      saquePrecisao: 86,
      devolucao: 80,
      // REDE — competente quando sobe
      volley: 72,
      smash: 68,
      // LEITURA — leitura alta
      leitura: 86,
      visaoTatica: 76,
      // CABEÇA — regularidade e adaptação de all-court
      mentalidade: 80,
      regularidade: 84,
      recuperacao: 76,
      adaptacao: 80
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "RELUCTANT",
      rallyCadence: "BALANCED",
      riskProfile: "GAMBLER",
      adaptability: 90
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── MARCHETTI  |  ITA  |  ALL_COURT  ────────────────
  MARCHETTI: {
    id: "MARCHETTI",
    photo: "https://files.catbox.moe/tl8t33.png",
    name: "Marchetti",
    nickname: "Il Professore",
    nationality: "ITA",
    age: 31,
    height: 1.83,
    weight: 78,
    styleId: "NET_SPEC",
    color: "#DD8844",
    tagline: "O tabuleiro de xadrez tem 64 casas. A quadra de t\xEAnis, infinitas.",
    bio: "O intelectual do circuito. Ex-jogador de xadrez que migrou para o t\xEAnis e trouxe a l\xF3gica do tabuleiro para a quadra. Varia\xE7\xE3o de ritmo e \xE2ngulo s\xE3o a arma. O f\xEDsico come\xE7a a reclamar.",
    career: "Carreira s\xF3lida de 10 anos. Pico no #14 em 2022. Ainda competitivo mas sentindo a press\xE3o das novas gera\xE7\xF5es.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 32,
    initialPts: 2280,
    birthYear: 1994,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 29,
    rallyPattern: "NET_APPROACH",
    signaturePattern: "NET_CLOSER",
    naturalSignature: "BH_SLICE_SHORT",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      // CORPO — resistente, não explosivo
      velocidade: 76,
      explosividade: 74,
      resistencia: 88,
      defesa: 84,
      // GOLPES — BH controle e slice como armas
      fhPotencia: 68,
      fhControle: 88,
      bhPotencia: 72,
      bhControle: 90,
      topspin: 72,
      slice: 92,
      // SAQUE & RETORNO — devolução sólida
      saqueForca: 66,
      saquePrecisao: 78,
      devolucao: 82,
      // REDE — raramente
      volley: 52,
      smash: 50,
      // LEITURA — leitura alta, tática paciente
      leitura: 86,
      visaoTatica: 68,
      // CABEÇA — consistente e resiliente
      mentalidade: 78,
      regularidade: 82,
      recuperacao: 80,
      adaptacao: 74
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "PROACTIVE",
      rallyCadence: "EXPLOSIVE",
      riskProfile: "SAFE",
      adaptability: 76
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── DUBOIS  |  FRA  |  AGG_BASELINER  ────────────────
  DUBOIS: {
    id: "DUBOIS",
    photo: "https://files.catbox.moe/pl0k4m.png",
    name: "Dubois",
    nickname: "Le Chasseur",
    nationality: "FRA",
    age: 22,
    height: 1.82,
    weight: 77,
    styleId: "AGG_BASELINER",
    color: "#4488FF",
    tagline: "Menos genial, mais confi\xE1vel \u2014 e mais perigoso.",
    bio: "O parceiro de treino de Delacroix que n\xE3o quis ficar \xE0 sombra. Forehand mais controlado que o do compatriota, menos genial mas mais confi\xE1vel. A escola francesa produziu mais um.",
    career: "Pro desde 2022. Primeiro title ATP 500 aos 21 anos no Torneio de Casablanca. Curva de ascens\xE3o \xEDngreme.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 38,
    initialPts: 1940,
    birthYear: 2003,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 26,
    rallyPattern: "AGGRESSIVE_EARLY",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "FH_INSIDE_OUT",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      // CORPO — atleticamente equilibrado
      velocidade: 82,
      explosividade: 80,
      resistencia: 80,
      defesa: 78,
      // GOLPES — BH ligeiramente mais forte que FH
      fhPotencia: 78,
      fhControle: 82,
      bhPotencia: 80,
      bhControle: 84,
      topspin: 80,
      slice: 82,
      // SAQUE & RETORNO — saque de colocação
      saqueForca: 76,
      saquePrecisao: 82,
      devolucao: 78,
      // REDE — net game elegante
      volley: 76,
      smash: 72,
      // LEITURA — tático e inteligente
      leitura: 84,
      visaoTatica: 80,
      // CABEÇA — adapta bem, leve inconsistência
      mentalidade: 76,
      regularidade: 78,
      recuperacao: 74,
      adaptacao: 82
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "HUNTER",
      rallyCadence: "EXPLOSIVE",
      riskProfile: "SAFE",
      adaptability: 69
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── BERGLUND  |  SWE  |  ALL_COURT  ────────────────
  BERGLUND: {
    id: "BERGLUND",
    photo: "https://files.catbox.moe/bd1vsp.png",
    name: "Berglund",
    nickname: "Sn\xF6storm",
    nationality: "SWE",
    age: 27,
    height: 1.88,
    weight: 84,
    styleId: "GRINDER",
    color: "#0066AA",
    tagline: "Perigoso em qualquer semana, em qualquer quadra.",
    bio: "O sueco moderno. N\xE3o tem a eleg\xE2ncia dos escandinavos cl\xE1ssicos \u2014 \xE9 direto, agressivo na constru\xE7\xE3o de ponto, mas sabe quando ir \xE0 rede. Bom em todas as superf\xEDcies, excepcional em nenhuma. Isso o torna perigoso em qualquer semana.",
    career: "Top 20 desde 2022. Os dois Masters s\xE3o em surfaces diferentes \u2014 prova de adaptabilidade.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 16,
    initialPts: 4580,
    birthYear: 1998,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "DROP_SHOT",
    rallyPattern: "CENTRE_CONTROL",
    signaturePattern: "DEEP_COURT_GRINDER",
    naturalSignature: "BH_LIFT",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 83,
      explosividade: 78,
      resistencia: 81,
      defesa: 81,
      fhPotencia: 82,
      fhControle: 85,
      bhPotencia: 80,
      bhControle: 85,
      topspin: 81,
      slice: 85,
      saqueForca: 83,
      saquePrecisao: 83,
      devolucao: 80,
      volley: 79,
      smash: 78,
      leitura: 81,
      visaoTatica: 75,
      mentalidade: 83,
      regularidade: 86,
      recuperacao: 88,
      adaptacao: 79
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "OPPORTUNIST",
      rallyCadence: "EXPLOSIVE",
      riskProfile: "GAMBLER",
      adaptability: 82
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── HENRIKSEN  |  DEN  |  AGG_BASELINER  ────────────────
  HENRIKSEN: {
    id: "HENRIKSEN",
    photo: "https://files.catbox.moe/81hpfp.png",
    name: "Henriksen",
    nickname: "Tornado",
    nationality: "DEN",
    age: 24,
    height: 1.87,
    weight: 80,
    styleId: "BIG_SERVER",
    color: "#CC0000",
    tagline: "Ataca desde o primeiro ball. Sempre.",
    bio: "Compatriota de Kasperk com estilo oposto. Enquanto o veterano defende e espera, Henriksen ataca de dentro da linha de base desde o primeiro ball. Energia jovem demais ainda, erros que custam sets.",
    career: "Pro 2021. Curva positiva. A escola dinamarquesa produzindo em s\xE9rie.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 33,
    initialPts: 2240,
    birthYear: 2001,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "SHORT_ANGLE_FH",
    rallyPattern: "CROSS_HEAVY",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "SERVE_FLAT_BOMB",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 76,
      explosividade: 79,
      resistencia: 76,
      defesa: 67,
      fhPotencia: 86,
      fhControle: 63,
      bhPotencia: 73,
      bhControle: 61,
      topspin: 86,
      slice: 59,
      saqueForca: 77,
      saquePrecisao: 68,
      devolucao: 59,
      volley: 51,
      smash: 53,
      leitura: 74,
      visaoTatica: 78,
      mentalidade: 67,
      regularidade: 66,
      recuperacao: 71,
      adaptacao: 70
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "AVOIDS",
      rallyCadence: "EXPLOSIVE",
      riskProfile: "GAMBLER",
      adaptability: 70
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── RICHTER  |  GER  |  BIG_SERVER  ────────────────
  RICHTER: {
    id: "RICHTER",
    photo: "https://files.catbox.moe/xukqks.png",
    name: "Richter",
    nickname: "Der Sturm",
    nationality: "GER",
    age: 25,
    height: 2.02,
    weight: 98,
    styleId: "BIG_SERVER",
    color: "#CCCCCC",
    tagline: "O saque mais r\xE1pido da Europa continental.",
    bio: "Saque mais r\xE1pido da Europa continental. 2.02m de pura propuls\xE3o. O jogo de fundo ainda engatinha mas na grama e indoor a arma do saque d\xE1 tempo de desenvolver o restante.",
    career: "Chegou ao tour com 21 anos destruindo qualifyings em grama. Ainda em constru\xE7\xE3o.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 26,
    initialPts: 2820,
    birthYear: 2e3,
    potential: "ELITE",
    developmentStyle: "LATE_BLOOMER",
    peakAge: 28,
    signatureShot: "BIG_SERVE",
    rallyPattern: "SERVE_PLUS_ONE",
    signaturePattern: "SERVE_COMMANDER",
    naturalSignature: "SERVE_SLICE_WIDE",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 62,
      explosividade: 75,
      resistencia: 70,
      defesa: 56,
      fhPotencia: 85,
      fhControle: 48,
      bhPotencia: 69,
      bhControle: 44,
      topspin: 54,
      slice: 48,
      saqueForca: 89,
      saquePrecisao: 75,
      devolucao: 48,
      volley: 54,
      smash: 54,
      leitura: 50,
      visaoTatica: 60,
      mentalidade: 54,
      regularidade: 53,
      recuperacao: 52,
      adaptacao: 54
    },
    prefs: {
      buildStyle: "CROSS_BUILDER",
      netGame: "OPPORTUNIST",
      rallyCadence: "BALANCED",
      riskProfile: "SAFETY_FIRST",
      adaptability: 52
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── PAPADIMITRIOU  |  GRE  |  RETRIEVER  ────────────────
  PAPADIMITRIOU: {
    id: "PAPADIMITRIOU",
    photo: "https://files.catbox.moe/ejvkmj.png",
    name: "Papadimitriou",
    nickname: "Olimpiakos",
    nationality: "GRE",
    age: 26,
    height: 1.8,
    weight: 74,
    styleId: "CTR_PUNCHER",
    color: "#FF3333",
    tagline: "O herdeiro da escola grega de defesa.",
    bio: "Disc\xEDpulo assumido de Petrakis \u2014 mesma escola de defesa e paci\xEAncia. O mestre grego disse que Papadimitriou tem melhor forehand. O disc\xEDpulo ainda n\xE3o acredita, mas o ranking est\xE1 subindo.",
    career: "Pro 2021. Aprendeu com os melhores e est\xE1 aplicando. Semifinalista em dois Masters de saibro.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 44,
    initialPts: 1640,
    birthYear: 1999,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "DROP_SHOT",
    rallyPattern: "CENTRE_CONTROL",
    signaturePattern: "DEEP_COURT_GRINDER",
    naturalSignature: "BH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 84,
      explosividade: 72,
      resistencia: 88,
      defesa: 87,
      fhPotencia: 50,
      fhControle: 87,
      bhPotencia: 58,
      bhControle: 91,
      topspin: 63,
      slice: 76,
      saqueForca: 56,
      saquePrecisao: 66,
      devolucao: 80,
      volley: 56,
      smash: 58,
      leitura: 82,
      visaoTatica: 54,
      mentalidade: 83,
      regularidade: 85,
      recuperacao: 85,
      adaptacao: 82
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "PROACTIVE",
      rallyCadence: "MEASURED",
      riskProfile: "SAFETY_FIRST",
      adaptability: 83
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── LINDSTRÖM  |  SWE  |  ALL_COURT  ────────────────
  LINDSTR\u00D6M: {
    id: "LINDSTR\xD6M",
    name: "Lindstr\xF6m",
    nickname: "Is",
    nationality: "SWE",
    age: 20,
    height: 1.85,
    weight: 79,
    styleId: "CTR_PUNCHER",
    color: "#00AAFF",
    tagline: "O circuito acaba de conhecer o nome.",
    bio: "18 meses atr\xE1s ainda estava na escola. Hoje bate em jogadores do top 30 em dias bons. A maturidade t\xE9cnica \xE9 assustadora para a idade. O circuito acaba de conhecer seu nome.",
    career: "Pro 2024. Dois t\xEDtulos ATP 250 na primeira temporada. Su\xE9cia em modo euforia.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 72,
    initialPts: 820,
    birthYear: 2005,
    potential: "ELITE",
    developmentStyle: "EARLY_BLOOMER",
    peakAge: 25,
    signatureShot: "DTL_BH",
    rallyPattern: "RHYTHM_DISRUPTION",
    signaturePattern: "SLICE_DISRUPTOR",
    naturalSignature: "BH_TOPSPIN_CROSS",
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 72,
      explosividade: 69,
      resistencia: 70,
      defesa: 74,
      fhPotencia: 68,
      fhControle: 79,
      bhPotencia: 77,
      bhControle: 84,
      topspin: 70,
      slice: 74,
      saqueForca: 68,
      saquePrecisao: 77,
      devolucao: 72,
      volley: 67,
      smash: 70,
      leitura: 70,
      visaoTatica: 66,
      mentalidade: 72,
      regularidade: 75,
      recuperacao: 72,
      adaptacao: 68
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── CASTILLO_MARCOS  |  ESP  |  CTR_PUNCHER  ────────────────
  CASTILLO_MARCOS: {
    id: "CASTILLO_MARCOS",
    photo: "https://files.catbox.moe/tu5k0x.png",
    name: "Castillo",
    nickname: "El Maestro",
    nationality: "ESP",
    age: 34,
    height: 1.83,
    weight: 78,
    styleId: "CTR_PUNCHER",
    color: "#AA0000",
    tagline: "Quatro semifinais em Roland. O Grande ainda espera.",
    bio: "O espanhol que nunca ganhou Roland \u2014 a ironia maior do circuito. Chegou em quatro semifinais. O saibro de casa \xE9 onde vive, mas os anos cobram a conta. Cada temporada pode ser a \xFAltima, cada uma supera as expectativas.",
    career: "Profissional desde 2009. 16 anos de alto n\xEDvel. Quatro Masters de saibro, sem o Grande. \xCDcone espanhol.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 48,
    initialPts: 1480,
    birthYear: 1991,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 29,
    signatureShot: "TOPSPIN_CROSS",
    rallyPattern: "RHYTHM_DISRUPTION",
    signaturePattern: "BH_WALL",
    naturalSignature: "BH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 70,
      explosividade: 62,
      resistencia: 85,
      defesa: 77,
      fhPotencia: 68,
      fhControle: 84,
      bhPotencia: 77,
      bhControle: 93,
      topspin: 68,
      slice: 85,
      saqueForca: 64,
      saquePrecisao: 73,
      devolucao: 78,
      volley: 62,
      smash: 56,
      leitura: 79,
      visaoTatica: 65,
      mentalidade: 81,
      regularidade: 83,
      recuperacao: 84,
      adaptacao: 80
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "OPPORTUNIST",
      rallyCadence: "EXPLOSIVE",
      riskProfile: "SAFE",
      adaptability: 80
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── SAUVAGE  |  FRA  |  TAKEALLRISK  ────────────────
  SAUVAGE: {
    id: "SAUVAGE",
    photo: "https://files.catbox.moe/jze4r7.png",
    name: "Sauvage",
    nickname: "Le Sauvage",
    nationality: "FRA",
    age: 29,
    height: 1.81,
    weight: 77,
    styleId: "TAKEALLRISK",
    color: "#FF4499",
    tagline: "Pontos que deveriam ser perdidos, ele ganha.",
    bio: "O primo mais perigoso de Delacroix. Menos genial, mais constante \u2014 mas a agressividade decis\xF3ria continua absurda. Pontos que deveriam ser perdidos, ele ganha. Coloca a d\xFAvida em qualquer advers\xE1rio.",
    career: "Carreira de m\xE9dio prazo ainda sem picos altos mas com consist\xEAncia crescente. Top 40 por 3 anos.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 39,
    initialPts: 1900,
    birthYear: 1996,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 29,
    signatureShot: "DROP_SHOT",
    rallyPattern: "SHORT_ANGLE_BUILDER",
    signaturePattern: "SHORT_ANGLE_ASSASSIN",
    naturalSignature: "FH_FLAT_BOMB",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 78,
      explosividade: 82,
      resistencia: 61,
      defesa: 54,
      fhPotencia: 91,
      fhControle: 42,
      bhPotencia: 71,
      bhControle: 37,
      topspin: 78,
      slice: 71,
      saqueForca: 74,
      saquePrecisao: 53,
      devolucao: 40,
      volley: 59,
      smash: 58,
      leitura: 32,
      visaoTatica: 58,
      mentalidade: 45,
      regularidade: 41,
      recuperacao: 42,
      adaptacao: 42
    },
    prefs: {
      buildStyle: "CROSS_BUILDER",
      netGame: "AVOIDS",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "GAMBLER",
      adaptability: 39
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── NZINGA  |  BEL  |  ALL_COURT  ────────────────
  NZINGA: {
    id: "NZINGA",
    photo: "https://files.catbox.moe/2at0ff.png",
    name: "Nzinga",
    nickname: "Leopard",
    nationality: "BEL",
    age: 27,
    height: 1.89,
    weight: 83,
    styleId: "ALL_COURT",
    color: "#FFD700",
    tagline: "Atletismo africano, intelig\xEAncia t\xE1tica europeia.",
    bio: "Belga de origem congolesa. Combina o atletismo africano com a intelig\xEAncia t\xE1tica europeia. Indoor \xE9 seu habitat \u2014 as Finals Indoor s\xE3o um sonho recorrente.",
    career: "Pro 2019. Top 30 desde 2022. O Masters Capital Indoor 2024 foi o divisor de \xE1guas.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 30,
    initialPts: 2560,
    birthYear: 1998,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 28,
    signatureShot: "DROP_SHOT",
    rallyPattern: "DTL_HUNTER",
    signaturePattern: "SLICE_DISRUPTOR",
    naturalSignature: "BH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 78,
      explosividade: 75,
      resistencia: 76,
      defesa: 83,
      fhPotencia: 78,
      fhControle: 81,
      bhPotencia: 76,
      bhControle: 81,
      topspin: 76,
      slice: 80,
      saqueForca: 81,
      saquePrecisao: 75,
      devolucao: 73,
      volley: 76,
      smash: 74,
      leitura: 76,
      visaoTatica: 75,
      mentalidade: 78,
      regularidade: 81,
      recuperacao: 78,
      adaptacao: 78
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "OPPORTUNIST",
      rallyCadence: "PATIENT",
      riskProfile: "GAMBLER",
      adaptability: 77
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── MOREAU  |  FRA  |  RETRIEVER  ────────────────
  MOREAU: {
    id: "MOREAU",
    photo: "https://files.catbox.moe/6i1h7z.png",
    name: "Moreau",
    nickname: "Le Mur",
    nationality: "FRA",
    age: 32,
    height: 1.83,
    weight: 76,
    styleId: "GRINDER",
    color: "#8899AA",
    tagline: "Defende tudo. Vence pela exaust\xE3o do advers\xE1rio.",
    bio: "Parceiro de treino hist\xF3rico de Delacroix. O polo oposto: defende tudo, n\xE3o arrisca nada, vence pela exaust\xE3o do advers\xE1rio. Os jovens franceses o respeitam como ningu\xE9m.",
    career: "12 anos de top 60. Ainda rendendo contra os jovens pela experi\xEAncia e resist\xEAncia.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 54,
    initialPts: 1280,
    birthYear: 1993,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 28,
    signatureShot: "DTL_BH",
    rallyPattern: "DEEP_GRINDER",
    signaturePattern: "BH_WALL",
    naturalSignature: "BH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 85,
      explosividade: 73,
      resistencia: 90,
      defesa: 88,
      fhPotencia: 57,
      fhControle: 86,
      bhPotencia: 54,
      bhControle: 87,
      topspin: 64,
      slice: 77,
      saqueForca: 61,
      saquePrecisao: 69,
      devolucao: 82,
      volley: 62,
      smash: 57,
      leitura: 83,
      visaoTatica: 57,
      mentalidade: 84,
      regularidade: 87,
      recuperacao: 82,
      adaptacao: 82
    },
    prefs: {
      buildStyle: "CROSS_BUILDER",
      netGame: "AVOIDS",
      rallyCadence: "PATIENT",
      riskProfile: "GAMBLER",
      adaptability: 84
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── HAAKONSEN  |  NOR  |  BIG_SERVER  ────────────────
  HAAKONSEN: {
    id: "HAAKONSEN",
    photo: "https://files.catbox.moe/0xb9ds.png",
    name: "Haakonsen",
    nickname: "Viking",
    nationality: "NOR",
    age: 31,
    height: 1.95,
    weight: 92,
    styleId: "SRV_VOL",
    color: "#002868",
    tagline: "Ganha torneios que n\xE3o deveria ganhar.",
    bio: "Companheiro de treino de Bjornstad por anos. Nunca chegou \xE0 mesma altitude mas o saque ainda choca oponentes na grama. Ganha torneios que n\xE3o deveria ganhar.",
    career: "10 anos de carreira s\xF3lida. Provavelmente 2-3 temporadas finais ainda produtivas.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 58,
    initialPts: 1160,
    birthYear: 1994,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 28,
    signatureShot: "FLAT_WINNER",
    rallyPattern: "AGGRESSIVE_EARLY",
    signaturePattern: "NET_CLOSER",
    naturalSignature: "SERVE_FLAT_BOMB",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 60,
      explosividade: 73,
      resistencia: 68,
      defesa: 61,
      fhPotencia: 78,
      fhControle: 51,
      bhPotencia: 74,
      bhControle: 55,
      topspin: 53,
      slice: 47,
      saqueForca: 81,
      saquePrecisao: 85,
      devolucao: 51,
      volley: 57,
      smash: 55,
      leitura: 49,
      visaoTatica: 61,
      mentalidade: 52,
      regularidade: 52,
      recuperacao: 50,
      adaptacao: 50
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "RELUCTANT",
      rallyCadence: "BALANCED",
      riskProfile: "SAFETY_FIRST",
      adaptability: 51
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── GUTTMANN  |  AUT  |  ALL_COURT  ────────────────
  GUTTMANN: {
    id: "GUTTMANN",
    photo: "https://files.catbox.moe/seiwr5.png",
    name: "Guttmann",
    nickname: "F\xFCchslein",
    nationality: "AUT",
    age: 21,
    height: 1.84,
    weight: 79,
    styleId: "ADPT_TAC",
    color: "#CC2222",
    tagline: "Ainda descobrindo quem \xE9. O potencial n\xE3o espera.",
    bio: "Austr\xEDaco que aprendeu em academias ao redor do mundo. T\xE9cnica polida, sem estilo \xFAnico ainda \u2014 ainda descobrindo quem \xE9 como tenista. O potencial ELITE est\xE1 no radar dos analistas.",
    career: "Pro 2024. Primeira temporada promissora.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 61,
    initialPts: 1080,
    birthYear: 2004,
    potential: "ELITE",
    developmentStyle: "EARLY_BLOOMER",
    peakAge: 25,
    signatureShot: "BANANA_BH",
    rallyPattern: "DTL_HUNTER",
    signaturePattern: "LATE_MATCH_HUNTER",
    naturalSignature: "VOLLEY_ANGLE",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 72,
      explosividade: 69,
      resistencia: 70,
      defesa: 75,
      fhPotencia: 70,
      fhControle: 75,
      bhPotencia: 72,
      bhControle: 79,
      topspin: 70,
      slice: 74,
      saqueForca: 76,
      saquePrecisao: 68,
      devolucao: 69,
      volley: 71,
      smash: 68,
      leitura: 70,
      visaoTatica: 69,
      mentalidade: 72,
      regularidade: 75,
      recuperacao: 75,
      adaptacao: 72
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "OPPORTUNIST",
      rallyCadence: "EXPLOSIVE",
      riskProfile: "CALCULATED",
      adaptability: 71
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── PETROV  |  RUS  |  CTR_PUNCHER  ────────────────
  PETROV: {
    id: "PETROV",
    photo: "https://files.catbox.moe/7pttkg.png",
    name: "Petrov",
    nickname: "Sibirsk",
    nationality: "RUS",
    age: 26,
    height: 1.87,
    weight: 84,
    styleId: "CTR_PUNCHER",
    color: "#4466AA",
    tagline: "Cada ponto constru\xEDdo como uma armadilha.",
    bio: "O Volkov das fases iniciais de torneio. Joga feio mas eficaz \u2014 cada ponto constru\xEDdo como uma armadilha. Counter-punch com timing frustrante para advers\xE1rios agressivos.",
    career: "Pro 2021. Subiu r\xE1pido e estabilizou no top 30. Parceiro de treino de Volkov.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 25,
    initialPts: 3020,
    birthYear: 1999,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "DROP_SHOT",
    rallyPattern: "DEFENSIVE_BASE",
    signaturePattern: "DEEP_COURT_GRINDER",
    naturalSignature: "DROP_HIDDEN",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 73,
      explosividade: 65,
      resistencia: 88,
      defesa: 81,
      fhPotencia: 70,
      fhControle: 90,
      bhPotencia: 76,
      bhControle: 93,
      topspin: 71,
      slice: 88,
      saqueForca: 70,
      saquePrecisao: 82,
      devolucao: 80,
      volley: 58,
      smash: 63,
      leitura: 82,
      visaoTatica: 61,
      mentalidade: 84,
      regularidade: 86,
      recuperacao: 83,
      adaptacao: 85
    },
    prefs: {
      buildStyle: "CROSS_BUILDER",
      netGame: "PROACTIVE",
      rallyCadence: "PATIENT",
      riskProfile: "CALCULATED",
      adaptability: 83
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── KONDRASHOV  |  UKR  |  AGG_BASELINER  ────────────────
  KONDRASHOV: {
    id: "KONDRASHOV",
    photo: "https://files.catbox.moe/b6pe0y.png",
    name: "Kondrashov",
    nickname: "Ukr",
    nationality: "UKR",
    age: 24,
    height: 1.85,
    weight: 80,
    styleId: "PWR_BASE",
    color: "#0057B7",
    tagline: "Carrega o peso de um pa\xEDs em cada golpe.",
    bio: "Ucraniano que carrega o peso de seu pa\xEDs em cada ponto. Joga com emo\xE7\xE3o bruta, forehand de alta pot\xEAncia, e uma intensidade que impressiona advers\xE1rios experientes.",
    career: "Revelado no circuito de challenger em 2022. Top 40 com 24 anos.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 40,
    initialPts: 1880,
    birthYear: 2001,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "FLAT_WINNER",
    rallyPattern: "CROSS_HEAVY",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "FH_FLAT_BOMB",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 75,
      explosividade: 78,
      resistencia: 75,
      defesa: 66,
      fhPotencia: 83,
      fhControle: 67,
      bhPotencia: 71,
      bhControle: 58,
      topspin: 85,
      slice: 58,
      saqueForca: 73,
      saquePrecisao: 67,
      devolucao: 62,
      volley: 46,
      smash: 51,
      leitura: 73,
      visaoTatica: 77,
      mentalidade: 65,
      regularidade: 64,
      recuperacao: 62,
      adaptacao: 73
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "RELUCTANT",
      rallyCadence: "PATIENT",
      riskProfile: "SAFE",
      adaptability: 69
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── RODRIGUES_P  |  POR  |  CTR_PUNCHER  ────────────────
  RODRIGUES_P: {
    id: "RODRIGUES_P",
    photo: "https://files.catbox.moe/casrua.png",
    name: "Rodrigues",
    nickname: "Cascata",
    nationality: "POR",
    age: 25,
    height: 1.83,
    weight: 77,
    styleId: "GRINDER",
    color: "#006600",
    tagline: "O slice do Tejo \u2014 preciso, incessante.",
    bio: "Portugal colocou seu primeiro top 50 em uma d\xE9cada. Rodrigues defende com o slice do Tejo \u2014 preciso, incessante. A torcida lisboeta vai ao del\xEDrio.",
    career: "Top 50 desde 2024. Caminho aberto na Europa do sul.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 45,
    initialPts: 1620,
    birthYear: 2e3,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "DTL_BH",
    rallyPattern: "RHYTHM_DISRUPTION",
    signaturePattern: "BH_WALL",
    naturalSignature: "BH_LIFT",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 69,
      explosividade: 61,
      resistencia: 84,
      defesa: 78,
      fhPotencia: 72,
      fhControle: 85,
      bhPotencia: 69,
      bhControle: 88,
      topspin: 67,
      slice: 84,
      saqueForca: 71,
      saquePrecisao: 69,
      devolucao: 79,
      volley: 55,
      smash: 56,
      leitura: 78,
      visaoTatica: 61,
      mentalidade: 81,
      regularidade: 84,
      recuperacao: 85,
      adaptacao: 76
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "RELUCTANT",
      rallyCadence: "EXPLOSIVE",
      riskProfile: "GAMBLER",
      adaptability: 80
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── BIANCHI  |  ITA  |  TAKEALLRISK  ────────────────
  BIANCHI: {
    id: "BIANCHI",
    photo: "https://files.catbox.moe/jb5fy9.png",
    name: "Bianchi",
    nickname: "Artista",
    nationality: "ITA",
    age: 30,
    height: 1.82,
    weight: 78,
    styleId: "TACT_TEC",
    color: "#0080FF",
    tagline: "Nos dias certos, destr\xF3i qualquer um.",
    bio: "O italiano mais imprevis\xEDvel depois de Delacroix. Com 30 anos o estilo TAKEALLRISK cobra mais erros que antes, mas em dias certos ainda destr\xF3i qualquer um.",
    career: "Carreira irregular, picos altos e vales profundos. O #28 em 2022 ainda \xE9 o melhor.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 62,
    initialPts: 1060,
    birthYear: 1995,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 26,
    signatureShot: "INSIDE_OUT_FH",
    rallyPattern: "DTL_HUNTER",
    signaturePattern: "SHORT_ANGLE_ASSASSIN",
    naturalSignature: "DROP_HIDDEN",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 75,
      explosividade: 79,
      resistencia: 59,
      defesa: 58,
      fhPotencia: 73,
      fhControle: 39,
      bhPotencia: 83,
      bhControle: 46,
      topspin: 75,
      slice: 68,
      saqueForca: 57,
      saquePrecisao: 69,
      devolucao: 45,
      volley: 62,
      smash: 58,
      leitura: 31,
      visaoTatica: 60,
      mentalidade: 44,
      regularidade: 40,
      recuperacao: 42,
      adaptacao: 36
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "OPPORTUNIST",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "SAFE",
      adaptability: 38
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── WAGNER  |  CHE  |  ALL_COURT  ────────────────
  WAGNER: {
    id: "WAGNER",
    photo: "https://files.catbox.moe/7k6afk.png",
    name: "Wagner",
    nickname: "Sturm",
    nationality: "CHE",
    age: 28,
    height: 1.86,
    weight: 81,
    styleId: "ALL_COURT",
    color: "#FF0000",
    tagline: "T\xE9cnica su\xED\xE7a \u2014 refinada at\xE9 o \xFAltimo detalhe.",
    bio: "Su\xED\xE7o de escola cl\xE1ssica. T\xE9cnica refinada, saque preciso, indoor \xE9 onde brilha mais. N\xE3o chega ao n\xEDvel de Nakamura na bola mas a variedade de golpes \xE9 admir\xE1vel.",
    career: "Dois Masters Indoor consecutivos. Top 25 est\xE1vel por 3 anos.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 23,
    initialPts: 3220,
    birthYear: 1997,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 28,
    signatureShot: "DROP_SHOT",
    rallyPattern: "NET_APPROACH",
    signaturePattern: "SHORT_ANGLE_ASSASSIN",
    naturalSignature: "BH_SLICE_DEEP",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 80,
      explosividade: 76,
      resistencia: 78,
      defesa: 86,
      fhPotencia: 77,
      fhControle: 86,
      bhPotencia: 78,
      bhControle: 89,
      topspin: 78,
      slice: 82,
      saqueForca: 85,
      saquePrecisao: 77,
      devolucao: 74,
      volley: 75,
      smash: 78,
      leitura: 78,
      visaoTatica: 73,
      mentalidade: 80,
      regularidade: 84,
      recuperacao: 77,
      adaptacao: 76
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "OPPORTUNIST",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "CALCULATED",
      adaptability: 79
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── BAKKE  |  NOR  |  ALL_COURT  ────────────────
  BAKKE: {
    id: "BAKKE",
    photo: "https://files.catbox.moe/39shkl.png",
    name: "Bakke",
    nickname: "Nordlys",
    nationality: "NOR",
    age: 22,
    height: 1.87,
    weight: 83,
    styleId: "NET_SPEC",
    color: "#3366CC",
    tagline: "Os peda\xE7os est\xE3o todos ali. O conjunto \xE9 quest\xE3o de tempo.",
    bio: "O pa\xEDs n\xF3rdico continua exportando talentos. Bakke tem a estabilidade de Bjornstad e a energia de uma gera\xE7\xE3o nova. Ainda est\xE1 construindo o jogo, mas os peda\xE7os est\xE3o todos ali.",
    career: "Pro 2023. Tr\xEAs 250s j\xE1 no second season. Noruega celebra.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 50,
    initialPts: 1360,
    birthYear: 2003,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 26,
    signatureShot: "SHORT_ANGLE_FH",
    rallyPattern: "NET_APPROACH",
    signaturePattern: "NET_CLOSER",
    naturalSignature: "VOLLEY_PUNCH",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 73,
      explosividade: 70,
      resistencia: 71,
      defesa: 71,
      fhPotencia: 73,
      fhControle: 77,
      bhPotencia: 71,
      bhControle: 81,
      topspin: 71,
      slice: 75,
      saqueForca: 72,
      saquePrecisao: 74,
      devolucao: 67,
      volley: 73,
      smash: 72,
      leitura: 71,
      visaoTatica: 69,
      mentalidade: 73,
      regularidade: 76,
      recuperacao: 71,
      adaptacao: 75
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "RELUCTANT",
      rallyCadence: "BALANCED",
      riskProfile: "GAMBLER",
      adaptability: 72
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── LECHNER  |  AUT  |  SRV_VOL  ────────────────
  LECHNER: {
    id: "LECHNER",
    photo: "https://files.catbox.moe/ufwfpk.png",
    name: "Lechner",
    nickname: "Alpengeist",
    nationality: "AUT",
    age: 29,
    height: 1.9,
    weight: 87,
    styleId: "SRV_VOL",
    color: "#CC8800",
    tagline: "A intelig\xEAncia de saber quando n\xE3o subir \xE0 rede.",
    bio: "Serve-volleyer austr\xEDaco que encontrou seu nicho na grama europeia. Saque potente, volley t\xE9cnico, e a intelig\xEAncia de saber quando n\xE3o subir. Funciona bem com ou sem Wimbledon.",
    career: "10 anos de especializa\xE7\xE3o em grama. Top 45 consistente.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 42,
    initialPts: 1760,
    birthYear: 1996,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 29,
    signatureShot: "VOLLEY_FINISH",
    rallyPattern: "SERVE_PLUS_ONE",
    signaturePattern: "NET_CLOSER",
    naturalSignature: "SERVE_KICK_HIGH",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 75,
      explosividade: 81,
      resistencia: 64,
      defesa: 66,
      fhPotencia: 63,
      fhControle: 62,
      bhPotencia: 63,
      bhControle: 65,
      topspin: 51,
      slice: 70,
      saqueForca: 87,
      saquePrecisao: 91,
      devolucao: 58,
      volley: 81,
      smash: 80,
      leitura: 68,
      visaoTatica: 68,
      mentalidade: 60,
      regularidade: 61,
      recuperacao: 64,
      adaptacao: 66
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "PROACTIVE",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "SAFE",
      adaptability: 64
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── VANDENBERGHE  |  BEL  |  CTR_PUNCHER  ────────────────
  VANDENBERGHE: {
    id: "VANDENBERGHE",
    photo: "https://files.catbox.moe/98adjb.png",
    name: "Vandenberghe",
    nickname: "Le Flamand",
    nationality: "BEL",
    age: 33,
    height: 1.87,
    weight: 84,
    styleId: "ALL_COURT",
    color: "#007733",
    tagline: "Cada vit\xF3ria recebida com rever\xEAncia no vesti\xE1rio.",
    bio: "O veterano belga que recusa se aposentar. Counter-punch inteligente ainda funcionando contra os mais jovens. Cada vit\xF3ria dele \xE9 recebida com rever\xEAncia no vesti\xE1rio.",
    career: "14 anos de carreira. Pico em #19 em 2018. Em decl\xEDnio gracioso.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 68,
    initialPts: 920,
    birthYear: 1992,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 30,
    signatureShot: "DROP_SHOT",
    rallyPattern: "DEFENSIVE_BASE",
    signaturePattern: "SHORT_ANGLE_ASSASSIN",
    naturalSignature: "FH_SHORT_ANGLE",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 69,
      explosividade: 61,
      resistencia: 84,
      defesa: 80,
      fhPotencia: 69,
      fhControle: 84,
      bhPotencia: 71,
      bhControle: 85,
      topspin: 67,
      slice: 84,
      saqueForca: 69,
      saquePrecisao: 71,
      devolucao: 76,
      volley: 60,
      smash: 56,
      leitura: 78,
      visaoTatica: 61,
      mentalidade: 80,
      regularidade: 82,
      recuperacao: 84,
      adaptacao: 83
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "HUNTER",
      rallyCadence: "PATIENT",
      riskProfile: "SAFETY_FIRST",
      adaptability: 79
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── MORALES_ESP  |  ESP  |  AGG_BASELINER  ────────────────
  MORALES_ESP: {
    id: "MORALES_ESP",
    photo: "https://files.catbox.moe/440pwr.png",
    name: "Morales",
    nickname: "Torero",
    nationality: "ESP",
    age: 27,
    height: 1.88,
    weight: 84,
    styleId: "AGG_BASELINER",
    color: "#AA0000",
    tagline: "Cada temporada fica mais perto do Slam.",
    bio: "O pr\xF3ximo grande espanhol. Forehand de rota\xE7\xE3o pesada, f\xEDsico privilegiado, e a ra\xE7a da escola de saibro espanhola. Ainda sem Slam mas cada temporada fica mais perto.",
    career: "Pro 2019. Top 20 desde 2023. Tr\xEAs Masters de saibro em sequ\xEAncia.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 20,
    initialPts: 3660,
    birthYear: 1998,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 28,
    signatureShot: "INSIDE_OUT_FH",
    rallyPattern: "SHORT_ANGLE_BUILDER",
    signaturePattern: "SERVE_COMMANDER",
    naturalSignature: "FH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 80,
      explosividade: 83,
      resistencia: 80,
      defesa: 79,
      fhPotencia: 94,
      fhControle: 69,
      bhPotencia: 79,
      bhControle: 65,
      topspin: 90,
      slice: 62,
      saqueForca: 72,
      saquePrecisao: 78,
      devolucao: 67,
      volley: 51,
      smash: 56,
      leitura: 78,
      visaoTatica: 82,
      mentalidade: 69,
      regularidade: 68,
      recuperacao: 68,
      adaptacao: 72
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "RELUCTANT",
      rallyCadence: "PATIENT",
      riskProfile: "CALCULATED",
      adaptability: 73
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── SCHREIBER  |  GER  |  RETRIEVER  ────────────────
  SCHREIBER: {
    id: "SCHREIBER",
    photo: "https://files.catbox.moe/39f0uc.png",
    name: "Schreiber",
    nickname: "Uhr",
    nationality: "GER",
    age: 35,
    height: 1.81,
    weight: 76,
    styleId: "TACT_TEC",
    color: "#888888",
    tagline: "15 anos de pr\xE1tica ensinam onde a bola vai.",
    bio: "35 anos, ainda competindo. O circuito o conhece de mem\xF3ria. Os jovens n\xE3o conseguem entender como ele ainda ganha partidas. A resposta \xE9 que 15 anos de pr\xE1tica ensinaram onde cada bola vai antes de ser jogada.",
    career: "16 anos de profissionalismo. Pico em #38. Um \xEDcone de longevidade.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 91,
    initialPts: 540,
    birthYear: 1990,
    potential: "COMUM",
    developmentStyle: "STEADY",
    peakAge: 28,
    signatureShot: "SLICE_BH",
    rallyPattern: "CENTRE_CONTROL",
    signaturePattern: "SHORT_ANGLE_ASSASSIN",
    naturalSignature: "VOLLEY_ANGLE",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 77,
      explosividade: 66,
      resistencia: 81,
      defesa: 83,
      fhPotencia: 46,
      fhControle: 79,
      bhPotencia: 50,
      bhControle: 84,
      topspin: 58,
      slice: 70,
      saqueForca: 54,
      saquePrecisao: 60,
      devolucao: 71,
      volley: 57,
      smash: 52,
      leitura: 75,
      visaoTatica: 49,
      mentalidade: 75,
      regularidade: 78,
      recuperacao: 75,
      adaptacao: 75
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "PROACTIVE",
      rallyCadence: "MEASURED",
      riskProfile: "ALLOUT",
      adaptability: 75
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── FONTAINE  |  FRA  |  SRV_VOL  ────────────────
  FONTAINE: {
    id: "FONTAINE",
    photo: "https://files.catbox.moe/wtt3pp.png",
    name: "Fontaine",
    nickname: "Oiseau",
    nationality: "FRA",
    age: 23,
    height: 1.87,
    weight: 82,
    styleId: "NET_SPEC",
    color: "#002395",
    tagline: "Sobe \xE0 rede quando conv\xE9m, n\xE3o quando o ritual manda.",
    bio: "A Fran\xE7a tem mais um serve-volleyer. Fontaine aprendeu com os cl\xE1ssicos e modernizou \u2014 sobe \xE0 rede quando conv\xE9m, n\xE3o quando o ritual manda. Grama e indoor s\xE3o o habitat.",
    career: "Pro 2022. Semifinalista em Queens 2024. Trajet\xF3ria s\xF3lida.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 53,
    initialPts: 1300,
    birthYear: 2002,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "BIG_SERVE",
    rallyPattern: "AGGRESSIVE_EARLY",
    signaturePattern: "NET_CLOSER",
    naturalSignature: "VOLLEY_PUNCH",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 74,
      explosividade: 80,
      resistencia: 63,
      defesa: 68,
      fhPotencia: 65,
      fhControle: 61,
      bhPotencia: 62,
      bhControle: 64,
      topspin: 50,
      slice: 69,
      saqueForca: 85,
      saquePrecisao: 77,
      devolucao: 60,
      volley: 78,
      smash: 80,
      leitura: 67,
      visaoTatica: 70,
      mentalidade: 59,
      regularidade: 60,
      recuperacao: 58,
      adaptacao: 66
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "OPPORTUNIST",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "CALCULATED",
      adaptability: 63
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── ERIKSSON  |  SWE  |  CTR_PUNCHER  ────────────────
  ERIKSSON: {
    id: "ERIKSSON",
    photo: "https://files.catbox.moe/1vdblh.png",
    name: "Eriksson",
    nickname: "Bergs\xF6rn",
    nationality: "SWE",
    age: 30,
    height: 1.9,
    weight: 85,
    styleId: "GRINDER",
    color: "#006AA7",
    tagline: "Cada golpe tem prop\xF3sito. Cada posi\xE7\xE3o \xE9 intencional.",
    bio: "O sueco calculista. Constr\xF3i pontos como um engenheiro \u2014 cada golpe tem prop\xF3sito, cada posi\xE7\xE3o no court \xE9 intencional. O counter-punch precisa de paci\xEAncia que ele tem em abund\xE2ncia.",
    career: "Top 30 por quatro temporadas. Dois Masters Hard Court. N\xE3o tem fraqueza \xF3bvia.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 24,
    initialPts: 3140,
    birthYear: 1995,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 29,
    signatureShot: "TOPSPIN_CROSS",
    rallyPattern: "CENTRE_CONTROL",
    signaturePattern: "BH_WALL",
    naturalSignature: "BH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 73,
      explosividade: 65,
      resistencia: 88,
      defesa: 84,
      fhPotencia: 76,
      fhControle: 87,
      bhPotencia: 73,
      bhControle: 85,
      topspin: 71,
      slice: 88,
      saqueForca: 71,
      saquePrecisao: 77,
      devolucao: 81,
      volley: 58,
      smash: 62,
      leitura: 82,
      visaoTatica: 64,
      mentalidade: 85,
      regularidade: 86,
      recuperacao: 87,
      adaptacao: 86
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "HUNTER",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "ALLOUT",
      adaptability: 84
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── SVENSSON  |  SWE  |  ALL_COURT  ────────────────
  SVENSSON: {
    id: "SVENSSON",
    photo: "https://files.catbox.moe/xgnya3.png",
    name: "Svensson",
    nickname: "J\xE4rn",
    nationality: "SWE",
    age: 21,
    height: 1.86,
    weight: 80,
    styleId: "CTR_PUNCHER",
    color: "#0055AA",
    tagline: "21 anos e parece ter 30 de experi\xEAncia.",
    bio: "Terceiro sueco no top 100. A Su\xE9cia ama o t\xEAnis e o t\xEAnis est\xE1 amando a Su\xE9cia de volta. Svensson tem 21 anos e parece ter 30 de experi\xEAncia. Amadurecimento t\xE9cnico precoce.",
    career: "Pro 2023. Segunda temporada muito promissora.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 80,
    initialPts: 700,
    birthYear: 2004,
    potential: "ELITE",
    developmentStyle: "EARLY_BLOOMER",
    peakAge: 25,
    signatureShot: "BANANA_BH",
    rallyPattern: "SHORT_ANGLE_BUILDER",
    signaturePattern: "SLICE_DISRUPTOR",
    naturalSignature: "DROP_HIDDEN",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 71,
      explosividade: 68,
      resistencia: 69,
      defesa: 69,
      fhPotencia: 64,
      fhControle: 75,
      bhPotencia: 77,
      bhControle: 84,
      topspin: 69,
      slice: 73,
      saqueForca: 67,
      saquePrecisao: 73,
      devolucao: 72,
      volley: 69,
      smash: 70,
      leitura: 69,
      visaoTatica: 65,
      mentalidade: 71,
      regularidade: 74,
      recuperacao: 71,
      adaptacao: 69
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "PROACTIVE",
      rallyCadence: "BALANCED",
      riskProfile: "CALCULATED",
      adaptability: 70
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── BARROS_LUCAS  |  POR  |  AGG_BASELINER  ────────────────
  BARROS_LUCAS: {
    id: "BARROS_LUCAS",
    photo: "https://files.catbox.moe/g8ilxz.png",
    name: "Barros",
    nickname: "Falc\xE3o",
    nationality: "POR",
    age: 26,
    height: 1.82,
    weight: 77,
    styleId: "AGG_BASELINER",
    color: "#009900",
    tagline: "Nos dias bons, derruba qualquer coisa.",
    bio: "Portugu\xEAs que aprendeu o forehand no saibro e nunca esqueceu. Joga com ra\xE7a, volume de golpes e uma irregularidade frustrante. Nos dias bons, derruba qualquer coisa.",
    career: "Top 50 desde 2023. Ainda em busca de consist\xEAncia.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 46,
    initialPts: 1600,
    birthYear: 1999,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "TOPSPIN_CROSS",
    rallyPattern: "CROSS_HEAVY",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "FH_FLAT_BOMB",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 74,
      explosividade: 77,
      resistencia: 74,
      defesa: 68,
      fhPotencia: 84,
      fhControle: 66,
      bhPotencia: 69,
      bhControle: 60,
      topspin: 84,
      slice: 57,
      saqueForca: 71,
      saquePrecisao: 67,
      devolucao: 64,
      volley: 48,
      smash: 50,
      leitura: 72,
      visaoTatica: 75,
      mentalidade: 64,
      regularidade: 63,
      recuperacao: 61,
      adaptacao: 71
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "RELUCTANT",
      rallyCadence: "MEASURED",
      riskProfile: "CALCULATED",
      adaptability: 68
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── TESCHNER  |  GER  |  CTR_PUNCHER  ────────────────
  TESCHNER: {
    id: "TESCHNER",
    photo: "https://files.catbox.moe/6w31l0.png",
    name: "Teschner",
    nickname: "Roboter",
    nationality: "GER",
    age: 28,
    height: 1.86,
    weight: 82,
    styleId: "ADPT_TAC",
    color: "#666666",
    tagline: "O rosto n\xE3o diz. A pontua\xE7\xE3o, sempre.",
    bio: "Alem\xE3o que parece ter sa\xEDdo de uma f\xE1brica. Cada golpe \xE9 executado na precis\xE3o, sem emo\xE7\xE3o vis\xEDvel. Os advers\xE1rios nunca sabem se ele est\xE1 confiante ou desesperado \u2014 o rosto n\xE3o diz.",
    career: "Pro 2019. Top 40 est\xE1vel. O futuro aponta para top 20 se o f\xEDsico aguentar.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 37,
    initialPts: 1980,
    birthYear: 1997,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 29,
    signatureShot: "DROP_SHOT",
    rallyPattern: "DEEP_GRINDER",
    signaturePattern: "SLICE_DISRUPTOR",
    naturalSignature: "SERVE_KICK_HIGH",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 70,
      explosividade: 62,
      resistencia: 85,
      defesa: 76,
      fhPotencia: 73,
      fhControle: 85,
      bhPotencia: 70,
      bhControle: 81,
      topspin: 68,
      slice: 85,
      saqueForca: 67,
      saquePrecisao: 75,
      devolucao: 75,
      volley: 61,
      smash: 59,
      leitura: 79,
      visaoTatica: 65,
      mentalidade: 81,
      regularidade: 83,
      recuperacao: 79,
      adaptacao: 79
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "OPPORTUNIST",
      rallyCadence: "PATIENT",
      riskProfile: "ALLOUT",
      adaptability: 80
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── BLANCHARD  |  FRA  |  TAKEALLRISK  ────────────────
  BLANCHARD: {
    id: "BLANCHARD",
    photo: "https://files.catbox.moe/90ukm3.png",
    name: "Blanchard",
    nickname: "Fantasme",
    nationality: "FRA",
    age: 27,
    height: 1.82,
    weight: 78,
    styleId: "PWR_BASE",
    color: "#9900CC",
    tagline: "O risco \xE9 medido, n\xE3o instintivo.",
    bio: "TAKEALLRISK franc\xEAs mais calculado que Delacroix \u2014 o risco \xE9 medido, n\xE3o instintivo. Sabe quando e como errar. Perigoso em indoor onde as superf\xEDcies r\xE1pidas favorecem o jogo criativo.",
    career: "Pro 2020. Semifinalista em Paris 2024. Trajet\xF3ria lenta mas segura.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 55,
    initialPts: 1260,
    birthYear: 1998,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 28,
    signatureShot: "SHORT_ANGLE_FH",
    rallyPattern: "RHYTHM_DISRUPTION",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "FH_KICK",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 75,
      explosividade: 79,
      resistencia: 59,
      defesa: 56,
      fhPotencia: 83,
      fhControle: 41,
      bhPotencia: 70,
      bhControle: 33,
      topspin: 75,
      slice: 68,
      saqueForca: 60,
      saquePrecisao: 62,
      devolucao: 42,
      volley: 54,
      smash: 60,
      leitura: 31,
      visaoTatica: 55,
      mentalidade: 44,
      regularidade: 40,
      recuperacao: 39,
      adaptacao: 40
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "RELUCTANT",
      rallyCadence: "BALANCED",
      riskProfile: "CALCULATED",
      adaptability: 38
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── KOZLOWSKI  |  POL  |  ALL_COURT  ────────────────
  KOZLOWSKI: {
    id: "KOZLOWSKI",
    photo: "https://files.catbox.moe/wvqfvl.png",
    name: "Kozlowski",
    nickname: "\xC1guia",
    nationality: "POL",
    age: 24,
    height: 1.89,
    weight: 86,
    styleId: "CTR_PUNCHER",
    color: "#CC0000",
    tagline: "A disciplina do leste europeu num jogo completo.",
    bio: "Pol\xF4nia colocando o nome no mapa do t\xEAnis. Kozlowski tem o jogo completo que a escola de Praga ensina \u2014 t\xE9cnica s\xF3lida, f\xEDsico desenvolvido, e a disciplina que s\xF3 os pa\xEDses do leste europeu produzem.",
    career: "Pro 2022. Top 45 na terceira temporada. Pol\xF4nia em modo orgulho.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 41,
    initialPts: 1820,
    birthYear: 2001,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "DTL_BH",
    rallyPattern: "DTL_HUNTER",
    signaturePattern: "BH_WALL",
    naturalSignature: "DROP_DEAD",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 75,
      explosividade: 72,
      resistencia: 73,
      defesa: 79,
      fhPotencia: 69,
      fhControle: 82,
      bhPotencia: 81,
      bhControle: 85,
      topspin: 73,
      slice: 77,
      saqueForca: 66,
      saquePrecisao: 82,
      devolucao: 74,
      volley: 75,
      smash: 75,
      leitura: 73,
      visaoTatica: 71,
      mentalidade: 75,
      regularidade: 78,
      recuperacao: 74,
      adaptacao: 73
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "PROACTIVE",
      rallyCadence: "PATIENT",
      riskProfile: "CALCULATED",
      adaptability: 74
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── ANASTASIADIS  |  GRE  |  RETRIEVER  ────────────────
  ANASTASIADIS: {
    id: "ANASTASIADIS",
    photo: "https://files.catbox.moe/k1aoaf.png",
    name: "Anastasiadis",
    nickname: "Spartiate",
    nationality: "GRE",
    age: 22,
    height: 1.79,
    weight: 73,
    styleId: "RETRIEVER",
    color: "#1144CC",
    tagline: "A Gr\xE9cia n\xE3o vai acabar sua era de resist\xEAncia.",
    bio: "Petrakis encontrou seu herdeiro. Anastasiadis n\xE3o defende bonito \u2014 defende perfeitamente. A Gr\xE9cia n\xE3o vai acabar sua era de resist\xEAncia no t\xEAnis.",
    career: "Pro 2024. Dupla com Petrakis nos treinos \xE9 lend\xE1ria.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 74,
    initialPts: 800,
    birthYear: 2003,
    potential: "ELITE",
    developmentStyle: "EARLY_BLOOMER",
    peakAge: 26,
    signatureShot: "SLICE_BH",
    rallyPattern: "DEFENSIVE_BASE",
    signaturePattern: "BH_WALL",
    naturalSignature: "FH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 80,
      explosividade: 69,
      resistencia: 85,
      defesa: 86,
      fhPotencia: 47,
      fhControle: 87,
      bhPotencia: 45,
      bhControle: 88,
      topspin: 60,
      slice: 73,
      saqueForca: 58,
      saquePrecisao: 68,
      devolucao: 82,
      volley: 51,
      smash: 56,
      leitura: 78,
      visaoTatica: 51,
      mentalidade: 80,
      regularidade: 82,
      recuperacao: 85,
      adaptacao: 83
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "RELUCTANT",
      rallyCadence: "BALANCED",
      riskProfile: "GAMBLER",
      adaptability: 79
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── CASTELLANO  |  ESP  |  CTR_PUNCHER  ────────────────
  CASTELLANO: {
    id: "CASTELLANO",
    photo: "https://files.catbox.moe/4z1799.png",
    name: "Castellano",
    nickname: "Castillo",
    nationality: "ESP",
    age: 29,
    height: 1.85,
    weight: 80,
    styleId: "AGG_BASELINER",
    color: "#CC5500",
    tagline: "Converte a defesa em ataque com timing perfeito.",
    bio: "O segundo espanhol no top 40. Menos dram\xE1tico que Morales, mais est\xE1vel. O counter-punch no saibro \xE9 brutal \u2014 converte a defesa em ataque com timing perfeito.",
    career: "Top 35 por tr\xEAs temporadas. Um Masters de saibro no portf\xF3lio.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 34,
    initialPts: 2200,
    birthYear: 1996,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 29,
    signatureShot: "DROP_SHOT",
    rallyPattern: "CENTRE_CONTROL",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "BH_SLICE_DEEP",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 71,
      explosividade: 63,
      resistencia: 86,
      defesa: 80,
      fhPotencia: 77,
      fhControle: 88,
      bhPotencia: 67,
      bhControle: 82,
      topspin: 69,
      slice: 86,
      saqueForca: 70,
      saquePrecisao: 74,
      devolucao: 73,
      volley: 57,
      smash: 56,
      leitura: 80,
      visaoTatica: 60,
      mentalidade: 82,
      regularidade: 84,
      recuperacao: 85,
      adaptacao: 78
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "OPPORTUNIST",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "GAMBLER",
      adaptability: 81
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── WEBER_HANS  |  CHE  |  ALL_COURT  ────────────────
  WEBER_HANS: {
    id: "WEBER_HANS",
    photo: "https://files.catbox.moe/418281.png",
    name: "Weber",
    nickname: "Uhrmacher",
    nationality: "CHE",
    age: 31,
    height: 1.84,
    weight: 80,
    styleId: "TACT_TEC",
    color: "#BB0000",
    tagline: "Preciso, variado, consistente \u2014 o rel\xF3gio n\xE3o para.",
    bio: "Su\xED\xE7o t\xE9cnico, como sempre foram os su\xED\xE7os. Preciso, variado, consistente \u2014 mas os 31 anos j\xE1 comprometem a velocidade que o ALL_COURT exige nas trocas longas.",
    career: "Carreira madura. Pico em #20. Em decl\xEDnio leve mas ainda respeitado.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 60,
    initialPts: 1100,
    birthYear: 1994,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "SHORT_ANGLE_FH",
    rallyPattern: "RHYTHM_DISRUPTION",
    signaturePattern: "SLICE_DISRUPTOR",
    naturalSignature: "BH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 74,
      explosividade: 71,
      resistencia: 72,
      defesa: 81,
      fhPotencia: 66,
      fhControle: 85,
      bhPotencia: 75,
      bhControle: 89,
      topspin: 72,
      slice: 76,
      saqueForca: 71,
      saquePrecisao: 80,
      devolucao: 68,
      volley: 69,
      smash: 71,
      leitura: 72,
      visaoTatica: 71,
      mentalidade: 74,
      regularidade: 78,
      recuperacao: 76,
      adaptacao: 73
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "AVOIDS",
      rallyCadence: "MEASURED",
      riskProfile: "SAFE",
      adaptability: 73
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── DALMAU  |  ESP  |  AGG_BASELINER  ────────────────
  DALMAU: {
    id: "DALMAU",
    photo: "https://files.catbox.moe/p9hpou.png",
    name: "Dalmau",
    nickname: "Torrent",
    nationality: "ESP",
    age: 20,
    height: 1.83,
    weight: 76,
    styleId: "CTR_PUNCHER",
    color: "#FF8800",
    tagline: "A Espanha encontrou seu pr\xF3ximo messias.",
    bio: "17 anos de treino intensivo na academia espanhola produziram este. 20 anos, potencial LENDA, forehand que j\xE1 assustou top 30. O circuito inteiro est\xE1 de olho. A Espanha encontrou seu pr\xF3ximo messias.",
    career: "Pro 2024. Primeiro title 250 com 20 anos. Hist\xF3rico.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 88,
    initialPts: 600,
    birthYear: 2005,
    potential: "LENDA",
    developmentStyle: "EARLY_BLOOMER",
    peakAge: 26,
    signatureShot: "SHORT_ANGLE_FH",
    rallyPattern: "SHORT_ANGLE_BUILDER",
    signaturePattern: "SLICE_DISRUPTOR",
    naturalSignature: "VOLLEY_ANGLE",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 70,
      explosividade: 73,
      resistencia: 70,
      defesa: 66,
      fhPotencia: 70,
      fhControle: 62,
      bhPotencia: 80,
      bhControle: 65,
      topspin: 79,
      slice: 54,
      saqueForca: 58,
      saquePrecisao: 70,
      devolucao: 68,
      volley: 47,
      smash: 50,
      leitura: 68,
      visaoTatica: 73,
      mentalidade: 60,
      regularidade: 60,
      recuperacao: 63,
      adaptacao: 65
    },
    prefs: {
      buildStyle: "CROSS_BUILDER",
      netGame: "AVOIDS",
      rallyCadence: "MEASURED",
      riskProfile: "SAFE",
      adaptability: 64
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── MARET  |  CHE  |  CTR_PUNCHER  ────────────────
  MARET: {
    id: "MARET",
    photo: "https://files.catbox.moe/pkav80.png",
    name: "Maret",
    nickname: "Glacier",
    nationality: "CHE",
    age: 24,
    height: 1.84,
    weight: 79,
    styleId: "ALL_COURT",
    color: "#CC3333",
    tagline: "A pragmaticidade alpina na tomada de decis\xE3o.",
    bio: "Su\xED\xE7o da nova gera\xE7\xE3o que n\xE3o carrega o peso de nenhum \xEDdolo. Counter-punch s\xF3lido, f\xEDsico atl\xE9tico, e a pragmaticidade alpina na tomada de decis\xE3o.",
    career: "Pro 2022. Top 50 est\xE1vel. Upside claro.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 47,
    initialPts: 1520,
    birthYear: 2001,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "TOPSPIN_CROSS",
    rallyPattern: "CENTRE_CONTROL",
    signaturePattern: "SLICE_DISRUPTOR",
    naturalSignature: "DROP_HIDDEN",
    alcunha: null,
    _devState: {
      monthsAtPeak: 0,
      lastBreakthrough: null,
      attrGrowthAccum: {},
      hadBreakdownRecovery: false
    },
    attrs: {
      velocidade: 69,
      explosividade: 61,
      resistencia: 84,
      defesa: 76,
      fhPotencia: 72,
      fhControle: 80,
      bhPotencia: 69,
      bhControle: 80,
      topspin: 67,
      slice: 84,
      saqueForca: 73,
      saquePrecisao: 67,
      devolucao: 76,
      volley: 59,
      smash: 58,
      leitura: 78,
      visaoTatica: 58,
      mentalidade: 80,
      regularidade: 82,
      recuperacao: 85,
      adaptacao: 78
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "OPPORTUNIST",
      rallyCadence: "EXPLOSIVE",
      riskProfile: "GAMBLER",
      adaptability: 79
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ══════════════════════════════════════════════════════════════
  // ══  ÁFRICA / ORIENTE MÉDIO  ══════════════════════════════════
  // ══════════════════════════════════════════════════════════════
  // ── 17 — KOFI DIALLO  |  SEN  |  AGG_BASELINER  ──────────────
  DIALLO: {
    id: "DIALLO",
    photo: "https://files.catbox.moe/54td1c.png",
    name: "Diallo",
    nickname: "Savanah",
    nationality: "SEN",
    age: 26,
    height: 1.87,
    weight: 82,
    styleId: "PWR_BASE",
    color: "#00853F",
    tagline: "Senegal colocou o nome no mapa.",
    bio: "Senegal colocou o nome no mapa e Diallo \xE9 o motivo. Tem o f\xEDsico dos grandes e o forehand dos eleitos. A trajet\xF3ria saiu do nada tr\xEAs anos atr\xE1s e est\xE1 em acelera\xE7\xE3o constante \u2014 um Masters conquistado e a fome de mais.",
    career: "Pro 2021. Um Masters. O orgulho do Senegal que virou refer\xEAncia continental.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 31,
    initialPts: 2380,
    birthYear: 1999,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "SHORT_ANGLE_FH",
    rallyPattern: "CROSS_HEAVY",
    signaturePattern: "SERVE_COMMANDER",
    naturalSignature: "DROP_HIDDEN",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 84,
      explosividade: 86,
      resistencia: 78,
      defesa: 74,
      fhPotencia: 93,
      fhControle: 71,
      bhPotencia: 75,
      bhControle: 66,
      topspin: 88,
      slice: 62,
      saqueForca: 70,
      saquePrecisao: 76,
      devolucao: 63,
      volley: 55,
      smash: 57,
      leitura: 72,
      visaoTatica: 76,
      mentalidade: 71,
      regularidade: 71,
      recuperacao: 74,
      adaptacao: 76
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "AVOIDS",
      rallyCadence: "PATIENT",
      riskProfile: "SAFETY_FIRST",
      adaptability: 71
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 18 — KWESI MENSAH  |  GHA  |  ALL_COURT  ─────────────────
  MENSAH: {
    id: "MENSAH",
    photo: "https://files.catbox.moe/uuo4a9.png",
    name: "Mensah",
    nickname: "Goldcoast",
    nationality: "GHA",
    age: 23,
    height: 1.83,
    weight: 77,
    styleId: "AGG_BASELINER",
    color: "#CC8800",
    tagline: "Companheiro de treino de Osei \u2014 que melhor escola existe?",
    bio: "Companheiro de treino de Osei \u2014 que melhor escola existe? Mensah tem o jogo mais equilibrado e menos os lampejos explosivos do mentor. O circuito ainda n\xE3o sabe qual dos dois vai chegar mais longe.",
    career: "Pro 2023. Top 60 com 23 anos. A Gana vai descobrir se dois craques saem da mesma academia.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 57,
    initialPts: 1180,
    birthYear: 2002,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 26,
    signatureShot: "DROP_SHOT",
    rallyPattern: "DTL_HUNTER",
    signaturePattern: "LATE_MATCH_HUNTER",
    naturalSignature: "BH_SLICE_DEEP",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 82,
      explosividade: 80,
      resistencia: 78,
      defesa: 78,
      fhPotencia: 83,
      fhControle: 84,
      bhPotencia: 67,
      bhControle: 78,
      topspin: 76,
      slice: 74,
      saqueForca: 79,
      saquePrecisao: 71,
      devolucao: 69,
      volley: 66,
      smash: 66,
      leitura: 78,
      visaoTatica: 71,
      mentalidade: 73,
      regularidade: 77,
      recuperacao: 74,
      adaptacao: 72
    },
    prefs: {
      buildStyle: "CROSS_BUILDER",
      netGame: "HUNTER",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "SAFE",
      adaptability: 75
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 19 — KHALID AL_RASHID  |  UAE  |  BIG_SERVER  ────────────
  AL_RASHID: {
    id: "AL_RASHID",
    photo: "https://files.catbox.moe/q4ojf4.png",
    name: "Al-Rashid",
    nickname: "Desert Eagle",
    nationality: "UAE",
    age: 25,
    height: 1.98,
    weight: 92,
    styleId: "BIG_SERVER",
    color: "#006600",
    tagline: "Os Emirados \xC1rabes unidos por um tenista.",
    bio: "Os Emirados \xC1rabes unidos por um tenista. Al-Rashid \xE9 o produto de investimento massivo no esporte \u2014 academias de classe mundial produziram um servidor que o Oriente M\xE9dio pode chamar de seu.",
    career: "Pro 2022. Top 70. Projeto de estado que est\xE1 funcionando.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 68,
    initialPts: 920,
    birthYear: 2e3,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 26,
    signatureShot: "FLAT_WINNER",
    rallyPattern: "CENTRE_CONTROL",
    signaturePattern: "SERVE_COMMANDER",
    naturalSignature: "BH_SLICE_DEEP",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 68,
      explosividade: 80,
      resistencia: 72,
      defesa: 67,
      fhPotencia: 80,
      fhControle: 58,
      bhPotencia: 69,
      bhControle: 57,
      topspin: 56,
      slice: 52,
      saqueForca: 84,
      saquePrecisao: 71,
      devolucao: 54,
      volley: 57,
      smash: 53,
      leitura: 66,
      visaoTatica: 72,
      mentalidade: 61,
      regularidade: 62,
      recuperacao: 60,
      adaptacao: 64
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "OPPORTUNIST",
      rallyCadence: "MEASURED",
      riskProfile: "SAFE",
      adaptability: 63
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 20 — IBRAHIM TRAORÉ  |  MLI  |  RETRIEVER  ───────────────
  TRAORE: {
    id: "TRAORE",
    photo: "https://files.catbox.moe/cevhdo.png",
    name: "Traor\xE9",
    nickname: "Mali",
    nationality: "MLI",
    age: 27,
    height: 1.8,
    weight: 73,
    styleId: "GRINDER",
    color: "#14B53A",
    tagline: "Mali no circuito de t\xEAnis parecia improv\xE1vel.",
    bio: "Mali no circuito de t\xEAnis parecia improv\xE1vel. Traor\xE9 tornou poss\xEDvel. Defende como se a \xC1frica Ocidental inteira estivesse nas costas \u2014 e talvez esteja. Cada rally longo \xE9 uma declara\xE7\xE3o de pertencimento.",
    career: "Pro 2020. Top 85. Pioneiro do seu pa\xEDs no tour principal.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 81,
    initialPts: 690,
    birthYear: 1998,
    potential: "CAMPEAO",
    developmentStyle: "LATE_BLOOMER",
    peakAge: 29,
    signatureShot: "DROP_SHOT",
    rallyPattern: "DEEP_GRINDER",
    signaturePattern: "BH_WALL",
    naturalSignature: "DROP_HIDDEN",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 88,
      explosividade: 76,
      resistencia: 92,
      defesa: 89,
      fhPotencia: 58,
      fhControle: 89,
      bhPotencia: 57,
      bhControle: 88,
      topspin: 62,
      slice: 82,
      saqueForca: 63,
      saquePrecisao: 71,
      devolucao: 82,
      volley: 59,
      smash: 63,
      leitura: 86,
      visaoTatica: 60,
      mentalidade: 83,
      regularidade: 87,
      recuperacao: 80,
      adaptacao: 80
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "RELUCTANT",
      rallyCadence: "MEASURED",
      riskProfile: "SAFETY_FIRST",
      adaptability: 84
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 21 — JOSEPH KAMARA  |  SLE  |  AGG_BASELINER  ────────────
  KAMARA: {
    id: "KAMARA",
    photo: "https://files.catbox.moe/i27us3.png",
    name: "Kamara",
    nickname: "Freetown",
    nationality: "SLE",
    age: 24,
    height: 1.84,
    weight: 78,
    styleId: "AGG_BASELINER",
    color: "#1EB53A",
    tagline: "Serra Leoa nunca imaginou ter um jogador no tour.",
    bio: "Serra Leoa nunca imaginou ter um jogador no tour. Kamara chegou via programa de bolsas e derrubou a barreira mais alta do t\xEAnis: o status quo de quem pode estar no top 100. Cada vit\xF3ria carrega um pa\xEDs.",
    career: "Pro 2022. S\xEDmbolo do que investimento e determina\xE7\xE3o fazem. O top 80 est\xE1 ao alcance.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 84,
    initialPts: 650,
    birthYear: 2001,
    potential: "ELITE",
    developmentStyle: "VOLATILE",
    peakAge: 26,
    signatureShot: "INSIDE_OUT_FH",
    rallyPattern: "AGGRESSIVE_EARLY",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "FH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 86,
      explosividade: 84,
      resistencia: 76,
      defesa: 76,
      fhPotencia: 85,
      fhControle: 65,
      bhPotencia: 66,
      bhControle: 60,
      topspin: 80,
      slice: 58,
      saqueForca: 68,
      saquePrecisao: 72,
      devolucao: 63,
      volley: 46,
      smash: 51,
      leitura: 68,
      visaoTatica: 74,
      mentalidade: 67,
      regularidade: 66,
      recuperacao: 71,
      adaptacao: 64
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "AVOIDS",
      rallyCadence: "BALANCED",
      riskProfile: "GAMBLER",
      adaptability: 67
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 22 — THABO NKOSI  |  RSA  |  CTR_PUNCHER  ────────────────
  NKOSI: {
    id: "NKOSI",
    photo: "https://files.catbox.moe/noozms.png",
    name: "Nkosi",
    nickname: "Jo'burg",
    nationality: "RSA",
    age: 28,
    height: 1.86,
    weight: 82,
    styleId: "PWR_BASE",
    color: "#007A4D",
    tagline: "Mbeki ataca com o saque. Nkosi constr\xF3i com paci\xEAncia.",
    bio: "O segundo sul-africano no tour. Mbeki ataca com o saque, Nkosi constr\xF3i com paci\xEAncia. A \xC1frica do Sul tem dois estilos opostos para exportar \u2014 e Nkosi representa o lado que o advers\xE1rio nunca consegue apressar.",
    career: "Pro 2019. Top 90 consistente. Seis anos de tour sem drama.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 89,
    initialPts: 580,
    birthYear: 1997,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 29,
    signatureShot: "DROP_SHOT",
    rallyPattern: "CENTRE_CONTROL",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "FH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 76,
      explosividade: 70,
      resistencia: 84,
      defesa: 80,
      fhPotencia: 77,
      fhControle: 87,
      bhPotencia: 68,
      bhControle: 80,
      topspin: 70,
      slice: 88,
      saqueForca: 71,
      saquePrecisao: 79,
      devolucao: 69,
      volley: 56,
      smash: 57,
      leitura: 76,
      visaoTatica: 64,
      mentalidade: 79,
      regularidade: 84,
      recuperacao: 83,
      adaptacao: 76
    },
    prefs: {
      buildStyle: "CROSS_BUILDER",
      netGame: "HUNTER",
      rallyCadence: "PATIENT",
      riskProfile: "ALLOUT",
      adaptability: 78
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 23 — AHMED HASSAN  |  EGY  |  ALL_COURT  ─────────────────
  HASSAN: {
    id: "HASSAN",
    photo: "https://files.catbox.moe/9fynf3.png",
    name: "Hassan",
    nickname: "Fara\xF3",
    nationality: "EGY",
    age: 23,
    height: 1.82,
    weight: 76,
    styleId: "ADPT_TAC",
    color: "#CC9900",
    tagline: "O Cairo assiste cada ponto ao vivo.",
    bio: "Egito coloca o t\xEAnis no calend\xE1rio esportivo nacional. Hassan \xE9 o primeiro eg\xEDpcio no top 100 em d\xE9cadas \u2014 cada ponto ganhado \xE9 transmitido ao vivo no Cairo. O peso da hist\xF3ria est\xE1 nas costas, mas ele corre r\xE1pido.",
    career: "Pro 2023. Top 100. Hist\xF3rico para o t\xEAnis africano do norte.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 95,
    initialPts: 460,
    birthYear: 2002,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 26,
    signatureShot: "DTL_BH",
    rallyPattern: "RHYTHM_DISRUPTION",
    signaturePattern: "SLICE_DISRUPTOR",
    naturalSignature: "VOLLEY_ANGLE",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 80,
      explosividade: 78,
      resistencia: 76,
      defesa: 76,
      fhPotencia: 72,
      fhControle: 76,
      bhPotencia: 75,
      bhControle: 76,
      topspin: 74,
      slice: 70,
      saqueForca: 67,
      saquePrecisao: 75,
      devolucao: 69,
      volley: 65,
      smash: 63,
      leitura: 72,
      visaoTatica: 72,
      mentalidade: 69,
      regularidade: 73,
      recuperacao: 67,
      adaptacao: 72
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "AVOIDS",
      rallyCadence: "EXPLOSIVE",
      riskProfile: "SAFE",
      adaptability: 70
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 24 — LÉON OUÉDRAOGO  |  BFA  |  TAKEALLRISK  ─────────────
  OUEDRAOGO: {
    id: "OUEDRAOGO",
    photo: "https://files.catbox.moe/3jxtjn.png",
    name: "Ou\xE9draogo",
    nickname: "Burkina",
    nationality: "BFA",
    age: 22,
    height: 1.81,
    weight: 74,
    styleId: "TAKEALLRISK",
    color: "#FF0000",
    tagline: "Burkina Faso no tour de t\xEAnis.",
    bio: "Burkina Faso no tour de t\xEAnis. Ou\xE9draogo joga com alegria pura \u2014 o risco n\xE3o \xE9 calculado, \xE9 instintivo. O circuito n\xE3o sabe o que esperar dele. Ele tamb\xE9m n\xE3o. E isso \xE9 a defini\xE7\xE3o perfeita do seu t\xEAnis.",
    career: "Pro 2024. Primeira temporada com resultado concreto. O caos organizado que ningu\xE9m preparou.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 98,
    initialPts: 410,
    birthYear: 2003,
    potential: "ELITE",
    developmentStyle: "VOLATILE",
    peakAge: 24,
    signatureShot: "FLAT_WINNER",
    rallyPattern: "SHORT_ANGLE_BUILDER",
    signaturePattern: "SHORT_ANGLE_ASSASSIN",
    naturalSignature: "FH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 84,
      explosividade: 86,
      resistencia: 64,
      defesa: 56,
      fhPotencia: 88,
      fhControle: 45,
      bhPotencia: 66,
      bhControle: 36,
      topspin: 78,
      slice: 62,
      saqueForca: 72,
      saquePrecisao: 56,
      devolucao: 40,
      volley: 54,
      smash: 57,
      leitura: 40,
      visaoTatica: 62,
      mentalidade: 47,
      regularidade: 43,
      recuperacao: 44,
      adaptacao: 44
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "HUNTER",
      rallyCadence: "BALANCED",
      riskProfile: "SAFE",
      adaptability: 44
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 25 — MUSTAFA ABDI  |  SOM  |  RETRIEVER  ─────────────────
  ABDI: {
    id: "ABDI",
    photo: "https://files.catbox.moe/ha0cf9.png",
    name: "Abdi",
    nickname: "Ogaden",
    nationality: "SOM",
    age: 25,
    height: 1.79,
    weight: 70,
    styleId: "RETRIEVER",
    color: "#4189DD",
    tagline: "Som\xE1lia no circuito. Cada partida \xE9 maior que a soma dos games.",
    bio: "Som\xE1lia no circuito. Abdi defende com obstina\xE7\xE3o \u2014 a mesma obstina\xE7\xE3o que precisou fora da quadra para chegar aqui. Cada partida \xE9 maior que a soma dos seus games. Cada bola devolvida \xE9 uma declara\xE7\xE3o.",
    career: "Pro 2023. Top 105 crescendo. O caminho foi mais dif\xEDcil que qualquer advers\xE1rio.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 102,
    initialPts: 370,
    birthYear: 2e3,
    potential: "CAMPEAO",
    developmentStyle: "LATE_BLOOMER",
    peakAge: 29,
    signatureShot: "DROP_SHOT",
    rallyPattern: "DEFENSIVE_BASE",
    signaturePattern: "BH_WALL",
    naturalSignature: "DROP_HIDDEN",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 84,
      explosividade: 72,
      resistencia: 88,
      defesa: 83,
      fhPotencia: 48,
      fhControle: 87,
      bhPotencia: 51,
      bhControle: 87,
      topspin: 58,
      slice: 80,
      saqueForca: 61,
      saquePrecisao: 70,
      devolucao: 83,
      volley: 56,
      smash: 56,
      leitura: 80,
      visaoTatica: 54,
      mentalidade: 81,
      regularidade: 83,
      recuperacao: 85,
      adaptacao: 82
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "OPPORTUNIST",
      rallyCadence: "PATIENT",
      riskProfile: "SAFETY_FIRST",
      adaptability: 81
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 26 — YASSINE BEN SAAD  |  TUN  |  AGG_BASELINER  ─────────
  BEN_SAAD: {
    id: "BEN_SAAD",
    photo: "https://files.catbox.moe/0t978u.png",
    name: "Ben Saad",
    nickname: "Sahara",
    nationality: "TUN",
    age: 27,
    height: 1.86,
    weight: 80,
    styleId: "CTR_PUNCHER",
    color: "#CC0000",
    tagline: "O Mediterr\xE2neo produz tenistas dif\xEDceis de parar.",
    bio: "Tun\xEDsia no top 75. Ben Saad agrediu no saibro desde o primeiro dia \u2014 o forehand potente, o f\xEDsico resistente. O Mediterr\xE2neo produz tenistas dif\xEDceis de parar, e ele \xE9 o mais recente exemplo disso.",
    career: "Pro 2021. Top 75 est\xE1vel. Um ATP 500 conquistado no saibro mediterr\xE2neo.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 71,
    initialPts: 840,
    birthYear: 1998,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 28,
    signatureShot: "SHORT_ANGLE_FH",
    rallyPattern: "SHORT_ANGLE_BUILDER",
    signaturePattern: "BH_WALL",
    naturalSignature: "DROP_HIDDEN",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 82,
      explosividade: 82,
      resistencia: 76,
      defesa: 74,
      fhPotencia: 74,
      fhControle: 69,
      bhPotencia: 86,
      bhControle: 73,
      topspin: 86,
      slice: 60,
      saqueForca: 68,
      saquePrecisao: 78,
      devolucao: 70,
      volley: 53,
      smash: 54,
      leitura: 70,
      visaoTatica: 73,
      mentalidade: 66,
      regularidade: 67,
      recuperacao: 63,
      adaptacao: 68
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "RELUCTANT",
      rallyCadence: "BALANCED",
      riskProfile: "CALCULATED",
      adaptability: 68
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 27 — YOUSSEF IBRAHIM  |  MAR  |  CTR_PUNCHER  ────────────
  IBRAHIM_MAR: {
    id: "IBRAHIM_MAR",
    photo: "https://files.catbox.moe/ah2btd.png",
    name: "Ibrahim",
    nickname: "Casablanca",
    nationality: "MAR",
    age: 24,
    height: 1.82,
    weight: 76,
    styleId: "GRINDER",
    color: "#C1272D",
    tagline: "Marrocos voltou ao t\xEAnis com seriedade.",
    bio: "Marrocos voltou ao t\xEAnis com seriedade. Ibrahim joga com a mesma ast\xFAcia dos traders do souk \u2014 cada ponto \xE9 uma negocia\xE7\xE3o que ele n\xE3o perde de vista. O counter-punch \xE9 calculado, o erro \xE9 raro.",
    career: "Pro 2023. Top 90 crescendo. A escola marroquina de saibro est\xE1 produzindo resultados.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 86,
    initialPts: 620,
    birthYear: 2001,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "TOPSPIN_CROSS",
    rallyPattern: "DEEP_GRINDER",
    signaturePattern: "BH_WALL",
    naturalSignature: "FH_SHORT_ANGLE",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 78,
      explosividade: 72,
      resistencia: 80,
      defesa: 81,
      fhPotencia: 69,
      fhControle: 85,
      bhPotencia: 70,
      bhControle: 84,
      topspin: 68,
      slice: 84,
      saqueForca: 75,
      saquePrecisao: 71,
      devolucao: 76,
      volley: 61,
      smash: 61,
      leitura: 72,
      visaoTatica: 61,
      mentalidade: 74,
      regularidade: 79,
      recuperacao: 72,
      adaptacao: 70
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "HUNTER",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "SAFETY_FIRST",
      adaptability: 73
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 28 — EMEKA ONYEKACHI  |  NGR  |  BIG_SERVER  ─────────────
  ONYEKACHI: {
    id: "ONYEKACHI",
    photo: "https://files.catbox.moe/zoyc7r.png",
    name: "Onyekachi",
    nickname: "Naija",
    nationality: "NGR",
    age: 20,
    height: 2,
    weight: 94,
    styleId: "PWR_BASE",
    color: "#008751",
    tagline: "Nigeria tem dois servidores gigantes no tour.",
    bio: "Companheiro de treino de Ajuba \u2014 e j\xE1 coloca press\xE3o nele. Nigeria tem dois servidores gigantes no tour. Onyekachi ainda tem muito a aprender, mas a mat\xE9ria prima est\xE1 toda l\xE1. 20 anos e j\xE1 bate saque acima de 210km/h.",
    career: "Pro 2025. Primeira temporada. A sombra de Ajuba \xE9 um privil\xE9gio e uma exig\xEAncia.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 100,
    initialPts: 390,
    birthYear: 2005,
    potential: "ELITE",
    developmentStyle: "EARLY_BLOOMER",
    peakAge: 23,
    signatureShot: "BIG_SERVE",
    rallyPattern: "SERVE_PLUS_ONE",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "DROP_HIDDEN",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 70,
      explosividade: 82,
      resistencia: 70,
      defesa: 63,
      fhPotencia: 82,
      fhControle: 56,
      bhPotencia: 69,
      bhControle: 48,
      topspin: 54,
      slice: 48,
      saqueForca: 67,
      saquePrecisao: 75,
      devolucao: 55,
      volley: 47,
      smash: 46,
      leitura: 58,
      visaoTatica: 64,
      mentalidade: 53,
      regularidade: 53,
      recuperacao: 54,
      adaptacao: 58
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "RELUCTANT",
      rallyCadence: "BALANCED",
      riskProfile: "CALCULATED",
      adaptability: 55
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ══════════════════════════════════════════════════════════════
  // ══  OCEANIA  ═════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════
  // ── 29 — LIAM MORRISON  |  AUS  |  AGG_BASELINER  ────────────
  MORRISON: {
    id: "MORRISON",
    photo: "https://files.catbox.moe/dwqhm8.png",
    name: "Morrison",
    nickname: "Outback",
    nationality: "AUS",
    age: 27,
    height: 1.88,
    weight: 83,
    styleId: "AGG_BASELINER",
    color: "#FFAA00",
    tagline: "Chegou ao top 30 sem fazer barulho e ficou.",
    bio: "O australiano que chegou ao top 30 sem fazer barulho e permaneceu sem pedir licen\xE7a. Morrison tem a agressividade nativa australiana \u2014 ataca, pressiona, n\xE3o recua. Dois Masters em hard e uma semifinal de Slam colocam o nome na lista dos s\xE9rios.",
    career: "Top 30 por tr\xEAs temporadas. Dois Masters em hard court. Meridian 2023 semifinalista.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 31,
    initialPts: 2380,
    birthYear: 1998,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "SHORT_ANGLE_FH",
    rallyPattern: "AGGRESSIVE_EARLY",
    signaturePattern: "SERVE_COMMANDER",
    naturalSignature: "FH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 84,
      explosividade: 86,
      resistencia: 80,
      defesa: 80,
      fhPotencia: 95,
      fhControle: 75,
      bhPotencia: 79,
      bhControle: 66,
      topspin: 86,
      slice: 64,
      saqueForca: 75,
      saquePrecisao: 77,
      devolucao: 66,
      volley: 55,
      smash: 60,
      leitura: 74,
      visaoTatica: 80,
      mentalidade: 71,
      regularidade: 71,
      recuperacao: 67,
      adaptacao: 76
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "AVOIDS",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "ALLOUT",
      adaptability: 72
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 30 — JAMES FLETCHER  |  AUS  |  CTR_PUNCHER  ─────────────
  FLETCHER: {
    id: "FLETCHER",
    photo: "https://files.catbox.moe/j5e7we.png",
    name: "Fletcher",
    nickname: "Boomerang",
    nationality: "AUS",
    age: 30,
    height: 1.86,
    weight: 82,
    styleId: "ALL_COURT",
    color: "#CC5500",
    tagline: "Counter-punch com timing de cirurgi\xE3o.",
    bio: "O australiano t\xE1tico. Counter-punch com timing de cirurgi\xE3o, servida com varia\xE7\xE3o, nada desperdi\xE7ado. Companheiro eterno de Copa Davis de Morrison, Fletcher \xE9 o tipo de jogador que vence mais torneios do que os titulares de capa percebem.",
    career: "10 anos de top 40. Um Masters. Carreira est\xE1vel e profundamente respeit\xE1vel.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 33,
    initialPts: 2240,
    birthYear: 1995,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 28,
    signatureShot: "DTL_BH",
    rallyPattern: "RHYTHM_DISRUPTION",
    signaturePattern: "SHORT_ANGLE_ASSASSIN",
    naturalSignature: "BH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 74,
      explosividade: 68,
      resistencia: 86,
      defesa: 84,
      fhPotencia: 76,
      fhControle: 90,
      bhPotencia: 73,
      bhControle: 91,
      topspin: 72,
      slice: 90,
      saqueForca: 77,
      saquePrecisao: 79,
      devolucao: 77,
      volley: 63,
      smash: 63,
      leitura: 80,
      visaoTatica: 63,
      mentalidade: 83,
      regularidade: 86,
      recuperacao: 85,
      adaptacao: 78
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "RELUCTANT",
      rallyCadence: "MEASURED",
      riskProfile: "CALCULATED",
      adaptability: 82
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 31 — PATRICK O'BRIEN  |  AUS  |  SRV_VOL  ────────────────
  O_BRIEN: {
    id: "O_BRIEN",
    photo: "https://files.catbox.moe/hrxjpo.png",
    name: "O'Brien",
    nickname: "Cork",
    nationality: "AUS",
    age: 24,
    height: 1.89,
    weight: 80,
    styleId: "SRV_VOL",
    color: "#00AA66",
    tagline: "O Championships of Albion \xE9 o objetivo de vida.",
    bio: "Australiano serve-volleyer que aprendeu nos courts de grama do pa\xEDs. Na Austr\xE1lia h\xE1 poucos assim \u2014 na Europa \xE9 excepcional. O Championships of Albion \xE9 o objetivo de vida e cada temporada de grama \xE9 um ensaio para esse dia.",
    career: "Pro 2022. Especialista de grama que brilha no inverno europeu. Dois ATP 500 conquistados.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 46,
    initialPts: 1600,
    birthYear: 2001,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 25,
    signatureShot: "FLAT_WINNER",
    rallyPattern: "SERVE_PLUS_ONE",
    signaturePattern: "SERVE_COMMANDER",
    naturalSignature: "VOLLEY_ANGLE",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 84,
      explosividade: 86,
      resistencia: 72,
      defesa: 73,
      fhPotencia: 70,
      fhControle: 66,
      bhPotencia: 68,
      bhControle: 70,
      topspin: 58,
      slice: 78,
      saqueForca: 93,
      saquePrecisao: 91,
      devolucao: 59,
      volley: 85,
      smash: 84,
      leitura: 66,
      visaoTatica: 72,
      mentalidade: 65,
      regularidade: 66,
      recuperacao: 69,
      adaptacao: 64
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "HUNTER",
      rallyCadence: "BALANCED",
      riskProfile: "SAFE",
      adaptability: 65
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 32 — KYLE DAVIDSON  |  AUS  |  BIG_SERVER  ───────────────
  DAVIDSON: {
    id: "DAVIDSON",
    photo: "https://files.catbox.moe/g1lahn.png",
    name: "Davidson",
    nickname: "Darwin",
    nationality: "AUS",
    age: 26,
    height: 1.94,
    weight: 90,
    styleId: "BIG_SERVER",
    color: "#CC8800",
    tagline: "O servidor australiano. Meridian \xE9 onde brilha.",
    bio: "O servidor australiano que faz o torneio de casa virar palco. Davidson tem o f\xEDsico privilegiado do atleta australiano moderno \u2014 saque potente e o forehand de segunda bola que encerra o ponto. Um Masters em casa e o sonho local continua.",
    career: "Top 40 desde 2023. Um Masters na Austr\xE1lia. Meridian \xE9 o palco favorito.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 38,
    initialPts: 1940,
    birthYear: 1999,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 26,
    signatureShot: "BIG_SERVE",
    rallyPattern: "AGGRESSIVE_EARLY",
    signaturePattern: "SERVE_COMMANDER",
    naturalSignature: "FH_SHORT_ANGLE",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 70,
      explosividade: 84,
      resistencia: 76,
      defesa: 65,
      fhPotencia: 86,
      fhControle: 60,
      bhPotencia: 76,
      bhControle: 57,
      topspin: 62,
      slice: 56,
      saqueForca: 84,
      saquePrecisao: 73,
      devolucao: 56,
      volley: 58,
      smash: 58,
      leitura: 72,
      visaoTatica: 79,
      mentalidade: 63,
      regularidade: 63,
      recuperacao: 63,
      adaptacao: 68
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "RELUCTANT",
      rallyCadence: "BALANCED",
      riskProfile: "SAFETY_FIRST",
      adaptability: 67
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 33 — MICHAEL NGUYEN  |  AUS  |  ALL_COURT  ───────────────
  NGUYEN_AUS: {
    id: "NGUYEN_AUS",
    photo: "https://files.catbox.moe/pktdu6.png",
    name: "Nguyen",
    nickname: "Mekong",
    nationality: "AUS",
    age: 22,
    height: 1.8,
    weight: 74,
    styleId: "ADPT_TAC",
    color: "#FFDD00",
    tagline: "Australiano de origem vietnamita que une mundos.",
    bio: "Australiano de origem vietnamita que une mundos. O ALL_COURT com a disciplina asi\xE1tica e a agressividade australiana. Os treinadores ainda descobrindo o melhor dos dois mundos \u2014 e a resposta parece mais promissora a cada torneio.",
    career: "Pro 2024. Top 65 na primeira temporada. A fus\xE3o de culturas que o t\xEAnis australiano nunca viu.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 62,
    initialPts: 1060,
    birthYear: 2003,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 25,
    signatureShot: "SHORT_ANGLE_FH",
    rallyPattern: "CENTRE_CONTROL",
    signaturePattern: "LATE_MATCH_HUNTER",
    naturalSignature: "FH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 80,
      explosividade: 78,
      resistencia: 76,
      defesa: 75,
      fhPotencia: 73,
      fhControle: 75,
      bhPotencia: 75,
      bhControle: 76,
      topspin: 74,
      slice: 72,
      saqueForca: 73,
      saquePrecisao: 71,
      devolucao: 70,
      volley: 67,
      smash: 66,
      leitura: 74,
      visaoTatica: 71,
      mentalidade: 70,
      regularidade: 72,
      recuperacao: 75,
      adaptacao: 75
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "AVOIDS",
      rallyCadence: "PATIENT",
      riskProfile: "ALLOUT",
      adaptability: 72
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 34 — TOM HARRIS  |  NZL  |  CTR_PUNCHER  ─────────────────
  HARRIS_NZ: {
    id: "HARRIS_NZ",
    photo: "https://files.catbox.moe/r14c0a.png",
    name: "Harris",
    nickname: "Kiwi",
    nationality: "NZL",
    age: 25,
    height: 1.85,
    weight: 79,
    styleId: "GRINDER",
    color: "#555555",
    tagline: "Nova Zel\xE2ndia nunca foi pot\xEAncia. Harris est\xE1 mudando isso.",
    bio: "Nova Zel\xE2ndia nunca foi pot\xEAncia de t\xEAnis. Harris est\xE1 tentando mudar isso sozinho. Counter-punch s\xF3lido, profissional nato, n\xE3o desiste de nenhuma bola. Primeiro neozeland\xEAs no top 75 em 20 anos \u2014 e ainda subindo.",
    career: "Pro 2022. Primeiro neozeland\xEAs no top 75 em 20 anos. A ilha tem um tenista s\xE9rio.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 70,
    initialPts: 860,
    birthYear: 2e3,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "SLICE_BH",
    rallyPattern: "CENTRE_CONTROL",
    signaturePattern: "BH_WALL",
    naturalSignature: "VOLLEY_ANGLE",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 76,
      explosividade: 70,
      resistencia: 82,
      defesa: 81,
      fhPotencia: 73,
      fhControle: 85,
      bhPotencia: 70,
      bhControle: 81,
      topspin: 68,
      slice: 82,
      saqueForca: 68,
      saquePrecisao: 74,
      devolucao: 77,
      volley: 58,
      smash: 59,
      leitura: 74,
      visaoTatica: 63,
      mentalidade: 77,
      regularidade: 80,
      recuperacao: 75,
      adaptacao: 74
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "OPPORTUNIST",
      rallyCadence: "MEASURED",
      riskProfile: "SAFETY_FIRST",
      adaptability: 76
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 35 — DYLAN SMITH  |  AUS  |  RETRIEVER  ──────────────────
  SMITH_AUS: {
    id: "SMITH_AUS",
    photo: "https://files.catbox.moe/cbycq8.png",
    name: "Smith",
    nickname: "Digger",
    nationality: "AUS",
    age: 29,
    height: 1.84,
    weight: 79,
    styleId: "NET_SPEC",
    color: "#FFCC00",
    tagline: "Enquanto os outros atacam, Smith recupera tudo.",
    bio: "O defensor australiano. Enquanto Morrison e Davidson atacam, Smith recupera tudo e espera o rally virar a seu favor. O circuito n\xE3o produz muitos australianos defensivos \u2014 e o t\xEAnis australiano \xE9 mais rico por isso.",
    career: "Pro 2018. Top 80 est\xE1vel por seis anos. A consist\xEAncia silenciosa que vence semanas.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 76,
    initialPts: 780,
    birthYear: 1996,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 28,
    signatureShot: "DTL_BH",
    rallyPattern: "CENTRE_CONTROL",
    signaturePattern: "NET_CLOSER",
    naturalSignature: "FH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 90,
      explosividade: 78,
      resistencia: 94,
      defesa: 89,
      fhPotencia: 58,
      fhControle: 88,
      bhPotencia: 56,
      bhControle: 91,
      topspin: 64,
      slice: 84,
      saqueForca: 69,
      saquePrecisao: 71,
      devolucao: 73,
      volley: 65,
      smash: 62,
      leitura: 82,
      visaoTatica: 55,
      mentalidade: 81,
      regularidade: 85,
      recuperacao: 85,
      adaptacao: 78
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "AVOIDS",
      rallyCadence: "BALANCED",
      riskProfile: "SAFE",
      adaptability: 81
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 36 — WILLIAM CROFT  |  AUS  |  AGG_BASELINER  ────────────
  CROFT: {
    id: "CROFT",
    photo: "https://files.catbox.moe/wtfmpi.png",
    name: "Croft",
    nickname: "Canopus",
    nationality: "AUS",
    age: 21,
    height: 1.87,
    weight: 81,
    styleId: "PWR_BASE",
    color: "#FF6600",
    tagline: "Morrison diz que ele tem mais talento bruto.",
    bio: "Mais um australiano jovem com forehand de taco. 21 anos, a escola de hard court australiana e a sede de vencer que o pa\xEDs exporta. Morrison disse publicamente que ele tem mais talento bruto do que ele pr\xF3prio tinha aos 21. Isso \xE9 tudo.",
    career: "Pro 2024. Segunda temporada impressionante. O futuro australiano mais aguardado.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 83,
    initialPts: 660,
    birthYear: 2004,
    potential: "ELITE",
    developmentStyle: "VOLATILE",
    peakAge: 24,
    signatureShot: "INSIDE_OUT_FH",
    rallyPattern: "AGGRESSIVE_EARLY",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "FH_SHORT_ANGLE",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 88,
      explosividade: 86,
      resistencia: 74,
      defesa: 70,
      fhPotencia: 89,
      fhControle: 64,
      bhPotencia: 71,
      bhControle: 57,
      topspin: 84,
      slice: 56,
      saqueForca: 71,
      saquePrecisao: 67,
      devolucao: 60,
      volley: 49,
      smash: 52,
      leitura: 72,
      visaoTatica: 76,
      mentalidade: 57,
      regularidade: 58,
      recuperacao: 53,
      adaptacao: 62
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "OPPORTUNIST",
      rallyCadence: "PATIENT",
      riskProfile: "GAMBLER",
      adaptability: 64
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 37 — ALEX BAKER  |  AUS  |  ALL_COURT  ───────────────────
  BAKER_AUS: {
    id: "BAKER_AUS",
    photo: "https://files.catbox.moe/1h3r5c.png",
    name: "Baker",
    nickname: "Bakes",
    nationality: "AUS",
    age: 32,
    height: 1.85,
    weight: 80,
    styleId: "CTR_PUNCHER",
    color: "#884400",
    tagline: "Cada Grand Slam de casa pode ser o \xFAltimo.",
    bio: "O veterano australiano de 32 anos que ainda joga em Meridian todo ano. A mem\xF3ria e o ritmo compensam as pernas que j\xE1 n\xE3o voam. Um Masters, tr\xEAs ATP 500, 13 anos de tour. Cada Grand Slam de casa pode ser o \xFAltimo \u2014 e cada vez que isso \xE9 dito, ele chega mais longe.",
    career: "13 anos de tour. Um Masters. Cl\xE1ssico australiano que se recusa a sair.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 95,
    initialPts: 460,
    birthYear: 1993,
    potential: "CAMPEAO",
    developmentStyle: "LATE_BLOOMER",
    peakAge: 29,
    signatureShot: "BANANA_BH",
    rallyPattern: "DTL_HUNTER",
    signaturePattern: "BH_WALL",
    naturalSignature: "DROP_HIDDEN",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 72,
      explosividade: 68,
      resistencia: 76,
      defesa: 74,
      fhPotencia: 69,
      fhControle: 83,
      bhPotencia: 77,
      bhControle: 92,
      topspin: 70,
      slice: 80,
      saqueForca: 67,
      saquePrecisao: 79,
      devolucao: 75,
      volley: 74,
      smash: 70,
      leitura: 74,
      visaoTatica: 71,
      mentalidade: 79,
      regularidade: 81,
      recuperacao: 83,
      adaptacao: 74
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "AVOIDS",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "ALLOUT",
      adaptability: 77
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 38 — GRANT THOMSON  |  AUS  |  BIG_SERVER  ───────────────
  THOMSON_AUS: {
    id: "THOMSON_AUS",
    photo: "https://files.catbox.moe/npxdfb.png",
    name: "Thomson",
    nickname: "Thunder Down Under",
    nationality: "AUS",
    age: 23,
    height: 1.96,
    weight: 92,
    styleId: "BIG_SERVER",
    color: "#AAFF44",
    tagline: "O saque chegando a 215km/h em treino.",
    bio: "A Austr\xE1lia tem seus servidores. Thomson \xE9 o mais novo \u2014 1.96m, saque chegando a 215km/h em treino. O jogo de fundo \xE9 o trabalho em andamento que todo big server precisa desenvolver, mas a mat\xE9ria bruta j\xE1 est\xE1 em n\xEDvel de assombro.",
    career: "Pro 2024. Top 95. O futuro bate \xE0 porta com velocidade de primeiro saque.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 91,
    initialPts: 540,
    birthYear: 2002,
    potential: "ELITE",
    developmentStyle: "EARLY_BLOOMER",
    peakAge: 24,
    signatureShot: "FLAT_WINNER",
    rallyPattern: "AGGRESSIVE_EARLY",
    signaturePattern: "SERVE_COMMANDER",
    naturalSignature: "BH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 66,
      explosividade: 80,
      resistencia: 70,
      defesa: 66,
      fhPotencia: 80,
      fhControle: 50,
      bhPotencia: 65,
      bhControle: 46,
      topspin: 56,
      slice: 50,
      saqueForca: 86,
      saquePrecisao: 68,
      devolucao: 52,
      volley: 56,
      smash: 52,
      leitura: 60,
      visaoTatica: 67,
      mentalidade: 57,
      regularidade: 56,
      recuperacao: 59,
      adaptacao: 62
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "AVOIDS",
      rallyCadence: "EXPLOSIVE",
      riskProfile: "CALCULATED",
      adaptability: 58
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 39 — BEN PRICE  |  AUS  |  CTR_PUNCHER  ──────────────────
  PRICE_AUS: {
    id: "PRICE_AUS",
    photo: "https://files.catbox.moe/b7ah20.png",
    name: "Price",
    nickname: "Goldfields",
    nationality: "AUS",
    age: 27,
    height: 1.84,
    weight: 79,
    styleId: "TACT_TEC",
    color: "#CC6600",
    tagline: "Nunca vence torneios, nunca perde s\xE9ries.",
    bio: "O australiano de menor proje\xE7\xE3o mas de maior consist\xEAncia. Price nunca vence torneios, nunca perde s\xE9ries longas. Esse equil\xEDbrio \xE0s vezes \xE9 o \xFAnico em campo. Cinco anos no top 110, silenciosamente confi\xE1vel.",
    career: "Pro 2020. Top 105 est\xE1vel. A consist\xEAncia silenciosa que o circuito subestima todo ano.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 104,
    initialPts: 350,
    birthYear: 1998,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 28,
    signatureShot: "TOPSPIN_CROSS",
    rallyPattern: "DEFENSIVE_BASE",
    signaturePattern: "SHORT_ANGLE_ASSASSIN",
    naturalSignature: "FH_SHORT_ANGLE",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 74,
      explosividade: 66,
      resistencia: 82,
      defesa: 80,
      fhPotencia: 62,
      fhControle: 85,
      bhPotencia: 70,
      bhControle: 89,
      topspin: 66,
      slice: 80,
      saqueForca: 64,
      saquePrecisao: 79,
      devolucao: 69,
      volley: 55,
      smash: 59,
      leitura: 70,
      visaoTatica: 60,
      mentalidade: 75,
      regularidade: 79,
      recuperacao: 80,
      adaptacao: 76
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "PROACTIVE",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "ALLOUT",
      adaptability: 73
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 40 — CONNOR REID  |  NZL  |  ALL_COURT  ──────────────────
  REID_NZ: {
    id: "REID_NZ",
    photo: "https://files.catbox.moe/73d2dn.png",
    name: "Reid",
    nickname: "Albatross",
    nationality: "NZL",
    age: 20,
    height: 1.82,
    weight: 75,
    styleId: "ALL_COURT",
    color: "#003377",
    tagline: "O corredor aberto por Harris, Reid quer ir mais longe.",
    bio: "Segundo neozeland\xEAs no tour principal. Reid chegou no corredor aberto por Harris e quer ir mais longe. O ALL_COURT completo ainda em constru\xE7\xE3o, mas as pe\xE7as parecem certas e o car\xE1ter tamb\xE9m. 20 anos e j\xE1 sabe o caminho.",
    career: "Pro 2025. Primeira temporada. A Nova Zel\xE2ndia respira t\xEAnis pela segunda vez em anos.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 107,
    initialPts: 330,
    birthYear: 2005,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 25,
    signatureShot: "SHORT_ANGLE_FH",
    rallyPattern: "NET_APPROACH",
    signaturePattern: "SLICE_DISRUPTOR",
    naturalSignature: "DROP_HIDDEN",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 78,
      explosividade: 76,
      resistencia: 72,
      defesa: 71,
      fhPotencia: 71,
      fhControle: 67,
      bhPotencia: 69,
      bhControle: 68,
      topspin: 68,
      slice: 64,
      saqueForca: 69,
      saquePrecisao: 63,
      devolucao: 68,
      volley: 58,
      smash: 62,
      leitura: 66,
      visaoTatica: 64,
      mentalidade: 65,
      regularidade: 67,
      recuperacao: 66,
      adaptacao: 66
    },
    prefs: {
      buildStyle: "CROSS_BUILDER",
      netGame: "OPPORTUNIST",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "SAFE",
      adaptability: 65
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ══════════════════════════════════════════════════════════════
  // ══  AMÉRICAS  ════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════
  // ── 41 — CONNOR BRENNAN  |  USA  |  BIG_SERVER  ──────────────
  BRENNAN_USA: {
    id: "BRENNAN_USA",
    photo: "https://files.catbox.moe/zeuytf.png",
    name: "Connor Brennan",
    nickname: "Stars",
    nationality: "USA",
    age: 27,
    height: 1.93,
    weight: 89,
    styleId: "BIG_SERVER",
    color: "#3C3B6E",
    tagline: "J\xE1 foi n\xFAmero 1. Quer voltar. O circuito sabe que pode.",
    bio: "O americano chegou e virou o circuito de ponta-cabe\xE7a. Saque devastador, forehand pesado, e a confian\xE7a de quem sabe que nasceu para ser n\xFAmero 1. Dois Slams no Empire Open, sete Masters. Les\xE3o no ombro em 2024 freou o ritmo \u2014 mas n\xE3o apagou o n\xEDvel. Voltando.",
    career: "Dois Slams (Empire Open 2022 e 2023). Ex-n\xFAmero 1. Sete Masters. Retornando ao topo ap\xF3s les\xE3o no ombro 2024.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 3,
    initialPts: 10840,
    birthYear: 1998,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 26,
    signatureShot: "BIG_SERVE",
    rallyPattern: "SERVE_PLUS_ONE",
    signaturePattern: "SERVE_COMMANDER",
    naturalSignature: "FH_SHORT_ANGLE",
    alcunha: "SERVE_GOD",
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      // CORPO
      velocidade: 88,
      explosividade: 99,
      resistencia: 90,
      defesa: 84,
      fhPotencia: 99,
      fhControle: 78,
      bhPotencia: 88,
      bhControle: 75,
      topspin: 79,
      slice: 70,
      saqueForca: 99,
      saquePrecisao: 90,
      devolucao: 68,
      volley: 80,
      smash: 84,
      leitura: 85,
      visaoTatica: 92,
      mentalidade: 80,
      regularidade: 78,
      recuperacao: 76,
      adaptacao: 74,
      // LEITURA & DECISÃO
      leitura: 90,
      agressividade: 96,
      // CABEÇA
      mentalidade: 84,
      regularidade: 83
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "HUNTER",
      rallyCadence: "EXPLOSIVE",
      riskProfile: "ALLOUT",
      adaptability: 79
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 42 — DIEGO MONTES  |  CHI  |  AGG_BASELINER  ─────────────
  MONTES_CHI: {
    id: "MONTES_CHI",
    photo: "https://files.catbox.moe/s2ns9w.png",
    name: "Diego Montes",
    nickname: "Terremoto",
    nationality: "CHI",
    age: 25,
    height: 1.86,
    weight: 82,
    styleId: "CTR_PUNCHER",
    color: "#D52B1E",
    tagline: "Cinco sets s\xE3o onde ele brilha mais.",
    bio: "Chile colocou seu melhor produto no mapa. Montes \xE9 uma fus\xE3o de for\xE7a e velocidade que o saibro transforma em domin\xE2ncia. Resist\xEAncia e pot\xEAncia juntas \u2014 em cinco sets, ningu\xE9m o para. Primeiro Slam no Roland d'Occitane 2024, cinco Masters. Aos 25, o teto ainda n\xE3o apareceu.",
    career: "Primeiro Slam (Roland d'Occitane 2024). Cinco Masters. Top 5 com 25 anos. O maior tenista da hist\xF3ria do Chile.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 5,
    initialPts: 8640,
    birthYear: 2e3,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "FLAT_WINNER",
    rallyPattern: "CROSS_HEAVY",
    signaturePattern: "BH_WALL",
    naturalSignature: "BH_SLICE_DEEP",
    alcunha: "CLAY_KING",
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      // CORPO
      velocidade: 93,
      explosividade: 95,
      resistencia: 95,
      defesa: 86,
      fhPotencia: 97,
      fhControle: 74,
      bhPotencia: 88,
      bhControle: 76,
      topspin: 99,
      slice: 74,
      saqueForca: 88,
      saquePrecisao: 78,
      devolucao: 80,
      volley: 62,
      smash: 68,
      leitura: 82,
      visaoTatica: 90,
      mentalidade: 82,
      regularidade: 80,
      recuperacao: 80,
      adaptacao: 78
    },
    prefs: {
      buildStyle: "CROSS_BUILDER",
      netGame: "RELUCTANT",
      rallyCadence: "MEASURED",
      riskProfile: "GAMBLER",
      adaptability: 78
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 43 — PABLO HERRERA  |  ARG  |  CTR_PUNCHER  ──────────────
  HERRERA_ARG: {
    id: "HERRERA_ARG",
    photo: "https://files.catbox.moe/tfrfkv.png",
    name: "Pablo Herrera",
    nickname: "Pampa",
    nationality: "ARG",
    age: 29,
    height: 1.84,
    weight: 80,
    styleId: "GRINDER",
    color: "#75AADB",
    tagline: "Enquanto El Toro grita, Herrera calcula.",
    bio: "O segundo argentino \xE9 mais frio que Cardenas. O counter-punch no saibro \xE9 cir\xFArgico. Nunca perde a compostura, nunca diminui a intensidade. Quatro Masters \u2014 dois de saibro, um hard, um indoor. A versatilidade argentina que o circuito subestima.",
    career: "Quatro Masters \u2014 dois de saibro, um hard, um indoor. Top 10 em 2024. A Argentina tem dois estilos opostos e ambos vencem.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 8,
    initialPts: 6800,
    birthYear: 1996,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 29,
    signatureShot: "TOPSPIN_CROSS",
    rallyPattern: "RHYTHM_DISRUPTION",
    signaturePattern: "DEEP_COURT_GRINDER",
    naturalSignature: "BH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 82,
      explosividade: 73,
      resistencia: 94,
      defesa: 88,
      fhPotencia: 79,
      fhControle: 96,
      bhPotencia: 80,
      bhControle: 92,
      topspin: 77,
      slice: 96,
      saqueForca: 80,
      saquePrecisao: 84,
      devolucao: 86,
      volley: 65,
      smash: 64,
      leitura: 88,
      visaoTatica: 72,
      mentalidade: 92,
      regularidade: 94,
      recuperacao: 92,
      adaptacao: 87
    },
    prefs: {
      buildStyle: "CROSS_BUILDER",
      netGame: "OPPORTUNIST",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "ALLOUT",
      adaptability: 86
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 44 — SEBASTIÁN ÁLVAREZ  |  COL  |  AGG_BASELINER  ────────
  ALVAREZ_COL: {
    id: "ALVAREZ_COL",
    photo: "https://files.catbox.moe/ug4lkh.png",
    name: "Sebasti\xE1n \xC1lvarez",
    nickname: "El C\xF3ndor",
    nationality: "COL",
    age: 24,
    height: 1.85,
    weight: 80,
    styleId: "AGG_BASELINER",
    color: "#FFCC00",
    tagline: "Medell\xEDn exportou um fen\xF4meno.",
    bio: "Medell\xEDn exportou um fen\xF4meno. O forehand pesado com altitude de Bogot\xE1 nos pulm\xF5es \u2014 stamina de maratonista, poder de sprinter. A Col\xF4mbia est\xE1 em modo euforia h\xE1 dois anos. Tr\xEAs Masters de saibro e uma ascens\xE3o que o circuito ainda tenta entender.",
    career: "Pro 2021. Tr\xEAs Masters de saibro. Top 10 em 2025. O pr\xF3ximo grande da Am\xE9rica do Sul.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 9,
    initialPts: 6340,
    birthYear: 2001,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 26,
    signatureShot: "SHORT_ANGLE_FH",
    rallyPattern: "SHORT_ANGLE_BUILDER",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "FH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 89,
      explosividade: 91,
      resistencia: 94,
      defesa: 86,
      fhPotencia: 98,
      fhControle: 76,
      bhPotencia: 81,
      bhControle: 68,
      topspin: 98,
      slice: 68,
      saqueForca: 83,
      saquePrecisao: 77,
      devolucao: 71,
      volley: 57,
      smash: 63,
      leitura: 79,
      visaoTatica: 82,
      mentalidade: 79,
      regularidade: 77,
      recuperacao: 80,
      adaptacao: 75
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "RELUCTANT",
      rallyCadence: "EXPLOSIVE",
      riskProfile: "CALCULATED",
      adaptability: 74
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 45 — CARLOS VÁSQUEZ  |  MEX  |  AGG_BASELINER  ───────────
  VASQUEZ_MEX: {
    id: "VASQUEZ_MEX",
    photo: "https://files.catbox.moe/6yswpj.png",
    name: "Carlos V\xE1squez",
    nickname: "El Volc\xE1n",
    nationality: "MEX",
    age: 26,
    height: 1.84,
    weight: 81,
    styleId: "PWR_BASE",
    color: "#006847",
    tagline: "M\xE9xico finalmente tem seu representante de elite.",
    bio: "M\xE9xico finalmente tem seu representante de elite. V\xE1squez joga em alta intensidade o tempo todo \u2014 cada ponto \xE9 como o \xFAltimo. O torcedor mexicano quer mais e ele entrega semana ap\xF3s semana. Tr\xEAs Masters \u2014 dois em hard court, um no saibro. Top 10 desde 2024.",
    career: "Pro 2021. Top 10 desde 2024. Tr\xEAs Masters \u2014 dois em hard, um em saibro. O rosto do t\xEAnis mexicano.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 10,
    initialPts: 5940,
    birthYear: 1999,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "INSIDE_OUT_FH",
    rallyPattern: "CROSS_HEAVY",
    signaturePattern: "SERVE_COMMANDER",
    naturalSignature: "FH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 86,
      explosividade: 88,
      resistencia: 80,
      defesa: 80,
      fhPotencia: 94,
      fhControle: 68,
      bhPotencia: 77,
      bhControle: 64,
      topspin: 88,
      slice: 64,
      saqueForca: 78,
      saquePrecisao: 78,
      devolucao: 65,
      volley: 53,
      smash: 56,
      leitura: 76,
      visaoTatica: 82,
      mentalidade: 71,
      regularidade: 70,
      recuperacao: 70,
      adaptacao: 76
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "HUNTER",
      rallyCadence: "PATIENT",
      riskProfile: "CALCULATED",
      adaptability: 73
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 46 — JUAN RODRÍGUEZ  |  COL  |  CTR_PUNCHER  ─────────────
  RODRIGUEZ_COL: {
    id: "RODRIGUEZ_COL",
    photo: "https://files.catbox.moe/2v17jl.png",
    name: "Juan Rodr\xEDguez",
    nickname: "Jaguar",
    nationality: "COL",
    age: 26,
    height: 1.82,
    weight: 77,
    styleId: "CTR_PUNCHER",
    color: "#CC7700",
    tagline: "A escola colombiana quer sua segunda superestrela.",
    bio: "Companheiro de treino de \xC1lvarez, segundo colombiano no tour. Counter-punch paciente que explora cada cent\xEDmetro do saibro. Enquanto \xC1lvarez explode, Rodr\xEDguez constr\xF3i. Um Masters, tr\xEAs 500s. A escola colombiana quer sua segunda superestrela \u2014 e ele est\xE1 a caminho.",
    career: "Pro 2021. Um Masters. Top 35 est\xE1vel. A Col\xF4mbia tem uma gera\xE7\xE3o inteira.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 34,
    initialPts: 2160,
    birthYear: 1999,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "TOPSPIN_CROSS",
    rallyPattern: "DEFENSIVE_BASE",
    signaturePattern: "BH_WALL",
    naturalSignature: "BH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 76,
      explosividade: 68,
      resistencia: 88,
      defesa: 86,
      fhPotencia: 69,
      fhControle: 89,
      bhPotencia: 76,
      bhControle: 93,
      topspin: 70,
      slice: 88,
      saqueForca: 70,
      saquePrecisao: 78,
      devolucao: 78,
      volley: 60,
      smash: 62,
      leitura: 78,
      visaoTatica: 66,
      mentalidade: 83,
      regularidade: 85,
      recuperacao: 82,
      adaptacao: 84
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "OPPORTUNIST",
      rallyCadence: "EXPLOSIVE",
      riskProfile: "GAMBLER",
      adaptability: 81
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 47 — MARCUS WILSON  |  USA  |  ALL_COURT  ─────────────────
  WILSON_USA: {
    id: "WILSON_USA",
    photo: "https://files.catbox.moe/9nsdbi.png",
    name: "Marcus Wilson",
    nickname: "Flash",
    nationality: "USA",
    age: 24,
    height: 1.86,
    weight: 82,
    styleId: "ALL_COURT",
    color: "#3C3B6E",
    tagline: "O pr\xF3ximo passo \xE9 o top 20.",
    bio: "O segundo americano no top 40 \xE9 mais vers\xE1til que Brennan. Wilson tem o jogo mais completo dos EUA \u2014 e a confian\xE7a para ir al\xE9m. N\xE3o \xE9 o mais espetacular, \xE9 o mais s\xF3lido. Em qualquer superf\xEDcie, em qualquer momento. Um Masters, top 35 com 24 anos.",
    career: "Pro 2022. Um Masters. Top 35 desde 2024. O all-court americano que Brennan n\xE3o \xE9.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 32,
    initialPts: 2300,
    birthYear: 2001,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 26,
    signatureShot: "DROP_SHOT",
    rallyPattern: "RHYTHM_DISRUPTION",
    signaturePattern: "SHORT_ANGLE_ASSASSIN",
    naturalSignature: "BH_SLICE_DEEP",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 80,
      explosividade: 78,
      resistencia: 78,
      defesa: 74,
      fhPotencia: 77,
      fhControle: 78,
      bhPotencia: 79,
      bhControle: 78,
      topspin: 76,
      slice: 72,
      saqueForca: 72,
      saquePrecisao: 80,
      devolucao: 73,
      volley: 70,
      smash: 70,
      leitura: 78,
      visaoTatica: 77,
      mentalidade: 75,
      regularidade: 76,
      recuperacao: 72,
      adaptacao: 78
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "HUNTER",
      rallyCadence: "EXPLOSIVE",
      riskProfile: "SAFETY_FIRST",
      adaptability: 76
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 48 — TYLER PORTER  |  USA  |  BIG_SERVER  ────────────────
  PORTER_USA: {
    id: "PORTER_USA",
    photo: "https://files.catbox.moe/7mf234.png",
    name: "Tyler Porter",
    nickname: "Blazer",
    nationality: "USA",
    age: 22,
    height: 1.94,
    weight: 90,
    styleId: "BIG_SERVER",
    color: "#B22234",
    tagline: "O futuro de Brennan j\xE1 est\xE1 aqui.",
    bio: "O futuro de Brennan j\xE1 est\xE1 aqui. Porter \xE9 mais jovem, mais explosivo, e potencial LENDA. A Am\xE9rica prepara a sucess\xE3o \u2014 o atual n\xFAmero 1 americano e o futuro n\xFAmero 1 treinam na mesma academia. Brennan sabe o que isso significa. O circuito tamb\xE9m.",
    career: "Pro 2024. Quinto melhor estreante do tour em pontos. A promessa de uma gera\xE7\xE3o de d\xE9cadas.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 36,
    initialPts: 2100,
    birthYear: 2003,
    potential: "LENDA",
    developmentStyle: "EARLY_BLOOMER",
    peakAge: 24,
    signatureShot: "BIG_SERVE",
    rallyPattern: "AGGRESSIVE_EARLY",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "DROP_HIDDEN",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 72,
      explosividade: 88,
      resistencia: 74,
      defesa: 69,
      fhPotencia: 87,
      fhControle: 55,
      bhPotencia: 74,
      bhControle: 53,
      topspin: 62,
      slice: 52,
      saqueForca: 85,
      saquePrecisao: 76,
      devolucao: 53,
      volley: 59,
      smash: 57,
      leitura: 62,
      visaoTatica: 69,
      mentalidade: 62,
      regularidade: 60,
      recuperacao: 62,
      adaptacao: 63
    },
    prefs: {
      buildStyle: "CROSS_BUILDER",
      netGame: "RELUCTANT",
      rallyCadence: "MEASURED",
      riskProfile: "SAFE",
      adaptability: 62
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 49 — RYAN HENDERSON  |  CAN  |  ALL_COURT  ───────────────
  HENDERSON_CAN: {
    id: "HENDERSON_CAN",
    photo: "https://files.catbox.moe/2fidc1.png",
    name: "Ryan Henderson",
    nickname: "Maple",
    nationality: "CAN",
    age: 25,
    height: 1.85,
    weight: 80,
    styleId: "ADPT_TAC",
    color: "#CC0000",
    tagline: "Canad\xE1 voltou ao mapa. Top 20 parece quest\xE3o de tempo.",
    bio: "Canad\xE1 voltou ao mapa. Henderson tem o jogo completo que as academias do pa\xEDs desenvolveram \u2014 e a frieza para executar em momentos decisivos. N\xE3o \xE9 espetacular. \xC9 inevit\xE1vel. Dois ATP 500 na terceira temporada, e o ranking s\xF3 sobe.",
    career: "Pro 2022. Top 50 na terceira temporada. Dois ATP 500. O Canad\xE1 tem sua nova esperan\xE7a.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 48,
    initialPts: 1480,
    birthYear: 2e3,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "DROP_SHOT",
    rallyPattern: "CENTRE_CONTROL",
    signaturePattern: "LATE_MATCH_HUNTER",
    naturalSignature: "FH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 78,
      explosividade: 76,
      resistencia: 76,
      defesa: 79,
      fhPotencia: 77,
      fhControle: 75,
      bhPotencia: 74,
      bhControle: 74,
      topspin: 72,
      slice: 70,
      saqueForca: 76,
      saquePrecisao: 72,
      devolucao: 70,
      volley: 65,
      smash: 68,
      leitura: 74,
      visaoTatica: 69,
      mentalidade: 73,
      regularidade: 74,
      recuperacao: 69,
      adaptacao: 78
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "HUNTER",
      rallyCadence: "BALANCED",
      riskProfile: "CALCULATED",
      adaptability: 73
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 50 — MATEUS GOMES  |  BRA  |  ALL_COURT  ─────────────────
  GOMES_BRA: {
    id: "GOMES_BRA",
    photo: "https://files.catbox.moe/kn6rdw.png",
    name: "Mateus Gomes",
    nickname: "Samamba",
    nationality: "BRA",
    age: 23,
    height: 1.82,
    weight: 76,
    styleId: "AGG_BASELINER",
    color: "#009C3B",
    tagline: "O parceiro de treino que pode superar o mestre.",
    bio: "Companheiro de treino de Souza \u2014 que melhor escola existe? Gomes desenvolveu um jogo mais equilibrado, menos espetacular, mais consistente. Enquanto Souza explode, Gomes constr\xF3i. O Brasil tem dois estilos e ambos t\xEAm futuro. Dois ATP 500 na segunda temporada.",
    career: "Pro 2023. Top 45 na segunda temporada. Dois ATP 500. O contraponto racional ao caos de Souza.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 43,
    initialPts: 1700,
    birthYear: 2002,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 26,
    signatureShot: "INSIDE_OUT_FH",
    rallyPattern: "RHYTHM_DISRUPTION",
    signaturePattern: "LATE_MATCH_HUNTER",
    naturalSignature: "BH_SLICE_DEEP",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 78,
      explosividade: 76,
      resistencia: 76,
      defesa: 73,
      fhPotencia: 78,
      fhControle: 77,
      bhPotencia: 68,
      bhControle: 74,
      topspin: 74,
      slice: 70,
      saqueForca: 70,
      saquePrecisao: 78,
      devolucao: 68,
      volley: 65,
      smash: 67,
      leitura: 76,
      visaoTatica: 71,
      mentalidade: 73,
      regularidade: 75,
      recuperacao: 72,
      adaptacao: 74
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "HUNTER",
      rallyCadence: "BALANCED",
      riskProfile: "CALCULATED",
      adaptability: 74
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 51 — MARTÍN FERNÁNDEZ  |  ARG  |  TAKEALLRISK  ───────────
  FERNANDEZ_ARG: {
    id: "FERNANDEZ_ARG",
    photo: "https://files.catbox.moe/5j0llu.png",
    name: "Mart\xEDn Fern\xE1ndez",
    nickname: "Bonaerense",
    nationality: "ARG",
    age: 28,
    height: 1.83,
    weight: 79,
    styleId: "TAKEALLRISK",
    color: "#8FA8C8",
    tagline: "Argentina exporta t\xEAnis em s\xE9rie.",
    bio: "Argentina exporta t\xEAnis em s\xE9rie. Fern\xE1ndez traz o estilo imprevis\xEDvel ao circuito argentino. Menos genial que Delacroix, mais f\xEDsico. Drop shots em momentos imposs\xEDveis \u2014 e \xE0s vezes perde em sets retos para o #70. O circuito sul-americano o ama e \xE0s vezes o chora.",
    career: "Top 55 est\xE1vel. O circuito sul-americano o ama. Um ATP 500, seis 250s.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 51,
    initialPts: 1340,
    birthYear: 1997,
    potential: "CAMPEAO",
    developmentStyle: "VOLATILE",
    peakAge: 26,
    signatureShot: "SHORT_ANGLE_FH",
    rallyPattern: "AGGRESSIVE_EARLY",
    signaturePattern: "LATE_MATCH_HUNTER",
    naturalSignature: "FH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 82,
      explosividade: 88,
      resistencia: 66,
      defesa: 62,
      fhPotencia: 89,
      fhControle: 44,
      bhPotencia: 76,
      bhControle: 38,
      topspin: 84,
      slice: 62,
      saqueForca: 75,
      saquePrecisao: 54,
      devolucao: 40,
      volley: 53,
      smash: 59,
      leitura: 44,
      visaoTatica: 68,
      mentalidade: 49,
      regularidade: 45,
      recuperacao: 46,
      adaptacao: 44
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "AVOIDS",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "SAFE",
      adaptability: 47
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 52 — GABRIEL SANTOS  |  BRA  |  RETRIEVER  ───────────────
  SANTOS_BRA: {
    id: "SANTOS_BRA",
    photo: "https://files.catbox.moe/tyxh38.png",
    name: "Gabriel Santos",
    nickname: "Guerreiro",
    nationality: "BRA",
    age: 30,
    height: 1.81,
    weight: 76,
    styleId: "RETRIEVER",
    color: "#FFCC00",
    tagline: "Enquanto Souza ataca, Santos defende.",
    bio: "O defensor brasileiro. Enquanto Souza ataca, Santos defende \u2014 a dualidade do t\xEAnis brasileiro. Parceiros de Copa Davis que nunca se pareceram em quadra. 12 anos de tour, pico no top 40, ainda competitivo aos 30. Um ATP 500 e sete 250s de pura resist\xEAncia.",
    career: "12 anos de tour. Pico em #40. Um ATP 500, sete 250s. Ainda competitivo por pura determina\xE7\xE3o.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 64,
    initialPts: 1020,
    birthYear: 1995,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "DTL_BH",
    rallyPattern: "DEEP_GRINDER",
    signaturePattern: "DEEP_COURT_GRINDER",
    naturalSignature: "VOLLEY_ANGLE",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 86,
      explosividade: 74,
      resistencia: 90,
      defesa: 90,
      fhPotencia: 53,
      fhControle: 91,
      bhPotencia: 51,
      bhControle: 94,
      topspin: 62,
      slice: 84,
      saqueForca: 64,
      saquePrecisao: 71,
      devolucao: 83,
      volley: 54,
      smash: 56,
      leitura: 80,
      visaoTatica: 58,
      mentalidade: 81,
      regularidade: 86,
      recuperacao: 82,
      adaptacao: 78
    },
    prefs: {
      buildStyle: "CROSS_BUILDER",
      netGame: "HUNTER",
      rallyCadence: "PATIENT",
      riskProfile: "ALLOUT",
      adaptability: 81
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 53 — MIGUEL REYES  |  MEX  |  AGG_BASELINER  ─────────────
  REYES_MEX: {
    id: "REYES_MEX",
    photo: "https://files.catbox.moe/wc9rnp.png",
    name: "Miguel Reyes",
    nickname: "Azteca",
    nationality: "MEX",
    age: 25,
    height: 1.81,
    weight: 77,
    styleId: "AGG_BASELINER",
    color: "#CC1100",
    tagline: "O especialista de saibro do M\xE9xico.",
    bio: "O segundo mexicano no tour. Enquanto V\xE1squez domina hard, Reyes \xE9 o especialista de saibro. O duelo entre os dois no Davis \xE9 lend\xE1rio \u2014 estilos opostos, mesma bandeira. Reyes chegou mais devagar mas com base mais s\xF3lida. Top 55 e subindo.",
    career: "Pro 2022. Top 55 crescendo. Um ATP 500 no saibro. O M\xE9xico tem dois rostos diferentes.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 54,
    initialPts: 1280,
    birthYear: 2e3,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "FLAT_WINNER",
    rallyPattern: "DEEP_GRINDER",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "DROP_HIDDEN",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 82,
      explosividade: 82,
      resistencia: 78,
      defesa: 79,
      fhPotencia: 85,
      fhControle: 70,
      bhPotencia: 74,
      bhControle: 62,
      topspin: 86,
      slice: 62,
      saqueForca: 68,
      saquePrecisao: 74,
      devolucao: 64,
      volley: 48,
      smash: 55,
      leitura: 70,
      visaoTatica: 74,
      mentalidade: 68,
      regularidade: 68,
      recuperacao: 70,
      adaptacao: 70
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "AVOIDS",
      rallyCadence: "PATIENT",
      riskProfile: "SAFETY_FIRST",
      adaptability: 69
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 54 — JORDAN WEBB  |  USA  |  BIG_SERVER  ─────────────────
  WEBB_USA: {
    id: "WEBB_USA",
    photo: "https://files.catbox.moe/h3me5w.png",
    name: "Jordan Webb",
    nickname: "Cowboy",
    nationality: "USA",
    age: 33,
    height: 1.92,
    weight: 88,
    styleId: "BIG_SERVER",
    color: "#CC4422",
    tagline: "O veterano que nunca ganhou um Slam mas chegou perto.",
    bio: "O veterano americano que nunca ganhou um Slam mas chegou perto. 13 anos de tour, dois Masters, refer\xEAncia de uma gera\xE7\xE3o. O saque ainda impressiona com 33 anos \u2014 a velocidade caiu 5%, a precis\xE3o subiu. Adapta\xE7\xE3o de guerreiro. Webb n\xE3o sabe jogar de outro jeito.",
    career: "13 anos de tour. Dois Masters. Refer\xEAncia da gera\xE7\xE3o que abriu o caminho para Brennan.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 69,
    initialPts: 900,
    birthYear: 1992,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 29,
    signatureShot: "FLAT_WINNER",
    rallyPattern: "AGGRESSIVE_EARLY",
    signaturePattern: "SERVE_COMMANDER",
    naturalSignature: "VOLLEY_ANGLE",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 70,
      explosividade: 80,
      resistencia: 74,
      defesa: 71,
      fhPotencia: 80,
      fhControle: 62,
      bhPotencia: 70,
      bhControle: 60,
      topspin: 60,
      slice: 62,
      saqueForca: 88,
      saquePrecisao: 77,
      devolucao: 57,
      volley: 64,
      smash: 60,
      leitura: 72,
      visaoTatica: 71,
      mentalidade: 68,
      regularidade: 67,
      recuperacao: 69,
      adaptacao: 73
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "OPPORTUNIST",
      rallyCadence: "MEASURED",
      riskProfile: "CALCULATED",
      adaptability: 70
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 55 — THIAGO OLIVEIRA  |  BRA  |  SRV_VOL  ────────────────
  OLIVEIRA_BRA: {
    id: "OLIVEIRA_BRA",
    photo: "https://files.catbox.moe/8k6yai.png",
    name: "Thiago Oliveira",
    nickname: "Trov\xE3o",
    nationality: "BRA",
    age: 27,
    height: 1.88,
    weight: 82,
    styleId: "NET_SPEC",
    color: "#FFAA00",
    tagline: "O serve-volleyer brasileiro \u2014 t\xE3o incomum quanto fascinante.",
    bio: "O serve-volleyer brasileiro \u2014 t\xE3o incomum quanto fascinante. Oliveira aprendeu na grama europeia como bolsista e voltou diferente. O Brasil n\xE3o sabia que precisava de um serve-volleyer. Quando Oliveira chegou, entendeu. Especialista que surpreende em cada temporada de grama.",
    career: "Pro 2020. Especialista que surpreende em Wimbledon. Um ATP 500, quatro 250s.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 71,
    initialPts: 840,
    birthYear: 1998,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "VOLLEY_FINISH",
    rallyPattern: "NET_APPROACH",
    signaturePattern: "NET_CLOSER",
    naturalSignature: "BH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 82,
      explosividade: 84,
      resistencia: 68,
      defesa: 75,
      fhPotencia: 66,
      fhControle: 66,
      bhPotencia: 65,
      bhControle: 71,
      topspin: 56,
      slice: 76,
      saqueForca: 80,
      saquePrecisao: 84,
      devolucao: 60,
      volley: 82,
      smash: 81,
      leitura: 62,
      visaoTatica: 66,
      mentalidade: 63,
      regularidade: 65,
      recuperacao: 67,
      adaptacao: 66
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "OPPORTUNIST",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "SAFETY_FIRST",
      adaptability: 63
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 56 — FELIPE MENDES  |  BRA  |  AGG_BASELINER  ────────────
  MENDES_BRA: {
    id: "MENDES_BRA",
    photo: "https://files.catbox.moe/byg435.png",
    name: "Felipe Mendes",
    nickname: "Carioca",
    nationality: "BRA",
    age: 21,
    height: 1.83,
    weight: 77,
    styleId: "PWR_BASE",
    color: "#009C3B",
    tagline: "O Rio de Janeiro produziu mais um.",
    bio: "O Rio de Janeiro produziu mais um. 21 anos, forehand com rota\xE7\xE3o pesada, e a alegria tropical que o t\xEAnis nem sempre tem. Souza sorriu quando viu o menino treinar. Tr\xEAs 250s na primeira temporada completa \u2014 a Barra da Tijuca tem o pr\xF3ximo her\xF3i.",
    career: "Pro 2024. Tr\xEAs 250s na primeira temporada completa. O Brasil n\xE3o para de produzir.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 73,
    initialPts: 810,
    birthYear: 2004,
    potential: "ELITE",
    developmentStyle: "VOLATILE",
    peakAge: 24,
    signatureShot: "FLAT_WINNER",
    rallyPattern: "AGGRESSIVE_EARLY",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "DROP_HIDDEN",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 82,
      explosividade: 82,
      resistencia: 72,
      defesa: 74,
      fhPotencia: 87,
      fhControle: 68,
      bhPotencia: 67,
      bhControle: 60,
      topspin: 86,
      slice: 58,
      saqueForca: 70,
      saquePrecisao: 68,
      devolucao: 61,
      volley: 49,
      smash: 53,
      leitura: 68,
      visaoTatica: 72,
      mentalidade: 63,
      regularidade: 64,
      recuperacao: 62,
      adaptacao: 68
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "AVOIDS",
      rallyCadence: "EXPLOSIVE",
      riskProfile: "CALCULATED",
      adaptability: 65
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 57 — KEVIN CHEN  |  USA  |  ALL_COURT  ───────────────────
  CHEN_USA: {
    id: "CHEN_USA",
    photo: "https://files.catbox.moe/kxq3bf.png",
    name: "Kevin Chen",
    nickname: "Dragon USA",
    nationality: "USA",
    age: 23,
    height: 1.8,
    weight: 74,
    styleId: "TACT_TEC",
    color: "#AA2200",
    tagline: "Americano de origem taiwanesa que une os mundos.",
    bio: "Americano de origem taiwanesa \u2014 une os mundos. O jogo completo americano com a disciplina t\xE9cnica asi\xE1tica. Universidades americanas de t\xEAnis adotaram o modelo. Crescendo consistentemente, e o modelo parece estar funcionando melhor a cada torneio.",
    career: "Pro 2023. Crescendo consistentemente. Tr\xEAs 250s. A fus\xE3o cultural que o t\xEAnis americano precisava.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 77,
    initialPts: 760,
    birthYear: 2002,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 25,
    signatureShot: "DROP_SHOT",
    rallyPattern: "NET_APPROACH",
    signaturePattern: "SHORT_ANGLE_ASSASSIN",
    naturalSignature: "BH_SLICE_DEEP",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 76,
      explosividade: 74,
      resistencia: 74,
      defesa: 78,
      fhPotencia: 65,
      fhControle: 77,
      bhPotencia: 77,
      bhControle: 80,
      topspin: 70,
      slice: 68,
      saqueForca: 67,
      saquePrecisao: 75,
      devolucao: 68,
      volley: 66,
      smash: 61,
      leitura: 74,
      visaoTatica: 68,
      mentalidade: 71,
      regularidade: 73,
      recuperacao: 71,
      adaptacao: 74
    },
    prefs: {
      buildStyle: "CROSS_BUILDER",
      netGame: "HUNTER",
      rallyCadence: "MEASURED",
      riskProfile: "CALCULATED",
      adaptability: 72
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 58 — CRISTIÁN FUENTES  |  CHI  |  AGG_BASELINER  ─────────
  FUENTES_CHI: {
    id: "FUENTES_CHI",
    photo: "https://files.catbox.moe/iq37cq.png",
    name: "Cristi\xE1n Fuentes",
    nickname: "C\xF3ndor",
    nationality: "CHI",
    age: 26,
    height: 1.84,
    weight: 80,
    styleId: "CTR_PUNCHER",
    color: "#DD2222",
    tagline: "Quer sair da sombra de Montes.",
    bio: "O segundo chileno no tour que quer sair da sombra de Montes. Fuentes tem o talento mas ainda n\xE3o tem a consist\xEAncia que Montes construiu. A escola chilena garante que est\xE1 chegando \u2014 e quando chegar, a sombra vai ser menor do que parece hoje.",
    career: "Pro 2021. Top 80 com potencial para mais. Um ATP 500, quatro 250s.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 78,
    initialPts: 740,
    birthYear: 1999,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 28,
    signatureShot: "SHORT_ANGLE_FH",
    rallyPattern: "SHORT_ANGLE_BUILDER",
    signaturePattern: "BH_WALL",
    naturalSignature: "DROP_HIDDEN",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 80,
      explosividade: 80,
      resistencia: 74,
      defesa: 67,
      fhPotencia: 71,
      fhControle: 64,
      bhPotencia: 79,
      bhControle: 70,
      topspin: 82,
      slice: 58,
      saqueForca: 60,
      saquePrecisao: 73,
      devolucao: 68,
      volley: 50,
      smash: 53,
      leitura: 66,
      visaoTatica: 70,
      mentalidade: 62,
      regularidade: 62,
      recuperacao: 61,
      adaptacao: 66
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "OPPORTUNIST",
      rallyCadence: "EXPLOSIVE",
      riskProfile: "GAMBLER",
      adaptability: 64
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 59 — ANDRÉS ROJAS  |  COL  |  CTR_PUNCHER  ───────────────
  ROJAS_COL: {
    id: "ROJAS_COL",
    photo: "https://files.catbox.moe/0anch4.png",
    name: "Andr\xE9s Rojas",
    nickname: "Cafezinho",
    nationality: "COL",
    age: 27,
    height: 1.82,
    weight: 77,
    styleId: "AGG_BASELINER",
    color: "#FFCC00",
    tagline: "A Col\xF4mbia tem uma gera\xE7\xE3o \u2014 e um estilo coletivo.",
    bio: "O terceiro colombiano no tour. \xC1lvarez abriu, Rodr\xEDguez expandiu, Rojas consolidou. A Col\xF4mbia tem uma gera\xE7\xE3o \u2014 e um estilo coletivo baseado em saibro e counter. Rojas \xE9 o mais discreto dos tr\xEAs, o mais s\xF3lido. Um ATP 500, quatro 250s, top 80 est\xE1vel.",
    career: "Pro 2020. Top 80 est\xE1vel. Um ATP 500. A consist\xEAncia que sustenta a gera\xE7\xE3o colombiana.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 75,
    initialPts: 790,
    birthYear: 1998,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 28,
    signatureShot: "TOPSPIN_CROSS",
    rallyPattern: "CENTRE_CONTROL",
    signaturePattern: "LATE_MATCH_HUNTER",
    naturalSignature: "DROP_HIDDEN",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 72,
      explosividade: 66,
      resistencia: 84,
      defesa: 80,
      fhPotencia: 78,
      fhControle: 85,
      bhPotencia: 59,
      bhControle: 79,
      topspin: 66,
      slice: 84,
      saqueForca: 72,
      saquePrecisao: 66,
      devolucao: 69,
      volley: 51,
      smash: 57,
      leitura: 72,
      visaoTatica: 56,
      mentalidade: 77,
      regularidade: 82,
      recuperacao: 78,
      adaptacao: 76
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "OPPORTUNIST",
      rallyCadence: "PATIENT",
      riskProfile: "CALCULATED",
      adaptability: 75
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 60 — LUCAS TORRES  |  ARG  |  CTR_PUNCHER  ───────────────
  TORRES_ARG: {
    id: "TORRES_ARG",
    photo: "https://files.catbox.moe/tmog10.png",
    name: "Lucas Torres",
    nickname: "Llanero",
    nationality: "ARG",
    age: 32,
    height: 1.83,
    weight: 80,
    styleId: "GRINDER",
    color: "#AABBCC",
    tagline: "12 anos de saibro criam um sexto sentido.",
    bio: "Veterano argentino que fecha os olhos e sabe exatamente onde a bola vai pousar antes da raquete bater. 12 anos de saibro criam esse sentido. Pico em #27, um Masters, tr\xEAs ATP 500. Em queda lenta \u2014 mas ainda perigo m\xE1ximo no saibro.",
    career: "12 anos. Pico em #27. Um Masters, tr\xEAs ATP 500, dez 250s. Ainda relevante por pura intelig\xEAncia.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 82,
    initialPts: 680,
    birthYear: 1993,
    potential: "CAMPEAO",
    developmentStyle: "LATE_BLOOMER",
    peakAge: 29,
    signatureShot: "DROP_SHOT",
    rallyPattern: "CENTRE_CONTROL",
    signaturePattern: "BH_WALL",
    naturalSignature: "BH_SLICE_DEEP",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 70,
      explosividade: 64,
      resistencia: 82,
      defesa: 80,
      fhPotencia: 70,
      fhControle: 83,
      bhPotencia: 68,
      bhControle: 84,
      topspin: 66,
      slice: 86,
      saqueForca: 72,
      saquePrecisao: 70,
      devolucao: 78,
      volley: 58,
      smash: 58,
      leitura: 76,
      visaoTatica: 63,
      mentalidade: 81,
      regularidade: 83,
      recuperacao: 84,
      adaptacao: 82
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "RELUCTANT",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "CALCULATED",
      adaptability: 79
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 61 — HENRIQUE MIRANDA  |  BRA  |  SRV_VOL  ───────────────
  MIRANDA_BRA: {
    id: "MIRANDA_BRA",
    photo: "https://files.catbox.moe/97clsr.png",
    name: "Henrique Miranda",
    nickname: "Ipanema",
    nationality: "BRA",
    age: 29,
    height: 1.87,
    weight: 83,
    styleId: "SRV_VOL",
    color: "#009C3B",
    tagline: "Dois brasileiros serve-volleyers \xE9 improv\xE1vel demais para ser coincid\xEAncia.",
    bio: "Segundo serve-volleyer brasileiro. Miranda e Oliveira formam o par mais improv\xE1vel do circuito sul-americano. Ambos aprenderam em academias europeias. Ambos trouxeram algo de volta. Miranda \xE9 mais maduro, mais t\xE9cnico \u2014 a varia\xE7\xE3o de servi\xE7o \xE9 sua arma silenciosa.",
    career: "Pro 2018. Especialista de grama com resultado consistente. A escola europeia num corpo brasileiro.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 93,
    initialPts: 510,
    birthYear: 1996,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 28,
    signatureShot: "FLAT_WINNER",
    rallyPattern: "NET_APPROACH",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "BH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 78,
      explosividade: 80,
      resistencia: 66,
      defesa: 69,
      fhPotencia: 66,
      fhControle: 64,
      bhPotencia: 56,
      bhControle: 61,
      topspin: 52,
      slice: 72,
      saqueForca: 78,
      saquePrecisao: 78,
      devolucao: 55,
      volley: 69,
      smash: 67,
      leitura: 58,
      visaoTatica: 62,
      mentalidade: 59,
      regularidade: 62,
      recuperacao: 60,
      adaptacao: 58
    },
    prefs: {
      buildStyle: "CROSS_BUILDER",
      netGame: "AVOIDS",
      rallyCadence: "BALANCED",
      riskProfile: "ALLOUT",
      adaptability: 59
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 62 — ALEJANDRO MORENO  |  MEX  |  TAKEALLRISK  ───────────
  MORENO_MEX: {
    id: "MORENO_MEX",
    photo: "https://files.catbox.moe/tnhvtl.png",
    name: "Alejandro Moreno",
    nickname: "Fuego",
    nationality: "MEX",
    age: 21,
    height: 1.82,
    weight: 77,
    styleId: "TAKEALLRISK",
    color: "#FF6600",
    tagline: "Joga como se n\xE3o soubesse o que \xE9 medo.",
    bio: "O M\xE9xico tem um TAKEALLRISK? O circuito n\xE3o esperava. Moreno joga como se n\xE3o soubesse o que \xE9 medo \u2014 e aos 21, talvez n\xE3o saiba. Isso pode ser problema ou virtude. Segunda temporada animadora, dois 250s. O tempo vai dizer se o instinto se torna arte.",
    career: "Pro 2024. Segunda temporada animadora. Dois 250s. O caos organizado que ningu\xE9m preparou.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 87,
    initialPts: 610,
    birthYear: 2004,
    potential: "ELITE",
    developmentStyle: "VOLATILE",
    peakAge: 24,
    signatureShot: "DROP_SHOT",
    rallyPattern: "RHYTHM_DISRUPTION",
    signaturePattern: "SHORT_ANGLE_ASSASSIN",
    naturalSignature: "DROP_HIDDEN",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 80,
      explosividade: 84,
      resistencia: 62,
      defesa: 56,
      fhPotencia: 86,
      fhControle: 43,
      bhPotencia: 71,
      bhControle: 36,
      topspin: 78,
      slice: 58,
      saqueForca: 73,
      saquePrecisao: 54,
      devolucao: 40,
      volley: 52,
      smash: 56,
      leitura: 40,
      visaoTatica: 64,
      mentalidade: 46,
      regularidade: 42,
      recuperacao: 46,
      adaptacao: 40
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "OPPORTUNIST",
      rallyCadence: "BALANCED",
      riskProfile: "SAFETY_FIRST",
      adaptability: 43
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 63 — NICOLÁS VIDAL  |  CHI  |  RETRIEVER  ────────────────
  VIDAL_CHI: {
    id: "VIDAL_CHI",
    photo: "https://files.catbox.moe/bom87l.png",
    name: "Nicol\xE1s Vidal",
    nickname: "Trueno",
    nationality: "CHI",
    age: 22,
    height: 1.8,
    weight: 73,
    styleId: "RETRIEVER",
    color: "#0033AA",
    tagline: "Chile tem atacante e agora tem defensor.",
    bio: "Chile tem atacante (Montes) e agora tem defensor (Vidal). O circuito sul-americano ganha profundidade. Vidal absorveu os rallies longos e nunca reclamou do processo. Cada bola devolvida \xE9 uma declara\xE7\xE3o de que o Chile n\xE3o tem apenas um estilo.",
    career: "Pro 2024. Segunda temporada s\xF3lida. Dois 250s. A defesa chilena que Montes nunca p\xF4de ser.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 90,
    initialPts: 560,
    birthYear: 2003,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 26,
    signatureShot: "DROP_SHOT",
    rallyPattern: "CENTRE_CONTROL",
    signaturePattern: "BH_WALL",
    naturalSignature: "BH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 82,
      explosividade: 70,
      resistencia: 86,
      defesa: 88,
      fhPotencia: 48,
      fhControle: 90,
      bhPotencia: 50,
      bhControle: 89,
      topspin: 58,
      slice: 78,
      saqueForca: 53,
      saquePrecisao: 67,
      devolucao: 81,
      volley: 48,
      smash: 52,
      leitura: 76,
      visaoTatica: 57,
      mentalidade: 76,
      regularidade: 81,
      recuperacao: 78,
      adaptacao: 73
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "PROACTIVE",
      rallyCadence: "BALANCED",
      riskProfile: "GAMBLER",
      adaptability: 76
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 64 — RODRIGO SANTOS  |  PER  |  RETRIEVER  ───────────────
  SANTOS_PER: {
    id: "SANTOS_PER",
    photo: "https://files.catbox.moe/isgu9s.png",
    name: "Rodrigo Santos",
    nickname: "Inca",
    nationality: "PER",
    age: 24,
    height: 1.79,
    weight: 72,
    styleId: "CTR_PUNCHER",
    color: "#CC0000",
    tagline: "Peru nunca teve representante no top 100. Santos chegou e ficou.",
    bio: "Peru nunca teve representante no top 100 do tour principal. Santos chegou e ficou. Defende de forma rob\xF3tica, vence por cansa\xE7o advers\xE1rio. Cada partida carrega o peso hist\xF3rico de um pa\xEDs que o t\xEAnis nunca colocou no mapa \u2014 at\xE9 agora.",
    career: "Pro 2023. Hist\xF3rico para o t\xEAnis peruano. Top 95. Dois 250s que mudaram uma narrativa.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 92,
    initialPts: 520,
    birthYear: 2001,
    potential: "CAMPEAO",
    developmentStyle: "LATE_BLOOMER",
    peakAge: 28,
    signatureShot: "DTL_BH",
    rallyPattern: "DEFENSIVE_BASE",
    signaturePattern: "SLICE_DISRUPTOR",
    naturalSignature: "BH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 80,
      explosividade: 68,
      resistencia: 84,
      defesa: 80,
      fhPotencia: 48,
      fhControle: 83,
      bhPotencia: 55,
      bhControle: 88,
      topspin: 56,
      slice: 76,
      saqueForca: 56,
      saquePrecisao: 65,
      devolucao: 76,
      volley: 51,
      smash: 55,
      leitura: 74,
      visaoTatica: 53,
      mentalidade: 73,
      regularidade: 78,
      recuperacao: 75,
      adaptacao: 70
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "OPPORTUNIST",
      rallyCadence: "PATIENT",
      riskProfile: "GAMBLER",
      adaptability: 73
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 65 — DEREK BLACKWOOD  |  USA  |  BIG_SERVER  ─────────────
  BLACKWOOD_USA: {
    id: "BLACKWOOD_USA",
    photo: "https://files.catbox.moe/92gsxc.png",
    name: "Derek Blackwood",
    nickname: "Brooklyn",
    nationality: "USA",
    age: 20,
    height: 1.97,
    weight: 93,
    styleId: "BIG_SERVER",
    color: "#1133AA",
    tagline: "Brennan o viu treinar e disse algo que n\xE3o gostaria de repetir.",
    bio: "1.97m, 20 anos, saque chegando a 210km/h j\xE1. Brennan o viu treinar e disse algo que n\xE3o gostaria de repetir. A Am\xE9rica do Norte vai ter tr\xEAs pot\xEAncias no tour em breve \u2014 e a mais assustadora pode ainda n\xE3o ter chegado ao n\xEDvel que vai chegar.",
    career: "Pro 2025. Primeira temporada ainda em aprendizado. Um 250. A sombra de Brennan como privil\xE9gio e exig\xEAncia.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 99,
    initialPts: 400,
    birthYear: 2005,
    potential: "LENDA",
    developmentStyle: "EARLY_BLOOMER",
    peakAge: 23,
    signatureShot: "INSIDE_OUT_FH",
    rallyPattern: "CENTRE_CONTROL",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "BH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 68,
      explosividade: 82,
      resistencia: 68,
      defesa: 60,
      fhPotencia: 79,
      fhControle: 50,
      bhPotencia: 69,
      bhControle: 47,
      topspin: 56,
      slice: 46,
      saqueForca: 71,
      saquePrecisao: 71,
      devolucao: 50,
      volley: 47,
      smash: 45,
      leitura: 56,
      visaoTatica: 63,
      mentalidade: 53,
      regularidade: 52,
      recuperacao: 53,
      adaptacao: 54
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "HUNTER",
      rallyCadence: "BALANCED",
      riskProfile: "SAFETY_FIRST",
      adaptability: 54
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 66 — ANDRE JAMES  |  USA  |  AGG_BASELINER  ──────────────
  JAMES_USA: {
    id: "JAMES_USA",
    photo: "https://files.catbox.moe/jxdy5b.png",
    name: "Andre James",
    nickname: "Hoops",
    nationality: "USA",
    age: 19,
    height: 1.96,
    weight: 90,
    styleId: "AGG_BASELINER",
    color: "#B22234",
    tagline: "19 anos, ex-basquetista. O atletismo \xE9 excepcional.",
    bio: "19 anos, ex-basquetista que migrou para o t\xEAnis aos 14. O atletismo \xE9 excepcional \u2014 a t\xE9cnica ainda em desenvolvimento. Os treinadores dizem que \xE9 s\xF3 quest\xE3o de tempo. O circuito ainda n\xE3o sabe o que fazer com algu\xE9m t\xE3o veloz e t\xE3o cru ao mesmo tempo.",
    career: "Pro 2025. Primeira temporada. O atletismo que o t\xEAnis americano precisava ver.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 103,
    initialPts: 360,
    birthYear: 2006,
    potential: "ELITE",
    developmentStyle: "VOLATILE",
    peakAge: 24,
    signatureShot: "SHORT_ANGLE_FH",
    rallyPattern: "AGGRESSIVE_EARLY",
    signaturePattern: "SERVE_COMMANDER",
    naturalSignature: "FH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 88,
      explosividade: 90,
      resistencia: 68,
      defesa: 67,
      fhPotencia: 73,
      fhControle: 54,
      bhPotencia: 61,
      bhControle: 49,
      topspin: 72,
      slice: 48,
      saqueForca: 66,
      saquePrecisao: 60,
      devolucao: 57,
      volley: 46,
      smash: 49,
      leitura: 60,
      visaoTatica: 70,
      mentalidade: 51,
      regularidade: 51,
      recuperacao: 54,
      adaptacao: 58
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "AVOIDS",
      rallyCadence: "MEASURED",
      riskProfile: "SAFE",
      adaptability: 55
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ══════════════════════════════════════════════════════════════
  // ══  ÁSIA  ════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════
  // ── 67 — ZHANG LEI  |  CHN  |  AGG_BASELINER  ────────────────
  ZHANG_LEI: {
    id: "ZHANG_LEI",
    photo: "https://files.catbox.moe/uuj96b.png",
    name: "Zhang Lei",
    nickname: "Drag\xE3o",
    nationality: "CHN",
    age: 27,
    height: 1.87,
    weight: 83,
    styleId: "AGG_BASELINER",
    color: "#DD0000",
    tagline: "Enquanto Chen Wei defende, Zhang Lei ataca sem miseric\xF3rdia.",
    bio: "O segundo chin\xEAs no top 20. Enquanto Chen Wei defende, Zhang Lei ataca sem miseric\xF3rdia. O forehand n\xE3o tem a finesse do europeu mas a pot\xEAncia \xE9 compar\xE1vel \xE0 de Osei. A China domina por cima e por baixo da linha de base \u2014 e Zhang Lei \xE9 o lado de cima.",
    career: "Pro 2019. Top 15 desde 2023. Dois Masters. A China domina por cima e por baixo da linha de base.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 13,
    initialPts: 5200,
    birthYear: 1998,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "INSIDE_OUT_FH",
    rallyPattern: "AGGRESSIVE_EARLY",
    signaturePattern: "SERVE_COMMANDER",
    naturalSignature: "FH_SHORT_ANGLE",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 82,
      explosividade: 86,
      resistencia: 80,
      defesa: 72,
      fhPotencia: 96,
      fhControle: 69,
      bhPotencia: 79,
      bhControle: 66,
      topspin: 88,
      slice: 62,
      saqueForca: 77,
      saquePrecisao: 77,
      devolucao: 66,
      volley: 53,
      smash: 59,
      leitura: 74,
      visaoTatica: 82,
      mentalidade: 73,
      regularidade: 71,
      recuperacao: 74,
      adaptacao: 76
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "AVOIDS",
      rallyCadence: "BALANCED",
      riskProfile: "CALCULATED",
      adaptability: 73
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 68 — JUNHO PARK  |  KOR  |  ALL_COURT  ───────────────────
  PARK_JUNHO: {
    id: "PARK_JUNHO",
    photo: "https://files.catbox.moe/b3r0xp.png",
    name: "Junho Park",
    nickname: "Manhwa",
    nationality: "KOR",
    age: 23,
    height: 1.82,
    weight: 75,
    styleId: "ADPT_TAC",
    color: "#0066CC",
    tagline: "Cada torneio na \xC1sia \xE9 um evento nacional.",
    bio: "A Coreia do Sul esperou anos por um talento assim. Park combina a precis\xE3o t\xE9cnica asi\xE1tica com a intensidade f\xEDsica moderna. Cada torneio na \xC1sia \xE9 um evento nacional. O Masters Dragon Cup 2024 foi o t\xEDtulo que mudou tudo \u2014 de promessa a realidade.",
    career: "Pro 2021. Top 20 com 23 anos. Masters Dragon Cup 2024. O t\xEDtulo que transformou uma promessa em realidade.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 17,
    initialPts: 4180,
    birthYear: 2002,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 26,
    signatureShot: "BANANA_BH",
    rallyPattern: "DTL_HUNTER",
    signaturePattern: "SLICE_DISRUPTOR",
    naturalSignature: "BH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 82,
      explosividade: 80,
      resistencia: 80,
      defesa: 81,
      fhPotencia: 80,
      fhControle: 82,
      bhPotencia: 83,
      bhControle: 83,
      topspin: 78,
      slice: 76,
      saqueForca: 75,
      saquePrecisao: 83,
      devolucao: 73,
      volley: 72,
      smash: 71,
      leitura: 80,
      visaoTatica: 81,
      mentalidade: 77,
      regularidade: 79,
      recuperacao: 75,
      adaptacao: 78
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "RELUCTANT",
      rallyCadence: "BALANCED",
      riskProfile: "GAMBLER",
      adaptability: 78
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 69 — DAICHI KIMURA  |  JPN  |  SRV_VOL  ─────────────────
  KIMURA: {
    id: "KIMURA",
    photo: "https://files.catbox.moe/27v6v4.png",
    name: "Daichi Kimura",
    nickname: "Kamikaze",
    nationality: "JPN",
    age: 25,
    height: 1.86,
    weight: 79,
    styleId: "NET_SPEC",
    color: "#CC4400",
    tagline: "Sobe \xE0 rede quase em cada ponto. Aceita o risco.",
    bio: "O Jap\xE3o tem dois serve-volleyers no tour. Kimura \xE9 o mais agressivo \u2014 sobe \xE0 rede quase em cada ponto, aceita o risco, e na grama converte mais do que parece razo\xE1vel. O estilo \xE9 suicida no saibro e devastador em Wimbledon. N\xE3o h\xE1 meio-termo.",
    career: "Profissional 2021. Especialista em grama que sobrevive bem no resto. Tr\xEAs ATP 500, sete 250s.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 28,
    initialPts: 2700,
    birthYear: 2e3,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 26,
    signatureShot: "VOLLEY_FINISH",
    rallyPattern: "SERVE_PLUS_ONE",
    signaturePattern: "NET_CLOSER",
    naturalSignature: "BH_SLICE_DEEP",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 86,
      explosividade: 88,
      resistencia: 70,
      defesa: 75,
      fhPotencia: 70,
      fhControle: 64,
      bhPotencia: 70,
      bhControle: 69,
      topspin: 58,
      slice: 76,
      saqueForca: 85,
      saquePrecisao: 87,
      devolucao: 62,
      volley: 89,
      smash: 86,
      leitura: 68,
      visaoTatica: 74,
      mentalidade: 65,
      regularidade: 65,
      recuperacao: 65,
      adaptacao: 68
    },
    prefs: {
      buildStyle: "CROSS_BUILDER",
      netGame: "PROACTIVE",
      rallyCadence: "BALANCED",
      riskProfile: "GAMBLER",
      adaptability: 66
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 70 — LI WEN  |  CHN  |  RETRIEVER  ──────────────────────
  LI_WEN: {
    id: "LI_WEN",
    photo: "https://files.catbox.moe/yt6k1m.png",
    name: "Li Wen",
    nickname: "Fantoche",
    nationality: "CHN",
    age: 26,
    height: 1.8,
    weight: 73,
    styleId: "CTR_PUNCHER",
    color: "#FF6600",
    tagline: "Vers\xE3o ligeiramente menor, igualmente frustrante para advers\xE1rios.",
    bio: "O terceiro chin\xEAs do tour \xE9 o mais defensivo dos tr\xEAs. Parceiro de treino de Chen Wei, aprendeu com o melhor e est\xE1 aplicando. Vers\xE3o ligeiramente menor do mestre, igualmente frustrante para advers\xE1rios. O trio chin\xEAs no tour \xE9 in\xE9dito historicamente.",
    career: "Pro 2021. Top 40 est\xE1vel. Dois ATP 500, sete 250s. O trio chin\xEAs no tour \xE9 in\xE9dito historicamente.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 36,
    initialPts: 2100,
    birthYear: 1999,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "SLICE_BH",
    rallyPattern: "DEEP_GRINDER",
    signaturePattern: "BH_WALL",
    naturalSignature: "FH_SHORT_ANGLE",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 90,
      explosividade: 78,
      resistencia: 92,
      defesa: 90,
      fhPotencia: 53,
      fhControle: 94,
      bhPotencia: 63,
      bhControle: 94,
      topspin: 66,
      slice: 84,
      saqueForca: 65,
      saquePrecisao: 77,
      devolucao: 81,
      volley: 61,
      smash: 64,
      leitura: 86,
      visaoTatica: 60,
      mentalidade: 85,
      regularidade: 88,
      recuperacao: 83,
      adaptacao: 84
    },
    prefs: {
      buildStyle: "CROSS_BUILDER",
      netGame: "OPPORTUNIST",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "GAMBLER",
      adaptability: 85
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 71 — TAKUMI HONDA  |  JPN  |  CTR_PUNCHER  ───────────────
  HONDA: {
    id: "HONDA",
    photo: "https://files.catbox.moe/qf0col.png",
    name: "Takumi Honda",
    nickname: "Precision",
    nationality: "JPN",
    age: 28,
    height: 1.79,
    weight: 72,
    styleId: "TACT_TEC",
    color: "#0044AA",
    tagline: "Aprendeu olhando o mestre. Aplica com perfei\xE7\xE3o.",
    bio: "O mais calculista dos japoneses no tour. Counter-punch que transforma o poder do advers\xE1rio em vantagem. Parceiro de treino frequente de Nakamura \u2014 aprendeu olhando o mestre. Nunca dominante, sempre competitivo. Top 45 est\xE1vel por quatro temporadas.",
    career: "Pro 2019. Top 45 est\xE1vel. Dois ATP 500, sete 250s. A solidez que Nakamura admira em treino.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 43,
    initialPts: 1700,
    birthYear: 1997,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 28,
    signatureShot: "DROP_SHOT",
    rallyPattern: "DEEP_GRINDER",
    signaturePattern: "SHORT_ANGLE_ASSASSIN",
    naturalSignature: "BH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 78,
      explosividade: 70,
      resistencia: 86,
      defesa: 87,
      fhPotencia: 68,
      fhControle: 90,
      bhPotencia: 74,
      bhControle: 90,
      topspin: 70,
      slice: 88,
      saqueForca: 70,
      saquePrecisao: 77,
      devolucao: 74,
      volley: 62,
      smash: 61,
      leitura: 80,
      visaoTatica: 68,
      mentalidade: 84,
      regularidade: 86,
      recuperacao: 85,
      adaptacao: 78
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "AVOIDS",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "SAFE",
      adaptability: 82
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 72 — RYUSUKE TANAKA  |  JPN  |  BIG_SERVER  ──────────────
  TANAKA: {
    id: "TANAKA",
    photo: "https://files.catbox.moe/lxvxwq.png",
    name: "Ryusuke Tanaka",
    nickname: "Mugen",
    nationality: "JPN",
    age: 29,
    height: 1.91,
    weight: 84,
    styleId: "BIG_SERVER",
    color: "#880088",
    tagline: "O servidor japon\xEAs que ningu\xE9m esperava.",
    bio: "O servidor japon\xEAs que ningu\xE9m esperava. 1.91m de alcance e um saque que chega alto. O jogo de fundo \xE9 de n\xEDvel m\xE9dio mas a arma do saque garante sets na grama e no indoor. Carreira longa de especialista \u2014 Grama e Indoor s\xE3o o domic\xEDlio.",
    career: "Pro 2017. Carreira longa de especialista. Um ATP 500, cinco 250s. Grama e Indoor s\xE3o o domic\xEDlio.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 49,
    initialPts: 1400,
    birthYear: 1996,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 28,
    signatureShot: "BIG_SERVE",
    rallyPattern: "SERVE_PLUS_ONE",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "BH_SLICE_DEEP",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 68,
      explosividade: 80,
      resistencia: 74,
      defesa: 68,
      fhPotencia: 76,
      fhControle: 62,
      bhPotencia: 67,
      bhControle: 60,
      topspin: 58,
      slice: 60,
      saqueForca: 95,
      saquePrecisao: 82,
      devolucao: 56,
      volley: 65,
      smash: 60,
      leitura: 70,
      visaoTatica: 72,
      mentalidade: 65,
      regularidade: 66,
      recuperacao: 67,
      adaptacao: 64
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "RELUCTANT",
      rallyCadence: "BALANCED",
      riskProfile: "SAFETY_FIRST",
      adaptability: 67
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 73 — HO-JIN SHIN  |  KOR  |  AGG_BASELINER  ──────────────
  SHIN_HOJIN: {
    id: "SHIN_HOJIN",
    photo: "https://files.catbox.moe/7m2ivg.png",
    name: "Ho-jin Shin",
    nickname: "Tiger",
    nationality: "KOR",
    age: 22,
    height: 1.84,
    weight: 78,
    styleId: "PWR_BASE",
    color: "#CC0000",
    tagline: "A Coreia est\xE1 montando uma gera\xE7\xE3o.",
    bio: "O segundo coreano no tour. Menos t\xE9cnico que Park mas igualmente intenso. O forehand potente compensa as lacunas na consist\xEAncia \u2014 e a consist\xEAncia est\xE1 melhorando a cada torneio. A Coreia est\xE1 montando uma gera\xE7\xE3o e Shin \xE9 o segundo andar.",
    career: "Pro 2023. Top 55 na segunda temporada. Um ATP 500, quatro 250s. Caminho claro para o top 30.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 52,
    initialPts: 1320,
    birthYear: 2003,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 25,
    signatureShot: "INSIDE_OUT_FH",
    rallyPattern: "SHORT_ANGLE_BUILDER",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "BH_SLICE_DEEP",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 82,
      explosividade: 82,
      resistencia: 74,
      defesa: 72,
      fhPotencia: 91,
      fhControle: 65,
      bhPotencia: 74,
      bhControle: 60,
      topspin: 84,
      slice: 60,
      saqueForca: 70,
      saquePrecisao: 74,
      devolucao: 62,
      volley: 51,
      smash: 54,
      leitura: 70,
      visaoTatica: 73,
      mentalidade: 67,
      regularidade: 66,
      recuperacao: 67,
      adaptacao: 72
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "AVOIDS",
      rallyCadence: "EXPLOSIVE",
      riskProfile: "SAFE",
      adaptability: 68
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 74 — HARUTO NAKAMURA  |  JPN  |  ALL_COURT  ──────────────
  NAKAMURA_H: {
    id: "NAKAMURA_H",
    photo: "https://files.catbox.moe/5hudg1.png",
    name: "Haruto Nakamura",
    nickname: "Heiwa",
    nationality: "JPN",
    age: 24,
    height: 1.78,
    weight: 72,
    styleId: "ALL_COURT",
    color: "#FF6600",
    tagline: "Carrega o sobrenome com press\xE3o. Constr\xF3i uma identidade pr\xF3pria.",
    bio: "Sem parentesco com Kenji mas carrega o sobrenome com press\xE3o. Est\xE1 construindo uma identidade pr\xF3pria \u2014 o ALL_COURT menos elegante mas mais agressivo dos Nakamuras do tour. A compara\xE7\xE3o \xE9 inevit\xE1vel, o destino \xE9 diferente.",
    career: "Pro 2022. Top 60 crescendo. Um ATP 500, quatro 250s. A identidade que ainda est\xE1 sendo escrita.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 56,
    initialPts: 1220,
    birthYear: 2001,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 26,
    signatureShot: "INSIDE_OUT_FH",
    rallyPattern: "CENTRE_CONTROL",
    signaturePattern: "SLICE_DISRUPTOR",
    naturalSignature: "VOLLEY_ANGLE",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 80,
      explosividade: 78,
      resistencia: 76,
      defesa: 79,
      fhPotencia: 75,
      fhControle: 73,
      bhPotencia: 78,
      bhControle: 75,
      topspin: 74,
      slice: 70,
      saqueForca: 72,
      saquePrecisao: 72,
      devolucao: 71,
      volley: 69,
      smash: 66,
      leitura: 74,
      visaoTatica: 73,
      mentalidade: 70,
      regularidade: 71,
      recuperacao: 74,
      adaptacao: 75
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "PROACTIVE",
      rallyCadence: "MEASURED",
      riskProfile: "ALLOUT",
      adaptability: 72
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 75 — ARIF RAHMAN  |  IND  |  AGG_BASELINER  ──────────────
  INDO_RAHMAN: {
    id: "INDO_RAHMAN",
    photo: "https://files.catbox.moe/iudi6h.png",
    name: "Arif Rahman",
    nickname: "Garuda",
    nationality: "IND",
    age: 25,
    height: 1.85,
    weight: 80,
    styleId: "GRINDER",
    color: "#FF8800",
    tagline: "A \xCDndia finalmente tem um representante s\xE9rio no tour masculino.",
    bio: "A \xCDndia finalmente tem um representante s\xE9rio no tour masculino. Rahman chegou explosivamente \u2014 forehand pesado e f\xEDsico constru\xEDdo especificamente para o t\xEAnis moderno. Primeiro top 60 indiano em d\xE9cadas. Cada vit\xF3ria \xE9 celebrada como conquista nacional.",
    career: "Pro 2022. Primeiro top 60 indiano em d\xE9cadas. Um ATP 500, quatro 250s. Celebra\xE7\xE3o nacional em cada ponto.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 59,
    initialPts: 1140,
    birthYear: 2e3,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "TOPSPIN_CROSS",
    rallyPattern: "SHORT_ANGLE_BUILDER",
    signaturePattern: "DEEP_COURT_GRINDER",
    naturalSignature: "VOLLEY_ANGLE",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 82,
      explosividade: 84,
      resistencia: 76,
      defesa: 74,
      fhPotencia: 83,
      fhControle: 68,
      bhPotencia: 73,
      bhControle: 65,
      topspin: 84,
      slice: 60,
      saqueForca: 71,
      saquePrecisao: 71,
      devolucao: 72,
      volley: 52,
      smash: 50,
      leitura: 72,
      visaoTatica: 76,
      mentalidade: 69,
      regularidade: 69,
      recuperacao: 69,
      adaptacao: 70
    },
    prefs: {
      buildStyle: "DTL_HUNTER",
      netGame: "PROACTIVE",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "SAFE",
      adaptability: 70
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 76 — HIROKI TSUKAMOTO  |  JPN  |  TAKEALLRISK  ───────────
  TSUKAMOTO: {
    id: "TSUKAMOTO",
    photo: "https://files.catbox.moe/8dul99.png",
    name: "Hiroki Tsukamoto",
    nickname: "Onda",
    nationality: "JPN",
    age: 23,
    height: 1.8,
    weight: 73,
    styleId: "TAKEALLRISK",
    color: "#BB2200",
    tagline: "O \xFAnico japon\xEAs TAKEALLRISK do tour.",
    bio: "O japon\xEAs ca\xF3tico. O \xFAnico japon\xEAs TAKEALLRISK do tour \u2014 e isso confunde todo mundo, incluindo ele mesmo \xE0s vezes. Os compatriotas ainda n\xE3o sabem se s\xE3o f\xE3s ou est\xE3o envergonhados. Os resultados justificam o interesse. Um ATP 500 que ningu\xE9m esperava.",
    career: "Pro 2023. Um ATP 500, tr\xEAs 250s. O estilo \xFAnico que o circuito asi\xE1tico nunca viu.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 63,
    initialPts: 1040,
    birthYear: 2002,
    potential: "ELITE",
    developmentStyle: "VOLATILE",
    peakAge: 25,
    signatureShot: "DROP_SHOT",
    rallyPattern: "SHORT_ANGLE_BUILDER",
    signaturePattern: "LATE_MATCH_HUNTER",
    naturalSignature: "DROP_HIDDEN",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 84,
      explosividade: 86,
      resistencia: 64,
      defesa: 58,
      fhPotencia: 91,
      fhControle: 48,
      bhPotencia: 76,
      bhControle: 42,
      topspin: 80,
      slice: 62,
      saqueForca: 79,
      saquePrecisao: 57,
      devolucao: 41,
      volley: 54,
      smash: 59,
      leitura: 46,
      visaoTatica: 62,
      mentalidade: 49,
      regularidade: 45,
      recuperacao: 47,
      adaptacao: 44
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "HUNTER",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "GAMBLER",
      adaptability: 48
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 77 — JISOO BAEK  |  KOR  |  RETRIEVER  ───────────────────
  BAEK_JISOO: {
    id: "BAEK_JISOO",
    photo: "https://files.catbox.moe/sj3d5p.png",
    name: "Jisoo Baek",
    nickname: "Bunker",
    nationality: "KOR",
    age: 24,
    height: 1.79,
    weight: 71,
    styleId: "RETRIEVER",
    color: "#003366",
    tagline: "A Coreia tem atacantes e agora tem um defensor.",
    bio: "Terceiro coreano no tour, o mais defensivo. Aprende com Chen Wei via v\xEDdeos \u2014 admite sem constrangimento. A Coreia tem atacantes e agora tem um defensor. Cada rally longo ganho por Baek \xE9 uma mensagem: n\xE3o h\xE1 apenas um jeito de vencer.",
    career: "Pro 2023. Tr\xEAs 250s. Surpresa nas fases iniciais de Slams pela paci\xEAncia absurda.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 66,
    initialPts: 980,
    birthYear: 2001,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "DROP_SHOT",
    rallyPattern: "CENTRE_CONTROL",
    signaturePattern: "BH_WALL",
    naturalSignature: "BH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 86,
      explosividade: 74,
      resistencia: 88,
      defesa: 84,
      fhPotencia: 51,
      fhControle: 90,
      bhPotencia: 52,
      bhControle: 94,
      topspin: 60,
      slice: 80,
      saqueForca: 55,
      saquePrecisao: 71,
      devolucao: 83,
      volley: 52,
      smash: 57,
      leitura: 80,
      visaoTatica: 56,
      mentalidade: 81,
      regularidade: 84,
      recuperacao: 84,
      adaptacao: 84
    },
    prefs: {
      buildStyle: "CROSS_BUILDER",
      netGame: "OPPORTUNIST",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "GAMBLER",
      adaptability: 81
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 78 — SANG-HOON LEE  |  KOR  |  ALL_COURT  ────────────────
  LEE_SANGHOON: {
    id: "LEE_SANGHOON",
    photo: "https://files.catbox.moe/x9wqj0.png",
    name: "Sang-hoon Lee",
    nickname: "Sombra",
    nationality: "KOR",
    age: 26,
    height: 1.82,
    weight: 76,
    styleId: "CTR_PUNCHER",
    color: "#006666",
    tagline: "Um ALL_COURT que sobrevive sem dominar.",
    bio: "Quinto coreano no tour, o mais vers\xE1til. Lee n\xE3o tem o poder de Park nem a defesa de Baek, mas faz tudo no n\xEDvel suficiente para vencer. Um ALL_COURT que sobrevive sem dominar \u2014 e \xE0s vezes isso \xE9 exatamente o que o torneio exige.",
    career: "Pro 2021. Top 70 consistente. Um ATP 500, quatro 250s. A Coreia tem cinco jogadores no tour.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 67,
    initialPts: 960,
    birthYear: 1999,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 28,
    signatureShot: "DROP_SHOT",
    rallyPattern: "RHYTHM_DISRUPTION",
    signaturePattern: "DEEP_COURT_GRINDER",
    naturalSignature: "BH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 76,
      explosividade: 72,
      resistencia: 76,
      defesa: 73,
      fhPotencia: 67,
      fhControle: 76,
      bhPotencia: 74,
      bhControle: 81,
      topspin: 68,
      slice: 72,
      saqueForca: 61,
      saquePrecisao: 73,
      devolucao: 72,
      volley: 64,
      smash: 58,
      leitura: 70,
      visaoTatica: 71,
      mentalidade: 69,
      regularidade: 72,
      recuperacao: 71,
      adaptacao: 72
    },
    prefs: {
      buildStyle: "CROSS_BUILDER",
      netGame: "RELUCTANT",
      rallyCadence: "MEASURED",
      riskProfile: "SAFETY_FIRST",
      adaptability: 69
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 79 — CHEN WANG  |  CHN  |  ALL_COURT  ────────────────────
  WANG_CHEN: {
    id: "WANG_CHEN",
    photo: "https://files.catbox.moe/6j3jza.png",
    name: "Chen Wang",
    nickname: "Maestro",
    nationality: "CHN",
    age: 30,
    height: 1.83,
    weight: 78,
    styleId: "ALL_COURT",
    color: "#880000",
    tagline: "O veterano que abriu o caminho para Chen Wei e Zhang Lei.",
    bio: "O veterano chin\xEAs que abriu o caminho para Chen Wei e Zhang Lei. Wang foi o primeiro top 50 chin\xEAs consistente. Est\xE1 na descida mas com dignidade \u2014 um Masters, pico em #23, mentor informal dos novos. O que ele construiu, os novos herdaram.",
    career: "12 anos de tour. Pico em #23. Um Masters, tr\xEAs ATP 500. Mentor informal dos novos chineses.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 57,
    initialPts: 1180,
    birthYear: 1995,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "BANANA_BH",
    rallyPattern: "RHYTHM_DISRUPTION",
    signaturePattern: "SLICE_DISRUPTOR",
    naturalSignature: "FH_SHORT_ANGLE",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 74,
      explosividade: 70,
      resistencia: 78,
      defesa: 74,
      fhPotencia: 74,
      fhControle: 81,
      bhPotencia: 72,
      bhControle: 80,
      topspin: 72,
      slice: 76,
      saqueForca: 76,
      saquePrecisao: 72,
      devolucao: 73,
      volley: 67,
      smash: 66,
      leitura: 76,
      visaoTatica: 71,
      mentalidade: 77,
      regularidade: 79,
      recuperacao: 81,
      adaptacao: 74
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "RELUCTANT",
      rallyCadence: "PATIENT",
      riskProfile: "GAMBLER",
      adaptability: 77
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 80 — YUKI MATSUDA  |  JPN  |  CTR_PUNCHER  ───────────────
  MATSUDA: {
    id: "MATSUDA",
    photo: "https://files.catbox.moe/nt6r6d.png",
    name: "Yuki Matsuda",
    nickname: "Kaze",
    nationality: "JPN",
    age: 27,
    height: 1.78,
    weight: 72,
    styleId: "TACT_TEC",
    color: "#664400",
    tagline: "Japon\xEAs que escolheu o saibro \u2014 raridade no circuito asi\xE1tico.",
    bio: "Japon\xEAs que escolheu o saibro como superf\xEDcie principal \u2014 raridade no circuito asi\xE1tico. Counter-punch paciente que j\xE1 derrubou alguns top 20 em Roland. A decis\xE3o foi corajosa. Os resultados provaram que estava certa.",
    career: "Pro 2020. Especialista de saibro que quebra expectativas. Um ATP 500, quatro 250s.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 70,
    initialPts: 860,
    birthYear: 1998,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 28,
    signatureShot: "SLICE_BH",
    rallyPattern: "DEEP_GRINDER",
    signaturePattern: "SHORT_ANGLE_ASSASSIN",
    naturalSignature: "BH_SLICE_DEEP",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 76,
      explosividade: 68,
      resistencia: 82,
      defesa: 84,
      fhPotencia: 65,
      fhControle: 84,
      bhPotencia: 73,
      bhControle: 86,
      topspin: 68,
      slice: 86,
      saqueForca: 62,
      saquePrecisao: 79,
      devolucao: 71,
      volley: 60,
      smash: 61,
      leitura: 74,
      visaoTatica: 58,
      mentalidade: 76,
      regularidade: 80,
      recuperacao: 80,
      adaptacao: 77
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "RELUCTANT",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "GAMBLER",
      adaptability: 75
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 81 — DONGHUN SEO  |  KOR  |  RETRIEVER  ──────────────────
  SEO_DONGHUN: {
    id: "SEO_DONGHUN",
    photo: "https://files.catbox.moe/5x6gkv.png",
    name: "Donghun Seo",
    nickname: "Escudo",
    nationality: "KOR",
    age: 31,
    height: 1.81,
    weight: 76,
    styleId: "ADPT_TAC",
    color: "#004488",
    tagline: "Park e Shin constroem em cima da hist\xF3ria que ele escreveu.",
    bio: "O veterano coreano que abriu as portas. Seo foi o primeiro top 60 coreano \u2014 Park e Shin constroem em cima da hist\xF3ria que ele escreveu. 10 anos de tour, est\xE1 descendo, mas com hist\xF3ria que o circuito respeita.",
    career: "10 anos de tour. Um ATP 500, seis 250s. Em queda mas com hist\xF3ria respeit\xE1vel.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 76,
    initialPts: 780,
    birthYear: 1994,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 27,
    signatureShot: "DROP_SHOT",
    rallyPattern: "CENTRE_CONTROL",
    signaturePattern: "LATE_MATCH_HUNTER",
    naturalSignature: "BH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 84,
      explosividade: 72,
      resistencia: 88,
      defesa: 88,
      fhPotencia: 55,
      fhControle: 83,
      bhPotencia: 58,
      bhControle: 86,
      topspin: 60,
      slice: 78,
      saqueForca: 66,
      saquePrecisao: 64,
      devolucao: 74,
      volley: 59,
      smash: 60,
      leitura: 78,
      visaoTatica: 56,
      mentalidade: 77,
      regularidade: 82,
      recuperacao: 75,
      adaptacao: 76
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "AVOIDS",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "SAFETY_FIRST",
      adaptability: 77
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 82 — MINH NGUYEN  |  VIE  |  RETRIEVER  ──────────────────
  NGUYEN_MINH: {
    id: "NGUYEN_MINH",
    photo: "https://files.catbox.moe/7luw9l.png",
    name: "Minh Nguyen",
    nickname: "F\xEAnix",
    nationality: "VIE",
    age: 23,
    height: 1.77,
    weight: 69,
    styleId: "RETRIEVER",
    color: "#CC0000",
    tagline: "O Vietn\xE3 nunca teve um jogador neste n\xEDvel.",
    bio: "O Vietn\xE3 nunca teve um jogador neste n\xEDvel. Nguyen defende com paci\xEAncia impressionante e cada vit\xF3ria \xE9 festejada como uma conquista nacional. Carrega um pa\xEDs nos ombros com leveza surpreendente.",
    career: "Pro 2023. Hist\xF3rico para o t\xEAnis vietnamita. Tr\xEAs 250s. Top 80 crescendo.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 79,
    initialPts: 720,
    birthYear: 2002,
    potential: "CAMPEAO",
    developmentStyle: "LATE_BLOOMER",
    peakAge: 28,
    signatureShot: "DTL_BH",
    rallyPattern: "CENTRE_CONTROL",
    signaturePattern: "BH_WALL",
    naturalSignature: "DROP_HIDDEN",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 82,
      explosividade: 70,
      resistencia: 84,
      defesa: 82,
      fhPotencia: 47,
      fhControle: 86,
      bhPotencia: 48,
      bhControle: 90,
      topspin: 58,
      slice: 76,
      saqueForca: 51,
      saquePrecisao: 68,
      devolucao: 80,
      volley: 50,
      smash: 56,
      leitura: 74,
      visaoTatica: 49,
      mentalidade: 75,
      regularidade: 79,
      recuperacao: 74,
      adaptacao: 74
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "PROACTIVE",
      rallyCadence: "BALANCED",
      riskProfile: "ALLOUT",
      adaptability: 75
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 83 — MINGWEI GU  |  CHN  |  ALL_COURT  ───────────────────
  GU_MINGWEI: {
    id: "GU_MINGWEI",
    photo: "https://files.catbox.moe/26e86h.png",
    name: "Mingwei Gu",
    nickname: "Tempestade",
    nationality: "CHN",
    age: 20,
    height: 1.83,
    weight: 75,
    styleId: "GRINDER",
    color: "#CC2200",
    tagline: "O programa de desenvolvimento chin\xEAs produz em s\xE9rie, mas este parece especial.",
    bio: "O quarto chin\xEAs no tour. Com 20 anos, j\xE1 tem a t\xE9cnica que outros levam 5 anos para desenvolver. O programa de desenvolvimento chin\xEAs produz em s\xE9rie, mas este parece especial \u2014 os treinadores usam uma palavra diferente quando falam dele.",
    career: "Pro 2025. Primeira temporada de impacto. Dois 250s. O pr\xF3ximo da linha chinesa.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 83,
    initialPts: 660,
    birthYear: 2005,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 25,
    signatureShot: "DTL_BH",
    rallyPattern: "RHYTHM_DISRUPTION",
    signaturePattern: "BH_WALL",
    naturalSignature: "FH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 78,
      explosividade: 76,
      resistencia: 72,
      defesa: 69,
      fhPotencia: 73,
      fhControle: 66,
      bhPotencia: 72,
      bhControle: 70,
      topspin: 70,
      slice: 66,
      saqueForca: 70,
      saquePrecisao: 66,
      devolucao: 72,
      volley: 58,
      smash: 58,
      leitura: 70,
      visaoTatica: 71,
      mentalidade: 67,
      regularidade: 68,
      recuperacao: 70,
      adaptacao: 66
    },
    prefs: {
      buildStyle: "CENTRE_CONTROL",
      netGame: "OPPORTUNIST",
      rallyCadence: "MEASURED",
      riskProfile: "SAFETY_FIRST",
      adaptability: 68
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 84 — KENJI SUZUKI  |  JPN  |  CTR_PUNCHER  ───────────────
  SUZUKI: {
    id: "SUZUKI",
    photo: "https://files.catbox.moe/o7cms9.png",
    name: "Kenji Suzuki",
    nickname: "Fuji",
    nationality: "JPN",
    age: 33,
    height: 1.82,
    weight: 78,
    styleId: "ALL_COURT",
    color: "#664422",
    tagline: "Abriu a era do t\xEAnis japon\xEAs moderno. Recusa-se a sair sem dignidade.",
    bio: "O veterano mais velho do time japon\xEAs. Suzuki abriu a era do t\xEAnis japon\xEAs moderno \u2014 15 anos de tour, dois ATP 500, oito 250s. Est\xE1 em queda mas recusa-se a deixar o palco sem dignidade. Cada partida ganhada nessa fase \xE9 uma obra de arte de veterano.",
    career: "15 anos de tour. Refer\xEAncia hist\xF3rica do t\xEAnis asi\xE1tico. Dois ATP 500, oito 250s.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 85,
    initialPts: 640,
    birthYear: 1992,
    potential: "CAMPEAO",
    developmentStyle: "STEADY",
    peakAge: 28,
    signatureShot: "DTL_BH",
    rallyPattern: "DEFENSIVE_BASE",
    signaturePattern: "SLICE_DISRUPTOR",
    naturalSignature: "BH_SLICE_DEEP",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 70,
      explosividade: 64,
      resistencia: 78,
      defesa: 79,
      fhPotencia: 68,
      fhControle: 81,
      bhPotencia: 66,
      bhControle: 83,
      topspin: 66,
      slice: 84,
      saqueForca: 69,
      saquePrecisao: 69,
      devolucao: 73,
      volley: 58,
      smash: 58,
      leitura: 72,
      visaoTatica: 58,
      mentalidade: 79,
      regularidade: 81,
      recuperacao: 83,
      adaptacao: 78
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "OPPORTUNIST",
      rallyCadence: "BALANCED",
      riskProfile: "ALLOUT",
      adaptability: 76
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 85 — TIANLONG WU  |  CHN  |  SRV_VOL  ────────────────────
  WU_TIANLONG: {
    id: "WU_TIANLONG",
    photo: "https://files.catbox.moe/710ld2.png",
    name: "Tianlong Wu",
    nickname: "Drag\xE3o Celestial",
    nationality: "CHN",
    age: 22,
    height: 1.88,
    weight: 80,
    styleId: "PWR_BASE",
    color: "#AA0000",
    tagline: "Serve-volleyer chin\xEAs \u2014 uma contradi\xE7\xE3o em si.",
    bio: "Serve-volleyer chin\xEAs \u2014 uma contradi\xE7\xE3o em si. Wu decidiu contrariar o manual da escola chinesa e o resultado \xE9 fascinante. A grama europeia vai ser o teste definitivo de se a apostura era vis\xE3o ou loucura.",
    career: "Pro 2024. Segunda temporada com progress\xE3o clara. Dois 250s. A contradi\xE7\xE3o que funciona.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 86,
    initialPts: 620,
    birthYear: 2003,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 25,
    signatureShot: "BIG_SERVE",
    rallyPattern: "NET_APPROACH",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "FH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 80,
      explosividade: 82,
      resistencia: 68,
      defesa: 66,
      fhPotencia: 71,
      fhControle: 64,
      bhPotencia: 57,
      bhControle: 57,
      topspin: 56,
      slice: 74,
      saqueForca: 80,
      saquePrecisao: 76,
      devolucao: 58,
      volley: 71,
      smash: 71,
      leitura: 62,
      visaoTatica: 68,
      mentalidade: 60,
      regularidade: 60,
      recuperacao: 57,
      adaptacao: 61
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "PROACTIVE",
      rallyCadence: "MEASURED",
      riskProfile: "CALCULATED",
      adaptability: 61
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 86 — KEISUKE SAWATARI  |  JPN  |  AGG_BASELINER  ─────────
  SAWATARI: {
    id: "SAWATARI",
    photo: "https://files.catbox.moe/tz9qv7.png",
    name: "Keisuke Sawatari",
    nickname: "Kaminari",
    nationality: "JPN",
    age: 19,
    height: 1.84,
    weight: 76,
    styleId: "AGG_BASELINER",
    color: "#FF4400",
    tagline: "Em dois anos o mundo vai conhecer o nome.",
    bio: "19 anos. Ainda n\xE3o tem as ferramentas completas mas os flashes de talento s\xE3o arrebatadores. A academia japonesa o supervisiona de perto \u2014 prometem que em dois anos o mundo vai conhecer o nome. O primeiro t\xEDtulo com 19 anos j\xE1 deu um aviso.",
    career: "Pro 2025. Primeiro t\xEDtulo com 19 anos. Hist\xF3rico japon\xEAs. A academia garante que \xE9 s\xF3 o come\xE7o.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 97,
    initialPts: 420,
    birthYear: 2006,
    potential: "ELITE",
    developmentStyle: "EARLY_BLOOMER",
    peakAge: 22,
    signatureShot: "INSIDE_OUT_FH",
    rallyPattern: "CROSS_HEAVY",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "DROP_HIDDEN",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 86,
      explosividade: 84,
      resistencia: 68,
      defesa: 70,
      fhPotencia: 82,
      fhControle: 58,
      bhPotencia: 66,
      bhControle: 50,
      topspin: 78,
      slice: 54,
      saqueForca: 61,
      saquePrecisao: 69,
      devolucao: 59,
      volley: 47,
      smash: 47,
      leitura: 64,
      visaoTatica: 69,
      mentalidade: 56,
      regularidade: 55,
      recuperacao: 54,
      adaptacao: 63
    },
    prefs: {
      buildStyle: "CROSS_BUILDER",
      netGame: "PROACTIVE",
      rallyCadence: "MEASURED",
      riskProfile: "GAMBLER",
      adaptability: 60
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 87 — MINSEOK KWON  |  KOR  |  BIG_SERVER  ────────────────
  KWON_MINSEOK: {
    id: "KWON_MINSEOK",
    photo: "https://files.catbox.moe/9b7t64.png",
    name: "Minseok Kwon",
    nickname: "Rel\xE2mpago",
    nationality: "KOR",
    age: 20,
    height: 1.98,
    weight: 90,
    styleId: "BIG_SERVER",
    color: "#4400CC",
    tagline: "A Coreia n\xE3o tinha um big server assim.",
    bio: "1.98m de saque puro. A Coreia n\xE3o tinha um big server assim \u2014 Kwon preenche a lacuna com entusiasmo e pot\xEAncia. O jogo de fundo ainda \xE9 trabalho em andamento, mas o saque j\xE1 \xE9 uma arma real. Primeiro 250 com 20 anos.",
    career: "Pro 2025. Primeiro 250 com 20 anos. A Coreia descobriu que pode ter todas as pe\xE7as.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 94,
    initialPts: 480,
    birthYear: 2005,
    potential: "ELITE",
    developmentStyle: "EARLY_BLOOMER",
    peakAge: 23,
    signatureShot: "INSIDE_OUT_FH",
    rallyPattern: "SERVE_PLUS_ONE",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "VOLLEY_ANGLE",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 66,
      explosividade: 78,
      resistencia: 66,
      defesa: 58,
      fhPotencia: 76,
      fhControle: 47,
      bhPotencia: 63,
      bhControle: 44,
      topspin: 52,
      slice: 46,
      saqueForca: 84,
      saquePrecisao: 63,
      devolucao: 51,
      volley: 52,
      smash: 51,
      leitura: 58,
      visaoTatica: 64,
      mentalidade: 55,
      regularidade: 53,
      recuperacao: 53,
      adaptacao: 58
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "AVOIDS",
      rallyCadence: "EARLY_ATTACK",
      riskProfile: "SAFE",
      adaptability: 56
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 88 — KEI ISHIDA  |  JPN  |  ALL_COURT  ───────────────────
  ISHIDA: {
    id: "ISHIDA",
    photo: "https://files.catbox.moe/g8sxvp.png",
    name: "Kei Ishida",
    nickname: "Sakura",
    nationality: "JPN",
    age: 21,
    height: 1.8,
    weight: 72,
    styleId: "NET_SPEC",
    color: "#FF8888",
    tagline: "A escola nip\xF4nica est\xE1 em modo f\xE1brica de talentos.",
    bio: "O terceiro japon\xEAs prometendo chegar ao topo. A escola nip\xF4nica de t\xEAnis est\xE1 em modo f\xE1brica de talentos. Ishida tem a eleg\xE2ncia t\xE9cnica de Nakamura e ainda n\xE3o sabe que vai precisar de mais \u2014 mas o semifinal em T\xF3quio na primeira temporada foi um aviso ao circuito.",
    career: "Pro 2024. Semifinalista em T\xF3quio na primeira temporada. Tr\xEAs 250s. A eleg\xE2ncia que recorda o mestre.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 65,
    initialPts: 1e3,
    birthYear: 2004,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 25,
    signatureShot: "DTL_BH",
    rallyPattern: "SHORT_ANGLE_BUILDER",
    signaturePattern: "NET_CLOSER",
    naturalSignature: "DROP_HIDDEN",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 78,
      explosividade: 76,
      resistencia: 72,
      defesa: 74,
      fhPotencia: 71,
      fhControle: 68,
      bhPotencia: 70,
      bhControle: 73,
      topspin: 70,
      slice: 66,
      saqueForca: 62,
      saquePrecisao: 70,
      devolucao: 65,
      volley: 65,
      smash: 66,
      leitura: 68,
      visaoTatica: 66,
      mentalidade: 65,
      regularidade: 67,
      recuperacao: 68,
      adaptacao: 64
    },
    prefs: {
      buildStyle: "CROSS_BUILDER",
      netGame: "HUNTER",
      rallyCadence: "MEASURED",
      riskProfile: "CALCULATED",
      adaptability: 66
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 89 — SORA HASHIMOTO  |  JPN  |  AGG_BASELINER  ───────────
  HASHIMOTO: {
    id: "HASHIMOTO",
    photo: "https://files.catbox.moe/ht0xp6.png",
    name: "Sora Hashimoto",
    nickname: "Flecha",
    nationality: "JPN",
    age: 18,
    height: 1.81,
    weight: 70,
    styleId: "TACT_TEC",
    color: "#FF3300",
    tagline: "18 anos e j\xE1 passou pelo qualifying de dois Slams.",
    bio: "18 anos e j\xE1 passou pelo qualifying de dois Slams. A velocidade de pernas \xE9 assustadora \u2014 92 no atributo j\xE1 nessa idade. O Jap\xE3o tem um pipeline que n\xE3o para. Cada nova safra parece melhor que a anterior.",
    career: "Pro 2025. Primeira temporada. Foco no desenvolvimento. A Flecha que o Jap\xE3o lan\xE7ou.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 108,
    initialPts: 320,
    birthYear: 2007,
    potential: "ELITE",
    developmentStyle: "EARLY_BLOOMER",
    peakAge: 22,
    signatureShot: "INSIDE_OUT_FH",
    rallyPattern: "CROSS_HEAVY",
    signaturePattern: "SHORT_ANGLE_ASSASSIN",
    naturalSignature: "FH_TOPSPIN_CROSS",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 92,
      explosividade: 80,
      resistencia: 64,
      defesa: 69,
      fhPotencia: 61,
      fhControle: 51,
      bhPotencia: 68,
      bhControle: 58,
      topspin: 72,
      slice: 50,
      saqueForca: 51,
      saquePrecisao: 67,
      devolucao: 59,
      volley: 45,
      smash: 50,
      leitura: 60,
      visaoTatica: 69,
      mentalidade: 53,
      regularidade: 52,
      recuperacao: 50,
      adaptacao: 60
    },
    prefs: {
      buildStyle: "VARIED",
      netGame: "AVOIDS",
      rallyCadence: "EXPLOSIVE",
      riskProfile: "SAFETY_FIRST",
      adaptability: 56
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 90 — TAE-HYUN KIM  |  KOR  |  ALL_COURT  ─────────────────
  KIM_TAEHYUN: {
    id: "KIM_TAEHYUN",
    photo: "https://files.catbox.moe/1x5u75.png",
    name: "Tae-hyun Kim",
    nickname: "Seoul Flash",
    nationality: "KOR",
    age: 19,
    height: 1.81,
    weight: 72,
    styleId: "ADPT_TAC",
    color: "#0044BB",
    tagline: "A Coreia tem quatro gera\xE7\xF5es no tour agora.",
    bio: "A Coreia tem quatro gera\xE7\xF5es no tour agora. Kim \xE9 o mais jovem \u2014 19 anos e j\xE1 a imprensa coreana compara com Park. \xC9 cedo. Mas \xE9 dif\xEDcil n\xE3o olhar. A entrada hist\xF3rica no top 128 na primeira temporada j\xE1 diz muito sobre o que vem.",
    career: "Pro 2025. Primeira temporada. Entrada hist\xF3rica no top 128. O mais novo da gera\xE7\xE3o coreana.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 115,
    initialPts: 250,
    birthYear: 2006,
    potential: "ELITE",
    developmentStyle: "STEADY",
    peakAge: 24,
    signatureShot: "DTL_BH",
    rallyPattern: "SHORT_ANGLE_BUILDER",
    signaturePattern: "SLICE_DISRUPTOR",
    naturalSignature: "BH_SLICE_DEEP",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 76,
      explosividade: 74,
      resistencia: 68,
      defesa: 67,
      fhPotencia: 66,
      fhControle: 62,
      bhPotencia: 66,
      bhControle: 67,
      topspin: 64,
      slice: 60,
      saqueForca: 61,
      saquePrecisao: 65,
      devolucao: 65,
      volley: 56,
      smash: 58,
      leitura: 64,
      visaoTatica: 65,
      mentalidade: 61,
      regularidade: 63,
      recuperacao: 59,
      adaptacao: 66
    },
    prefs: {
      buildStyle: "CROSS_BUILDER",
      netGame: "OPPORTUNIST",
      rallyCadence: "PATIENT",
      riskProfile: "ALLOUT",
      adaptability: 62
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  },
  // ── 91 — HAOTIAN QIN  |  CHN  |  AGG_BASELINER  ──────────────
  QIN_HAOTIAN: {
    id: "QIN_HAOTIAN",
    photo: "https://files.catbox.moe/4jtxhn.png",
    name: "Haotian Qin",
    nickname: "Tempero",
    nationality: "CHN",
    age: 18,
    height: 1.86,
    weight: 76,
    styleId: "AGG_BASELINER",
    color: "#FF0000",
    tagline: "18 anos. O n\xFAmero mais raro do jogo.",
    bio: "18 ANOS. O programa chin\xEAs diz que ele \xE9 diferente. N\xE3o em potencial LENDA \u2014 em GERACIONAL. O n\xFAmero mais raro do jogo. Os analistas querem esperar mais antes de confirmar. Os olhos n\xE3o mentem. O mundo inteiro observa cada treino, cada torneio, cada ponto.",
    career: "Pro 2025. Primeira temporada. O mundo inteiro observa. O potencial que aparece uma vez por gera\xE7\xE3o.",
    careerTitles: { gs: 0, masters: 0, finals: 0, atp500: 0, atp250: 0 },
    initialRank: 112,
    initialPts: 280,
    birthYear: 2007,
    potential: "LENDA",
    developmentStyle: "EARLY_BLOOMER",
    peakAge: 22,
    signatureShot: "SHORT_ANGLE_FH",
    rallyPattern: "DEEP_GRINDER",
    signaturePattern: "SERVE_FH_KILL",
    naturalSignature: "FH_SHORT_ANGLE",
    alcunha: null,
    _devState: { monthsAtPeak: 0, lastBreakthrough: null, attrGrowthAccum: {}, hadBreakdownRecovery: false },
    attrs: {
      velocidade: 86,
      explosividade: 82,
      resistencia: 66,
      defesa: 70,
      fhPotencia: 80,
      fhControle: 56,
      bhPotencia: 66,
      bhControle: 47,
      topspin: 80,
      slice: 54,
      saqueForca: 59,
      saquePrecisao: 65,
      devolucao: 62,
      volley: 48,
      smash: 48,
      leitura: 70,
      visaoTatica: 78,
      mentalidade: 60,
      regularidade: 56,
      recuperacao: 61,
      adaptacao: 66
    },
    prefs: {
      buildStyle: "CROSS_DOMINANT",
      netGame: "AVOIDS",
      rallyCadence: "BALANCED",
      riskProfile: "CALCULATED",
      adaptability: 65
    },
    recentForm: {
      results: [],
      formScore: 0.5,
      hotStreak: 0,
      coldStreak: 0,
      surfaceForm: {}
    },
    surfaceStats: {
      CLAY: { wins: 0, losses: 0, titlesWon: 0 },
      GRASS: { wins: 0, losses: 0, titlesWon: 0 },
      HARD: { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 }
    }
  }
};
var NAMED_PLAYER_KEYS = Object.keys(NAMED_PLAYERS);
applyPlayerTraits(NAMED_PLAYERS);

// src/pixel/CourtRenderer.js
var MARK_LIFE_MS = 1e4;
var SURFACE_MARK = {
  GRASS: {
    w: 6,
    h: 3,
    color: (age, maxAge) => {
      const a = Math.max(0, 0.55 - age / maxAge * 0.55);
      return `rgba(80,160,60,${a})`;
    },
    strokeColor: (age, maxAge) => {
      const a = Math.max(0, 0.35 - age / maxAge * 0.35);
      return `rgba(40,100,30,${a})`;
    }
  },
  CLAY: {
    w: 10,
    h: 5,
    color: (age, maxAge) => {
      const a = Math.max(0, 0.72 - age / maxAge * 0.72);
      return `rgba(180,60,15,${a})`;
    },
    strokeColor: (age, maxAge) => {
      const a = Math.max(0, 0.45 - age / maxAge * 0.45);
      return `rgba(100,30,8,${a})`;
    }
  },
  HARD: {
    // Hard courts get very faint skid marks
    w: 7,
    h: 2,
    color: (age, maxAge) => {
      const a = Math.max(0, 0.18 - age / maxAge * 0.18);
      return `rgba(255,255,255,${a})`;
    },
    strokeColor: () => "transparent"
  },
  INDOOR: {
    w: 6,
    h: 2,
    color: (age, maxAge) => {
      const a = Math.max(0, 0.12 - age / maxAge * 0.12);
      return `rgba(200,200,255,${a})`;
    },
    strokeColor: () => "transparent"
  }
};
function initCourtMarks(gs) {
  gs.courtMarks = [];
}
function addCourtMark(gs, ball, shotType) {
  if (!gs.courtMarks)
    gs.courtMarks = [];
  const surface = gs.courtMeta?.surface ?? "HARD";
  if (!SURFACE_MARK[surface])
    return;
  const angle = Math.atan2(ball.vel.x, ball.vel.y);
  const speed = Math.sqrt(ball.vel.x ** 2 + ball.vel.y ** 2 + ball.vel.z ** 2);
  gs.courtMarks.push({
    courtY: ball.pos.y,
    // court Y-axis (length)
    courtX: ball.pos.x,
    // court X-axis (width)
    born: performance.now(),
    surface,
    angle,
    shotType: shotType || "FLAT",
    speed
  });
  if (gs.courtMarks.length > 80)
    gs.courtMarks.shift();
}
function pruneOldMarks(gs) {
  if (!gs.courtMarks)
    return;
  const now = performance.now();
  gs.courtMarks = gs.courtMarks.filter((m) => now - m.born < MARK_LIFE_MS);
}

// src/InjurySystem.js
var INJURY_TYPES = {
  CHRONIC_CONDITION: {
    label: "Condicao Cronica",
    bodyPart: "Sistema Musculoesqueletico",
    icon: "\u{1FA7A}",
    penalties: { resistencia: -16, velocidade: -10, regularidade: -8 },
    styleRisk: {},
    surfaceRisk: {},
    desc: "Problema cronico que exige longa interrupcao e retorno incerto"
  },
  SYSTEMIC_ILLNESS: {
    label: "Doenca Sistemica",
    bodyPart: "Sistema Geral",
    icon: "\u2695\uFE0F",
    penalties: { resistencia: -22, mentalidade: -10, regularidade: -12, velocidade: -8 },
    styleRisk: {},
    surfaceRisk: {},
    desc: "Condicao sistemica severa que afasta o atleta por tempo indeterminado"
  },
  WRIST: {
    label: "Pulso",
    bodyPart: "Membro Superior",
    icon: "\u{1F590}",
    penalties: { fhPotencia: -14, bhPotencia: -10, srv1Vel: -8 },
    styleRisk: { AGG_BASELINER: 1.3, TAKEALLRISK: 1.4 },
    surfaceRisk: { HARD: 1.2 },
    desc: "Les\xE3o por impacto repetitivo no pulso"
  },
  ELBOW: {
    label: "Cotovelo",
    bodyPart: "Membro Superior",
    icon: "\u{1F4AA}",
    penalties: { bhPotencia: -14, srv1Vel: -10, srv2Efeito: -12 },
    styleRisk: { BIG_SERVER: 1.4, AGG_BASELINER: 1.2, TAKEALLRISK: 1.3 },
    surfaceRisk: { HARD: 1.15 },
    desc: "Tendinite / tennis elbow"
  },
  SHOULDER: {
    label: "Ombro",
    bodyPart: "Membro Superior",
    icon: "\u{1F3CB}",
    penalties: { srv1Vel: -16, srv1Prec: -14, volley: -10 },
    styleRisk: { BIG_SERVER: 1.5, SRV_VOL: 1.35 },
    surfaceRisk: {},
    desc: "Les\xE3o no manguito rotador"
  },
  BACK: {
    label: "Lombar",
    bodyPart: "Tronco",
    icon: "\u{1F9CD}",
    penalties: { velocidade: -10, resistencia: -12, agilidadeLateral: -10 },
    styleRisk: { CTR_PUNCHER: 1.25, RETRIEVER: 1.2 },
    surfaceRisk: { HARD: 1.1 },
    desc: "Dores lombares / stress na coluna"
  },
  KNEE: {
    label: "Joelho",
    bodyPart: "Membro Inferior",
    icon: "\u{1F9B5}",
    penalties: { velocidade: -14, explosividade: -12, agilidadeLateral: -14 },
    styleRisk: { AGG_BASELINER: 1.2, ALL_COURT: 1.15 },
    surfaceRisk: { HARD: 1.3 },
    desc: "Les\xE3o ligamentar ou meniscal"
  },
  ANKLE: {
    label: "Tornozelo",
    bodyPart: "Membro Inferior",
    icon: "\u{1F9B6}",
    penalties: { velocidade: -12, agilidadeLateral: -16, alcance: -8 },
    styleRisk: { RETRIEVER: 1.2, ALL_COURT: 1.1 },
    surfaceRisk: { GRASS: 1.4, CLAY: 0.85 },
    desc: "Entorse / tor\xE7\xE3o"
  },
  HAMSTRING: {
    label: "Posterior da Coxa",
    bodyPart: "Membro Inferior",
    icon: "\u{1F3C3}",
    penalties: { velocidade: -16, explosividade: -14, alcance: -10 },
    styleRisk: { AGG_BASELINER: 1.2, TAKEALLRISK: 1.3 },
    surfaceRisk: { HARD: 1.15, GRASS: 1.2 },
    desc: "Distens\xE3o muscular posterior"
  },
  ABDOMINAL: {
    label: "Abdominal",
    bodyPart: "Tronco",
    icon: "\u26A1",
    penalties: { srv1Vel: -12, resistencia: -10, explosividade: -8 },
    styleRisk: { BIG_SERVER: 1.3, AGG_BASELINER: 1.15 },
    surfaceRisk: {},
    desc: "Les\xE3o muscular abdominal / obl\xEDquo"
  }
};
var IN_MATCH_SEVERITY = {
  MINOR: { label: "Leve", canContinueChance: 0.97, penaltyMult: 0.25, durationSecs: 2.5 },
  MODERATE: { label: "Moderada", canContinueChance: 0.8, penaltyMult: 0.55, durationSecs: 5.5 },
  SEVERE: { label: "Grave", canContinueChance: 0.45, penaltyMult: 0.8, durationSecs: 8 }
};
var IN_MATCH_INJURY_POOL = ["ANKLE", "HAMSTRING", "KNEE", "ABDOMINAL", "BACK", "WRIST"];
var CRAMP_TYPE = {
  type: "CRAMP",
  label: "C\xE3ibra",
  icon: "\u26A1",
  penalties: { velocidade: -18, explosividade: -15 },
  isTemporary: true
};
function rollInMatchInjury(player, gs) {
  const stamina = player.stamina ?? 1;
  const totalPts = gs.totalPoints ?? 0;
  const rally = gs.rally ?? 0;
  const surface = gs.courtMeta?.surface ?? "HARD";
  const totalSets = (gs.players[0]?.sets ?? 0) + (gs.players[1]?.sets ?? 0);
  const hadMTO = player._hadInMatchMTO ?? false;
  let chance = 45e-5;
  if (stamina < 0.2)
    chance *= 5;
  else if (stamina < 0.3)
    chance *= 3;
  else if (stamina < 0.4)
    chance *= 2;
  else if (stamina < 0.55)
    chance *= 1.35;
  if (rally >= 25)
    chance *= 1.8;
  else if (rally >= 15)
    chance *= 1.3;
  else if (rally >= 10)
    chance *= 1.1;
  if (totalPts >= 200)
    chance *= 1.3;
  if (totalSets >= 2)
    chance *= 1.15;
  if (surface === "HARD")
    chance *= 1.1;
  if (surface === "GRASS")
    chance *= 1.1;
  if (player.injury && player.injury.isPlayingThrough)
    chance *= 2;
  if (hadMTO)
    chance *= 1.5;
  const res = (player.attrs?.resistencia ?? 60) / 100;
  chance *= 1.4 - res * 0.8;
  chance = Math.min(8e-3, chance);
  if (Math.random() > chance)
    return null;
  const crampChance = stamina < 0.3 && totalPts >= 120 ? 0.4 : 0.1;
  if (Math.random() < crampChance) {
    return { type: "CRAMP", severity: "MODERATE", isTemporary: true };
  }
  const style = player.styleId ?? "";
  const weights = IN_MATCH_INJURY_POOL.map((key) => {
    const def = INJURY_TYPES[key];
    let w = 1;
    w *= def.styleRisk?.[style] ?? 1;
    w *= def.surfaceRisk?.[surface] ?? 1;
    return { key, w };
  });
  const total = weights.reduce((s, x) => s + x.w, 0);
  let roll = Math.random() * total;
  let injType = "ANKLE";
  for (const { key, w } of weights) {
    roll -= w;
    if (roll <= 0) {
      injType = key;
      break;
    }
  }
  const sevRoll = Math.random();
  let severity;
  if (sevRoll < 0.72)
    severity = "MINOR";
  else if (sevRoll < 0.93)
    severity = "MODERATE";
  else
    severity = "SEVERE";
  if (stamina < 0.2 && severity === "MINOR")
    severity = "MODERATE";
  if (stamina < 0.12 && severity === "MODERATE")
    severity = "SEVERE";
  return { type: injType, severity, isTemporary: false };
}
function decideMTOOutcome(player, severity, gs) {
  const sevDef = IN_MATCH_SEVERITY[severity];
  if (!sevDef)
    return { canContinue: true, reason: "desconhecido" };
  let continueChance = sevDef.canContinueChance;
  const mental = (player.attrs?.mentalidade ?? 60) / 100;
  continueChance += (mental - 0.6) * 0.18;
  const playerIdx = gs.players.indexOf(player);
  const myIdx = playerIdx >= 0 ? playerIdx : 0;
  const mySets = gs.players[myIdx]?.sets ?? 0;
  const oppSets = gs.players[1 - myIdx]?.sets ?? 0;
  if (oppSets > mySets + 1)
    continueChance -= 0.15;
  if (mySets > oppSets)
    continueChance += 0.1;
  if (gs.isSlam)
    continueChance += 0.12;
  if (gs.crowdPressure >= 0.7)
    continueChance += 0.06;
  if (player._pendingMTOType === "CRAMP")
    continueChance = 0.92;
  continueChance = Math.max(0.05, Math.min(0.97, continueChance));
  const canContinue = Math.random() < continueChance;
  const reason = canContinue ? `retorna ap\xF3s tratamento (${sevDef.label})` : `abandona \u2014 les\xE3o ${sevDef.label} impediu continuidade`;
  return { canContinue, reason };
}
function applyInMatchPenalty(player, injuryType, severity) {
  const sevDef = IN_MATCH_SEVERITY[severity];
  const injDef = injuryType === "CRAMP" ? CRAMP_TYPE : INJURY_TYPES[injuryType];
  if (!injDef || !sevDef)
    return;
  const mult = sevDef.penaltyMult;
  if (!player._attrsBeforeInjury) {
    player._attrsBeforeInjury = { ...player.attrs };
  }
  for (const [attr, val] of Object.entries(injDef.penalties)) {
    if (player.attrs[attr] !== void 0) {
      player.attrs[attr] = Math.max(28, player.attrs[attr] + Math.round(val * mult));
    }
  }
}
function applyProgressiveDegradation(player) {
  const inj = player._inMatchInjury;
  if (!inj || inj.isTemporary)
    return;
  inj.gamesAfterInjury = (inj.gamesAfterInjury ?? 0) + 1;
  const games = inj.gamesAfterInjury;
  if (games % 3 === 0) {
    const injDef = INJURY_TYPES[inj.injuryType];
    if (!injDef)
      return;
    const extraMult = 0.12;
    for (const [attr, val] of Object.entries(injDef.penalties)) {
      if (player.attrs[attr] !== void 0) {
        player.attrs[attr] = Math.max(28, player.attrs[attr] + Math.round(val * extraMult));
      }
    }
  }
}
function buildInMatchInjuryEvent(player, mto, gs, eventType = "mto") {
  const injDef = mto.injuryType === "CRAMP" ? CRAMP_TYPE : INJURY_TYPES[mto.injuryType] ?? {};
  const sevLabel = IN_MATCH_SEVERITY[mto.severity]?.label ?? mto.severity;
  const setStr = `${gs.players[0].sets}-${gs.players[1].sets}`;
  if (eventType === "mto") {
    return {
      type: "in_match_injury",
      text: `${player.name} para para atendimento m\xE9dico \u2014 ${injDef.label ?? mto.injuryType} (${sevLabel}) | ${setStr}`,
      playerId: player.id,
      playerName: player.name,
      injuryType: mto.injuryType,
      severity: mto.severity,
      sets: setStr
    };
  }
  if (eventType === "retirement") {
    return {
      type: "in_match_retirement",
      text: `${player.name} abandona a partida por les\xE3o \u2014 ${injDef.label ?? mto.injuryType} (${sevLabel}) | ${setStr}`,
      playerId: player.id,
      playerName: player.name,
      injuryType: mto.injuryType,
      severity: mto.severity,
      sets: setStr
    };
  }
  return null;
}

// src/game.js
function _canPlayerWinGameNow(gs, playerId) {
  const player = gs.players[playerId];
  const opp = gs.players[1 - playerId];
  if (gs.inTiebreak) {
    return gs.tbScore[playerId] >= 6 && gs.tbScore[playerId] - gs.tbScore[1 - playerId] >= 1;
  }
  if (player.score === 4)
    return true;
  return player.score === 3 && opp.score <= 2;
}
function _canPlayerWinSetNow(gs, playerId) {
  const player = gs.players[playerId];
  const opp = gs.players[1 - playerId];
  if (!_canPlayerWinGameNow(gs, playerId))
    return false;
  if (gs.inTiebreak)
    return true;
  const nextGames = player.games + 1;
  return nextGames >= 6 && nextGames - opp.games >= 2;
}
function _canPlayerWinMatchNow(gs, playerId) {
  const setsNeeded = gs.setsToWin ?? 2;
  return gs.players[playerId].sets + (_canPlayerWinSetNow(gs, playerId) ? 1 : 0) >= setsNeeded;
}
function _getPointPressureState(gs) {
  const states = gs.players.map((player, playerId) => {
    const oppId = 1 - playerId;
    return {
      playerId,
      isGamePoint: _canPlayerWinGameNow(gs, playerId),
      isSetPoint: _canPlayerWinSetNow(gs, playerId),
      isMatchPoint: _canPlayerWinMatchNow(gs, playerId),
      isBreakPoint: false,
      isDefendingBreakPoint: false,
      isDefendingSetPoint: false,
      isDefendingMatchPoint: false,
      oppId
    };
  });
  if (!gs.inTiebreak) {
    states[gs.receiver].isBreakPoint = states[gs.receiver].isGamePoint;
    states[gs.server].isDefendingBreakPoint = states[gs.receiver].isBreakPoint;
  }
  for (const state of states) {
    const opp = states[state.oppId];
    state.isDefendingSetPoint = opp.isSetPoint;
    state.isDefendingMatchPoint = opp.isMatchPoint;
  }
  return states;
}
function getUnifiedPlayerTraitFx(player, gs) {
  const neutral = { strengthBonus: 0, clutchMult: 1, errorMult: 1, staminaMult: 1, serveMult: 1, opponentDebuff: 0, formFloor: null };
  if (!player?.dna?.slots?.length)
    return neutral;
  const scoreState = _getPointPressureState(gs)[player.id];
  const opp = gs.players[1 - player.id];
  const namedRef = player.namedPlayerKey ? NAMED_PLAYERS[player.namedPlayerKey] ?? null : null;
  const oppNamed = opp?.namedPlayerKey ? NAMED_PLAYERS[opp.namedPlayerKey] ?? null : null;
  const contexts = collectTraitContexts(player, {
    surface: gs.courtMeta?.surface ?? "HARD",
    bestOf: gs.bestOf,
    inTiebreak: gs.inTiebreak,
    totalSets: gs.players[0].sets + gs.players[1].sets,
    playerSets: player.sets,
    oppSets: opp.sets,
    playerGames: player.games,
    oppGames: opp.games,
    rally: gs.rally,
    pressure: (player.ctx?.rallyPressure ?? 0) > 0.5,
    isSlam: gs.isSlam,
    age: namedRef?.age ?? player._age ?? null,
    peakAge: namedRef?.peakAge ?? player._peakAge ?? null,
    rankPos: namedRef?.rankPosition ?? player._rankPosition ?? null,
    oppRank: oppNamed?.rankPosition ?? opp._rankPosition ?? null,
    roundLabel: gs.tournamentRound ?? null,
    isGamePoint: scoreState.isGamePoint,
    isSetPoint: scoreState.isSetPoint,
    isMatchPoint: scoreState.isMatchPoint,
    isBreakPoint: scoreState.isBreakPoint,
    isDefendingBreakPoint: scoreState.isDefendingBreakPoint,
    isDefendingMatchPoint: scoreState.isDefendingMatchPoint
  });
  return getTraitEffects(player, { contexts });
}
function _courtKeyToSurface(courtKey = "") {
  const k = courtKey.toUpperCase();
  if (k.includes("CLAY") || k.includes("ROLAND") || k.includes("MONTECARLO"))
    return "clay";
  if (k.includes("GRASS") || k.includes("WIMBLEDON") || k.includes("QUEENS"))
    return "grass";
  if (k.includes("INDOOR") || k.includes("ATP_FINALS") || k.includes("PARIS"))
    return "indoor";
  return "hard";
}
function createStats() {
  return {
    aces: 0,
    doubleFaults: 0,
    serve1In: 0,
    serve1Total: 0,
    serve1AvgKmh: 0,
    serve2In: 0,
    serve2Total: 0,
    serve2AvgKmh: 0,
    winners: 0,
    unforcedErrors: 0,
    forcedErrors: 0,
    netApproaches: 0,
    netPointsWon: 0,
    rallyLengths: [],
    byType: {
      FLAT: 0,
      TOPSPIN: 0,
      SLICE: 0,
      VOLLEY: 0,
      DROP: 0,
      SMASH: 0,
      LOB_DEF: 0,
      LOB_ATK: 0,
      BANANA: 0,
      PASSING: 0,
      SHORT_ANGLE: 0,
      SLICE_SHORT: 0,
      HALF_VOLLEY: 0,
      HEAVY_TOP: 0,
      ACCEL: 0,
      SHORT_ACCEL: 0
    },
    // [FIX v1] rally shots use ACCEL/SHORT_ACCEL — must be declared here
    // Q média e velocidade média por tipo de golpe
    byTypeQSum: {},
    byTypeQCnt: {},
    byTypeKmhSum: {},
    byTypeKmhCnt: {},
    // ── Serve / Return analytics ──────────────────────────────────────────
    // Pontos ganhos/perdidos quando este jogador está sacando ou recebendo
    pointsWonServing: 0,
    pointsLostServing: 0,
    pointsWonReturning: 0,
    pointsLostReturning: 0,
    // Pontos por tipo de saque em jogo (1º vs 2º)
    serve1WonPoints: 0,
    serve1LostPoints: 0,
    serve2WonPoints: 0,
    serve2LostPoints: 0,
    // Games hold/break
    gamesServed: 0,
    // total de games em que este jogador sacou
    gamesHeld: 0,
    // games ganhos sacando (hold)
    gamesReturned: 0,
    // total de games em que este jogador recebeu
    gamesConverted: 0,
    // breaks convertidos (ganhou recebendo)
    // Log por ponto para gráficos (max 300 pontos)
    serveLog: [],
    // { kmh, physType, dir, isFirst, won, isAce, pointNum }
    // Quality média de rally
    qualitySum: 0,
    qualityCount: 0,
    // ── Individual Rating (TDI-inspired) ─────────────────────────────────────
    // In Attack: golpes batidos em fase ofensiva (ATTACK)
    attackShots: 0,
    // Defense / Steal: golpes batidos em fase defensiva (DEFEND)
    defenseShots: 0,
    // Conversion: pontos jogados/ganhos quando em fase de ataque no último golpe
    attackPointsPlayed: 0,
    attackPointsWon: 0,
    // Steal: pontos jogados/ganhos quando em fase defensiva no último golpe
    defensePointsPlayed: 0,
    defensePointsWon: 0
  };
}
function createBall() {
  return {
    pos: v3(0, 0, 0.5),
    vel: v3(0, 0, 0),
    spin: v3(0, 0, 0),
    inFlight: false,
    bounceCount: 0,
    lastHitBy: -1,
    lastBounceSide: 0
  };
}
function createPlayer(id, side, name, color, styleId, namedPlayerKey) {
  const named = namedPlayerKey ? NAMED_PLAYERS[namedPlayerKey] : null;
  const rawAttrs = named ? named.attrs : null;
  const attrs = rawAttrs ? migrateAttrsToV3(rawAttrs) : null;
  const mods = attrs ? computePlayerMods(attrs) : null;
  const styleData = PLAY_STYLES[styleId] ?? PLAY_STYLES["ALL_COURT"];
  const _aggr = attrs?.visaoTatica ?? attrs?.agressividade ?? 60;
  const _net = ((attrs?.volley ?? attrs?.jogoDeRede ?? 60) + (attrs?.smash ?? attrs?.jogoDeRede ?? 60)) / 2;
  const baselineOffset = 0.2 + _aggr / 100 * 0.5 + _net / 100 * 0.2;
  const baseY = side * (COURT.halfL - baselineOffset);
  const playerSpeed = PLAYER_CFG.speed * (mods ? mods.speedMult : 1);
  const playerAccel = PLAYER_CFG.maxAccel * (mods ? mods.accelMult : 1);
  const playerDecel = PLAYER_CFG.maxDecel * (mods ? mods.decelMult : 1);
  const playerReach = PLAYER_CFG.reach + (mods ? mods.reachBonus : 0);
  return {
    id,
    side,
    name,
    color,
    styleId,
    styleData,
    namedPlayerKey,
    attrs,
    mods,
    // Signature: golpe assinatura permanente do jogador
    naturalSignature: null,
    signatureShot: named?.signatureShot ?? null,
    rallyPattern: named?.rallyPattern ?? null,
    playerSpeed,
    playerAccel,
    playerDecel,
    pos: v2(0, baseY),
    basePos: v2(0, baseY),
    vel: v2(0, 0),
    atNet: false,
    reach: playerReach,
    stamina: 1,
    hitCooldown: 0,
    swinging: false,
    swingTimer: 0,
    score: 0,
    games: 0,
    sets: 0,
    faults: 0,
    setsHistory: [],
    // [games_won_set1, games_won_set2, ...] para o scoreboard
    shotCount: 0,
    errorCount: 0,
    winnerCount: 0,
    _arrivalMargin: 0.5,
    // initialise as "plenty of time"
    _predCrossX: 0,
    _lastQuality: 1,
    // last shot positioning quality (for UI/debug)
    _nearMissTimer: 0,
    // near-miss hysteresis countdown (seconds)
    // ── Position heatmap: 12 cols × 16 rows, player's half-court ────────────
    // X: –singlesW/2 → +singlesW/2 (8.23 m total)
    // Y (depth): 0 (net) → halfL (11.885 m, baseline). Stored as absolute |Y|.
    _heatGrid: new Uint16Array(12 * 16),
    _heatTick: 0,
    ctx: createCtx(),
    stats: createStats(),
    // Coach: propaga dados do jogador do universo para o motor de jogo.
    // coach contém { coachId, philosophy, ... } — lido pelo sistema de changeover em headless.
    // _coachInstructions começa vazio e é populado no primeiro changeover.
    coach: named?.coach ?? null,
    _coachInstructions: named?._coachInstructions ?? [],
    // ── Shot System v4 — prefs do jogador (Fase 2/3) ────────────────
    // prefs baked na ficha têm prioridade; fallback gera dos attrs.
    prefs: named?.prefs ?? (attrs ? generatePrefs(attrs) : null),
    // formaDoDia inicializado em initGameState via initFormaDoDia()
    _formaDoDia: void 0,
    // Visual DNA: injury e traits para diferenciação visual no canvas
    injury: named?.injury ?? null,
    dna: named?.dna ?? null,
    // FASE 3 — Match Plan: gerado em initGameState após criar ambos os jogadores.
    // Contém { directives, confidence, notes, _scout } — lido por CoachInfluencer.
    _matchPlan: null
  };
}
var _f2 = (n) => typeof n === "number" ? (n >= 0 ? " " : "") + n.toFixed(2) : "   ???";
var _f1 = (n) => typeof n === "number" ? (n >= 0 ? " " : "") + n.toFixed(1) : "  ???";
var _fi = (n) => String(Math.round(n ?? 0)).padStart(4);
var _pct = (n) => String(Math.round((n ?? 0) * 100)).padStart(3) + "%";
var _pad = (s, w) => String(s).padStart(w);
function techPt(gs) {
  const p0 = gs.players[0], p1 = gs.players[1];
  gs._techPtNum = (gs._techPtNum || 0) + 1;
  const bar = "\u2550".repeat(62);
  const hdr = [
    bar,
    `PONTO #${_pad(gs._techPtNum, 3)} \u2502 Set ${p0.sets}-${p1.sets} \u2502 Game ${_pad(p0.games, 2)}-${_pad(p1.games, 2)} \u2502 Score ${SCORE_LABELS[p0.score]}-${SCORE_LABELS[p1.score]}`,
    `Servidor: ${gs.players[gs.server].name} \u2502 Rally m\xE1x at\xE9 aqui: ${gs.maxRally}`,
    bar
  ].join("\n");
  gs.techLog.push(hdr);
  for (const line of gs._ptBuf)
    gs.techLog.push(line);
}
function techEnd(gs, winnerIdx, reason) {
  const w = gs.players[winnerIdx];
  gs.techLog.push(`[FIM] \u25B6 ${w.name} vence | ${reason} | rally=${gs.rally}`);
  gs.techLog.push("");
  gs._ptBuf = [];
}
function pushTech(gs, line) {
  if (!gs._ptBuf)
    gs._ptBuf = [];
  gs._ptBuf.push(line);
}
function initGameState(styleA, styleB, namedKeyA, namedKeyB, courtKey = "US_OPEN", bestOf = 3, rivalSystem = null) {
  const npA = namedKeyA ? NAMED_PLAYERS[namedKeyA] : null;
  const npB = namedKeyB ? NAMED_PLAYERS[namedKeyB] : null;
  const sA = npA ? npA.styleId : styleA || STYLE_KEYS[Math.floor(Math.random() * STYLE_KEYS.length)];
  const sB = npB ? npB.styleId : styleB || STYLE_KEYS[Math.floor(Math.random() * STYLE_KEYS.length)];
  const nameA = npA ? npA.name : "Agente A";
  const nameB = npB ? npB.name : "Agente B";
  const colorA = npA ? npA.color : "#FF6B35";
  const colorB = npB ? npB.color : "#00D4FF";
  const court = COURTS[courtKey] ?? COURTS.US_OPEN;
  const courtVisual = getCourtVisual(courtKey);
  const courtPhysics = getCourtPhysics(courtKey);
  const courtMods = getCourtStyleMods(courtKey);
  const gs = {
    gameState: GameState.PRE_SERVE,
    ball: createBall(),
    players: [
      createPlayer(0, 1, nameA, colorA, sA, namedKeyA || null),
      createPlayer(1, -1, nameB, colorB, sB, namedKeyB || null)
    ],
    server: 0,
    receiver: 1,
    rally: 0,
    maxRally: 0,
    totalPoints: 0,
    totalBounces: 0,
    bounceLog: [],
    // {x, y, type:'rally'|'winner'|'out', player:0|1, shotType}
    pointHistory: [],
    // [{winner:0|1, reason, rally}] — últimos 20 pontos para RunStrip
    stateTimer: 0,
    isFirstBounce: true,
    serveBounced: false,
    serveLeft: true,
    lastPointReason: null,
    receiverTouched: false,
    lastServeFirst: true,
    vfxQueue: [],
    pendingFlash: null,
    pendingScreenFx: null,
    lastBouncePos: null,
    // ── Court data ──────────────────────────────────────────────────
    courtKey,
    courtMeta: court.meta,
    courtVisual,
    courtPhysics,
    courtMods,
    // winnerMod, ueRiskMod, rallyLengthMult, serveBonus, staminaDecayMult, etc.
    isSlam: false,
    // injetado por UniverseManager/Headless quando é Grand Slam
    // ── Crowd Pressure — energia da arena ──────────────────────────
    // Calculado após isSlam + rivalryData serem injetados externamente.
    // Inicializado aqui como 0; Headless/UniverseManager atualiza antes do primeiro ponto.
    // Escala 0.0–1.0: 0 = ATP 250 R1, 1.0 = GS Final entre rivais históricos.
    crowdPressure: 0,
    // ───────────────────────────────────────────────────────────────
    log: [
      "\u26A1 Motor v7 \xB7 Stats + VFX + Sound",
      `\u{1F170} ${nameA}`,
      `\u{1F171} ${nameB}`,
      `\u{1F3BE} ${court.meta.icon} ${court.meta.name} \u2014 ${court.meta.label}`
    ],
    techLog: [
      `TENNIX \xB7 LOG T\xC9CNICO`,
      `${nameA} vs ${nameB}`,
      `Quadra: ${court.meta.name} (${court.meta.label})`,
      ""
    ],
    _ptBuf: [],
    _techPtNum: 0,
    bestOf,
    // 3 ou 5
    setsToWin: Math.ceil(bestOf / 2),
    // 2 para BO3, 3 para BO5
    inTiebreak: false,
    // true quando o game atual é um tiebreak
    tbScore: [0, 0],
    // pontuação do tiebreak [p0, p1]
    tbServer: 0,
    // quem serve no tiebreak
    tbPointsPlayed: 0
    // total de pontos jogados no TB (para troca de saque)
  };
  gs._bounce = onBounce;
  initEnvironment(gs);
  initCourtMarks(gs);
  initHeat(gs);
  const _surface3 = _courtKeyToSurface(courtKey);
  initMatchPlans(gs.players[0], gs.players[1], _surface3, rivalSystem);
  const _surfaceUpper = _surface3.toUpperCase();
  for (let i = 0; i < 2; i++) {
    const p = gs.players[i];
    const opp = gs.players[1 - i];
    initContextConf(p, opp, _surfaceUpper, rivalSystem);
    p._formMods = getFormModifiers(p, _surfaceUpper);
    if (p.attrs?.regularidade !== void 0) {
      const dayAdj = matchDayVar(p.attrs.regularidade);
      if (dayAdj !== 0) {
        const curQm = p._formMods?.qualityMod ?? 1;
        p._formMods = { ...p._formMods ?? {}, qualityMod: curQm * (1 + dayAdj) };
        p._matchDayAdj = dayAdj;
      }
    }
    initFormaDoDia(p);
  }
  traceStartPoint(gs);
  return gs;
}
function computeCrowdPressure(gs, category = "ATP_250", round = "R32", rivalry = null) {
  let pressure = 0;
  const categoryBase = {
    GRAND_SLAM: 0.4,
    FINALS: 0.35,
    MASTERS_1000: 0.25,
    ATP_500: 0.12,
    ATP_250: 0.05,
    ATP_100: 0.02
  }[category] ?? 0.05;
  pressure += categoryBase;
  const roundBonus = {
    F: 0.3,
    SF: 0.18,
    QF: 0.1,
    R16: 0.04,
    R32: 0.01
  }[round] ?? 0;
  pressure += roundBonus;
  if (rivalry) {
    const rScore = Math.min((rivalry.totalPrestige ?? 0) / 40, 0.2);
    pressure += rScore;
    if (rivalry.type === "GRUDGE" || rivalry.type === "FINALS_CURSE")
      pressure += 0.05;
    if (rivalry.type === "THRONE_RIVALS")
      pressure += 0.04;
  }
  return Math.min(1, pressure);
}
function assignPoint(gs, winnerIdx, reason) {
  const w = gs.players[winnerIdx], l = gs.players[1 - winnerIdx];
  gs.totalPoints++;
  gs.log.push(`\u25C9 ${reason}`);
  if (gs.inTiebreak) {
    gs.tbScore[winnerIdx]++;
    gs.tbPointsPlayed++;
    const tbW = gs.tbScore[winnerIdx];
    const tbL = gs.tbScore[1 - winnerIdx];
    gs.log.push(`\u{1F522} TB ${gs.tbScore[0]}\u2013${gs.tbScore[1]}`);
    if (gs.tbPointsPlayed === 1 || gs.tbPointsPlayed > 1 && (gs.tbPointsPlayed - 1) % 2 === 0) {
      gs.server = 1 - gs.server;
      gs.receiver = 1 - gs.server;
      gs.players[gs.server].faults = 0;
    }
    if (gs.tbPointsPlayed % 6 === 0) {
      for (const p of gs.players)
        p.stamina = Math.min(1, (isFinite(p.stamina) ? p.stamina : 1) + (STAMINA.recoveryPerGame ?? 0.08) * 0.5);
    }
    if (tbW >= 7 && tbW - tbL >= 2) {
      w.setsHistory = [...w.setsHistory || [], 7];
      l.setsHistory = [...l.setsHistory || [], 6];
      w.sets++;
      w.games = 0;
      l.games = 0;
      w.stats.tiebreaksWon = (w.stats.tiebreaksWon ?? 0) + 1;
      updateTiebreakConf(w, true);
      updateTiebreakConf(l, false);
      gs.inTiebreak = false;
      gs.tbScore = [0, 0];
      gs.tbPointsPlayed = 0;
      gs.log.push(`\u{1F3C6} TIEBREAK \u2192 ${w.name} venceu o set (${gs.players[0].sets}\u2013${gs.players[1].sets})`);
      for (const p of gs.players)
        p.stamina = Math.min(1, p.stamina + STAMINA.recoveryPerSet);
      if (w.sets >= gs.setsToWin) {
        gs.gameState = GameState.GAME_OVER;
        gs.log.push(`\u{1F3BE} PARTIDA: ${w.name} VENCEU!`);
        return;
      }
      gs.server = 1 - gs.tbServer;
      gs.receiver = gs.tbServer;
      gs.players[gs.server].faults = 0;
    }
    return;
  }
  const ws = w.score, ls = l.score;
  if (ws === 3 && ls === 3) {
    w.score = 4;
  } else if (ws === 4) {
    _gameWon(gs, winnerIdx);
  } else if (ls === 4) {
    w.score = 3;
    l.score = 3;
  } else if (ws === 3 && ls < 3) {
    _gameWon(gs, winnerIdx);
  } else {
    w.score++;
  }
}
function _gameWon(gs, winnerIdx) {
  const w = gs.players[winnerIdx], l = gs.players[1 - winnerIdx];
  w.games++;
  w.score = 0;
  l.score = 0;
  gs.log.push(`\u{1F3AE} Game \u2192 ${w.name} (${gs.players[0].games}\u2013${gs.players[1].games})`);
  for (const p of gs.players) {
  }
  for (const p of gs.players) {
    const rFx = getUnifiedPlayerTraitFx(p, gs);
    const betweenFx = getTraitEffects(p, { type: "betweenSets" });
    const recMult = betweenFx.staminaMult > 0 ? betweenFx.staminaMult : 1;
    const recAmt = (STAMINA.recoveryPerGame ?? 0.08) * recMult;
    p.stamina = Math.min(1, (isFinite(p.stamina) ? p.stamina : 1) + recAmt);
  }
  for (const p of gs.players) {
    if (p._inMatchInjury)
      applyProgressiveDegradation(p);
  }
  const currentServer = gs.server;
  gs.players[currentServer].stats.gamesServed++;
  gs.players[1 - currentServer].stats.gamesReturned++;
  if (winnerIdx === currentServer) {
    gs.players[currentServer].stats.gamesHeld++;
  } else {
    gs.players[1 - currentServer].stats.gamesConverted++;
  }
  for (const p of gs.players) {
    if (p._coachInstructions && p._coachInstructions.length > 0) {
      p._coachInstructions = p._coachInstructions.map((inst) => ({ ...inst, durationGames: (inst.durationGames ?? 1) - 1 })).filter((inst) => inst.durationGames > 0);
    }
  }
  const totalGames = w.games + l.games;
  if (totalGames % 2 === 0 || w.games === 0 && l.games === 0) {
    gs._pendingCoachChangeover = true;
  }
  const wG = w.games, lG = l.games;
  if (wG >= 6 && wG - lG >= 2) {
    _setWon(gs, winnerIdx);
    return;
  }
  if (wG === 6 && lG === 6) {
    gs.inTiebreak = true;
    gs.tbScore = [0, 0];
    gs.tbPointsPlayed = 0;
    gs.tbServer = gs.server;
    gs.log.push(`\u26A1 TIEBREAK! | Games 6\u20136`);
    gs.players[gs.server].faults = 0;
    return;
  }
  gs.server = 1 - gs.server;
  gs.receiver = 1 - gs.server;
  gs.players[gs.server].faults = 0;
}
function _setWon(gs, winnerIdx) {
  const w = gs.players[winnerIdx], l = gs.players[1 - winnerIdx];
  w.setsHistory = [...w.setsHistory || [], w.games];
  l.setsHistory = [...l.setsHistory || [], l.games];
  w.sets++;
  w.games = 0;
  l.games = 0;
  gs.log.push(`\u{1F3C6} SET \u2192 ${w.name} (${gs.players[0].sets}\u2013${gs.players[1].sets})`);
  for (let i = 0; i < gs.players.length; i++) {
    applySetAdjustment(gs.players[i], gs.players[1 - i]);
  }
  const loserIdx = 1 - winnerIdx;
  const lostPlayer = gs.players[loserIdx];
  if (lostPlayer.attrs) {
    const recup = lostPlayer.attrs.recuperacao ?? lostPlayer.attrs.mentalidade ?? 70;
    const boost = recoveryBoost(recup);
    if (boost !== 0) {
      lostPlayer._formMods = lostPlayer._formMods ?? {};
      lostPlayer._formMods.qualityMod = (lostPlayer._formMods.qualityMod ?? 1) + boost;
      if (boost > 0) {
        gs.log.push(`\u{1F4AA} ${lostPlayer.name} se recobrou (recupera\xE7\xE3o ${recup})`);
      }
    }
  }
  if (lostPlayer.attrs) {
    const adaptacao = lostPlayer.attrs.adaptacao ?? 65;
    lostPlayer._adaptacaoBoost = (adaptacao - 50) / 100 * 0.25;
  }
  for (const p of gs.players) {
    const betweenFx = getTraitEffects(p, { type: "betweenSets" });
    const recMult = betweenFx.staminaMult > 0 ? betweenFx.staminaMult : 1;
    const recAmt = (STAMINA.recoveryPerSet ?? 0.2) * recMult;
    p.stamina = Math.min(1, (isFinite(p.stamina) ? p.stamina : 1) + recAmt);
  }
  if (w.sets >= (gs.setsToWin ?? 2)) {
    gs.gameState = GameState.GAME_OVER;
    gs.log.push(`\u{1F3BE} PARTIDA: ${w.name} VENCEU!`);
    return;
  }
  gs.server = 1 - gs.server;
  gs.receiver = 1 - gs.server;
  gs.players[gs.server].faults = 0;
}
function resolvePoint(gs, winnerIdx, reason, isWinner = false) {
  if (gs.gameState === GameState.POINT_END || gs.gameState === GameState.GAME_OVER)
    return;
  const w = gs.players[winnerIdx], l = gs.players[1 - winnerIdx];
  const pointState = _getPointPressureState(gs);
  var isAce = isWinner && winnerIdx === gs.server && !gs.receiverTouched && gs.serveBounced && gs.rally <= 1;
  var displayReason = isAce ? `ACE ${w.name}` : reason;
  if (gs.bounceLog && gs.bounceLog.length > 0) {
    const last = gs.bounceLog[gs.bounceLog.length - 1];
    if (isWinner) {
      last.type = "winner";
    } else if (displayReason && (displayReason.includes("FORA") || displayReason.includes("fuga") || displayReason.includes("DUPLA"))) {
      last.type = "out";
    }
  }
  const prevGames = w.games, prevSets = w.sets;
  gs.gameState = GameState.POINT_END;
  gs.pointWinnerIdx = winnerIdx;
  gs.ball.inFlight = false;
  gs.lastPointReason = displayReason;
  if (!gs.pointHistory)
    gs.pointHistory = [];
  gs.pointHistory.push({ winner: winnerIdx, reason: displayReason, rally: gs.rally ?? 0 });
  if (gs.pointHistory.length > 20)
    gs.pointHistory.shift();
  if (gs.rally > 0) {
    w.stats.rallyLengths.push(gs.rally);
    l.stats.rallyLengths.push(gs.rally);
  }
  {
    if (pointState[1 - winnerIdx].isMatchPoint) {
      w.stats.matchPointsSaved = (w.stats.matchPointsSaved ?? 0) + 1;
    }
  }
  if (isAce) {
    w.stats.aces++;
    gs.log.push(`\u26A1 ACE! ${w.name}`);
  }
  displayReason = isAce ? `ACE ${w.name}` : reason;
  if (!isAce && isWinner)
    w.stats.winners++;
  if (displayReason.includes("DUPLA FALTA"))
    l.stats.doubleFaults++;
  if (w.atNet)
    w.stats.netPointsWon++;
  const wState = w._tacticalState ?? "NEUTRAL";
  const lState = l._tacticalState ?? "NEUTRAL";
  if (wState === "ATTACK") {
    w.stats.attackPointsPlayed++;
    w.stats.attackPointsWon++;
  }
  if (lState === "ATTACK") {
    l.stats.attackPointsPlayed++;
  }
  if (wState === "DEFEND") {
    w.stats.defensePointsPlayed++;
    w.stats.defensePointsWon++;
  }
  if (lState === "DEFEND") {
    l.stats.defensePointsPlayed++;
  }
  {
    const loserHadMP2 = pointState[1 - winnerIdx].isMatchPoint;
    const receiverHadBP = pointState[gs.receiver].isBreakPoint;
    const wasDeuce = !gs.inTiebreak && gs.players[0].score >= 3 && gs.players[1].score >= 3 && gs.players[0].score === gs.players[1].score;
    updateHeat(gs, winnerIdx, isWinner, isAce, {
      isDoubleFault: displayReason.includes("DUPLA FALTA"),
      wasMatchPointSaved: loserHadMP2,
      wasBreakPointSaved: receiverHadBP && winnerIdx === gs.server,
      wasDeuce
    });
  }
  const srvP = gs.players[gs.server];
  const rcvP = gs.players[gs.receiver];
  const serverWon = winnerIdx === gs.server;
  if (serverWon) {
    srvP.stats.pointsWonServing++;
    rcvP.stats.pointsLostReturning++;
  } else {
    srvP.stats.pointsLostServing++;
    rcvP.stats.pointsWonReturning++;
  }
  const pd = gs._pendingServeData;
  if (pd && gs.serveBounced) {
    if (pd.isFirst) {
      if (serverWon)
        srvP.stats.serve1WonPoints++;
      else
        srvP.stats.serve1LostPoints++;
    } else {
      if (serverWon)
        srvP.stats.serve2WonPoints++;
      else
        srvP.stats.serve2LostPoints++;
    }
    if (srvP.stats.serveLog.length < 300) {
      srvP.stats.serveLog.push({
        kmh: pd.kmh,
        physType: pd.physType,
        dir: pd.dir,
        isFirst: pd.isFirst,
        won: serverWon,
        isAce,
        pointNum: pd.pointNum
      });
    }
  }
  if (pd && gs.serveBounced)
    finalizeServeReturnPattern(gs, pd, serverWon, isAce);
  if (isAce) {
    pushVFX(gs, "ACE", "ACE!");
    playSound("ACE");
    announceScore(gs, winnerIdx, "ACE");
    gs.pendingScreenFx = { color: "rgba(255,215,0,0.22)", glow: "#FFD700", shake: true, dur: 700 };
  } else if (isWinner) {
    pushVFX(gs, "WINNER", "WINNER!");
    playSound("WINNER");
    gs.pendingScreenFx = { color: "rgba(0,255,136,0.16)", glow: "#00FF88", shake: false, dur: 500 };
  } else if (displayReason.includes("[REDE]")) {
    pushVFX(gs, "NET", "NET");
    playSound("NET");
  } else if (displayReason.includes("[FORA]")) {
    pushVFX(gs, "OUT", "OUT");
    playSound("OUT");
  } else if (displayReason.includes("DUPLA FALTA")) {
    pushVFX(gs, "DOUBLE_FAULT", "DOUBLE FAULT");
    playSound("DOUBLE_FAULT");
    announceScore(gs, winnerIdx, "DOUBLE_FAULT");
    gs.pendingScreenFx = { color: "rgba(255,68,68,0.18)", glow: "#FF4444", shake: true, dur: 500 };
  }
  if (isWinner)
    w.winnerCount++;
  const _wScoreCtx = _computeScoreImportance(w, gs);
  const _lScoreCtx = _computeScoreImportance(l, gs);
  updateMomentum(gs, winnerIdx, { wImportance: _wScoreCtx.importance, lImportance: _lScoreCtx.importance });
  traceEndPoint(gs, winnerIdx, displayReason, isWinner);
  gs._pendingServeData = null;
  srvP._pendingServeData = null;
  techPt(gs);
  techEnd(gs, winnerIdx, displayReason);
  assignPoint(gs, winnerIdx, displayReason);
  if (w.games > prevGames) {
    pushVFX(gs, "GAME", "GAME!");
    playSound("GAME");
    gs.pendingScreenFx = { color: "rgba(0,212,255,0.20)", glow: "#00D4FF", shake: false, dur: 800 };
    gs.pendingFlash = { playerIdx: winnerIdx, type: "GAME" };
    if (gs.gameState !== GameState.GAME_OVER) {
      setTimeout(() => announceScore(gs, winnerIdx, "GAME"), 900);
    }
  }
  if (w.sets > prevSets) {
    pushVFX(gs, "SET", `SET ${w.sets}!`);
    playSound("SET");
    gs.pendingScreenFx = { color: "rgba(255,215,0,0.30)", glow: "#FFD700", shake: true, dur: 1200 };
    gs.pendingFlash = { playerIdx: winnerIdx, type: "SET" };
    if (gs.gameState === GameState.GAME_OVER) {
      setTimeout(() => announceScore(gs, winnerIdx, "MATCH"), 1200);
    } else {
      setTimeout(() => announceScore(gs, winnerIdx, "SET"), 1e3);
    }
  }
  if (w.games === prevGames && w.sets === prevSets && gs.gameState !== GameState.GAME_OVER) {
    setTimeout(() => announceScore(gs, winnerIdx, "POINT"), 600);
  }
  if (gs.gameState !== GameState.GAME_OVER) {
    checkInMatchInjury(gs);
  }
  scheduleNextPoint(gs);
}
function checkInMatchInjury(gs) {
  if (gs.gameState === GameState.GAME_OVER)
    return;
  if (gs._pendingMTO)
    return;
  for (let pi = 0; pi < 2; pi++) {
    const p = gs.players[pi];
    const result = rollInMatchInjury(p, gs);
    if (!result)
      continue;
    gs._pendingMTO = {
      playerIdx: pi,
      type: result.type,
      severity: result.severity,
      isTemporary: result.isTemporary ?? false
    };
    if (!gs.inMatchInjuryEvents)
      gs.inMatchInjuryEvents = [];
    gs.inMatchInjuryEvents.push(
      buildInMatchInjuryEvent(p, gs._pendingMTO, gs, "mto")
    );
    gs.log.push(`\u{1F691} [MTO] ${p.name} \u2014 ${result.type} (${result.severity})`);
    break;
  }
}
function scheduleNextPoint(gs) {
  setTimeout(() => {
    if (gs.gameState === GameState.GAME_OVER)
      return;
    if (gs._pendingMTO) {
      const mtoData = gs._pendingMTO;
      gs._pendingMTO = null;
      const sevDef = IN_MATCH_SEVERITY[mtoData.severity] ?? IN_MATCH_SEVERITY.MINOR;
      gs.mto = {
        playerIdx: mtoData.playerIdx,
        injuryType: mtoData.type,
        severity: mtoData.severity,
        isTemporary: mtoData.isTemporary ?? false,
        durationSecs: sevDef.durationSecs,
        decided: false,
        canContinue: null
      };
      gs.gameState = GameState.MEDICAL_TIMEOUT;
      gs.stateTimer = 0;
      return;
    }
    gs.rally = 0;
    gs.serveLeft = !gs.serveLeft;
    gs.players[gs.server].faults = 0;
    gs.ball = createBall();
    gs.lastBouncePos = null;
    gs.gameState = GameState.PRE_SERVE;
    gs.stateTimer = 0;
    gs.isFirstBounce = true;
    gs.receiverTouched = false;
    for (const p of gs.players) {
      p.atNet = false;
      const _bAggr = p.attrs?.visaoTatica ?? p.attrs?.agressividade ?? 60;
      const _bNet = ((p.attrs?.volley ?? p.attrs?.jogoDeRede ?? 60) + (p.attrs?.smash ?? p.attrs?.jogoDeRede ?? 60)) / 2;
      const _bOff = 0.2 + _bAggr / 100 * 0.5 + _bNet / 100 * 0.2;
      p.basePos.y = p.side * (COURT.halfL - _bOff);
      p.pos = { ...p.basePos };
      p.vel = v2(0, 0);
      p.stamina = Math.min(1, p.stamina + STAMINA.recoveryPerPoint);
      p._nearMissTimer = 0;
      if (p.ctx)
        p.ctx._sigUsedThisPoint = false;
      resetCtx(p);
    }
    gs.players[gs.server].ctx._isServer = true;
    gs.players[gs.receiver].ctx._isServer = false;
    traceStartPoint(gs);
  }, TIMING.pointPauseMs);
}
function estimatePostBounceTelemetry(ball, environment) {
  const sim = {
    pos: { ...ball.pos ?? { x: 0, y: 0, z: 0 } },
    vel: { ...ball.vel ?? { x: 0, y: 0, z: 0 } },
    spin: { ...ball.spin ?? { x: 0, y: 0, z: 0 } },
    _deadBall: !!ball._deadBall,
    _isDropShot: !!ball._isDropShot,
    _shotRuntime: ball._shotRuntime ? JSON.parse(JSON.stringify(ball._shotRuntime)) : null
  };
  const dt = 1 / 240;
  const maxSteps = Math.floor(1.25 / dt);
  const airDensity = environment?.airDensity ?? PHYSICS.airDensity;
  let t = 0;
  let apex = { z: sim.pos.z ?? 0, x: sim.pos.x ?? 0, y: sim.pos.y ?? 0, t: 0 };
  let nextBounce = null;
  for (let i = 0; i < maxSteps; i++) {
    const acc = computeAcceleration2(sim, airDensity);
    sim.vel.x += acc.x * dt;
    sim.vel.y += acc.y * dt;
    sim.vel.z += acc.z * dt;
    sim.pos.x += sim.vel.x * dt;
    sim.pos.y += sim.vel.y * dt;
    sim.pos.z += sim.vel.z * dt;
    t += dt;
    if (sim.pos.z > apex.z) {
      apex = { z: sim.pos.z, x: sim.pos.x, y: sim.pos.y, t };
    }
    if (sim.pos.z <= 0) {
      nextBounce = { x: sim.pos.x, y: sim.pos.y, t };
      break;
    }
  }
  return {
    exitSpeedKmh: mag3(ball.vel ?? { x: 0, y: 0, z: 0 }) * 3.6,
    exitVz: ball.vel?.z ?? null,
    apexHeight: apex.z ?? null,
    apexTime: apex.t ?? null,
    apexX: apex.x ?? null,
    apexY: apex.y ?? null,
    nextBounceTime: nextBounce?.t ?? null,
    nextBounceX: nextBounce?.x ?? null,
    nextBounceY: nextBounce?.y ?? null
  };
}
function onBounce(gs) {
  const ball = gs.ball;
  gs.totalBounces = (gs.totalBounces || 0) + 1;
  ball.lastBounceSide = Math.sign(ball.pos.y);
  gs.lastBouncePos = { x: ball.pos.x, y: ball.pos.y };
  addCourtMark(gs, ball, ball._lastShotType);
  playSound("BOUNCE");
  if (!gs.bounceLog)
    gs.bounceLog = [];
  gs.bounceLog.push({
    x: ball.pos.x,
    y: ball.pos.y,
    type: "rally",
    // será atualizado para 'winner' ou 'out' em resolvePoint/resolveOutOfBounds
    player: ball.lastHitBy ?? -1,
    shotType: ball._lastShotType ?? "FLAT",
    rally: gs.rally,
    idx: gs.bounceLog.length,
    targetX: ball._lastTargetX ?? null,
    targetY: ball._lastTargetY ?? null,
    contactX: ball._lastContactX ?? null,
    contactY: ball._lastContactY ?? null
  });
  const bounceTelemetry = estimatePostBounceTelemetry(ball, gs.environment);
  traceLogOutcome(gs, ball.pos.x, ball.pos.y, null, bounceTelemetry);
  if (gs.isFirstBounce && ball.lastHitBy === gs.server && ball._serveTargetY !== void 0) {
    const deltaY = (ball.pos.y - ball._serveTargetY).toFixed(2);
    pushTech(
      gs,
      `[QB${_pad(ball.bounceCount, 2)}] QUIQUE \u2502 pos(x=${_f2(ball.pos.x)}, y=${_f2(ball.pos.y)}) \u2502 vel_sa\xEDda(x=${_f2(ball.vel.x)}, y=${_f2(ball.vel.y)}, z=${_f2(ball.vel.z)}) \u2502 \u0394Y=${deltaY}m`
    );
  } else {
    const _solverTag = (ball._solverErr ?? 0) > 2 ? ` \u26A0SOLVER_ERR:${ball._solverErr?.toFixed(2)}m` : "";
    pushTech(
      gs,
      `[QB${_pad(ball.bounceCount, 2)}] QUIQUE \u2502 pos(x=${_f2(ball.pos.x)}, y=${_f2(ball.pos.y)}) \u2502 vel_sa\xEDda(x=${_f2(ball.vel.x)}, y=${_f2(ball.vel.y)}, z=${_f2(ball.vel.z)})${_solverTag}`
    );
  }
  if (gs.isFirstBounce && ball.lastHitBy === gs.server) {
    gs.isFirstBounce = false;
    const server = gs.players[gs.server];
    if (ball._serveNetTouched && checkServiceBox(ball, server.side, gs.serveLeft)) {
      gs.log.push(`\u{1F501} LET ${server.name} \u2014 saque repetido`);
      gs.gameState = GameState.PRE_SERVE;
      gs.stateTimer = 0;
      gs.ball = createBall();
      gs.lastBouncePos = null;
      gs.isFirstBounce = true;
      gs.serveBounced = false;
      gs.receiverTouched = false;
      return;
    }
    if (!checkServiceBox(ball, server.side, gs.serveLeft)) {
      server.faults++;
      if (server.faults >= 2) {
        resolvePoint(gs, gs.receiver, `DUPLA FALTA ${server.name}`);
        server.errorCount++;
      } else {
        gs.log.push(`\u26A0 FALTA 1 ${server.name}`);
        gs.gameState = GameState.PRE_SERVE;
        gs.stateTimer = 0;
        ball.inFlight = false;
      }
      return;
    }
    gs.serveBounced = true;
    const kmh = ball._serveExitKmh ?? Math.round(mag3(ball.vel) * 3.6);
    const st = server.stats;
    if (gs.lastServeFirst) {
      st.serve1In++;
      st.serve1AvgKmh = movAvg(st.serve1AvgKmh, st.serve1In - 1, kmh);
    } else {
      st.serve2In++;
      st.serve2AvgKmh = movAvg(st.serve2AvgKmh, st.serve2In - 1, kmh);
    }
    return;
  }
  if (!gs.isFirstBounce && ball.lastHitBy >= 0) {
    const h = ball.lastHitBy;
    const hitterSide = gs.players[h].side;
    if (ball.lastBounceSide === hitterSide) {
      resolvePoint(gs, 1 - h, `[CAMPO PR\xD3PRIO] ${gs.players[h].name}`);
      const hitter = gs.players[h];
      hitter.errorCount++;
      const _fed = THRESHOLDS.forcedErrorDiff ?? 0.72;
      const _fep = THRESHOLDS.forcedErrorPressure ?? 0.82;
      const _hitQ = hitter._lastQuality ?? 0;
      const _isComfortableHit = _hitQ >= 0.52;
      if (!hitter._forceUE && !_isComfortableHit && ((hitter._lastHitDiff ?? 0) >= _fed || (hitter._lastHitPressure ?? 0) > _fep)) {
        hitter.stats.forcedErrors++;
      } else {
        hitter.stats.unforcedErrors++;
      }
      hitter._forceUE = false;
      return;
    }
  }
  if (!gs.isFirstBounce && ball.bounceCount >= 2 && ball.lastHitBy >= 0) {
    const h = ball.lastHitBy;
    if (Math.sign(ball.pos.y) !== Math.sign(gs.players[h].pos.y)) {
      const defender = gs.players[1 - h];
      const dist = Math.sqrt((defender.pos.x - ball.pos.x) ** 2 + (defender.pos.y - ball.pos.y) ** 2);
      const staminaFactor = STAMINA.speedMinFactor + (defender.stamina ?? 1) * (1 - STAMINA.speedMinFactor);
      const maxDefSpd = defender.playerSpeed * staminaFactor;
      const postHitDelay = defender.ctx?._postHitPause ?? 0;
      const ballSpd = Math.sqrt(ball.vel.x ** 2 + ball.vel.y ** 2 + ball.vel.z ** 2);
      const timeToStop = ballSpd > 0.3 ? 0.25 : 0;
      const defReach = defender.reach + maxDefSpd * timeToStop;
      const trulyUnreachable = dist > defReach * 3.8;
      const bounceOutsideCourt = Math.abs(ball.pos.y) > COURT.halfL + 0.05 || Math.abs(ball.pos.x) > COURT.singlesW / 2 + 0.05;
      const defETA = maxDefSpd > 0 ? dist / maxDefSpd + postHitDelay : 999;
      const hitterFinalShot = gs.players[h]?._finalShot;
      if (hitterFinalShot) {
        hitterFinalShot.timings.opponentETA = +defETA.toFixed(3);
        hitterFinalShot.timings.opponentETAComponents = {
          dist: +dist.toFixed(2),
          maxDefSpd: +maxDefSpd.toFixed(2),
          postHitDelay: +postHitDelay.toFixed(3),
          staminaFactor: +staminaFactor.toFixed(2)
        };
      }
      pushTech(
        gs,
        `[DBG-QB2] def:${defender.name} dist:${dist.toFixed(2)}m ETA:${defETA.toFixed(2)}s (postHitDelay:${postHitDelay.toFixed(3)}s stam:${staminaFactor.toFixed(2)}) margin:${(defender._arrivalMargin ?? 0).toFixed(2)}s unreachable:${trulyUnreachable} bounceOut:${bounceOutsideCourt}` + ((ball._solverErr ?? 0) > 2 ? ` \u26A0SOLVER_ERR:${ball._solverErr?.toFixed(2)}m` : "")
      );
      if ((ball._solverErr ?? 0) > 2) {
        resolvePoint(gs, 1 - h, `[ERRO_TRAJ] ${gs.players[h].name}`);
        gs.players[h].errorCount++;
        return;
      }
      resolvePoint(gs, h, `[2 QUIQUES] ${gs.players[1 - h].name}`, true);
    }
  }
}
function resolveNet(gs) {
  const ball = gs.ball;
  if (gs.isFirstBounce) {
    const server = gs.players[gs.server];
    server.faults++;
    if (server.faults >= 2) {
      resolvePoint(gs, gs.receiver, `DUPLA FALTA (rede) ${server.name}`);
      server.errorCount++;
    } else {
      gs.log.push(`\u{1F535} FALTA 1 (rede) ${server.name}`);
      gs.gameState = GameState.PRE_SERVE;
      gs.stateTimer = 0;
      ball.inFlight = false;
    }
  } else {
    const h = ball.lastHitBy;
    if (h >= 0) {
      resolvePoint(gs, 1 - h, `[REDE] ${gs.players[h].name}`);
      const hitter = gs.players[h];
      hitter.errorCount++;
      const _fed = THRESHOLDS.forcedErrorDiff ?? 0.72;
      const _fep = THRESHOLDS.forcedErrorPressure ?? 0.82;
      const _hitQ = hitter._lastQuality ?? 0;
      const _isComfortableHit = _hitQ >= 0.52;
      if (!hitter._forceUE && !_isComfortableHit && ((hitter._lastHitDiff ?? 0) >= _fed || (hitter._lastHitPressure ?? 0) > _fep)) {
        hitter.stats.forcedErrors++;
      } else {
        hitter.stats.unforcedErrors++;
      }
      hitter._forceUE = false;
    }
  }
}
function resolveOutOfBounds(gs) {
  const ball = gs.ball, h = ball.lastHitBy;
  if (gs.bounceLog && gs.bounceLog.length > 0 && ball.bounceCount === 0) {
    gs.bounceLog[gs.bounceLog.length - 1].type = "out";
  }
  if (gs.isFirstBounce && h === gs.server) {
    const server = gs.players[gs.server];
    server.faults++;
    if (server.faults >= 2) {
      resolvePoint(gs, gs.receiver, `DUPLA FALTA (fora) ${server.name}`);
      server.errorCount++;
    } else {
      gs.log.push(`\u{1F4CD} FALTA 1 (fora) ${server.name}`);
      gs.gameState = GameState.PRE_SERVE;
      gs.stateTimer = 0;
      ball.inFlight = false;
    }
    return;
  }
  if (h < 0)
    return;
  const lastBounceInCourt = gs.lastBouncePos ? Math.abs(gs.lastBouncePos.y) <= COURT.halfL + 0.02 && Math.abs(gs.lastBouncePos.x) <= COURT.singlesW / 2 + 0.02 : false;
  if (ball.bounceCount >= 1 && lastBounceInCourt) {
    const beyondY = Math.abs(ball.pos.y) > COURT.halfL + THRESHOLDS.chaseOutLimitY;
    const beyondX = Math.abs(ball.pos.x) > COURT.singlesW / 2 + THRESHOLDS.chaseOutLimitX;
    if (beyondY || beyondX) {
      const defender = gs.players[1 - h];
      const distDef = Math.sqrt((defender.pos.x - ball.pos.x) ** 2 + (defender.pos.y - ball.pos.y) ** 2);
      pushTech(
        gs,
        `[DBG-FUGA] ball(y=${ball.pos.y.toFixed(2)}) def:${defender.name} pos(y=${defender.pos.y.toFixed(2)}) dist:${distDef.toFixed(2)}m margin:${(defender._arrivalMargin ?? 0).toFixed(2)}s`
      );
      resolvePoint(gs, h, `[WINNER \xB7 fuga] ${gs.players[h].name}`, true);
    }
    return;
  }
  resolvePoint(gs, 1 - h, `[FORA] ${gs.players[h].name}`);
  const hitterOut = gs.players[h];
  hitterOut.errorCount++;
  const _fedOut = THRESHOLDS.forcedErrorDiff ?? 0.72;
  const _fepOut = THRESHOLDS.forcedErrorPressure ?? 0.82;
  const _hitQOut = hitterOut._lastQuality ?? 0;
  const _isComfortableOut = _hitQOut >= 0.52;
  if (!hitterOut._forceUE && !_isComfortableOut && ((hitterOut._lastHitDiff ?? 0) >= _fedOut || (hitterOut._lastHitPressure ?? 0) > _fepOut)) {
    hitterOut.stats.forcedErrors++;
  } else {
    hitterOut.stats.unforcedErrors++;
  }
  hitterOut._forceUE = false;
}
function resolveBallStopped(gs) {
  const ball = gs.ball, h = ball.lastHitBy;
  if (h < 0)
    return;
  if (ball.bounceCount >= 1) {
    resolvePoint(gs, h, `[WINNER \xB7 bola parou] ${gs.players[h].name}`, true);
  } else {
    resolvePoint(gs, h, `[BOLA PAROU] ${gs.players[1 - h].name}`);
  }
}
function tryHit(player, gs) {
  const ball = gs.ball;
  if (player.hitCooldown > 0 || ball.lastHitBy === player.id)
    return;
  if (gs.isFirstBounce && ball.lastHitBy === gs.server && ball._serveNetTouched)
    return;
  const ballY = ball.pos.y;
  const sideEpsilon = 0.18;
  const netZone = Math.abs(ballY) < THRESHOLDS.netZone;
  if (!netZone && Math.abs(ballY) > sideEpsilon && Math.sign(ballY) !== player.side)
    return;
  if (gs.isFirstBounce && player.id === gs.receiver && Math.abs(ballY) >= 2)
    return;
  const isDescendingHigh = ball.vel.z < -0.5 && ball.pos.z > 1.6 && ball.bounceCount === 0;
  const isHighRisingBounce = ball.bounceCount >= 1 && ball.vel.z > 0 && ball.pos.z > THRESHOLDS.ballHitMaxZ;
  const smashZCeiling = isDescendingHigh ? 4.5 : isHighRisingBounce ? 3.5 : THRESHOLDS.ballHitMaxZ;
  const NET_VOLLEY_ZONE = 5;
  const EMERG_REACH_MULT = 1.3;
  let isPositionVolley = false;
  let isEmergencyVolley = false;
  if (ball.bounceCount === 0 && !isDescendingHigh && !player.atNet) {
    const playerDistFromNet = Math.abs(player.pos.y);
    const ballComingToMe = player.side > 0 && ball.vel.y > 0 || player.side < 0 && ball.vel.y < 0;
    if (playerDistFromNet < NET_VOLLEY_ZONE && ballComingToMe) {
      isPositionVolley = true;
    }
    const EMERG_MAX_DIST = 7.5;
    if (!isPositionVolley && ballComingToMe && ball.pos.z < 2.2 && ball.pos.z > 0.25 && playerDistFromNet <= EMERG_MAX_DIST) {
      const _airDens = gs.environment?.airDensity ?? 1.2;
      const { landPoint: emergLand } = predictTrajectory(ball, player.pos.y, 1.5, _airDens, gs.courtPhysics);
      if (emergLand) {
        const willBeOutX = Math.abs(emergLand.x) > COURT.singlesW / 2 + 0.05;
        const willBeOutY = Math.abs(emergLand.y) > COURT.halfL + 0.05;
        const willBeOut = willBeOutX || willBeOutY;
        if (willBeOut) {
          const leituraFactor = player.mods?.leituraFactor ?? 0.5;
          const outMarginX = Math.max(0, Math.abs(emergLand.x) - COURT.singlesW / 2);
          const outMarginY = Math.max(0, Math.abs(emergLand.y) - COURT.halfL);
          const outMargin = Math.max(outMarginX, outMarginY);
          const readThreshold = 0.4;
          const clearOut = outMargin > readThreshold;
          const baseReadProb = clearOut ? 0.3 + leituraFactor * 0.65 : leituraFactor * 0.4;
          const readsAsOut = Math.random() < baseReadProb;
          if (readsAsOut) {
            return;
          }
          isEmergencyVolley = true;
        } else {
          const ballPastPlayer = player.side > 0 ? emergLand.y > player.pos.y + 0.3 : emergLand.y < player.pos.y - 0.3;
          if (ballPastPlayer) {
            const dEmerg = Math.sqrt(
              (player.pos.x - ball.pos.x) ** 2 + (player.pos.y - ball.pos.y) ** 2
            );
            if (dEmerg < (player.reach ?? 0.85) * EMERG_REACH_MULT) {
              isEmergencyVolley = true;
            }
          }
        }
      }
    }
    if (!isPositionVolley && !isEmergencyVolley)
      return;
  }
  player._volleyType = player.atNet ? "intentional" : isPositionVolley ? "position" : isEmergencyVolley ? "emergency" : null;
  const mods = player.mods;
  const baseReach = player.reach;
  const d = dist2(player.pos, { x: ball.pos.x, y: ball.pos.y });
  const ballSpd = mag3(ball.vel);
  const hasBounced = ball.bounceCount >= 1;
  const withinBaseReach = d < baseReach;
  const wasNearMiss = (player._nearMissTimer ?? 0) > 0;
  if (hasBounced && d >= baseReach * 1.04 && d < baseReach * 1.2 && !wasNearMiss) {
    player._nearMissTimer = 0.14;
  }
  const timeSinceBounce = ball._timeSinceBounce ?? 999;
  const inLastChance = hasBounced && timeSinceBounce < 0.18;
  const _playerDistFromNetHV = Math.abs(player.pos.y);
  const isHalfVolley = hasBounced && ball.pos.z < 0.42 && timeSinceBounce < 0.22 && _playerDistFromNetHV > 3.5 && _playerDistFromNetHV < 7 && !player.atNet && player._volleyType === null;
  player._halfVolleyContext = isHalfVolley;
  const _netApproachStyle = ((player.attrs?.volley ?? player.attrs?.jogoDeRede ?? 50) + (player.attrs?.smash ?? player.attrs?.jogoDeRede ?? 50)) / 2 >= 72;
  const _approachReachBonus = _netApproachStyle && isPositionVolley ? 0.18 : 0;
  const reachBonus = (wasNearMiss ? 0.08 : 0) + (inLastChance ? 0.06 : 0) + _approachReachBonus;
  const outerReachMult = 1.05 + reachBonus;
  const minSpdRequired = withinBaseReach && hasBounced ? THRESHOLDS.ballHitMinSpdWithinReach : THRESHOLDS.ballHitMinSpd;
  const isSlowBall = hasBounced && ballSpd < THRESHOLDS.ballHitMinSpd * 1.8 && withinBaseReach;
  const isGroundRolling = ball.pos.z < 0.12 && ballSpd < 0.18 && hasBounced;
  if (d >= baseReach * outerReachMult || ball.pos.z >= smashZCeiling || ballSpd < minSpdRequired)
    return;
  const staminaFrac = player.stamina ?? 1;
  let effectiveReach = baseReach * (STAMINA.reachMinFactor + staminaFrac * (1 - STAMINA.reachMinFactor));
  if (gs.rally === 0 && player.id === gs.receiver && gs.ball._serveExitKmh) {
    const sKmh = gs.ball._serveExitKmh;
    const rawServePenalty = clamp2((sKmh - 148) / 205, 0, 0.46);
    const retMult = player.mods?.returnMult ?? 0.82;
    const reachServePenalty = rawServePenalty * clamp2(2.35 - retMult * 1.18, 0.82, 1.55);
    effectiveReach *= 1 - reachServePenalty;
    const returnReachBonus = Math.max(0, (retMult - 0.76) * 0.12);
    effectiveReach += returnReachBonus * baseReach;
  }
  if (d >= effectiveReach)
    return;
  if (player.id === gs.receiver)
    gs.receiverTouched = true;
  const diff = Math.min(1, d / effectiveReach);
  if (ball.pos.z < THRESHOLDS.pressureBallZ || diff > THRESHOLDS.pressureReach || isGroundRolling)
    player.ctx.underPressure = true;
  else if (diff < 0.55 && ball.pos.z >= 0.45)
    player.ctx.underPressure = false;
  player.ctx.rallyBalls++;
  const prepFrac1 = player._prepFrac1 ?? 0;
  const prepFrac2 = player._prepFrac2 ?? 0;
  const prepScore = prepFrac1 * 0.65 + prepFrac2 * 0.35;
  const _contactSpace = computeContactSpace(ball, player);
  const _swingPrep = computeSwingPrep(_contactSpace, player, ball);
  const _feasibility = buildFeasibilityMatrix(
    _contactSpace.heightZone,
    _contactSpace.offsetZone,
    _swingPrep.swingType
  );
  player._contactSpace = _contactSpace;
  player._swingPrep = _swingPrep;
  player._feasibility = _feasibility;
  const depthRatio = player.pos.y * player.side / COURT.halfL;
  const isRetrieverStyle = (player.attrs?.visaoTatica ?? player.attrs?.agressividade ?? 60) < 48 && (player.attrs?.resistencia ?? 60) >= 68;
  const depthPenaltyScale = isRetrieverStyle ? 0.35 : 0.75;
  let positionCeiling = depthRatio < 0.85 ? 1 : clamp2(1 - (depthRatio - 0.85) * depthPenaltyScale, 0.52, 1);
  const _lateralVelocity = Math.abs(player.vel?.x ?? 0);
  const _distFromOptimal = Math.abs(
    (player.pos?.x ?? 0) - (player._predCrossX ?? player.pos?.x ?? 0)
  );
  const contactResult = evaluateContact(
    player.ctx,
    player,
    ball,
    player._arrivalMargin ?? 0,
    _lateralVelocity,
    _distFromOptimal,
    prepScore,
    // prepScore alimenta o prepFactor dentro do ContactModel
    _swingPrep.prepQuality
    // ceiling biomecânico da Camada 1
  );
  const defenseAttr = player.attrs?.defesa ?? 60;
  const defenseMult = player.mods?.defensaMult ?? 0.6 + defenseAttr / 100 * 0.65;
  const tacticalRead = clamp2(
    (player.mods?.visaoFactor ?? (player.attrs?.visaoTatica ?? player.attrs?.agressividade ?? 60) / 100) + (player._adaptacaoBoost ?? 0) * 0.45,
    0.25,
    1.18
  );
  const defenseSkill = clamp2(
    Math.max(0, defenseMult - 0.92) + Math.max(0, (defenseAttr - 50) / 100) * 0.55,
    0,
    0.42
  );
  const scrambleContact = contactResult.quality < 0.46 || contactResult.balanceFactor < 0.8 || contactResult.timingFactor < 0.84 || prepScore < 0.42 || (player._arrivalMargin ?? 0) < 0.08;
  const difficultContact = scrambleContact || contactResult.quality < 0.6 || (player.ctx?.rallyPressure ?? 0) > 0.55 || depthRatio > 0.96;
  const isNetShot = player.atNet || player._volleyType === "position" || player._volleyType === "emergency";
  const _isBackhandHit = player._isBackhand ?? false;
  const _potAttr = _isBackhandHit ? player.attrs?.bhPotencia ?? player.attrs?.potencia ?? 50 : player.attrs?.fhPotencia ?? player.attrs?.potencia ?? 50;
  const _ctrlAttr = _isBackhandHit ? player.attrs?.bhControle ?? player.attrs?.controle ?? 50 : player.attrs?.fhControle ?? player.attrs?.controle ?? 50;
  const _netAttrKey = player._volleyType === "smash" || (player.ctx?.lobsReceived ?? 0) > 0 ? "smash" : "volley";
  const skillAttr = isNetShot ? player.attrs?.[_netAttrKey] ?? player.attrs?.jogoDeRede ?? 50 : Math.round(_potAttr * 0.55 + _ctrlAttr * 0.45);
  const t = skillAttr / 100;
  const skillFactor = 0.72 + t * t * 0.28 + t * 0.2;
  let qualityBase = clamp2(contactResult.quality * skillFactor, 0.05, 1);
  if (isNetShot && player.mods) {
    const netQual = (player.mods.reflexoQualBonus ?? 0) * 0.75;
    qualityBase = clamp2(qualityBase + netQual, 0.03, 1);
  }
  {
    const qm = player._formMods?.qualityMod ?? 1;
    if (qm !== 1)
      qualityBase = clamp2(qualityBase * qm, 0.05, 1);
  }
  if (!isNetShot && difficultContact && defenseSkill > 0) {
    const defenseBonus = defenseSkill * (scrambleContact ? 0.24 : 0.14);
    const readBonus = Math.max(0, tacticalRead - 0.5) * (scrambleContact ? 0.05 : 0.03);
    qualityBase = clamp2(qualityBase + defenseBonus + readBonus, 0.05, 1);
    if (depthRatio > 0.95 || scrambleContact) {
      const ceilingRelief = defenseSkill * (scrambleContact ? 0.12 : 0.07);
      positionCeiling = clamp2(positionCeiling + ceilingRelief, 0.52, 1);
    }
  }
  if (gs.ball._serveExitKmh && gs.rally === 0) {
    const kmh = gs.ball._serveExitKmh;
    const retMult = player.mods?.returnMult ?? 0.82;
    const arrMargin = player._arrivalMargin ?? 0;
    const defenseGate = clamp2((defenseMult - 0.92) / 0.2, 0, 1);
    const returnGate = clamp2((retMult - 0.9) / 0.14, 0, 1);
    const arrivalGate = clamp2((arrMargin + 0.06) / 0.22, 0, 1);
    const prepGate = clamp2((prepScore - 0.46) / 0.28, 0, 1);
    const eliteReturnWindow = clamp2(
      returnGate * 0.42 + defenseGate * 0.26 + arrivalGate * 0.2 + prepGate * 0.12,
      0,
      1
    );
    const isSecondServe = !!gs.ball._isSecondServe;
    const rawPenalty = clamp2((kmh - 142) / 175, 0, 0.54);
    const servePenalty = rawPenalty * clamp2(2.35 - retMult * 1.12, 0.9, 1.65);
    qualityBase = Math.max(0.05, qualityBase - servePenalty);
    const serveSeverity = clamp2((kmh - (isSecondServe ? 150 : 162)) / (isSecondServe ? 34 : 42), 0, 1);
    if (serveSeverity > 0) {
      const qualityCapBase = isSecondServe ? 0.68 : 0.56;
      const qualityCap = qualityCapBase + eliteReturnWindow * (isSecondServe ? 0.24 : 0.3);
      const capTightener = isSecondServe ? 0.1 : 0.18;
      qualityBase = Math.min(qualityBase, qualityCap + (1 - serveSeverity) * capTightener);
    }
    const slowFactor = clamp2((158 - kmh) / 24, 0, 0.3);
    const skillFactor2 = clamp2((retMult - 0.95) / 0.08, 0, 1) * clamp2((defenseMult - 0.96) / 0.16, 0, 1);
    const returnBoost = slowFactor * skillFactor2 * 0.12 * arrivalGate;
    if (returnBoost > 0) {
      qualityBase = Math.min(0.86, qualityBase + returnBoost);
    }
  }
  {
    const opp2 = gs.players[1 - player.id];
    const oppQ = opp2._lastQuality ?? 0.5;
    const carryPenalty = clamp2((oppQ - 0.55) * 0.45, 0, 0.2);
    if (carryPenalty > 0) {
      qualityBase = Math.max(0.05, qualityBase - carryPenalty);
    }
  }
  {
    const isServer = player.id === gs.server;
    const wrBoost = player.ctx._weakReturnBoost ?? 0;
    if (isServer && wrBoost > 0) {
      const rallyAge = gs.rally - (player.ctx._weakReturnRally ?? 0);
      const decayFactor = rallyAge <= 1 ? 1 : rallyAge === 2 ? 0.88 : rallyAge === 3 ? 0.68 : rallyAge === 4 ? 0.45 : rallyAge === 5 ? 0.22 : rallyAge === 6 ? 0.08 : 0;
      const effectiveBoost = wrBoost * decayFactor;
      if (effectiveBoost > 0) {
        qualityBase = Math.min(0.95, qualityBase + effectiveBoost);
      }
      if (decayFactor === 0)
        player.ctx._weakReturnBoost = 0;
      if (effectiveBoost > 0) {
        const prevIntent = player.ctx.currentIntent ?? "BUILD";
        if (effectiveBoost >= AI.INTENT.SERVE_ADV_FINISH * wrBoost) {
          player.ctx.currentIntent = "FINISH";
        } else if (effectiveBoost >= AI.INTENT.SERVE_ADV_PRESSURE * wrBoost) {
          if (prevIntent !== "FINISH")
            player.ctx.currentIntent = "PRESSURE";
        } else {
          if (prevIntent === "BUILD")
            player.ctx.currentIntent = "BUILD";
        }
      }
    } else if (player.id === gs.server && (player.ctx._weakReturnBoost ?? 0) === 0) {
      if (player.ctx.currentIntent === "FINISH" || player.ctx.currentIntent === "PRESSURE") {
        player.ctx.currentIntent = "BUILD";
      }
    }
  }
  {
    const traitFxEarly = getUnifiedPlayerTraitFx(player, gs);
    if (traitFxEarly.strengthBonus !== 0) {
      qualityBase = clamp2(qualityBase + traitFxEarly.strengthBonus * 4e-3, 0.05, 1);
    }
    if (traitFxEarly.clutchMult !== 1) {
      const _isBpOrTb = gs.inTiebreak || Math.abs(gs.players[0].score - gs.players[1].score) <= 1 && Math.max(gs.players[0].score, gs.players[1].score) >= 3;
      const _setsNeeded = gs.setsToWin ?? 2;
      const _opp = gs.players[1 - player.id];
      const _isMP_srv = !gs.inTiebreak && player.sets === _setsNeeded - 1 && player.id === gs.server && player.score >= 3 && player.score > _opp.score;
      const _isMP_rcv = !gs.inTiebreak && player.sets === _setsNeeded - 1 && player.id === gs.receiver && player.score >= 3 && player.score > _opp.score;
      const _isMP_tb = gs.inTiebreak && player.sets === _setsNeeded - 1 && gs.tbScore[player.id] >= 6 && gs.tbScore[player.id] > gs.tbScore[_opp.id];
      const _isMatchPt = _isMP_srv || _isMP_rcv || _isMP_tb;
      if (_isBpOrTb || _isMatchPt) {
        qualityBase = clamp2(qualityBase * traitFxEarly.clutchMult, 0.05, 1);
      }
    }
    if (traitFxEarly.formFloor && player._formMods) {
      const _floorMap = { BOA_FORMA: 1.04, GRANDE_FORMA: 1.08, IMPARAVEL: 1.14 };
      const _floorVal = _floorMap[traitFxEarly.formFloor] ?? 1;
      if ((player._formMods.qualityMod ?? 1) < _floorVal) {
        player._formMods.qualityMod = _floorVal;
        qualityBase = clamp2(qualityBase * _floorVal, 0.05, 1);
      }
    }
  }
  {
    const _isBpOrTb = gs.inTiebreak || Math.abs(gs.players[0].score - gs.players[1].score) <= 1 && Math.max(gs.players[0].score, gs.players[1].score) >= 3;
    const _crowd = gs.crowdPressure ?? 0;
    const _crowdAmp = _isBpOrTb ? 1 + _crowd * 0.4 : 1 + _crowd * 0.1;
    const _mentalBonus = mods ? (mods.mentalFactor - 0.6) * (_isBpOrTb ? 0.18 : 0.06) * _crowdAmp : 0;
    if (_mentalBonus !== 0)
      qualityBase = clamp2(qualityBase + _mentalBonus, 0.03, 1);
  }
  const finalQuality = clamp2(Math.min(qualityBase, positionCeiling), 0.05, 1);
  player._contactResult = contactResult;
  player._lastQuality = finalQuality;
  if (gs.rally === 0) {
    const server = gs.players[gs.server];
    const returnQ = finalQuality;
    const weakBoost = clamp2((0.8 - returnQ) / 0.8, 0, 1) * 0.84;
    server.ctx._weakReturnBoost = weakBoost;
    server.ctx._weakReturnRally = gs.rally;
    const returnPressureSeed = clamp2((0.8 - returnQ) / 0.8, 0, 1) * 1.06;
    if (returnPressureSeed > 0.02) {
      player.ctx.rallyPressure = Math.max(player.ctx.rallyPressure ?? 0, returnPressureSeed);
    }
  }
  player.stats.qualitySum += finalQuality;
  player.stats.qualityCount += 1;
  {
    const _i = player.ctx?.currentIntent;
    player._tacticalState = _i === "FINISH" || _i === "PRESSURE" ? "ATTACK" : _i === "RESET" ? "DEFEND" : "NEUTRAL";
  }
  if (player._tacticalState === "ATTACK")
    player.stats.attackShots++;
  else if (player._tacticalState === "DEFEND")
    player.stats.defenseShots++;
  player._qualBreakdown = {
    final: +finalQuality.toFixed(3),
    positionCeiling: +positionCeiling.toFixed(3),
    depthRatio: +depthRatio.toFixed(3),
    prepFrac1: +prepFrac1.toFixed(3),
    prepFrac2: +prepFrac2.toFixed(3),
    prepScore: +prepScore.toFixed(3),
    skillFactor: +skillFactor.toFixed(3),
    skillAttr: Math.round(skillAttr),
    diff: +diff.toFixed(3),
    arrivalMargin: +(player._arrivalMargin ?? 0).toFixed(3),
    // ContactModel
    contactQuality: +contactResult.quality.toFixed(3),
    contactTiming: +contactResult.timingFactor.toFixed(3),
    contactPrep: +contactResult.prepFactor.toFixed(3),
    contactBalance: +contactResult.balanceFactor.toFixed(3),
    contactFatigue: +contactResult.fatigueFactor.toFixed(3),
    contactPressure: +contactResult.pressureFactor.toFixed(3),
    contactSpin: +contactResult.spinControlFactor.toFixed(3),
    contactVolley: +contactResult.volleyFactor.toFixed(3),
    // ATP Shot Engine — Fase 1
    cs_heightZone: _contactSpace.heightZone,
    cs_offsetZone: _contactSpace.offsetZone,
    cs_prepWindow: _contactSpace.prepWindowClass,
    cs_qCeiling: +_contactSpace.qCeiling.toFixed(3),
    sp_swingType: _swingPrep.swingType,
    sp_prepQuality: +_swingPrep.prepQuality.toFixed(3),
    sp_prepTime: +_swingPrep.prepTimeFactor.toFixed(3),
    sp_balance: +_swingPrep.balanceFactor.toFixed(3),
    sp_footwork: +_swingPrep.footworkFactor.toFixed(3),
    fm_viableShots: _feasibility.getViableShots().join(",")
  };
  player._prepTime = 0;
  player._prepFrac1 = 0;
  player._prepFrac2 = 0;
  player._approachInitialized = false;
  const rallyLenMult = gs.courtMods?.rallyLengthMult ?? 1;
  const basePatience = mods ? mods.patienceRallyMin : THRESHOLDS.errorRallyMin;
  const patienceThreshold = Math.round(basePatience * rallyLenMult);
  const pastPatienceMin = gs.rally > patienceThreshold && ball.bounceCount >= 1;
  const sty = player.styleData;
  const traitFx = getUnifiedPlayerTraitFx(player, gs);
  const rallyPressure = player.ctx.rallyPressure ?? 0;
  player._lastHitDiff = diff;
  player._lastHitPressure = rallyPressure;
  const velBefore = { x: ball.vel.x, y: ball.vel.y, z: ball.vel.z };
  if (gs.rally === 0 && player.id === gs.receiver) {
    const sv = gs.players[gs.server];
    computeReturnIntent(player, sv, ball, finalQuality, gs.rally);
  }
  readMatchContext(player, gs.players[1 - player.id]);
  {
    const bx = ball.pos.x;
    const px = player.pos.x;
    const hand = player.handedness ?? "right";
    player._isBackhand = hand === "left" ? bx > px + 0.15 : bx < px - 0.15;
  }
  let shot = null;
  let effectiveQuality = finalQuality;
  const useShotMaster = true;
  if (useShotMaster) {
    const shotExec = executeRallyShot(ball, player, gs.players[1 - player.id], finalQuality, {
      isSlowBall,
      isGroundRolling,
      gsRally: gs.rally,
      surface: gs.courtPhysics?.surface,
      currentIntent: player.ctx?.currentIntent,
      contactSpace: player._contactSpace,
      swingPrep: player._swingPrep,
      feasibility: player._feasibility,
      scoreState: _computeScoreImportance(player, gs),
      isBackhand: player._isBackhand,
      ballX: ball.pos.x,
      ballZ: ball.pos.z
    });
    shot = shotExec.shot;
    effectiveQuality = shotExec.effectiveQuality;
    player._lastQuality = effectiveQuality;
    player._shotEvProb = {
      error: null,
      win: player._aiTrace?.chosen?._evProbWin ?? null
    };
    player._volleyType = null;
    if (!gs.debugEvents)
      gs.debugEvents = [];
    if (gs.debugEvents.length < 2e3) {
      const absX = Math.abs(shot.targetX);
      const absY = Math.abs(shot.targetY);
      const playerSideSign = player.id === 0 ? 1 : -1;
      const dirLabel = absX > 1.5 ? shot.targetX * playerSideSign > 0 ? "DTL" : "CC" : "BODY";
      const depthBucket = absY > COURT.halfL * 0.78 ? "DEEP" : absY > COURT.halfL * 0.45 ? "MID" : "SHORT";
      const widthBucket = absX > 2.8 ? "WIDE" : absX > 1.2 ? "MID" : "CENTRE";
      gs.debugEvents.push({
        type: "SHOT_EVENT",
        rallyBallIndex: gs.rally,
        playerId: player.id,
        playerSide: player.side,
        ctrlAttr: shotExec.controlAttr,
        sigma: Math.round((shotExec.sigma ?? 0) * 1e3) / 1e3,
        shotType: shot.type,
        spin: shot.spinType ?? "FLAT",
        power: Math.round(shot.power * 3.6),
        fromX: player.pos.x,
        fromY: player.pos.y,
        intentX: shot.targetX,
        intentY: shot.targetY,
        toX: shot.targetX,
        toY: shot.targetY,
        quality: Math.round(effectiveQuality * 100) / 100,
        tacticalState: player._tacticalState ?? "NEUTRAL",
        underPressure: player.ctx.underPressure ?? false,
        dirLabel,
        depthBucket,
        widthBucket
      });
    }
    traceLogShot(gs, player, shot, effectiveQuality);
  } else {
    shot = aiDecideShot(player, ball, gs.players[1 - player.id], finalQuality, {
      isSlowBall,
      isGroundRolling,
      gsRally: gs.rally,
      // ATP Shot Engine — dados de contato para shotDecision.js (Phase 3)
      contactSpace: player._contactSpace,
      swingPrep: player._swingPrep,
      feasibility: player._feasibility,
      // Shot System v4 — importância do ponto para cálculo de pressão (Camada 6)
      scoreState: _computeScoreImportance(player, gs),
      // v4 Wing context
      isBackhand: player._isBackhand
    });
    player._shotEvProb = {
      error: null,
      win: player._aiTrace?.chosen?._evProbWin ?? null
    };
    const _isSigShot = !!(shot?._sigQualityBonus > 0);
    let finalQualityBoosted = finalQuality;
    if (_isSigShot) {
      const sigBonus = shot._sigQualityBonus * CONTACT.SIG_QUALITY_MULT;
      finalQualityBoosted = clamp2(
        finalQuality * (1 + sigBonus),
        finalQuality,
        // nunca reduz
        CONTACT.SIG_QUALITY_CAP
      );
      player._lastQuality = finalQualityBoosted;
    }
    effectiveQuality = finalQualityBoosted;
    {
      const _opp = gs.players[1 - player.id];
      if (_opp?.atNet && !player.atNet) {
        const _leituraBonus = ((player.attrs?.leitura ?? 50) - 50) / 100 * 0.1;
        if (_leituraBonus !== 0) {
          effectiveQuality = clamp2(effectiveQuality + _leituraBonus, 0.03, 1);
          player._lastQuality = effectiveQuality;
        }
      }
    }
    if (shot) {
      if (shot.type === "TOPSPIN") {
        const _topBonus = ((player.attrs?.topspin ?? 50) - 50) / 100 * 0.07;
        if (_topBonus !== 0) {
          effectiveQuality = clamp2(effectiveQuality + _topBonus, 0.03, 1);
          player._lastQuality = effectiveQuality;
        }
      } else if (shot.type === "SLICE" || shot.type === "DROP") {
        const _slcBonus = ((player.attrs?.slice ?? 50) - 50) / 100 * 0.07;
        if (_slcBonus !== 0) {
          effectiveQuality = clamp2(effectiveQuality + _slcBonus, 0.03, 1);
          player._lastQuality = effectiveQuality;
        }
      }
      if (!isNetShot && difficultContact && defenseSkill > 0) {
        const isDefensiveShot = shot.type === "SLICE" || shot.type === "TOPSPIN" || shot.type === "LOB_DEF" || shot.type === "LOB_ATK";
        if (isDefensiveShot) {
          const recoveryBonus = defenseSkill * (shot.type === "SLICE" || shot.type === "LOB_DEF" ? scrambleContact ? 0.12 : 0.08 : scrambleContact ? 0.08 : 0.05);
          if (recoveryBonus > 0) {
            effectiveQuality = clamp2(effectiveQuality + recoveryBonus, 0.03, 1);
            player._lastQuality = effectiveQuality;
          }
        }
      }
    }
    const _volleyType = player._volleyType;
    if (shot && (_volleyType === "position" || _volleyType === "emergency") && shot.type !== "SMASH") {
      shot.type = "VOLLEY";
    }
    player._volleyType = null;
    if (!gs.debugEvents)
      gs.debugEvents = [];
    if (gs.debugEvents.length < 2e3) {
      const _HALF_W = 4.115, _HALF_L = 11.885;
      const absX = Math.abs(shot.targetX);
      const playerSideSign = player.id === 0 ? 1 : -1;
      const dirLabel = absX > 1.5 ? shot.targetX * playerSideSign > 0 ? "DTL" : "CC" : "BODY";
      const absY = Math.abs(shot.targetY);
      const depthBucket = absY > _HALF_L * 0.78 ? "DEEP" : absY > _HALF_L * 0.45 ? "MID" : "SHORT";
      const widthBucket = absX > 2.8 ? "WIDE" : absX > 1.2 ? "MID" : "CENTRE";
      const _isBackhandHit_dbg = player._isBackhand ?? false;
      const _ctrlAttr_dbg = _isBackhandHit_dbg ? player.attrs?.bhControle ?? player.attrs?.controle ?? 50 : player.attrs?.fhControle ?? player.attrs?.controle ?? 50;
      const _sigmaEst = Math.round(computeSigmaX(
        shot.type,
        effectiveQuality,
        shot.targetX,
        COURT.singlesW / 2,
        _ctrlAttr_dbg,
        player.attrs?.potencia ?? 50,
        void 0,
        player.pos.x
      ) * 1e3) / 1e3;
      gs.debugEvents.push({
        type: "SHOT_EVENT",
        rallyBallIndex: gs.rally,
        playerId: player.id,
        playerSide: player.side,
        // +1 = P0 (bottom), -1 = P1 (top)
        ctrlAttr: _ctrlAttr_dbg,
        // wing-aware control, for sigma display
        sigma: _sigmaEst,
        // pre-computed scatter radius (metres)
        shotType: shot.type,
        spin: shot.spinType ?? "FLAT",
        power: Math.round(shot.power * 3.6),
        // km/h
        fromX: player.pos.x,
        fromY: player.pos.y,
        intentX: shot.targetX,
        // aim BEFORE targetBias + gaussian scatter
        intentY: shot.targetY,
        // aim BEFORE targetBias + gaussian scatter
        toX: shot.targetX,
        toY: shot.targetY,
        quality: Math.round(effectiveQuality * 100) / 100,
        tacticalState: player._tacticalState ?? "NEUTRAL",
        underPressure: player.ctx.underPressure ?? false,
        dirLabel,
        depthBucket,
        widthBucket
      });
      ball._lastTargetX = shot.targetX;
      ball._lastTargetY = shot.targetY;
      ball._lastContactX = player.pos.x;
      ball._lastContactY = player.pos.y;
      traceLogShot(gs, player, shot, effectiveQuality);
    }
    if (!["DROP", "LOB_ATK", "LOB_DEF", "LOB_DEF", "SMASH"].includes(shot.type)) {
      const _biasFactor = effectiveQuality >= 0.7 ? 0 : clamp2(Math.pow((0.7 - effectiveQuality) / 0.7, 1.4) * 0.45, 0, 0.44);
      if (_biasFactor > 5e-3) {
        shot.targetX = shot.targetX * (1 - _biasFactor);
      }
    }
    const _isSpecialShot = shot.type === "DROP" || shot.type === "LOB_ATK" || shot.type === "LOB_DEF" || shot.type === "SMASH";
    if (!_isSpecialShot) {
      const _sigma = computeSigmaX(
        shot.type,
        effectiveQuality,
        shot.targetX,
        COURT.singlesW / 2,
        _ctrlAttr,
        _potAttr,
        void 0,
        player.pos.x
      );
      if (_sigma > 0.03) {
        const _poorQ = clamp2((0.55 - effectiveQuality) / 0.55, 0, 1);
        const _sigmaSpreadMult = 1 + _poorQ * 0.9;
        const _u1 = Math.max(1e-6, Math.random());
        const _u2 = Math.random();
        const _r = Math.min(2.5, Math.sqrt(-2 * Math.log(_u1)));
        const _th = 2 * Math.PI * _u2;
        const _yMult = clamp2(0.58 + (1 - effectiveQuality) * 0.72 + _poorQ * 0.26, 0.58, 1.42);
        shot.targetX += _r * Math.cos(_th) * _sigma * _sigmaSpreadMult;
        shot.targetY += _r * Math.sin(_th) * _sigma * _sigmaSpreadMult * _yMult;
        const _ySign = Math.sign(shot.targetY) || (player.side > 0 ? -1 : 1);
        const _maxAbsY = COURT.halfL + 2 + _poorQ * 1.2;
        const _normalMaxAbsY = COURT.halfL - 0.1 + _poorQ * 1.55;
        const _isMishit = effectiveQuality < 0.36 && _ctrlAttr < 62;
        const _minAbsY = effectiveQuality < 0.22 ? 3.1 : effectiveQuality < 0.36 ? 2.2 : 0.25;
        if (_isMishit) {
          shot.targetY = _ySign * clamp2(Math.abs(shot.targetY), _minAbsY, _maxAbsY);
        } else {
          shot.targetY = _ySign * clamp2(Math.abs(shot.targetY), _minAbsY, _normalMaxAbsY);
        }
        const _xSign = Math.sign(shot.targetX) || 1;
        const _maxAbsX = COURT.singlesW / 2 + 3.5 + _poorQ * 1.2;
        if (Math.abs(shot.targetX) > _maxAbsX)
          shot.targetX = _xSign * _maxAbsX;
      }
    }
    const _spinNum = shot.spinType === "TOP" ? 1 : shot.spinType === "SLICE" ? -1 : SPIN_MAP[shot.type] ?? 0;
    const _isSpeedShot = shot.type !== "DROP" && shot.type !== "DEF_LOB" && shot.type !== "AGG_LOB";
    const _ballSpd = _isSpeedShot ? _isBackhandHit ? mods?.bhBallSpeedMult ?? mods?.ballSpeedMult ?? 1 : mods?.fhBallSpeedMult ?? mods?.ballSpeedMult ?? 1 : 1;
    const _dropFlightProfile = shot.launchOptions?.flightProfile ?? {
      mode: "drop_rewrite",
      netMinZ: COURT.netHeight + 0.12,
      preferredNetZ: COURT.netHeight + 0.18,
      minTime: 0.82,
      maxTime: 1.8,
      minSpeed: 11,
      maxSpeed: 30,
      apexMinZ: 0.58,
      apexMaxZ: 1.4,
      preferredApexZ: 0.8
    };
    const _flightProfile = shot.type === "DROP" ? _dropFlightProfile : shot.type === "SLICE" ? { vzMin: -1.4, vzMax: 2.55, maxLandingError: 0.9, netMinZ: COURT.netHeight + 0.015 } : shot.type === "SLICE_SHORT" ? { vzMin: -1.2, vzMax: 1.85, maxLandingError: 0.7, netMinZ: COURT.netHeight + 0.01 } : null;
    launchBall2(
      ball,
      player.pos,
      shot.targetX,
      shot.targetY,
      _spinNum,
      shot.power * _ballSpd,
      shot.netClearance,
      shot.hitHeight,
      shot.spinX,
      shot.spinZ,
      _flightProfile ? { flightProfile: _flightProfile } : null
    );
    ball._isDropShot = shot.type === "DROP";
    if (shot._sigBounce != null)
      ball._sigBounce = shot._sigBounce;
    if (shot._sigBounceSpin != null)
      ball._sigBounceSpin = shot._sigBounceSpin;
    if (shot._sigQualityBonus && shot._sigQualityBonus > 0) {
      const boost = 1 + shot._sigQualityBonus * 0.15;
      ball.vel.x *= boost;
      ball.vel.y *= boost;
    }
    const _isAggressiveShot = shot.type === "ACCEL" || shot.type === "SHORT_ACCEL" || shot.type === "TOPSPIN";
    if (effectiveQuality < 0.25) {
      const _damp = _isAggressiveShot ? 0.8 : 0.68;
      ball.vel.x *= _damp;
      ball.vel.y *= _damp;
    } else if (effectiveQuality < 0.4) {
      const _damp = _isAggressiveShot ? 0.88 : 0.78;
      ball.vel.x *= _damp;
      ball.vel.y *= _damp;
    } else if (effectiveQuality < 0.52) {
      const _damp = _isAggressiveShot ? 0.94 : 0.88;
      ball.vel.x *= _damp;
      ball.vel.y *= _damp;
    }
  }
  ball.lastHitBy = player.id;
  ball.bounceCount = 0;
  gs.isFirstBounce = false;
  ball._lastTargetX = shot.targetX;
  ball._lastTargetY = shot.targetY;
  ball._lastContactX = player.pos.x;
  ball._lastContactY = player.pos.y;
  ball.lastShotType = shot.type;
  gs.rally++;
  if (gs.rally === 20)
    gs.pendingScreenFx = { color: "rgba(255,107,53,0.14)", glow: "#FF6B35", shake: false, dur: 400 };
  gs.maxRally = Math.max(gs.maxRally, gs.rally);
  player.shotCount++;
  updateRallyPressure(gs, 1 - player.id, shot.zone, shot.targetX);
  player.ctx.rallyPressure = Math.max(0, rallyPressure * 0.4);
  const oppMc = gs.players[1 - player.id];
  if (oppMc.ctx.matchCtx) {
    if (shot.targetX < -0.5)
      oppMc.ctx.matchCtx.oppBhHits = (oppMc.ctx.matchCtx.oppBhHits || 0) + 1;
    if (shot.targetX > 0.5)
      oppMc.ctx.matchCtx.oppFhHits = (oppMc.ctx.matchCtx.oppFhHits || 0) + 1;
    if (shot.type === "DROP")
      oppMc.ctx.matchCtx.oppDrops = (oppMc.ctx.matchCtx.oppDrops || 0) + 1;
  }
  if (staminaFrac < INERTIA.postHitStaminaThresh && player.ctx._postHitPause <= 0) {
    const pauseRange = INERTIA.postHitPauseMax - INERTIA.postHitPauseMin;
    player.ctx._postHitPause = INERTIA.postHitPauseMin + Math.random() * pauseRange * (1 - staminaFrac / INERTIA.postHitStaminaThresh);
  }
  const sprintSpeed = Math.sqrt(player.vel.x ** 2 + player.vel.y ** 2);
  const sprintFracHit = sprintSpeed / (player.playerSpeed || 5.5);
  const hitUnderPressure = effectiveQuality < 0.45 || sprintFracHit > 0.5;
  if (hitUnderPressure && player.ctx._postHitPause <= 0) {
    player.ctx._postHitPause = 0.1 + Math.random() * 0.02;
  }
  player._lastShotWhileRunning = sprintFracHit > 0.65;
  const qb = player._qualBreakdown ?? {};
  pushTech(
    gs,
    `[H${_pad(gs.rally, 2)}] ${player.name} \u2502 ${shot.type} \u2502 ${shot.zone} \u2502 ${_fi(shot.power * 3.6)}km/h \u2502 Q:${_pct(effectiveQuality)} \u2502 stam:${_pct(staminaFrac)} \u2502 ${player.atNet ? "REDE" : "BASE"}
     jogador pos(x=${_f2(player.pos.x)}, y=${_f2(player.pos.y)}) vel(x=${_f1(player.vel.x)}, y=${_f1(player.vel.y)})
     contact  timing:${_f2(qb.contactTiming)} prep:${_f2(qb.contactPrep)} bal:${_f2(qb.contactBalance)} fat:${_f2(qb.contactFatigue)} press:${_f2(qb.contactPressure)} spin:${_f2(qb.contactSpin)} vol:${_f2(qb.contactVolley)} \u2192 raw:${_pct(qb.contactQuality)}
              skill[${qb.skillAttr}]\u2192\xD7${_f2(qb.skillFactor)}  ceil:${_pct(qb.positionCeiling)} (depth:${_f2(qb.depthRatio)})  rings r1:${_pct(qb.prepFrac1)} r2:${_pct(qb.prepFrac2)}  final:${_pct(qb.final)}
     bola_av vel(x=${_f2(velBefore.x)}, y=${_f2(velBefore.y)}, z=${_f2(velBefore.z)}) z:${_f2(ball.pos.z)}
     alvo    pos(x=${_f2(shot.targetX)}, y=${_f2(shot.targetY)}) clr:${_f2(shot.netClearance)}m hitH:${_f2(shot.hitHeight)}m
     bola_dp vel(x=${_f2(ball.vel.x)}, y=${_f2(ball.vel.y)}, z=${_f2(ball.vel.z)}) spin(x=${_f1(ball.spin.x)}, z=${_f1(ball.spin.z)})
     press\xE3o oponente ap\xF3s golpe: ${_pct(gs.players[1 - player.id].ctx.rallyPressure)}`
  );
  player.hitCooldown = TIMING.hitCooldown;
  player.swinging = true;
  player.swingTimer = 0;
  const shotMult = SHOT_DECAY_MULT[shot.type] ?? 1;
  const traitStaminaDiv = traitFx.staminaMult > 0 ? traitFx.staminaMult : 1;
  const decayRate = STAMINA.decayPerShot * shotMult * (mods ? mods.staminaDecayMult : 1) * (gs.courtMods?.staminaDecayMult ?? 1) / traitStaminaDiv;
  const prevStam = player.stamina;
  player.stamina = Math.max(0, player.stamina - decayRate);
  if (prevStam > STAMINA.logThreshold && player.stamina <= STAMINA.logThreshold)
    gs.log.push(`\u{1F624} [CANSA\xC7O] ${player.name} (${Math.round(player.stamina * 100)}%)`);
  if (effectiveQuality < 0.28 && gs.rally > 1)
    gs.log.push(`\u{1F3C3} [CORRIDA] ${player.name} bateu em desvantagem (Q:${Math.round(effectiveQuality * 100)}%)`);
  const shotDir = shot.targetX > 0.5 ? 1 : shot.targetX < -0.5 ? -1 : 0;
  if (shotDir !== 0 && shotDir === Math.sign(player.ctx.lastShotX || 0)) {
    player.ctx.consecutiveSameDir = (player.ctx.consecutiveSameDir || 0) + 1;
  } else {
    player.ctx.consecutiveSameDir = 0;
  }
  player.ctx.lastShotX = shot.targetX;
  player.ctx.lastShotType = shot.type;
  player.ctx._lastShotX = shot.targetX;
  if (shot.type in player.stats.byType)
    player.stats.byType[shot.type]++;
  {
    const st = player.stats;
    const t2 = shot.type;
    st.byTypeQSum[t2] = (st.byTypeQSum[t2] ?? 0) + effectiveQuality;
    st.byTypeQCnt[t2] = (st.byTypeQCnt[t2] ?? 0) + 1;
    const shotKmh = Math.round(Math.sqrt(ball.vel.x ** 2 + ball.vel.y ** 2 + ball.vel.z ** 2) * 3.6);
    if (shotKmh > 0) {
      st.byTypeKmhSum[t2] = (st.byTypeKmhSum[t2] ?? 0) + shotKmh;
      st.byTypeKmhCnt[t2] = (st.byTypeKmhCnt[t2] ?? 0) + 1;
    }
  }
  const mishitThreshold = 0.3;
  const mishitChanceZone = 0.5;
  let isMishit = false;
  if (effectiveQuality < mishitThreshold) {
    isMishit = true;
  } else if (effectiveQuality < mishitChanceZone) {
    const mishitChance = (mishitChanceZone - effectiveQuality) / (mishitChanceZone - mishitThreshold) * 0.2;
    isMishit = Math.random() < mishitChance;
  }
  if (isMishit) {
    playSound("MISHIT", { speed: Math.round(Math.sqrt(ball.vel.x ** 2 + ball.vel.y ** 2 + ball.vel.z ** 2) * 3.6) });
  } else {
    playSound("HIT", { speed: Math.round(Math.sqrt(ball.vel.x ** 2 + ball.vel.y ** 2 + ball.vel.z ** 2) * 3.6) });
  }
  const isSignatureHit = !!player._aiTrace?.signatureShotTriggered;
  const signatureLabelVfx = isSignatureHit ? player._aiTrace?.signatureLabel ?? null : null;
  const signatureEmojiVfx = isSignatureHit ? player._aiTrace?.signatureEmoji ?? null : null;
  pushShotVFX(gs, player, shot.type, effectiveQuality, isMishit, isSignatureHit, signatureLabelVfx, signatureEmojiVfx);
  const opp = gs.players[1 - player.id];
  if (LOB_TYPES.has(shot.type)) {
    const oppGoingToNet = opp.atNet || opp.ctx?.courtMode === "TRANSITION";
    if (oppGoingToNet) {
      opp.ctx.lobsReceived++;
      const isNetStyle_lob = ((opp.attrs?.volley ?? opp.attrs?.jogoDeRede ?? 50) + (opp.attrs?.smash ?? opp.attrs?.jogoDeRede ?? 50)) / 2 >= 72 || opp.prefs?.netGame === "HUNTER" || opp.prefs?.netGame === "PROACTIVE";
      const lobThreshold = isNetStyle_lob ? 4 : 3;
      if (opp.ctx.lobsReceived >= lobThreshold) {
        opp.atNet = false;
        opp.ctx.courtMode = "BASE";
        opp.ctx._netApproachedThisPoint = false;
        gs.log.push(`\u{1F3F3} ${opp.name} recua ap\xF3s ${opp.ctx.lobsReceived} lobs`);
      }
    }
  }
  if (shot.type === "SMASH" && player.atNet && player.ctx.lobsReceived > 0) {
    player.ctx.lobsReceived = Math.max(0, player.ctx.lobsReceived - 1);
  }
  updateNetApproachIntent(gs, player, opp, shot, effectiveQuality, isSlowBall);
}
function gameTick(gs, dt) {
  if (gs.gameState === GameState.GAME_OVER || gs.gameState === GameState.POINT_END)
    return;
  gs.stateTimer += dt;
  updateEnvironment(gs, dt);
  if (gs.stateTimer % 3 < dt)
    pruneOldMarks(gs);
  switch (gs.gameState) {
    case GameState.PRE_SERVE:
      tickPreServe(gs, dt);
      break;
    case GameState.SERVING:
      tickServing(gs, dt);
      break;
    case GameState.RALLY:
      tickRally(gs, dt);
      break;
    case GameState.MEDICAL_TIMEOUT:
      tickMTO(gs, dt);
      break;
  }
}
function tickMTO(gs, dt) {
  const mto = gs.mto;
  if (!mto) {
    _startNextPointFromMTO(gs);
    return;
  }
  if (gs.stateTimer < mto.durationSecs)
    return;
  if (!mto.decided) {
    mto.decided = true;
    const injured = gs.players[mto.playerIdx];
    const { canContinue } = decideMTOOutcome(injured, mto.severity, gs);
    mto.canContinue = canContinue;
    if (!canContinue) {
      const winnerIdx = 1 - mto.playerIdx;
      const loser = injured;
      const p0 = gs.players[0], p1 = gs.players[1];
      if (p0.games > 0 || p1.games > 0) {
        p0.setsHistory = [...p0.setsHistory || [], p0.games];
        p1.setsHistory = [...p1.setsHistory || [], p1.games];
      }
      gs.players[winnerIdx].sets = gs.setsToWin ?? 2;
      gs.matchRetirement = {
        playerIdx: mto.playerIdx,
        playerName: loser.name,
        playerId: loser.id,
        injuryType: mto.injuryType,
        severity: mto.severity,
        isTemporary: mto.isTemporary ?? false,
        atSet: gs.players[0].sets + gs.players[1].sets,
        atGame: gs.players[0].games + gs.players[1].games,
        score: `${gs.players[0].sets}-${gs.players[1].sets}`
      };
      if (!gs.inMatchInjuryEvents)
        gs.inMatchInjuryEvents = [];
      gs.inMatchInjuryEvents.push(
        buildInMatchInjuryEvent(loser, mto, gs, "retirement")
      );
      gs.log.push(`\u{1F6AB} [ABANDONO] ${loser.name} n\xE3o retorna \u2014 les\xE3o ${mto.severity}`);
      gs.gameState = GameState.GAME_OVER;
      gs.mto = null;
      return;
    }
    applyInMatchPenalty(injured, mto.injuryType, mto.severity);
    injured._inMatchInjury = {
      injuryType: mto.injuryType,
      severity: mto.severity,
      isTemporary: mto.isTemporary ?? false,
      gamesAfterInjury: 0
    };
    injured._hadInMatchMTO = true;
    if (!injured.injury) {
      injured.injury = {
        type: mto.injuryType,
        grade: mto.severity === "SEVERE" ? 2 : 1,
        slotsRemaining: 0,
        isPlayingThrough: true,
        inMatchActive: true
      };
    } else {
      injured.injury.inMatchActive = true;
    }
    gs.log.push(`\u21A9 [RETORNO] ${injured.name} volta \xE0 quadra (${mto.injuryType}/${mto.severity})`);
  }
  _startNextPointFromMTO(gs);
}
function _startNextPointFromMTO(gs) {
  gs.mto = null;
  gs.rally = 0;
  gs.serveLeft = !gs.serveLeft;
  gs.players[gs.server].faults = 0;
  gs.ball = createBall();
  gs.lastBouncePos = null;
  gs.gameState = GameState.PRE_SERVE;
  gs.stateTimer = 0;
  gs.isFirstBounce = true;
  gs.receiverTouched = false;
  for (const p of gs.players) {
    p.atNet = false;
    {
      const _pAggr = p.attrs?.visaoTatica ?? p.attrs?.agressividade ?? 60;
      const _pNetAvg = ((p.attrs?.volley ?? p.attrs?.jogoDeRede ?? 60) + (p.attrs?.smash ?? p.attrs?.jogoDeRede ?? 60)) / 2;
      const _pOff = 0.2 + _pAggr / 100 * 0.5 + _pNetAvg / 100 * 0.2;
      p.basePos.y = p.side * (COURT.halfL - _pOff);
    }
    p.pos = { ...p.basePos };
    p.vel = v2(0, 0);
    p.stamina = Math.min(1, p.stamina + STAMINA.recoveryPerPoint);
    p._nearMissTimer = 0;
    resetCtx(p);
  }
  gs.players[gs.server].ctx._isServer = true;
  gs.players[gs.receiver].ctx._isServer = false;
  traceStartPoint(gs);
}
function _c01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function _computeScoreImportance(player, gs) {
  const scoreState = _getPointPressureState(gs)[player.id];
  const importance = scoreState.isMatchPoint ? 2 : scoreState.isBreakPoint ? 1.6 : scoreState.isSetPoint ? 1.4 : scoreState.isGamePoint ? 1.2 : 1;
  return {
    importance,
    isGamePoint: scoreState.isGamePoint,
    isBreakPoint: scoreState.isBreakPoint,
    isMatchPoint: scoreState.isMatchPoint,
    isSetPoint: scoreState.isSetPoint
  };
}
function finalizeServeReturnPattern(gs, pd, serverWon, isAce) {
  if (!pd)
    return;
  const server = gs.players[gs.server];
  const receiver = gs.players[gs.receiver];
  const serverMc = server?.ctx?.matchCtx;
  const receiverMc = receiver?.ctx?.matchCtx;
  if (!serverMc || !receiverMc)
    return;
  const serveEntry = [...serverMc.serveHistory || []].reverse().find((e) => e.pointNum === pd.pointNum);
  const returnPlan = receiver?.ctx?._returnPlan ?? null;
  if (serveEntry) {
    serveEntry.outcome = serverWon ? isAce ? "ACE" : "WON" : "LOST";
    serveEntry.won = !!serverWon;
    serveEntry.returnFamily = returnPlan?.family ?? null;
    serveEntry.returnHint = receiver?.ctx?._returnHint ?? null;
    serveEntry.serverWon = !!serverWon;
  }
  const lastReturn = [...receiverMc.returnHistory || []].reverse().find((e) => e.pointNum === pd.pointNum || !e.pointNum);
  if (lastReturn) {
    lastReturn.pointNum = pd.pointNum;
    lastReturn.serverWon = !!serverWon;
    lastReturn.receiverWon = !serverWon;
    lastReturn.serveDir = pd.dir;
    lastReturn.serveType = pd.physType;
  }
  serverMc.servePatternState = computeServePatternState(serverMc, receiverMc, pd.isFirst ? false : true, pd.serveLeft);
  receiverMc.returnReadState = {
    anticipatedDir: serverMc.servePatternState.anticipatedDir,
    punishDir: serverMc.servePatternState.varyFrom,
    openDir: serverMc.servePatternState.counterOpenDir,
    patternPressure: serverMc.servePatternState.patternPressure
  };
}
function buildServeFirstBallPlan(serveData, returnPlan, server) {
  if (!serveData || !returnPlan || !server)
    return null;
  const attrs = server.attrs ?? {};
  const attackSkill = ((attrs.visaoTatica ?? attrs.agressividade ?? 60) + (attrs.controle ?? 60)) / 200;
  const powerSkill = (attrs.potencia ?? attrs.forca ?? 60) / 100;
  const confidence = clamp2(attackSkill * 0.55 + powerSkill * 0.45, 0, 1);
  let motive = "PRESS_OPEN";
  let preferredDir = "OPEN";
  let depthBias = 0.74;
  let shotBias = null;
  let intensityBonus = 0.06;
  let planStrength = 0.38;
  switch (returnPlan.family) {
    case "BLOCK_STRETCH":
    case "CHIP_STRETCH":
      motive = "FINISH_OPEN";
      preferredDir = "OPEN";
      depthBias = 0.8;
      shotBias = powerSkill > 0.68 ? "ACCEL" : "SHORT_ACCEL";
      intensityBonus = 0.14;
      planStrength = 0.78;
      break;
    case "BLOCK_BODY":
    case "RESET_BODY":
      motive = "JAM_BODY";
      preferredDir = "BODY";
      depthBias = 0.73;
      shotBias = powerSkill > 0.64 ? "ACCEL" : "TOPSPIN";
      intensityBonus = 0.08;
      planStrength = 0.62;
      break;
    case "BLOCK_RESET":
      motive = "PRESS_OPEN";
      preferredDir = serveData.dir === "BODY" ? "OPEN" : "SAME";
      depthBias = 0.76;
      shotBias = powerSkill > 0.66 ? "ACCEL" : "TOPSPIN";
      intensityBonus = 0.1;
      planStrength = 0.66;
      break;
    case "CHIP_RESET":
      motive = "DRAG_FORWARD";
      preferredDir = "OPEN";
      depthBias = 0.71;
      shotBias = "TOPSPIN";
      intensityBonus = 0.04;
      planStrength = 0.54;
      break;
    case "COUNTER_UP":
      motive = "BUILD_HEAVY";
      preferredDir = "BODY";
      depthBias = 0.78;
      shotBias = "TOPSPIN";
      intensityBonus = 0.03;
      planStrength = 0.44;
      break;
    case "DRIVE_ATTACK":
      motive = "PRESS_OPEN";
      preferredDir = serveData.dir === "WIDE" ? "SAME" : "OPEN";
      depthBias = 0.77;
      shotBias = "TOPSPIN";
      intensityBonus = 0.02;
      planStrength = 0.34;
      break;
    case "DRIVE_NEUTRAL":
      motive = "BUILD_SPACE";
      preferredDir = "OPEN";
      depthBias = 0.73;
      shotBias = "TOPSPIN";
      intensityBonus = 0;
      planStrength = 0.26;
      break;
    default:
      break;
  }
  if (serveData.physType === "KICK" && returnPlan.family !== "DRIVE_ATTACK") {
    depthBias = Math.max(depthBias, 0.77);
    if (shotBias === "ACCEL" && confidence < 0.72)
      shotBias = "TOPSPIN";
  }
  if (serveData.dir === "BODY" && preferredDir === "OPEN") {
    planStrength += 0.04;
  }
  return {
    active: true,
    motive,
    preferredDir,
    depthBias: clamp2(depthBias, 0.6, 0.86),
    shotBias,
    intensityBonus: clamp2(intensityBonus, -0.02, 0.18),
    planStrength: clamp2(planStrength + confidence * 0.1, 0.2, 0.9),
    expiresRally: 2,
    sourceFamily: returnPlan.family,
    serveDir: serveData.dir,
    servePhysType: serveData.physType
  };
}
function buildReturnRecoveryPlan(serveData, returnPlan) {
  if (!serveData || !returnPlan)
    return null;
  const family = returnPlan.family;
  const isSoftReset = family === "BLOCK_RESET" || family === "CHIP_RESET" || family === "BLOCK_STRETCH" || family === "CHIP_STRETCH" || family === "RESET_BODY";
  if (!isSoftReset)
    return null;
  return {
    active: true,
    motive: "NEUTRALIZE",
    preferredDir: serveData.dir === "BODY" ? "BODY" : "CENTRE",
    depthBias: family.includes("STRETCH") ? 0.79 : 0.76,
    shotBias: family.includes("CHIP") ? "SLICE" : "TOPSPIN",
    intensityBonus: -0.06,
    planStrength: family.includes("STRETCH") ? 0.68 : 0.52,
    expiresRally: 2,
    sourceFamily: family
  };
}
function serveHistoryProbs(mc, isSec, serverAttrs = {}, tacticalState = null) {
  const hist = (mc?.serveHistory || []).filter((h) => h.isSec === isSec);
  const saqPct = (serverAttrs.saqueForca ?? serverAttrs.saque ?? 60) / 100;
  const agPct = (serverAttrs.visaoTatica ?? serverAttrs.agressividade ?? 60) / 100;
  const netGame = serverAttrs.netGame ?? "RELUCTANT";
  const wideBase = 0.22 + saqPct * 0.14 + agPct * 0.08;
  const tBase = netGame === "HUNTER" || netGame === "PROACTIVE" ? 0.38 + saqPct * 0.1 : 0.3 + (1 - agPct) * 0.1;
  const bodyBase = Math.max(0.15, 1 - wideBase - tBase);
  const total = wideBase + tBase + bodyBase;
  const prior = {
    WIDE: wideBase / total,
    T: tBase / total,
    BODY: bodyBase / total
  };
  if (hist.length < 3)
    return prior;
  const counts = { WIDE: 0, T: 0, BODY: 0 };
  hist.forEach((h, i) => {
    const weight = Math.pow(0.82, hist.length - 1 - i);
    counts[h.dir] = (counts[h.dir] || 0) + weight;
  });
  const histTotal = Object.values(counts).reduce((a, b) => a + b, 1e-3);
  const empirical = { WIDE: counts.WIDE / histTotal, T: counts.T / histTotal, BODY: counts.BODY / histTotal };
  const blend = 0.6;
  const probs = {
    WIDE: blend * empirical.WIDE + (1 - blend) * prior.WIDE,
    T: blend * empirical.T + (1 - blend) * prior.T,
    BODY: blend * empirical.BODY + (1 - blend) * prior.BODY
  };
  if (tacticalState?.anticipatedDir && probs[tacticalState.anticipatedDir] != null) {
    probs[tacticalState.anticipatedDir] += 0.08 + (tacticalState.patternPressure ?? 0) * 0.06;
    const sum2 = probs.WIDE + probs.T + probs.BODY;
    probs.WIDE /= sum2;
    probs.T /= sum2;
    probs.BODY /= sum2;
  }
  return probs;
}
function generateReturnPosCands(isSec, sl) {
  const laterals = [
    { rxBias: 0, tag: "CENTER" },
    { rxBias: -0.6, tag: "SHIFT_WIDE" },
    // drift wide (cover wide serve)
    { rxBias: 0.5, tag: "SHIFT_T" }
    // drift toward T
  ];
  const depths = [
    { ryBias: 0, tag: "NORMAL" },
    { ryBias: 1, tag: "STEP_IN" },
    // metres forward (into court)
    { ryBias: -0.8, tag: "STEP_BACK" }
    // metres backward
  ];
  const cands = [];
  laterals.forEach((l) => depths.forEach((d) => {
    cands.push({ rxBias: l.rxBias, ryBias: d.ryBias, tags: [l.tag, d.tag] });
  }));
  return cands;
}
function scoreReturnPosCand(rc, rCtx) {
  const probs = rCtx.serveProbs;
  const anticipatedDir = rCtx.tacticalRead?.anticipatedDir ?? null;
  const openDir = rCtx.tacticalRead?.openDir ?? null;
  const patternPressure = rCtx.tacticalRead?.patternPressure ?? 0;
  let coverage = 0;
  const isShiftT = rc.tags.includes("SHIFT_T");
  const isShiftWide = rc.tags.includes("SHIFT_WIDE");
  const isCenter = rc.tags.includes("CENTER");
  const isStepIn = rc.tags.includes("STEP_IN");
  const isStepBack = rc.tags.includes("STEP_BACK");
  if (isCenter)
    coverage = (probs.T + probs.BODY) * 0.55 + probs.WIDE * 0.35;
  if (isShiftT)
    coverage = probs.T * 0.75 + probs.BODY * 0.6 + probs.WIDE * 0.12;
  if (isShiftWide)
    coverage = probs.WIDE * 0.72 + probs.T * 0.22 + probs.BODY * 0.18;
  if (anticipatedDir === "T" && isShiftT)
    coverage += 0.12 + patternPressure * 0.08;
  if (anticipatedDir === "BODY" && isCenter)
    coverage += 0.11 + patternPressure * 0.06;
  if (anticipatedDir === "WIDE" && isShiftWide)
    coverage += 0.12 + patternPressure * 0.08;
  if (openDir === "WIDE" && isShiftT)
    coverage -= 0.04;
  if (openDir === "BODY" && isShiftWide)
    coverage -= 0.04;
  let attack = 0;
  if (rCtx.isSec && isStepIn)
    attack = 0.35 * rCtx.returnAggroMode;
  if (!rCtx.isSec && isStepIn)
    attack = -0.1;
  let risk = 0;
  if (isStepIn && !rCtx.isSec && rCtx.serverPower > 0.72)
    risk = -0.22;
  if (isStepBack && rCtx.isSec)
    risk = -0.1;
  const EV = _c01(coverage + attack + risk);
  return { rc, EV };
}
function evPickReturnPos(rv, sv, gs) {
  const mc = sv.ctx.matchCtx;
  const rvMc = rv.ctx.matchCtx;
  const isSec = sv.faults === 1;
  const sl = gs.serveLeft;
  const tacticalRead = computeServePatternState(mc, rvMc, isSec, sl);
  const serveProbs = serveHistoryProbs(mc, isSec, { ...sv.attrs ?? {}, netGame: sv.prefs?.netGame }, tacticalRead);
  const returnAggro = rvMc.returnAggroMode || 0;
  const _svSaqPct = (sv.attrs?.saqueForca ?? sv.attrs?.saque ?? 60) / 100;
  const serverPower = 0.68 + _svSaqPct * 0.28;
  const rCtx = { isSec, serveProbs, returnAggroMode: returnAggro, serverPower, tacticalRead };
  const cands = generateReturnPosCands(isSec, sl);
  const scored = cands.map((rc) => scoreReturnPosCand(rc, rCtx));
  rvMc.returnReadState = {
    anticipatedDir: tacticalRead.anticipatedDir,
    openDir: tacticalRead.counterOpenDir,
    patternPressure: tacticalRead.patternPressure
  };
  const temp = isSec ? 0.22 : 0.18;
  const maxEV = Math.max(...scored.map((s) => s.EV));
  const exps = scored.map((s) => Math.exp((s.EV - maxEV) / temp));
  const sumE = exps.reduce((a, b) => a + b, 0);
  let r = Math.random() * sumE;
  for (let i = 0; i < scored.length; i++) {
    r -= exps[i];
    if (r <= 0)
      return scored[i].rc;
  }
  return scored[scored.length - 1].rc;
}
function classifyServeForReturnV2(ball, quality, sv, rv) {
  const serveData = sv?._pendingServeData ?? null;
  const spd3d = Math.sqrt(ball.vel.x ** 2 + ball.vel.y ** 2 + ball.vel.z ** 2);
  const kmh = serveData?.kmh ?? ball._serveExitKmh ?? spd3d * 3.6;
  const physType = serveData?.physType ?? "FLAT";
  const dir = serveData?.dir ?? "T";
  const isHigh = ball.pos.z > 1.1;
  const isFast = kmh > 175;
  const isVFast = kmh > 200;
  const isSlow = kmh < 135;
  const isAttackable2nd = sv?.faults === 1 && kmh < 160;
  const latGap = Math.abs((ball?.pos?.x ?? 0) - (rv?.pos?.x ?? 0));
  const stretch = latGap > 1.55 || dir === "WIDE" && latGap > 1.15;
  const jammed = dir === "BODY" && latGap < 0.7;
  let kind = "NEUTRAL";
  if (quality < 0.35 || isVFast && isHigh || isFast && quality >= 0.55 || stretch)
    kind = "HARD";
  else if (quality >= 0.68 && (isAttackable2nd || isSlow && !isHigh))
    kind = "EASY";
  return { kind, kmh, physType, dir, isHigh, isFast, isVFast, isSlow, isAttackable2nd, stretch, jammed, quality };
}
function computeReturnIntent(rv, sv, ball, quality, gsRally) {
  if (gsRally !== 0)
    return;
  const serveInfo = classifyServeForReturnV2(ball, quality, sv, rv);
  const rvMc = rv.ctx.matchCtx;
  const serveIntent = sv.ctx.matchCtx.serveIntent || "SAFE";
  const attrs = rv.attrs ?? {};
  const retSkill = (attrs.devolucao ?? 60) / 100;
  const control = (attrs.controle ?? 60) / 100;
  const read = (attrs.leitura ?? 60) / 100;
  const aggr = (attrs.visaoTatica ?? attrs.agressividade ?? 60) / 100;
  const touch = ((attrs.slice ?? 60) + (attrs.maos ?? attrs.controle ?? 60)) / 200;
  const canDrive = retSkill > 0.72 && control > 0.64;
  const canChip = touch > 0.62;
  let family = "RESET";
  if (serveInfo.stretch)
    family = canChip ? "CHIP_STRETCH" : "BLOCK_STRETCH";
  else if (serveInfo.jammed)
    family = control > 0.62 ? "BLOCK_BODY" : "RESET_BODY";
  else if (serveInfo.kind === "EASY" && canDrive && aggr > 0.56)
    family = "DRIVE_ATTACK";
  else if (serveInfo.kind === "HARD" && canChip && (serveInfo.physType === "SLICE" || serveInfo.isHigh))
    family = "CHIP_RESET";
  else if (serveInfo.kind === "HARD")
    family = "BLOCK_RESET";
  else if (serveInfo.kind === "NEUTRAL" && serveInfo.physType === "KICK" && canDrive && read > 0.66)
    family = "COUNTER_UP";
  else if (serveInfo.kind === "NEUTRAL" && serveInfo.dir === "BODY")
    family = "BLOCK_BODY";
  else if (serveInfo.kind === "NEUTRAL" && canDrive && aggr > 0.62 && serveInfo.kmh < 170)
    family = "DRIVE_NEUTRAL";
  let aggroBoost = 0;
  if (serveInfo.kind === "EASY")
    aggroBoost = 0.3;
  if (serveInfo.kind === "HARD")
    aggroBoost = -0.25;
  if (serveIntent === "OPEN")
    aggroBoost -= 0.1;
  if (serveIntent === "JAM")
    aggroBoost += 0.15;
  if (family === "DRIVE_ATTACK" || family === "DRIVE_NEUTRAL" || family === "COUNTER_UP")
    aggroBoost += 0.16;
  if (family === "CHIP_STRETCH" || family === "CHIP_RESET")
    aggroBoost -= 0.06;
  if (family === "BLOCK_RESET" || family === "RESET_BODY")
    aggroBoost -= 0.12;
  rvMc.returnAggroMode = _c01((rvMc.returnAggroMode || 0) * 0.75 + _c01(0.5 + aggroBoost) * 0.25);
  const returnHint = serveInfo.kind === "EASY" ? "attack" : serveInfo.kind === "HARD" ? "defend" : serveIntent === "OPEN" ? "neutralize" : "neutralize";
  rv.ctx._returnHint = returnHint;
  rv.ctx._returnPlan = {
    family,
    serveKind: serveInfo.kind,
    serveDir: serveInfo.dir,
    servePhysType: serveInfo.physType,
    aggression: _c01(0.5 + aggroBoost),
    stretch: serveInfo.stretch,
    jammed: serveInfo.jammed
  };
  const servePointData = sv?._pendingServeData ?? null;
  sv.ctx._servePatternPlan = buildServeFirstBallPlan(servePointData, rv.ctx._returnPlan, sv);
  rv.ctx._returnRecoveryPlan = buildReturnRecoveryPlan(servePointData, rv.ctx._returnPlan);
  rvMc.returnHistory = rvMc.returnHistory || [];
  rvMc.returnHistory.push({
    hint: returnHint,
    family,
    quality,
    serveDir: serveInfo.dir,
    serveType: serveInfo.physType,
    pointNum: sv?._pendingServeData?.pointNum ?? null
  });
  if (rvMc.returnHistory.length > 6)
    rvMc.returnHistory.shift();
}
function tickPreServe(gs, dt) {
  const sv = gs.players[gs.server], rv = gs.players[gs.receiver], ball = gs.ball;
  sv._pendingServeData = null;
  sv.ctx._servePatternPlan = null;
  rv.ctx._returnRecoveryPlan = null;
  rv.ctx._returnPlan = null;
  rv.ctx._returnHint = null;
  const sx = gs.serveLeft ? -1.5 : 1.5;
  const rvBaseY = rv.side * (COURT.halfL + 2);
  sv.pos.x += (sx - sv.pos.x) * 0.15;
  sv.pos.y += (sv.side * (COURT.halfL + 0.5) - sv.pos.y) * 0.12;
  if (gs.stateTimer < 0.05 || !gs._rvPosTarget) {
    const rc = evPickReturnPos(rv, sv, gs);
    const baseX = gs.serveLeft ? COURT.singlesW * 0.22 : -COURT.singlesW * 0.22;
    const biasSign = gs.serveLeft ? -1 : 1;
    gs._rvPosTarget = {
      x: baseX + biasSign * rc.rxBias,
      y: rvBaseY + rv.side * rc.ryBias,
      // ryBias>0 = step in (toward net)
      tags: rc.tags
    };
    if (typeof window !== "undefined" && window.EV_DEBUG) {
      console.log(`[RPOS] ${rv.name} \u2192 [${rc.tags.join("+")}] rx:${rc.rxBias.toFixed(1)} ry:${rc.ryBias.toFixed(1)} isSec:${sv.faults === 1}`);
    }
  }
  const rvTargetX = clamp2(gs._rvPosTarget.x, -COURT.singlesW / 2 + 0.2, COURT.singlesW / 2 - 0.2);
  const rvTargetY = clamp2(gs._rvPosTarget.y, rv.side > 0 ? COURT.halfL + 0.5 : -(COURT.halfL + 4), rv.side > 0 ? COURT.halfL + 4 : -(COURT.halfL + 0.5));
  rv.pos.x += (rvTargetX - rv.pos.x) * 0.1;
  rv.pos.y += (rvTargetY - rv.pos.y) * 0.12;
  ball.pos.x = sv.pos.x;
  ball.pos.y = sv.pos.y;
  ball.pos.z = 0.8;
  if (gs.stateTimer > TIMING.preServeDelay) {
    gs._rvPosTarget = null;
    gs.gameState = GameState.SERVING;
    gs.stateTimer = 0;
  }
}
function tickServing(gs, dt) {
  if (gs.stateTimer <= TIMING.serveWindup)
    return;
  const sv = gs.players[gs.server], ball = gs.ball, sStyle = sv.styleData;
  const rv = gs.players[gs.receiver];
  const isSec = sv.faults === 1;
  const sl = gs.serveLeft;
  const scoreState = _getPointPressureState(gs);
  const isBreakPoint = scoreState[gs.receiver].isBreakPoint;
  gs.lastServeFirst = !isSec;
  gs.receiverTouched = false;
  const serveExec = executeServe(ball, sv, rv, {
    isSecondServe: isSec,
    serveLeft: sl,
    isBreakPoint,
    courtServeBonus: gs.courtMods?.serveBonus ?? 0,
    surface: gs.courtMeta?.surface ?? "HARD",
    traitFx: getUnifiedPlayerTraitFx(sv, gs),
    pointNum: gs.totalPoints + 1
  });
  const serveMeta = serveExec.serve;
  const evPick = serveExec.ev.picked;
  const evSCtx = serveExec.ev.context;
  const evScored = serveExec.ev.scored;
  const physType = serveMeta.physType;
  const svcName = serveMeta.name;
  const tgtName = serveMeta.dir;
  const _SERVE_SIG_KEYS = /* @__PURE__ */ new Set([
    "SERVE_FLAT_BOMB",
    "SERVE_KICK_HIGH",
    "SERVE_SLICE_WIDE",
    "SERVE_JAM_BODY",
    "SERVE_T_LASER"
  ]);
  const isSignatureServe = !isSec && !!sv.naturalSignature && _SERVE_SIG_KEYS.has(sv.naturalSignature);
  if (!isSec)
    sv.stats.serve1Total++;
  else
    sv.stats.serve2Total++;
  ball.lastHitBy = gs.server;
  sv.shotCount++;
  gs.log.push(`\u{1F3BE} [${sStyle.abbr}] ${isSec ? "2\xBA" : "1\xBA"} SAQUE ${svcName} \xB7 ${serveMeta.kmh}km/h \u2192 ${tgtName}`);
  gs._pendingServeData = {
    isFirst: serveMeta.isFirst,
    isSecond: serveMeta.isSecond,
    serveId: serveMeta.id,
    plannedDir: serveMeta.plannedDir,
    intent: serveMeta.intent,
    kmh: serveMeta.kmh,
    physType,
    dir: tgtName,
    netClearance: serveMeta.netClearance,
    spinX: serveMeta.spinX,
    spinZ: serveMeta.spinZ,
    serveSQ: serveMeta.serveSQ,
    sigmaX: serveMeta.sigmaX,
    targetX: serveMeta.targetX,
    targetY: serveMeta.targetY,
    bounceProfile: serveMeta.bounceProfile,
    faultMode: serveMeta.faultMode,
    serveLeft: sl,
    pointNum: serveMeta.pointNum ?? gs.totalPoints + 1
  };
  sv._pendingServeData = gs._pendingServeData;
  if (sv.ctx.matchCtx) {
    const absXServe = Math.abs(serveMeta.targetX ?? 0);
    if (absXServe < 0.8)
      sv.ctx.matchCtx.serveDir = "BODY";
    else if (sl)
      sv.ctx.matchCtx.serveDir = "RIGHT";
    else
      sv.ctx.matchCtx.serveDir = "LEFT";
    sv.ctx.matchCtx.serveN = (sv.ctx.matchCtx.serveN || 0) + 1;
    sv.ctx.matchCtx.serveIntent = serveMeta.intent;
    sv.ctx.matchCtx.servePhys = physType;
    pushServeHistory(sv.ctx.matchCtx, {
      dir: serveMeta.plannedDir ?? evPick?.c?.dir ?? tgtName,
      physType,
      isSec,
      serveLeft: sl,
      pointNum: serveMeta.pointNum ?? gs.totalPoints + 1,
      outcome: serveMeta.faultMode ? "FAULT" : "IN"
    });
    if (serveMeta.faultMode) {
      sv.ctx.matchCtx.recentFaults = Math.min(4, (sv.ctx.matchCtx.recentFaults || 0) + 1);
      if (!isSec)
        sv.ctx.matchCtx.serve1InStreak = 0;
    } else {
      if (!isSec)
        sv.ctx.matchCtx.serve1InStreak = (sv.ctx.matchCtx.serve1InStreak || 0) + 1;
      sv.ctx.matchCtx.recentFaults = 0;
    }
    if (typeof window !== "undefined" && window.EV_DEBUG) {
      const top2 = [...evScored].sort((a, b) => b.EV - a.EV).slice(0, 2);
      console.log(`[SV-EV] ${sv.name} ${isSec ? "2nd" : "1st"} | recv:[x:${_f2(rv.pos.x)} ${evSCtx.rvIsWide ? "WIDE" : evSCtx.rvIsInside ? "IN" : "MID"}] | intent:${serveMeta.intent}`);
      top2.forEach((s, i) => {
        const ch = s === evPick ? "\u2605" : ` ${i + 1}`;
        console.log(`  ${ch} ${(s.c.id ?? "?").padEnd(12)} dir:${(s.c.dir ?? "?").padEnd(5)} EV:${s.EV.toFixed(3)} [P:${s.sub.pressure.toFixed(2)} R:${s.sub.reward.toFixed(2)} S:${s.sub.safety.toFixed(2)} V:${s.sub.pattern.toFixed(2)}]`);
      });
    }
  }
  pushTech(
    gs,
    `[SQ] ${isSec ? "2\xBA" : "1\xBA"} SAQUE \u2502 ${sv.name} \u2502 ${svcName} \u2502 ${serveMeta.kmh}km/h \u2502 alvo:${tgtName} \u2502 plan:${serveMeta.plannedDir} \u2502 intent:${sv.ctx.matchCtx?.serveIntent || "?"} \u2502 falta:${sv.faults} \u2502 serveSQ:${serveMeta.serveSQ.toFixed(2)} \u2502 \u03C3X:${serveMeta.sigmaX.toFixed(3)}m${serveMeta.faultMode ? ` \u2502 fault:${serveMeta.faultMode}` : ""}
     servidor  pos(x=${_f2(sv.pos.x)}, y=${_f2(sv.pos.y)})
     receptor  pos(x=${_f2(rv.pos.x)}, y=${_f2(rv.pos.y)}) [${evSCtx.rvIsWide ? "WIDE" : evSCtx.rvIsInside ? "INSIDE" : "MID"}]
     alvo      pos(x=${_f2(serveMeta.targetX)}, y=${_f2(serveMeta.targetY)})  clr:${_f2(serveMeta.netClearance)}m
     bola vel  (x=${_f2(ball.vel.x)}, y=${_f2(ball.vel.y)}, z=${_f2(ball.vel.z)})
     bola spin (x=${_f1(ball.spin.x)}, z=${_f1(ball.spin.z)})
     bounce    fric:${_f2(serveMeta.bounceProfile?.friction ?? 1)} vert:${_f2(serveMeta.bounceProfile?.vertical ?? 1)} side:${_f2(serveMeta.bounceProfile?.side ?? 0)} dead:${serveMeta.bounceProfile?.deadBall ? "yes" : "no"}`
  );
  playSound("HIT", { speed: Math.round(Math.sqrt(ball.vel.x ** 2 + ball.vel.y ** 2 + ball.vel.z ** 2) * 3.6) });
  pushShotVFX(gs, sv, svcName, isSec ? 0.55 : 0.92, false, isSignatureServe);
  gs.gameState = GameState.RALLY;
  gs.stateTimer = 0;
  gs.serveBounced = false;
  gs.isFirstBounce = true;
}
function tickRally(gs, dt) {
  if (gs.courtPhysics && gs.environment) {
    gs.courtPhysics.humidityFriction = gs.environment.humidityFrictionAdd ?? 0;
  }
  stepPhysics(gs, dt);
  if (gs.gameState !== GameState.RALLY)
    return;
  for (const p of gs.players) {
    if (p.hitCooldown > 0)
      p.hitCooldown -= dt;
    if (p._nearMissTimer > 0)
      p._nearMissTimer -= dt;
    if (p.swinging) {
      p.swingTimer += dt;
      if (p.swingTimer >= TIMING.swingDuration) {
        p.swinging = false;
        p.swingTimer = 0;
      }
    }
    updatePlayerMovement(p, gs, dt);
    p._heatTick = p._heatTick + 1 & 7;
    if (p._heatTick === 0) {
      const COLS = 12, ROWS = 16;
      const col = Math.floor((p.pos.x + 4.115) / (8.23 / COLS));
      const row = Math.floor(Math.abs(p.pos.y) / (11.885 / ROWS));
      const ci = Math.max(0, Math.min(COLS - 1, col));
      const ri = Math.max(0, Math.min(ROWS - 1, row));
      if (p._heatGrid[ri * COLS + ci] < 65535)
        p._heatGrid[ri * COLS + ci]++;
    }
    const ball = gs.ball;
    const ballOnMySide = Math.sign(ball.pos.y) === p.side || Math.abs(ball.pos.y) < 0.5;
    const ballBounced = ball.bounceCount >= 1;
    const dToBall = Math.sqrt((p.pos.x - ball.pos.x) ** 2 + (p.pos.y - ball.pos.y) ** 2);
    const prepReach = 10;
    const spd = Math.sqrt(p.vel.x ** 2 + p.vel.y ** 2);
    const maxSpd = p.playerSpeed ?? PLAYER_CFG.speed;
    const isStopped = spd < maxSpd * 0.08;
    const isWalking = spd < maxSpd * 0.45;
    const isJogging = spd < maxSpd * 0.72;
    const inPrepZone = ballOnMySide && ballBounced && dToBall < prepReach && ball.lastHitBy !== p.id;
    if (inPrepZone) {
      if (!p._approachInitialized) {
        p._approachInitialized = true;
      }
      const distFactor = Math.pow(1 - Math.min(1, dToBall / prepReach), 1.8);
      let rate;
      if (isStopped) {
        rate = 0.4 + distFactor * 2;
      } else if (isWalking) {
        rate = 0.1 + distFactor * 0.9;
      } else if (isJogging) {
        rate = 0.04 + distFactor * 0.4;
      } else {
        rate = distFactor * 0.12;
      }
      const ballSpd2D = Math.sqrt(ball.vel.x ** 2 + ball.vel.y ** 2);
      const ballSpdFactor = clamp2(1 - (ballSpd2D - 12) / 30, 0.25, 1);
      p._prepTime = (p._prepTime ?? 0) + dt * rate * ballSpdFactor;
    } else if (!ballOnMySide || ball.lastHitBy === p.id) {
      p._prepTime = 0;
      p._approachInitialized = false;
    } else {
      p._prepTime = Math.max(0, (p._prepTime ?? 0) - dt * 1.5);
    }
    const _isVolleyShot = !p.atNet ? p._volleyType === "position" || p._volleyType === "emergency" : true;
    let PREP1, PREP2;
    if (_isVolleyShot && p.mods) {
      const reflexoFactor = clamp2((p.mods.reflexoQualBonus ?? 0) / 0.15, 0, 1);
      const instintoFactor = ((p.attrs?.jogoDeRede ?? p.attrs?.instintoRede ?? 50) - 50) / 50;
      const instintoNorm = Math.max(0, instintoFactor);
      const prep1Reduction = clamp2(reflexoFactor * 0.7, 0, 0.7);
      const prep2Reduction = clamp2(instintoNorm * 0.65, 0, 0.65);
      PREP1 = 0.55 * (1 - prep1Reduction);
      PREP2 = 0.9 * (1 - prep2Reduction);
    } else {
      PREP1 = 0.55;
      PREP2 = 0.9;
    }
    p._prepFrac1 = Math.min(1, (p._prepTime ?? 0) / PREP1);
    p._prepFrac2 = Math.min(1, Math.max(0, ((p._prepTime ?? 0) - PREP1) / PREP2));
    const staminaTimingPenalty = clamp2(1 + (1 - (p.stamina ?? 1)) * 0.3, 1, 1.3);
    p._prepFrac1 = Math.min(1, (p._prepTime ?? 0) / (PREP1 * staminaTimingPenalty));
    p._prepFrac2 = Math.min(1, Math.max(0, ((p._prepTime ?? 0) - PREP1) / (PREP2 * staminaTimingPenalty)));
  }
  for (const p of gs.players) {
    tryHit(p, gs);
    if (gs.gameState !== GameState.RALLY)
      return;
  }
  if (gs.isFirstBounce && gs.ball.lastHitBy === gs.server && gs.ball._lipNet) {
    gs.ball._serveNetTouched = true;
    gs.ball._lipNet = false;
  }
  if (checkNetCollision(gs.ball)) {
    resolveNet(gs);
    return;
  }
  if (gs.gameState !== GameState.RALLY)
    return;
  if (checkOutOfBounds(gs.ball) && gs.ball.pos.z < 0.5) {
    resolveOutOfBounds(gs);
    return;
  }
  if (gs.gameState !== GameState.RALLY)
    return;
  if (!gs.ball.inFlight && mag3(gs.ball.vel) < THRESHOLDS.ballStopSpeed) {
    resolveBallStopped(gs);
    return;
  }
}
function getNetProfile(player) {
  const key = player?.prefs?.netGame ?? "RELUCTANT";
  let profile;
  switch (key) {
    case "HUNTER":
      profile = {
        base: 0.1,
        carry: 0.72,
        weakReturn: 0.34,
        shortBall: 0.28,
        slowBall: 0.16,
        pressure: 0.12,
        neutral: 0.08,
        threshold: 0.5,
        minQ: 0.42,
        maxBehind: 1.7,
        oppDepth: 0.46,
        cooldown: 2,
        fitFloor: 0.26
      };
      break;
    case "PROACTIVE":
      profile = {
        base: 0.06,
        carry: 0.68,
        weakReturn: 0.24,
        shortBall: 0.22,
        slowBall: 0.12,
        pressure: 0.1,
        neutral: 0.04,
        threshold: 0.56,
        minQ: 0.46,
        maxBehind: 1.4,
        oppDepth: 0.54,
        cooldown: 2,
        fitFloor: 0.3
      };
      break;
    case "OPPORTUNIST":
      profile = {
        base: 0.02,
        carry: 0.58,
        weakReturn: 0.12,
        shortBall: 0.18,
        slowBall: 0.1,
        pressure: 0.04,
        neutral: 0,
        threshold: 0.66,
        minQ: 0.52,
        maxBehind: 0.9,
        oppDepth: 0.6,
        cooldown: 3,
        fitFloor: 0.38
      };
      break;
    case "RELUCTANT":
      profile = {
        base: 0,
        carry: 0.46,
        weakReturn: 0.04,
        shortBall: 0.12,
        slowBall: 0.06,
        pressure: 0,
        neutral: 0,
        threshold: 0.76,
        minQ: 0.6,
        maxBehind: 0.5,
        oppDepth: 0.68,
        cooldown: 4,
        fitFloor: 0.45
      };
      break;
    default:
      profile = {
        base: 0,
        carry: 0.35,
        weakReturn: 0,
        shortBall: 0.04,
        slowBall: 0.02,
        pressure: 0,
        neutral: 0,
        threshold: 0.95,
        minQ: 0.75,
        maxBehind: 0.1,
        oppDepth: 0.82,
        cooldown: 5,
        fitFloor: 0.55
      };
  }
  const netTransitionMult = clamp2(player?.mods?.netApproachMult ?? 1.2, 0.8, 1.7);
  const carryShift = (netTransitionMult - 1.2) * 0.1;
  const thresholdShift = (1.2 - netTransitionMult) * 0.16;
  const minQShift = (1.18 - netTransitionMult) * 0.07;
  const fitShift = (1.16 - netTransitionMult) * 0.1;
  return {
    ...profile,
    carry: clamp2(profile.carry + carryShift, 0.3, 0.82),
    threshold: clamp2(profile.threshold + thresholdShift, 0.42, 0.98),
    minQ: clamp2(profile.minQ + minQShift, 0.38, 0.8),
    fitFloor: clamp2(profile.fitFloor + fitShift, 0.18, 0.6)
  };
}
function updateNetApproachIntent(gs, player, opp, shot, effectiveQuality, isSlowBall) {
  const ctx2 = player?.ctx;
  if (!ctx2 || !shot)
    return;
  const profile = getNetProfile(player);
  if ((ctx2.transitionCooldown ?? 0) > 0)
    ctx2.transitionCooldown--;
  if (player.atNet || ctx2.courtMode === "TRANSITION" || ctx2.courtMode === "NET") {
    ctx2.netIntent = 0;
    ctx2.netIntentSource = null;
    return;
  }
  const netInclined = player.prefs?.netGame === "HUNTER" || player.prefs?.netGame === "PROACTIVE";
  const lobSuppressThreshold = netInclined ? 4 : 3;
  const netSuppressed = (ctx2.lobsReceived ?? 0) >= lobSuppressThreshold;
  if (netSuppressed) {
    ctx2.netIntent = clamp2((ctx2.netIntent ?? 0) * 0.25, 0, 1);
    ctx2.netIntentSource = "suppressed";
    return;
  }
  const oppDepth = Math.abs(opp?.pos?.y ?? 0) / COURT.halfL;
  const playerBehindBaseline = Math.max(0, Math.abs(player.pos.y) - COURT.halfL);
  const playerInside = Math.abs(player.pos.y) <= COURT.halfL + profile.maxBehind;
  const playerDefending = effectiveQuality < 0.34 || (ctx2.rallyPressure ?? 0) > 0.78 || playerBehindBaseline > profile.maxBehind + 0.35;
  const weakReturnBoost = clamp2(ctx2._weakReturnBoost ?? 0, 0, 1);
  const currentIntent = ctx2.currentIntent ?? "BUILD";
  const shotFit = clamp2(shot._approachFit ?? shot._approachIntent ?? 0, 0, 1);
  const attacking = currentIntent === "FINISH" || currentIntent === "PRESSURE";
  const oppPlayedShort = opp?.ctx?.lastShotType === "DROP" || opp?.ctx?.lastShotType === "SLICE_SHORT" || (opp?.ctx?._returnHint ?? null) === "defend" && gs.rally <= 1;
  let gain = profile.base;
  let source = "neutral";
  if (weakReturnBoost > 0.12) {
    gain += profile.weakReturn * (0.55 + weakReturnBoost);
    source = "weak_return";
  }
  if (oppPlayedShort) {
    gain += profile.shortBall;
    source = "short_ball";
  }
  if (isSlowBall) {
    gain += profile.slowBall;
    if (source === "neutral")
      source = "slow_ball";
  }
  if (attacking) {
    gain += profile.pressure;
    if (source === "neutral")
      source = "pressure";
  }
  if (shotFit > 0.25 && effectiveQuality > 0.52) {
    gain += shotFit * 0.18;
  }
  if (!oppPlayedShort && !isSlowBall && attacking && effectiveQuality > 0.6) {
    gain += profile.neutral;
  }
  if (playerDefending) {
    gain *= 0.15;
  }
  ctx2.netIntent = clamp2((ctx2.netIntent ?? 0) * profile.carry + gain, 0, 1);
  ctx2.netIntentSource = source;
  const clearWindow = oppPlayedShort || isSlowBall || weakReturnBoost > 0.16 || oppDepth > profile.oppDepth;
  const readyToTransition = playerInside && !playerDefending && effectiveQuality >= profile.minQ && shotFit >= profile.fitFloor && clearWindow;
  if (!player.atNet && ctx2.courtMode === "BASE" && (ctx2.transitionCooldown ?? 0) <= 0 && readyToTransition && (ctx2.netIntent ?? 0) >= profile.threshold) {
    player.atNet = false;
    ctx2._netApproachedThisPoint = true;
    ctx2.courtMode = "TRANSITION";
    ctx2.transitionCooldown = profile.cooldown;
    ctx2.netIntent = Math.max(0.18, (ctx2.netIntent ?? 0) * 0.45);
    ctx2._approachLandX = shot.targetX ?? 0;
    player.stats.netApproaches++;
    const reason = source === "weak_return" ? " (saque + resposta fraca)" : source === "short_ball" ? " (bola curta)" : source === "slow_ball" ? " (bola lenta)" : source === "pressure" ? " (press\xE3o constru\xEDda)" : "";
    gs.log.push(`\u{1F4E1} [${player.styleData?.abbr ?? "NET"}] ${player.name} sobe \xE0 rede${reason}`);
  }
}
export {
  computeCrowdPressure,
  createBall,
  createPlayer,
  createStats,
  gameTick,
  initGameState,
  onBounce,
  resolvePoint,
  tryHit
};
/*! Bundled license information:

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/

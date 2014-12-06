(function (root, factory) {

    'use strict';

    // check for jquery
    try {
        if (typeof jQuery !== 'function') {
            throw 'jQuery is required for using transit.js';
        }
        
        if (typeof define === 'function' && define.amd) {
            // AMD. Register as an anonymous module.
            define(['jQuery'], function () {
                return (root.returnExportsGlobal = factory());
            });
        } else if (typeof exports === 'object') {
            // Node. Does not work with strict CommonJS, but
            // only CommonJS-like environments that support module.exports,
            // like Node.
            module.exports = factory(jQuery);
        } else {
            // Browser globals
            root.transit = factory(jQuery);
        }
        
    } catch (e) {
        console.error(e);
    }

}(this, function ($) {
    'use strict';

    // transit scope data container
    var TRANSIT = {
        counter: 0,
        singleton: {}
    };


    var vendorPrefix, transit, transitionStyle;


    // -----------------------------------------
    // VENDOR PREFIX ---------------------------
    // -----------------------------------------

    vendorPrefix = function () {

        // common vendors prefix
        this.browserPrefix = [ 'Moz', 'Webkit', 'O', 'ms' ];

        // cache properties to improve performance
        this.cache = [];

        // testing element
        this.element = $('<div>')[0];

    };

    /**
     * check property is supported and if not supported via standard property
     * try to find prefixed property instead
     * @param property
     * @returns {string|null}
     */
    vendorPrefix.prototype.get = function (property) {

        var supported, prefixed, capitalize, camelCase, i;

        // looking for it in cache
        if (this.cache[property]) {
            return this.cache[property];
        }

        capitalize = property.charAt(0).toUpperCase() + property.slice(1);

        // check for standard property
        if (property in this.element.style) {
            supported = property;
        } else {

            // camelCased property is for solve issues with firefox browser
            // ex. convert background-color to backgroundColor
            if (property.indexOf('-') !== -1) {
                camelCase = this._toCamelCase(property);
            }


            if (camelCase in this.element.style) {
                supported = property;
            } else {

                for (i = 0; i < this.browserPrefix.length; i++) {
                    prefixed = this.browserPrefix[i] + capitalize;

                    if (prefixed in this.element.style) {
                        supported = prefixed;
                        // in this case we knows scripts executed on witch browser
                        // so we cache current prefix to improve performance
                        if (this.browserPrefix.length > 1) {
                            this.browserPrefix = this.browserPrefix.splice(i, 1);
                        }
                        break;
                    }
                }
            }
        }

        // also property key cache has a big affect on library performance
        this.cache[ property ] = supported;

        return supported;
    };

    /**
     * capitalize property for example convert background-color to backgroundColor
     * @param property
     * @returns {string}
     * @private
     */
    vendorPrefix.prototype._toCamelCase = function (property) {

        var camelCase, i;

        camelCase = property.split('-');
        for (i in camelCase) {

            // keep first word unCapitalized
            if (i == 0) continue;
            camelCase[i] = camelCase[i].charAt(0).toUpperCase() + camelCase[i].slice(1);
        }
        return camelCase.join('');
    };

  //  vendorPrefix.prototype.constructor = vendorPrefix;

    // create an instance of vendor prefix
    TRANSIT.singleton.vendorPrefix = new vendorPrefix;


    // -----------------------------------------
    // TRANSIT ---------------------------------
    // -----------------------------------------


    /**
     * Transit object
     * @param selector
     * @param options
     * @constructor
     */
    transit = function transit(selector, options) {

        // reference to selector param
        this.selector = selector;

        // Check elements to be an instance of jQuery
        if (!(selector instanceof $)) {
            this.elements = $(selector);
        }

        try {

            if (this.elements.length < 1) {
                throw 'there is not elements for ' + this.elements.selector;
            }

            // set default transit flags
            this.FLAGS = {
                status: 'paused',
                direction: null,
                iterate: 'once',
                disableCallback: false,
                speed: 1,
                loopLimit: null,
                force: false
            };

            // set default transition options
            this.defaultOptions = {
                duration: '1s',
                delay: 0,
                easing: 'ease-out'
            };

            // private transit properties

            // stack of frames
            this._frames = [];

            // current frame index
            this._currentIndex = 0;

            // frame callback stack
            this._framesFunction = {};

            // compiled frame properties
            this._framesProperties = {};

            // last executed frame index
            this._lastIndex = null;

            if (options) {
                // this.createFrame();
                this.setOptions(options);
            }

            // use current counter as id
            this.FLAGS.id = ++TRANSIT.counter;

            //
            this._callbacks = {};
            this._loopLimitCounter = 0;

        } catch (e) {
            console.log('Transit error: ' + e);
        }
    };

    /**
     * set elements transition style
     * @param data
     * @private
     */
    transit.prototype._setTransitionStyle = function (data) {

        var properties = [
            [],
            [],
            [],
            []
        ], _this = this, styleProperties;

        for (var k in data) {

            // skip _options key
            if (k == '_options') continue;

            properties[0].push(k);
            properties[1].push(this._computeDuration(data[k].duration));
            properties[2].push(data[k].timing);
            properties[3].push(this._computeDuration(data[k].delay));
        }


        styleProperties = $.map(['transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay'], function (k) {
            return TRANSIT.singleton.vendorPrefix.get(k);
        });
        // Get previous styles
        $.each(properties, function (i, data) {

            var oldStyle = _this.elements.filter(':first').css(styleProperties[i]);

            if (oldStyle) {
                oldStyle = oldStyle.split(',');
                for (var k in oldStyle) {
                    // fix issue with IE11
                    if (oldStyle[k] == 'all') return false;
                    properties[i].unshift(oldStyle[k]);
                }
            }
        });

        $.each(properties, function (i, data) {
            _this.elements.css(styleProperties[i], data.join(', '));
        });
    };

    /**
     * normalize transition options object
     * @param property
     * @param data
     * @returns {{}}
     */
    transit.prototype._getTransitionObject = function (property, data) {
        var keys, object = {}, _this = this;

        keys = ['value', 'duration', 'timing', 'delay'];

        // convert to array | params that passed in string format
        if (typeof property === 'string') {
            property = property.split(' ');
        }

        if ($.isArray(property)) {
            $.each(property, function (i, k) {
                object[keys[i]] = k;
            });
        }

        // fill required object data from global variables
        $.each(keys, function (i, k) {
            if (!object[k]) {
                object[k] = data[k] || _this.defaultOptions[k];
            }
        });

        return object;
    };

    transit.prototype._checkDefaultValues = function (property, value) {
        this.elements.each(function (i, o) {
            switch (property) {
                case 'width':
                    if (!o.style[property]) {
                        o.style[property] = o.offsetWidth + 'px';
                    }
                    break;
            }
        });
    };

    transit.prototype._performTransition = function () {


        var transitions = {}, properties, _this = this, defaultOptions;

        properties = this._getFrame(-1);

        try {
            if (this.elements.length == 0) {
                throw 'NO ELEMENTS';
            }

            if (!properties) {
                throw 'Current keyframe not exists' + this._currentIndex;
            }

            // set last executed frame index
            this._lastIndex = this._currentIndex;

            defaultOptions = this._getDefaultOptions(properties);

            for (var k in properties) {
                transitions[k] = this._getTransitionObject(properties[k], defaultOptions);

                if (/^[0-9.]+$/.test(transitions[k].value)) {
                    transitions[k].value = parseFloat(transitions[k].value);
                }
                else if (transitions[k].value) {
                    transitions[k].value = transitions[k].value.toLowerCase();
                }

                if (!this.FLAGS.force && this.elements[0].style[k] && transitions[k].value == this.elements[0].style[k].toLowerCase()) {
                    delete properties[k];
                    delete transitions[k];
                }

            }

            // if there is no new value
            if (!Object.keys(transitions).length) {

                this._onTransitionEnd();
                properties.callback && !this.FLAGS.disableCallback && properties.callback();
                return false;
            }

            // Set transition style
            this._setTransitionStyle(transitions);

            // Clear current transition properties stack
            this._framesProperties[this._currentIndex] = [];

            // Apply new values
            for (var k in transitions) {

                // skip _options key
                if (k == '_options') continue;

                k = TRANSIT.singleton.vendorPrefix.get(k);

                this._framesProperties[this._currentIndex].push(k);

                this._checkDefaultValues(k, transitions[k].value)
                setTimeout((function (k, transitions) {
                    return function () {
                        _this.elements.css(k, transitions[k].value ? transitions[k].value : '');
                    }
                }(k, transitions)), 2);

            }

            // Create custom function
            // var transitCallback = this._createTransitCallback(data.elements, data);

            // Set function on event listener
            this._framesFunction[this._currentIndex] = function (e) {
                _this._transitPrivateCallback(e, properties._options.callback);
            };

            this.elements.on('transitionend', {start: new Date().getTime(), keyframe: this._currentIndex}, this._framesFunction[this._currentIndex]);

        } catch (e) {
            console.error('Transit _performTransition: ' + e, e.stack);
        }
    };


    transit.prototype._checkOption = function (key, value) {

        switch (key) {
            case 'callback':

                if (value && typeof value === 'function') {
                    return null;
                }
                return false;
                break;

            case 'duration':
                if (value) {
                    return null
                }
                return'1s';
                break;
            case 'delay':
                if (value) {
                    return null;
                }
                return 0;
                break;
            case 'timing':
                if (value) {
                    return null;
                }
                return 'easing';
                break;
            case 'iterate':
                if (['once', 'always'].indexOf(value) != -1) {
                    return null;
                }
                return 'once';
                break;
            default:
                return null;
        }
    };


    transit.prototype._getDefaultOptions = function (properties) {

        var callback, duration, iterate, delay, timing, _this = this, options = {};

        if (typeof properties._options == 'undefined') {
            properties._options = {};
        }

        // callback
        if (properties.callback && typeof properties.callback === 'function') {
            properties._options.callback = properties.callback;

            delete properties.callback;
        }

        // duration
        if (properties.duration) {
            properties._options.duration = properties.duration;
            delete properties.duration;
        } else if (!properties._options.duration) {
            properties._options.duration = this.defaultOptions.duration;
        }

        // delay
        if (properties.delay) {
            properties._options.delay = properties.delay;
            delete properties.delay;
        } else if (!properties._options.delay) {
            properties._options.delay = this.defaultOptions.delay;
        }

        // timing
        if (properties.timing) {
            properties._options.timing = properties.timing;
            delete properties.timing;
        } else if (!properties._options.timing) {
            properties._options.timing = this.defaultOptions.easing;
        }

        // iterate
        if (['once', 'always'].indexOf(properties.iterate) == -1) {
            properties._options.iterate = 'once';
        } else {
            properties._options.iterate = properties.iterate;
        }

        delete properties.iterate;
        return properties._options;
    };

    /**
     * compute duration property
     * @param duration
     * @returns string
     * @private
     */
    transit.prototype._computeDuration = function (duration) {
        var computedDuration;

        // convert duration param to string
        duration += '';

        if (duration.indexOf('ms') == -1) {
            // if duration unit is seconds
            computedDuration = parseFloat(duration) * 1000;
        } else {
            computedDuration = parseFloat(duration);
        }

        // apply speed option
        if (this.FLAGS.speed < 0) {
            computedDuration = (computedDuration * this.FLAGS.speed * -1) + 'ms';
        } else {
            computedDuration = (computedDuration / this.FLAGS.speed) + 'ms';
        }

        return computedDuration;
    };

    /**
     * if index presented, return indexed options
     * otherwise return current options
     * @param index
     * @returns object
     * @private
     */
    transit.prototype._getFrame = function (index) {

        // if index not presented use current index
        try {
            if (typeof index === 'undefined' || index === false || index === null || index === -1) {
                index = this._currentIndex;
            } else {
                throw 'can\'t find frame!';
            }
        } catch (e) {
            // console.log('Transit _getFrame: ' + e);
        }


        return this._frames[index];
    };

    /**
     * called when a transition performed and it will try to call next
     * or previous frame if there is any other frames
     * @param frameIndex
     * @private
     */
    transit.prototype._onTransitionEnd = function (frameIndex) {

        // if direction set to play (for example) and if next ( on some cases previous) frame was available
        // then try to perform next frame else if there is a callback for play
        // execute that callback

        var direction = 1, callback = false;

        switch (this.FLAGS.direction) {
            case 'play':
            case 'forward':
                callback = this.FLAGS.direction;
                break;
            case 'backward':
                callback = 'backward';
                direction = -1;
                break;
        }

        try {
            if (!callback) {
                throw 'invalid direction!';
            }

            if (this._frames[frameIndex + direction]) {
                this._currentIndex += direction;
                this._performTransition();
            } else {
                if (typeof this._callbacks[callback] === 'function') {
                    this._callbacks[callback](this);
                    this._callbacks[callback] = null;
                }
            }
        } catch (e) {
            console.log(e);
        }
    };

    /**
     * transit private callback to handle frames
     * @param e
     * @param callback
     * @private
     */
    transit.prototype._transitPrivateCallback = function (e, callback) {

        var properties, frameIndex, _this = this;

        // current frame options
        properties = this._getFrame(e.data.keyframe);
        frameIndex = e.data.keyframe;

        if (this._framesProperties[frameIndex].indexOf(e.originalEvent.propertyName) !== -1) {

            // remove property from transitioned properties bag
            this._framesProperties[frameIndex].splice(this._framesProperties[frameIndex].indexOf(e.originalEvent.propertyName), 1);

            // if callback should be called once
            if (this.FLAGS.iterate == 'once') {
                if (this._framesProperties[frameIndex].length == 0) {
                    this._onTransitionEnd(frameIndex);

                    // frame callback
                    if (callback && !this.FLAGS.disableCallback) callback(this);
                }
            } else {
                if (callback) callback(this);
            }

            if (this._framesProperties[frameIndex].length == 0) {
                this.elements.off('transitionend', this._framesFunction[frameIndex]);
            }
        }
    };

    /**
     * apply transit to children of current transit object selector
     * @param child
     * @param options
     * @returns {transit}
     */
    transit.prototype.find = function (child, options) {
        return new transit($(child, this.selector), options);
    };

    /**
     * apply transit to sibling elements
     * @param siblings
     * @param options
     * @returns {transit}
     */
    transit.prototype.siblings = function (siblings, options) {
        return new transit($(this.selector).siblings(siblings), options);
    };

    /**
     * apply transit to closest parent or parent
     * @param closest
     * @param options
     * @returns {transit}
     */
    transit.prototype.closest = function (closest, options) {
        var parent = closest ? $(this.selector).closest(closest) : $(this.selector).parent();
        return new transit(parent, options);
    };

    /**
     * create new frame
     * @param options
     * @returns {transit}
     */
    transit.prototype.createFrame = function (options) {

        var index = this._frames.length;
        this._frames[index] = {};

        if (options) {
            this.setOptions(options, index);
        }
        return this;
    };

    /**
     * disable frames callback execution
     * @returns {transit}
     */
    transit.prototype.disableCallback = function () {
        this.FLAGS.disableCallback = true;
        return this;
    };

    /**
     * enable frames callback execution
     * @returns {transit}
     */
    transit.prototype.enableCallback = function () {
        this.FLAGS.disableCallback = false;
        return this;
    };

    /**
     * set transition speed, {speed}x; -4x | 2x
     * @param speed
     * @returns {transit}
     */
    transit.prototype.setSpeed = function (speed) {
        if (speed == 0) {
            return this;
        }
        this.FLAGS.speed = speed;
        return this;
    };

    /**
     * force to apply style even if old and new property value is same
     * @param enable
     * @returns {transit}
     */
    transit.prototype.force = function (enable) {
        if (enable === false) {
            this.Flags.force = false;
        } else {
            this.FLAGS.force = true;
        }
        return this;
    };

    /**
     * set current frame callback, just an shortcut for setOptions method
     * @param callback
     * @returns {transitObject}
     */
    transit.prototype.callback = function (callback) {
        return this.setOptions('callback', callback);
    };

    /**
     * play frames, play always go forward
     * @param callback
     * @returns {transit}
     */
    transit.prototype.play = function (callback) {

        this.FLAGS.direction = 'play';
        if (callback) this._callbacks.play = callback;

        // Check keyframe index issue
        if (this._currentIndex == this._lastIndex) {
            if (this._frames[this._currentIndex + 1]) {
                this._currentIndex += 1;
            }
        }

        this._performTransition();
        return this;
    };

    /**
     * play frames in reverse order
     * @param callback
     * @returns {transit}
     */
    transit.prototype.backward = function (callback) {
        this.FLAGS.direction = 'backward';
        this._currentIndex -= 1;
        this._callbacks.backward = callback;
        this._performTransition();
        return this;
    };

    /**
     * play frames in forward direction
     * @param callback
     * @returns {transit}
     */
    transit.prototype.forward = function (callback) {

        this.FLAGS.direction = 'forward';
        this._currentIndex += 1;
        this._callbacks.forward = callback;
        this._performTransition();
        return this;
    };

    /**
     * @todo
     */
    transit.prototype.pause = function () {
    };

    /**
     * @todo
     */
    transit.prototype.stop = function () {
    };

    /**
     * @todo
     */
    transit.prototype.resume = function () {
    };

    /**
     * @todo
     */
    transit.prototype.rewind = function () {
    };

    /**
     * @todo
     */
    transit.prototype.end = function () {
    };

    /**
     * loop frames
     * @param limit
     * @param callback
     * @returns {transit}
     */
    transit.prototype.loop = function (limit, callback) {

        // if there is only one keyframe
        if (this._frames.length == 1) {
            return this;
        }

        // if loop finished
        if (this.FLAGS.loopLimit && this.FLAGS.loopLimit < this._loopLimitCounter) {

            this.FLAGS.loopLimit = null;
            this._loopLimitCounter = 0;

            if (typeof this._callbacks.loop == 'function') {
                this._callbacks.loop(this);
                this._callbacks.loop = false;
            }

            return this;
        }

        // set callback
        if (callback) this._callbacks.loop = callback;

        // set loop limitation
        if (limit !== false) this.FLAGS.loopLimit = limit ? limit * 2 : null;

        if (this._currentIndex <= this._frames.length - 2) {
            this.forward(function (o) {
                o.loop(false);
            });
        } else {
            this.backward(function (o) {
                o.loop(false);
            });
        }

        if (this.FLAGS.loopLimit) this._loopLimitCounter++;
        return this;
    };

    /**
     * set current frame options
     * @param key
     * @param value
     * @param frame
     * @returns {transit}
     */
    transit.prototype.setOptions = function (key, value, frame) {

        var result;

        // if passed as key,val paired object
        if ($.isPlainObject(key)) {
            for (var k in key) {
                this.setOptions(k, key[k], value);
            }
            return this;
        }

        // check if current options stack is null, create new frame
        if (this._frames.length == 0) {
            this.createFrame();
        }

        if (!frame) frame = this._currentIndex;

        // set options for current frame
        result = this._checkOption(key, value);

        if (result === false) {
            return this;
        } else if (result === null) {
            // do something when value is same as old
        } else {
            value = result;
        }

        this._frames[frame][key] = value;

        return this;
    };


    /**
     * remove an option from current frame options
     * @param key
     * @param index
     */
    transit.prototype.removeOption = function (key, index) {

        if (!index) {
            index = this._currentIndex;
        }

        if (this._frames[index][key]) {
            delete this._frames[index][key];
        }

    };



    return function(selector, options){
        return new transit(selector, options);
    };
}));

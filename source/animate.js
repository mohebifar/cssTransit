(function (root, factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], function () {
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

}(this, function ($) {
    'use strict';

    // global options and data container
    var TRANSIT = {
        counter: 0,
        supportedTransforms: /^((translate|rotate|scale)(X|Y|Z|3d)?|matrix(3d)?|perspective|skew(X|Y)?)$/i
    };


    var transit, easing, keyFrame, helpers;

    // -----------------------------------------
    // Helper methods --------------------------

    helpers = (function () {


        var cssPrefixInstance, cssPrefix = function () {

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
        cssPrefix.prototype.get = function (property) {

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
        cssPrefix.prototype._toCamelCase = function (property) {

            var camelCase, i;

            camelCase = property.split('-');
            for (i in camelCase) {

                // keep first word unCapitalized
                if (i == 0) continue;
                if (camelCase.hasOwnProperty(i)) {
                    camelCase[i] = camelCase[i].charAt(0).toUpperCase() + camelCase[i].slice(1);
                }
            }
            return camelCase.join('');
        };

        // css prefix
        cssPrefixInstance = new cssPrefix();

        return {
            /**
             * compute duration property
             * @param duration
             * @returns string
             */
            computeDuration: function (duration) {
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
            },

            cssPrefix: function (key) {
                return cssPrefixInstance.get(key);
            }
        };
    }());

    // -----------------------------------------
    // Easing Definition -----------------------

    easing = {

        // Basic easing
        linear: '0.250, 0.250, 0.750, 0.750',
        ease: '0.250, 0.100, 0.250, 1.000',
        easeIn: '0.420, 0.000, 1.000, 1.000',
        easeOut: '0.250, 0.250, 0.750, 0.750',
        easeInOut: '0.420, 0.000, 0.580, 1.000',

        // Sine
        easeInSine: '0.47, 0, 0.745, 0.715',
        easeOutSine: '0.39, 0.575, 0.565, 1',
        easeInOutSine: '0.39, 0.575, 0.565, 1',

        // Quad
        easeInQuad: '0.55, 0.085, 0.68, 0.53',
        easeOutQuad: '0.25, 0.46, 0.45, 0.94',
        easeInOutQuad: '0.455, 0.03, 0.515, 0.955',

        // Cubic
        easeInCubic: '0.55, 0.055, 0.675, 0.19',
        easeOutCubic: '0.215, 0.61, 0.355, 1',
        easeInOutCubic: '0.645, 0.045, 0.355, 1',

        // Quart
        easeInQuart: '0.895, 0.03, 0.685, 0.22',
        easeOutQuart: '0.165, 0.84, 0.44, 1',
        easeInOutQuart: '0.77, 0, 0.175, 1',

        // Quint
        easeInQuint: '0.755, 0.05, 0.855, 0.06',
        easeOutQuint: '0.23, 1, 0.32, 1',
        easeInOutQuint: '0.86, 0, 0.07, 1',

        // Expo
        easeInExpo: '0.95, 0.05, 0.795, 0.035',
        easeOutExpo: '0.19, 1, 0.22, 1',
        easeInOutExpo: '1, 0, 0, 1',

        // Circ
        easeInCirc: '0.6, 0.04, 0.98, 0.335',
        easeOutCirc: '0.075, 0.82, 0.165, 1',
        easeInOutCirc: '0.785, 0.135, 0.15, 0.86',

        // Back
        easeInBack: '0.6, -0.28, 0.735, 0.045',
        easeOutBack: '0.175, 0.885, 0.32, 1.275',
        easeInOutBack: '0.68, -0.55, 0.265, 1.55'
    };

    // -----------------------------------------
    // KEYFRAME Object -------------------------

    /**
     * {rotateY: '30deg', translatez: '50px 1s easeInCric 2s', opacity: '1 * * 1s'}
     * {color: ["light blue", 1,,1], backgroundColor: ['orange',,,2]}
     * {color: {value: 2, duration: 1, delay: 2, easing: 'easeInCric'}}
     *
     * @param properties
     * @param options
     * @param callback
     * @constructor
     */
    keyFrame = function (properties, options, transit) {

        this.transit = transit;
        this.rawParams = [properties, options];
        this.properties = false;
        this.options = {};

        // parse raw data
        this.parse(properties, options);

        /***
         if (typeof callback == 'function') {
            this.setOption('callback', callback);
        }
         ***/

    };

    /**
     *
     * @param properties
     * @param options
     */
    keyFrame.prototype.parse = function (properties, options) {

        var transform = {},
            returnProperties = {};

        for (var k in properties) {
            if (properties.hasOwnProperty(k)) {
                if (TRANSIT.supportedTransforms.test(k)) {
                    transform[k] = properties[k];
                } else {
                    returnProperties[k] = this.getPropertiesObject(k, properties[k]);
                }
            }
        }

        // {transform: '20deg', opacity: 1}, {duration: 1, delay: 1, easing: ''}
        // {translateZ: '10px'}, '1 * easeInCric'
        if (Object.keys(transform).length > 0) {
            returnProperties['transform'] = this.getTransform(transform);
        }

        // set properties
        this.properties = returnProperties;

        // parse options
        this.setOptions(options);

    };

    /**
     *
     * @param transforms
     * @returns {{property: *, value: (string|*)}}
     * @private
     */
    keyFrame.prototype.getTransform = function (transforms) {

        var value = '';
        for (var k in transforms) {
            if (transforms.hasOwnProperty(k)) {
                value += k + '(' + transforms[k] + ') ';
            }
        }
        return this.getPropertiesObject('transform', value);

    };

    /**
     *
     * @param key
     * @param value
     * @private
     * @returns {{property: *, value: (string|*)}}
     */
    keyFrame.prototype.getPropertiesObject = function (key, value) {
        console.log(value);
        return {
            property: helpers.cssPrefix(key),
            value: value
        };

    };

    /**
     *
     * @param k
     * @returns {*}
     */
    keyFrame.prototype.getProperty = function (k) {
        if (this.properties.hasOwnProperty(k)) {
            return this.properties[k];
        }
        return null;
    };

    keyFrame.prototype.getOption = function (k) {
        if (this.options.hasOwnProperty(k)) {
            return this.options[k];
        }
        return null;
    };

    keyFrame.prototype.setOptions = function (options, value) {

        if (value && typeof options == 'string') {
            // options is key param like callback
            this.setOption(options, value);
            return;
        }

        if (typeof options === 'string') {
            this.setOptions(options.split(' '));
            return;
        }

        if ($.isArray(options)) {

            var keysMap = ['duration', 'delay', 'easing'];
            for (var i = 0; options.length > i; i++) {

                // skip * that used as default value
                if (options[i] == '*') continue;

                if (keysMap[i]) {
                    this.setOption(keysMap[i], options[i]);
                }
            }
        } else if ($.isPlainObject(options)) {
            for (var k in options) {
                if (options.hasOwnProperty(k)) {
                    this.setOption(k, options[k]);
                }
            }
        }

    };

    /**
     *
     * @param key
     * @param value
     * @private
     */
    keyFrame.prototype.setOption = function (key, value) {
        if (this.options.hasOwnProperty(key)) {
            this.options[key] = value;
        }
    };

    keyFrame.prototype.getOptions = function () {
        var options = {};
        for (var k in this.transit.config) {
            if (this.options.hasOwnProperty(k)) {
                options[k] = this.options[k];
            } else {
                options[k] = this.transit.config[k];
            }
        }
        return options;
    }

    window.keyFrame = keyFrame;

    // -----------------------------------------
    // TRANSIT ---------------------------------


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
        if (typeof selector == 'string') {
            this.elements = document.querySelectorAll(selector);
        } else {
            this.elements = selector;
        }

        try {

            if (this.elements.length < 1) {
                console.error('there is not elements for ' + this.selector);
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


            // transit configuration
            this.config = {
                duration: '1s',
                delay: 0,
                easing: 'ease',
                callback: null
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
                this.createFrame(options);
            }

            // use current counter as id
            this.FLAGS.id = ++TRANSIT.counter;

            //
            this._callbacks = {};
            this._loopLimitCounter = 0;

        } catch (e) {
            console.log('transit error! ' + e);
        }
    };

    transit.prototype._getEasing = function (ease) {
        if (!easing[ease]) {
            return ease
        }

        return 'cubic-bezier(' + easing[ease] + ')';
    }

    /**
     * set elements transition style
     * @param data
     * @private
     */
    transit.prototype.applyTransitions = function (frame) {

        var options,
            _this = this;

        options = frame.getOptions();

        var properties = [
            [],
            [],
            [],
            []
        ], styleProperties;

        for (var k in frame.properties) {

            // skip _options key
            // if (k == '_options') continue;

            properties[0].push(k.trim());
            properties[1].push(options.duration);
            properties[2].push(this._getEasing(options.timing));
            properties[3].push(options.delay);
        }


        styleProperties = $.map(['transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay'], function (k) {
            return helpers.cssPrefix(k);
        });

        $.each(properties, function (i, data) {
            _this.elements.style[styleProperties[i]] =  data.join(', ');
        });
    };

    /**
     * normalize transition options object
     * @param property
     * @param data
     * @deprecated
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

            if (o.style[property] !== '') return;
            switch (property) {
                case 'width':
                    o.style[property] = o.offsetWidth + 'px';
                    break;
                case 'top':
                case 'left':
                case 'right':
                case 'bottom':
                    o.style[property] = 0 + 'px';
                    break;
            }
        });
    };

    transit.prototype.on = function (e, selector) {
        var target = null, that = this;

        if (selector) target = $(selector);
        else target = this.elements;

        if (e == 'hover') {
            target.hover(function () {
                that.play();
            }, function () {
                that.backward();
            });
        } else {
            target[e](function () {
                that.play();
            });
        }
    }

    transit.prototype._performTransition = function () {


        var transitions = {}, frame, _this = this, defaultOptions;

        frame = this._getFrame(-1);


        try {

            if (this.elements.length == 0 || !frame) {
                console.error(this.elements.length == 0 ? 'No elements!' : 'undefined keyframe! ' + this._currentIndex);
                return this;
            }

            // set last executed frame index
            this._lastIndex = this._currentIndex;
            /**
            for (var k in frame.proprties) {
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


            }**/

            // if there is no properties to apply
            if (!Object.keys(frame.properties).length) {

                this._onTransitionEnd();
                frame.options.callback && !this.FLAGS.disableCallback && frame.options.callback();
                return false;
            }

            // Set transition style
            this.applyTransitions(frame);

            // Clear current transition properties stack
            this._framesProperties[this._currentIndex] = [];

            console.log(frame.properties);

            // Apply new values
            for (var k in frame.properties) {
                _this.elements.style[frame.properties[k].property] = frame.properties[k].value;

            }

            // Create custom function
            // var transitCallback = this._createTransitCallback(data.elements, data);

            // Set function on event listener
            this._framesFunction[this._currentIndex] = function (e) {
                _this._transitPrivateCallback(e, properties._options.callback);
            };

            this.elements.addEventListener('transitionend', {start: new Date().getTime(), keyframe: this._currentIndex}, this._framesFunction[this._currentIndex]);

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
    transit.prototype.createFrame = function (properties, options) {

        var index = this._frames.length;
        this._frames[index] = new keyFrame(properties, options, this);

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
     * @deprecated
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

        // this._frames[frame][key] = value;

        return this;
    };


    /**
     * remove an option from current frame options
     * @param key
     * @param index
     * @deprecated
     */
    transit.prototype.removeOption = function (key, index) {

        if (!index) {
            index = this._currentIndex;
        }

        if (this._frames[index][key]) {
            delete this._frames[index][key];
        }

        return this;
    };

    /**
     * set delay
     * @param key
     * @param index
     */
    transit.prototype.setDelay = function (duration) {
        this.defaultOptions.delay = duration;
        return this;
    };

    /**
     * set perspective
     * @param key
     * @param index
     */
    transit.prototype.perspective = function (value, originX, originY) {
        // set perspective
        this.elements.parent().css(helpers.cssPrefix('perspective'), value);
        if (originX || originY) {
            this.perspectiveOrigin(originX, originY);
        }
        return this;
    };

    /**
     * set perspective origin
     * @param originX
     * @param originY
     * @returns {transit}
     */
    transit.prototype.perspectiveOrigin = function (originX, originY) {

        // if origin be a false value
        if (typeof originX == 'undefined' || originX == null) {
            originX = '50%';
        }
        if (typeof originY == 'undefined' || originY == null) {
            originY = '50%';
        }

        // if origin value is numeric
        if (/^\d+$/.test(originX)) {
            originX += 'px';
        }
        if (/^\d+$/.test(originY)) {
            originY += 'px';
        }

        // set perspective origin style style
        this.elements.parent().css(helpers.cssPrefix('perspective-origin'), originX + ' ' + originY);

        return this;
    };


    return function (selector, options) {
        return new transit(selector, options);
    };
}));

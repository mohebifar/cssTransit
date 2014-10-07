/**
 * Created by Hadi on 7/15/2014.
 */
define('animate', ['jquery'], function ($) {


    var root, transitObject;

    // Meta-data container
    var TRANSIT = {
        counter: 0
    };


    // Hooks
    String.prototype.replaceAt = function (index, character) {
        return this.substr(0, index) + character + this.substr(index + character.length);
    }

    /**
     * transit Object
     * @param selector
     * @param options
     */
    transitObject = function (selector, options) {

        // Snapshot from selector
        this.selector = selector;

        // Check elements to be instance of jQuery
        if (!(selector instanceof $)) {
            selector = $(selector);
        }

        // Set elements
        this.elements = selector;

        // Set default flags
        this.FLAGS = {
            status: 'paused',
            direction: null,
            iterate: 'once',
            disableCallback: false,
            speed: 1,
            loopLimit: null,
            force: false
        };

        this.defaultOptions = {
            duration: '1s',
            delay: 0,
            easing: 'ease-out'
        };

        // options stack
        // Set global options
        this._keyframes = [];
        this._currentKeyframeIndex = 0;

        this._keyframesFuntion = {};
        this._KeyframeProperties = {};
        this._lastKeyframeIndex = null;

        if (options) {
            this.addKeyframe();
            this.setOptions(options);
        }

        // Set animation iterator index
        this._currentIndex = 0;

        // use current counter as id
        this.FLAGS.id = ++TRANSIT.counter;

        //
        this._callbacks = {};
        this._loopLimitCounter = 0;


    };

    transitObject.prototype = {

        // array of  vendor prefixes
        _browserPrefix: [ 'Moz', 'Webkit', 'O', 'ms' ],

        find: function(child, options)
        {
            return new transitObject($(this.selector).find(child), options);
        },

        parent: function(closest, options)
        {
            var parent = closest ? $(this.selector).closest(closest) : $(this.selector).parent();
            return new transitObject(parent, options);
        },

        siblings: function(siblings, options){
            return new transitObject($(this.selector).siblings(siblings), options);
        },

        /**
         * Check current style supported in this browser and if not
         * try to find vendor prefixed property and return it
         * @param property
         * @returns {string}
         */
        getSupportedPropertyStyle: function (property) {

            // Checking for cached version
            if ($.support[property]) {
                return $.support[property];
            }

            var vendorProperty,
                supportedProperty,
                capitalizeProperty = property.charAt(0).toUpperCase() + property.slice(1),
                div = document.createElement('div');

            // Check for Browser support standard CSS property name

            if (property in div.style) {

                supportedProperty = property;
            } else {

                // CamelCased for solve issue with firefox
                if (property.indexOf('-') !== -1) {
                    var camelCasedProperty = property.split('-');

                    for (var i in camelCasedProperty) {
                        if (i == 0) continue;
                        camelCasedProperty[i] = camelCasedProperty[i].charAt(0).toUpperCase() + camelCasedProperty[i].slice(1);
                    }

                    camelCasedProperty = camelCasedProperty.join('');
                }


                if (camelCasedProperty in div.style) {
                    supportedProperty = property;
                }
                else {
                    // Otherwise test support for vendor-prefixed property names
                    for (var i = 0; i < this._browserPrefix.length; i++) {
                        vendorProperty = this._browserPrefix[i] + capitalizeProperty;
                        if (vendorProperty in div.style) {
                            supportedProperty = vendorProperty;

                            // Cache current browser prefix for better performance
                            if (this._browserPrefix.length > 1) this._browserPrefix = [this._browserPrefix[i]];

                            break;
                        }
                    }
                }
            }

            // Avoid memory leak in IE
            div = null;

            // Add property to $.support so it can be accessed elsewhere
            $.support[ property ] = supportedProperty;

            return supportedProperty;
        },

        _getDuration: function (duration) {
            var calculatedDuration;
            duration += '';
            if (duration.indexOf('ms') == -1) {
                calculatedDuration = parseFloat(duration) * 1000;
            }
            else {
                calculatedDuration = parseFloat(duration);
            }

            if (this.FLAGS.speed < 0) {
                calculatedDuration = (calculatedDuration * this.FLAGS.speed * -1) + 'ms';
            }
            else {
                calculatedDuration = (calculatedDuration / this.FLAGS.speed) + 'ms';
            }

            return calculatedDuration;
        },

        /**
         * if index presented, return indexed options
         * otherwise return current options
         * @param index
         * @returns {*}
         * @private
         */
        _getKeyframe: function (index) {

            // if index not presented use current index
            if (typeof index === 'undefined' || index === false || index === null || index === -1) {
                index = this._currentKeyframeIndex;
            }

            return this._keyframes[index];
        },

        _onTransitionEnd: function (keyframe) {

            if (this.FLAGS.direction == 'play') {

                if (this._keyframes[keyframe + 1]) {

                    this._currentKeyframeIndex++;
                    this._performTransition();

                }
                else {
                    if (typeof this._callbacks.play === 'function') {
                        this._callbacks.play(this);
                        this._callbacks.play = null;
                    }
                }

            } else if (this.FLAGS.direction == 'forward') {

                if (this._keyframes[keyframe + 1]) {

                    this._currentKeyframeIndex++;
                    this._performTransition();

                } else {

                    if (typeof this._callbacks.forward === 'function') {
                        this._callbacks.forward(this);
                        this._callbacks.forward = null;
                    }

                }

            } else if (this.FLAGS.direction == 'backward') {

                if (this._keyframes[keyframe - 1]) {

                    this._currentKeyframeIndex--;
                    this._performTransition();

                } else {

                    if (typeof this._callbacks.backward === 'function') {

                        this._callbacks.backward(this);
                        this._callbacks.backward = null;

                    }
                }
            }

        },
        _internalCallback: function (e, callback) {


            // get current options
            var properties = this._getKeyframe(e.data.keyframe),
                keyframe = e.data.keyframe,
                self = this;

            if (this._KeyframeProperties[keyframe].indexOf(e.originalEvent.propertyName) !== -1) {

                // Remove property from transitioned properties bag
                this._KeyframeProperties[keyframe].splice(this._KeyframeProperties[keyframe].indexOf(e.originalEvent.propertyName), 1);

                // if callback should be called once
                if (this.FLAGS.iterate == 'once') {

                    if (this._KeyframeProperties[keyframe].length == 0) {

                        // Play next frame
                        this._onTransitionEnd(keyframe);

                        // Callback
                        if (callback && !this.FLAGS.disableCallback) callback(this);

                    }
                } else {
                    if (callback) callback(this);
                }

                if (this._KeyframeProperties[keyframe].length == 0) {
                    this.elements.off('transitionend', this._keyframesFuntion[keyframe]);
                }

            }


            return false;
        },

        addKeyframe: function (options) {

            var keyframe = this._keyframes.length;

            this._keyframes[keyframe] = {};

            if (options) {
                this.setOptions(options, keyframe);
            }

            return this;

        },

        disableCallback: function () {
            this.FLAGS.disableCallback = true;
            return this;
        },
        enableCallback: function () {
            this.FLAGS.disableCallback = false;
            return this;
        },


        /**
         * set options for current indexed
         * @param key
         * @param optional value
         * @returns {transitObject}
         */
        setOptions: function (key, value, keyframe) {

            // if passed as key,val paired object
            if ($.isPlainObject(key)) {
                for (var k in key) {
                    this.setOptions(k, key[k], value);
                }

                return this;
            }


            // Check if current options stack is null, create a empty object
            if (this._keyframes.length == 0) {
                this.addKeyframe();
            }

            if (!keyframe) keyframe = this._currentKeyframeIndex;

            // Set options to current stack
            var result = this._checkOption(key, value);

            if (result === false) {
                return this;
            }
            else if (result === null) {
                // do something when value is fine as same
            } else {
                value = result;
            }

            this._keyframes[keyframe][key] = value;

            return this;
        },

        setSpeed: function (speed) {
            if (speed == 0) {
                return this;
            }
            this.FLAGS.speed = speed;
            return this;
        },

        force: function(enable){
            if(enable === false)
            {
                this.Flags.force = false;
            }
            else
            {
                this.FLAGS.force = true;
            }

            return this;
        },

        removeOption: function (key, index) {

            if (!index) {
                index = this._currentKeyframeIndex;
            }

            if (this._keyframes[index][key]) {
                delete this._keyframes[index][key];
            }

        },

        _checkOption: function (key, value) {

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
        },

        play: function (callback) {

            this.FLAGS.direction = 'play';
            if (callback) this._callbacks.play = callback;

            // Check keyframe index issue
            if(this._currentKeyframeIndex == this._lastKeyframeIndex)
            {
                if(this._keyframes[this._currentKeyframeIndex + 1])
                {
                    this._currentKeyframeIndex++;
                }
            }

            this._performTransition();
            return this;

            // initialize options
            // this._init();
        },
        backward: function (callback) {
            this.FLAGS.direction = 'backward';
            this._currentKeyframeIndex--;
            this._callbacks.backward = callback;
            this._performTransition();
            return this;
        },

        pause: function () {
        },
        stop: function () {
        },
        forward: function (callback) {

            this.FLAGS.direction = 'forward';
            this._currentKeyframeIndex++;
            this._callbacks.forward = callback;
            this._performTransition();
            return this;
        },
        home: function () {
        },
        end: function () {
        },
        loop: function (limit, callback) {

            // if there is only one keyframe
            if (this._keyframes.length == 1) {
                return this;
            }

            // Check loop limit
            if (this.FLAGS.loopLimit && this.FLAGS.loopLimit < this._loopLimitCounter) {

                this.FLAGS.loopLimit = null;
                this._loopLimitCounter = 0;

                if (typeof this._callbacks.loop == 'function') {

                    this._callbacks.loop(this);
                    this._callbacks.loop = false;

                }

                return this;

            }

            // Set callback
            if (callback) this._callbacks.loop = callback;

            // set loop limitation
            if (limit !== false) this.FLAGS.loopLimit = limit ? limit * 2 : null;

            if (this._currentKeyframeIndex <= this._keyframes.length - 2) {
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
        },
        _getDefaultOptions: function (properties) {


            var callback, duration, iterate, delay, timing, self, options = {};

            if (typeof properties._options == 'undefined') {
                properties._options = {};
            }

            self = this;

            // callback
            if (properties.callback && typeof properties.callback === 'function') {
                properties._options.callback = properties.callback;

                delete properties.callback;
            }

            // duration
            if (properties.duration) {
                properties._options.duration = properties.duration;
                delete properties.duration;
            }
            else if (!properties._options.duration) {
                properties._options.duration = this.defaultOptions.duration;
            }

            // delay
            if (properties.delay) {
                properties._options.delay = properties.delay;
                delete properties.delay;
            }
            else if (!properties._options.delay) {
                properties._options.delay = this.defaultOptions.delay;
            }

            // timing
            if (properties.timing) {
                properties._options.timing = properties.timing;
                delete properties.timing;
            }
            else if (!properties._options.timing) {
                properties._options.timing = this.defaultOptions.easing;
            }

            // iterate
            if (['once', 'always'].indexOf(properties.iterate) == -1) {
                properties._options.iterate = 'once';
            }
            else {
                properties._options.iterate = properties.iterate;
            }

            delete properties.iterate;

            return properties._options;

        },

        callback: function (callabck) {
            return this.setOptions('callback', callabck);
        },

        _performTransition: function () {


            var transitions = {},
                properties = this._getKeyframe(-1),
                self = this;

            if(this.elements.length == 0)
            {
                console.log('NO ELEMENTS', this.selector);
                return false;
            }

            if (!properties) {

                console.error('Current keyframe not exists', this._currentKeyframeIndex);
                return false;

            }

            this._lastKeyframeIndex = this._currentKeyframeIndex;

            var defaultOptions = this._getDefaultOptions(properties);


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
            this._KeyframeProperties[this._currentKeyframeIndex] = [];

            // Apply new values
            for (var k in transitions) {
                if (k == '_options') continue;
                var k = this.getSupportedPropertyStyle(k);

                this._KeyframeProperties[this._currentKeyframeIndex].push(k);

                this._checkDefaultValues(k, transitions[k].value)
                setTimeout((function (k, transitions) {
                    return function () {
                        self.elements.css(k, transitions[k].value ? transitions[k].value : '');
                    }
                }(k, transitions)), 2);

            }

            // Create custom function
            // var transitCallback = this._createTransitCallback(data.elements, data);

            // Set function on event listener
            this._keyframesFuntion[this._currentKeyframeIndex] = function (e) {
                self._internalCallback(e, properties._options.callback);
            };

            this.elements.on('transitionend', {start: new Date().getTime(), keyframe: this._currentKeyframeIndex}, this._keyframesFuntion[this._currentKeyframeIndex]);


        },

        _checkDefaultValues: function (property, value) {

            this.elements.each(function (i, o) {

                switch (property) {
                    case 'width':
                        if (!o.style[property]) {
                            o.style[property] = o.offsetWidth + 'px';
                        }
                        break;
                }

            });

        },


        _getTransitionObject: function (property, data) {
            var keys = ['value', 'duration', 'timing', 'delay'],
                object = {},
                self = this;


            if (typeof property === 'string') {
                // Convert to array
                property = property.split(' ');
            }

            if ($.isArray(property)) {
                $.each(property, function (i, k) {
                    object[keys[i]] = k;
                });
            }

            // let's fill required object data from global variables
            $.each(keys, function (i, k) {
                if (!object[k]) {
                    object[k] = data[k] || self.defaultOptions[k];
                }
            });

            return object;
        },

        _setTransitionStyle: function (data) {

            var properties = [
                    [],
                    [],
                    [],
                    []
                ],
                self = this;

            for (var k in data) {
                if (k == '_options') continue;
                properties[0].push(k);
                properties[1].push(this._getDuration(data[k].duration));
                properties[2].push(data[k].timing);
                properties[3].push(this._getDuration(data[k].delay));
            }


            var styleProperties = $.map(['transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay'], function (k) {
                return self.getSupportedPropertyStyle(k);
            });

            // Get previous styles
            $.each(properties, function (i, data) {

                var previousStyle = self.elements.filter(':first').css(styleProperties[i]);
                if (previousStyle) {
                    previousStyle = previousStyle.split(',');

                    for (var k in previousStyle) {
                        // Resolve issues with IE11
                        if (previousStyle[k] == 'all') return false;
                        properties[i].unshift(previousStyle[k]);
                    }
                }
            });

            $.each(properties, function (i, data) {
                self.elements.css(styleProperties[i], data.join(', '));
            });
        }


    };

    /**
     * requestAnimFrame fallback
     */
    (function () {
        window.requestAnimFrame = (function (callback) {
            return window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimationFrame ||
                function (callback) {
                    window.setTimeout(callback, 1000 / 60);
                };
        })();
    }());


    root = {

        /**
         * Create transitObject and play it automatically
         * @param selector selector or a jquery Object
         * @param options
         * @returns {transitObject}
         */
        now: function (selector, options) {

            var $transit = new transitObject(selector, options);

            // Ex. Set options
            // $transit.setOptions(options);

            return $transit.play();

        },

        /**
         * Create transitObject
         * @param selector selector or a jquery Object
         * @param options
         * @returns {transitObject}
         */
        get: function (selector, options) {
            return new transitObject(selector, options);
        }
    };

    return root;

});
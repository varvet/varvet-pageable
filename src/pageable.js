/*!
 * Varvet-Pageable
 * Self-contained wheel listening plugin to switch pages within a
 * static window.
 * Written by Johan Halse, https://twitter.com/hejsna, johan@varvet.se
 * License: http://johanhalse.mit-license.org
 * @version 0.1
 * @return {object}         Self
 */
var Pageable = function(options) {
  var that = this;

  // Default options
  var stub = function() {};
  that.settings = {
    pages: 0,
    pageHeight: 1000,
    direction: 'deltaY',
    stopAtPage: false,
    momentum: false,
    easeBack: false,
    eventTimeout: 100,

    onScrollStart: stub,
    onScroll: stub,
    onScrollStop: stub,
    onPageChange: stub
  };

  that.extend(that.settings, options);

  // Private vars
  that.page = 0;
  that.delta = 0;
  that.scrolling = false;
  that.stoppedAtPage = null;

  // ...aaand, go!
  that.onScrollStop = that.debounce(that.onScrollStop, that.settings.eventTimeout, that);
  addWheelListener( window, that.proxy(that.onScroll, that));
};

Pageable.prototype = {
  /**
   * Proxy function, kind of like jQuery does it. Included here to
   * remove the external dependency on a particular library.
   * @param  {function} f function to switch context of
   * @param  {object}   c context where function should be applied
   * @return {function}   function with new context
   */
  proxy: function(f, c) {
    return function() {
      var args = Array.prototype.slice.call(arguments)
      return f.apply(c, args);
    };
  },

  /**
   * Bog-standard object extend function. Doesn't return a new object,
   * mind you - the original 'a' object gets modified.
   * @param  {object} a object to extend
   * @param  {object} b object to overwrite with
   * @return {object}   original but overwritten object
   */
  extend: function(a, b) {
    for(var key in b) {
      if(b.hasOwnProperty(key)) {
        a[key] = b[key];
      }
    }
    return a;
  },

  /**
   * Move Pageable to a page, run callbacks, set correct values
   * @param  {number} page page to go to
   * @return {null}
   */
  gotoPage: function(page) {
    // We do it like this because user might want to manipulate this.page
    // for some reason and it should be correctly set. Come to think of
    // it, maybe they don't need that? Ah well
    var prevPage = this.page;
    this.page = page;
    this.settings.onPageChange.apply(this, [prevPage, this.page]);
    this.percentage = 0;
    this.delta = 0;
    this.stoppedAtPage = true;
  },

  /**
   * Does what you probably expect it to do
   * @return {null}
   */
  enable: function() {
    this.disabled = false;
  },

  /**
   * Disables Pageable
   * @return {null}
   */
  disable: function() {
    this.disabled = true;
  },

  /**
   * User has started scrolling
   * @param  {object} e Event object from addWheelListener or suchlike
   * @return {null}
   */
  onScrollStart: function(e) {
    this.scrolling = true;
    this.delta = 0;
    this.settings.onScrollStart.apply(this, [ this.percentage, this.page ]);
  },

  /**
   * Debounce function from David Walsh
   * @param  {function} func    function to debounce
   * @param  {number}   wait    how long to wait before firing
   * @param  {object}   context context in which to run the debounced function
   * @return {function}         the debounced function
   */
  debounce: function(func, wait, context) {
    var timeout;
    return function() {
      var later = function() {
        timeout = null;
        func.apply(context, []);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * The meat of the object, gets called whenever we get a mouse wheel
   * event.
   * @param  {object} e normalized event object
   * @return {null}
   */
  onScroll: function(e) {
    e.preventDefault();
    if(this.disabled) {
      // Return if we're disabled. No edge cases are handled, such as
      // if the user disabled Pageable while in the middle of an easing
      // or such. Not sure what the expected behavior is...
      return false;
    }
    this.onScrollStop(); // Debounced function, don't worry
    if(this.settings.stopAtPage && this.stoppedAtPage) {
      // This is super problematic since we have no way to stop those
      // wheel events from firing. So we're going to be stuck here
      // until the page has come to a complete stop, at which point our
      // onScrollStop function will fire and everything is great. If
      // someone has a good idea how to get around this, shoot me a
      // pull request!
      return false;
    }

    if(this.scrolling == false) {
      this.onScrollStart(e);
    }

    this.delta += e[ this.settings.direction ];
    this.percentage = (this.delta / this.settings.pageHeight);

     // Momentum scrolling past borders
    if(this.settings.momentum && (
       (this.page == this.settings.pages-1 && this.percentage > 0) || // Before first page
       (this.page == 0 && this.percentage < 0) // Past last page
    )) {
      this.percentage = 1/(1+Math.pow(Math.E,-this.percentage)) - 0.5;
    }

    // User has scrolled past a page, forwards
    if(this.percentage >= 1 && this.page < (this.settings.pages-1)) {
      this.gotoPage(page + 1);
    }

    // User has scrolled past a page, backwards
    if(this.percentage <= -1 && this.page > 0) {
      this.gotoPage(page - 1);
    }

    this.settings.onScroll.apply(this, [ this.percentage, this.page ]);
  },

  /**
   * This fires when scrolling has ceased.
   * @return {null}
   */
  onScrollStop: function() {
    if( this.stoppedAtPage ) {
      this.stoppedAtPage = null;
    }

    if(this.settings.easeBack) {
      this.startEasing();
    }
    else {
      this.settings.onScrollStop.apply(this, [ this.percentage, this.page ]);
      this.delta = 0;
      this.scrolling = false;
    }
  },

  /**
   * This gets called if we're doing easing after we've stopped. Inits
   * the vars and sets up the interval.
   * @return {null}
   */
  startEasing: function() {
    clearInterval(this.easeInterval);
    this.delta = 0;
    this.easeStart = new Date().getTime();
    this.easeOrigin = this.percentage;
    this.easeInterval = setInterval(this.proxy(this.interpolateBack, this), 16);
  },

  /**
   * The interpolation function that gets called every frame if we're
   * easing.
   * @return {null}
   */
  interpolateBack: function() {
    var now = new Date().getTime() - this.easeStart;
    if(now > 300) {
      now = 300;
      clearInterval(this.easeInterval);
    }
    this.percentage = this.easeOut( now, this.easeOrigin, -this.easeOrigin, 300);
    this.settings.onScroll.apply(this, [ this.percentage, this.page ]);
  },

  /**
   * The actual easing function, taken from Robert Penner's equations
   * here: http://www.robertpenner.com/easing/
   * @param  {number} t current time
   * @param  {number} b beginning value
   * @param  {number} c change in value
   * @param  {number} d duration
   * @return {number}   interpolated value
   */
  easeOut: function(t, b, c, d) {
    return c*((t=t/d-1)*t*t*t*t + 1) + b;
  }
};


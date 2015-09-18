/* global define:false */

'use strict';

// Wrap so that we can support different module loaders
(function(root, factory) {
  // Common JS (i.e. browserify) or Node.js environment
  if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
    module.exports = factory(require('underscore'), require('wad'));
  }
  else if (typeof define === 'function' && define.amd) {
    // AMD
    define(['underscore', 'wad'], factory);
  }
  else {
    // Brower global
    root.Daud = factory(root._, root.Wad);
  }
})(typeof window !== 'undefined' ? window : this, function(_, Wad) {
  // Check depdencies
  if (typeof _ === 'undefined') {
    throw new Error('Underscore is a necessary dependency of Daud: http://underscorejs.org/');
  }

  if (typeof Wad === 'undefined') {
    throw new Error('Wad is a necessary dependency of Daud: https://github.com/rserota/wad');
  }

  // Default options
  var defaultOptions = {
    type: 'linear',
    instrument: 'piano',
    volume: 1,
    note: 'C4',
    noteTime: 300,
    panning: 0,

    // The value for a datapoint is either the 'value'
    // property or the datapoint itself
    value: function(d) {
      return _.isObject(d) ? d.value : d;
    },

    // Time for a data point is either the 'time' property
    // or assumed to be the value as seconds
    time: function(d) {
      return _.isObject(d) && d.time ? d.time : d * 1000;
    }
  };

  // Instruments
  var instruments = _.extend({}, Wad.presets, {
    flute: {
      source: 'square',
      env: {
        attack: 0.015,
        decay: 0.002,
        sustain: 0.5,
        hold: 2.5,
        release: 0.3
      },
      filter: {
        type: 'lowpass',
        frequency: 600,
        q: 7,
        env: {
          attack: 0.7,
          frequency: 1600
        }
      },
      vibrato: {
        attack: 8,
        speed: 8,
        magnitude: 100
      }
    }
  });

  // Constructor.
  var Daud = function(options) {
    this.options = _.extend({}, defaultOptions, options);
    this.make();
  };

  // Add methods and properties
  _.extend(Daud.prototype, {
    // Make daud
    make: function() {
      if (this.options.type === 'linear') {
        this.makeLinear();
      }
    },

    // An option can be a value or function
    makeOption: function(option, data, index, time, percent) {
      var o = this.options[option];

      if (_.isFunction(o)) {
        return _.bind(o, this)(data, index, time, percent);
      }
      else {
        return o;
      }
    },

    // Make linear data sonifcation
    makeLinear: function() {
      var _this = this;

      // Get times for min and max
      var times = _.map(this.options.data, function(data, di) {
        return _this.makeOption('time', data, di);
      });

      //var min = this.options.min || _.min(times);
      var max = this.options.max || _.max(times);

      // Process data
      var animData = _.map(this.options.data, function(data, di) {
        var d = _this.makeOption('value', data, di);
        var t = _this.makeOption('time', data, di);
        var instrument = _this.makeOption('instrument', data, di, t, (t / max));
        var i = new Wad((_.isObject(instrument)) ? instrument : instruments[instrument]);

        return {
          i: i,
          value: d,
          played: false,
          time: t,
          play: function() {
            i.play({
              volume: _this.makeOption('volume', data, di, t, (t / max)),
              pitch: _this.makeOption('note', data, di, t, (t / max)),
              panning: _this.makeOption('panning', data, di, t, (t / max))
            });

            setTimeout(function() {
              i.stop();
            }, _this.makeOption('noteTime', data, di, t, (t / max)));
          }
        };
      });

      // Create play function
      this.play = function() {
        var start = null;

        // Reset play
        animData = _.map(animData, function(d) {
          d.played = false;
          return d;
        });

        // Animation callback
        var animate = function(timestamp) {
          start = (!start) ? timestamp : start;
          var progress = timestamp - start;

          // Play note if needed
          _.each(animData, function(d, di) {
            if (progress >= d.time && !d.played) {
              d.play();
              animData[di].played = true;
            }
          });

          // Animate some more
          if (progress <= max) {
            window.requestAnimationFrame(animate);
          }
        };

        window.requestAnimationFrame(animate);
      };
    }
  });

  return Daud;
});

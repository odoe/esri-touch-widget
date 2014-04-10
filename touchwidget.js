/*global define, setTimeout, Error*/
/*jshint laxcomma:true*/
define([
  'esri/layers/GraphicsLayer',
  'esri/graphic',
  'esri/symbols/SimpleMarkerSymbol',
  'dojo/Evented',
  'dojo/on',
  'dojo/fx',
  'dojo/_base/fx',
  'dojo/fx/easing',
  'dojo/aspect',
  'dojo/_base/Color',
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dijit/_WidgetBase',
  'dijit/a11yclick'
], function (
  GraphicsLayer, Graphic,
  SimpleMarkerSymbol,
  Evented, on,
  fx, coreFx, easing,
  aspect,
  Color,
  declare, lang,
  _WidgetBase,
  a11yclick
) {
  'use strict';

  return declare([_WidgetBase], {

    options: {},

    constructor: function(options) {
      this.options = options || {};
      this.settings = this.options.settings;

      this.set('map', this.options.map);
      this.set('delay', this.settings.delay || 500);
      this._symInner = new SimpleMarkerSymbol(
        SimpleMarkerSymbol.STYLE_CIRCLE,
        this.settings.innerSize, null, new Color(this.settings.innerColor)
      );
      this._symOuter = new SimpleMarkerSymbol(
        SimpleMarkerSymbol.STYLE_CIRCLE,
        this.settings.outerSize, null, new Color(this.settings.outerColor)
      );
      this.touchLayer = new GraphicsLayer();
    },

    startup: function() {
      if (!this.map) {
        this.destroy();
        throw new Error('Must provide a map object to use TouchWidget');
      }

      if (this.map.loaded) {
        this._init();
      } else {
        on.once(this.map, 'load', lang.hitch(this, '_init'));
      }
    },

    // widget methods
    _fxArgs: function(graphic) {
      return {
        node: graphic.getDojoShape().getNode(),
        duration: this.delay,
        easing: easing.expoOut
      };
    },

    _fxToCombine: function (graphicOuter, graphicInner) {
      return [
        coreFx.fadeOut(this._fxArgs(graphicOuter)),
        coreFx.fadeOut(this._fxArgs(graphicInner))
      ];
    },

    _onAspectAfterEnd: function(graphicOuter, graphicInner) {
      return lang.hitch(this, function() {
        this.touchLayer.remove(graphicOuter);
        this.touchLayer.remove(graphicInner);
      });
    },

    _onTimeOut: function(graphicOuter, graphicInner) {
      return lang.hitch(this, function() {
        var combined
          , f;
        combined = this._fxToCombine(graphicOuter, graphicInner);
        f = fx.combine(combined);
        this.own(
        aspect.after(f, 'onEnd',
                     lang.hitch(
                       this,
                       this._onAspectAfterEnd(graphicOuter, graphicInner)
                     ))
        );
        f.play();
      });
    },

    _onTouchClick: function(e) {
      var graphicOuter = new Graphic(e.mapPoint, this._symOuter)
        , graphicInner = new Graphic(e.mapPoint, this._symInner);

      this.touchLayer.add(graphicOuter);
      this.touchLayer.add(graphicInner);

      setTimeout(lang.hitch(this, this._onTimeOut(graphicOuter, graphicInner)),
                 this.delay);
    },

    // private methods
    _init: function() {
      this.map.addLayer(this.touchLayer);
      this.set('loaded', true);
      this.emit('load', {});

      // set up touch handlers
      this.own(
        on(this.get('map'), a11yclick.click, lang.hitch(this, '_onTouchClick'))
      );
    }

  });
});

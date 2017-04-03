L.TileLayer.FallbackAGS = L.TileLayer.extend({

  options: {
    minNativeZoom: 0
  },

  initialize: function (urlTemplate, options) {
    L.TileLayer.prototype.initialize.call(this, urlTemplate, options);
  },

  createTile: function (coords, done) {
    var tile = L.TileLayer.prototype.createTile.call(this, coords, done);
    tile._originalCoords = coords;
    tile._originalSrc = tile.src;

    return tile;
  },

  _createCurrentCoords: function (originalCoords) {
    var currentCoords = this._wrapCoords(originalCoords);

    currentCoords.fallback = true;

    return currentCoords;
  },

  _originalTileOnError: L.TileLayer.prototype._tileOnError,

  _tileOnError: function (done, tile, e) {
    var layer = this, // `this` is bound to the Tile Layer in L.TileLayer.prototype.createTile.
      originalCoords = tile._originalCoords,
      currentCoords = tile._currentCoords = tile._currentCoords || layer._createCurrentCoords(originalCoords),
      fallbackZoom = tile._fallbackZoom = (tile._fallbackZoom || originalCoords.z) - 1,
      scale = tile._fallbackScale = (tile._fallbackScale || 1) * 2,
      tileSize = layer.getTileSize(),
      style = tile.style,
      newUrl, top, left;

    // If no lower zoom tiles are available, fallback to errorTile.
    if (fallbackZoom < layer.options.minNativeZoom) {
      return this._originalTileOnError(done, tile, e);
    }

    // Modify tilePoint for replacement img.
    currentCoords.z = fallbackZoom;
    currentCoords.x = Math.floor(currentCoords.x / 2);
    currentCoords.y = Math.floor(currentCoords.y / 2);

    // Generate new src path.
    newUrl = layer.getTileUrl(currentCoords);

    // Zoom replacement img.
    style.width = (tileSize.x * scale) + 'px';
    style.height = (tileSize.y * scale) + 'px';

    // Compute margins to adjust position.
    top = (originalCoords.y - currentCoords.y * scale) * tileSize.y;
    style.marginTop = (-top) + 'px';
    left = (originalCoords.x - currentCoords.x * scale) * tileSize.x;
    style.marginLeft = (-left) + 'px';

    // Crop (clip) image.
    // `clip` is deprecated, but browsers support for `clip-path: inset()` is far behind.
    // http://caniuse.com/#feat=css-clip-path
    style.clip = 'rect(' + top + 'px ' + (left + tileSize.x) + 'px ' + (top + tileSize.y) + 'px ' + left + 'px)';

    layer.fire('tilefallback', {
      tile: tile,
      url: tile._originalSrc,
      urlMissing: tile.src,
      urlFallback: newUrl
    });

    tile.src = newUrl;
  },

  getTileUrl: function (coords) {
    var z = coords.z = coords.fallback ? coords.z : this._getZoomForUrl();

    var data = {
      r: L.Browser.retina ? '@2x' : '',
      s: this._getSubdomain(coords),
      x: coords.x,
      y: coords.y,
      z: z
    };
    if (this._map && !this._map.options.crs.infinite) {
      var invertedY = this._globalTileRange.max.y - coords.y;
      if (this.options.tms) {
        data['y'] = invertedY;
      }
      data['-y'] = invertedY;
    }

    var newUrl = this._url + '/L' + this.addLeadingZeroLevel(coords.z) + '/R' + this.addLeadingZero(coords.y) + '/C' + this.addLeadingZero(coords.x) + '.jpg'

    return L.Util.template(newUrl, L.extend(data, this.options));
  },

  addLeadingZero: function(n) {
        var out = n.toString(16);

        switch (out.length) {
          case 1:
            out = "0000000" + out;
            break;
          case 2:
            out = "000000" + out;
            break;
          case 3:
            out = "00000" + out;
            break;
          case 4:
            out = "0000" + out;
            break;
          case 5:
            out = "000" + out;
            break;
          case 6:
            out = "00" + out;
            break;
          case 7:
            out = "0" + out;
            break;
        }

        return out;
      },

      addLeadingZeroLevel: function(n) {
        var out = String(n);

        if (out.length == 1) {
          out = "0" + out;
        } else if (out.length == 2) {
          out = out;
        }

        return out;
      }

});

// Supply with a factory for consistency with Leaflet.
L.tileLayer.fallbackags = function (urlTemplate, options) {
  return new L.TileLayer.FallbackAGS(urlTemplate, options);
};

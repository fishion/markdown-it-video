'use strict';

// Process @[youtube](youtubeVideoID)
// Process @[vimeo](vimeoVideoID)
// Process @[vine](vineVideoID)
// Process @[prezi](preziID)

(function() {
  var self = this; // root will be window object in browser context

  /* eslint-disable max-len */
  /* eslint-disable no-unused-vars */
  var services = {
    youtube : {
      regex : /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/,
      parser : function(url) {
        var match = url.match(services.youtube.regex);
        return match && match[7].length === 11 ? match[7] : url;
      },
      url : function(videoID, options) {
        return '//www.youtube.com/embed/' + videoID;
      },
      options: { width: 640, height: 390 }
    },
    vimeo : {
      regex : /https?:\/\/(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/,
      parser : function(url) {
        var match = url.match(services.vimeo.regex);
        return match && typeof match[3] === 'string' ? match[3] : url;
      },
      url : function(videoID, options) {
        return '//player.vimeo.com/video/' + videoID;
      },
      options: { width: 500, height: 281 }
    },
    vine : {
      regex : /^http(?:s?):\/\/(?:www\.)?vine\.co\/v\/([a-zA-Z0-9]{1,13}).*/,
      parser : function(url) {
        var match = url.match(services.vine.regex);
        return match && match[1].length === 11 ? match[1] : url;
      },
      url : function(videoID, options) {
        return '//vine.co/v/' + videoID + '/embed/' + services.vine.options.embed;
      },
      options: { width: 600, height: 600, embed: 'simple' }
    },
    prezi : {
      regex : /^https:\/\/prezi.com\/(.[^/]+)/,
      parser : function(url) {
        var match = url.match(services.prezi.regex);
        return match ? match[1] : url;
      },
      url : function(videoID, options) {
        return 'https://prezi.com/embed/' + videoID +
        '/?bgcolor=ffffff&amp;lock_to_path=0&amp;autoplay=0&amp;autohide_ctrls=0&amp;' +
        'landing_data=' +
          'bHVZZmNaNDBIWnNjdEVENDRhZDFNZGNIUE43MHdLNWpsdFJLb2ZHanI5N1lQVHkxSHFxazZ0UUNCRHloSXZROHh3PT0&amp;' +
        'landing_sign=1kD6c0N6aYpMUS0wxnQjxzSqZlEB8qNFdxtdjYhwSuI';
      },
      options: { width: 550, height: 400 }
    }
  };
  /* eslint-enable max-len */
  /* eslint-enable no-unused-vars */

  function iframeparams(options, service) {
    if (options.plainiframe) {return '';}
    return ' class="embed-responsive-item"'
      + ' id="' + service + 'player"'
      + ' type="text/html"'
      + ' width="' + options[service].options.width + '"'
      + ' height="' + options[service].options.height + '"';
  }

  function tokenize_video(state, silent) {
    var start = state.pos,
      max = state.posMax;

    // check first 2 chars look like what we're after
    if (state.src.charCodeAt(start) !== 0x40/* @ */ ||
        state.src.charCodeAt(start + 1) !== 0x5B/* [ */) {
      return false;
    }

    var EMBED_RE = /@\[([a-zA-Z].+?)\]\(\s*(.*?)\s*\)/im;
    var match = EMBED_RE.exec(state.src.slice(start));

    // did we match the 2 capture groups?
    if (!match || match.length < 3) { return false; }

    // check it's a valid service and clean videoId
    var service = match[1];
    var videoID = match[2];
    if (!services[service.toLowerCase()]) { return false; }
    videoID = services[service.toLowerCase()].parser(videoID);

    // check we've not gone too far
    var theend = state.src.indexOf(')', start) + 1;
    if (theend > max) { return false; }

    //
    // We found the end of the link, and know for a fact it's a valid link;
    // so all that's left to do is to call tokenizer.
    //
    if (!silent) {
      var serviceStart = start + 2;
      var serviceEnd = state.md.helpers.parseLinkLabel(state, start + 1, false);
      state.pos = serviceStart;
      state.posMax = serviceEnd;

      state.service = state.src.slice(serviceStart, serviceEnd);

      var token = state.push('video', '');
      token.videoID = videoID;
      token.service = service;
      token.level = state.level;
    }

    state.pos = theend;
    state.posMax = max;

    return true;
  }

  function render_video_tokens(md, options) {
    return function(tokens, idx) {
      var videoID = md.utils.escapeHtml(tokens[idx].videoID);
      var service = md.utils.escapeHtml(tokens[idx].service).toLowerCase();
      if (videoID === '') { return ''; }

      var html = '<iframe' + iframeparams(options, service) + ' src="' + options[service].url(videoID, options) + '"';
      html += ' frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>';

      return options.plainiframe === true
        ? html : '<div class="embed-responsive embed-responsive-16by9">' + html + '</div>';
    };
  }

  function video_plugin(md, options) {
    if (options) {
      Object.keys(services).forEach(function(service) {
        if (typeof options[service] === 'undefined') {
          options[service] = services[service];
        } else {
          Object.keys(services[service]).forEach(function(property) {
            if (typeof options[service][property] === 'undefined') {
              options[service][property] = services[service][property];
            }
          });
        }
      });
    } else {
      options = services;
    }
    md.renderer.rules.video = render_video_tokens(md, options);
    md.inline.ruler.after('link', 'video', tokenize_video);
  }

  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = video_plugin;
    }
    exports.video_plugin = video_plugin;
  } else {
    self.video_plugin = video_plugin;
  }

}).call(this);

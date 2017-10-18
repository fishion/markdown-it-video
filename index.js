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


  function video_embed(md) {
    return function(state, silent) {
      var serviceEnd,
        serviceStart,
        token,
        oldPos = state.pos;

      if (state.src.charCodeAt(oldPos) !== 0x40/* @ */ ||
          state.src.charCodeAt(oldPos + 1) !== 0x5B/* [ */) {
        return false;
      }

      var EMBED = /@\[([a-zA-Z].+)\]\([\s]*(.*?)[\s]*[\)]/im;
      var match = EMBED.exec(state.src);

      if (!match || match.length < 3) {
        return false;
      }

      var service = match[1];
      var videoID = match[2];
      var serviceLower = service.toLowerCase();

      if (services[serviceLower]) {
        videoID = services[serviceLower].parser(videoID);
      } else {
        return false;
      }

      // If the videoID field is empty, regex currently make it the close parenthesis.
      if (videoID === ')') {
        videoID = '';
      }

      serviceStart = oldPos + 2;
      serviceEnd = md.helpers.parseLinkLabel(state, oldPos + 1, false);

      //
      // We found the end of the link, and know for a fact it's a valid link;
      // so all that's left to do is to call tokenizer.
      //
      if (!silent) {
        state.pos = serviceStart;
        state.posMax = serviceEnd;
        state.service = state.src.slice(serviceStart, serviceEnd);
        var newState = new state.md.inline.State(service, state.md, state.env, []);
        newState.md.inline.tokenize(newState);

        token = state.push('video', '');
        token.videoID = videoID;
        token.service = service;
        token.level = state.level;
      }

      state.pos = state.pos + state.src.indexOf(')', state.pos);
      state.posMax = state.tokens.length;
      return true;
    };
  }

  function iframeparams(options, service) {
    if (options.plainiframe) {return '';}
    return ' class="embed-responsive-item"'
      + ' id="' + service + 'player"'
      + ' type="text/html"'
      + ' width="' + options[service].options.width + '"'
      + ' height="' + options[service].options.height + '"';
  }

  function tokenize_video(md, options) {
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
    console.log(options);
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
    md.renderer.rules.video = tokenize_video(md, options);
    md.inline.ruler.before('emphasis', 'video', video_embed(md));
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

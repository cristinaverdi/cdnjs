/**
 * videojs-contrib-ads
 * @version 4.2.7
 * @copyright 2017 Brightcove
 * @license Apache-2.0
 */
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.videojsContribAds = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
'use strict';

exports.__esModule = true;
exports['default'] = cancelContentPlay;

var _window = require('global/window');

var _window2 = _interopRequireDefault(_window);

var _document = require('global/document');

var _document2 = _interopRequireDefault(_document);

var _video = (typeof window !== "undefined" ? window['videojs'] : typeof global !== "undefined" ? global['videojs'] : null);

var _video2 = _interopRequireDefault(_video);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function cancelContentPlay(player) {
  if (player.ads.cancelPlayTimeout) {
    // another cancellation is already in flight, so do nothing
    return;
  }

  // Avoid content flash on non-iPad iOS and iPhones on iOS10 with playsinline
  if (_video2['default'].browser.IS_IOS && _video2['default'].browser.IS_IPHONE && !player.el_.hasAttribute('playsinline')) {

    // The placeholder's styling should match the player's
    var width = player.currentWidth ? player.currentWidth() : player.width();
    var height = player.currentHeight ? player.currentHeight() : player.height();
    var position = _window2['default'].getComputedStyle(player.el_).position;
    var top = _window2['default'].getComputedStyle(player.el_).top;

    // A placeholder black box will be shown in the document while the player is hidden.
    var placeholder = _document2['default'].createElement('div');

    placeholder.style.width = width + 'px';
    placeholder.style.height = height + 'px';
    placeholder.style.background = 'black';
    placeholder.style.position = position;
    placeholder.style.top = top;
    player.el_.parentNode.insertBefore(placeholder, player.el_);

    // Hide the player. While in full-screen video playback mode on iOS, this
    // makes the player show a black screen instead of content flash.
    player.el_.style.display = 'none';

    // Unhide the player and remove the placeholder once we're ready to move on.
    player.one(['adstart', 'adtimeout', 'adserror', 'adscanceled', 'adskip', 'playing'], function () {
      player.el_.style.display = 'block';
      placeholder.remove();
    });

    // Detect fullscreen change, if returning from fullscreen and placeholder exists,
    // remove placeholder and show player whether or not playsinline was attached.
    player.on('fullscreenchange', function () {
      if (placeholder && !player.isFullscreen()) {
        player.el_.style.display = 'block';
        placeholder.remove();
      }
    });
  }

  // The timeout is necessary because pausing a video element while processing a `play`
  // event on iOS can cause the video element to continuously toggle between playing and
  // paused states.
  player.ads.cancelPlayTimeout = _window2['default'].setTimeout(function () {
    // deregister the cancel timeout so subsequent cancels are scheduled
    player.ads.cancelPlayTimeout = null;

    // pause playback so ads can be handled.
    if (!player.paused()) {
      player.pause();
    }

    // When the 'content-playback' state is entered, this will let us know to play
    player.ads.cancelledPlay = true;
  }, 1);
} /*
  This feature makes sure the player is paused during ad loading.
  
  It does this by pausing the player immediately after a "play" where ads will be requested,
  then signalling that we should play after the ad is done.
  */
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"global/document":8,"global/window":9}],2:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports['default'] = initializeContentupdate;

var _window = require('global/window');

var _window2 = _interopRequireDefault(_window);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

// Start sending contentupdate events
function initializeContentupdate(player) {

  // Keep track of the current content source
  // If you want to change the src of the video without triggering
  // the ad workflow to restart, you can update this variable before
  // modifying the player's source
  player.ads.contentSrc = player.currentSrc();

  // Check if a new src has been set, if so, trigger contentupdate
  var checkSrc = function checkSrc() {
    if (player.ads.state !== 'ad-playback') {
      var src = player.currentSrc();

      if (src !== player.ads.contentSrc) {
        player.trigger({
          type: 'contentupdate',
          oldValue: player.ads.contentSrc,
          newValue: src
        });
        player.ads.contentSrc = src;
      }
    }
  };

  // loadstart reliably indicates a new src has been set
  player.on('loadstart', checkSrc);
  // check immediately in case we missed the loadstart
  _window2['default'].setTimeout(checkSrc, 1);
} /*
  This feature sends a `contentupdate` event when the player source changes.
  */
},{"global/window":9}],3:[function(require,module,exports){
(function (global){
'use strict';

exports.__esModule = true;
exports.processMetadataTracks = processMetadataTracks;
exports.setMetadataTrackMode = setMetadataTrackMode;
exports.getSupportedAdCue = getSupportedAdCue;
exports.getCueId = getCueId;
exports.processAdTrack = processAdTrack;

var _video = (typeof window !== "undefined" ? window['videojs'] : typeof global !== "undefined" ? global['videojs'] : null);

var _video2 = _interopRequireDefault(_video);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
* This feature allows metadata text tracks to be manipulated once they are available,
* usually after the 'loadstart' event is observed on the player
* @param player A reference to a player
* @param processMetadataTrack A callback that performs some operations on a
* metadata text track
**/
function processMetadataTracks(player, processMetadataTrack) {
  var tracks = player.textTracks();
  var setModeAndProcess = function setModeAndProcess(track) {
    if (track.kind === 'metadata') {
      player.ads.cueTextTracks.setMetadataTrackMode(track);
      processMetadataTrack(player, track);
    }
  };

  // Text tracks are available
  if (tracks.length > 0) {
    for (var i = 0; i < tracks.length; i++) {
      var track = tracks[i];

      setModeAndProcess(track);
    }
    // Wait until text tracks are added
    // We avoid always setting the event handler in case
    // integrations decide to handle this separately
    // with a different handler for the same event
  } else {
    tracks.addEventListener('addtrack', function (event) {
      var track = event.track;

      setModeAndProcess(track);
    });
  }
}

/**
* Sets the track mode to one of 'disabled', 'hidden' or 'showing'
* @see https://github.com/videojs/video.js/blob/master/docs/guides/text-tracks.md
* Default behavior is to do nothing, @override if this is not desired
* @param track The text track to set the mode on
*/
/**
* This feature allows metadata text tracks to be manipulated once available
* @see processMetadataTracks.
* It also allows ad implementations to leverage ad cues coming through
* text tracks, @see processAdTrack
**/

function setMetadataTrackMode(track) {
  return;
}

/**
* Determines whether cue is an ad cue and returns the cue data.
* @param player A reference to the player
* @param cue The cue to be checked
* Returns the given cue by default @override if futher processing is required
* @return the cueData in JSON if cue is a supported ad cue, or -1 if not
**/
function getSupportedAdCue(player, cue) {
  return cue;
}

/**
* Gets the id associated with a cue.
* @param cue The cue to extract an ID from
* @returns The first occurance of 'id' in the object,
* @override if this is not the desired cue id
**/
function getCueId(player, cue) {
  return cue.id;
}

/**
* Checks whether a cue has already been used
* @param cueId The Id associated with a cue
**/
var cueAlreadySeen = function cueAlreadySeen(player, cueId) {
  return cueId !== undefined && player.ads.includedCues[cueId];
};

/**
* Indicates that a cue has been used
* @param cueId The Id associated with a cue
**/
var setCueAlreadySeen = function setCueAlreadySeen(player, cueId) {
  if (cueId !== undefined && cueId !== '') {
    player.ads.includedCues[cueId] = true;
  }
};

/**
* This feature allows ad metadata tracks to be manipulated in ad implementations
* @param player A reference to the player
* @param cues The set of cues to work with
* @param processCue A method that uses a cue to make some
* ad request in the ad implementation
* @param [cancelAds] A method that dynamically cancels ads in the ad implementation
**/
function processAdTrack(player, cues, processCue, cancelAds) {
  player.ads.includedCues = {};

  // loop over set of cues
  for (var i = 0; i < cues.length; i++) {
    var cue = cues[i];
    var cueData = this.getSupportedAdCue(player, cue);

    // Exit if this is not a supported cue
    if (cueData === -1) {
      _video2['default'].log.warn('Skipping as this is not a supported ad cue.', cue);
      return;
    }

    // Continue processing supported cue
    var cueId = this.getCueId(player, cue);
    var startTime = cue.startTime;

    // Skip ad if cue was already used
    if (cueAlreadySeen(player, cueId)) {
      _video2['default'].log('Skipping ad already seen with ID ' + cueId);
      return;
    }

    // Process cue as an ad cue
    processCue(player, cueData, cueId, startTime);

    // Indicate that this cue has been used
    setCueAlreadySeen(player, cueId);

    // Optional dynamic ad cancellation
    if (cancelAds !== undefined) {
      cancelAds(player, cueData);
    }
  }
}
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],4:[function(require,module,exports){
(function (global){
'use strict';

exports.__esModule = true;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; /*
                                                                                                                                                                                                                                                                              This feature provides an optional method for ad integrations to insert run-time values
                                                                                                                                                                                                                                                                              into an ad server URL or configuration.
                                                                                                                                                                                                                                                                              */

exports['default'] = adMacroReplacement;

var _window = require('global/window');

var _window2 = _interopRequireDefault(_window);

var _document = require('global/document');

var _document2 = _interopRequireDefault(_document);

var _video = (typeof window !== "undefined" ? window['videojs'] : typeof global !== "undefined" ? global['videojs'] : null);

var _video2 = _interopRequireDefault(_video);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

// Return URI encoded version of value if uriEncode is true
var uriEncodeIfNeeded = function uriEncodeIfNeeded(value, uriEncode) {
  if (uriEncode) {
    return encodeURIComponent(value);
  }
  return value;
};

// Add custom field macros to macros object
// based on given name for custom fields property of mediainfo object.
var customFields = function customFields(mediainfo, macros, customFieldsName) {
  if (mediainfo && mediainfo[customFieldsName]) {
    var fields = mediainfo[customFieldsName];
    var fieldNames = Object.keys(fields);

    for (var i = 0; i < fieldNames.length; i++) {
      var tag = '{mediainfo.' + customFieldsName + '.' + fieldNames[i] + '}';

      macros[tag] = fields[fieldNames[i]];
    }
  }
};

// Public method that integrations use for ad macros.
// "string" is any string with macros to be replaced
// "uriEncode" if true will uri encode macro values when replaced
// "customMacros" is a object with custom macros and values to map them to
//  - For example: {'{five}': 5}
// Return value is is "string" with macros replaced
//  - For example: adMacroReplacement('{player.id}') returns a string of the player id
function adMacroReplacement(string, uriEncode, customMacros) {

  if (uriEncode === undefined) {
    uriEncode = false;
  }

  var macros = {};

  if (customMacros !== undefined) {
    macros = customMacros;
  }

  // Static macros
  macros['{player.id}'] = this.options_['data-player'];
  macros['{mediainfo.id}'] = this.mediainfo ? this.mediainfo.id : '';
  macros['{mediainfo.name}'] = this.mediainfo ? this.mediainfo.name : '';
  macros['{mediainfo.description}'] = this.mediainfo ? this.mediainfo.description : '';
  macros['{mediainfo.tags}'] = this.mediainfo ? this.mediainfo.tags : '';
  macros['{mediainfo.reference_id}'] = this.mediainfo ? this.mediainfo.reference_id : '';
  macros['{mediainfo.duration}'] = this.mediainfo ? this.mediainfo.duration : '';
  macros['{mediainfo.ad_keys}'] = this.mediainfo ? this.mediainfo.ad_keys : '';
  macros['{player.duration}'] = this.duration();
  macros['{timestamp}'] = new Date().getTime();
  macros['{document.referrer}'] = _document2['default'].referrer;
  macros['{window.location.href}'] = _window2['default'].location.href;
  macros['{random}'] = Math.floor(Math.random() * 1000000000000);

  // Custom fields in mediainfo
  customFields(this.mediainfo, macros, 'custom_fields');
  customFields(this.mediainfo, macros, 'customFields');

  // Go through all the replacement macros and apply them to the string.
  // This will replace all occurrences of the replacement macros.
  for (var i in macros) {
    string = string.split(i).join(uriEncodeIfNeeded(macros[i], uriEncode));
  }

  // Page variables
  string = string.replace(/{pageVariable\.([^}]+)}/g, function (match, name) {
    var value = void 0;
    var context = _window2['default'];
    var names = name.split('.');

    // Iterate down multiple levels of selector without using eval
    // This makes things like pageVariable.foo.bar work
    for (var _i = 0; _i < names.length; _i++) {
      if (_i === names.length - 1) {
        value = context[names[_i]];
      } else {
        context = context[names[_i]];
      }
    }

    var type = typeof value === 'undefined' ? 'undefined' : _typeof(value);

    // Only allow certain types of values. Anything else is probably a mistake.
    if (value === null) {
      return 'null';
    } else if (value === undefined) {
      _video2['default'].log.warn('Page variable "' + name + '" not found');
      return '';
    } else if (type !== 'string' && type !== 'number' && type !== 'boolean') {
      _video2['default'].log.warn('Page variable "' + name + '" is not a supported type');
      return '';
    }

    return uriEncodeIfNeeded(String(value), uriEncode);
  });

  return string;
}
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"global/document":8,"global/window":9}],5:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports['default'] = redispatch;
/*
The goal of this feature is to make player events work as an integrator would
expect despite the presense of ads. For example, an integrator would expect
an `ended` event to happen once the content is ended. If an `ended` event is sent
as a result of an ad ending, that is a bug. The `redispatch` method should recognize
such `ended` events and prefix them so they are sent as `adended`, and so on with
all other player events.
*/

// Stop propogation for an event
var cancelEvent = function cancelEvent(player, event) {
  // Pretend we called stopImmediatePropagation because we want the native
  // element events to continue propagating
  event.isImmediatePropagationStopped = function () {
    return true;
  };
  event.cancelBubble = true;
  event.isPropagationStopped = function () {
    return true;
  };
};

// Stop propogation for an event, then send a new event with the type of the original
// event with the given prefix added.
var prefixEvent = function prefixEvent(player, prefix, event) {
  cancelEvent(player, event);
  player.trigger({
    type: prefix + event.type,
    state: player.ads.state,
    originalEvent: event
  });
};

// Handle a player event, either by redispatching it with a prefix, or by
// letting it go on its way without any meddling.
function redispatch(event) {

  // We do a quick play/pause before we check for prerolls. This creates a "playing"
  // event. This conditional block prefixes that event so it's "adplaying" if it
  // happens while we're in the "preroll?" state. Not every browser is in the
  // "preroll?" state for this event, so the following browsers come through here:
  //  * iPad
  //  * iPhone
  //  * Android
  //  * Safari
  // This is too soon to check videoElementRecycled because there is no snapshot
  // yet. We rely on the coincidence that all browsers for which
  // videoElementRecycled would be true also happen to send their initial playing
  // event during "preroll?"
  if (event.type === 'playing' && this.ads.state === 'preroll?') {
    prefixEvent(this, 'ad', event);

    // Here we send "adplaying" for browsers that send their initial "playing" event
    // (caused by the the initial play/pause) during the "ad-playback" state.
    // The following browsers come through here:
    // * Chrome
    // * IE11
    // If the ad plays in the content tech (aka videoElementRecycled) there will be
    // another playing event when the ad starts. We check videoElementRecycled to
    // avoid a second adplaying event. Thankfully, at this point a snapshot exists
    // so we can safely check videoElementRecycled.
  } else if (event.type === 'playing' && this.ads.state === 'ad-playback' && !this.ads.videoElementRecycled()) {
    prefixEvent(this, 'ad', event);

    // If the ad takes a long time to load, "playing" caused by play/pause can happen
    // during "ads-ready?" instead of "preroll?" or "ad-playback", skipping the
    // other conditions that would normally catch it
  } else if (event.type === 'playing' && this.ads.state === 'ads-ready?') {
    prefixEvent(this, 'ad', event);

    // When an ad is playing in content tech, we would normally prefix
    // "playing" with "ad" to send "adplaying". However, when we did a play/pause
    // before the preroll, we already sent "adplaying". This condition prevents us
    // from sending another.
  } else if (event.type === 'playing' && this.ads.state === 'ad-playback' && this.ads.videoElementRecycled()) {
    cancelEvent(this, event);
    return;

    // When ad is playing in content tech, prefix everything with "ad".
    // This block catches many events such as emptied, play, timeupdate, and ended.
  } else if (this.ads.state === 'ad-playback') {
    if (this.ads.videoElementRecycled() || this.ads.stitchedAds()) {
      prefixEvent(this, 'ad', event);
    }

    // Send contentended if ended happens during content.
    // We will make sure an ended event is sent after postrolls.
  } else if (this.ads.state === 'content-playback' && event.type === 'ended') {
    prefixEvent(this, 'content', event);

    // Event prefixing during content resuming is complicated
  } else if (this.ads.state === 'content-resuming') {

    // This does not happen during normal circumstances. I wasn't able to reproduce
    // it, but the working theory is that it handles cases where restoring the
    // snapshot takes a long time, such as in iOS7 and older Firefox.
    if (this.ads.snapshot && this.currentSrc() !== this.ads.snapshot.currentSrc) {

      // Don't prefix `loadstart` event
      if (event.type === 'loadstart') {
        return;
      }

      // All other events get "content" prefix
      return prefixEvent(this, 'content', event);

      // Content resuming after postroll
    } else if (this.ads.snapshot && this.ads.snapshot.ended) {

      // Don't prefix `pause` and `ended` events
      // They don't always happen during content-resuming, but they might.
      // It seems to happen most often on iOS and Android.
      if (event.type === 'pause' || event.type === 'ended') {
        return;
      }

      // All other events get "content" prefix
      return prefixEvent(this, 'content', event);
    }

    // Content resuming after preroll or midroll
    // Events besides "playing" get "content" prefix
    if (event.type !== 'playing') {
      prefixEvent(this, 'content', event);
    }
  }
}
},{}],6:[function(require,module,exports){
(function (global){
'use strict';

exports.__esModule = true;
exports.getPlayerSnapshot = getPlayerSnapshot;
exports.restorePlayerSnapshot = restorePlayerSnapshot;

var _window = require('global/window');

var _window2 = _interopRequireDefault(_window);

var _video = (typeof window !== "undefined" ? window['videojs'] : typeof global !== "undefined" ? global['videojs'] : null);

var _video2 = _interopRequireDefault(_video);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * Returns an object that captures the portions of player state relevant to
 * video playback. The result of this function can be passed to
 * restorePlayerSnapshot with a player to return the player to the state it
 * was in when this function was invoked.
 * @param {Object} player The videojs player object
 */
/*
The snapshot feature is responsible for saving the player state before an ad, then
restoring the player state after an ad.
*/

function getPlayerSnapshot(player) {

  var currentTime = void 0;

  if (_video2['default'].browser.IS_IOS && player.ads.isLive(player)) {
    // Record how far behind live we are
    if (player.seekable().length > 0) {
      currentTime = player.currentTime() - player.seekable().end(0);
    } else {
      currentTime = player.currentTime();
    }
  } else {
    currentTime = player.currentTime();
  }

  var tech = player.$('.vjs-tech');
  var remoteTracks = player.remoteTextTracks ? player.remoteTextTracks() : [];
  var tracks = player.textTracks ? player.textTracks() : [];
  var suppressedRemoteTracks = [];
  var suppressedTracks = [];
  var snapshotObject = {
    ended: player.ended(),
    currentSrc: player.currentSrc(),
    src: player.tech_.src(),
    currentTime: currentTime,
    type: player.currentType()
  };

  if (tech) {
    snapshotObject.nativePoster = tech.poster;
    snapshotObject.style = tech.getAttribute('style');
  }

  for (var i = 0; i < remoteTracks.length; i++) {
    var track = remoteTracks[i];

    suppressedRemoteTracks.push({
      track: track,
      mode: track.mode
    });
    track.mode = 'disabled';
  }
  snapshotObject.suppressedRemoteTracks = suppressedRemoteTracks;

  for (var _i = 0; _i < tracks.length; _i++) {
    var _track = tracks[_i];

    suppressedTracks.push({
      track: _track,
      mode: _track.mode
    });
    _track.mode = 'disabled';
  }
  snapshotObject.suppressedTracks = suppressedTracks;

  return snapshotObject;
}

/**
 * Attempts to modify the specified player so that its state is equivalent to
 * the state of the snapshot.
 * @param {Object} player - the videojs player object
 * @param {Object} snapshotObject - the player state to apply
 */
function restorePlayerSnapshot(player, snapshotObject) {

  if (player.ads.disableNextSnapshotRestore === true) {
    player.ads.disableNextSnapshotRestore = false;
    return;
  }

  // The playback tech
  var tech = player.$('.vjs-tech');

  // the number of[ remaining attempts to restore the snapshot
  var attempts = 20;

  var suppressedRemoteTracks = snapshotObject.suppressedRemoteTracks;
  var suppressedTracks = snapshotObject.suppressedTracks;
  var trackSnapshot = void 0;
  var restoreTracks = function restoreTracks() {
    for (var i = 0; i < suppressedRemoteTracks.length; i++) {
      trackSnapshot = suppressedRemoteTracks[i];
      trackSnapshot.track.mode = trackSnapshot.mode;
    }

    for (var _i2 = 0; _i2 < suppressedTracks.length; _i2++) {
      trackSnapshot = suppressedTracks[_i2];
      trackSnapshot.track.mode = trackSnapshot.mode;
    }
  };

  // finish restoring the playback state
  var resume = function resume() {
    var currentTime = void 0;

    if (_video2['default'].browser.IS_IOS && player.ads.isLive(player)) {
      if (snapshotObject.currentTime < 0) {
        // Playback was behind real time, so seek backwards to match
        if (player.seekable().length > 0) {
          currentTime = player.seekable().end(0) + snapshotObject.currentTime;
        } else {
          currentTime = player.currentTime();
        }
        player.currentTime(currentTime);
      }
    } else if (snapshotObject.ended) {
      player.currentTime(player.duration());
    } else {
      player.currentTime(snapshotObject.currentTime);
    }

    // Resume playback if this wasn't a postroll
    if (!snapshotObject.ended) {
      player.play();
    }
  };

  // determine if the video element has loaded enough of the snapshot source
  // to be ready to apply the rest of the state
  var tryToResume = function tryToResume() {

    // tryToResume can either have been called through the `contentcanplay`
    // event or fired through setTimeout.
    // When tryToResume is called, we should make sure to clear out the other
    // way it could've been called by removing the listener and clearing out
    // the timeout.
    player.off('contentcanplay', tryToResume);
    if (player.ads.tryToResumeTimeout_) {
      player.clearTimeout(player.ads.tryToResumeTimeout_);
      player.ads.tryToResumeTimeout_ = null;
    }

    // Tech may have changed depending on the differences in sources of the
    // original video and that of the ad
    tech = player.el().querySelector('.vjs-tech');

    if (tech.readyState > 1) {
      // some browsers and media aren't "seekable".
      // readyState greater than 1 allows for seeking without exceptions
      return resume();
    }

    if (tech.seekable === undefined) {
      // if the tech doesn't expose the seekable time ranges, try to
      // resume playback immediately
      return resume();
    }

    if (tech.seekable.length > 0) {
      // if some period of the video is seekable, resume playback
      return resume();
    }

    // delay a bit and then check again unless we're out of attempts
    if (attempts--) {
      _window2['default'].setTimeout(tryToResume, 50);
    } else {
      try {
        resume();
      } catch (e) {
        _video2['default'].log.warn('Failed to resume the content after an advertisement', e);
      }
    }
  };

  if (snapshotObject.nativePoster) {
    tech.poster = snapshotObject.nativePoster;
  }

  if ('style' in snapshotObject) {
    // overwrite all css style properties to restore state precisely
    tech.setAttribute('style', snapshotObject.style || '');
  }

  // Determine whether the player needs to be restored to its state
  // before ad playback began. With a custom ad display or burned-in
  // ads, the content player state hasn't been modified and so no
  // restoration is required

  if (player.ads.videoElementRecycled()) {
    // on ios7, fiddling with textTracks too early will cause safari to crash
    player.one('contentloadedmetadata', restoreTracks);

    // if the src changed for ad playback, reset it
    player.src({ src: snapshotObject.currentSrc, type: snapshotObject.type });
    // safari requires a call to `load` to pick up a changed source
    player.load();
    // and then resume from the snapshots time once the original src has loaded
    // in some browsers (firefox) `canplay` may not fire correctly.
    // Reace the `canplay` event with a timeout.
    player.one('contentcanplay', tryToResume);
    player.ads.tryToResumeTimeout_ = player.setTimeout(tryToResume, 2000);
  } else if (!player.ended() || !snapshotObject.ended) {
    // if we didn't change the src, just restore the tracks
    restoreTracks();
    // the src didn't change and this wasn't a postroll
    // just resume playback at the current time.
    player.play();
  }
}
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"global/window":9}],7:[function(require,module,exports){

},{}],8:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"min-document":7}],9:[function(require,module,exports){
(function (global){
if (typeof window !== "undefined") {
    module.exports = window;
} else if (typeof global !== "undefined") {
    module.exports = global;
} else if (typeof self !== "undefined"){
    module.exports = self;
} else {
    module.exports = {};
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],10:[function(require,module,exports){
(function (global){
'use strict';

var _window = require('global/window');

var _window2 = _interopRequireDefault(_window);

var _video = (typeof window !== "undefined" ? window['videojs'] : typeof global !== "undefined" ? global['videojs'] : null);

var _video2 = _interopRequireDefault(_video);

var _redispatch = require('./redispatch.js');

var _redispatch2 = _interopRequireDefault(_redispatch);

var _snapshot = require('./snapshot.js');

var snapshot = _interopRequireWildcard(_snapshot);

var _contentupdate = require('./contentupdate.js');

var _contentupdate2 = _interopRequireDefault(_contentupdate);

var _cancelContentPlay = require('./cancelContentPlay.js');

var _cancelContentPlay2 = _interopRequireDefault(_cancelContentPlay);

var _macros = require('./macros.js');

var _macros2 = _interopRequireDefault(_macros);

var _cueTextTracks = require('./cueTextTracks.js');

var cueTextTracks = _interopRequireWildcard(_cueTextTracks);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/*
This main plugin file is responsible for integration logic and enabling the features
that live in in separate files.
*/

var VIDEO_EVENTS = _video2['default'].getTech('Html5').Events;

/**
 * Remove the poster attribute from the video element tech, if present. When
 * reusing a video element for multiple videos, the poster image will briefly
 * reappear while the new source loads. Removing the attribute ahead of time
 * prevents the poster from showing up between videos.
 *
 * @param {Object} player The videojs player object
 */
var removeNativePoster = function removeNativePoster(player) {
  var tech = player.$('.vjs-tech');

  if (tech) {
    tech.removeAttribute('poster');
  }
};

// ---------------------------------------------------------------------------
// Ad Framework
// ---------------------------------------------------------------------------

// default framework settings
var defaults = {
  // maximum amount of time in ms to wait to receive `adsready` from the ad
  // implementation after play has been requested. Ad implementations are
  // expected to load any dynamic libraries and make any requests to determine
  // ad policies for a video during this time.
  timeout: 5000,

  // maximum amount of time in ms to wait for the ad implementation to start
  // linear ad mode after `readyforpreroll` has fired. This is in addition to
  // the standard timeout.
  prerollTimeout: 100,

  // maximum amount of time in ms to wait for the ad implementation to start
  // linear ad mode after `contentended` has fired.
  postrollTimeout: 100,

  // when truthy, instructs the plugin to output additional information about
  // plugin state to the video.js log. On most devices, the video.js log is
  // the same as the developer console.
  debug: false,

  // set this to true when using ads that are part of the content video
  stitchedAds: false
};

var contribAdsPlugin = function contribAdsPlugin(options) {

  var player = this; // eslint-disable-line consistent-this

  var settings = _video2['default'].mergeOptions(defaults, options);

  // prefix all video element events during ad playback
  // if the video element emits ad-related events directly,
  // plugins that aren't ad-aware will break. prefixing allows
  // plugins that wish to handle ad events to do so while
  // avoiding the complexity for common usage
  var videoEvents = VIDEO_EVENTS.concat(['firstplay', 'loadedalldata', 'playing']);

  // Set up redispatching of player events
  player.on(videoEvents, _redispatch2['default']);

  // "vjs-has-started" should be present at the end of a video. This makes sure it's
  // always there.
  player.on('ended', function () {
    if (!player.hasClass('vjs-has-started')) {
      player.addClass('vjs-has-started');
    }
  });

  // We now auto-play when an ad gets loaded if we're playing ads in the same video
  // element as the content.
  // The problem is that in IE11, we cannot play in addurationchange but in iOS8, we
  // cannot play from adcanplay.
  // This will prevent ad-integrations from needing to do this themselves.
  player.on(['addurationchange', 'adcanplay'], function () {
    if (player.currentSrc() === player.ads.snapshot.currentSrc) {
      return;
    }

    player.play();
  });

  player.on('nopreroll', function () {
    player.ads.nopreroll_ = true;
  });

  player.on('nopostroll', function () {
    player.ads.nopostroll_ = true;
  });

  // Remove ad-loading class when ad plays or when content plays (in case there was no ad)
  // If you remove this class too soon you can get a flash of content!
  player.on(['ads-ad-started', 'playing'], function () {
    player.removeClass('vjs-ad-loading');
  });

  // Replace the plugin constructor with the ad namespace
  player.ads = {
    state: 'content-set',
    disableNextSnapshotRestore: false,

    // This is set to true if the content has ended once. After that, the user can
    // seek backwards and replay content, but _contentHasEnded remains true.
    _contentHasEnded: false,

    // This is an estimation of the current ad type being played
    // This is experimental currently. Do not rely on its presence or behavior!
    adType: null,

    VERSION: '4.2.7',

    reset: function reset() {
      player.ads.disableNextSnapshotRestore = false;
      player.ads._contentHasEnded = false;
      player.ads.snapshot = null;
      player.ads.adType = null;
    },


    // Call this when an ad response has been received and there are
    // linear ads ready to be played.
    startLinearAdMode: function startLinearAdMode() {
      if (player.ads.state === 'preroll?' || player.ads.state === 'content-playback' || player.ads.state === 'postroll?') {
        player.trigger('adstart');
      }
    },


    // Call this when a linear ad pod has finished playing.
    endLinearAdMode: function endLinearAdMode() {
      if (player.ads.state === 'ad-playback') {
        player.trigger('adend');
        // In the case of an empty ad response, we want to make sure that
        // the vjs-ad-loading class is always removed. We could probably check for
        // duration on adPlayer for an empty ad but we remove it here just to make sure
        player.removeClass('vjs-ad-loading');
      }
    },


    // Call this when an ad response has been received but there are no
    // linear ads to be played (i.e. no ads available, or overlays).
    // This has no effect if we are already in a linear ad mode.  Always
    // use endLinearAdMode() to exit from linear ad-playback state.
    skipLinearAdMode: function skipLinearAdMode() {
      if (player.ads.state !== 'ad-playback') {
        player.trigger('adskip');
      }
    },
    stitchedAds: function stitchedAds(arg) {
      if (arg !== undefined) {
        this._stitchedAds = !!arg;
      }
      return this._stitchedAds;
    },


    // Returns whether the video element has been modified since the
    // snapshot was taken.
    // We test both src and currentSrc because changing the src attribute to a URL that
    // AdBlocker is intercepting doesn't update currentSrc.
    videoElementRecycled: function videoElementRecycled() {
      if (player.ads.shouldPlayContentBehindAd(player)) {
        return false;
      }

      if (!this.snapshot) {
        throw new Error('You cannot use videoElementRecycled while there is no snapshot.');
      }

      var srcChanged = player.tech_.src() !== this.snapshot.src;
      var currentSrcChanged = player.currentSrc() !== this.snapshot.currentSrc;

      return srcChanged || currentSrcChanged;
    },


    // Returns a boolean indicating if given player is in live mode.
    // Can be replaced when this is fixed: https://github.com/videojs/video.js/issues/3262
    isLive: function isLive(somePlayer) {
      if (somePlayer.duration() === Infinity) {
        return true;
      } else if (_video2['default'].browser.IOS_VERSION === '8' && somePlayer.duration() === 0) {
        return true;
      }
      return false;
    },


    // Return true if content playback should mute and continue during ad breaks.
    // This is only done during live streams on platforms where it's supported.
    // This improves speed and accuracy when returning from an ad break.
    shouldPlayContentBehindAd: function shouldPlayContentBehindAd(somePlayer) {
      return !_video2['default'].browser.IS_IOS && !_video2['default'].browser.IS_ANDROID && somePlayer.duration() === Infinity;
    }
  };

  player.ads.stitchedAds(settings.stitchedAds);

  player.ads.cueTextTracks = cueTextTracks;
  player.ads.adMacroReplacement = _macros2['default'].bind(player);

  // Start sending contentupdate events for this player
  (0, _contentupdate2['default'])(player);

  // Global contentupdate handler for resetting plugin state
  player.on('contentupdate', player.ads.reset);

  // Ad Playback State Machine
  var states = {
    'content-set': {
      events: {
        adscanceled: function adscanceled() {
          this.state = 'content-playback';
        },
        adsready: function adsready() {
          this.state = 'ads-ready';
        },
        play: function play() {
          this.state = 'ads-ready?';
          (0, _cancelContentPlay2['default'])(player);
          // remove the poster so it doesn't flash between videos
          removeNativePoster(player);
        },
        adserror: function adserror() {
          this.state = 'content-playback';
        },
        adskip: function adskip() {
          this.state = 'content-playback';
        }
      }
    },
    'ads-ready': {
      events: {
        play: function play() {
          this.state = 'preroll?';
          (0, _cancelContentPlay2['default'])(player);
        },
        adskip: function adskip() {
          this.state = 'content-playback';
        },
        adserror: function adserror() {
          this.state = 'content-playback';
        }
      }
    },
    'preroll?': {
      enter: function enter() {
        if (player.ads.nopreroll_) {
          // This will start the ads manager in case there are later ads
          player.trigger('readyforpreroll');

          // If we don't wait a tick, entering content-playback will cancel
          // cancelPlayTimeout, causing the video to not pause for the ad
          _window2['default'].setTimeout(function () {
            // Don't wait for a preroll
            player.trigger('nopreroll');
          }, 1);
        } else {
          // change class to show that we're waiting on ads
          player.addClass('vjs-ad-loading');
          // schedule an adtimeout event to fire if we waited too long
          player.ads.adTimeoutTimeout = _window2['default'].setTimeout(function () {
            player.trigger('adtimeout');
          }, settings.prerollTimeout);
          // signal to ad plugin that it's their opportunity to play a preroll
          player.trigger('readyforpreroll');
        }
      },
      leave: function leave() {
        _window2['default'].clearTimeout(player.ads.adTimeoutTimeout);
      },

      events: {
        play: function play() {
          (0, _cancelContentPlay2['default'])(player);
        },
        adstart: function adstart() {
          this.state = 'ad-playback';
          player.ads.adType = 'preroll';
        },
        adskip: function adskip() {
          this.state = 'content-playback';
        },
        adtimeout: function adtimeout() {
          this.state = 'content-playback';
        },
        adserror: function adserror() {
          this.state = 'content-playback';
        },
        nopreroll: function nopreroll() {
          this.state = 'content-playback';
        }
      }
    },
    'ads-ready?': {
      enter: function enter() {
        player.addClass('vjs-ad-loading');
        player.ads.adTimeoutTimeout = _window2['default'].setTimeout(function () {
          player.trigger('adtimeout');
        }, settings.timeout);
      },
      leave: function leave() {
        _window2['default'].clearTimeout(player.ads.adTimeoutTimeout);
        player.removeClass('vjs-ad-loading');
      },

      events: {
        play: function play() {
          (0, _cancelContentPlay2['default'])(player);
        },
        adscanceled: function adscanceled() {
          this.state = 'content-playback';
        },
        adsready: function adsready() {
          this.state = 'preroll?';
        },
        adskip: function adskip() {
          this.state = 'content-playback';
        },
        adtimeout: function adtimeout() {
          this.state = 'content-playback';
        },
        adserror: function adserror() {
          this.state = 'content-playback';
        }
      }
    },
    'ad-playback': {
      enter: function enter() {
        // capture current player state snapshot (playing, currentTime, src)
        if (!player.ads.shouldPlayContentBehindAd(player)) {
          this.snapshot = snapshot.getPlayerSnapshot(player);
        }

        // Mute the player behind the ad
        if (player.ads.shouldPlayContentBehindAd(player)) {
          this.preAdVolume_ = player.volume();
          player.volume(0);
        }

        // add css to the element to indicate and ad is playing.
        player.addClass('vjs-ad-playing');

        // We should remove the vjs-live class if it has been added in order to
        // show the adprogress control bar on Android devices for falsely
        // determined LIVE videos due to the duration incorrectly reported as Infinity
        if (player.hasClass('vjs-live')) {
          player.removeClass('vjs-live');
        }

        // remove the poster so it doesn't flash between ads
        removeNativePoster(player);

        // We no longer need to supress play events once an ad is playing.
        // Clear it if we were.
        if (player.ads.cancelPlayTimeout) {
          // If we don't wait a tick, we could cancel the pause for cancelContentPlay,
          // resulting in content playback behind the ad
          _window2['default'].setTimeout(function () {
            _window2['default'].clearTimeout(player.ads.cancelPlayTimeout);
            player.ads.cancelPlayTimeout = null;
          }, 1);
        }
      },
      leave: function leave() {
        player.removeClass('vjs-ad-playing');

        // We should add the vjs-live class back if the video is a LIVE video
        // If we dont do this, then for a LIVE Video, we will get an incorrect
        // styled control, which displays the time for the video
        if (player.ads.isLive(player)) {
          player.addClass('vjs-live');
        }
        if (!player.ads.shouldPlayContentBehindAd(player)) {
          snapshot.restorePlayerSnapshot(player, this.snapshot);
        }

        // Reset the volume to pre-ad levels
        if (player.ads.shouldPlayContentBehindAd(player)) {
          player.volume(this.preAdVolume_);
        }
      },

      events: {
        adend: function adend() {
          this.state = 'content-resuming';
          player.ads.adType = null;
        },
        adserror: function adserror() {
          this.state = 'content-resuming';
          // Trigger 'adend' to notify that we are exiting 'ad-playback'
          player.trigger('adend');
        }
      }
    },
    'content-resuming': {
      enter: function enter() {
        if (this._contentHasEnded) {
          _window2['default'].clearTimeout(player.ads._fireEndedTimeout);
          // in some cases, ads are played in a swf or another video element
          // so we do not get an ended event in this state automatically.
          // If we don't get an ended event we can use, we need to trigger
          // one ourselves or else we won't actually ever end the current video.
          player.ads._fireEndedTimeout = _window2['default'].setTimeout(function () {
            player.trigger('ended');
          }, 1000);
        }
      },
      leave: function leave() {
        _window2['default'].clearTimeout(player.ads._fireEndedTimeout);
      },

      events: {
        contentupdate: function contentupdate() {
          this.state = 'content-set';
        },


        // This is for stitched ads only.
        contentresumed: function contentresumed() {
          this.state = 'content-playback';
        },
        playing: function playing() {
          this.state = 'content-playback';
        },
        ended: function ended() {
          this.state = 'content-playback';
        }
      }
    },
    'postroll?': {
      enter: function enter() {
        this.snapshot = snapshot.getPlayerSnapshot(player);
        if (player.ads.nopostroll_) {
          _window2['default'].setTimeout(function () {
            // content-resuming happens after the timeout for backward-compatibility
            // with plugins that relied on a postrollTimeout before nopostroll was
            // implemented
            player.ads.state = 'content-resuming';
            player.trigger('ended');
          }, 1);
        } else {
          player.addClass('vjs-ad-loading');

          player.ads.adTimeoutTimeout = _window2['default'].setTimeout(function () {
            player.trigger('adtimeout');
          }, settings.postrollTimeout);
        }
      },
      leave: function leave() {
        _window2['default'].clearTimeout(player.ads.adTimeoutTimeout);
        player.removeClass('vjs-ad-loading');
      },

      events: {
        adstart: function adstart() {
          this.state = 'ad-playback';
          player.ads.adType = 'postroll';
        },
        adskip: function adskip() {
          this.state = 'content-resuming';
          _window2['default'].setTimeout(function () {
            player.trigger('ended');
          }, 1);
        },
        adtimeout: function adtimeout() {
          this.state = 'content-resuming';
          _window2['default'].setTimeout(function () {
            player.trigger('ended');
          }, 1);
        },
        adserror: function adserror() {
          this.state = 'content-resuming';
          _window2['default'].setTimeout(function () {
            player.trigger('ended');
          }, 1);
        },
        contentupdate: function contentupdate() {
          this.state = 'ads-ready?';
        }
      }
    },
    'content-playback': {
      enter: function enter() {
        // make sure that any cancelPlayTimeout is cleared
        if (player.ads.cancelPlayTimeout) {
          _window2['default'].clearTimeout(player.ads.cancelPlayTimeout);
          player.ads.cancelPlayTimeout = null;
        }

        // This was removed because now that "playing" is fixed to only play after
        // preroll, any integration should just use the "playing" event. However,
        // we found out some 3rd party code relied on this event, so we've temporarily
        // added it back in to give people more time to update their code.
        player.trigger({
          type: 'contentplayback',
          triggerevent: player.ads.triggerevent
        });

        // Play the content
        if (player.ads.cancelledPlay) {
          player.ads.cancelledPlay = false;
          if (player.paused()) {
            player.play();
          }
        }
      },

      events: {
        // In the case of a timeout, adsready might come in late.
        // This assumes the behavior that if an ad times out, it could still
        // interrupt the content and start playing. An integration could
        // still decide to behave otherwise.
        adsready: function adsready() {
          player.trigger('readyforpreroll');
        },
        adstart: function adstart() {
          this.state = 'ad-playback';
          // This is a special case in which preroll is specifically set
          if (player.ads.adType !== 'preroll') {
            player.ads.adType = 'midroll';
          }
        },
        contentupdate: function contentupdate() {
          // We know sources have changed, so we call CancelContentPlay
          // to avoid playback of video in the background of an ad. Playback Occurs on
          // Android devices if we do not call cancelContentPlay. This is because
          // the sources do not get updated in time on Android due to timing issues.
          // So instead of checking if the sources have changed in the play handler
          // and calling cancelContentPlay() there we call it here.
          // This does not happen on Desktop as the sources do get updated in time.
          if (!player.ads.shouldPlayContentBehindAd(player)) {
            (0, _cancelContentPlay2['default'])(player);
          }
          if (player.paused()) {
            this.state = 'content-set';
          } else {
            this.state = 'ads-ready?';
          }
        },
        contentended: function contentended() {

          // If _contentHasEnded is true it means we already checked for postrolls and
          // played postrolls if needed, so now we're ready to send an ended event
          if (this._contentHasEnded) {
            // Causes ended event to trigger in content-resuming.enter.
            // From there, the ended event event is not redispatched.
            // Then we end up back in content-playback state.
            this.state = 'content-resuming';
            return;
          }

          this._contentHasEnded = true;
          this.state = 'postroll?';
        }
      }
    }
  };

  var processEvent = function processEvent(event) {

    var state = player.ads.state;

    // Execute the current state's handler for this event
    var eventHandlers = states[state].events;

    if (eventHandlers) {
      var handler = eventHandlers[event.type];

      if (handler) {
        handler.apply(player.ads);
      }
    }

    // If the state has changed...
    if (state !== player.ads.state) {
      var previousState = state;
      var newState = player.ads.state;

      // Record the event that caused the state transition
      player.ads.triggerevent = event.type;

      // Execute "leave" method for the previous state
      if (states[previousState].leave) {
        states[previousState].leave.apply(player.ads);
      }

      // Execute "enter" method for the new state
      if (states[newState].enter) {
        states[newState].enter.apply(player.ads);
      }

      // Debug log message for state changes
      if (settings.debug) {
        _video2['default'].log('ads', player.ads.triggerevent + ' triggered: ' + previousState + ' -> ' + newState);
      }
    }
  };

  // Register our handler for the events that the state machine will process
  player.on(VIDEO_EVENTS.concat([
  // Events emitted by this plugin
  'adtimeout', 'contentupdate', 'contentplaying', 'contentended', 'contentresumed',
  // Triggered by startLinearAdMode()
  'adstart',
  // Triggered by endLinearAdMode()
  'adend',
  // Triggered by skipLinearAdMode()
  'adskip',

  // Events emitted by integrations
  'adsready', 'adserror', 'adscanceled', 'nopreroll']), processEvent);

  // If we're autoplaying, the state machine will immidiately process
  // a synthetic play event
  if (!player.paused()) {
    processEvent({ type: 'play' });
  }
};

var registerPlugin = _video2['default'].registerPlugin || _video2['default'].plugin;

// Register this plugin with videojs
registerPlugin('ads', contribAdsPlugin);
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./cancelContentPlay.js":1,"./contentupdate.js":2,"./cueTextTracks.js":3,"./macros.js":4,"./redispatch.js":5,"./snapshot.js":6,"global/window":9}]},{},[10])(10)
});
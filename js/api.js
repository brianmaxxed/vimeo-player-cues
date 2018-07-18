let V = {};

// setup the V library when the initial HTML document has been completely loaded and parsed,
// without waiting for stylesheets, images, and subframes to finish loading.
document.addEventListener('DOMContentLoaded', function() {
  // use a closure to setup private state
  V = (function() {
    // these are the default values we'll use to assign videos and cue points and whatever else.
    const defaults = Object.freeze({
      // this is a default cuePoint object.
      cuePoint: {
        ts: 0,
        cue: '',
        image: '',
        link: ''
      },
      video: {
        id: null,
        title: '',
        duration: 0,
        cuePoints: []
      },
      aVideoId: 74687463,
    });

    // let's make a crude state object that we'll grab from local storage to initialize.
    // anything that was set before we will be able to reuse.

    const state = {
      videos: JSON.parse(localStorage.getItem('videos')) || [],
      settings: {
        uiLog: true,
        logToConsole: false
      },
      currentVideo: {
        loaded: false,
        index: null,
        id: null
      },
      player: null
    };

    // we're going to cache all the DOM elements we use in the app, so we're not calling getElementById over and over.
    const domCache = {};

    // below are the player events I'm interested in, right now, for this example.
    var eventCallbacks = {
      play: 'play',
      pause: 'pause',
      ended: 'ended',
      cuechange: 'cuechange',
      error: 'error',
      loaded: 'loaded',
      cuepoint: 'cuepoint'
    };

    /*
      let's quickly cache all the DOM element assignments for reuse. more performant.
    */

    function cacheDOMElements() {
      domCache['sections'] = document.querySelectorAll("li.right ul.sections span.showToggle");
      domCache['clearLogBtn'] = document.getElementById('clearLogBtn');
      domCache['toggleLogBtn'] = document.getElementById('toggleLogBtn');
      domCache['logCuePointsBtn'] = document.getElementById('logCuePointsBtn');
      domCache['cuePointError'] = document.getElementById('cuePointError');
      domCache['cuePoint'] = document.getElementById('cuePoint');
      domCache['cuePoints'] = document.getElementById('cuePoints');
      domCache['addCuePoint'] = document.getElementById('addCuePoint');
      domCache['timestamp'] = document.getElementById('timestamp');
      domCache['messageList'] = document.getElementById('messageList');
      domCache['player'] = document.getElementById('player');
      domCache['videoId'] = document.getElementById('videoId');
      domCache['addVideo'] = document.getElementById('addVideo');
      domCache['videos'] = document.getElementById('videos');
      domCache['cueTrack'] = document.getElementById('cueTrack');
      domCache['cueText'] = document.getElementById('cueText');
      domCache['deleteVideo'] = document.getElementById('deleteVideo');
      domCache['deleteCuePoint'] = document.getElementById('deleteCuePoint');
    }

    /*
      adds the current cuePoint text and timestamp to the cuePoint input fields when selected.
    */

    function selectCuePoint(e) {
      domCache['timestamp'].value = e.target.value;
      if (e.target.text && e.target.text.split) {
        const ar = e.target.text.split(': ');
        domCache['cuePoint'].value = ar[1];
      }
    }

    /*
      loads the video list from state (used for initializing the page)
    */

    function loadCuePointList() {
      const cues = Object.assign([], state.videos[state.currentVideo.index].cuePoints);

      const cuePointList = domCache['cuePoints'];
      cuePointList.innerHTML = '';

      const promises = cues.map((cuePoint, index) => {
        let oldId = cuePoint.id;
        delete cuePoint.id;
        return state.player.addCuePoint(cuePoint.ts, cuePoint).then((id) => {
          // create a new cuePoint for the cuePoint selection list
          const opt = document.createElement("option");
          opt.value = cuePoint.ts;
          opt.text = `${cuePoint.ts}: ${cuePoint.cue}`;
          cuePointList.appendChild(opt);
          state.videos[state.currentVideo.index].cuePoints[index].id = id;

          log('cuepoint added', cuePoint);
        }).catch((error) => {
          log('cue point error', error);
        });
      });

      Promise.all(promises).then(() => {
        // console.log('added all cue points');
        localStorage.setItem('videos', JSON.stringify(state.videos));
      })
      .catch((e) => {
        console.log('cuepoint promise error', e);
      });
    }

    /*
      loads the video list from state (used for initializing the page)
    */

    function loadVideoList() {
      state.videos.forEach((video) => {

        // create a new video option for the video selection list
        const opt = document.createElement("option");
        opt.value = video.id;
        opt.text = `${video.id}: ${video.title.substring(0, 30)}${video.title.length > 30
          ? '...'
          : ''} (${video.duration}s)`;
        domCache['videos'].options.add(opt);
      });
    }

    /*
      let's quickly cache all the DOM element assignments for reuse. more performant.
    */

    function loadVideo(id) {
      if (state.player && state.player.loadVideo) {
        return state.player.loadVideo(id);
      }

      return new Promise((resolve, reject) => {
        reject(false);
      });

    }

    /*
      a new video is loaded into the player depending on whether the addVideo button is pressed
      or a video item in the video list is clicked and whether to setup a player
      if not instantiated or load a new video.
    */

    function addVideo(e) {
      const id = (e.target.id !== 'addVideo')
        ? e.target.value
        : domCache['videoId'].value;
      const found = state.videos.filter(video => id === video.id);

      if (e && e.target.id === 'addVideo' && found.length > 0) {
        log('add video', `not added; id ${id} already in list`);
        return;
      }

      const func = (!state.player)
        ? setPlayer
        : loadVideo;

      func(id).then((loaded) => {
        // video is loaded, will be updated in loaded event.
      }).catch(function(error) {
        // the video did not load.
        log(`${func.name} called`, `video id ${id} not loaded.`);
      });
    }

    /*
      this promise will return a true or false based on the given video id.
    */

    function isValidVideoId(id) {
      // this returns a promise and resolves to true if the video id is valid
      // in the interest of time this is the quickest way to return a 200 or 404 based on the given video id.
      return new Promise((resolve, reject) => {
        axios.get(`https://vimeo.com/api/oembed.json?url=https%3A//vimeo.com/${id}`).then(function(response) {
          resolve(true);
        }).catch(function(error) {
          reject(false);
        });
      });
    }

    /*
      log events out to the message list if the state log setting is true.
    */

    function log(event, data = {}, type = '', msg = '') {
      if (state.settings.logToConsole) {
        console.log(event, data, msg);
      }

      if (!state.settings.uiLog) {
        return;
      }

      const li = document.createElement("li");
      li.innerHTML = `<strong>${event}:</strong>${msg} [${JSON.stringify(data)}]`;
      domCache['messageList'].appendChild(li);
    }

    /*
      this will set the video player if the id is valid.
    */

    function setPlayer(id) {
      // check whether or not the video id is valid based on an api get back to vimeo.
      return new Promise((resolve, reject) => {
        isValidVideoId(id).then(function() {
          var options = {
            id: id,
            width: 640,
            loop: false
          };

          state.player = new Vimeo.Player('player', options);
          state.player.setVolume(0.0);

          state.player.on('play', (data) => {
            // console.log('played the video!', dats);
          });

          // when the cuepoint is called show the cueText and update the cue text
          state.player.on('cuepoint', (e) => {
            domCache['cueText'].classList.remove('hide');
            domCache['cueText'].innerHTML = e.data.cue;

            // for the sake of time I just call a setTimeout.
            // a better solution would be to have a duration and/or
            // do something more clever with a set/clearInteval that takes into account cue overlap
            setTimeout(() => {
              domCache['cueText'].classList.add('hide');
              domCache['cueText'].innerHTML = '';
            }, 5000); // 5 seconds for now.
          });

          // when the player loaded event fires we know a video is properly loaded
          // into the player for the first time or subsequent loads
          // you need to update the state's current video info and
          // call promises to get the title and the duration.
          state.player.on('loaded', (data) => {
            const found = state.videos.findIndex(video => {
              return parseInt(video.id, 10) === parseInt(data.id, 10);
            });

            if (found >= 0) {
              state.currentVideo.index = found;
              state.currentVideo.id = data.id;
              state.currentVideo.loaded = true;

              loadCuePointList();
              return;
            }

            // the video successfully loaded; but it's new to the list.
            // would be better if metadata is loaded at one time, but the API forced multiple promises
            const title = state.player.getVideoTitle();
            const duration = state.player.getDuration();

            // can add additional metadata info as needed, but title and duration are enough.
            Promise.all([title, duration]).then(values => {
              const [title, duration] = values;
              const video = Object.assign({}, defaults.video, {
                id: data.id,
                title,
                duration
              });

              // when a new video is loaded then the state video array needs to have
              // the new video object added to the end of the array.
              // update the state's current video object.
              state.videos.push(video);
              state.currentVideo.index = state.videos.length - 1;
              state.currentVideo.id = data.id;
              state.currentVideo.loaded = true;
              domCache['videoId'].value = '';

              // create a new video option for the video selection list
              const opt = document.createElement("option");
              opt.value = data.id;
              opt.text = `${data.id}: ${video.title.substring(0, 30)}${video.title.length > 30
                ? '...'
                : ''} (${video.duration}s)`;
              domCache['videos'].options.add(opt);
              // after a video is selected/add and then loaded then the specific
              // cuePoints for that video need to be displayed in the cuePoint list.
              loadCuePointList();

              // update localStorage with the state videos
              localStorage.setItem('videos', JSON.stringify(state.videos));
            }, reason => {
              log('metadata error', reason, 'error', '');
            });
          });

          // Log when the player is ready
          state.player.ready().then((e) => {
            // domCache['cueTrack'] = document.getElementById("cueTrack");
            domCache['playerContainer'] = document.getElementById("playerContainer");

            const msg = 'player ready.';
            domCache['player'].classList.remove('defaultPlayer');
            // state.player.addCuePoint(ts, cuePoint);
            // need to see if the current video id loaded has cuePoints in state.
            log('ready event', {}, 'event', msg);

            // Listen for the events that are listed in the setup method.
            Object.keys(eventCallbacks).forEach(function(eventName) {
              state.player.on(eventName, function(data) {
                log(eventName, data);
              });
            });

            resolve(true);
          }).catch((e) => {
            log('ready event', e, 'error', 'player not ready');

            reject(false);
          });
        }).catch((e) => {
          log('ready event', e, 'error', `video id ${id} not found`);

          reject(false);
        });
      }).catch(function(e) {
        // if the video id is not valid then just display the default player background
        log('setPlayer', e, `that video id ${id} is not valid.`);
        domCache['player'].classList.add('defaultPlayer');

        reject(false);
      });
    }

    /*
      setup my library by caching the dom elements used, loading state from local storage
      and adding any event handlers to this pages buttons and other elements.
    */

    function setup() {
      cacheDOMElements();
      loadVideoList();

      const sections = domCache['sections'];
      sections.forEach(function(element, id) {
        element.addEventListener("click", toggleSectionVisibility);
        element.parentElement.addEventListener("click", toggleSectionVisibility);
      });

      // add the event listeners for the cached DOM elements.
      // this could be added as a loop over an object of DOM elements, but in the
      // interest of time, I just added them individually.
      // I like dynamic code that loops over the list and writes this with a couple lines of code.
      // if I had more time I would refactor this.
      domCache['clearLogBtn'].addEventListener("click", clearLog);
      domCache['toggleLogBtn'].addEventListener("click", toggleLog);
      domCache['logCuePointsBtn'].addEventListener("click", logCuePoints);
      domCache['addCuePoint'].addEventListener("click", addCuePoint);
      domCache['cuePoint'].addEventListener("keypress", clearCueError);
      domCache['timestamp'].addEventListener("keypress", clearCueError);
      domCache['cuePoints'].addEventListener("click", selectCuePoint);
      domCache['addVideo'].addEventListener("click", addVideo);
      domCache['videos'].addEventListener("click", addVideo);
      // domCache['deleteVideo'].addEventListener("click", deleteVideo);
      domCache['deleteCuePoint'].addEventListener("click", deleteCuePoint);

      // set the first video in the state video list or use the default.
      /// setPlayer(state.videos[0] || defaults.aVideoId);
      // I didn't actually add tearDown calls, but this is a start
      // additionally I would need to turn off the player events that were added with player.on
    }

    function tearDown() {
      domCache['clearLogBtn'].removeEventListener("click", clearLog);
      domCache['toggleLogBtn'].removeEventListener("click", toggleLog);
      domCache['logCuePointsBtn'].removeEventListener("click", logCuePoints);
      domCache['addCuePoint'].removeEventListener("click", addCuePoint);
      domCache['cuePoint'].removeEventListener("keypress", clearCueError);
      domCache['timestamp'].removeEventListener("keypress", clearCueError);
      domCache['addVideo'].removeEventListener("click", addVideo);
      domCache['videos'].removeEventListener("click", addVideo);
      // domCache['deleteVideo'].removeEventListener("click", deleteVideo);
      domCache['deleteCuePoint'].removeEventListener("click", deleteCuePoint);
    }

    /*
      validate the cuePoint input fields. just simply make sure there are values for cue and timestamp.
      otherwise display some error ui cues of a red error message and red input background
    */

    function validCueFields(cue, ts) {
      const err = domCache['cuePointError'];

      if (!ts.value || !cue.value) {
        if (!ts.value) {
          ts.classList.add('error');
        }

        if (!cue.value) {
          cue.classList.add('error');
        }

        err.innerHTML = 'add a valid cuePoint text and timestamp.';
        err.classList.remove('hide');
        return false;
      }

      if (!state.player) {
        err.innerHTML = 'no video is loaded.';
        err.classList.remove('hide');
        return false;
      }

      const duration = state.videos[state.currentVideo.index].duration || 0;
      if (ts.value > duration) {
        err.innerHTML = `cuePoint must be from 0 - duration (${duration.toFixed(2)}).`;
        err.classList.remove('hide');
        return false;
      }

      return true;
    }

    /*
      add a cuePoint to internal state and show in the cuePoint list, then store in localStorage.
      the method cleverly updates the list of cues by adding a cue or updating a cue (if the timestamp is reused).
    */

    function addCuePoint() {
      clearCueError();
      // this requires the cuePoint and timestamp input fields
      let cue = domCache['cuePoint'];
      let ts = domCache['timestamp'];

      if (!validCueFields(cue, ts)) {
        return;
      }

      [ts, cue] = [
        parseInt(ts.value, 10),
        cue.value,
      ];

      // create a default cue point object from the default object
      const cuePoint = Object.assign({}, defaults.cuePoint, {ts, cue});

      // find the current position of a cuePoint that is larger than what we want to add (by timestamp)
      // the position will tell us if we need to insert the cuePoint between a lesser and greater timestamp
      // if a greater timestamp isn't found then add this timestamp to the end since it's the latest.

      const cuePoints = state.videos[state.currentVideo.index].cuePoints;
      let pos = cuePoints.findIndex(function(ele) {
        return ele.ts >= ts;
      });

      const cuePointList = domCache['cuePoints'];
      // create a new cuePoint for the cuePoint selection list
      const opt = document.createElement("option");
      opt.value = cuePoint.ts;
      opt.text = `${ts}: ${cue}`;

      if (pos < 0) {
        // pos < 0 is -1; not found, so just add it in the next array position.
        cuePoints.push(cuePoint);
        pos = cuePoints.length - 1;
        // add the cuePoint to the cuePoint list
        cuePointList.options.add(opt);
      } else if (cuePoints[pos].ts === ts) {
        // the timestamp to update is equal to something so update the cuePoint data
        cuePoints[pos].cue = cue;
        // add the cuePoint to the cuePoint list
        cuePointList[pos] = opt;

        // remove the old cuePoint attached to the player
        // we'll be adding a new version later with a new id.
        let oldId = cuePoints[pos].id;
        delete cuePoints[pos].id;
        console.log('cuePoint', oldId);
        state.player.removeCuePoint(oldId).then((id) => {
          log('cuepoint removed', id);
        }).catch((error) => {
          log('cue point error', error);
        });
      } else {
        // the cuePoint isn't the last time in the list, so insert it before the found position
        // that is greater than this new value (in between what comes earlier in time and after)
        cuePoints.splice(pos, 0, cuePoint);
        // add the cuePoint to the cuePoint list using the before property (based on the pos)
        cuePointList.options.add(opt, pos);
      }

      // update localStorage for the currently selected video's cuePoints.
      localStorage.setItem('videos', JSON.stringify(state.videos));

      let oldId = cuePoints[pos].id;
      delete cuePoints[pos].id;
      state.player.addCuePoint(ts, cuePoints[pos]).then((id) => {
        cuePoints[pos].id = id;
        log('cuepoint added:', id, JSON.stringify(cuePoints[pos]), JSON.stringify(cuePoints));
      }).catch((error) => {
        log('cue point error', error);
      });
    }

    function deleteCuePoint() {
      const selected = domCache['cuePoints'].selectedIndex;

      if (selected < 0) {
        return;
      }

      delete domCache['cuePoints'].remove(selected);
      const cuePoint = Object.assign({}, state.videos[state.currentVideo.index].cuePoints[selected]);
      state.videos[state.currentVideo.index].cuePoints.splice(selected, 1);
      localStorage.setItem('videos', JSON.stringify(state.videos));

      console.log(cuePoint.id);
      state.player.removeCuePoint(cuePoint.id).then((id) => {
        log('cuepoint removed', cuePoint);
      }).catch((error) => {
        log('cue point error', JSON.stringify(error));
      });
    }

    /*
      clear the cue error message if it was set.
    */

    function clearCueError(e) {
      domCache['cuePoint'].classList.remove('error');
      domCache['timestamp'].classList.remove('error');
      domCache['cuePointError'].classList.add('hide');
    }

    /*
      clear the UI log.
    */

    function clearLog() {
      domCache['messageList'].innerHTML = '';
    }

    /*
      Pause or resume the UI player log.
    */

    function toggleLog(e) {
      const msg = e.target.innerHTML === 'Resume Log'
        ? 'log resumed.'
        : 'log paused.';
      e.target.innerHTML = (e.target.innerHTML === 'Resume Log')
        ? 'Pause Log'
        : 'Resume Log';
      const node = document.createElement("li");
      node.innerHTML = msg;
      domCache['messageList'].appendChild(node);
      state.settings.uiLog = e.target.innerHTML !== 'Resume Log';
    }

    /*
      log cuePoints for the currently loaded video.
    */

    function logCuePoints(e) {
      if (state.player && state.player.getCuePoints) {
        state.player.getCuePoints().then(function(cuePoints) {
          if (cuePoints.length < 1) {
            log('get cuePoints: no cuePoints are set on this video.');
            return;
          }

          log('START get cuePoints', null);
          cuePoints.forEach(cue => {
            log('get cuePoints', cue);
          });
          log('END get cuePoints');
        }).catch(function(error) {
          log('cuepoint erorr', error);
        });
      } else {
        log('getCuePoints error', 'a video is not loaded.');
      }
    }

    /*
      toggle the selected section on the right of the UI (update a + when closed and - when open)
      there are two ways to toggle via clicking the header itself and the +/- button.
    */

    function toggleSectionVisibility(e) {
      event.stopPropagation();

      let t = (e.target.nodeName === 'H3')
        ? e.target
        : e.target.parentElement;
      let button = (e.target.nodeName === 'H3')
        ? e.target.childNodes[1]
        : e.target;
      button.innerHTML = (button.innerHTML === '+')
        ? '-'
        : '+';
      t.nextElementSibling.classList.toggle("not-visible");
    }

    // these are the module methods this object allows
    return {
      setup,
      log,
      addCuePoint,
      clearCueError,
      clearLog,
      toggleLog,
      toggleSectionVisibility
    }
  })();
  // freeze the object so no changes can be made
  Object.freeze(V);
  // call the setup method to setup the testharness state and video player.
  V.setup();
});

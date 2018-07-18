

# Vimeo Player Cues
The solution I used creates a test harness that contains a message box that captures player events and other log details while the user is interating with the UI.

On the right of the video player are a couple of sections for the video list and the cue point list. You have to add a video id to the list. This will either call the setPlayer method or loadVideo method to setup the player on the first initialization and embedding (setting events, etc), and subsequently just loading a video id into the player using the API.

### Persistent storage via localStorage
I use localStorage to persist an internal state of the player. The library is within a closure and there are several interal variables, namely state, defaults and cached DOM elements
When the page is refreshed, the local storage is checked for a 'video' key that would contain all the videos and each video's cuePoints. That is loaded if it exists upon page load.

### Video list
If a video Id is invalid, doesn't exist or has some other privacy condition, authentication required, or other response from the Vimeo API then the video will NOT be added to the list, but the default player loading of the contigency does work. Try it out with other video ids which may not return an HTTP status code of 200.

If a valid id successfully loads a video then it is added to the video list.

### CuePoints per video
Select a video in the list to be able to manipulate the cuePoints per video. You can add new cuepoints by adding the cuePoint text and giving a timestamp in seconds. CuePoint = hello there; timestampe = 11 would be valid field values.
There is a validation routine here that displays an error message and changes the color of the input boxes to a reddish color. I did not have time to implement this in the video list, as well, but you get the idea. I could have added that code there too.

### Updating a cuepoint
You can update a cuepoint by selecting it in the list below and then modifying the text. The old cuePoint will be removed via the Vimeo API call to removeCuePoint (as they are added with unique guids) and then the replacing cuePoint is added at the exact same timestamp and will be updated with the new guid. Then the localStorage will update.

### Playing the video with cuePoints
There is a button to get the cuePoints in the Message log, so you can see what cuePoints are active on the given video. Ideally the cuePoints would be added server-side, so that there is no need to persist via localStorage, but again this was just an exercise. You can see the timestamp (ts) of each cuePoint and the text that will display. I have facilities for links and images in the data, but did not have time to implement, but the data in state is there and could be a simple link and image display added within the div (given more time).

Hit play to play the video and the cuePoints will show in white color over a black semi-transparent background right over the controls. Again, this will not work in fullscreen as the fullscreen API is being controlled by the video player itself and not the div. I could have attempted to hook into the fullscreen events and forced the div to resize, but I think this is just an exercise and I don't see those hooks readily available on the player API. I have built these features into several players to give users the ability to listen to fullscreen in and out events and can speak on it if need be.

### default cuePoint duration
I just set a timeout to 5 seconds to display the text for a while and then hide via a display none for the cueText div. Ideally, you would want to allow either a duration on the cuePoint itself or control the duration via a hook into the currentTime of the player. Normally you have one timer on a player and within that timer call a method to check if the cuePoint is supposed to show at a given second and then when the time to show it has elapsed at another point in the currentTime of the video then the cuePoint will automatically hide. I can speak on player timing and other topics as needed.


#### Notes: Normally, a text track would be built somewhere within the player structure itself where one would layer the overlay above the video, but behind the controls. I did explore in the player code base and API if that was possible via some call or manipulation of the DOM, but the player doesn't have such facility built-in. Therefore, I create an overlay on top of the player where the text is placed on a div above the control bar and away from other menus. It is, after all an exercise, but I did want to note that.

##########################

### Below is the assignment ask:

# Vimeo Player Cues Assignment.

We have a client with a huge library of instructional videos and they really want to
add supplemental information to users as they are watching the users.

Build a new Cue construction feature that leverages the Vimeo embedded player.

A Cue is a timestamp/progress based event that will allow the video creator to surface
messages as the video progresses.

See [example_1.jpg](./example_1.jpg) for what the display of the Cue could look like.

The requirements of the feature are:

- An interface for the user to add Cues at certain timestamps.
    - Should also list the Cues that have been added and allow them to be deleted.
- While playing the video surface the Cues at the correct times and hide after a duration.
- A Cue only needs to contain a string.
- The messages should be displayed as an overlay on the player itself.
- Only use vanilla javascript and please write all your own CSS.

See [example_2.jpg](./example_2.jpg) for a wireframe of how the feature could work, the end result is totally up to you!


### Resources

- The player embed api: https://github.com/vimeo/player.js and a demo here: https://player.vimeo.com/api/demo

### Bonus

Not required but for fun!

- Customization, background color, width, font size, duration shown etc.
- Cues can be different types like a link, image
- Use some persistent storage.
- Allow changing the video (which should also change the Cues associated with the video).

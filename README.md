# Vimeo Player Cues

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
# vimeo-player-cues

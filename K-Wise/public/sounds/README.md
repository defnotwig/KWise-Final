# Sound Files Directory

## Required Sound File

Please add the following sound file to this directory:

- **File Name**: `bellding-254774.mp3`
- **Purpose**: Notification sound for assistance requests in admin panel
- **Source**: Download from royalty-free sound library (e.g., Pixabay, FreeSound)
- **Recommended**: Bell/ding notification sound, approximately 1-2 seconds long

## Alternative

If you cannot find the exact file, any short notification bell sound will work. Just rename it to `bellding-254774.mp3` or update the path in:

- `src/components/AssistanceNotification.js` (line with audio src attribute)

## Testing Without Sound

The system will work without the sound file, but no audio notification will play. The visual notification modal will still appear.

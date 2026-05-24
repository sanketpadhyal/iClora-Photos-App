# iClora Photos App

iClora Photos App is the Android companion for the iClora web cloud platform at [www.iclora.app](https://www.iclora.app). It is built for fast, secure photo backup from an Android phone to the user's own iClora Photos cloud.

The web platform is where users create and manage their iClora account, view backed-up photos, and access the full iClora Cloud experience. The Android app focuses on mobile photo backup and cloud photo viewing for the same account.

## Website

[www.iclora.app](https://www.iclora.app)

## Related Repository

Web platform and backend:

[sanketpadhyal/iClora](https://github.com/sanketpadhyal/iClora)

## What The App Does

- Signs in with the user's existing iClora Google account.
- Lets users select photos from their Android phone.
- Backs up selected photos to iClora Photos.
- Uploads photos in a controlled, mobile-friendly flow.
- Shows backup and sync progress.
- Shows storage usage before backup.
- Keeps backed-up photos available on the iClora website.
- Fetches real cloud gallery data from the iClora backend.
- Shows synced cloud photos inside the Android app.
- Caches cloud gallery data for faster return visits.
- Refreshes gallery data in the background.
- Supports search inside the mobile photo gallery.
- Shows real photo details and sync state.
- Moves cloud photos to Recently Deleted.
- Uses secure signed links for protected photo upload and access.

## Important Note

Users cannot create a new account inside the Android app. Account creation and full cloud access happen on the iClora website.

After backup, photos can be viewed and managed in the user's own iClora Cloud through both the web app and the Android app.

Backed-up photos are handled through secure signed links, helping keep private media access controlled instead of exposing direct public file paths.

## Version

Current release:

```text
v2.0.0
```

This version adds the real iClora Cloud Gallery experience inside the Android app. Photos are fetched from the iClora backend instead of showing demo-only content, and cached cloud photos make return visits faster.

## Download

Download the Android APK from the GitHub release page:

```text
https://github.com/sanketpadhyal/iClora-Photos-App/releases/download/v2.0.0/iclorav2.apk
```

## Tech Stack

- React Native
- Expo
- Firebase authentication integration
- iClora backend API integration
- Android photo selection flow
- Cloud gallery sync and caching
- Secure upload and media access flow

## Product Role

iClora Photos App is not a separate cloud service. It is a mobile companion for iClora Photos.

The app's role is to make phone photo backup easier:

1. User signs in with an existing iClora account.
2. User selects Android photos.
3. App uploads selected photos to iClora Photos.
4. Synced photos appear in the Android app and on the iClora website.
5. User can view, search, and manage backed-up photos from the same cloud account.

## Developed By

Developed by **Sanket Padhyal**.

Personal website: [www.sanketpadhyal.world](https://www.sanketpadhyal.world)

GitHub: [@sanketpadhyal](https://github.com/sanketpadhyal)

## Private Project

iClora Photos App is a private product-style project and is not open source. The repository is shared for documentation, portfolio review, and project reference only.

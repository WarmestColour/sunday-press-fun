# Sunday Press Fun — GitHub Pages starter

A plain HTML, CSS and vanilla JavaScript crossword player. No build step or framework is required.

## Files

- `index.html` — page structure and element IDs used by the player.
- `styles.css` — colours, typography, layout, and responsive styling.
- `app.js` — puzzle loading, grid rendering, clue selection, typing, and CHECK behaviour.

## Run locally

Open `index.html` in a browser. The page starts in its empty state; use **Open puzzle** to load a `.spfun` project exported from the constructor.

## Publish with GitHub Pages

1. Sign in to GitHub and create a new repository (for example, `sunday-press-fun`).
2. Upload `index.html`, `styles.css`, and `app.js` to the repository root. Keep all three files together.
3. Open the repository's **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/(root)` folder, then save.
6. Wait for GitHub Pages to publish the site. The Pages settings screen will show the website URL.

## How to preload a puzzle later

At the moment this starter still uses the **Open puzzle** file picker. To publish a ready-to-play crossword, the next change is to add a puzzle data file (JSON) to the repository and have `app.js` load that file automatically, then change the button to **Start** or remove it. A browser-hosted page cannot read a file from your computer automatically; the puzzle data needs to be committed to the repository or embedded in the page.

## Editing tips

- Change colours and spacing in `styles.css`, starting with the `:root` variables.
- Change labels and page structure in `index.html`. Keep the IDs used by `app.js` intact unless you update the JavaScript too.
- Change game behaviour in `app.js`.
- After pushing a change to the repository, GitHub Pages republishes the site automatically.

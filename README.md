# Mathera 0.6.2

Mathera is a maths learning site built around a tree. Each Era is a world, each unit is a branch and each skill is a leaf. Learners plant, grow and prove skills, and the tree reminds them when a leaf needs watering.

This folder is the complete website. It is a static site: one `index.html` and the Era paintings. There is no server, build step, account system or database.

## Put it on GitHub Pages

1. Create a new repository on GitHub, for example `mathera`.
2. Upload everything in this folder to the repository root, including the hidden `.nojekyll` file. Either drag the files into "Add file → Upload files", or use git:
   ```
   git init
   git add .
   git commit -m "Mathera 0.6.2"
   git branch -M main
   git remote add origin https://github.com/YOUR-ACCOUNT/mathera.git
   git push -u origin main
   ```
3. In the repository, open **Settings → Pages**. Under "Build and deployment", choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
4. After a minute or two the site is live at `https://YOUR-ACCOUNT.github.io/mathera/`.

To try it locally first, run `python3 -m http.server` in this folder and open http://localhost:8000.

## What's in the folder

| Path | What it is |
|---|---|
| `index.html` | The whole app: the worlds front page and skill search, questions, tree, Acorn save codes, Treeprint PDFs, DJ mode |
| `worlds/era1.jpg` to `era7.jpg` | The seven Era paintings used by the world view |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |
| `tools/acorn/` | The Acorn save-code module and its tests (not needed by the site) |
| `CHANGELOG.md` | What's new since 0.5 |

## How this copy differs from the claude.ai version

- **Saves stay in the learner's browser.** Progress is kept in the browser's local storage on that device. To move a tree to another device, use **House Rules → Your Acorn** to copy the code or scan the QR, then graft it on the other device. Clearing browser data erases the tree, so encourage learners to keep their Acorn.
- **Treeprint and Field Guide PDFs** download as ordinary browser downloads.
- **"Report a mistake"** can't send reports from this copy. Learners see the question's code and are asked to tell whoever shared the site, so point them to your GitHub Issues page or an email address.
- **No tracking.** This copy sends no telemetry and has no accounts.

## Privacy note for schools

The site makes one outside request: it loads its fonts (Schibsted Grotesk, Spline Sans Mono, STIX Two Text, Press Start 2P) from Google Fonts. Everything else is in this folder. Learners' names are never stored in the Acorn.

## Updating

Replace `index.html` (and any changed paintings) with the new release and push. Learners keep their trees, because saves live in their browser under the same site address. Don't change the site's address or learners will start fresh.

## Acorn tools

`tools/acorn/acorn.js` encodes and decodes Acorn save codes. To run its tests (needs Node.js), from inside `tools/acorn/` run:

```
node test-acorn.js
node fuzz-acorn.js
```

Skill serial numbers in the Acorn are permanent. New skills are only ever appended, never renumbered.

## Before making the repository public

- **Choose a licence.** None is included. Add a `LICENSE` file for the code and decide separately how the paintings may be reused.
- **Check the paintings' terms.** The seven Era paintings were made with an AI image tool. Make sure their terms allow publishing them.

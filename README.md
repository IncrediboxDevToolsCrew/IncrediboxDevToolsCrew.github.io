# No More Slop for PenguinMod

A userscript that adds a **"Recent Non-Slop Projects"** section to the PenguinMod homepage. It filters out low-effort projects based on a keyword blocklist, so you can actually find stuff worth playing.

![License: MIT](https://img.shields.io/badge/license-MIT-blue)

---

## What is "slop"?

Basically any project with a title like "MY SPRUNKI OC" or "[Insert Sprunki OC] x [Someone Else's Sprunki OC]". You know the ones. The front page gets flooded with them constantly, and it buries the actually interesting projects.

This script aims to fix that.

---

## Features

It pulls the PenguinMod frontpage and filters out projects matching a [community-maintained blocklist](./slopblock.txt). There's an optional ship filter that hides projects with "Character X Character" pairings in the title or notes. You can toggle individual built-in keywords on or off without losing them, and add your own custom keywords on top of the defaults. There's also a stats panel showing exactly how many projects got filtered and which keywords are hitting the most. It's dark mode aware too.

However... it isn't perfect. You may still see some slop projects that didn't get properly filtered. To fix that, open the project, and check for any identifiable keywords in the title, Instructions or Notes & Credits, then make a PR here!

---

## Installation

You'll need a userscript manager. [Violentmonkey](https://violentmonkey.github.io/) is recommended, but Tampermonkey works too.

Install Violentmonkey (or Tampermonkey) for your browser, then click the link below to install the script:

**[Install No More Slop](https://raw.githubusercontent.com/Gen1xLol/no-more-slop-for-penguinmod/refs/heads/main/No%20More%20Slop.user.js)**

After that, go to [penguinmod.com](https://penguinmod.com) and the new section should appear on the homepage.

---

## Usage

Once installed, you'll see a **"Recent Non-Slop Projects"** row on the PenguinMod front page. Click **Preferences** in the header to open the settings. From there you can toggle built-in keywords on or off (strikethrough means disabled), enable or disable the ship filter, and add your own keywords. Right-clicking a custom keyword will let you delete it, and hitting **Reload** refreshes the section without leaving the page.

The stats panel under the section header shows a breakdown of what got filtered and why.

---

## Contributing

The blocklist lives in [`slopblock.txt`](./slopblock.txt). There's one keyword per line. If there's a term that keeps showing up on the front page that should be blocked, open a PR adding it to the file. Keep it to actual slop indicators. The goal isn't to filter out the entire dictionary, just the low-effort spam.

For bugs or feature requests, open an issue.

---

## Notes

The blocklist is fetched fresh each time the page loads, so updates to `slopblock.txt` go live without needing a script update. Keywords are matched case-insensitively against the project title, Instructions, Notes & Credits, and author username. Your preferences - disabled keywords, custom keywords, and the ship filter toggle - are saved to `localStorage` in your browser.

---

## License

MIT

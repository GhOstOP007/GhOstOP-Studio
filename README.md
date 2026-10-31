<div align="center">

<img src="assets/ghostop.png" alt="GhOstOP Studio ghost logo" width="110" />

# 👻 GhOstOP Studio
### ✈️ Smart Trip & Vacation Photo Organizer

**Organize travel photos and videos by content or location — with local AI and optional online place names.**

[**Try the Web Demo**](https://ghostop-studio-trip-picsvid-org.netlify.app) · [**Report an Issue**](../../issues)

[![Download](https://img.shields.io/badge/Download-Windows_Installer-00C896?style=for-the-badge&logo=windows)](https://github.com/GhOstOP007/GhOstOP-Studio/releases)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Electron](https://img.shields.io/badge/Electron-Desktop-47848F?style=flat-square&logo=electron&logoColor=white)
![Transformers.js](https://img.shields.io/badge/AI-Transformers.js-orange?style=flat-square)
![Windows](https://img.shields.io/badge/Platform-Windows-blue?style=flat-square)
![Version](https://img.shields.io/badge/Content%20Sorting-v1.4-purple?style=flat-square)

</div>

---

## 📸 Overview

GhOstOP Studio is a Windows desktop app for sorting scattered travel photos and videos. It can group files by **what appears in a photo**, by **GPS location**, or by other supported sorting rules, without uploading your photo collection to a cloud AI service.

The desktop app supports native folder selection and file organization. A browser demo is available, but browser filesystem capabilities differ from those of the desktop application.

## ✨ Features

### 🤖 Smart content sorting (v1.4)

- Uses **CLIP ViT-B/32** through Transformers.js for on-device photo classification.
- Offers **25 content categories**, using multiple visual prompts to improve classification.
- Creates category folders **only when files are assigned to them**; it does not pre-create a fixed set of empty folders.
- Keeps **Photos/** and **Videos/** separate.
- Sends uncertain photos to **Other Photos** rather than forcing an unreliable match.
- Sorts videos using lightweight filename hints for now; unrecognized videos go to **Other Videos**.

Example output (actual folders depend on the files detected):

```text
Organized Media/
├── Photos/
│   ├── Mountains & Hiking/
│   ├── Food & Meals/
│   ├── Cars & Bikes/
│   └── Other Photos/
└── Videos/
    └── Other Videos/
```

> **Important:** Folder names are chosen from the app's detected content categories, not generated as unrestricted natural-language descriptions. AI predictions are probabilistic; review results before moving valuable files.

### 📍 Location-based sorting

- Reads GPS information from supported photo/video metadata.
- **Online mode:** Uses OpenStreetMap Nominatim reverse geocoding to turn coordinates into readable place names.
- **Offline fallback:** Can group files using coordinates when place-name lookup is unavailable.
- Some video formats may not expose GPS metadata in a way the current parser recognizes.

### ☁️ Optional AI download

- The Windows installer **does not include** the large AI model.
- When AI sorting is requested, the app can download the model from Hugging Face with progress, cancellation, and retry support.
- Downloads are cached in Electron's user-data folder and reused on later launches.
- Once downloaded, photo AI classification can run offline.
- The Model Manager can remove the locally stored model to free disk space.

**Current limitation:** The app downloads the full CLIP model snapshot (approximately **3.6 GB**), not just the smallest required quantized files. Ensure you have enough disk space and internet data for the initial download.

### 🧰 Desktop organization tools

- Native folder selection and file operations.
- Duplicate-detection heuristics and sorting previews.
- Move and undo functionality.
- ZIP export support.
- Custom GhOstOP ghost icon and Electron window controls.

### ⚡ Stability improvements (v1.3 carried into v1.4)

- Bounded metadata reads instead of loading whole videos for location analysis.
- Reduced processing concurrency to limit memory pressure.
- Bounded reads for duplicate signatures.
- Periodic UI yielding during sorting.
- Lightweight video handling rather than expensive frame decoding.

These improvements reduce the risk of freezing, but large folders and first-time AI model loading may still cause pauses. The current AI inference path runs in the Electron renderer.

## 🖥️ Screenshots

Add screenshots to `assets/screenshots/` and uncomment these lines once the files exist:

<!-- ![Main window](assets/screenshots/main.png) -->
<!-- ![Content sorting](assets/screenshots/content-sorting.png) -->
<!-- ![AI model manager](assets/screenshots/model-manager.png) -->

## 🛠️ Tech stack

| Area | Technology |
|---|---|
| Desktop | Electron |
| Interface | HTML, CSS, vanilla JavaScript |
| Image AI | `@huggingface/transformers`, CLIP ViT-B/32 |
| Metadata | `exifr` |
| ZIP export | `jszip` |
| Online location names | OpenStreetMap Nominatim |
| Windows installer | `electron-builder` (NSIS) |

## 🚀 Getting started

### Requirements

- **Windows 64-bit** for the current installer target.
- [Node.js](https://nodejs.org/) and npm to run or build from source.
- Internet access for the **first AI model download** and optional online location lookup.
- Enough free disk space for the AI cache (roughly 3.6 GB for the current snapshot, plus installation overhead).

**Python is not required** to run the on-demand-download desktop application. The repository contains an optional Python model-download script, but the app's runtime downloader handles the normal first-use flow.

### Install from source

```bash
# Clone your GitHub repository (replace with your actual URL)
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY

# Install dependencies
npm install

# Launch the desktop app
npm start
```

### Build the Windows installer

```bash
npm run build
```

Find the generated NSIS installer in `dist/`. The bundled app uses the custom icon at `assets/ghostop.ico` and excludes the downloaded AI model.

### First AI sort

1. Start GhOstOP Studio and select a folder containing media.
2. Choose content sorting and enable AI classification.
3. Approve the model download when prompted; wait for it to complete.
4. Review the proposed categories and folders before moving files.
5. On future launches, the downloaded model can be reused without internet access.

For a first test, try **20 JPG photos**, then a larger folder. If testing mixed photo/video collections, use copies of important media until you've verified the output.

## 🔒 Privacy and network access

- **Photo classification:** Runs on-device; photos are not uploaded to Hugging Face for inference.
- **Model download:** Fetches model files from Hugging Face when requested.
- **Online location lookup:** Sends GPS coordinates to OpenStreetMap Nominatim to resolve place names; it does **not** upload the photos themselves.
- **Offline use:** Available for supported operations after the model is downloaded; online place-name resolution still needs a connection.

## ⚠️ Known limitations

- AI content classification currently supports **photos**, not full semantic understanding of video scenes.
- Video category assignment relies on filename hints; many videos may remain under **Other Videos**.
- Category folders are dynamic, but their labels come from a predefined taxonomy rather than AI-generated custom descriptions.
- Some video GPS metadata may not be detected.
- Large ZIP exports can use substantial memory or disk space; native file moves may be more practical.
- First model loading and inference may briefly pause the UI, especially on lower-end machines.
- The current installer build targets Windows x64; other operating systems have not been validated.

## 🗺️ Roadmap

- [ ] Video frame sampling and semantic video classification
- [ ] Smaller, selective AI model downloads
- [ ] Background worker for inference and smoother UI
- [ ] Better duplicate detection with perceptual hashing
- [ ] More flexible category names and hierarchical sorting
- [ ] Offline city/place-name database
- [ ] Automated tests with large mixed-media folders

## 🤝 Contributing

Bug reports, suggestions, and pull requests are welcome. When reporting a freeze or sorting issue, include the sorting mode, approximate file count, whether videos were present, and any terminal errors. **Do not upload private photos or GPS data to public issues.**

## 📜 License

The current `package.json` declares `"license": "UNLICENSED"`. No open-source license is granted by that declaration. If you intend to publish this as MIT-licensed open source, add an appropriate `LICENSE` file and update the package metadata before announcing that license.

---

<div align="center">

**👻 GhOstOP Studio — Give your travel memories a place to belong.**

[Try the Web Demo](https://ghostop-studio-trip-picsvid-org.netlify.app)

</div>

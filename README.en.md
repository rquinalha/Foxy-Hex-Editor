# [🇺🇸 English](README.en.md) | [🇧🇷 Português](README.md)

<p align="center">
  <img src="assets/foxy.png" width="128" height="128" alt="Foxy Hex Editor Logo">
</p>

<h1 align="center">Foxy Hex Editor</h1>

<p align="center">
  <strong>Hexadecimal Editor for translation and ROM hacking.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/github/v/release/rquinalha/Foxy-Hex-Editor?style=for-the-badge&color=orange" alt="Version">
  <img src="https://img.shields.io/badge/Platform-Windows%20|%20Linux-blue?style=for-the-badge" alt="Platform">
  <img src="https://img.shields.io/badge/License-GPL--3.0-green?style=for-the-badge" alt="License">
</p>

---

![Foxy Hex Editor](assets/tela_foxy.png)

## 📸 Screenshots
<p align="center">
  <img src="assets/customize.png" width="400" alt="Customize"><br><br>
  <img src="assets/relative.png" width="400" alt="Relative Search"><br><br>
  <img src="assets/analysis.png" width="400" alt="ROM Analysis"><br><br>
  <img src="assets/table.png" width="400" alt="Table Editor">
</p>

## 🦊 About the Project
**Foxy Hex Editor** was designed specifically for the needs of the translation and ROM hacking communities. Developed with **HTML5, CSS3, and JavaScript** on the **Electron** framework, it combines the precision of low-level binary editing with a modern interface and tools.

## ✨ Highlights
- 🚀 **Portable**. A single Windows executable and a Linux AppImage. Foxy keeps its profile in `.foxy-data` next to the executable.
- ⚡ **Large files**. On-demand reads without loading the entire file into memory.
- 🗂️ **Multiple Tabs**: Work on several files simultaneously. Each tab is independent and preserves its own character table, bookmarks, and cursor position.
- 🌍 **Character Mapping**: Robust support for 8 and 16-bit (.tbl and .json) tables (BE/LE). Decodes advanced ROM hacking patterns like DTE, MTE, Shift-JIS, and custom tags.
- 🧮 **Hex Calculator**: An integrated tool for offset calculations and quick conversions.
- 🔍 **Search**. Cancellable background text and hex searches can cover multiple tabs and include unsaved edits. Regex search has file-size limits.
- 🔍 **Relative Search**: Locate text in files without standard encoding (ASCII/Unicode). Identifies patterns based on the numerical distance between bytes and assists in automated character table (.tbl) creation.
- 📊 **ROM Analysis**: Quickly identify patterns, data sections, and entropy. Detects known compression signatures (Yaz0, RNC, LZ77, zlib, and more).
- 🎨 **Full Customization**: Adjust background colors, text, and bytes individually. Change fonts and sizes to create a tailored workspace.

## 💻 System Requirements

| Component               | Minimum Requirement        | Recommended                  |
| ----------------------- | -------------------------- | ---------------------------- |
| 🖥️ **Operating System** | Windows 10 / Linux x64     | Windows 11                   |
| 🏎️ **Processor**        | Dual Core 1.5GHz           | Quad Core 2.0GHz+            |
| 🧠 **Memory (RAM)**     | 2 GB                       | 4 GB or more                 |
| 💾 **Disk Space**       | 200 MB free                | 500 MB (SSD)                 |
| 🏗️ **Architecture**     | x64                        | x64                          |

## 📥 Downloads
You can find pre-compiled versions in the **Releases** section of the repository:

- 🪟 **Windows x64**. ZIP containing the portable executable (`.exe`).
- 🐧 **Linux x64**. ZIP containing the AppImage.

> [!TIP]
> **[Click here to download the latest version](https://github.com/rquinalha/Foxy-Hex-Editor/releases/latest)**

## 🚀 How to Run and Configure
 
To ensure the app runs perfectly on your system:

### 🪟 Windows
1. **Recommended Version**: Windows 10 or higher (64-bit).
2. **Executable**. Download the ZIP from **Releases**, extract the `.exe`, and run it. Foxy creates `.foxy-data` next to the executable.
3. **Development**:
   - Install [Node.js LTS](https://nodejs.org/).
   - Clone the repo and run:
     ```powershell
     npm install
     npm start
     ```

### 🐧 Linux
1. Download the ZIP from **Releases** and extract the x64 AppImage to a writable folder. Make the file executable if needed, then run it. The example uses v1.1.0.

   ```bash
   chmod +x FoxyHexEditor-1.1.0-linux-x86_64.AppImage
   ./FoxyHexEditor-1.1.0-linux-x86_64.AppImage
   ```

2. If the AppImage cannot mount via FUSE, try `APPIMAGE_EXTRACT_AND_RUN=1 ./FoxyHexEditor-1.1.0-linux-x86_64.AppImage`. This extracts the app temporarily. On Ubuntu 24.04, the FUSE compatibility package is `libfuse2t64`. [FUSE guide](https://docs.appimage.org/user-guide/troubleshooting/fuse.html)

   If the terminal reports a sandbox error, see the AppImage documentation on Electron compatibility. [Sandbox guide](https://docs.appimage.org/user-guide/troubleshooting/electron-sandboxing.html)

   If the window closes on startup in a virtual display session, try `./FoxyHexEditor-1.1.0-linux-x86_64.AppImage --disable-gpu`.

3. **Development**:
   - Ensure you have Electron's dependencies installed (libnss3, libatk, etc).
   - Clone and run:
     ```bash
     npm install
     npm start
     ```

## 🛠️ How to Build
If you wish to generate your own binaries:

1. Install [Node.js](https://nodejs.org/).
2. On **Windows**, you can use the helper script:
   - Run `build-portable.bat` to generate `dist\FoxyHexEditor-<version>-portable.exe` (Windows x64).
   - Distribute the `.exe` by itself. Foxy creates `.foxy-data` next to it for settings and cache. To take the data with you, move both the `.exe` and `.foxy-data` to a writable folder.
3. On **Linux x64** or **WSL2**, run `npm ci` followed by `npm run appimage`. On WSL2, build from a clone on the Linux filesystem. The AppImage is generated in `dist/`.

## 🤝 Contribution
Contributions are always welcome! Feel free to open an *Issue* or send a *Pull Request*.

---

<p align="center">
  Developed for the translation community.
</p>

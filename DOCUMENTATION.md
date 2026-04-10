# [🇺🇸 English](DOCUMENTATION.md) | [🇧🇷 Português](DOCUMENTACAO.md)

# Foxy Hex Editor

Updated documentation for Foxy Hex Editor, aligned with the app's code in this base.

## 1. Overview

Foxy Hex Editor is an Electron-based hexadecimal editor focused on binary editing, ROM hacking, character tables, and auxiliary tools for translation.

### Key Features

- Visualization in three areas: offset, hex, and decoded text
- Editing in overwrite and insert modes
- Edit history with a 100-state limit
- Support for large files with virtual mode
- Multiple tabs/file sessions
- Search and replace, including regex and hex search
- Predefined and custom character tables
- Bookmarks and colored highlights system
- Bilingual interface: PT and EN

## 2. Architecture

### 2.1 Technologies

| Component | Technology |
|-----------|------------|
| Desktop | Electron 28 |
| Frontend | HTML5, CSS3, JavaScript |
| Main Process | `electron/main.js` |
| Main Renderer | `index.html` + `js/core/*` |
| Auxiliary Tools | `tools/*.html` + `js/tools/renderers/*` |
| Build | `electron-builder` |

### 2.2 Process Structure

- Main Process: windows, menu, IPC, recent files, and tool opening
- Main Window: hex editor
- Auxiliary Windows: search, go to offset, calculator, analysis, relative search, colors, bookmarks, highlights, and table editor

## 3. Directory Structure

```text
Foxy Hex Editor/
├── assets/
│   ├── foxy.png
│   ├── icon.ico
│   ├── br.svg
│   ├── brazil-.png
│   ├── us.svg
│   ├── united-states.png
│   └── fonts/
│       ├── Arimo-mono.ttf
│       ├── roboto-mono.ttf
│       ├── jetbrains-mono.ttf
│       └── source-code-pro.ttf
├── css/
│   ├── style.css
│   ├── notifications.css
│   ├── foxy-dicas.css
│   ├── enhanced-scroll-controls.css
│   └── components/save-button.css
├── electron/
│   ├── main.js
│   └── electron_main_handlers.js
├── js/
│   ├── core/
│   │   ├── main.js
│   │   ├── main_key_handling.js
│   │   ├── main_search.js
│   │   ├── main_history.js
│   │   ├── main_bookmarks.js
│   │   ├── main_highlights.js
│   │   ├── main_analysis_core.js
│   │   ├── tab_session_manager.js
│   │   └── enhanced-large-file-handler_*.js
├── js/
│   ├── features/
│   │   ├── editor/
│   │   ├── help/
│   │   └── ui/
│   ├── integration/
│   └── tools/renderers/
├── tools/
│   ├── ...
├── index.html
├── package.json
└── README.md
```

## 4. Testing and Validation

The project has an automated regression suite for search and replace in:

- `tools/tests/search-regression.js`

Script available in `package.json`:

- `npm.cmd run test:search`

Current suite coverage:

- Text search with `8-bit` custom table
- Chunked search with custom table
- `Regex` with text decoded by the active table
- `Whole word` with boundaries based on visible text
- Search and replace with `8-bit` custom table
- Search and replace with `DTE` table
- Search and replace with `Shift-JIS` table
- Search and replace with `16-bit` table
- Validation of bytes recorded after replacement

Note for Windows/PowerShell:

- If `npm` is blocked by system execution policy, use `npm.cmd run test:search`

## 5. Main Features

### 5.1 Hexadecimal Editing

The editor works with two editing areas:

- Hex
- ASCII/decoded text

Editing modes:

- Visualization
- Overwrite bytes editing
- Insert bytes editing

### Editing and Navigation Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Open file |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save as |
| `Ctrl+Q` | Exit |
| `Ctrl+E` | Toggle edit mode |
| `Ctrl+I` | Toggle insert/overwrite |
| `F2` | Toggle edit mode |
| `Insert` | Toggle insert/overwrite |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+F` | Open find and replace |
| `Ctrl+G` | Go to offset |
| `Ctrl+H` | Open hex calculator |
| `Ctrl+B` | Open bookmarks |
| `F3` | Next search result |
| `Shift+F3` | Previous result |
| `Page Up/Down` | Page navigation |
| `Home/End` | Start/end of current line |
| `Ctrl+Home/End` | Start/end of file |
| `Arrow Keys` | Cursor navigation |

Note: `Home` and `End` act on the current line. `Ctrl+Home` goes to the start of the file and `Ctrl+End` goes to the end of the file.

### 5.2 File Tabs

- The app supports multiple sessions/open files
- Each session preserves cursor, selection, bookmarks, highlights, active table, and editing state
- The tab list is rendered in the top file bar
- Right-click an open tab to access a context menu
- The context menu allows closing the current tab, tabs to the left, tabs to the right, or all tabs except the selected one

### 5.3 Large Files

For larger files, the app enters virtual mode.

| Parameter | Value |
|-----------|-------|
| Threshold | 800 MB |
| Read Chunk | 64 KB |
| Cache | 256 chunks |
| Total Cache | 16 MB |
| Viewport | about 50 visible lines |

In this mode:

- The file doesn't need to be loaded entirely into memory
- Reading is done on demand
- Rendering shows only the visible region
- Behavior is optimized to keep the interface responsive

### 5.4 Character Tables

The table editor works with:

- `.json`
- `.tbl`

Supported templates in the current editor:

- Empty Table
- ASCII 8-bit
- ASCII 16-bit BE
- ASCII 16-bit LE
- Shift-JIS
- DTE
- MTE
- DTE+MTE

### 5.4.1 Tables and Text Analysis

- Analysis uses the character table active at the time of scanning
- If a custom `.tbl` is loaded, found strings try to use this table for decoding
- This especially applies to `8-bit`, `DTE`, `MTE`, `DTE+MTE`, `Shift-JIS`, and `16-bit` tables
- Terminators and tags defined in the table also influence how strings are separated in the result

Recommended use for ROM hacking:

- Load the correct table before opening analysis
- If text looks broken, review terminators, tags, and multi-byte entries in the table
- In games with compressed scripts, analysis may find only compression headers or small islands of text

### 5.5 Search

Supported types:

- Text
- Hexadecimal
- Regex

Separate tool:

- Relative Search, accessed outside the `Find and Replace` window

Options present in the code:

- Case sensitive
- Whole words
- Search in all tabs for text
- Navigation with `F3` and `Shift+F3`

Current limits:

- Search in all tabs works only for text
- Replace in all tabs is not yet available
- Hex and regex search remains restricted to the current file

### 5.7 Analysis for ROM and ISO

The analysis tool was designed to support common ROM hacking and game image investigation workflows.

What analysis looks for:

- Strings decoded by the active table
- Regions with text concentration
- Zero padding and highly repeated bytes
- Global and sampling entropy
- Known compression signatures like `Yaz0`, `Yay0`, `RNC`, `gzip`, `zlib`, and `LZ77/LZ11` candidates
- Basic `ISO 9660` structure, when found

How to interpret results:

- `Compression Signature` indicates a recognized header
- `Compression Hint` indicates a pattern that looks like a valid header but still needs manual confirmation
- High entropy alone does not prove compression; it can also indicate audio, graphics, video, or dense binary data
- Text regions are good starting points to search for pointers, script control, and name tables

Large files:

- Large files may use sampling analysis to keep the interface responsive
- In this situation, the window informs partial file coverage
- The result should be treated as an initial map, not a complete inventory

Recommended workflow for games:

- Apply the correct table
- Run analysis
- Open a found string or text cluster
- Check for pointers, control blocks, or compression nearby
- Mark important offsets with bookmarks or highlights

### 5.6 Bookmarks

Bookmarks are position markers in the file, with:

- Offset
- Title
- Comment
- Timestamp

Features:

- Add bookmark at current position
- Edit title/comment
- Navigate to bookmark
- Export and import bookmarks
- List in sidebar

Actual export format:

```json
{
  "filename": "bookmarks.json",
  "created": "2024-01-15T10:30:00Z",
  "bookmarks": [
    {
      "id": 1,
      "offset": 2048,
      "title": "Start of Text",
      "comment": "Script location",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 5.7 Colored Highlights

The current highlights system is based on range selection:

- A highlight covers a continuous byte range
- Each highlight has `start`, `end`, `comment`, `color`, `id`, and `created`
- Selection can be navigated and highlighted in the editor
- Highlights can be exported and imported in JSON

The current export returns an object with:

- `highlights`
- `version`
- `created`

### 5.8 ROM Analysis

The analysis module performs:

- Format detection
- Section count and analysis
- String extraction
- Entropy calculation
- Results display in sidebar and analysis window

In large files, analysis uses sampling to keep the interface smooth.

## 6. User Interface

### 6.1 Main Layout

- Header with open, save, undo, redo, analysis, relative search, help, and language switch
- Control bar with edit mode, insert/overwrite, search, go to offset, calculator, and colors
- File tab bar
- Sidebar with bookmarks, history, analysis, and table
- Main hex editor area
- Bottom status bar

### 6.2 Sidebar

Available tabs:

1. Bookmarks
2. History
3. Analysis
4. Table

### 6.3 Modals and Auxiliary Windows

| Screen | Function | Access |
|--------|----------|--------|
| Find and Replace | Search and replace | `Ctrl+F` |
| Go to Offset | Direct navigation | `Ctrl+G` |
| Hex Calculator | Conversions and operations | `Ctrl+H` |
| Bookmarks | Add/edit bookmark | `Ctrl+B` |
| Highlights | Manage highlights | Toolbar / tool window |
| Colors | Customize palette | Toolbar / tool window |
| Relative Search | Find relative patterns | Toolbar / tools menu |
| Analysis | Analysis results | `Analyze` button / tools menu |
| Table Editor | Create/edit tables | From relative search tool |

## 7. Internal Systems

### 7.1 History

- History with 100-state limit
- Stores snapshot, cursor, and modified bytes
- Works during the session
- Reset when a new file is loaded or when internal state is reset

### 7.2 Rendering

- The editor uses virtual rendering for large files
- Scroll calculates visible viewport
- Colors are applied dynamically via CSS and JavaScript

### 7.3 Selection

Practical selection types:

- Single byte cursor
- Continuous range

Common operations:

- Copy
- Paste
- Delete
- Import over selection

### 7.4 Notifications

- `success`
- `error`
- `warning`
- `info`

They appear as toast in the top right corner and disappear automatically.

## 8. External Tools

### 8.1 Find and Replace

File: `tools/search_tool.html`

Features:

- Search in dedicated window
- Sync with main window
- Results navigation
- Individual or mass replacement
- Case sensitive, regex, whole words, and search in all tabs options

Important note:

- Search in all tabs applies only to text
- Replace in all tabs does not yet exist in this version

### 8.2 Hex Calculator

File: `tools/calc_tool.html`

Features:

- HEX / DEC / BIN conversion
- Arithmetic operations
- Calculation history
- Result copy

### 8.3 ROM Analysis

File: `tools/analysis_tool.html`

Features:

- Detailed analysis in separate window
- Data sections
- Found strings
- Entropy
- Report

### 8.4 Color Customization

File: `tools/color_customization_tool.html`

Features:

- Predefined palettes
- Colors by hex byte
- Decoded text colors
- Background colors
- Editor font and size
- Real-time preview

### 8.5 Relative Search

File: `tools/relative_search_tool.html`

Features:

- Search by relative patterns
- Application of character tables
- Table export/use
- Search in files and ROMs with custom encoding

### 8.6 Table Editor

File: `tools/table_editor_tool.html`

Features:

- Table creation and editing
- Support for `.json` and `.tbl`
- Predefined templates

### 8.7 Highlights

File: `tools/highlights_tool.html`

Features:

- list of highlights
- Comment editing
- Range navigation
- Removal
- Real-time update with main window
- It is possible to select the entire section of a highlight by right-clicking it and selecting "Select Entire Highlight".

### 8.8 Bookmarks

File: `tools/bookmark_tool.html`

Features:

- Bookmark creation and editing
- Current offset
- Title and comment
- Registration cancellation

## 8. Internationalization

The app supports PT and EN.

### 8.1 Interface

- Language switch updates interface and window texts
- Main file uses `js/core/i18n.js`

### 8.2 Electron Menu

- The menu also has PT/EN translation
- Menu language is saved in `menu_language.json` within `userData`

## 10. File Handling

### 10.1 Opening

Flow for normal files:

1. File dialog
2. File reading
3. Conversion to `Uint8Array`
4. Loading into editor

Flow for large files:

1. File dialog
2. `EnhancedLargeFileHandler.loadLargeFile(file)`
3. Virtual mapping in chunks
4. Partial viewport rendering
5. On-demand reading via IPC

### 10.2 Saving

- The app supports saving the current file
- The saving system integrates with editor protection and state mechanisms
- For large files, the integration layer works with chunks

### 10.3 Recent Files

- Maximum of 3 files
- Persisted in `recent_files.json` within `userData`
- `File` menu shows recent files
- No dedicated shortcuts to open recent files in current code

## 11. Extensibility

### 11.1 Modules

Main code was broken into several modules to ease maintenance, for example:

- `main_file_operations.js`
- `main_editing_operations.js`
- `main_history.js`
- `main_search.js`
- `main_bookmarks.js`
- `main_highlights.js`
- `main_analysis_core.js`
- `tab_session_manager.js`

### 11.2 New Tool

To add a new tool:

1. Create `tools/new_tool.html`
2. Create `js/tools/renderers/new_tool_renderer.js`
3. Add handlers in `electron/main.js`
4. Open the window via menu or button

## 12. File Formats

### 12.1 `.tbl` Table

```text
00= 
41=A
42=B
FF=[END]
```

### 12.2 `.json` Table

```json
{
  "name": "ASCII 8-bit",
  "type": "8-bit",
  "endianness": "BE",
  "mappings": {
    "0x00": " ",
    "0x41": "A",
    "0x42": "B"
  }
}
```

### 12.3 `.json` Bookmarks

The actual format follows the example in section 5.6.

## 13. Settings and User Files

Files the app uses in `userData`:

| File | Use |
|------|-----|
| `recent_files.json` | List of recent files |
| `menu_language.json` | Menu language |

## 14. Quick Shortcuts

### General

- `Ctrl+O`: open
- `Ctrl+S`: save
- `Ctrl+Shift+S`: save as
- `Ctrl+Q`: exit

### Editing

- `Ctrl+E`: toggle edit mode
- `Ctrl+I`: toggle insert/overwrite
- `F2`: toggle edit mode
- `Insert`: toggle insert/overwrite
- `Ctrl+Z`: undo
- `Ctrl+Y`: redo

### Tools

- `Ctrl+F`: find and replace
- `Ctrl+G`: go to offset
- `Ctrl+H`: calculator
- `Ctrl+B`: bookmarks

### Search

- `F3`: next result
- `Shift+F3`: previous result

### Navigation

- `Home`: start of current line
- `End`: end of current line
- `Ctrl+Home`: start of file
- `Ctrl+End`: end of file

---

Last update: April 2026

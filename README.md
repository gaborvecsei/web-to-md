# Web to Markdown - LLM Ready

A Chrome extension for converting web content to clean, token-efficient Markdown.

## Primary Use Case

**Copy web content for LLMs in the most token-efficient way possible.**

When interacting with AI assistants like Gemini, ChatGPT or Claude, web content is often bloated with HTML, CSS, and unnecessary markup.
This extension extracts exactly what you need and converts it to clean Markdown, reducing token usage and making conversations more efficient.

## Quick Start

1. Install the extension
2. Navigate to any webpage
3. Click the extension icon and select "Toggle zapper mode"
4. Hover over elements to highlight them
5. Click or press Enter to select
6. Press Cmd/Ctrl+C to copy as Markdown

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Esc` | Exit zapper mode |
| `Click` | Select element |
| `Enter` | Select hovered element |
| `Shift+Click` / `Shift+Enter` | Multi-select |
| `Cmd/Ctrl+C` | Copy selection as Markdown |
| `↑` | Navigate to parent element |
| `↓` | Navigate to child element |
| `Alt+Hover` | Smart container detection |

# External Libs

- Turndown: https://cdn.jsdelivr.net/npm/turndown/dist/turndown.js

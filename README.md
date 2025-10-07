
# EchoTrade

EchoTrade is an AI-powered web application that scrapes and delivers the latest news articles relevant to stocks and financial markets. Built with Vite, React, and TypeScript, it provides a fast, modern, and user-friendly interface for traders and investors to stay informed.

## Features

- 🔍 **AI Web Scraper**: Automatically fetches and analyzes news articles related to stocks.
- 📰 **Relevant News Feed**: Presents curated news based on stock tickers and market trends.
- ⚡ **Fast & Modern UI**: Built with Vite, React, and Tailwind CSS for a responsive experience.
- 🔎 **Ticker Search**: Quickly find news for specific stocks.
- ☁️ **Supabase Integration**: Secure backend for data storage and user management.

## Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- npm or bun

### Installation
```sh
npm install
```

### Development
```sh
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production
```sh
npm run build
```

## Deployment
You can deploy this app easily to platforms like Vercel. The default build output is in the `dist` folder.

## Project Structure
- `src/` — Main source code
	- `components/` — UI components
	- `hooks/` — Custom React hooks
	- `integrations/supabase/` — Supabase client and types
	- `pages/` — App pages
	- `lib/` — Utility functions
- `public/` — Static assets

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](LICENSE)

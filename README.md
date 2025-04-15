# SQL-Buddy Chrome Extension

A Chrome extension that provides a chat interface for SQL generation with visualizations in the browser's side panel.

## Features

- Natural language to SQL conversion
- Interactive chat interface
- Visualization of SQL query results
- Side panel integration for easy access
- Authentication with your existing account

## Development

### Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Build the extension:
   ```
   npm run build
   ```
   or for development mode with watch:
   ```
   npm run dev
   ```

### Loading in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `dist` folder from the build output
4. The extension should now appear in your extensions list

### Configuration

Update the API base URL in `src/lib/api/api-client.ts` to point to your backend service.

## Dependencies

- React
- TypeScript
- Tailwind CSS
- Chrome Extension APIs
- Chart.js for visualizations

## License

MIT

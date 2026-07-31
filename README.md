<<<<<<< HEAD
# fewfeedclone
=======
# Facebook Auto-Publisher

A web application for automatically publishing content to Facebook using Node.js, Express, and Facebook Graph API.

## Features

- Web-based interface for Facebook publishing
- Image upload with automatic hosting via freeimage.host
- Support for link sharing with custom headlines
- Real-time publishing status updates
- Multiple access token support

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Facebook Developer Account with valid access tokens

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd facebook-auto-publisher
```

2. Install dependencies:
```bash
npm install
```

3. Configure your Facebook credentials in the web interface or update the default values in `publish_to_facebook.sh`

## Usage

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to `http://localhost:3000`

3. Fill in the required fields:
   - Access Token (Facebook Graph API token)
   - Access Token 2 (Secondary token if needed)
   - Cookie Data (Facebook session cookies)
   - Upload an image
   - Enter link URL and headline

4. Click "Publish to Facebook" to post your content

## Project Structure

- `server.js` - Express server handling web interface and API endpoints
- `index.html` - Web interface for Facebook publishing
- `publish_to_facebook.sh` - Shell script for Facebook API interactions
- `package.json` - Node.js dependencies and scripts

## API Endpoints

- `GET /` - Main web interface
- `GET /api/defaults` - Get default configuration values
- `POST /publish` - Publish content to Facebook

## Dependencies

- express - Web framework
- multer - File upload handling
- form-data - Form data processing
- node-fetch - HTTP client for API requests

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Security Note

Keep your Facebook access tokens and cookies secure. Never commit sensitive credentials to version control.
>>>>>>> d66f329 (Initial commit of FB publisher app)

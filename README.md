# Sleaze Bot Web 🎭💎

A web-based version of the Sleaze Bot that transforms images with diamond grills, luxury accessories, and VHS effects.

## Features

- 🎨 **9 Sleaze Styles**: sleaze1, sleaze2, sleaze3, shadow, sleazify, megasleaze, ultrasleaze, group, flex
- 📸 **Image Upload**: Upload any image format (jpg, png, gif, webp, etc.)
- 🔄 **True Image-to-Image**: Uses your actual uploaded photo as the base
- 💎 **Diamond Grills**: Adds luxury accessories and VHS effects
- 🌐 **Web Interface**: Beautiful Bling Magazine website with flipbook
- 📱 **Responsive**: Works on desktop and mobile

## How It Works

1. Upload an image
2. Choose a sleaze style
3. The bot uses GPT-4.1-mini with image generation to transform your photo
4. Download your sleazed image with diamond grills and luxury accessories

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open http://localhost:3000

## Deployment

### Render

1. Create a new GitHub repository
2. Push your code to GitHub
3. Connect your GitHub repo to Render
4. Set environment variable: `OPENAI_API_KEY`
5. Deploy!

### Namecheap

1. Upload the zip file to your hosting
2. Extract the files
3. Run `npm install` on the server
4. Set environment variable: `OPENAI_API_KEY`
5. Start with `npm start`

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `PORT`: Port number (default: 3000)

## API Endpoints

- `GET /` - Main website
- `POST /transform` - Transform image
- `GET /result/:imageId` - Get transformed image
- `GET /health` - Health check

## Technologies Used

- Node.js
- Express.js
- OpenAI API (GPT-4.1-mini)
- Multer (file uploads)
- Jimp (image processing)
- jQuery & Turn.js (frontend)

## License

MIT

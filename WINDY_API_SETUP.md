# Windy.com API Setup Guide

## How to Get Your Windy.com API Key

### Step-by-Step Instructions

1. **Visit the Windy API Key Registration Page**
   - Go directly to: **https://api.windy.com/keys**
   - Or visit https://api.windy.com/ and navigate to the keys section

2. **Sign Up or Log In**
   - If you don't have an account, click "Sign Up" to create a free Windy.com account
   - If you already have an account, log in with your credentials

3. **Create a New API Key**
   - Once logged in, you'll see the API key management page
   - Click "Create New API Key" or "Generate API Key"
   - Give your API key a descriptive name (e.g., "Philcast Typhoon Monitoring")
   - Copy the generated API key immediately (you won't be able to see it again)

4. **Configure Your API Key**
   - Specify the domains where your application will be hosted
   - For local development, you can use `localhost` or `127.0.0.1`
   - For production, add your actual domain (e.g., `yourdomain.com`)

5. **Add API Key to Your Project**
   - Create or edit `.env.local` file in the project root directory
   - Add the following line:
     ```
     NEXT_PUBLIC_WINDY_API_KEY=your_api_key_here
     ```
   - Replace `your_api_key_here` with the actual API key you copied
   - **Important:** Never commit `.env.local` to version control (it should be in `.gitignore`)

6. **Restart Your Development Server**
   - Stop your Next.js development server (Ctrl+C)
   - Start it again with `npm run dev` or `yarn dev`
   - The API key will now be available in your application

## Current Implementation

The typhoon map component (`TyphoonMapWindy`) supports two modes:

### Mode 1: With API Key (Recommended)
- Uses the full Windy.com API
- More features and customization options
- Better performance
- Requires API key from https://api.windy.com/keys

### Mode 2: Widget Fallback (No API Key Required)
- Uses the Windy widget system
- Works without an API key
- Uses public app ID: `ea4746c6ad80abefcfd69bf5b01f729d`
- Good for testing and development

## Features

With the Windy.com API, the typhoon map provides:
- Real-time weather visualization
- Wind patterns and speed overlays
- Pressure systems
- Typhoon tracking markers
- Interactive popups with typhoon information
- Automatic centering on active typhoons

## Additional Resources

- **API Documentation:** https://api.windy.com/
- **Widget Documentation:** https://community.windy.com/topic/8168/release-notes-windy-plugins
- **Windy Community:** https://community.windy.com/
- **API Terms of Use:** https://account.windy.com/agreements/windy-forecast-api-terms-of-use

## Troubleshooting

- **Map not loading?** Check browser console for errors
- **API key not working?** Verify the key is correctly set in `.env.local` and restart the server
- **Widget fallback not working?** The widget should work without an API key, but check your internet connection


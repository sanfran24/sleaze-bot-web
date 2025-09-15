const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const OpenAI = require('openai');
const axios = require('axios');
const Jimp = require('jimp');

// Load environment variables first
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize OpenAI with error checking
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('❌ OPENAI_API_KEY environment variable is missing!');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('OPENAI')));
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: apiKey
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Ensure directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const resultsDir = path.join(__dirname, 'results');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept all image files
    if (file.mimetype.startsWith('image/')) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Sleaze prompts from your Python bot
const SLEAZE_PROMPTS = {
  "sleaze1": (
    "[CHARACHTER] caught off guard slightly squinting because of the camera flash, smiling wide with a shiny diamond-encrusted grill. " +
    "His wrist is raised close to his mouth to flex a massive diamond-covered wristwatch and a sparkling diamond ring. " +
    "He looks mischievous and faded, like he's having the most fun up to no good. The photo has subtle motion blur and a retro " +
    "disposable camera flash effect, like a candid party snapshot mid-movement. Dark, moody background with a bluish-purple tint, " +
    "strong blue retro VHS party filter overlay with slight analog distortion, cinematic old photograph aesthetic. " +
    "The diamonds sparkle brightly, exaggerated surreal luxury vibe. Maintain the exact same person's facial features, " +
    "hair style, skin tone, and overall appearance - only add the luxury accessories and change the lighting. " +
    "This should look like the same person with the sleaze transformation applied."
  ),
  "sleaze2": (
    "Shot of the person in the next image wearing a shiny, diamond-encrusted grill over their teeth, a large luxurious diamond-covered wristwatch, and a diamond ring. " +
    "The person is raising their wrist near their mouth to highlight the jewelry, smiling wide to show the grill. " +
    "The lighting has a dark, moody background with a blue-purple tint, creating a retro, grainy cinematic effect, just like an old photograph. " +
    "Glare on the diamonds for definition. " +
    "Maintain the exact same person's facial features, hair style, skin tone, and overall appearance - only add the luxury accessories and change the lighting."
  ),
  "sleaze3": (
    "[CHARACHTER] caught off guard slightly squinting because of the camera flash, smiling wide with a set of luxurious diamonds covering his teeth. " +
    "Faceted crystal cuts (not smooth surfaces). Bright sparkle glares on each tooth for definition. Keep the connected teeth grill effect. " +
    "The mouth should only be displaying a grill, no teeth visible. " +
    "His wrist is raised close to his mouth to flex a massive diamond-covered wristwatch and a sparkling diamond ring. " +
    "He looks mischievous and faded, like he's having the most fun up to no good. " +
    "The photo has subtle motion blur and a retro disposable camera flash effect, like a candid party snapshot mid-movement. " +
    "Dark, moody background with a bluish-purple tint, strong blue retro VHS party filter overlay with slight analog distortion, cinematic old photograph aesthetic. " +
    "The diamonds sparkle brightly, exaggerated surreal luxury vibe. Matching the same diamond treatment we've been using on chains and watches. " +
    "Maintain the exact same person's facial features, hair style, skin tone, and overall appearance - only add the luxury accessories and change the lighting."
  ),
  "shadow": (
    "Up-close dark silhouette of [CHARACHTER]. Torso angled slightly right, head turned back left (towards 8 o'clock). " +
    "Wide sinister smile with glowing diamond grill teeth. Two thick iced-out diamond chains (no medallions). " +
    "Style: VHS static filter background, moody shadow lighting, only diamonds sparkling bright. " +
    "Maintain the exact same person's facial features, hair style, skin tone, and overall appearance - only add the luxury accessories and change the lighting."
  ),
  "sleazify": (
    "[CHARACHTER] caught off guard, slightly squinting from the camera flash, smiling wide with a full diamond grill covering all teeth. " +
    "The grill is two solid connected pieces (one top, one bottom), each like a smooth band that covers all teeth at once. " +
    "The surface is plated and fully encrusted with tiny faceted diamonds across the band, sparkling with bright glares. No natural teeth visible. " +
    "His wrist is raised close to his mouth, flexing a massive diamond-encrusted wristwatch and a large sparkling diamond ring. " +
    "He looks mischievous and faded, like he's having the most fun up to no good. " +
    "The photo has subtle motion blur and a retro disposable camera flash effect, like a candid party snapshot mid-movement. " +
    "The background is dark and moody with a bluish-purple tint, layered with a strong retro VHS party filter overlay, slight analog distortion, and a cinematic old-photograph aesthetic. " +
    "The diamonds sparkle with an exaggerated, surreal luxury vibe, matching the same diamond treatment used on his chains and watch. " +
    "Maintain the exact same facial features, hairstyle, skin tone, and overall appearance of [CHARACHTER]. Only add the luxury accessories and lighting effects."
  ),
  "megasleaze": (
    "[CHARACHTER], caught off guard, squinting under a blinding disposable camera flash, grins wide with an insanely gaudy full diamond grill. " +
    "The grill is two massive, solid connected slabs (one top, one bottom), entirely encrusted with blinding faceted diamonds. " +
    "The surface is seamless, like a wall of crystal-cut ice, each facet exploding with surreal sparkles. No natural teeth visible — only a fortress of diamonds, glowing so bright it looks radioactive. " +
    "His wrist is cocked high to his mouth, flexing a monstrous diamond-drenched wristwatch the size of a fist, dripping with absurdly oversized stones. " +
    "On his pinky, a grotesquely flashy diamond ring, comically huge, shooting starburst glares into the lens. Chains hang heavy and reckless, every surface dripping with stones. " +
    "The whole pose radiates sleazy, unashamed bravado, like a villain caught in the middle of his best bad decision. " +
    "The background oozes chaos — silhouettes of sweaty partygoers blur in motion, neon lights streak across the frame, and faint hints of cash float midair in the distortion. " +
    "A hazy cloud of smoke drifts through, tinged bluish-purple, while a retro VHS analog filter crushes the image with scanlines, glitches, grain, and blown-out highlights. " +
    "It feels like a warped, cursed snapshot ripped straight from a 90s afterparty VHS tape, frozen mid-chaos. " +
    "The diamonds don't just sparkle — they burst with blinding, exaggerated flares, refracting into neon rainbow shards, scattering across the photo like lens flare shrapnel. " +
    "The entire image drips with obnoxious, surreal sleaze, turning luxury into parody, excess into art. " +
    "Maintain the exact same facial features, hairstyle, skin tone, 

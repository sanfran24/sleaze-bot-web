// Load environment variables FIRST - this is critical
require('dotenv').config();

// Check OpenAI API key immediately
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ CRITICAL ERROR: OPENAI_API_KEY environment variable is missing!');
  console.error('Please set OPENAI_API_KEY in your environment variables');
  process.exit(1);
}

console.log('✅ OpenAI API key found, initializing server...');

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const OpenAI = require('openai');
const Jimp = require('jimp');

const app = express();
const port = process.env.PORT || 3000;

// Initialize OpenAI with the verified API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

console.log('✅ OpenAI client initialized successfully');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));
app.use('/result', express.static(path.join(__dirname, 'results')));

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

// Sleaze prompts - all as single strings to avoid syntax issues
const SLEAZE_PROMPTS = {
  "sleaze1": "[CHARACHTER] caught off guard slightly squinting because of the camera flash, smiling wide with a shiny diamond-encrusted grill. His wrist is raised close to his mouth to flex a massive diamond-covered wristwatch and a sparkling diamond ring. He looks mischievous and faded, like he's having the most fun up to no good. The photo has subtle motion blur and a retro disposable camera flash effect, like a candid party snapshot mid-movement. Dark, moody background with a bluish-purple tint, strong blue retro VHS party filter overlay with slight analog distortion, cinematic old photograph aesthetic. The diamonds sparkle brightly, exaggerated surreal luxury vibe. Maintain the exact same person's facial features, hair style, skin tone, and overall appearance - only add the luxury accessories and change the lighting. This should look like the same person with the sleaze transformation applied.",
  "sleaze2": "Shot of the person in the next image wearing a shiny, diamond-encrusted grill over their teeth, a large luxurious diamond-covered wristwatch, and a diamond ring. The person is raising their wrist near their mouth to highlight the jewelry, smiling wide to show the grill. The lighting has a dark, moody background with a blue-purple tint, creating a retro, grainy cinematic effect, just like an old photograph. Glare on the diamonds for definition. Maintain the exact same person's facial features, hair style, skin tone, and overall appearance - only add the luxury accessories and change the lighting.",
  "sleaze3": "[CHARACHTER] caught off guard slightly squinting because of the camera flash, smiling wide with a set of luxurious diamonds covering his teeth. Faceted crystal cuts (not smooth surfaces). Bright sparkle glares on each tooth for definition. Keep the connected teeth grill effect. The mouth should only be displaying a grill, no teeth visible. His wrist is raised close to his mouth to flex a massive diamond-covered wristwatch and a sparkling diamond ring. He looks mischievous and faded, like he's having the most fun up to no good. The photo has subtle motion blur and a retro disposable camera flash effect, like a candid party snapshot mid-movement. Dark, moody background with a bluish-purple tint, strong blue retro VHS party filter overlay with slight analog distortion, cinematic old photograph aesthetic. The diamonds sparkle brightly, exaggerated surreal luxury vibe. Matching the same diamond treatment we've been using on chains and watches. Maintain the exact same person's facial features, hair style, skin tone, and overall appearance - only add the luxury accessories and change the lighting.",
  "shadow": "Up-close dark silhouette of [CHARACHTER]. Torso angled slightly right, head turned back left (towards 8 o'clock). Wide sinister smile with glowing diamond grill teeth. Two thick iced-out diamond chains (no medallions). Style: VHS static filter background, moody shadow lighting, only diamonds sparkling bright. Maintain the exact same person's facial features, hair style, skin tone, and overall appearance - only add the luxury accessories and change the lighting.",
  "sleazify": "[CHARACHTER] caught off guard, slightly squinting from the camera flash, smiling wide with a full diamond grill covering all teeth. The grill is two solid connected pieces (one top, one bottom), each like a smooth band that covers all teeth at once. The surface is plated and fully encrusted with tiny faceted diamonds across the band, sparkling with bright glares. No natural teeth visible. His wrist is raised close to his mouth, flexing a massive diamond-encrusted wristwatch and a large sparkling diamond ring. He looks mischievous and faded, like he's having the most fun up to no good. The photo has subtle motion blur and a retro disposable camera flash effect, like a candid party snapshot mid-movement. The background is dark and moody with a bluish-purple tint, layered with a strong retro VHS party filter overlay, slight analog distortion, and a cinematic old-photograph aesthetic. The diamonds sparkle with an exaggerated, surreal luxury vibe, matching the same diamond treatment used on his chains and watch. Maintain the exact same facial features, hairstyle, skin tone, and overall appearance of [CHARACHTER]. Only add the luxury accessories and lighting effects.",
  "megasleaze": "[CHARACHTER], caught off guard, squinting under a blinding disposable camera flash, grins wide with an insanely gaudy full diamond grill. The grill is two massive, solid connected slabs (one top, one bottom), entirely encrusted with blinding faceted diamonds. The surface is seamless, like a wall of crystal-cut ice, each facet exploding with surreal sparkles. No natural teeth visible — only a fortress of diamonds, glowing so bright it looks radioactive. His wrist is cocked high to his mouth, flexing a monstrous diamond-drenched wristwatch the size of a fist, dripping with absurdly oversized stones. On his pinky, a grotesquely flashy diamond ring, comically huge, shooting starburst glares into the lens. Chains hang heavy and reckless, every surface dripping with stones. The whole pose radiates sleazy, unashamed bravado, like a villain caught in the middle of his best bad decision. The background oozes chaos — silhouettes of sweaty partygoers blur in motion, neon lights streak across the frame, and faint hints of cash float midair in the distortion. A hazy cloud of smoke drifts through, tinged bluish-purple, while a retro VHS analog filter crushes the image with scanlines, glitches, grain, and blown-out highlights. It feels like a warped, cursed snapshot ripped straight from a 90s afterparty VHS tape, frozen mid-chaos. The diamonds don't just sparkle — they burst with blinding, exaggerated flares, refracting into neon rainbow shards, scattering across the photo like lens flare shrapnel. The entire image drips with obnoxious, surreal sleaze, turning luxury into parody, excess into art. Maintain the exact same facial features, hairstyle, skin tone, and overall appearance of [CHARACHTER], but amplify everything around him into an absurd, sleazy fever dream of bling and VHS-party chaos.",
  "ultrasleaze": "[CHARACHTER], caught off guard by a blinding disposable camera flash, squints and grins wide with an obnoxiously gaudy full diamond grill. The grill is two massive, solid connected slabs (top and bottom), seamlessly fused over his teeth like walls of crystal-cut ice. Each surface is packed with razor-edged faceted diamonds, sparkling so violently they explode into neon starbursts across the frame. No natural teeth are visible — only blinding diamond armor. His wrist is cocked up near his mouth, flaunting a monstrous, diamond-drenched wristwatch the size of a brick, every inch paved with glowing stones. A comically huge pinky ring shoots exaggerated lens flares directly into the camera, while chains spill across his chest like rivers of ice. His entire pose radiates sleazy, smug, unstoppable excess — like he owns not just the jewelry, but the entire store. The setting is an upscale jewelry store, but warped into a surreal VHS fever dream. Glass display cases overflow with ridiculous heaps of diamonds, gold chains, and watches stacked in impossible piles. Every surface reflects and refracts light, so the whole store glitters like a hallucination. The overhead lights flare into purple-blue VHS streaks, distorted scanlines bend across the frame, and neon glares scatter like rainbow shrapnel. In the background, distorted reflections of him stretch across glass cases, multiplying like sleazy clones. Price tags blur into nonsense symbols, and jewelry displays seem to melt into surreal diamond puddles on the floor. The air is hazy with a bluish tint, the whole scene captured like a cursed disposable-camera snapshot of an impossible flex. The diamonds don't just sparkle — they erupt with absurd, cartoonishly blinding glares, bouncing off every case and mirror until the entire room looks radioactive with excess. The aesthetic is retro VHS chaos fused with gaudy luxury, sleaze amplified to parody, like the universe itself bent around his flex. Maintain the exact same facial features, hairstyle, skin tone, and overall appearance of [CHARACHTER], but amplify everything into a surreal, sleazy jewelry store nightmare of bling and VHS distortion.",
  "group": "Group photo of [CHARACHTER] and friends, caught off guard, slightly squinting from the camera flash, all smiling wide with full diamond grills covering all teeth. Each person's grill is two solid connected pieces (one top, one bottom), each like a smooth band that covers all teeth at once. The surface is plated and fully encrusted with tiny faceted diamonds across the band, sparkling with bright glares. No natural teeth visible. Everyone's wrists are raised close to their mouths, flexing massive diamond-encrusted wristwatches and large sparkling diamond rings. They all look mischievous and faded, like they're having the most fun up to no good. The photo has subtle motion blur and a retro disposable camera flash effect, like a candid party snapshot mid-movement. The background is dark and moody with a bluish-purple tint, layered with a strong retro VHS party filter overlay, slight analog distortion, and a cinematic old-photograph aesthetic. The diamonds sparkle with an exaggerated, surreal luxury vibe, matching the same diamond treatment used on their chains and watches. Maintain the exact same facial features, hairstyle, skin tone, and overall appearance of each person, but add the luxury accessories and lighting effects to everyone in the group.",
  "flex": "Fisheye portrait of the [CHARACHTER] in oversized XL 1990s black urban fashion inspired by adidas street culture. Silver iced grillz, Rolex watch, and heavy iced-out chains reflecting in the flash. Leaning on the hood of a black 2009 Suzuki Jimny, driver-side headlight visible, while scrolling through a smartphone. Neon-lit Tokyo streets at night with wet asphalt reflections; cinematic hyperrealism with a surreal, otherworldly mood. Shot as if on a disposable Fujifilm camera with an 8mm fisheye lens; Portra 400 + Cinestill 800 film look; heavy grain, dirty frame, dust, direct flash. Vogue fashion editorial aesthetic, gritty film photography style, dark cinematic tones, photo realism. Maintain the exact same facial features, hairstyle, skin tone, and overall appearance of [CHARACHTER], but add the urban fashion, accessories, and lighting effects."
};

console.log('✅ Sleaze prompts loaded:', Object.keys(SLEAZE_PROMPTS).join(', '));

// Transform endpoint
app.post('/transform', upload.single('image'), async (req, res) => {
  let tempFilePath = null;
  let convertedPath = null;
  
  try {
    console.log('🎨 Transform request received');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    // Double-check API key is still available
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key missing during request!');
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }
    
    const { style = 'sleaze1' } = req.body;
    const imageId = uuidv4();
    
    console.log(`📸 Processing image with style: ${style}`);
    
    tempFilePath = req.file.path;
    
    // Convert image to PNG using Jimp
    let image;
    let isConverted = false;
    try {
      image = await Jimp.read(tempFilePath);
      convertedPath = path.join(uploadsDir, `${imageId}_converted.png`);
      await image.resize(1024, 1024).writeAsync(convertedPath);
      console.log('�� Image converted and resized');
      isConverted = true;
    } catch (error) {
      console.log('⚠️ Jimp conversion failed, trying alternative approach');
      // Try to read the file buffer directly
      try {
        const imageBuffer = fs.readFileSync(tempFilePath);
        const image = await Jimp.read(imageBuffer);
        convertedPath = path.join(uploadsDir, `${imageId}_converted.png`);
        await image.resize(1024, 1024).writeAsync(convertedPath);
        console.log('🔄 Image converted on second attempt');
        isConverted = true;
      } catch (secondError) {
        console.log('❌ All conversion attempts failed, using original file');
        convertedPath = tempFilePath;
        isConverted = false;
      }
    }
    
    // Get the selected prompt
    const sleazePrompt = SLEAZE_PROMPTS[style] || SLEAZE_PROMPTS['sleaze1'];
    
    console.log('🎨 Processing image with OpenAI Responses API...');
    
    const imageBase64 = fs.readFileSync(convertedPath).toString('base64');
    
    // Determine the correct MIME type
    const mimeType = isConverted ? 'image/png' : req.file.mimetype;
    console.log(`📷 Using MIME type: ${mimeType}`);
    
    // Use OpenAI Responses API for image-to-image generation
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: sleazePrompt },
            {
              type: "input_image",
              image_url: `data:${mimeType};base64,${imageBase64}`,
              detail: "high"
            }
          ]
        }
      ],
      tools: [{ type: "image_generation" }]
    });
    
    console.log('✨ Image processed with OpenAI!');
    
    // Extract the generated image from the response
    const imageData = response.output
      .filter(output => output.type === "image_generation_call")
      .map(output => output.result);
    
    if (imageData && imageData.length > 0) {
      const imageBase64Result = imageData[0];
      const imageBuffer = Buffer.from(imageBase64Result, 'base64');
      const resultPath = path.join(resultsDir, `${imageId}.png`);
      
      fs.writeFileSync(resultPath, imageBuffer);
      
      console.log(`💎 Sleaze transformation complete: ${imageId}`);
      
      res.json({
        success: true,
        image_id: imageId,
        style: style,
        message: 'Sleaze transformation complete!'
      });
    } else {
      throw new Error('No image generated in response');
    }
    
  } catch (error) {
    console.error('❌ Transform error:', error);
    res.status(500).json({
      error: 'Failed to process image',
      details: error.message
    });
  } finally {
    // Cleanup temporary files
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    if (convertedPath && fs.existsSync(convertedPath) && convertedPath !== tempFilePath) {
      fs.unlinkSync(convertedPath);
    }
  }
});

// Serve transformed images
app.get('/result/:imageId', (req, res) => {
  const { imageId } = req.params;
  const imagePath = path.join(resultsDir, `${imageId}.png`);
  
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    styles: Object.keys(SLEAZE_PROMPTS),
    api_key_configured: !!process.env.OPENAI_API_KEY
  });
});

// Start server
app.listen(port, () => {
  console.log('�� Sleaze Bot Web Server started successfully!');
  console.log(`🌐 Server running at http://localhost:${port}`);
  console.log(`💎 Available styles: ${Object.keys(SLEAZE_PROMPTS).join(', ')}`);
  console.log(`📁 Transform endpoint: http://localhost:${port}/transform`);
  console.log(`�� OpenAI API key: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
});

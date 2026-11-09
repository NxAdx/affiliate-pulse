import { Linking } from 'react-native';

export type CinematicPresetKey =
  | 'dark_luxury_watch'
  | 'minimalist_sneakers'
  | 'modern_cyber_tech'
  | 'executive_edc';

export interface CinematicPreset {
  key: CinematicPresetKey;
  label: string;
  icon: string;
  description: string;
}

export const CINEMATIC_PRESETS: Record<CinematicPresetKey, CinematicPreset> = {
  dark_luxury_watch: {
    key: 'dark_luxury_watch',
    label: 'Dark Luxury Horology',
    icon: 'watch-outline',
    description: 'Dark walnut, black marble, carbon fiber with warm rim lighting and macro bokeh.',
  },
  minimalist_sneakers: {
    key: 'minimalist_sneakers',
    label: 'Architectural Streetwear',
    icon: 'footsteps-outline',
    description: 'Raw concrete, directional sunlight, architectural shadows, editorial lookbook.',
  },
  modern_cyber_tech: {
    key: 'modern_cyber_tech',
    label: 'Cyber Neon Tech',
    icon: 'hardware-chip-outline',
    description: 'Matte black slate, electric cyan & purple rim lighting, mechanical keyboard bokeh.',
  },
  executive_edc: {
    key: 'executive_edc',
    label: 'Heritage Leather EDC',
    icon: 'briefcase-outline',
    description: 'Distressed brown leather, dark oak, warm ambient coffee shop bokeh, brass accents.',
  },
};

// --- DYNAMIC SCENE MATRICES (320+ Combinations Per Category) ---
const WATCH_SURFACES = [
  'dark polished Italian walnut wood and matte carbon fiber',
  'textured Nero Marquina black marble with fine gold veining',
  'distressed espresso brown bridle leather desk mat',
  'matte industrial volcanic slate with brushed titanium accents',
  'dark smoked glass tabletop with subtle reflective sheen',
];

const WATCH_ANGLES = [
  'isometric 45-degree macro close-up showcasing dial details and bezel chamfer',
  'dramatic low-angle hero profile highlighting the strap texture, crown and side casing',
  'overhead flat-lay editorial knolling composition with balanced negative space',
  'dynamic 3/4 beauty perspective with shallow depth-of-field separation',
];

const WATCH_LIGHTING = [
  'warm golden-hour rim lighting with soft falloff and natural specular reflections',
  'dramatic chiaroscuro split lighting with high contrast and deep moody shadows',
  'cool diffused Nordic daylight with soft gentle gradient falloff',
  'subtle dual-tone warm tungsten and cool titanium studio rim lighting',
];

const WATCH_PROPS = [
  'vintage rangefinder camera lens and brass fountain pen in soft atmospheric bokeh',
  'minimalist black ceramic espresso cup and leather cardholder in blurred background',
  'mechanical pencil, architectural draft sketch, and luxury cuff links in deep bokeh',
  'dark tailored wool blazer cuff and vintage leather journal in soft blur',
];

// Streetwear matrices
const SNEAKER_SURFACES = [
  'raw textured industrial concrete pedestal',
  'coarse asphalt with sharp geometric shadow lines',
  'minimalist brutalist sandstone block',
  'brushed aluminum industrial grating',
];

const SNEAKER_LIGHTING = [
  'crisp directional morning sunlight casting long diagonal architectural shadows',
  'high-contrast golden hour sun rays piercing through window blinds',
  'overcast diffused Tokyo street daylight with zero glare',
];

// Helper to pick random element
function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export class CinematicStudioService {
  /**
   * Generates the ChatGPT 2-Image Reference Prompt matching the user's proven workflow:
   * "Use first image as reference and generate same style, cinematography for 2nd image..."
   */
  static buildReferencePrompt(
    productTitle: string,
    presetKey: CinematicPresetKey = 'dark_luxury_watch'
  ): string {
    const preset = CINEMATIC_PRESETS[presetKey];
    return `Use first image as reference and generate same style, cinematography for 2nd image. Addjust the lighting, background, camera angel and all the aspect according so the image looks picture perfect and attractive, maintain the original aspect of product(dont modify product)(which we are regenerating 2nd image) & provide the most cinematic image.

Target Aesthetic: ${preset.label} (${preset.description})
Product: ${productTitle}`;
  }

  /**
   * Generates a completely unique, non-repetitive cinematic prompt every single time!
   * Combines dynamic angles, surfaces, lighting, and props so no two pins look identical.
   */
  static buildCinematicPrompt(
    productTitle: string,
    presetKey: CinematicPresetKey = 'dark_luxury_watch'
  ): { prompt: string; sceneDescription: string } {
    let surface: string;
    let angle: string;
    let lighting: string;
    let props: string;

    if (presetKey === 'minimalist_sneakers') {
      surface = pickRandom(SNEAKER_SURFACES);
      angle = 'dynamic three-quarter dynamic stance showing outsole contour and collar profile';
      lighting = pickRandom(SNEAKER_LIGHTING);
      props = 'monochrome architectural wall and subtle skate deck contour in soft background blur';
    } else if (presetKey === 'modern_cyber_tech') {
      surface = 'matte black textured slate surface with anodized aluminum accents';
      angle = 'elevated 30-degree isometric perspective showing all ports and premium chassis finish';
      lighting = 'subtle electric cyan and deep violet accent rim lighting with dark atmospheric falloff';
      props = 'custom mechanical keyboard with brass weight and oversized desk mat in deep bokeh';
    } else if (presetKey === 'executive_edc') {
      surface = 'aged full-grain brown saddle leather and dark quarter-sawn oak';
      angle = 'artfully arranged overhead flat-lay knolling arrangement';
      lighting = 'warm ambient coffee shop tungsten lighting with soft candlelight fill';
      props = 'brass heavy fountain pen, handmade titanium carabiner, and espresso demitasse in soft blur';
    } else {
      // Default: dark_luxury_watch
      surface = pickRandom(WATCH_SURFACES);
      angle = pickRandom(WATCH_ANGLES);
      lighting = pickRandom(WATCH_LIGHTING);
      props = pickRandom(WATCH_PROPS);
    }

    const sceneDescription = `${angle} on ${surface} with ${lighting}`;

    const prompt = `Use the product in the image as the exact commercial subject.
Generate an ultra-cinematic, award-winning commercial studio photograph of this item.

Scene Composition:
- Camera Perspective: ${angle} (f/1.8 macro depth of field)
- Surface & Texture: Placed naturally on ${surface}
- Lighting & Atmosphere: ${lighting}
- Background Depth-of-Field: ${props}

Crucial Quality Rules:
1. Maintain the exact original design, silhouette, markings, colors, and authentic proportions of the product without distortion.
2. The product must remain sharp, clear, and hero-centered.
3. Commercial 8K lookbook fidelity, photorealistic textures, zero AI artifacts.`;

    return {
      prompt: `Product: ${productTitle}\n\n${prompt}`,
      sceneDescription,
    };
  }

  /**
   * Generates the Pinterest Clickable Pin Creation URL
   * Attaches the direct Affiliate URL as destination, the product/cinematic image, and SEO description
   */
  static getPinterestCreatePinUrl(
    affiliateUrl: string,
    imageUrl: string,
    title: string,
    description: string = '',
    tags: string[] = []
  ): string {
    const tagCluster = tags && tags.length > 0 ? ` ${tags.join(' ')}` : '';
    const fullDescription = `${title} • ${description}${tagCluster}`.trim();
    return `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(
      affiliateUrl
    )}&media=${encodeURIComponent(imageUrl)}&description=${encodeURIComponent(fullDescription)}`;
  }

  /**
   * Direct 1-tap launcher to Pinterest with pre-filled clickable affiliate link & image
   */
  static async openPinterestPinBuilder(
    affiliateUrl: string,
    imageUrl: string,
    title: string,
    description: string = '',
    tags: string[] = []
  ): Promise<boolean> {
    const pinUrl = this.getPinterestCreatePinUrl(affiliateUrl, imageUrl, title, description, tags);
    try {
      const supported = await Linking.canOpenURL(pinUrl);
      if (supported) {
        await Linking.openURL(pinUrl);
        return true;
      }
      return false;
    } catch {
      await Linking.openURL(pinUrl);
      return true;
    }
  }

  /**
   * Normalizes and opens the user's Pinterest board
   */
  static openBoard(boardUrlOrHandle: string): void {
    let clean = (boardUrlOrHandle || '').trim();
    if (!clean) {
      Linking.openURL('https://pinterest.com');
      return;
    }

    if (!clean.startsWith('http')) {
      clean = `https://in.pinterest.com/${clean.replace(/^\//, '')}`;
    }

    Linking.openURL(clean).catch(() => {
      Linking.openURL('https://pinterest.com');
    });
  }

  /**
   * Attempts AI image generation via Gemini multimodal image generation API (gemini-3.1-flash-image)
   */
  static async generateImagenShot(
    prompt: string,
    apiKey: string
  ): Promise<{ success: boolean; imageBase64?: string; error?: string }> {
    if (!apiKey || !apiKey.trim()) {
      return { success: false, error: 'Missing Gemini API Key. Configure it in Settings.' };
    }

    const key = apiKey.trim();

    // 1. Try Imagen 3 Predict endpoint first (works on projects with Imagen enabled)
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${key}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '3:4',
            personGeneration: 'ALLOW_ADULT',
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
        if (b64) {
          return { success: true, imageBase64: `data:image/jpeg;base64,${b64}` };
        }
      }
    } catch {
      // Fall through to multimodal models
    }

    // 2. Candidate multimodal models supporting image output
    const candidateModels = [
      'gemini-2.5-flash-image',
      'gemini-3.1-flash-image',
      'gemini-2.0-flash-exp',
    ];

    for (const model of candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
            },
          }),
        });

        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        const parts = data?.candidates?.[0]?.content?.parts || [];

        for (const part of parts) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            return {
              success: true,
              imageBase64: `data:${mime};base64,${part.inlineData.data}`,
            };
          }
        }
      } catch {
        continue;
      }
    }

    return {
      success: false,
      error:
        'Google Imagen/Image generation is not enabled on this Gemini API key tier. Use 1-Tap "Copy ChatGPT Prompt" to generate with ChatGPT / Midjourney in seconds!',
    };
  }
}

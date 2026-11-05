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
  promptTemplate: string;
}

export const CINEMATIC_PRESETS: Record<CinematicPresetKey, CinematicPreset> = {
  dark_luxury_watch: {
    key: 'dark_luxury_watch',
    label: 'Dark Luxury Horology',
    icon: 'watch-outline',
    description: 'Dark polished walnut wood, carbon fiber, warm rim lighting, macro bokeh with camera lens in blur.',
    promptTemplate:
      'Use the product in the image as the exact subject. Generate an ultra-cinematic commercial studio photograph of this watch. Cinematography & Lighting: Placed diagonally on a dark polished walnut wood and matte carbon fiber desk, warm golden rim lighting, soft dramatic shadows, an anamorphic lens flare, shallow depth of field (f/1.8) with vintage camera lens in blurred background. Crucial: Maintain the exact original design, dial, hands, and case details of the product without altering its structure. 8K luxury horology lookbook.',
  },
  minimalist_sneakers: {
    key: 'minimalist_sneakers',
    label: 'Architectural Streetwear',
    icon: 'footsteps-outline',
    description: 'Raw textured concrete pedestal, crisp directional sunlight, architectural shadows, editorial lookbook.',
    promptTemplate:
      'Commercial editorial footwear photography of this exact pair of shoes. Placed on an industrial raw concrete pedestal, crisp high-contrast morning sunlight casting architectural diagonal shadows, neutral minimalist backdrop, f/2.8 commercial fashion lookbook. Maintain the exact colorway, silhouettes, and branding of the product without distortion.',
  },
  modern_cyber_tech: {
    key: 'modern_cyber_tech',
    label: 'Cyber Neon Tech',
    icon: 'hardware-chip-outline',
    description: 'Matte black slate desk, electric cyan & purple rim lighting, mechanical keyboard bokeh.',
    promptTemplate:
      'High-end tech gadget commercial photography. Placed on a matte black textured slate surface with subtle electric cyan and deep violet accent rim lighting, mechanical keyboard and desk mat in background bokeh, ultra-sharp reflections, f/2.0 commercial tech aesthetic. Keep the original product appearance perfectly intact.',
  },
  executive_edc: {
    key: 'executive_edc',
    label: 'Heritage Leather EDC',
    icon: 'briefcase-outline',
    description: 'Aged brown leather desk mat, dark oak, warm ambient coffee shop bokeh, brass accents.',
    promptTemplate:
      'Cinematic everyday-carry commercial flat-lay photography. Placed on full-grain distressed brown leather and dark oak tabletop, warm ambient coffee shop bokeh lighting, brass fountain pen and espresso cup in background blur, f/2.2 commercial lifestyle editorial. Keep the exact product design preserved.',
  },
};

export class CinematicStudioService {
  /**
   * Generates the tailored cinematic prompt for a given product and preset
   */
  static buildCinematicPrompt(
    productTitle: string,
    presetKey: CinematicPresetKey = 'dark_luxury_watch'
  ): string {
    const preset = CINEMATIC_PRESETS[presetKey] || CINEMATIC_PRESETS.dark_luxury_watch;
    return `Product: ${productTitle}\n\nDirection: ${preset.promptTemplate}`;
  }

  /**
   * Generates the Pinterest Clickable Pin Creation URL
   * Attaches the direct Affiliate URL as destination, the product/cinematic image, and SEO description
   */
  static getPinterestCreatePinUrl(
    affiliateUrl: string,
    imageUrl: string,
    title: string,
    description: string = ''
  ): string {
    const fullDescription = `${title} • ${description}`.trim();
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
    description: string = ''
  ): Promise<boolean> {
    const pinUrl = this.getPinterestCreatePinUrl(affiliateUrl, imageUrl, title, description);
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
   * Attempts AI image generation via Google Imagen 3 API using geminiApiKey
   */
  static async generateImagenShot(
    prompt: string,
    apiKey: string
  ): Promise<{ success: boolean; imageBase64?: string; error?: string }> {
    if (!apiKey || !apiKey.trim()) {
      return { success: false, error: 'Missing Gemini API Key. Configure it in Settings.' };
    }

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey.trim()}`;
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

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Imagen API returned status ${response.status}: ${errorText.substring(0, 100)}` };
      }

      const data = await response.json();
      const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
      if (b64) {
        return { success: true, imageBase64: `data:image/jpeg;base64,${b64}` };
      }

      return { success: false, error: 'No image returned in response.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to call Imagen 3 API' };
    }
  }
}

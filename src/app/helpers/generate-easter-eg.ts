import OpenAI from 'openai';
import { writeFile } from 'fs/promises';
import * as dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

type Option = {
    value: string | undefined;
    odds: number;
}

type OptionMap = { [key: string]: Option};

const basePrompt = "generate an image of a decorated easter egg in vertical orientation. make sure it is on a plain white background. some design specs for how just the egg should be decorated: "
const colors: OptionMap = {
    "basic": { value: undefined, odds: 0 },
    "rainbow": { value: "rainbow colors", odds: (40/1000) },
    "gold": { value: "golden", odds: (1/1000) },
    "purple": { value: "shades of different purples", odds: (40/1000) },
    "black-and-white": {value: "black and white, shaded", odds: (20/1000) },
    "blue": { value: "shades of different blues", odds: (40/1000) },
    "coloring-book": { value: "coloring-book outline style, black and white", odds: (25/1000) },
    "spring": { value: "spring colors", odds: (25/1000) },
    "orange": { value: "shades of different oranges", odds: (40/1000) },
    "yellow": { value: "yellow shades", odds: (40/1000) },
    "pink": { value: "shades of different pinks", odds: (40/1000) },
    "green": { value: "shades of different greens", odds: (40/1000) },
    "dual color": { value: "mix of just 2 different colors", odds: (50/1000) },
    "tricolor": { value: "mix of just 3 colors", odds: (50/1000) },
}

const colorType: OptionMap = {
    "basic": { value: undefined, odds: 0 },
    "shiny": { value: "glossy colors", odds: (30/100) },
    "flat": { value: "matte colors", odds: (20/100) },
}

const design: OptionMap = {
    "basic": { value: undefined, odds: 0 },
    "floral": { value: "floral design pattern", odds: (5/100)},
    "ancient": { value: "ancient hieroglyph pattern", odds: (15/100) },
    "geometric": { value: "geometric patterns", odds: (15/100) },
    "psychedelic": { value: "psychedelic patterns", odds: (10/100) },
    "human-like": { value: "with cartoony human features", odds: (3/100) },
}

const degen = "with a purple top hat on top of the egg"

const calculateBasicOdds = (options: OptionMap) => {
    const totalOdds = Object.values(options).reduce((sum, { odds }) => sum + odds, 0);
    const anyOdds = 1.0 - totalOdds; // Ensure total odds sum up to 1
    return anyOdds;
};

const selectOption = (options: OptionMap): { key: string, value: string | undefined } => {
    options.basic!.odds = calculateBasicOdds(options);

    let random = Math.random();
    let sum = 0;

    for (const [key,option] of Object.entries(options)) {
        sum += option.odds;
        if (random <= sum) {
            return { key: key, value: option.value }
        }
    }
    return { key: 'basic', value: undefined };
}

const buildPrompt = (id: number) => {
    const selectedColor = id === 420 ? { key: 'gold', value: colors.gold?.value } : selectOption(colors);
    const selectedColorType = selectOption(colorType);
    const selectedDesign = selectOption(design);
    const includeDegen = id === 69 ? true : Math.random() < 0.015;
    
    const parts = [basePrompt, selectedColor.value, selectedColorType.value, selectedDesign.value]
    if (includeDegen) parts.push(degen);

    return { 
        prompt: parts.filter((p) => p && p.length > 0).join("; "), 
        attributes: [
            {
                trait_type: 'color',
                value: selectedColor.key
            },
            {
                trait_type: 'colorType',
                value: selectedColorType.key,
            },
            {
                trait_type: 'design',
                value: selectedDesign.key,
            },
            {
                trait_type: 'degen',
                value: includeDegen,
            }
        ]
    };
}

const generateEasterEggImage = async (id: number): Promise<{ img: Buffer | undefined, name: string | undefined, attributes: { trait_type: string, value: string | boolean | number | undefined }[] | undefined }> => {
    try {
        const { prompt, attributes } = buildPrompt(id);
        const response = await openai.images.generate({
            model: 'dall-e-3',
            prompt: prompt,
            n: 1,
        });
        console.log(`Response: ${response.data[0]?.url}`)
        const img = response.data[0];
        if (img && img.url) {
            const imgResponse = await fetch(img.url);
            if (!imgResponse.ok) throw new Error('Failed to fetch image from url');

            const buffer = await imgResponse.arrayBuffer();
            return { img: Buffer.from(buffer), name: id.toString().padStart(4, '0'), attributes: attributes };
            //await writeFile(`public/egg-${id.toString().padStart(4, '0')}.png`, Buffer.from(buffer));
            //console.log(`File successfully saved`);
        }
    } catch (error: any) {
        console.error(`Failed to Generate and save image: `, error.message)
    }
    return { img: undefined, name: undefined, attributes: undefined};
}

export default generateEasterEggImage;
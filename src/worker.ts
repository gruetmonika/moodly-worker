import { fal } from "@fal-ai/client";
import { SupabaseClient } from "@supabase/supabase-js";
import { uploadToR2 } from "./storage";
import { createCollage } from "./collage";
import { sendDeliveryEmail } from "./email";
import { getPrompt } from "./prompts";

const PHOTOS_PER_VARIANT = 9;

interface CartItem {
  id: string;
  climate: string;
  climateName: string;
  variant: string;
  variantName: string;
  emoji: string;
}

interface Job {
  id: string;
  order_id: string;
  email: string;
  photo_url: string;
  cart: CartItem[];
}

async function generatePhoto(photoUrl: string, prompt: string): Promise<Buffer> {
  const FACE_PREFIX =
    "Preserve exact face, facial features, eye color, hair color, skin tone from reference image. Keep identical facial structure. ";

  const result = await fal.run("fal-ai/nano-banana-pro/edit", {
    input: {
      prompt: FACE_PREFIX + prompt,
      image_url: photoUrl,
      num_images: 1,
      image_size: "portrait_4_3",
    } as any,
  }) as any;

  const imageUrl: string = result.images?.[0]?.url;
  if (!imageUrl) throw new Error("Brak URL zdjęcia z fal.ai");

  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Błąd pobierania zdjęcia: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function processJob(supabase: SupabaseClient, job: Job): Promise<void> {
  const resultUrls: Record<string, { photos: string[]; collage: string }> = {};

  for (const item of job.cart) {
    console.log(`  → Generuję ${item.climateName} / ${item.variantName}`);
    const photoBuffers: Buffer[] = [];

    for (let i = 0; i < PHOTOS_PER_VARIANT; i++) {
      console.log(`     Zdjęcie ${i + 1}/${PHOTOS_PER_VARIANT}...`);
      const prompt = getPrompt(item.climate, item.variant, i);
      const buf = await generatePhoto(job.photo_url, prompt);
      photoBuffers.push(buf);
    }

    const photoUrls: string[] = [];
    for (let i = 0; i < photoBuffers.length; i++) {
      const key = `orders/${job.order_id}/${item.climate}-${item.variant}/photo-${i + 1}.jpg`;
      const url = await uploadToR2(photoBuffers[i], key, "image/jpeg");
      photoUrls.push(url);
    }

    console.log(`     Tworzę kolaż 9:16...`);
    const collageBuffer = await createCollage(photoBuffers);
    const collageKey = `orders/${job.order_id}/${item.climate}-${item.variant}/collage-9x16.jpg`;
    const collageUrl = await uploadToR2(collageBuffer, collageKey, "image/jpeg");

    resultUrls[item.id] = { photos: photoUrls, collage: collageUrl };
    await supabase.from("jobs").update({ result_urls: resultUrls }).eq("id", job.id);
  }

  await sendDeliveryEmail(job.email, job.cart, resultUrls);
}

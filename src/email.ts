import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY!);
interface CartItem {
  id: string;
  climateName: string;
  variantName: string;
  emoji: string;
}
interface Results {
  [itemId: string]: { photos: string[]; collage: string };
}
export async function sendDeliveryEmail(
  to: string,
  cart: CartItem[],
  results: Results
): Promise<void> {
  const variantsHtml = cart
    .map((item) => {
      const r = results[item.id];
      if (!r) return "";
      const photoLinks = r.photos
        .map(
          (url, i) =>
            `<a href="${url}" style="display:inline-block;margin:4px;padding:8px 14px;background:#f6f5f3;color:#0a0a0a;text-decoration:none;font-size:11px;letter-spacing:2px;font-family:Arial,sans-serif;">
              ZDJĘCIE ${i + 1}
            </a>`
        )
        .join("");
      return `
        <div style="margin-bottom:40px;padding-bottom:40px;border-bottom:1px solid #e8e8e8;">
          <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#888;margin:0 0 8px;">
            ${item.emoji} ${item.climateName}
          </p>
          <h2 style="font-size:22px;margin:0 0 20px;letter-spacing:2px;text-transform:uppercase;">
            ${item.variantName}
          </h2>
          <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#888;margin:0 0 12px;">
            9 ZDJĘĆ HD
          </p>
          <div style="margin-bottom:20px;">${photoLinks}</div>
          <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#888;margin:0 0 12px;">
            KOLAŻ 9:16
          </p>
          <a href="${r.collage}" style="display:inline-block;padding:12px 28px;background:#0a0a0a;color:#fff;text-decoration:none;font-size:11px;letter-spacing:3px;font-family:Arial,sans-serif;">
            POBIERZ KOLAŻ
          </a>
        </div>
      `;
    })
    .join("");
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#fff;font-family:Arial,sans-serif;">
      <div style="max-width:600px;margin:0 auto;padding:40px 24px;">
        <h1 style="font-size:14px;letter-spacing:12px;text-transform:uppercase;margin:0 0 48px;font-weight:400;">
          MOODLY
        </h1>
        <p style="font-size:13px;line-height:1.8;color:#444;margin:0 0 32px;">
          Twój lookbook jest gotowy! Poniżej znajdziesz linki do pobrania wszystkich zdjęć.
          Linki są aktywne przez <strong>7 dni</strong>.
        </p>
        ${variantsHtml}
        <div style="margin-top:48px;padding-top:32px;border-top:1px solid #e8e8e8;">
          <p style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#bbb;margin:0;">
            © 2025 MOODLY · AI Fashion Lookbook
          </p>
          <p style="font-size:10px;color:#ccc;margin:8px 0 0;line-height:1.6;">
            Masz pytania? Napisz na hello@moodly.pl
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
  const { error } = await resend.emails.send({
    from:    "MOODLY <onboarding@resend.dev>",
    to,
    subject: `✨ Twój lookbook MOODLY jest gotowy — ${cart.length} ${cart.length === 1 ? "wariant" : "warianty"}`,
    html,
  });
  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
  console.log(`  ✉ Email wysłany do ${to}`);
}

import path from "path";
import { Font } from "@react-pdf/renderer";

// Bangla support for PDFs. Noto Sans Bengali has no Latin letters, so text uses
// Helvetica first and falls back to Noto Sans Bengali for Bangla characters.
const dir = path.join(process.cwd(), "assets", "fonts");

let done = false;
export function registerPdfFonts() {
    if (done) return;
    Font.register({
        family: "NotoSansBengali",
        fonts: [
            { src: path.join(dir, "NotoSansBengali-Regular.ttf") },
            { src: path.join(dir, "NotoSansBengali-Bold.ttf"), fontWeight: "bold" },
        ],
    });
    // keep words whole (Bangla words must not be hyphen-split)
    Font.registerHyphenationCallback((word) => [word]);
    done = true;
}

export const PDF_FONT: any = ["Helvetica", "NotoSansBengali"];

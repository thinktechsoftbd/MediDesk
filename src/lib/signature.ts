// Doctor's signature printed on the prescription pad: an image data URL on the organization.

export const SIGNATURE_MAX_BYTES = 500 * 1024;

// From an organization save body: undefined = not sent (keep), null = removed,
// the data URL, or false when it is not an image data URL under the size limit.
export function signatureOf(body: any): string | null | undefined | false {
    if (!body || body.signatureUrl === undefined) return undefined;
    const v = String(body.signatureUrl || "");
    if (!v) return null;
    if (!/^data:image\/(png|jpe?g|webp|gif);base64,/.test(v) || v.length > SIGNATURE_MAX_BYTES * 1.4) return false;
    return v;
}

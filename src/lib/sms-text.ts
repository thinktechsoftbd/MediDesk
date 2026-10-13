// Character limits per ADN SMS rules; Bangla/any non-English text is sent as Unicode.
export function smsInfo(body: string) {
    const unicode = /[^\x00-\x7F]/.test(body);
    const max = unicode ? 500 : 900;
    const per = unicode ? 70 : 160;
    const multi = unicode ? 67 : 153;
    const len = body.length;
    const parts = len === 0 ? 0 : len <= per ? 1 : Math.ceil(len / multi);
    return { unicode, max, len, parts, over: len > max };
}

export function extractDate(text: string): Date {
    const patterns = [
        /\b(\d{2}-\d{2}-\d{4})\b/, // DD-MM-YYYY
        /\b(\d{4}-\d{2}-\d{2})\b/, // YYYY-MM-DD
        /\b(\d{2}\/\d{2}\/\d{4})\b/, // DD/MM/YYYY
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);

        if (match) return new Date(match[0]);
    }

    return new Date(); // Fallback to current date
}

export function extractAmount(text: string): number {
    const amountMatch = text.match(
        /(?:₹|RS?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i
    );

    if (!amountMatch) return 0;

    return parseFloat(
        amountMatch[1].replace(/,/g, '')
    );
}

export function extractUTR(text: string): string {
    return text.match(
        /(?:UTR|Ref\.? No\.?|Transaction ID)\s*[:]?\s*([A-Z0-9]{10,16})/i
    )?.[1]?.toUpperCase() || 'NOT_FOUND';
}

export function extractName(text: string): string {
    const nameMatch = text.match(
        /(?:Beneficiary|Name)\s*[:]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i
    );

    return nameMatch?.[1]?.trim() || 'Unknown';
}

export const maskEmail = (email: string, maskChar: string = '*'): string => {

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return email;
    }

    const [localPart, domain] = email.split('@');

    const maskLocalPart = (localPart: string, maskChar: string): string => {
        if (localPart.length >= 4) {
            // Show first 2 chars, mask the middle, show last 2 chars
            return `${localPart.slice(0, 2)}${maskChar.repeat(localPart.length - 4)}${localPart.slice(-2)}`;
        } else {
            // Mask all chars except the last one (if any)
            return `${maskChar.repeat(localPart.length - 1)}${localPart.slice(-1)}`;
        }
    };

    const maskDomain = (domain: string, maskChar: string): string => {
        const domainParts = domain.split('.');
        const tld = domainParts.pop(); // Keep TLD visible
        const domainName = domainParts.join('.'); // Mask the domain name
        return `${maskChar.repeat(domainName.length)}.${tld}`;
    };

    const maskedLocalPart = maskLocalPart(localPart, maskChar);
    const maskedDomain = maskDomain(domain, maskChar);

    // Return the masked email
    return `${maskedLocalPart}@${maskedDomain}`;
};
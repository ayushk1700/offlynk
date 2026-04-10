/**
 * Phase 1: Secure Contact Sharing
 * Generates an E2EE-compatible VCard string for sharing peers within the mesh.
 */
export const generateVCard = (name: string, phone: string, publicKey: string) => {
    return `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL:${phone}\nNOTE:OffLynkID:${publicKey}\nEND:VCARD`;
};

export const parseVCard = (vcard: string) => {
    const fn = vcard.match(/FN:(.*)/)?.[1];
    const tel = vcard.match(/TEL:(.*)/)?.[1];
    const id = vcard.match(/NOTE:OffLynkID:(.*)/)?.[1];
    return { name: fn, phone: tel, id };
};

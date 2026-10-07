/**
 * Single source of truth for the business contact details.
 *
 * The number used to be a literal in 17 files, which meant changing it meant
 * finding all 17, and they had already drifted from the web app's format:
 * `(410) 365-5556` here versus `410-365-5556` there, so the two products showed
 * the same business number differently.
 *
 * Format is straight digits — no parentheses. The parentheses read as a "bend"
 * at each end of the number, which is why the web app dropped them too.
 * Import this rather than retyping it.
 */
export const CONTACT_PHONE = '410-365-5556';

/** Digits only, for `tel:` hrefs. */
export const CONTACT_PHONE_HREF = '4103655556';

export const CONTACT_EMAIL = 'chriskbonsu@gmail.com';

export const CONTACT_ADDRESS = '9019 Early April Way, Ellicott City, MD';

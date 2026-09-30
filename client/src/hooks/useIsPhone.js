import { useMediaQuery } from './useMediaQuery.js';

// Phones only. Tablets and up keep the existing marketing/site layout, so this
// must stay aligned with the `md:` breakpoint Tailwind uses (768px).
export default function useIsPhone() {
  return useMediaQuery('(max-width: 767px)');
}

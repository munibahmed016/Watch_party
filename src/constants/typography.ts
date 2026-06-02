const typography = {
  // Font family names — matching the WatchPartyLive web app.
  // react-native-asset registers static weights by their PostScript names:
  //   Syne-Regular / Syne-Bold / Syne-ExtraBold
  //   Outfit-Regular / Outfit-Medium / Outfit-SemiBold
  //
  // Web app: headings = 'Syne' (.font-display), body = 'Outfit'
  fontFamilyHeading: 'Syne-ExtraBold',
  fontFamilyHeadingBold: 'Syne-ExtraBold',
  fontFamilyBody: 'Outfit-Regular',
  fontFamilyBodyMedium: 'Outfit-Medium',
  fontFamilyBodySemiBold: 'Outfit-SemiBold',

  // Backwards-compat alias (old code referenced this)
  fontFamilyBodyItalic: 'Outfit-Regular',

  // Sizes — bumped slightly to match web app's stronger hierarchy
  h1: 32,
  h2: 24,
  h3: 19,
  h4: 16,
  body: 14,
  small: 13,
  tiny: 11,

  // Weights
  weightRegular: '400' as const,
  weightMedium: '500' as const,
  weightSemiBold: '600' as const,
  weightBold: '700' as const,
};

export default typography;
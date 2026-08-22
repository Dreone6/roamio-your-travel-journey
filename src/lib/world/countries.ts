/**
 * Country name -> ISO 3166-1 alpha-2, and ISO -> flag emoji.
 *
 * Reverse geocoding returns English country names, so this map covers the
 * common spellings. Anything unknown simply renders without a flag — we never
 * guess a country the data doesn't support.
 */

const ISO_BY_NAME: Record<string, string> = {
  afghanistan: "af", albania: "al", algeria: "dz", andorra: "ad", angola: "ao",
  argentina: "ar", armenia: "am", aruba: "aw", australia: "au", austria: "at",
  azerbaijan: "az", bahamas: "bs", bahrain: "bh", bangladesh: "bd", barbados: "bb",
  belarus: "by", belgium: "be", belize: "bz", benin: "bj", bermuda: "bm",
  bhutan: "bt", bolivia: "bo", "bosnia and herzegovina": "ba", botswana: "bw",
  brazil: "br", brunei: "bn", bulgaria: "bg", "burkina faso": "bf", cambodia: "kh",
  cameroon: "cm", canada: "ca", "cape verde": "cv", "cayman islands": "ky",
  chile: "cl", china: "cn", colombia: "co", "costa rica": "cr", croatia: "hr",
  cuba: "cu", "curaçao": "cw", curacao: "cw", cyprus: "cy", czechia: "cz",
  "czech republic": "cz", denmark: "dk", "dominican republic": "do", ecuador: "ec",
  egypt: "eg", "el salvador": "sv", estonia: "ee", eswatini: "sz", ethiopia: "et",
  fiji: "fj", finland: "fi", france: "fr", "french polynesia": "pf", gabon: "ga",
  gambia: "gm", georgia: "ge", germany: "de", ghana: "gh", gibraltar: "gi",
  greece: "gr", greenland: "gl", grenada: "gd", guadeloupe: "gp", guatemala: "gt",
  guyana: "gy", haiti: "ht", honduras: "hn", "hong kong": "hk", hungary: "hu",
  iceland: "is", india: "in", indonesia: "id", iran: "ir", iraq: "iq",
  ireland: "ie", israel: "il", italy: "it", "ivory coast": "ci", jamaica: "jm",
  japan: "jp", jordan: "jo", kazakhstan: "kz", kenya: "ke", kosovo: "xk",
  kuwait: "kw", laos: "la", latvia: "lv", lebanon: "lb", libya: "ly",
  liechtenstein: "li", lithuania: "lt", luxembourg: "lu", macau: "mo",
  madagascar: "mg", malawi: "mw", malaysia: "my", maldives: "mv", malta: "mt",
  martinique: "mq", mauritius: "mu", mexico: "mx", moldova: "md", monaco: "mc",
  mongolia: "mn", montenegro: "me", morocco: "ma", mozambique: "mz", myanmar: "mm",
  namibia: "na", nepal: "np", netherlands: "nl", "new zealand": "nz",
  nicaragua: "ni", nigeria: "ng", "north macedonia": "mk", norway: "no",
  oman: "om", pakistan: "pk", palestine: "ps", panama: "pa", paraguay: "py",
  peru: "pe", philippines: "ph", poland: "pl", portugal: "pt", "puerto rico": "pr",
  qatar: "qa", romania: "ro", russia: "ru", rwanda: "rw", "saudi arabia": "sa",
  senegal: "sn", serbia: "rs", seychelles: "sc", singapore: "sg", slovakia: "sk",
  slovenia: "si", "south africa": "za", "south korea": "kr", korea: "kr",
  spain: "es", "sri lanka": "lk", sweden: "se", switzerland: "ch", taiwan: "tw",
  tanzania: "tz", thailand: "th", tunisia: "tn", turkey: "tr", türkiye: "tr",
  uganda: "ug", ukraine: "ua", "united arab emirates": "ae",
  "united kingdom": "gb", uk: "gb", england: "gb", scotland: "gb", wales: "gb",
  "united states": "us", "united states of america": "us", usa: "us",
  uruguay: "uy", uzbekistan: "uz", vatican: "va", venezuela: "ve", vietnam: "vn",
  zambia: "zm", zimbabwe: "zw",
};

export function isoForCountry(name: string | null | undefined): string | null {
  if (!name) return null;
  return ISO_BY_NAME[name.trim().toLowerCase()] ?? null;
}

/** Regional-indicator flag emoji. Returns null when the country is unknown. */
export function flagEmoji(name: string | null | undefined): string | null {
  const iso = isoForCountry(name);
  if (!iso || iso === "xk") return null;
  return iso
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}

// Original SVG artwork for the store, drawn in an old engraved-label style.
// A product with an uploaded photo shows the photo instead.

const INK = '#2b2118';

// Shared patterns and gradients, added to the page once.
export const ART_DEFS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <defs>
    <pattern id="hh-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
      <line x1="0" y1="0" x2="0" y2="5" stroke="${INK}" stroke-width="1" />
    </pattern>
    <pattern id="hh-hatch-fine" width="3.5" height="3.5" patternUnits="userSpaceOnUse" patternTransform="rotate(-40)">
      <line x1="0" y1="0" x2="0" y2="3.5" stroke="${INK}" stroke-width=".7" />
    </pattern>
    <pattern id="hh-weave" width="14" height="10" patternUnits="userSpaceOnUse">
      <rect width="14" height="10" fill="#c79a5b" />
      <path d="M0 5 Q3.5 1 7 5 T14 5" fill="none" stroke="${INK}" stroke-width="1" />
      <path d="M0 10 Q3.5 6 7 10 T14 10" fill="none" stroke="#8a6232" stroke-width="1.6" />
      <line x1="7" y1="0" x2="7" y2="10" stroke="${INK}" stroke-width=".6" opacity=".5" />
    </pattern>
    <linearGradient id="hh-honey" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#b8740f" />
      <stop offset=".35" stop-color="#e8a92a" />
      <stop offset=".7" stop-color="#d48e16" />
      <stop offset="1" stop-color="#9c5e0a" />
    </linearGradient>
    <linearGradient id="hh-lid" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8f7a4a" />
      <stop offset=".4" stop-color="#d9c48e" />
      <stop offset="1" stop-color="#7d683c" />
    </linearGradient>
  </defs>
</svg>`;

function egg(cx, cy, fill, rot = 0) {
  return `<g transform="rotate(${rot} ${cx} ${cy})">
    <path d="M${cx} ${cy - 21} C${cx + 13} ${cy - 21} ${cx + 16} ${cy + 2} ${cx + 15} ${cy + 8}
             C${cx + 13} ${cy + 18} ${cx - 13} ${cy + 18} ${cx - 15} ${cy + 8}
             C${cx - 16} ${cy + 2} ${cx - 13} ${cy - 21} ${cx} ${cy - 21} Z"
          fill="${fill}" stroke="${INK}" stroke-width="1.6" />
    <path d="M${cx + 4} ${cy + 14} C${cx + 11} ${cy + 11} ${cx + 13} ${cy + 4} ${cx + 13} ${cy - 2}" fill="none" stroke="url(#hh-hatch-fine)" stroke-width="5" opacity=".55" />
    <ellipse cx="${cx - 6}" cy="${cy - 8}" rx="3" ry="6" fill="#fff" opacity=".55" transform="rotate(20 ${cx - 6} ${cy - 8})" />
  </g>`;
}

export function eggCarton() {
  const cups = [0, 1, 2, 3, 4, 5].map(i => {
    const x = 34 + i * 26.4;
    return `<path d="M${x} 92 q13 12 26.4 0" fill="none" stroke="${INK}" stroke-width="1.3" />`;
  }).join('');
  return `<svg viewBox="0 0 220 150" role="img" aria-label="A carton of farm eggs">
    <ellipse cx="110" cy="138" rx="92" ry="7" fill="${INK}" opacity=".12" />
    <path d="M30 84 L48 30 L172 30 L190 84 Z" fill="#cdb894" stroke="${INK}" stroke-width="1.6" />
    <path d="M30 84 L48 30 L172 30 L190 84 Z" fill="url(#hh-hatch)" opacity=".18" />
    <path d="M58 40 L162 40" stroke="${INK}" stroke-width="1" opacity=".5" />
    ${egg(52, 80, '#f2ead9', -6)}${egg(80, 78, '#b8764a', 3)}${egg(108, 80, '#e6d6b8', -2)}
    ${egg(136, 78, '#a9c2b0', 5)}${egg(164, 80, '#c88f5e', -4)}
    <path d="M28 88 L192 88 L182 132 L38 132 Z" fill="#d8c6a2" stroke="${INK}" stroke-width="1.6" />
    <path d="M28 88 L192 88 L182 132 L38 132 Z" fill="url(#hh-hatch)" opacity=".12" />
    ${cups}
    <rect x="74" y="108" width="72" height="16" rx="2" fill="#f4ead5" stroke="${INK}" stroke-width="1" />
    <text x="110" y="119.5" text-anchor="middle" font-family="Georgia, serif" font-size="8" letter-spacing="1.2" fill="${INK}">FRESH EGGS</text>
  </svg>`;
}

export function honeyJar(big = false) {
  // The 2 lb jar is drawn taller and wider than the 1 lb jar.
  const w = big ? 104 : 88, h = big ? 104 : 80;
  const x0 = 110 - w / 2, x1 = 110 + w / 2, top = 148 - h - 22, neck = 10;
  return `<svg viewBox="35 ${big ? 0 : 14} 150 ${big ? 160 : 146}" role="img" aria-label="A ${big ? '2 lb' : '1 lb'} jar of honey">
    <ellipse cx="110" cy="150" rx="${w / 2 + 16}" ry="6" fill="${INK}" opacity=".12" />
    <path d="M${x0 + neck} ${top + 18} C${x0} ${top + 24} ${x0} ${top + 30} ${x0} ${top + 38}
             L${x0} 140 Q${x0} 148 ${x0 + 8} 148 L${x1 - 8} 148 Q${x1} 148 ${x1} 140
             L${x1} ${top + 38} C${x1} ${top + 30} ${x1} ${top + 24} ${x1 - neck} ${top + 18} Z"
          fill="url(#hh-honey)" stroke="${INK}" stroke-width="1.7" />
    <path d="M${x0 + 8} ${top + 44} L${x0 + 8} 136" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".35" />
    <path d="M${x1 - 10} ${top + 44} L${x1 - 10} 138" stroke="url(#hh-hatch-fine)" stroke-width="8" opacity=".5" />
    <rect x="${x0 + neck - 3}" y="${top}" width="${w - 2 * neck + 6}" height="19" rx="3" fill="url(#hh-lid)" stroke="${INK}" stroke-width="1.6" />
    ${[4, 8, 12, 16].map(d => `<line x1="${x0 + neck - 3}" y1="${top + d}" x2="${x1 - neck + 3}" y2="${top + d}" stroke="${INK}" stroke-width=".5" opacity=".45" />`).join('')}
    <g transform="translate(110 ${top + 22 + (148 - top - 22) / 2})">
      <rect x="-${w / 2 - 12}" y="-22" width="${w - 24}" height="44" rx="3" fill="#f4ead5" stroke="${INK}" stroke-width="1.2" />
      <rect x="-${w / 2 - 15}" y="-19" width="${w - 30}" height="38" rx="2" fill="none" stroke="${INK}" stroke-width=".6" />
      ${hexes(0, -9, 3.6)}
      <text y="5" text-anchor="middle" font-family="Georgia, serif" font-size="${big ? 8 : 7}" letter-spacing="1" fill="${INK}">PURE HONEY</text>
      <text y="15" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="${big ? 6.5 : 5.5}" fill="${INK}">${big ? 'net wt. 2 lb (907 g)' : 'net wt. 1 lb (454 g)'}</text>
    </g>
  </svg>`;
}

function hexes(cx, cy, r) {
  const hex = (x, y) => {
    const pts = [0, 1, 2, 3, 4, 5].map(i => {
      const a = Math.PI / 3 * i + Math.PI / 6;
      return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`;
    }).join(' ');
    return `<polygon points="${pts}" fill="#e8a92a" stroke="${INK}" stroke-width=".6" />`;
  };
  const dx = r * Math.sqrt(3);
  return [-1, 0, 1].map(i => hex(cx + i * dx, cy)).join('');
}

export function basket() {
  return `<svg viewBox="0 0 220 150" role="img" aria-label="A farm basket">
    <ellipse cx="110" cy="138" rx="88" ry="7" fill="${INK}" opacity=".12" />
    <path d="M44 74 C44 20 176 20 176 74" fill="none" stroke="${INK}" stroke-width="7" />
    <path d="M44 74 C44 20 176 20 176 74" fill="none" stroke="#b5884c" stroke-width="4.5" />
    <path d="M28 72 L192 72 L176 132 Q174 136 168 136 L52 136 Q46 136 44 132 Z" fill="url(#hh-weave)" stroke="${INK}" stroke-width="1.7" />
    <rect x="24" y="66" width="172" height="10" rx="4" fill="#b5884c" stroke="${INK}" stroke-width="1.6" />
  </svg>`;
}

export function bee(size = 44) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <path d="M4 50 C14 58 22 40 14 36 C6 32 8 46 20 46" fill="none" stroke="${INK}" stroke-width="1" stroke-dasharray="2 3" />
    <ellipse cx="34" cy="20" rx="9" ry="13" transform="rotate(-25 34 20)" fill="#f4ead5" stroke="${INK}" stroke-width="1.3" opacity=".9" />
    <ellipse cx="44" cy="22" rx="7" ry="11" transform="rotate(20 44 22)" fill="#f4ead5" stroke="${INK}" stroke-width="1.3" opacity=".9" />
    <ellipse cx="38" cy="38" rx="15" ry="10" fill="#e3a325" stroke="${INK}" stroke-width="1.5" />
    <path d="M33 29 Q30 38 33 47 M40 28 Q37 38 40 48 M47 30 Q44 38 47 46" fill="none" stroke="${INK}" stroke-width="3.2" />
    <circle cx="23" cy="38" r="5.5" fill="${INK}" />
    <path d="M20 34 Q16 26 13 27 M22 33 Q21 25 18 24" fill="none" stroke="${INK}" stroke-width="1" />
    <path d="M53 38 L58 39 L53 41" fill="${INK}" />
  </svg>`;
}

// Choose artwork from the product's name and size.
export function artFor(p) {
  const text = `${p.name} ${p.unit}`.toLowerCase();
  if (/honey/.test(text)) return honeyJar(/\b(2|two)\s*-?\s*(lb|pound)|\b32\s*oz|quart/.test(text));
  if (/egg/.test(text)) return eggCarton();
  return basket();
}

// ==== Темы игры ====
// Каждая тема: id, name, emoji, images: [] (URL фото или data:svg для рисованных тем)
// Пазл берёт картинку по индексу (level-1) % images.length — темы можно пополнять бесконечно.

function svgDataUrl(svg) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// ---- Оригинальные мультяшные герои (нарисованы с нуля, не копируют существующих персонажей) ----
function cartoonCharacter({ bg1, bg2, body, accent, kind }) {
  const shapes = {
    robot: `
      <rect x="150" y="120" width="220" height="200" rx="30" fill="${body}"/>
      <circle cx="210" cy="200" r="22" fill="#fff"/><circle cx="210" cy="200" r="10" fill="#222"/>
      <circle cx="310" cy="200" r="22" fill="#fff"/><circle cx="310" cy="200" r="10" fill="#222"/>
      <rect x="220" y="250" width="80" height="18" rx="9" fill="${accent}"/>
      <rect x="120" y="150" width="40" height="120" rx="18" fill="${body}"/>
      <rect x="360" y="150" width="40" height="120" rx="18" fill="${body}"/>
      <rect x="230" y="70" width="60" height="60" rx="14" fill="${accent}"/>
      <circle cx="260" cy="60" r="12" fill="${accent}"/>
    `,
    dragon: `
      <ellipse cx="260" cy="260" rx="140" ry="110" fill="${body}"/>
      <path d="M170 180 Q260 60 350 180 Z" fill="${accent}"/>
      <circle cx="210" cy="230" r="16" fill="#fff"/><circle cx="210" cy="230" r="7" fill="#222"/>
      <circle cx="300" cy="230" r="16" fill="#fff"/><circle cx="300" cy="230" r="7" fill="#222"/>
      <path d="M180 300 Q260 360 340 300 Q260 340 180 300Z" fill="${accent}"/>
      <path d="M370 240 Q440 220 420 280 Q390 270 370 240Z" fill="${body}"/>
    `,
    astrocat: `
      <circle cx="260" cy="270" r="130" fill="#f5f5f5"/>
      <path d="M180 180 L200 120 L230 190Z" fill="${body}"/>
      <path d="M340 180 L320 120 L290 190Z" fill="${body}"/>
      <circle cx="220" cy="270" r="16" fill="#222"/><circle cx="300" cy="270" r="16" fill="#222"/>
      <path d="M235 305 Q260 325 285 305" stroke="${accent}" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M150 250 Q100 260 130 300" stroke="#bbb" stroke-width="6" fill="none"/>
      <path d="M370 250 Q420 260 390 300" stroke="#bbb" stroke-width="6" fill="none"/>
      <rect x="200" y="360" width="120" height="60" rx="20" fill="${accent}"/>
    `,
    alien: `
      <ellipse cx="260" cy="230" rx="90" ry="110" fill="${body}"/>
      <ellipse cx="220" cy="220" rx="30" ry="40" fill="#111"/>
      <ellipse cx="300" cy="220" rx="30" ry="40" fill="#111"/>
      <ellipse cx="230" cy="210" rx="10" ry="14" fill="#fff"/>
      <ellipse cx="310" cy="210" rx="10" ry="14" fill="#fff"/>
      <path d="M200 300 Q260 330 320 300" stroke="${accent}" stroke-width="8" fill="none" stroke-linecap="round"/>
      <rect x="220" y="330" width="80" height="90" rx="30" fill="${accent}"/>
    `,
    unicorn: `
      <ellipse cx="260" cy="280" rx="120" ry="100" fill="#fff"/>
      <path d="M340 200 L400 120 L370 210Z" fill="${accent}"/>
      <path d="M170 160 Q260 100 330 160 Q300 180 260 175 Q220 180 170 160Z" fill="${body}"/>
      <circle cx="230" cy="270" r="14" fill="#222"/><circle cx="310" cy="270" r="14" fill="#222"/>
      <path d="M245 305 Q260 315 275 305" stroke="${accent}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M150 220 Q120 200 100 230" stroke="${body}" stroke-width="10" fill="none" stroke-linecap="round"/>
    `,
    penguin: `
      <ellipse cx="260" cy="290" rx="110" ry="130" fill="${body}"/>
      <ellipse cx="260" cy="310" rx="70" ry="95" fill="#fff"/>
      <circle cx="235" cy="230" r="13" fill="#222"/><circle cx="285" cy="230" r="13" fill="#222"/>
      <path d="M245 255 L275 255 L260 275Z" fill="${accent}"/>
      <ellipse cx="260" cy="150" rx="60" ry="40" fill="${accent}" opacity=".9"/>
    `
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 520">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/>
    </linearGradient></defs>
    <rect width="520" height="520" fill="url(#bg)"/>
    ${shapes[kind]}
  </svg>`;
}

const CARTOON_IMAGES = [
  cartoonCharacter({ bg1: '#a1c4fd', bg2: '#c2e9fb', body: '#5b6df5', accent: '#ffd166', kind: 'robot' }),
  cartoonCharacter({ bg1: '#f6d365', bg2: '#fda085', body: '#e8542e', accent: '#ffe66d', kind: 'dragon' }),
  cartoonCharacter({ bg1: '#0f2027', bg2: '#2c5364', body: '#333', accent: '#6c5ce7', kind: 'astrocat' }),
  cartoonCharacter({ bg1: '#8fd3f4', bg2: '#84fab0', body: '#57e08b', accent: '#2d9d6b', kind: 'alien' }),
  cartoonCharacter({ bg1: '#ffecd2', bg2: '#fcb69f', body: '#f7b2d9', accent: '#e56ab0', kind: 'unicorn' }),
  cartoonCharacter({ bg1: '#e0eafc', bg2: '#cfdef3', body: '#2d3436', accent: '#ff7675', kind: 'penguin' })
].map(svgDataUrl);

// ---- Темы с фотореалистичными изображениями ----
// Все фото — с Wikimedia Commons (Public Domain / CC0 / CC-BY / CC-BY-SA, см. CREDITS),
// скачаны один раз и лежат локально в папке images/ — игра работает без интернета.
function localImages(themeId, count) {
  const arr = [];
  for (let i = 1; i <= count; i++) {
    const path = `images/${themeId}/${i}.jpg`;
    // В версии «одним файлом» картинки вшиты прямо в него, иначе берём из папки.
    arr.push((self.EMBEDDED_IMAGES && self.EMBEDDED_IMAGES[path]) || path);
  }
  return arr;
}

const THEMES = [
  { id: 'animals', name: 'Животные', emoji: '🐾', images: localImages('animals', 7) },
  { id: 'flowers', name: 'Цветы', emoji: '🌸', images: localImages('flowers', 6) },
  { id: 'cities', name: 'Города', emoji: '🏙️', images: localImages('cities', 6) },
  { id: 'sea', name: 'Море', emoji: '🌊', images: localImages('sea', 5) },
  { id: 'travel', name: 'Путешествия', emoji: '✈️', images: localImages('travel', 5) },
  { id: 'architecture', name: 'Архитектура', emoji: '🏛️', images: localImages('architecture', 5) },
  { id: 'interiors', name: 'Помещения', emoji: '🛋️', images: localImages('interiors', 6) },
  { id: 'historical_figures', name: 'Известные люди', emoji: '🎓', images: localImages('historical_figures', 5) },
  { id: 'fruits_berries', name: 'Фрукты и ягоды', emoji: '🍓', images: localImages('fruits_berries', 5) },
  { id: 'vegetables', name: 'Овощи', emoji: '🥕', images: localImages('vegetables', 5) },
  { id: 'transport', name: 'Транспорт', emoji: '🚗', images: localImages('transport', 5) },
  { id: 'historical_scenes', name: 'Исторические сцены', emoji: '🏰', images: localImages('historical_scenes', 5) },
  { id: 'cartoons', name: 'Мультяшные герои', emoji: '🎨', images: CARTOON_IMAGES }
];

const CREDITS = {
  animals: [
    { title: 'Male Lion prowling in the Serengeti National Park', author: 'Giles Laurent', license: 'CC BY-SA 4.0' },
    { title: 'Red Fox drinking from a lake in Gennevilliers, France', author: 'Alexis Lours', license: 'CC BY 4.0' },
    { title: 'Spotted Owl Forest Bird', author: 'Olympic National Park (NPS)', license: 'Public domain' },
    { title: 'Atlantic bottlenose dolphin jumping at Pelican Point', author: 'Giles Laurent', license: 'CC BY-SA 4.0' },
    { title: 'Panda in Chengdu Research Base of Giant Panda Breeding', author: 'George Lu', license: 'CC BY 2.0' },
    { title: 'Domestic shorthair cat portrait in grass', author: 'Marko Milivojevic', license: 'CC0' },
    { title: 'Male African bush elephant in Etosha National Park', author: 'Giles Laurent', license: 'CC BY-SA 4.0' }
  ],
  flowers: [
    { title: 'Red rose with black background', author: 'Laitche', license: 'CC BY-SA 4.0' },
    { title: 'Lonely Tulip In A Field Of Tulips', author: 'Ron Clark', license: 'CC0' },
    { title: 'Sunflower field in Burgundy, 2024', author: 'Ibex73', license: 'CC BY 4.0' },
    { title: 'Cherry tree blossom 2020', author: 'George Chernilevsky', license: 'CC BY-SA 4.0' },
    { title: 'Ban Ki-Moon Orchid Flower, Singapore', author: 'Timothy A. Gonsalves', license: 'CC BY-SA 4.0' },
    { title: 'Pink rose bloom of a climbing rose, Boreham, Essex', author: 'Acabashi', license: 'CC BY-SA 4.0' }
  ],
  cities: [
    { title: 'Paris Night (from Maine-Montparnasse tower)', author: 'Benh LIEU SONG', license: 'CC BY-SA 4.0' },
    { title: 'New York Midtown Skyline at Night', author: 'Diliff (David Iliff)', license: 'CC BY-SA 3.0' },
    { title: 'Tokyo skyline from the Keio Plaza Hotel', author: 'KimonBerlin', license: 'CC BY-SA 2.0' },
    { title: 'Panorama Piazza San Marco and Venice on Easter', author: 'Wolfgang Moroder', license: 'CC BY-SA 3.0' },
    { title: 'Prague skyline at dawn', author: 'Petar Milošević', license: 'CC BY-SA 4.0' },
    { title: 'Prague Panorama', author: 'Diliff', license: 'CC BY-SA 3.0' }
  ],
  sea: [
    { title: 'Malapascua Island, Tropical beach, Philippines', author: 'Vyacheslav Argenberg', license: 'CC BY 4.0' },
    { title: 'Coral (Acropora hemprichii), Ras Katy, Sharm el-Sheikh', author: 'Diego Delso', license: 'CC BY-SA 4.0' },
    { title: 'Kjeungskjær Lighthouse, Norway', author: 'Gordon Leggett', license: 'CC BY-SA 4.0' },
    { title: 'Waves Shore Ocean', author: 'Frantzou Fleurine', license: 'CC0' },
    { title: 'Seal Rocks, Ocean Beach, San Francisco', author: 'Radomianin', license: 'CC BY-SA 4.0' }
  ],
  travel: [
    { title: 'Cappadocia Balloon Inflating', author: 'Benh LIEU SONG', license: 'CC BY-SA 3.0' },
    { title: 'Leon hot air balloon festival 2010', author: 'Tomas Castelazo', license: 'CC BY-SA 3.0' },
    { title: 'Hiking Deer Mountain Traverse', author: 'Forest Service Alaska Region, USDA', license: 'Public domain' },
    { title: 'Hiker on mountain slope with flowers', author: 'Olympic National Park (NPS)', license: 'Public domain' },
    { title: 'Grayback Mountain hikers', author: 'Bureau of Land Management Oregon and Washington', license: 'Public domain' }
  ],
  architecture: [
    { title: 'Colosseum in Rome, Italy', author: 'Diliff', license: 'CC BY-SA 2.5' },
    { title: 'Taj Mahal, Agra, India', author: 'Diego Delso', license: 'CC BY-SA 4.0' },
    { title: 'Exterior of the Apse of the Sagrada Família', author: 'Didier Descouens', license: 'CC BY-SA 4.0' },
    { title: 'The Eiffel Tower in spring', author: 'Jorge Royan', license: 'CC BY-SA 3.0' },
    { title: 'Schloss Neuschwanstein, Schwangau', author: 'C.Stadler/Bwag', license: 'CC BY-SA 4.0' }
  ],
  interiors: [
    { title: 'State Library of Victoria, La Trobe Reading Room', author: 'Diliff', license: 'CC BY 2.5' },
    { title: 'NYC Public Library Research Room', author: 'Diliff', license: 'CC BY 2.5' },
    { title: 'Sustainable Kitchen interior', author: 'Jeremy Levine', license: 'CC BY 2.0' },
    { title: '19th century Victorian living room, Auckland', author: 'Jorge Royan', license: 'CC BY-SA 3.0' },
    { title: 'Cabin living room with sofa and fireplace, Douthat State Park', author: 'vastateparksstaff', license: 'CC BY 2.0' },
    { title: 'Bedroom interior', author: 'Het Nieuwe Instituut - Architecture Collection', license: 'No restrictions' }
  ],
  historical_figures: [
    { title: 'Albert Einstein portrait photograph', author: 'Oren Jack Turner', license: 'Public domain' },
    { title: 'Leo Tolstoy, first color photo portrait in Russia (1908)', author: 'Sergei Prokudin-Gorskii', license: 'Public domain' },
    { title: 'Portrait of Sir Isaac Newton, 1689', author: 'Godfrey Kneller', license: 'Public domain' },
    { title: 'Bonaparte, First Consul', author: 'François Gérard', license: 'Public domain' },
    { title: 'Napoleon I of France', author: 'Andrea Appiani', license: 'Public domain' }
  ],
  fruits_berries: [
    { title: 'Strawberry field, Dülmen', author: 'Dietmar Rabich', license: 'CC BY-SA 4.0' },
    { title: 'Orange fruit (Citrus x sinensis)', author: 'Kuttykrishnan Photos', license: 'CC0' },
    { title: 'Bunch of grapes', author: 'N Chadwick', license: 'CC BY-SA 2.0' },
    { title: 'Watermelon', author: 'USDA photo by Scott Bauer', license: 'Public domain' },
    { title: 'Blueberries and raspberries in a plate', author: 'epSos.de', license: 'CC BY 2.0' }
  ],
  vegetables: [
    { title: 'Organic home-grown tomatoes, unripe to ripe', author: 'Michal Klajban', license: 'CC BY-SA 4.0' },
    { title: 'Bell peppers, Mercado de Arroios, Lisbon', author: 'Jules Verne Times Two', license: 'CC BY-SA 4.0' },
    { title: 'Preparing and slicing carrots', author: 'W.carter', license: 'CC0' },
    { title: 'Pumpkins', author: 'Nino Barbieri', license: 'CC BY-SA 2.5' },
    { title: 'Pumpkins at Whole Foods, Sonoma, California', author: 'Sarah Stierch', license: 'CC BY 4.0' }
  ],
  transport: [
    { title: 'Chevy Bel Air in the Presidio of San Francisco', author: 'Frank Schulenburg', license: 'CC BY-SA 4.0' },
    { title: 'LV-0233 steam locomotive at Taganrog-II station', author: 'Alexxx1979', license: 'CC BY-SA 4.0' },
    { title: 'Sailing vessel Rembrandt van Rijn', author: 'Vaido Otsar', license: 'CC BY-SA 4.0' },
    { title: 'Hot air balloon', author: 'Alexey V. Kurochkin', license: 'CC BY-SA 4.0' },
    { title: 'South Beach Miami Classic Car', author: 'Don Ramey Logan', license: 'CC BY 4.0' }
  ],
  historical_scenes: [
    { title: 'Wale Street with Supreme Court, Cape Town, 1878', author: 'Anonymous (Cape Colony archives)', license: 'Public domain' },
    { title: 'Vintage postcard - Devonshire Street & Market Square, Penrith', author: 'Mark Crombie (archival postcard)', license: 'Public domain' },
    { title: 'Vintage real photo postcard, Market Street, Kirkby Lonsdale', author: 'Mark Crombie (archival postcard)', license: 'Public domain' },
    { title: 'Medieval castle gallery interior, Burghausen', author: 'Derbrauni', license: 'CC BY-SA 4.0' },
    { title: 'Neuschwanstein Castle, historic print', author: 'Unknown (Library of Congress)', license: 'Public domain' }
  ],
  cartoons: [{ title: 'Оригинальные иллюстрации', author: 'нарисовано для этого приложения', license: 'Все права у автора приложения' }]
};

const LEVELS_PER_THEME = 12;

function gridForLevel(level) {
  // Растёт с каждым уровнем: 3x3 -> ... -> 8x8, дальше остаётся 8x8
  const step = Math.min(level - 1, 10);
  const cols = 3 + Math.ceil(step / 2);
  const rows = 3 + Math.floor(step / 2);
  return { rows: Math.min(rows, 8), cols: Math.min(cols, 8) };
}

function imageForLevel(theme, level) {
  if (!theme.images.length) return null;
  return theme.images[(level - 1) % theme.images.length];
}

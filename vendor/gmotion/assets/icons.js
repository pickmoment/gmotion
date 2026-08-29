/*! icons — 픽토그램 191종. mojs · scriptviz · mindmap 스킬과 같은 24x24 stroke 세트다.
 *  산출물에는 스펙이 실제로 쓴 아이콘만 인라인된다. 한글 이름으로도 부른다.
 */
'use strict';
var ICONS = {
  check: 'M20 6L9 17l-5-5',
  x: 'M18 6L6 18M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  right: 'M5 12h14M13 6l6 6-6 6',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M18 13l-6 6-6-6',
  trendup: 'M3 17l6-6 4 4 8-8M17 7h4v4',
  trenddown: 'M3 7l6 6 4-4 8 8M17 17h4v-4',
  user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8',
  users: 'M17 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9.5 11a4 4 0 100-8 4 4 0 000 8M22 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8',
  heart: 'M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 000-7.8z',
  star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
  fire: 'M8.5 14.5A2.5 2.5 0 0011 12c0-1.4-.5-2-1-3-1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a7 7 0 11-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 002.5 2.5z',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
  clock: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
  calendar: 'M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18',
  hourglass: 'M6 2h12M6 22h12M6 2c0 5 6 6 6 10 0-4 6-5 6-10M6 22c0-5 6-6 6-10 0 4 6 5 6 10',
  won: 'M12 22a10 10 0 100-20 10 10 0 000 20zM8 8l2 8 2-5 2 5 2-8M7 12h10',
  wallet: 'M20 12V8H6a2 2 0 010-4h12v4M4 6v12a2 2 0 002 2h14v-4M18 12a2 2 0 000 4h4v-4z',
  cart: 'M9 21a1 1 0 100-2 1 1 0 000 2zM20 21a1 1 0 100-2 1 1 0 000 2zM1 2h3l2.7 12.4a2 2 0 002 1.6h9.6a2 2 0 002-1.6L23 6H6',
  tag: 'M20.6 13.4L12 22l-9-9V3h10l7.6 7.6a2 2 0 010 2.8zM7.5 7.5h.01',
  chart: 'M18 20V10M12 20V4M6 20v-6',
  pie: 'M21.2 15.9A10 10 0 118.1 2.8M22 12A10 10 0 0012 2v10z',
  target: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z',
  rocket: 'M12 2c2.7 2.7 4.3 6.4 4.3 10.5V16H7.7v-3.5C7.7 8.4 9.3 4.7 12 2zM12 11.5a2 2 0 100-4 2 2 0 000 4M7.7 13 4.5 16v4l3.2-2.6M16.3 13l3.2 3v4l-3.2-2.6M10.2 16.3c.4 2.2 1 3.7 1.8 5.2.8-1.5 1.4-3 1.8-5.2',
  bulb: 'M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z',
  search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z',
  lock: 'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4',
  unlock: 'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 019.9-1',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  warn: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
  info: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01',
  question: 'M12 22a10 10 0 100-20 10 10 0 000 20zM9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01',
  doc: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M9 13h6M9 17h6',
  folder: 'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z',
  mail: 'M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zM22 6l-10 7L2 6',
  phone: 'M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z',
  laptop: 'M4 4h16a2 2 0 012 2v9H2V6a2 2 0 012-2zM1 19h22',
  server: 'M20 2H4a2 2 0 00-2 2v4a2 2 0 002 2h16a2 2 0 002-2V4a2 2 0 00-2-2zM20 14H4a2 2 0 00-2 2v4a2 2 0 002 2h16a2 2 0 002-2v-4a2 2 0 00-2-2zM6 6h.01M6 18h.01',
  cloud: 'M17.5 19a4.5 4.5 0 00.5-9 6.5 6.5 0 00-12.6 1.6A4 4 0 006 19z',
  database: 'M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3zM20 12c0 1.7-3.6 3-8 3s-8-1.3-8-3M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.9 1.2V21a2 2 0 11-4 0v-.1A1.7 1.7 0 007 19.4l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00-1.2-2.9H3a2 2 0 110-4h.1A1.7 1.7 0 004.6 7l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 002.9-1.2V3a2 2 0 114 0v.1a1.7 1.7 0 002.9 1.2l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 001.2 2.9H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  key: 'M7.2 16.3a4.8 4.8 0 100-9.6 4.8 4.8 0 000 9.6M7.2 13.2a1.7 1.7 0 100-3.4 1.7 1.7 0 000 3.4M12 11.5h9.5M17 11.5v3.6M21.5 11.5v2.8',
  link: 'M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7L12 19',
  globe: 'M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2a15 15 0 014 10 15 15 0 01-4 10 15 15 0 01-4-10 15 15 0 014-10z',
  pin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z',
  camera: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z',
  video: 'M23 7l-7 5 7 5zM14 5H3a2 2 0 00-2 2v10a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2z',
  mic: 'M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8',
  book: 'M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z',
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  gift: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z',
  box: 'M21 16V8l-9-5-9 5v8l9 5 9-5zM3 8l9 4 9-4M12 12v9',
  truck: 'M1 3h15v13H1zM16 8h4l3 3v5h-7zM5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  trophy: 'M6.5 3.5h11v6a5.5 5.5 0 01-11 0zM6.5 5.5H3.2v2.2a4.2 4.2 0 004.2 4.2M17.5 5.5h3.3v2.2a4.2 4.2 0 01-4.2 4.2M12 15v3.5M9.2 18.5h5.6l.9 3H8.3z',
  flag: 'M4 22V4s1-1 4-1 5 2 8 2 4-1 4-1v11s-1 1-4 1-5-2-8-2-4 1-4 1',
  leaf: 'M11 20A7 7 0 019.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10zM2.5 21.5c2.6-5 6.2-9 11-12.4',
  speech: 'M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.5 8.5 0 018 8z',
  filter: 'M22 3H2l8 9.5V19l4 2v-8.5z',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0114.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0020.5 15',
  play: 'M5 3l14 9-14 9z',
  home: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10',
  building: 'M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01'
};

var ICONS2 = {
  /* 사람 · 감정 */
  userplus: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M19 8v6M22 11h-6',
  usercheck: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M16 11l2 2 4-4',
  crowd: 'M5.2 8.8a2.3 2.3 0 100-4.6 2.3 2.3 0 000 4.6M18.8 8.8a2.3 2.3 0 100-4.6 2.3 2.3 0 000 4.6M1.7 14.5a3.5 3.5 0 017 0M15.3 14.5a3.5 3.5 0 017 0M12 12.7a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4M6.6 21.5a5.4 5.4 0 0110.8 0',
  smile: 'M12 22a10 10 0 100-20 10 10 0 000 20zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01',
  frown: 'M12 22a10 10 0 100-20 10 10 0 000 20zM16 16s-1.5-2-4-2-4 2-4 2M9 9h.01M15 9h.01',
  thumbup: 'M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3M7 11l4-9a3 3 0 013 3v4h5a2 2 0 012 2.3l-1.4 7A2 2 0 0117.6 22H7z',
  thumbdown: 'M17 2h3a2 2 0 012 2v7a2 2 0 01-2 2h-3M17 13l-4 9a3 3 0 01-3-3v-4H5a2 2 0 01-2-2.3l1.4-7A2 2 0 016.4 2H17z',
  id: 'M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zM9 12a2 2 0 100-4 2 2 0 000 4zM6 17a3 3 0 016 0M15 9h4M15 13h4',
  hierarchy: 'M9 3h6v4H9zM3 17h6v4H3zM15 17h6v4h-6zM12 7v7M6 17v-3h12v3',

  /* 돈 · 거래 */
  creditcard: 'M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2zM1 10h22M5 15h4',
  bank: 'M12 2L2 8h20zM3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M2 21h20',
  moneybag: 'M9 3h6l-1.5 3h-3zM7.5 6h9C19 8 21 12 21 15a6 6 0 01-6 6H9a6 6 0 01-6-6c0-3 2-7 4.5-9zM12 10v8M14.5 12.5a2 2 0 00-2-1.5h-1a2 2 0 000 4h1a2 2 0 010 4h-1a2 2 0 01-2-1.5',
  receipt: 'M6 2h12v20l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 22zM9 7h6M9 11h6M9 15h4',
  percent: 'M19 5L5 19M6.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM17.5 20a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  exchange: 'M7 4L3 8l4 4M3 8h13a4 4 0 014 4M17 20l4-4-4-4M21 16H8a4 4 0 01-4-4',
  coins: 'M14.6 8.8a5.8 5.8 0 11-11.6 0 5.8 5.8 0 0111.6 0M21 15.2a5.8 5.8 0 11-11.6 0 5.8 5.8 0 0111.6 0M13.1 13.3l1 3.6 1.2-2.5 1.2 2.5 1-3.6M12.9 15.5h4.6',

  /* 시간 */
  alarm: 'M12 22a9 9 0 100-18 9 9 0 000 18zM12 9v4l2.5 2M5 3L2 6M19 3l3 3M6 20l-2 2M18 20l2 2',
  stopwatch: 'M12 22a8 8 0 100-16 8 8 0 000 16zM12 11v4M9 2h6M12 6V2M18 7l1.5-1.5',

  /* 기기 · IT */
  mobile: 'M17 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2zM12 18h.01',
  desktop: 'M20 3H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V5a2 2 0 00-2-2zM8 21h8M12 17v4',
  wifi: 'M1.5 9a15 15 0 0121 0M5 12.5a10 10 0 0114 0M8.5 16a5.5 5.5 0 017 0M12 20h.01',
  code: 'M16 18l6-6-6-6M8 6l-6 6 6 6M14 4l-4 16',
  terminal: 'M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zM7 9l3 3-3 3M13 15h4',
  bug: 'M8 6a4 4 0 018 0M6 10h12v4a6 6 0 01-12 0zM2 12h4M18 12h4M4 6l2.5 2M20 6l-2.5 2M4 18l2.5-2M20 18l-2.5-2',
  cpu: 'M6 6h12v12H6zM10 10h4v4h-4zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4',
  robot: 'M7 8h10a3 3 0 013 3v6a3 3 0 01-3 3H7a3 3 0 01-3-3v-6a3 3 0 013-3zM12 5v3M12 2a1.5 1.5 0 100 3 1.5 1.5 0 000-3M9 14h.01M15 14h.01M9.5 17h5',
  sparkle: 'M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8zM19 15l.9 2.6L22 18.5l-2.1.9L19 22l-.9-2.6L16 18.5l2.1-.9z',
  plug: 'M9 2v6M15 2v6M7 8h10v3a5 5 0 01-10 0zM12 16v6',

  /* 이동 · 물류 */
  car: 'M5 17a2 2 0 100-4 2 2 0 000 4zM19 17a2 2 0 100-4 2 2 0 000 4zM3 15v-4l2-5h14l2 5v4M3 11h18M7 15h10',
  bus: 'M4.5 3.5h15a1.5 1.5 0 011.5 1.5v10.5a2 2 0 01-2 2h-15a2 2 0 01-2-2V5a1.5 1.5 0 011.5-1.5zM3 10h18M7.5 14h.01M16.5 14h.01M9 19.5a1.7 1.7 0 11-3.4 0 1.7 1.7 0 013.4 0M18.4 19.5a1.7 1.7 0 11-3.4 0 1.7 1.7 0 013.4 0',
  train: 'M6 2.5h12a2.5 2.5 0 012.5 2.5v9.5a2.5 2.5 0 01-2.5 2.5H6A2.5 2.5 0 013.5 14.5V5A2.5 2.5 0 016 2.5zM3.5 9.5h17M8.5 12.5h.01M15.5 12.5h.01M7.4 17v1.6M16.6 17v1.6M9 20.2a1.6 1.6 0 11-3.2 0 1.6 1.6 0 013.2 0M18.2 20.2a1.6 1.6 0 11-3.2 0 1.6 1.6 0 013.2 0',
  plane: 'M12 2c1.2 0 2 1.5 2 3.4V9l7.5 4.4v2.6L14 14v3.8l2.6 1.9v2L12 20l-4.6 1.7v-2L10 17.8V14l-7.5 2v-2.6L10 9V5.4C10 3.5 10.8 2 12 2z',
  ship: 'M2.5 16.5h19l-2.2 4a2 2 0 01-1.8 1H6.5a2 2 0 01-1.8-1zM12 3.5v13M13 5.5l6 7.5h-6zM11 8l-4.5 5H11z',
  bike: 'M6 20a4 4 0 100-8 4 4 0 000 8zM18 20a4 4 0 100-8 4 4 0 000 8zM6 16l4-8h5l3 8M9 8h4M15 8l-2-3',
  walk: 'M14.8 4.4a2.2 2.2 0 11-4.4 0 2.2 2.2 0 014.4 0M11.8 7v6.4M11.8 8.4 8.8 10.2 7.2 13M11.8 8.6l3.2 1.4 1.6 2.8M11.8 13.4l2.6 2.4 1 5.2M11.8 13.4 8.8 16.8 6.8 21.4',
  route: 'M8 3a2 2 0 11-4 0 2 2 0 014 0M20 21.5a2 2 0 11-4 0 2 2 0 014 0M6 5v5.5a4.5 4.5 0 004.5 4.5h3a4.5 4.5 0 014.5 4.5',

  /* 미디어 */
  picture: 'M21 3H3a2 2 0 00-2 2v14a2 2 0 002 2h18a2 2 0 002-2V5a2 2 0 00-2-2zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21',
  music: 'M9 18a3 3 0 100-6 3 3 0 000 6zM20 16a3 3 0 11-6 0 3 3 0 016 0M12 15V3l8 2v11M12 7l8 2',
  headphone: 'M3 18v-6a9 9 0 0118 0v6M3 18a3 3 0 003 3h1v-8H6a3 3 0 00-3 3M21 18a3 3 0 01-3 3h-1v-8h1a3 3 0 013 3',
  broadcast: 'M4.9 19.1a10 10 0 010-14.2M19.1 4.9a10 10 0 010 14.2M7.8 16.2a6 6 0 010-8.4M16.2 7.8a6 6 0 010 8.4M12 14a2 2 0 100-4 2 2 0 000 4',
  newspaper: 'M4 4h13a1 1 0 011 1v14a2 2 0 002 2H5a2 2 0 01-2-2V5a1 1 0 011-1zM18 8h2a2 2 0 012 2v9M7 8h7M7 12h7M7 16h4',
  share: 'M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',

  /* 건강 · 과학 */
  hospital: 'M4 21V8l8-5 8 5v13M2 21h20M12 9v6M9 12h6',
  pill: 'M4.5 13.5l9-9a4.95 4.95 0 017 7l-9 9a4.95 4.95 0 01-7-7zM8 8l7 7',
  virus: 'M12 18a6 6 0 100-12 6 6 0 000 12zM12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3',
  dna: 'M6.5 2c0 4.5 11 5.5 11 10s-11 5.5-11 10M17.5 2c0 4.5-11 5.5-11 10s11 5.5 11 10M7.9 4.5h8.2M7.9 9.5h8.2M7.9 14.5h8.2M7.9 19.5h8.2',
  fitness: 'M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11',

  /* 자연 */
  sun: 'M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
  moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
  rain: 'M17.5 15a4.5 4.5 0 00.5-9 6.5 6.5 0 00-12.6 1.6A4 4 0 006 15M8 19l-1 3M12 19l-1 3M16 19l-1 3',
  droplet: 'M12 2.7l5.7 5.7a8 8 0 11-11.4 0z',
  tree: 'M12 2l5 7h-3l4 6h-4l3 4H7l3-4H6l4-6H7zM12 19v3',

  /* 교육 · 사무 */
  graduation: 'M2 8l10-5 10 5-10 5zM6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5M22 8v6',
  pencil: 'M17 3l4 4L8 20l-5 1 1-5zM14 6l4 4',
  ruler: 'M16 2l6 6L8 22l-6-6zM7 11l2 2M10 8l2 2M13 5l2 2M4 14l2 2',
  briefcase: 'M20 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M2 12h20',
  presentation: 'M2 3h20M4 3v11h16V3M12 14v4M9 21l3-3 3 3',
  stamp: 'M9 2.5h6a2.5 2.5 0 012.5 2.5c0 2.4-1.7 3.6-1.7 5.8V14H8.2v-3.2C8.2 8.6 6.5 7.4 6.5 5A2.5 2.5 0 019 2.5zM4 14h16v3.8H4zM3 21.2h18',
  factory: 'M2 20V9l6 4V9l6 4V4h6v16zM6 20v-3M11 20v-3M17 20v-3',
  store: 'M3 9l1.5-5h15L21 9M3 9h18v11a1 1 0 01-1 1H4a1 1 0 01-1-1zM3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0M9 21v-6h6v6',
  clipboard: 'M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 2h6v4H9z',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13l3.5 7v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6z',

  /* 음식 · 생활 */
  coffee: 'M4 8h13v6a5 5 0 01-10 0zM17 9h2a3 3 0 010 6h-2M3 21h16M8 2v3M12 2v3',
  food: 'M4 2v7a3 3 0 003 3v10M7 2v7M10 2v7M17 2c-1.5 2-2 4-2 7 0 2 1 3 2 3v10',
  bottle: 'M10 2h4v3l2 3v13a1 1 0 01-1 1H9a1 1 0 01-1-1V8l2-3zM8 12h8',

  /* 스포츠 */
  ball: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 7l4 3-1.5 5h-5L8 10zM12 2v5M20.5 8.5L16 10M18 19l-3.5-4M6 19l3.5-4M3.5 8.5L8 10',
  medal: 'M12 22a6 6 0 100-12 6 6 0 000 12zM8.5 8.5L6 2h12l-2.5 6.5M12 14l.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2L9 16.1l2-.3z',
  run: 'M15 6a2 2 0 100-4 2 2 0 000 4zM14 8l-4 6 4 3-2 5M10 14l-4 3-2 4M7 10l3-2 4 2 3-2',

  /* 도구 · 기호 */
  hammer: 'M12.4 2.2 21.8 11.6l-3.2 3.2L9.2 5.4zM13.2 9.8 4.2 18.8a1.1 1.1 0 001.55 1.55l9-9z',
  scissors: 'M6 7a3 3 0 100-6 3 3 0 000 6zM6 23a3 3 0 100-6 3 3 0 000 6zM8.1 5.9L20 20M8.1 18.1L20 4',
  paint: 'M3 3h18v8H3zM12 11v3a2 2 0 002 2h1v6h-4v-6',
  magnet: 'M6 3H3v9a9 9 0 0018 0V3h-3v9a6 6 0 01-12 0zM3 9h3M18 9h3',
  layers: 'M12 2l10 6-10 6L2 8zM2 14l10 6 10-6M2 11l10 6 10-6',
  branch: 'M6 3v12M21 6a3 3 0 11-6 0 3 3 0 016 0M9 18a3 3 0 11-6 0 3 3 0 016 0M18 9a9 9 0 01-9 9',
  loop: 'M17 2l4 4-4 4M3 12V10a4 4 0 014-4h14M7 22l-4-4 4-4M21 12v2a4 4 0 01-4 4H3',
  sort: 'M3 6h18M6 12h12M9 18h6',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  crown: 'M2 18h20M3 7l4.5 4L12 4l4.5 7L21 7l-2 11H5z',
  ban: 'M12 22a10 10 0 100-20 10 10 0 000 20zM5 5l14 14',
  expand: 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7',
  collapse: 'M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7',
  forward: 'M13 19l9-7-9-7zM2 19l9-7-9-7z',
  map: 'M9 3L2 6v15l7-3 6 3 7-3V3l-7 3zM9 3v15M15 6v15',
  compass: 'M12 22a10 10 0 100-20 10 10 0 000 20zM16.2 7.8l-2.1 6.3-6.3 2.1 2.1-6.3z',

  /* 경제·금융 (2026-08 추가) */
  stock: 'M5 5v14M3 8.5h4v7H3zM12 3v18M10 7h4v9h-4zM19 6v12M17 9.5h4v6h-4z',
  safe: 'M3 4h18v16H3zM15 12a3 3 0 11-6 0 3 3 0 016 0M12 8V9.5M12 14.5V16M8 12h1.5M14.5 12H16M5.5 20v1.5M18.5 20v1.5',
  piggy: 'M19.5 13.5a6.5 5.5 0 11-13 0 6.5 5.5 0 0113 0M6.5 12.4H4.2a1.3 1.3 0 100 2.6h2.5M9.3 8.9 10.8 5.4l2.6 2.4M11.2 8.5h4.2M9.8 18.8v1.8M16.8 18.8v1.8M8.7 12.6h.01',
  gold: 'M3 20.5h18l-2.5-6H5.5zM7.5 14.5 9.2 9.5h5.6l1.7 5',
  oil: 'M7.5 3h9c1.5 3 1.5 15 0 18h-9c-1.5-3-1.5-15 0-18zM6.6 8.5h10.8M6.6 15.5h10.8',
  crypto: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0M9.5 8h4.2a2.2 2.2 0 010 4.4H9.5zM9.5 12.4h4.7a2.3 2.3 0 010 4.6H9.5zM9.5 8v9M11.3 6v2M13.7 6v2M11.3 17v2M13.7 17v2',
  bond: 'M6 2h9l3 3v8H6zM9 7h6M9 10h4M17 16.5a3 3 0 11-6 0 3 3 0 016 0M12.4 19l-.9 3.5 2.5-1.4 2.5 1.4-.9-3.5',
  tax: 'M6 2h12v20l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5zM15.5 7.5 8.5 16.5M11.2 8.3a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0M15.2 15.7a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0',
  loan: 'M5 2.5h9l4 4v8.2H5zM8 7.8h5M8 11.2h6M20.5 17.6c0 1.1-2 2-4.5 2s-4.5-.9-4.5-2 2-2 4.5-2 4.5.9 4.5 2zM11.5 17.6v3.1c0 1.1 2 2 4.5 2s4.5-.9 4.5-2v-3.1',
  calculator: 'M5 2h14v20H5zM8 5.5h8v3.5H8zM8.6 13h.01M12 13h.01M15.4 13h.01M8.6 16.5h.01M12 16.5h.01M15.4 16.5h.01M8.6 19.5h.01M12 19.5h.01M15.4 19.5h.01',
  scale: 'M12 3.2v17M8 20.2h8M5 7.8h14M5 7.8 2.2 13.6M5 7.8l2.8 5.8M2.2 13.6a2.8 2.8 0 005.6 0M19 7.8l-2.8 5.8M19 7.8l2.8 5.8M16.2 13.6a2.8 2.8 0 005.6 0',
  ledger: 'M5 4a2 2 0 012-2h12v18H7a2 2 0 00-2 2zM5 4v18M9 6.5h6M9 10h4M17.5 14.5a2 2 0 11-4 0 2 2 0 014 0',
  realestate: 'M3 10.6 12 3l9 7.6M5.5 9.6V21h13V9.6M9.4 13.4l1.4 4.6 1.2-3.1 1.2 3.1 1.4-4.6M9.2 15.7h5.6',
  merger: 'M15.5 12a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0M19.5 12a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0',
  salary: 'M3 6.5h18v11H3zM3 6.5l9 6 9-6M16.5 17.5a3 3 0 11-6 0 3 3 0 016 0M12.2 17h2.6M12.2 18.4h2.6',
  umbrella: 'M12 2.5a9.5 9.5 0 019.5 9.5H2.5A9.5 9.5 0 0112 2.5M12 12v6.5a2.8 2.8 0 005.6 0M12 2.5V1',
  container: 'M2.5 7h19v11h-19zM6.7 7v11M10.9 7v11M15.1 7v11M19.3 7v11',
  dividend: 'M16.8 6.2a4.8 4.8 0 11-9.6 0 4.8 4.8 0 019.6 0M9.6 4.2l1.2 4 1.2-2.8 1.2 2.8 1.2-4M9.5 6.4h5M5 14v5M3.2 17.4 5 19.2l1.8-1.8M12 14v5M10.2 17.4 12 19.2l1.8-1.8M19 14v5M17.2 17.4 19 19.2l1.8-1.8',
  bubble: 'M14.6 8.4a5 5 0 11-10 0 5 5 0 0110 0M7.2 6.4a1.7 1.7 0 00.9 1.2M20.8 14.8a3.2 3.2 0 11-6.4 0 3.2 3.2 0 016.4 0M16.2 13.6a1.1 1.1 0 00.6.8M11.4 18.6a2.4 2.4 0 11-4.8 0 2.4 2.4 0 014.8 0',
  interest: 'M15 6 5 16M8.6 8.4a2 2 0 11-4 0 2 2 0 014 0M15.4 17.6a2 2 0 11-4 0 2 2 0 014 0M19.5 21V9M17 11.5 19.5 9 22 11.5',

  /* IT·개발 (2026-08 추가) */
  api: 'M8 3C6 3 5 4 5 6v3c0 1.5-1 2.5-2 3 1 .5 2 1.5 2 3v3c0 2 1 3 3 3M16 3c2 0 3 1 3 3v3c0 1.5 1 2.5 2 3-1 .5-2 1.5-2 3v3c0 2-1 3-3 3M9.4 12h.01M12 12h.01M14.6 12h.01',
  browser: 'M3 4h18v16H3zM3 8.5h18M6 6.2h.01M8.6 6.2h.01M11.2 6.2h.01',
  commit: 'M2.5 12H9M15 12h6.5M15 12a3 3 0 11-6 0 3 3 0 016 0',
  merge: 'M8.5 6a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0M8.5 19.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0M6 8.5V17M20.5 6a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0M18 8.5v1.5a5.5 5.5 0 01-5.5 5.5H6',
  pullrequest: 'M8.5 6a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0M8.5 19.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0M6 8.5V17M20.5 19.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0M18 17V9a3 3 0 00-3-3h-3.5M14 3.5 11.5 6 14 8.5',
  pipeline: 'M2.5 8.5h4.5v7H2.5zM9.8 8.5h4.4v7H9.8zM17 8.5h4.5v7H17zM7 12h2.8M14.2 12H17',
  dashboard: 'M3.2 17a9 9 0 1117.6 0M12 17l4.4-5M5.6 13.2h.01M8.2 9.2h.01M12 7.8h.01M15.8 9.2h.01M18.4 13.2h.01',
  queue: 'M2.5 8h3.2v8H2.5zM7.2 8h3.2v8H7.2zM11.9 8h3.2v8h-3.2zM17.2 12h4.3M19.3 9.9l2.2 2.1-2.2 2.1',
  cache: 'M20 6.2c0 1.4-3.6 2.5-8 2.5s-8-1.1-8-2.5S7.6 3.7 12 3.7s8 1.1 8 2.5zM4 6.2v11.6c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V6.2M13.8 10.2 10 14.6h3.9L10.1 19',
  loadbalancer: 'M6.2 12a2.2 2.2 0 11-4.4 0 2.2 2.2 0 014.4 0M22 6a2.2 2.2 0 11-4.4 0 2.2 2.2 0 014.4 0M22 12a2.2 2.2 0 11-4.4 0 2.2 2.2 0 014.4 0M22 18a2.2 2.2 0 11-4.4 0 2.2 2.2 0 014.4 0M6.2 12h4.8M11 12V6h6.6M11 12h6.6M11 12v6h6.6',
  firewall: 'M2.5 6.5h19v11h-19zM2.5 12h19M7.5 6.5v5.5M16.5 6.5v5.5M5 12v5.5M12 12v5.5M19 12v5.5',
  heartbeat: 'M2 12h4.2l2-5.2L11.8 17 15 9.4l1.6 2.6H22',
  gpu: 'M2.5 7h17a2 2 0 012 2v6a2 2 0 01-2 2h-17zM8.4 12a2.6 2.6 0 11-5.2 0 2.6 2.6 0 015.2 0M15.4 12a2.6 2.6 0 11-5.2 0 2.6 2.6 0 015.2 0M17.5 10.5h2.5M17.5 13.5h2.5M5 17v3M13 17v3',
  neural: 'M4.6 7.4a2.2 2.2 0 110 4.4 2.2 2.2 0 010-4.4M4.6 14.6a2.2 2.2 0 110 4.4 2.2 2.2 0 010-4.4M12 4a2.2 2.2 0 110 4.4 2.2 2.2 0 010-4.4M12 11a2.2 2.2 0 110 4.4 2.2 2.2 0 010-4.4M12 18a2.2 2.2 0 110 4.4 2.2 2.2 0 010-4.4M19.4 10.9a2.2 2.2 0 110 4.4 2.2 2.2 0 010-4.4M6.8 8.8l3-2.2M6.8 11.8l3 1.4M6.8 15.8l3-1.4M6.8 18.8l3-2.2M14.2 7.4l3.4 3M14.2 13.1h3M14.2 19.4l3.4-3',
  puzzle: 'M10.5 3.5h4.4v2.1a2.1 2.1 0 104.2 0V3.5h1.4v6.2h-2.1a2.1 2.1 0 100 4.2h2.1v6.6h-6.6v-2.1a2.1 2.1 0 10-4.2 0v2.1H3.5v-6.6h2.1a2.1 2.1 0 100-4.2H3.5V3.5h7z',
  kanban: 'M2.5 3h19v18h-19zM6.3 6.5h4.2v10.5H6.3zM13.5 6.5h4.2v6.5h-4.2z',
  ticket: 'M3 7.5a2 2 0 012-2h14a2 2 0 012 2v2a2.5 2.5 0 000 5v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2.5 2.5 0 000-5zM9 8.5v7',
  flask: 'M9 2.5h6M10 2.5v6.2L4.6 18a2 2 0 001.7 3h11.4a2 2 0 001.7-3L14 8.7V2.5M7.2 14.2h9.6',
  wireframe: 'M2.5 3.5h19v17h-19zM2.5 8h19M8.4 8v12.5M11 11h8.2M11 14h8.2M11 17h5.4M4.4 11h1.8M4.4 14h1.8',
  responsive: 'M2 4.5h14v9.5H2zM5.5 17.6h7M9 14v3.6M17.6 7.5h4.4v12h-4.4zM19.2 17.6h1.2',
  webhook: 'M17.5 17H12c-1 0-1.8.9-2.3 1.8A3.8 3.8 0 012.5 17c0-.7.2-1.3.5-1.9M6 17l3-5.5c.5-.9.1-2-.5-2.9a3.8 3.8 0 116.5-3.9M12 6l3 5.5c.5.9 1.7 1.2 2.7 1.2a3.8 3.8 0 010 7.6',
  cube: 'M12 2.5 21 7.5v9L12 21.5 3 16.5v-9zM3 7.5l9 5 9-5M12 12.5v9'
};

var ALIAS = {
  사람: 'user', 인물: 'user', 사람들: 'users', 팀: 'users', 군중: 'crowd', 조직: 'hierarchy',
  신규: 'userplus', 가입: 'userplus', 확인: 'check', 완료: 'check', 체크: 'check',
  취소: 'x', 금지: 'ban', 경고: 'warn', 위험: 'warn', 정보: 'info', 질문: 'question',
  돈: 'won', 비용: 'won', 매출: 'trendup', 성장: 'trendup', 하락: 'trenddown', 감소: 'trenddown',
  카드: 'creditcard', 은행: 'bank', 지갑: 'wallet', 영수증: 'receipt', 할인: 'percent',
  교환: 'exchange', 동전: 'coins', coin: 'coins', 돈주머니: 'moneybag', 장바구니: 'cart', 가격: 'tag',
  시간: 'clock', 시계: 'clock', 알람: 'alarm', 달력: 'calendar', 일정: 'calendar', 모래시계: 'hourglass',
  차트: 'chart', 그래프: 'chart', 원그래프: 'pie', 목표: 'target', 아이디어: 'bulb',
  검색: 'search', 눈: 'eye', 조회: 'eye', 잠금: 'lock', 보안: 'shield', 열쇠: 'key',
  문서: 'doc', 폴더: 'folder', 메일: 'mail', 전화: 'phone', 휴대폰: 'mobile', 모바일: 'mobile',
  노트북: 'laptop', 컴퓨터: 'desktop', 서버: 'server', 클라우드: 'cloud', 데이터: 'database',
  설정: 'gear', 링크: 'link', 지구: 'globe', 세계: 'globe', 위치: 'pin', 지도: 'map',
  카메라: 'camera', 영상: 'video', 마이크: 'mic', 책: 'book', 알림: 'bell', 선물: 'gift',
  상자: 'box', 배송: 'truck', 트로피: 'trophy', 우승: 'trophy', 깃발: 'flag', 자연: 'leaf',
  대화: 'speech', 말풍선: 'speech', 필터: 'filter', 반복: 'refresh', 재생: 'play',
  집: 'home', 건물: 'building', 회사: 'building', 공장: 'factory', 가게: 'store', 매장: 'store',
  코드: 'code', 개발: 'code', 터미널: 'terminal', 버그: 'bug', 칩: 'cpu', 로봇: 'robot',
  인공지능: 'sparkle', 반짝: 'sparkle', 전원: 'plug', 와이파이: 'wifi',
  자동차: 'car', 버스: 'bus', 기차: 'train', 비행기: 'plane', 배: 'ship', 선박: 'ship', 보트: 'ship', 요트: 'ship', boat: 'ship', 자전거: 'bike',
  걷기: 'walk', 경로: 'route', 사진: 'picture', 이미지: 'picture', 음악: 'music',
  헤드폰: 'headphone', 방송: 'broadcast', 신문: 'newspaper', 공유: 'share',
  병원: 'hospital', 약: 'pill', 바이러스: 'virus', 유전자: 'dna', 운동: 'fitness',
  해: 'sun', 태양: 'sun', 달: 'moon', 비: 'rain', 물: 'droplet', 나무: 'tree',
  학교: 'graduation', 교육: 'graduation', 연필: 'pencil', 자: 'ruler', 가방: 'briefcase',
  발표: 'presentation', 도장: 'stamp', 클립보드: 'clipboard', 받은편지함: 'inbox',
  커피: 'coffee', 음식: 'food', 병: 'bottle', 공: 'ball', 메달: 'medal', 달리기: 'run', 러닝: 'run', 뛰기: 'run',
  망치: 'hammer', 가위: 'scissors', 페인트: 'paint', 자석: 'magnet', 계층: 'layers',
  분기: 'branch', 순환: 'loop', 정렬: 'sort', 격자: 'grid', 왕관: 'crown', 나침반: 'compass',
  불: 'fire', 번개: 'bolt', 별: 'star', 하트: 'heart', 좋아요: 'thumbup', 싫어요: 'thumbdown',
  웃음: 'smile', 슬픔: 'frown', 로켓: 'rocket', 신분증: 'id',
  종목: 'stock', 주식: 'stock', 증시: 'stock', 주가: 'stock', 코스피: 'stock', 코스닥: 'stock', 캔들: 'stock', 캔들차트: 'stock',
  금고: 'safe', 보관: 'safe', 자산: 'safe', 수탁: 'safe',
  저금통: 'piggy', 저축: 'piggy', 적금: 'piggy',
  금: 'gold', 금괴: 'gold', 귀금속: 'gold', 안전자산: 'gold',
  원유: 'oil', 유가: 'oil', 배럴: 'oil', 원자재: 'oil',
  암호화폐: 'crypto', 코인: 'crypto', 비트코인: 'crypto', 가상자산: 'crypto',
  채권: 'bond', 증권: 'bond', 증서: 'bond', 국채: 'bond',
  세금: 'tax', 과세: 'tax', 세율: 'tax', 관세: 'tax',
  대출: 'loan', 융자: 'loan', 빚: 'loan', 부채: 'loan', 신용: 'loan',
  계산기: 'calculator', 계산: 'calculator', 정산: 'calculator',
  저울: 'scale', 균형: 'scale', 규제: 'scale', 공정: 'scale', 형평: 'scale',
  장부: 'ledger', 재무제표: 'ledger', 결산: 'ledger', 회계: 'ledger',
  부동산: 'realestate', 집값: 'realestate', 분양: 'realestate', 아파트: 'realestate', 주택: 'realestate',
  인수합병: 'merger', 합병: 'merger', 통합: 'merger',
  급여: 'salary', 월급: 'salary', 소득: 'salary', 연봉: 'salary', 임금: 'salary',
  보험: 'umbrella', 보장: 'umbrella', 우산: 'umbrella', 대비: 'umbrella',
  컨테이너: 'container', 무역: 'container', 수출: 'container', 수입: 'container', 수출입: 'container',
  배당: 'dividend', 배당금: 'dividend', 분배: 'dividend',
  거품: 'bubble', 버블: 'bubble', 과열: 'bubble',
  금리: 'interest', 이자: 'interest', 이율: 'interest', 기준금리: 'interest',
  환율: 'exchange', 환전: 'exchange',
  물가: 'trendup', 인플레이션: 'trendup', 인플레: 'trendup', 상승장: 'trendup', 강세장: 'trendup', 수익: 'trendup', 이익: 'trendup', 흑자: 'trendup', 투자수익: 'trendup',
  디플레이션: 'trenddown', 경기침체: 'trenddown', 침체: 'trenddown', 하락장: 'trenddown', 약세장: 'trenddown', 손실: 'trenddown', 적자: 'trenddown', 역성장: 'trenddown',
  지수: 'chart', 거래량: 'chart', 실적: 'chart',
  시장: 'store', 마켓: 'store', 소상공인: 'store',
  중앙은행: 'bank', 한국은행: 'bank', 연준: 'bank', 금융: 'bank',
  화폐: 'won', 원화: 'won', 통화: 'won', 현금: 'won',
  예산: 'wallet', 가계부: 'wallet',
  자본: 'coins', 투자: 'coins', 펀드: 'coins', 자금: 'coins',
  소비: 'cart', 수요: 'cart', 장바구니소비: 'cart',
  공급: 'truck', 공급망: 'truck',
  유동성: 'droplet',
  기업: 'building', 상장사: 'building',
  고용: 'briefcase', 일자리: 'briefcase', 취업: 'briefcase',
  리스크: 'warn', 위험경고: 'warn',
  정책: 'stamp', 인가: 'stamp', 승인도장: 'stamp',
  API: 'api', 에이피아이: 'api', 인터페이스: 'api', 연동: 'api',
  브라우저: 'browser', 웹: 'browser', 웹사이트: 'browser', 프론트엔드: 'browser',
  커밋: 'commit', 변경이력: 'commit',
  머지: 'merge', 병합: 'merge',
  풀리퀘스트: 'pullrequest', 코드리뷰: 'pullrequest', 리뷰요청: 'pullrequest',
  파이프라인: 'pipeline', 빌드: 'pipeline', 배포과정: 'pipeline',
  대시보드: 'dashboard', 계기판: 'dashboard', 모니터링: 'dashboard',
  큐: 'queue', 대기열: 'queue', 메시지큐: 'queue',
  캐시: 'cache', 캐싱: 'cache', 임시저장: 'cache',
  도커: 'cube', 모듈: 'cube', 패키지: 'cube', 마이크로서비스: 'cube', 아티팩트: 'cube', 컨테이너이미지: 'cube',
  로드밸런서: 'loadbalancer', 부하분산: 'loadbalancer', 트래픽분산: 'loadbalancer',
  방화벽: 'firewall', 차단: 'firewall', 네트워크보안: 'firewall',
  헬스체크: 'heartbeat', 상태점검: 'heartbeat', 가동률: 'heartbeat', 업타임: 'heartbeat',
  GPU: 'gpu', 그래픽카드: 'gpu', 연산장치: 'gpu',
  신경망: 'neural', 딥러닝: 'neural', 머신러닝: 'neural', 모델: 'neural', 학습: 'neural',
  플러그인: 'puzzle', 확장: 'puzzle', 애드온: 'puzzle', 통합연동: 'puzzle',
  칸반: 'kanban', 보드: 'kanban', 업무보드: 'kanban', 스프린트: 'kanban',
  티켓: 'ticket', 이슈: 'ticket', 작업항목: 'ticket',
  실험: 'flask', 테스트: 'flask', 검증: 'flask', 실험실: 'flask',
  와이어프레임: 'wireframe', 화면설계: 'wireframe', UI설계: 'wireframe', 레이아웃: 'wireframe',
  반응형: 'responsive', 멀티디바이스: 'responsive', 크로스플랫폼: 'responsive',
  웹훅: 'webhook', 이벤트연동: 'webhook', 콜백: 'webhook',
  백엔드: 'server', 서버실: 'server', 호스팅: 'server',
  로그: 'terminal', 명령어: 'terminal', 콘솔: 'terminal', 프롬프트: 'terminal',
  버전: 'tag', 릴리스태그: 'tag',
  성능: 'bolt', 최적화: 'bolt', 응답속도: 'bolt',
  지연: 'stopwatch', 응답시간: 'stopwatch', 레이턴시: 'stopwatch',
  온콜: 'bell',
  로그인: 'usercheck', 본인확인: 'usercheck',
  암호화: 'lock',
  취약점: 'shield', 방어체계: 'shield',
  개발환경: 'laptop', 작업환경: 'laptop',
  장애: 'bug', 오류: 'bug', 결함: 'bug',
  /* 보강 이름표 */
  배포: 'rocket', 출시: 'rocket', 릴리스: 'rocket', 런칭: 'rocket',
  롤백: 'refresh', 동기화: 'refresh', 재시도: 'refresh', 되돌리기: 'refresh',
  저장소: 'folder', 레포지토리: 'folder', 디렉터리: 'folder',
  오픈소스: 'branch', 포크: 'branch', 분기처리: 'branch',
  라이브러리: 'puzzle', 프레임워크: 'puzzle', 의존성: 'puzzle',
  인프라: 'server', 운영서버: 'server',
  데이터베이스: 'database', 백업: 'database', 복구: 'database', 저장공간: 'database', 용량: 'database',
  개발자: 'code', 스크립트: 'code', 리팩터링: 'code', 소스코드: 'code',
  협업: 'users', 팀작업: 'users', 사용자들: 'users',
  스펙: 'doc', 명세: 'doc', 설계문서: 'doc',
  권한: 'key', 인증키: 'key', 접근권한: 'key',
  인증: 'usercheck', 계정확인: 'usercheck',
  사용자: 'user',
  접속: 'plug', 연결: 'plug',
  챗봇: 'robot', 자동화봇: 'robot',
  자동화: 'loop', 배치: 'loop', 반복처리: 'loop',
  스케줄: 'calendar', 크론: 'calendar', 예약실행: 'calendar',
  아키텍처: 'hierarchy', 구조설계: 'hierarchy',
  마이그레이션: 'truck', 이전: 'truck',
  운영: 'gear', 설정관리: 'gear',
  비용절감: 'percent', 절감률: 'percent',
  학습데이터: 'chart', 데이터셋: 'chart',
  person: 'user', people: 'users', money: 'won', time: 'clock', warning: 'warn',
  growth: 'trendup', decline: 'trenddown', idea: 'bulb', location: 'pin', settings: 'gear',
  ai: 'sparkle', chip: 'cpu', image: 'picture', photo: 'picture', school: 'graduation'
};

for (var _ik in ICONS2) if (Object.prototype.hasOwnProperty.call(ICONS2, _ik)) ICONS[_ik] = ICONS2[_ik];


/* 자주 찾는 한국어 이름을 더 붙인다 — 그림(ICONS)은 scriptviz · mindmap 과 같고,
   이름표만 넉넉하게 단다. 이름으로 못 찾으면 있어도 없는 것이다. */
var ALIAS2 = {
  엄지: 'thumbup', 따봉: 'thumbup', 추천: 'thumbup', 반대: 'thumbdown',
  별점: 'star', 즐겨찾기: 'star', 자물쇠: 'lock', 해제: 'unlock', 잠금해제: 'unlock',
  메시지: 'speech', 채팅: 'speech', 댓글: 'speech', 문의: 'question',
  업로드: 'up', 다운로드: 'down', 이전: 'right', 다음: 'forward', 전달: 'forward',
  편집: 'pencil', 수정: 'pencil', 작성: 'pencil', 추가: 'plus', 제거: 'minus',
  새로고침: 'refresh', 갱신: 'refresh', 동기화: 'refresh',
  성공: 'check', 통과: 'check', 실패: 'x', 오류: 'warn', 주의: 'warn',
  속도: 'bolt', 성능: 'bolt', 빠름: 'bolt', 초시계: 'stopwatch', 측정: 'stopwatch',
  안전: 'shield', 방어: 'shield', 품질: 'medal', 인증: 'stamp', 승인: 'usercheck',
  고객: 'users', 사용자: 'user', 직원: 'id', 멤버: 'user', 계정: 'user',
  계약: 'doc', 보고서: 'doc', 문서작성: 'doc', 회의: 'presentation', 발표자료: 'presentation',
  전략: 'target', 방향: 'compass', 혁신: 'bulb', 성과: 'trophy', 실적: 'trendup',
  분석: 'chart', 통계: 'chart', 지표: 'chart', 비율: 'pie', 퍼센트: 'percent',
  매장: 'store', 창고: 'box', 재고: 'box', 물류: 'truck', 배달: 'truck',
  결제: 'creditcard', 환불: 'exchange', 정산: 'receipt', 예산: 'wallet',
  일정관리: 'calendar', 마감: 'hourglass', 기한: 'hourglass',
  확장: 'expand', 축소: 'collapse', 정렬순서: 'sort', 묶음: 'layers',
  네트워크: 'wifi', 접속: 'plug', 저장소: 'database', 백업: 'database',
  인프라: 'server', 배포: 'rocket', 출시: 'rocket', 시작: 'play',
  실험: 'virus', 연구: 'dna', 건강: 'fitness', 진료: 'hospital', 처방: 'pill',
  날씨: 'sun', 밤: 'moon', 강수: 'rain', 환경: 'leaf', 숲: 'tree',
  교통: 'car', 물류차: 'truck', 여행: 'plane', 항로: 'route',
  공지: 'broadcast', 소식: 'newspaper', 홍보: 'broadcast', 이벤트: 'gift',
  아이디: 'id', 권한: 'key', 비밀번호: 'key', 감시: 'eye', 모니터링: 'eye',
  버튼: 'play', 도구: 'hammer', 재단: 'scissors', 디자인: 'paint', 규격: 'ruler',
  구조: 'hierarchy', 조직도: 'hierarchy', 갈래: 'branch', 되풀이: 'loop',
  등급: 'crown', 최고: 'crown', 열정: 'fire', 인기: 'fire'
};
for (var _ak in ALIAS2) if (Object.prototype.hasOwnProperty.call(ALIAS2, _ak)) {
  if (ICONS[ALIAS2[_ak]] && !ALIAS[_ak]) ALIAS[_ak] = ALIAS2[_ak];
}

/** 아이콘 이름(별칭 포함) -> 표준 이름. 없으면 null */
function iconKey(name) {
  if (!name) return null;
  var k = ALIAS[name] || name;
  return ICONS[k] ? k : null;
}
function iconPath(name) { var k = iconKey(name); return k ? ICONS[k] : null; }

/** 이름이 비슷한 아이콘을 찾아준다 — 오타났을 때 뭘 쓰라고 알려주려고 */
function iconSuggest(name) {
  var n = String(name || '').toLowerCase();
  var pool = Object.keys(ICONS).concat(Object.keys(ALIAS));
  var hit = pool.filter(function (k) {
    var lk = k.toLowerCase();
    return lk.indexOf(n) >= 0 || n.indexOf(lk) >= 0;
  });
  return hit.slice(0, 8);
}

function iconSearch(q) {
  if (!q) return Object.keys(ICONS).sort();
  var n = String(q).toLowerCase(), hit = {};
  Object.keys(ICONS).forEach(function (k) { if (k.toLowerCase().indexOf(n) >= 0) hit[k] = 1; });
  Object.keys(ALIAS).forEach(function (k) {
    if (k.toLowerCase().indexOf(n) >= 0 && ICONS[ALIAS[k]]) hit[ALIAS[k]] = 1;
  });
  return Object.keys(hit).sort();
}
function iconAliases(key) {
  return Object.keys(ALIAS).filter(function (k) { return ALIAS[k] === key; });
}
module.exports = { ICONS: ICONS, ALIAS: ALIAS, iconKey: iconKey, iconPath: iconPath,
                   iconSuggest: iconSuggest, iconSearch: iconSearch, iconAliases: iconAliases,
                   count: Object.keys(ICONS).length };

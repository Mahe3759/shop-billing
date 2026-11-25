/**
 * telugu-translit.js - Offline English-to-Telugu Converter & Tailoring Vocabulary Engine
 * 
 * Provides:
 * - Comprehensive tailoring & clothing dictionary (fabrics, garments, colors, parts).
 * - Client-side phonetic transliteration engine for custom brand names (e.g. "yogi dress" -> "యోగి డ్రెస్").
 * - Zero external API dependency (100% offline & fast).
 */

(function (window) {
  'use strict';

  // Comprehensive Dictionary for Tailoring, Fabrics, Garments, Colors & Common Indian Names
  const TAILORING_DICT = {
    // Garments & Clothing
    'dress': 'డ్రెస్',
    'dresses': 'డ్రెస్సెస్',
    'lining': 'లైనింగ్',
    'cloth': 'క్లాత్',
    'cloths': 'బట్టలు',
    'jacket': 'జాకెట్',
    'saree': 'శారీ',
    'sari': 'శారీ',
    'false': 'ఫాల్స్',
    'fall': 'ఫాల్స్',
    'falls': 'ఫాల్స్',
    'pencil': 'పెన్సిల్',
    'cut': 'కట్',
    'shirt': 'షర్ట్',
    'shirts': 'షర్టులు',
    'pant': 'ప్యాంట్',
    'pants': 'ప్యాంట్స్',
    'trouser': 'ట్రౌజర్',
    'trousers': 'ట్రౌజర్స్',
    'blouse': 'బ్లౌజ్',
    'kurti': 'కుర్తీ',
    'kurta': 'కుర్తా',
    'suit': 'సూట్',
    'suits': 'సూట్లు',
    'chudidar': 'చుడీదార్',
    'salwar': 'సల్వార్',
    'frock': 'ఫ్రాక్',
    'gown': 'గౌన్',
    'nighty': 'నైటీ',
    'petticoat': 'పెటికోట్',
    'lungi': 'లుంగీ',
    'dhoti': 'ధోతీ',
    'towel': 'టవల్',
    'dupatta': 'దుపట్టా',
    'chunni': 'చున్నీ',
    'shawl': 'శాలువా',
    'jeans': 'జీన్స్',
    't-shirt': 'టీ-షర్ట్',
    'tshirt': 'టీ-షర్ట్',

    // Fabrics & Materials
    'cotton': 'కాటన్',
    'silk': 'సిల్క్',
    'chiffon': 'షిఫాన్',
    'georgette': 'జార్జెట్',
    'crepe': 'క్రేప్',
    'linen': 'లైనెన్',
    'velvet': 'వెల్వెట్',
    'satin': 'శాటిన్',
    'polyester': 'పాలిస్టర్',
    'rayon': 'రేయాన్',
    'khadi': 'ఖాదీ',
    'handloom': 'చేనేత',
    'material': 'మెటీరియల్',

    // Tailoring Work & Parts
    'alteration': 'ఆల్టరేషన్',
    'stitching': 'కుట్టుపని',
    'stitch': 'కుట్టు',
    'maggam': 'మగ్గం',
    'work': 'వర్క్',
    'embroidery': 'ఎంబ్రాయిడరీ',
    'design': 'డిజైన్',
    'model': 'మోడల్',
    'pattern': 'ప్యాటర్న్',
    'border': 'బోర్డర్',
    'lace': 'లేస్',
    'patch': 'ప్యాచ్',
    'collar': 'కాలర్',
    'pocket': 'పాకెట్',
    'button': 'బటన్',
    'buttons': 'బటన్లు',
    'zip': 'జిప్',
    'zipper': 'జిప్పర్',
    'elastic': 'ఎలాస్టిక్',
    'thread': 'దారం',
    'hook': 'హుక్',
    'hooks': 'హుక్స్',

    // Categories & Modifiers
    'plain': 'ప్లైన్',
    'printed': 'ప్రింటెడ్',
    'simple': 'సింపుల్',
    'fancy': 'ఫ్యాన్సీ',
    'party': 'పార్టీ',
    'wear': 'వేర్',
    'special': 'స్పెషల్',
    'normal': 'నార్మల్',
    'new': 'న్యూ',
    'men': 'మెన్స్',
    'mens': 'మెన్స్',
    'ladies': 'లేడీస్',
    'women': 'ఉమెన్స్',
    'kids': 'పిల్లల',
    'baby': 'బేబీ',
    'boy': 'బాయ్',
    'girl': 'గర్ల్',

    // Colors
    'black': 'బ్లాక్',
    'white': 'వైట్',
    'red': 'రెడ్',
    'blue': 'బ్లూ',
    'green': 'గ్రీన్',
    'yellow': 'ఎల్లో',
    'pink': 'పింక్',
    'orange': 'ఆరెంజ్',
    'purple': 'పర్పుల్',
    'gold': 'గోల్డ్',
    'golden': 'గోల్డెన్',
    'silver': 'సిల్వర్',
    'grey': 'గ్రే',
    'brown': 'బ్రౌన్',
    'maroon': 'మెరూన్',
    'navy': 'నేవీ',

    // Common Names & Brands
    'yogi': 'యోగి',
    'shree': 'శ్రీ',
    'sri': 'శ్రీ',
    'raju': 'రాజు',
    'kumar': 'కుమార్',
    'mahesh': 'మహేష్',
    'ravi': 'రవి',
    'suresh': 'సురేష్',
    'ramesh': 'రమేష్',
    'laxmi': 'లక్ష్మి',
    'lakshmi': 'లక్ష్మి',
    'sai': 'సాయి',
    'krishna': 'కృష్ణ',
    'ram': 'రామ్',
    'fashion': 'ఫ్యాషన్',
    'tailors': 'టైలర్స్',
    'tailor': 'టైలర్',
    'shop': 'షాప్'
  };

  // Phonetic Consonants Map
  const CONSONANTS = {
    'chh': 'ఛ', 'kh': 'ఖ', 'gh': 'ఘ', 'ch': 'చ', 'jh': 'ఝ', 'th': 'థ', 'dh': 'ధ',
    'ph': 'ఫ', 'bh': 'భ', 'sh': 'శ', 'k': 'క', 'g': 'గ', 'j': 'జ', 't': 'ట',
    'd': 'డ', 'n': 'న', 'p': 'ప', 'f': 'ఫ', 'b': 'బ', 'm': 'మ', 'y': 'య',
    'r': 'ర', 'l': 'ల', 'v': 'వ', 'w': 'వ', 's': 'స', 'h': 'హ'
  };

  // Vowel Matras (When attached to a consonant)
  const VOWEL_MATRAS = {
    'aa': 'ా', 'ee': 'ీ', 'ii': 'ీ', 'oo': 'ూ', 'uu': 'ూ', 'ai': 'ై',
    'au': 'ౌ', 'ou': 'ౌ', 'ea': 'ే', 'ey': 'ే', 'oa': 'ో', 'oe': 'ో',
    'a': '', 'i': 'ి', 'u': 'ు', 'e': 'ె', 'o': 'ో'
  };

  // Independent Vowels (When word starts with a vowel)
  const INITIAL_VOWELS = {
    'aa': 'ఆ', 'ee': 'ఈ', 'ii': 'ఈ', 'oo': 'ఊ', 'uu': 'ఊ', 'ai': 'ఐ',
    'au': 'ఔ', 'ou': 'ఔ', 'ea': 'ఏ', 'ey': 'ఏ', 'oa': 'ఓ', 'oe': 'ఓ',
    'a': 'అ', 'i': 'ఇ', 'u': 'ఉ', 'e': 'ఎ', 'o': 'ఒ'
  };

  /**
   * Transliterate a single English token/word to Telugu.
   * @param {string} word 
   * @returns {string}
   */
  function transliterateToken(word) {
    if (!word) return '';

    // If word contains Telugu Unicode, keep as is
    if (/[\u0C00-\u0C7F]/.test(word)) return word;

    // Remove punctuation, lowercase for dictionary lookup
    const clean = word.toLowerCase().replace(/[^a-z0-9\-]/g, '');
    if (TAILORING_DICT[clean]) {
      return TAILORING_DICT[clean];
    }

    // Number pass-through
    if (/^\d+$/.test(clean)) return clean;

    // Rule-based Phonetic Transliteration
    const lower = clean;
    let res = '';
    let i = 0;

    while (i < lower.length) {
      const c3 = lower.substr(i, 3);
      const c2 = lower.substr(i, 2);
      const c1 = lower.substr(i, 1);

      let cons = null;
      let consLen = 0;

      if (CONSONANTS[c3]) {
        cons = CONSONANTS[c3];
        consLen = 3;
      } else if (CONSONANTS[c2]) {
        cons = CONSONANTS[c2];
        consLen = 2;
      } else if (CONSONANTS[c1]) {
        cons = CONSONANTS[c1];
        consLen = 1;
      }

      if (cons) {
        i += consLen;

        // Look for vowel following consonant
        const v2 = lower.substr(i, 2);
        const v1 = lower.substr(i, 1);

        if (VOWEL_MATRAS[v2] !== undefined) {
          res += cons + VOWEL_MATRAS[v2];
          i += 2;
        } else if (VOWEL_MATRAS[v1] !== undefined) {
          res += cons + VOWEL_MATRAS[v1];
          i += 1;
        } else {
          // Virama (halant / pollu) if another consonant follows, else plain consonant
          if (i < lower.length && (CONSONANTS[lower.substr(i, 2)] || CONSONANTS[lower.substr(i, 1)])) {
            res += cons + '్';
          } else {
            res += cons;
          }
        }
      } else {
        // Independent Vowel or non-consonant letter
        const v2 = lower.substr(i, 2);
        const v1 = lower.substr(i, 1);

        if (INITIAL_VOWELS[v2]) {
          res += INITIAL_VOWELS[v2];
          i += 2;
        } else if (INITIAL_VOWELS[v1]) {
          res += INITIAL_VOWELS[v1];
          i += 1;
        } else {
          res += lower[i];
          i++;
        }
      }
    }

    return res || word;
  }

  /**
   * Main function: Converts any English text / product name into Telugu.
   * Handles multi-word names (e.g. "yogi dress" -> "యోగి డ్రెస్", "cotton lining" -> "కాటన్ లైనింగ్").
   * @param {string} text 
   * @returns {string} Telugu text
   */
  function toTelugu(text) {
    if (!text || typeof text !== 'string') return '';
    const trimmed = text.trim();
    if (!trimmed) return '';

    // If string already contains Telugu script, preserve it directly
    if (/[\u0C00-\u0C7F]/.test(trimmed)) {
      return trimmed;
    }

    // Split by spaces, preserve formatting
    return trimmed
      .split(/\s+/)
      .map(token => transliterateToken(token))
      .join(' ');
  }

  // Expose globally
  window.toTelugu = toTelugu;
  window.TAILORING_DICT = TAILORING_DICT;

})(window);

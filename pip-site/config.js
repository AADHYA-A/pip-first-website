// Backend settings. Leave both empty and the site runs in local-only mode
// (guestbook saved in each visitor's own browser).
//
// To go live: create a free project at supabase.com, run supabase-schema.sql in its
// SQL Editor, then paste your values from Project Settings > API:
//   SUPABASE_URL      looks like https://abcdefgh.supabase.co
//   SUPABASE_ANON_KEY the "anon public" key (safe to ship in the browser because
//                     Row Level Security in the schema limits what it can do).
// Never paste the "service_role" key here.
window.PIP_CONFIG = {
  SUPABASE_URL: 'https://cgtqmfirtjnnujzalhkx.supabase.co/rest/v1/',
  SUPABASE_ANON_KEY: 'sb_publishable_C6_m8dNto37QsEDx4juqyg_8Li5FkF0',

  // Official Pip art (optional). Download the asset pack from the haX.baby brief, put the
  // images in the assets/ folder, then set the file names below. Leave a value '' to keep
  // the built-in illustration. A credit line is added to the footer automatically.
  ASSETS: {
    musicBox: '',   // e.g. 'assets/music-box.png'      -> Lullaby Lab header
    lantern:  '',   // e.g. 'assets/nightlight.png'     -> Nightlight Collection header
    portrait: '',   // e.g. 'assets/pip-portrait.png'   -> beside Pip's Growth Chart
    wave:     ''    // e.g. 'assets/pip-waving.png'     -> small Pip that follows the cursor
  }
};

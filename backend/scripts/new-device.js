#!/usr/bin/env node
require('dotenv').config();

/**
 * Create a simulated device from the command line.
 *
 * The UI can do this too, but for a demo it is tedious to start the
 * frontend, sign in as the farmer and copy a key out of a panel
 * just to get the simulator running. This prints the key and the
 * exact command to feed it.
 *
 *   node scripts/new-device.js [--farm <uuid>] [--label "North probe"]
 *
 * With no --farm it picks the first parcel that has an owner, which
 * is what you want when there is only one.
 */

const { supabaseAdmin } = require('../src/config/supabase');
const devices = require('../src/services/deviceService');

const parse = () => {
  const out = {};
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] === '--farm') out.farm = a[++i];
    else if (a[i] === '--label') out.label = a[++i];
    else if (a[i] === '--list') out.list = true;
  }
  return out;
};

const main = async () => {
  const opts = parse();

  const { data: farms } = await supabaseAdmin
    .from('farms')
    .select('farm_id, name, village, farmer_wallet')
    .not('farmer_wallet', 'is', null)
    .order('created_at', { ascending: true });

  if (!farms?.length) {
    console.error('No parcel has an owner yet. Register a farmer and draw a plot first.');
    process.exit(1);
  }

  if (opts.list) {
    console.log('\nParcels with an owner:\n');
    for (const f of farms) {
      console.log(`  ${f.farm_id}  ${f.name}${f.village ? ` (${f.village})` : ''}`);
    }
    console.log('');
    return;
  }

  const farm = opts.farm ? farms.find((f) => f.farm_id === opts.farm) : farms[0];
  if (!farm) {
    console.error(`No owned parcel with id ${opts.farm}. Run with --list to see them.`);
    process.exit(1);
  }

  const { device, apiKey } = await devices.registerDevice({
    farmId: farm.farm_id,
    label: opts.label || 'Demo probe',
    isSimulated: true,
  });

  console.log(`\nParcel : ${farm.name} (${farm.farm_id})`);
  console.log(`Device : ${device.device_id}`);
  console.log('\nKey (shown once — it is stored only as a hash):\n');
  console.log(`  ${apiKey}\n`);
  console.log('Run a scenario with it:\n');
  console.log(`  npm run simulate -- dry_spell --key ${apiKey} --days 14`);
  console.log(`  npm run simulate -- rain_event --key ${apiKey} --days 10 --reset --farm ${farm.farm_id}`);
  console.log('');
};

main().catch((e) => { console.error(e.message); process.exit(1); });

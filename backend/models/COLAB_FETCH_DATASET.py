# ============================================================
# DATASET FETCH - diagnostic replacement for Cell 4
# ============================================================
# Run this INSTEAD of "Download the actual Africa Soil Properties
# dataset", after the kaggle.json upload cell.
#
# The original uses os.system() and truncates stderr to 100
# characters, so a failure shows as an empty "Failed:" and the
# notebook carries on until cell 7 dies on a missing training.csv.
# This prints both streams and stops at the first real problem.
# ============================================================

import os
import json
import zipfile
import subprocess

COMP = 'afsis-soil-properties'


def run(cmd):
    p = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return p.returncode, (p.stdout or '').strip(), (p.stderr or '').strip()


def show(rc, out, err):
    print('  exit %d' % rc)
    if out:
        print('  stdout:', out[:500])
    if err:
        print('  stderr:', err[:500])
    if not out and not err:
        print('  (the CLI produced no output at all)')


print('--- 0. is the kaggle CLI usable? ---')
# Colab's image changes between sessions. On newer Python builds
# the CLI is sometimes missing or too old for the current API,
# which is what an empty "Failed:" usually means: the original cell
# read stderr, and this CLI writes to stdout.
rc, out, err = run('kaggle --version')
if rc != 0:
    print('not usable:')
    show(rc, out, err)
    print('installing...')
    rc2, out2, err2 = run('pip install -q --upgrade kaggle')
    if rc2 != 0:
        raise SystemExit('pip install kaggle failed: ' + (err2 or out2)[:400])
    rc, out, err = run('kaggle --version')
    if rc != 0:
        print('still not working after install:')
        show(rc, out, err)
        raise SystemExit('The kaggle CLI cannot run in this runtime.')
print('kaggle CLI:', out or '(version not reported)')

print('')
print('--- 1. credentials ---')
kp = '/root/.kaggle/kaggle.json'
if not os.path.exists(kp):
    raise SystemExit('No ' + kp + ' - run the kaggle.json upload cell first.')

with open(kp) as f:
    cfg = json.load(f)
print('user:', cfg.get('username'), '| key length:', len(cfg.get('key', '')))
os.chmod(kp, 0o600)

print('')
print('--- 2. can the API authenticate? ---')
rc, out, err = run('kaggle competitions list --page-size 1')
if rc != 0:
    print('FAILED:')
    show(rc, out, err)
    both = out + ' ' + err
    if '401' in both or 'Unauthorized' in both:
        raise SystemExit(
            'Kaggle rejected the key (401). It is wrong or has been revoked. '
            'Get a fresh one: kaggle.com -> avatar -> Settings -> API -> Create New '
            'Token, then re-run the upload cell with the new file.'
        )
    raise SystemExit('Could not authenticate. Full output above.')
print('authenticated OK')

print('')
print('--- 3. download ---')
rc, out, err = run('kaggle competitions download -c ' + COMP)
if rc != 0:
    print('FAILED:')
    show(rc, out, err)
    both = out + ' ' + err
    # The usual cause, and it cannot be fixed from here: Kaggle
    # serves competition files only after the rules are accepted in
    # a browser, and returns 403 until they are.
    if '403' in both or 'Forbidden' in both or 'rules' in both.lower():
        raise SystemExit(
            'Kaggle returned 403. Accept the competition rules first, in a browser, '
            'signed in as ' + str(cfg.get('username')) + ':  '
            'https://www.kaggle.com/c/' + COMP + '/rules  - click "I Understand and '
            'Accept", then re-run this cell. The API cannot accept them for you.'
        )
    raise SystemExit('Download failed. Full output above.')
print('downloaded')

print('')
print('--- 4. unpack ---')
# The archive holds train.zip and test.zip, and training.csv lives
# inside train.zip - two levels deep, which is why the notebook
# needed a second extract cell.
outer = COMP + '.zip'
if os.path.exists(outer):
    with zipfile.ZipFile(outer) as z:
        z.extractall('.')
    print('extracted', outer)

for inner in ['train.zip', 'test.zip']:
    if os.path.exists(inner):
        with zipfile.ZipFile(inner) as z:
            z.extractall('.')
        print('extracted', inner)

print('')
print('--- 5. what we actually have ---')
csvs = sorted(f for f in os.listdir('.') if f.endswith('.csv'))
for f in csvs:
    print('  %-28s %7.2f MB' % (f, os.path.getsize(f) / 1e6))

if 'training.csv' not in csvs:
    raise SystemExit(
        'training.csv still missing after unpacking. Present: '
        + (', '.join(csvs) if csvs else '(no CSVs)')
        + ' - if a differently named CSV is listed, the competition layout changed and '
          'the next cell needs that name instead.'
    )

print('')
print('training.csv is ready - continue with the next cell.')

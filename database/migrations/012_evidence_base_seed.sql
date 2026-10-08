-- ============================================================
-- 012 — Evidence base: schema and an honest first seed
-- ============================================================
-- Run in: Supabase SQL editor, NEW TAB.
-- Requires: 001-011 applied.
--
-- ADDITIVE ONLY.
--
-- This is the data the reasoning engine filters. A claim is not
-- just a statement — it carries the CONDITIONS it was measured
-- under, because that is what decides whether it transfers to a
-- given farmer's plot. A sequestration rate measured on an
-- irrigated Vertisol at 1,100 mm rainfall is not evidence for a
-- rainfed sandy loam at 450 mm, and the engine has to be able to
-- say so rather than quoting the headline number.
--
-- HONESTY NOTES, deliberately encoded in the data:
--   * effect_size is NULL where the source reports a direction
--     but no usable number. A null is better than a guess.
--   * verified = false on everything. These were assembled from
--     literature search, not from reading each full text.
--   * out-of-region sources are included but tagged, so the
--     context filter can reject them for Indian plots rather
--     than me silently dropping them.
--   * units differ between sources (% change vs Mg C/ha/yr) and
--     are recorded as stated, not converted. Converting without
--     depth and bulk density would fabricate precision.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Sources
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS evidence_sources (
    source_id   text PRIMARY KEY,
    citation    text NOT NULL,
    doi         text,
    year        int,
    study_type  text,
    sample_size text,
    location    text,
    notes       text
);

INSERT INTO evidence_sources (source_id, citation, doi, year, study_type, sample_size, location, notes) VALUES
('S01','Impacts of conservation agriculture on crop yield and soil carbon sequestration: a meta-analysis in the Indian subcontinent. Environmental Geochemistry and Health.',
 '10.1007/s10653-024-02027-x', 2024, 'meta-analysis', '35 publications, 544 paired observations', 'Indian subcontinent',
 'Reports percentage change, not absolute stock change.'),
('S02','Differential impacts of regenerative agriculture practices on soil organic carbon: a meta-analysis of studies from India. Scientific Reports.',
 '10.1038/s41598-025-12149-6', 2025, 'meta-analysis', '147 studies', 'India',
 'Pooled across all regenerative practices. High heterogeneity (I2 ~75%). Headline percentage could not be reconciled with reported units during search — read full text before relying on a number.'),
('S03','Sustaining agronomic productivity and quality of a Vertisol under soybean-safflower cropping system in semi-arid central India. Canadian Journal of Soil Science.',
 '10.4141/cjss2011-098', 2012, 'long-term field trial', '15 years, single site', 'Central India (semi-arid Vertisol)',
 'FYM plus chemical fertiliser treatment.'),
('S04','Assessment of conservation agriculture on soil nutrient stratification ratio, carbon sequestration rate, management indices and crop productivity in Southern Telangana, India. Scientific Reports.',
 '10.1038/s41598-025-00177-1', 2025, 'field trial', 'single site', 'Southern Telangana (semi-arid)',
 'Rate reflects several practices applied together, not zero tillage alone.'),
('S05','Carbon storage in a rainfed Mediterranean Vertisol: effects of tillage and crop rotation in a long-term experiment. European Journal of Soil Science.',
 '10.1111/ejss.12883', 2020, 'long-term field trial', 'single site', 'Mediterranean (Spain)',
 'OUT OF REGION. Retained as a mechanism reference only.'),
('S06','Soil carbon sequestration potential in a Vertisol in central India: results from a 43-year long-term experiment and APSIM modeling. Agricultural Systems.',
 '10.1016/j.agsy.2020.102995', 2021, 'long-term trial plus modelling', '43 years, single site', 'Central India (Vertisol)',
 'Estimates ~104 years to steady state for wheat — the basis for the saturation claim.'),
('S07','Lal, R. Soil carbon sequestration impacts on global climate change and food security. Science 304:1623-1627.',
 '10.1126/science.1097396', 2004, 'review', NULL, 'global', NULL)
ON CONFLICT (source_id) DO NOTHING;

-- ------------------------------------------------------------
-- 2. Claims, with the conditions they were measured under
-- ------------------------------------------------------------
-- The context columns are the point of this table. rainfall_band,
-- soil_texture and cropping_system are CRITICAL dimensions: a
-- mismatch on any of them removes the claim from consideration
-- entirely, because a mechanism that does not operate under the
-- site's conditions yields no conservative estimate — a
-- scaled-down version of its effect size is fabricated, not safe.

CREATE TABLE IF NOT EXISTS evidence_claims (
    claim_id        text PRIMARY KEY,
    statement       text NOT NULL,
    intervention    text,
    target_metric   text NOT NULL,
    direction       text NOT NULL CHECK (direction IN ('increase','decrease','no_effect')),
    effect_size     numeric,
    effect_unit     text,
    dispersion      text,
    time_horizon    text,
    rainfall_band   text,
    soil_texture    text,
    cropping_system text,
    zone            text,
    management      text,
    source_id       text REFERENCES evidence_sources(source_id),
    verified        boolean NOT NULL DEFAULT false,
    caveat          text
);

INSERT INTO evidence_claims (claim_id, statement, intervention, target_metric, direction,
    effect_size, effect_unit, dispersion, time_horizon, rainfall_band, soil_texture,
    cropping_system, zone, management, source_id, verified, caveat) VALUES

('C01','Conservation agriculture increases soil organic carbon content relative to conventional tillage.',
 'reduced_tillage','soc_percent','increase', 8.9,'percent_relative_change', NULL,'multi-year',
 NULL, NULL, NULL,'indian_subcontinent', NULL,'S01', false,
 'Pooled across soil types and rainfall bands; no semi-arid Vertisol sub-analysis reported.'),

('C02','Carbon sequestration under conservation agriculture increases relative to conventional tillage.',
 'reduced_tillage','carbon_sequestration','increase', 7.3,'percent_relative_change', NULL,'multi-year',
 NULL, NULL, NULL,'indian_subcontinent', NULL,'S01', false,
 'Percentage change, not an absolute stock rate. Cannot be used directly for issuance.'),

('C03','Farmyard manure combined with chemical fertiliser sequesters carbon on a semi-arid Vertisol.',
 'organic_inputs','soc_percent','increase', 0.79,'Mg_C_per_ha_per_year', NULL,'15 years',
 'semi_arid','clay','soybean_safflower','central_india','rainfed','S03', false,
 'Single site. Treatment is manure plus fertiliser, so the manure effect alone is not isolated.'),

('C04','Zero tillage with residue retention raises the carbon sequestration rate in a semi-arid system.',
 'reduced_tillage','soc_percent','increase', 1.98,'Mg_C_per_ha_per_year', NULL,'multi-year',
 'semi_arid', NULL, NULL,'southern_telangana', NULL,'S04', false,
 'Combined treatment — zero tillage, residue retention and other practices together. Attributing the whole rate to tillage would overstate it.'),

('C05','Soil organic carbon gains become statistically detectable only after about five years.',
 NULL,'soc_percent','increase', NULL, NULL, NULL,'>5 years',
 NULL, NULL, NULL,'india', NULL,'S02', false,
 'Shapes expectations rather than quantifying a gain. Relevant to crediting intervals.'),

('C06','No tillage accumulates organic carbon faster than conventional tillage on a rainfed Vertisol.',
 'reduced_tillage','soc_percent','increase', 1.0,'Mg_C_per_ha_per_year', NULL,'long-term',
 'mediterranean','clay', NULL,'mediterranean','rainfed','S05', false,
 'OUT OF REGION. Should be rejected by context matching for Indian plots; kept as a mechanism reference.'),

('C07','Residue retention promotes soil carbon accumulation under minimum tillage.',
 'residue_retention','soc_percent','increase', NULL, NULL, NULL,'multi-year',
 NULL, NULL, NULL,'india', NULL,'S01', false,
 'Direction only. No separable effect size in the sources searched.'),

('C08','Soil organic carbon approaches saturation; gains slow markedly as the soil nears a new equilibrium.',
 NULL,'soc_percent','no_effect', NULL, NULL, NULL,'decadal',
 'semi_arid','clay', NULL,'central_india', NULL,'S06', false,
 'Modelled estimate of roughly a century to steady state. Argues against extrapolating early rates.'),

('C09','Raising the soil organic carbon pool on degraded cropland increases crop yield.',
 NULL,'yield','increase', NULL, NULL, NULL,'multi-year',
 NULL, NULL, NULL,'global', NULL,'S07', false,
 'Review-level. The co-benefit argument, not a site-specific rate.'),

('C10','Organic matter increases soil water holding capacity, which matters most where water is limiting.',
 NULL,'moisture_percent','increase', NULL, NULL, NULL,'multi-year',
 NULL, NULL, NULL,'global', NULL,'S07', false,
 'Mechanism claim. Links carbon work to the outcome a rainfed farmer feels first.')

ON CONFLICT (claim_id) DO NOTHING;

-- ------------------------------------------------------------
-- 3. Causal relationships
-- ------------------------------------------------------------
-- A weighted directed graph the engine searches backwards from a
-- symptom to candidate causes. Weights are judgement, not
-- measurement, and are marked as such.

CREATE TABLE IF NOT EXISTS causal_relationships (
    rel_id    text PRIMARY KEY,
    from_var  text NOT NULL,
    to_var    text NOT NULL,
    weight    numeric NOT NULL CHECK (weight > 0 AND weight <= 1),
    direction text NOT NULL CHECK (direction IN ('positive','negative')),
    basis     text
);

INSERT INTO causal_relationships (rel_id, from_var, to_var, weight, direction, basis) VALUES
('R01','soc_percent','moisture_percent', 0.50,'positive','Organic matter raises water holding capacity (C10).'),
('R02','soc_percent','ndvi_proxy',       0.40,'positive','Better water and nutrient supply shows in canopy vigour.'),
('R03','moisture_percent','ndvi_proxy',  0.60,'positive','Direct water limitation on growth in rainfed systems.'),
('R04','moisture_percent','yield',       0.65,'positive','Water is the usual binding constraint on rainfed cropland.'),
('R05','residue_management','soc_percent',0.50,'positive','Residue retention is a carbon input (C07).'),
('R06','tillage','soc_percent',          0.45,'negative','Tillage accelerates oxidation of organic matter (C01).'),
('R07','organic_inputs','soc_percent',   0.50,'positive','Manure and compost add carbon directly (C03).'),
('R08','has_bund','moisture_percent',    0.50,'positive','Bunding slows runoff and increases infiltration.'),
('R09','slope','moisture_percent',       0.45,'negative','Runoff rises with slope, reducing what infiltrates.'),
('R10','soc_percent','yield',            0.35,'positive','Partly mediated by R01 and R04 rather than direct.')
ON CONFLICT (rel_id) DO NOTHING;

-- ------------------------------------------------------------
-- 4. Suitability thresholds
-- ------------------------------------------------------------
-- What counts as limiting versus adequate, conditioned on zone —
-- the same moisture reading means different things in semi-arid
-- and sub-humid country.
--
-- kind = 'ramp'  : lo fully limiting, hi no longer constraining
-- kind = 'band'  : an interior optimum, pH being the clear case
-- critical       : its absence blocks a diagnosis rather than
--                  merely lowering confidence

CREATE TABLE IF NOT EXISTS suitability_thresholds (
    variable   text NOT NULL,
    zone       text NOT NULL DEFAULT 'semi_arid',
    kind       text NOT NULL CHECK (kind IN ('ramp','band','enum')),
    lo         numeric,
    hi         numeric,
    centre     numeric,
    half_width numeric,
    unit       text,
    critical   boolean NOT NULL DEFAULT false,
    basis      text,
    PRIMARY KEY (variable, zone)
);

INSERT INTO suitability_thresholds (variable, zone, kind, lo, hi, centre, half_width, unit, critical, basis) VALUES
('moisture_percent',   'semi_arid','ramp',  8,   25,  NULL, NULL,'%',    true,
 'Below roughly 8% volumetric most rainfed crops are water-stressed; above 25% water is not the constraint.'),
('soc_percent',        'semi_arid','ramp',  0.3, 0.80,NULL, NULL,'%',    true,
 'Typical semi-arid Indian cropland range. Below 0.3% is considered degraded.'),
('ph',                 'semi_arid','band',  NULL,NULL, 6.8, 1.2, 'pH',   false,
 'Nutrient availability is widest near neutral; both acidity and alkalinity narrow it.'),
('annual_rainfall_mm', 'semi_arid','ramp',  400, 900, NULL, NULL,'mm',   false,
 'Defines the rainfall band used for context matching.'),
('ndvi_proxy',         'semi_arid','ramp',  0.20,0.60,NULL, NULL,'index',false,
 'Canopy vigour proxy. Read as a trend rather than an absolute.')
ON CONFLICT (variable, zone) DO NOTHING;

-- ------------------------------------------------------------
-- 5. Interventions
-- ------------------------------------------------------------
-- competes_for is what makes sequencing work. Where water is the
-- limiting factor, an intervention that consumes water must be
-- DEFERRED with its precondition recorded, not recommended
-- alongside the thing that would relieve the constraint.

CREATE TABLE IF NOT EXISTS interventions (
    intervention_id text PRIMARY KEY,
    name            text NOT NULL,
    name_mr         text,
    name_hi         text,
    category        text,
    competes_for    text,
    addresses       text,
    time_horizon    text,
    cost_band       text
);

INSERT INTO interventions (intervention_id, name, name_mr, name_hi, category, competes_for, addresses, time_horizon, cost_band) VALUES
('contour_bunding',  'Contour bunding',          'समपातळी बांध','कंटूर बांध',     'water',  NULL,   'moisture_percent','1 season','low'),
('residue_retention','Keep crop residue',        'पिकांचे अवशेष ठेवा','फसल अवशेष रखें','carbon', NULL,  'soc_percent','2-3 years','none'),
('reduced_tillage',  'Reduce tillage',           'कमी नांगरणी','कम जुताई',        'carbon', NULL,   'soc_percent','3-5 years','none'),
('organic_inputs',   'Apply FYM or compost',     'शेणखत वापरा','गोबर खाद डालें',   'carbon', NULL,   'soc_percent','2-3 years','medium'),
('cover_cropping',   'Cover cropping',           'आच्छादन पीक','कवर फसल',         'carbon','water','soc_percent','2-3 years','low'),
('agroforestry',     'Plant border trees',       'बांधावर झाडे','मेड़ पर पेड़',     'carbon','water','soc_percent','5+ years','medium')
ON CONFLICT (intervention_id) DO NOTHING;

COMMIT;

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT 'sources' AS check_name, count(*)::text AS result, '7' AS expected,
       CASE WHEN count(*) = 7 THEN 'PASS' ELSE 'FAIL' END AS verdict FROM evidence_sources
UNION ALL SELECT 'claims', count(*)::text, '10',
       CASE WHEN count(*) = 10 THEN 'PASS' ELSE 'FAIL' END FROM evidence_claims
UNION ALL SELECT 'claims with an effect size', count(*)::text, '5',
       CASE WHEN count(*) = 5 THEN 'PASS' ELSE 'FAIL' END
       FROM evidence_claims WHERE effect_size IS NOT NULL
UNION ALL SELECT 'claims verified', count(*)::text, '0 (none read in full)',
       CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END
       FROM evidence_claims WHERE verified
UNION ALL SELECT 'out-of-region claim present', count(*)::text, '1',
       CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END
       FROM evidence_claims WHERE zone = 'mediterranean'
UNION ALL SELECT 'causal edges', count(*)::text, '10',
       CASE WHEN count(*) = 10 THEN 'PASS' ELSE 'FAIL' END FROM causal_relationships
UNION ALL SELECT 'thresholds', count(*)::text, '5',
       CASE WHEN count(*) = 5 THEN 'PASS' ELSE 'FAIL' END FROM suitability_thresholds
UNION ALL SELECT 'water-competing interventions', count(*)::text, '2',
       CASE WHEN count(*) = 2 THEN 'PASS' ELSE 'FAIL' END
       FROM interventions WHERE competes_for = 'water';

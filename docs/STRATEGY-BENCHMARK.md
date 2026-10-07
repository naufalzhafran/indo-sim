# Model 4 strategy benchmark

Model 4.0.0; data 2024.3. 0–99 development; 20000–20099 held out. Each run lasts 60 months. Coefficients and strategies were frozen before evaluating held-out seeds. Engine and strategy fingerprint: `dab1b6196752ed970852365bd7f25163731cab3b4907193bcc24037eee76d28f`. All saves parse; accounting, bounded stocks, approval contributions and save continuation are checked. Engine p95 5.44 ms on this host.

## Acceptance

- development: pooled active 61.75%; strongest fixed fixed-education 21.50%; gap 40.25 percentage points. PASS. Accept-all broken requests: 4418.
- held-out: pooled active 68.13%; strongest fixed fixed-education 30.00%; gap 38.13 percentage points. PASS. Accept-all broken requests: 4326.

## Strategies

Fixed packages are approved once at the start and frozen for the whole term. Five competitive packages include the former dominant opening, maximum health, maximum education, mixed services and lean taxation. A development search compared 36 additional combinations of health, education, business tax and administration on seeds 0–4 in every scenario, retaining its strongest package. Assistance, restraint and neglect show common weak approaches; investment starts contracts. Accept-all says yes to every party request and does nothing further to deliver it. Administration pulses alternate three months of 100 with nine of 50. Both active strategies use visible prices, crises, party requests, votes and financing estimates; they accept party requests they can deliver and decline the rest, fund relief, commission projects, adjust assistance/fuel/maintenance, cut health expansion when appropriations cannot be financed and campaign with separate campaign credits in the final year. They cannot read future draws or override results.

| Split | Scenario | Strategy | Wins | Mean vote | End real GDP | Debt/GDP | Fulfilled / broken party requests |
|---|---|---|---|---|---|---|---|
| development | normal | passive | 4/100 | 44.9% | 27629 | 36.8% | 0 / 0 |
| development | normal | assistance | 0/100 | 40.0% | 26370 | 39.1% | 0 / 0 |
| development | normal | investment | 4/100 | 44.2% | 27353 | 37.9% | 0 / 0 |
| development | normal | restraint | 4/100 | 44.9% | 27629 | 36.8% | 0 / 0 |
| development | normal | fixed-health | 19/100 | 47.3% | 27326 | 32.6% | 0 / 0 |
| development | normal | fixed-services | 26/100 | 47.9% | 27367 | 32.1% | 0 / 0 |
| development | normal | fixed-education | 36/100 | 48.8% | 27232 | 36.8% | 0 / 0 |
| development | normal | fixed-lean | 12/100 | 46.2% | 27454 | 37.6% | 0 / 0 |
| development | normal | fixed-opening | 5/100 | 43.7% | 26706 | 38.7% | 0 / 0 |
| development | normal | adaptive | 77/100 | 51.8% | 27679 | 36.9% | 1498 / 35 |
| development | normal | active-recovery | 77/100 | 51.8% | 27641 | 36.6% | 1524 / 26 |
| development | normal | accept-all | 1/100 | 43.3% | 27166 | 37.8% | 509 / 1094 |
| development | normal | administration-pulse | 13/100 | 45.9% | 27067 | 38.0% | 0 / 0 |
| development | normal | neglect | 0/100 | 15.5% | 21964 | 44.1% | 0 / 0 |
| development | commodity | passive | 1/100 | 43.3% | 26625 | 38.1% | 0 / 0 |
| development | commodity | assistance | 0/100 | 37.9% | 25342 | 40.1% | 0 / 0 |
| development | commodity | investment | 1/100 | 42.3% | 26285 | 39.0% | 0 / 0 |
| development | commodity | restraint | 1/100 | 43.3% | 26625 | 38.1% | 0 / 0 |
| development | commodity | fixed-health | 11/100 | 45.9% | 26424 | 34.6% | 0 / 0 |
| development | commodity | fixed-services | 13/100 | 46.4% | 26463 | 34.0% | 0 / 0 |
| development | commodity | fixed-education | 17/100 | 46.9% | 26212 | 38.1% | 0 / 0 |
| development | commodity | fixed-lean | 9/100 | 44.4% | 26409 | 38.7% | 0 / 0 |
| development | commodity | fixed-opening | 1/100 | 41.7% | 25658 | 39.7% | 0 / 0 |
| development | commodity | adaptive | 60/100 | 50.2% | 26733 | 38.1% | 1504 / 45 |
| development | commodity | active-recovery | 60/100 | 50.3% | 26699 | 37.8% | 1519 / 35 |
| development | commodity | accept-all | 0/100 | 41.3% | 26134 | 39.0% | 516 / 1109 |
| development | commodity | administration-pulse | 6/100 | 44.0% | 26032 | 39.2% | 0 / 0 |
| development | commodity | neglect | 0/100 | 13.7% | 21061 | 45.2% | 0 / 0 |
| development | food-energy | passive | 0/100 | 42.1% | 27101 | 36.5% | 0 / 0 |
| development | food-energy | assistance | 0/100 | 37.0% | 25852 | 38.6% | 0 / 0 |
| development | food-energy | investment | 0/100 | 41.3% | 26806 | 37.5% | 0 / 0 |
| development | food-energy | restraint | 0/100 | 42.1% | 27101 | 36.5% | 0 / 0 |
| development | food-energy | fixed-health | 3/100 | 44.5% | 26842 | 32.6% | 0 / 0 |
| development | food-energy | fixed-services | 6/100 | 45.1% | 26886 | 32.0% | 0 / 0 |
| development | food-energy | fixed-education | 13/100 | 45.9% | 26703 | 36.4% | 0 / 0 |
| development | food-energy | fixed-lean | 2/100 | 43.4% | 26916 | 37.2% | 0 / 0 |
| development | food-energy | fixed-opening | 0/100 | 40.8% | 26178 | 38.3% | 0 / 0 |
| development | food-energy | adaptive | 39/100 | 48.5% | 27048 | 37.0% | 1463 / 66 |
| development | food-energy | active-recovery | 39/100 | 48.6% | 27032 | 36.8% | 1491 / 45 |
| development | food-energy | accept-all | 0/100 | 40.3% | 26639 | 37.4% | 516 / 1116 |
| development | food-energy | administration-pulse | 2/100 | 43.0% | 26540 | 37.6% | 0 / 0 |
| development | food-energy | neglect | 0/100 | 13.1% | 21553 | 43.5% | 0 / 0 |
| development | disaster | passive | 1/100 | 43.0% | 27100 | 37.3% | 0 / 0 |
| development | disaster | assistance | 0/100 | 36.8% | 25645 | 39.7% | 0 / 0 |
| development | disaster | investment | 3/100 | 43.3% | 27036 | 38.2% | 0 / 0 |
| development | disaster | restraint | 1/100 | 43.0% | 27100 | 37.3% | 0 / 0 |
| development | disaster | fixed-health | 11/100 | 45.7% | 26893 | 33.1% | 0 / 0 |
| development | disaster | fixed-services | 13/100 | 46.7% | 27033 | 32.4% | 0 / 0 |
| development | disaster | fixed-education | 20/100 | 47.3% | 26819 | 37.2% | 0 / 0 |
| development | disaster | fixed-lean | 10/100 | 45.2% | 27130 | 37.8% | 0 / 0 |
| development | disaster | fixed-opening | 1/100 | 42.6% | 26397 | 38.9% | 0 / 0 |
| development | disaster | adaptive | 70/100 | 51.1% | 27336 | 37.4% | 1497 / 56 |
| development | disaster | active-recovery | 72/100 | 51.2% | 27331 | 37.1% | 1519 / 42 |
| development | disaster | accept-all | 0/100 | 42.7% | 27000 | 37.9% | 513 / 1099 |
| development | disaster | administration-pulse | 11/100 | 45.3% | 26869 | 38.1% | 0 / 0 |
| development | disaster | neglect | 0/100 | 10.4% | 19675 | 46.9% | 0 / 0 |
| held-out | normal | passive | 3/100 | 45.5% | 27855 | 36.6% | 0 / 0 |
| held-out | normal | assistance | 1/100 | 40.7% | 26593 | 39.0% | 0 / 0 |
| held-out | normal | investment | 4/100 | 44.9% | 27608 | 37.8% | 0 / 0 |
| held-out | normal | restraint | 3/100 | 45.5% | 27855 | 36.6% | 0 / 0 |
| held-out | normal | fixed-health | 28/100 | 47.9% | 27542 | 32.4% | 0 / 0 |
| held-out | normal | fixed-services | 31/100 | 48.4% | 27579 | 31.8% | 0 / 0 |
| held-out | normal | fixed-education | 48/100 | 49.4% | 27467 | 36.6% | 0 / 0 |
| held-out | normal | fixed-lean | 17/100 | 46.9% | 27695 | 37.5% | 0 / 0 |
| held-out | normal | fixed-opening | 4/100 | 44.4% | 26942 | 38.6% | 0 / 0 |
| held-out | normal | adaptive | 83/100 | 52.5% | 27915 | 36.8% | 1545 / 28 |
| held-out | normal | active-recovery | 83/100 | 52.5% | 27873 | 36.4% | 1567 / 23 |
| held-out | normal | accept-all | 3/100 | 44.0% | 27407 | 37.7% | 514 / 1071 |
| held-out | normal | administration-pulse | 14/100 | 46.7% | 27313 | 37.9% | 0 / 0 |
| held-out | normal | neglect | 0/100 | 16.0% | 22139 | 44.2% | 0 / 0 |
| held-out | commodity | passive | 3/100 | 44.0% | 26842 | 38.0% | 0 / 0 |
| held-out | commodity | assistance | 1/100 | 38.6% | 25538 | 40.1% | 0 / 0 |
| held-out | commodity | investment | 1/100 | 43.0% | 26512 | 38.9% | 0 / 0 |
| held-out | commodity | restraint | 3/100 | 44.0% | 26842 | 38.0% | 0 / 0 |
| held-out | commodity | fixed-health | 10/100 | 46.6% | 26622 | 34.4% | 0 / 0 |
| held-out | commodity | fixed-services | 17/100 | 47.1% | 26660 | 33.8% | 0 / 0 |
| held-out | commodity | fixed-education | 27/100 | 47.6% | 26426 | 38.0% | 0 / 0 |
| held-out | commodity | fixed-lean | 7/100 | 45.1% | 26629 | 38.7% | 0 / 0 |
| held-out | commodity | fixed-opening | 1/100 | 42.4% | 25867 | 39.7% | 0 / 0 |
| held-out | commodity | adaptive | 66/100 | 51.0% | 26950 | 38.0% | 1546 / 37 |
| held-out | commodity | active-recovery | 66/100 | 51.0% | 26915 | 37.7% | 1562 / 32 |
| held-out | commodity | accept-all | 3/100 | 42.1% | 26354 | 38.9% | 517 / 1087 |
| held-out | commodity | administration-pulse | 8/100 | 44.8% | 26261 | 39.1% | 0 / 0 |
| held-out | commodity | neglect | 0/100 | 14.1% | 21195 | 45.2% | 0 / 0 |
| held-out | food-energy | passive | 1/100 | 42.8% | 27320 | 36.4% | 0 / 0 |
| held-out | food-energy | assistance | 0/100 | 37.7% | 26055 | 38.6% | 0 / 0 |
| held-out | food-energy | investment | 1/100 | 42.0% | 27045 | 37.4% | 0 / 0 |
| held-out | food-energy | restraint | 1/100 | 42.8% | 27320 | 36.4% | 0 / 0 |
| held-out | food-energy | fixed-health | 4/100 | 45.2% | 27045 | 32.3% | 0 / 0 |
| held-out | food-energy | fixed-services | 5/100 | 45.7% | 27083 | 31.8% | 0 / 0 |
| held-out | food-energy | fixed-education | 15/100 | 46.5% | 26921 | 36.3% | 0 / 0 |
| held-out | food-energy | fixed-lean | 3/100 | 44.0% | 27138 | 37.1% | 0 / 0 |
| held-out | food-energy | fixed-opening | 1/100 | 41.5% | 26397 | 38.2% | 0 / 0 |
| held-out | food-energy | adaptive | 47/100 | 49.2% | 27270 | 37.0% | 1525 / 52 |
| held-out | food-energy | active-recovery | 48/100 | 49.4% | 27252 | 36.7% | 1547 / 39 |
| held-out | food-energy | accept-all | 1/100 | 41.0% | 26863 | 37.3% | 520 / 1097 |
| held-out | food-energy | administration-pulse | 4/100 | 43.8% | 26772 | 37.5% | 0 / 0 |
| held-out | food-energy | neglect | 0/100 | 13.6% | 21703 | 43.5% | 0 / 0 |
| held-out | disaster | passive | 1/100 | 43.7% | 27336 | 37.1% | 0 / 0 |
| held-out | disaster | assistance | 0/100 | 37.7% | 25898 | 39.6% | 0 / 0 |
| held-out | disaster | investment | 2/100 | 44.1% | 27302 | 38.1% | 0 / 0 |
| held-out | disaster | restraint | 1/100 | 43.7% | 27336 | 37.1% | 0 / 0 |
| held-out | disaster | fixed-health | 9/100 | 46.4% | 27116 | 32.8% | 0 / 0 |
| held-out | disaster | fixed-services | 18/100 | 47.4% | 27256 | 32.2% | 0 / 0 |
| held-out | disaster | fixed-education | 30/100 | 48.0% | 27065 | 37.0% | 0 / 0 |
| held-out | disaster | fixed-lean | 11/100 | 45.9% | 27379 | 37.7% | 0 / 0 |
| held-out | disaster | fixed-opening | 1/100 | 43.3% | 26637 | 38.9% | 0 / 0 |
| held-out | disaster | adaptive | 76/100 | 51.7% | 27573 | 37.3% | 1540 / 56 |
| held-out | disaster | active-recovery | 76/100 | 51.7% | 27565 | 36.9% | 1556 / 52 |
| held-out | disaster | accept-all | 3/100 | 43.5% | 27250 | 37.8% | 515 / 1071 |
| held-out | disaster | administration-pulse | 10/100 | 46.1% | 27123 | 38.0% | 0 / 0 |
| held-out | disaster | neglect | 0/100 | 10.6% | 19881 | 46.8% | 0 / 0 |

## Calibration record

This report covers 11,200 campaigns and 672,000 monthly turns. Final shared coefficients are recorded in [balance-freeze.json](balance-freeze.json) and [MODEL.md](MODEL.md). Model 4 kept the model 3 service approval weights (.16 health, .11 education) and construction productivity (.06). Development calibration on seeds 0–99 counted capacity once in program absorption, softened power outages (reliability slope 150, outage approval .15), set program strengths of 30 (health access), 21 (education access) and 16 (education quality), raised the strategy-neutral electoral baseline from 49 to 49.6 after anchored pillars removed model 3's passive service drift, and made the benchmark strategies respond to population-weighted grid and food signals. The model 3 36-package opening search remains in [balance-opening-search.json](balance-opening-search.json) for reference. Final strategies and coefficients were frozen before fresh-seed evaluation and were not retuned afterward.

These are gameplay comparisons, not forecasts or empirical validation. Machine-readable results include household losses, funding stress, growth variability, regional spread and accepted budget changes. Win-rate targets concern pooled strategies; scenario differences are retained.

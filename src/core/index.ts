/* RigLab core: the framework-free business logic (compatibility, power, budget, offers, cart).
 * Browser: window.RigLabCore (bundled by scripts/build.js). Node/tests: import from '../src/core'. */
import { MARKETS, NOTICE, PARTS, SAMPLE_DATE, STORES } from '../data';
import { CATS, CAT_KEYS, VERDICT, catInfo, getPart, partsOf, priceOf } from './shared';
import { buildTotal, cleanBuild, decodeBuild, encodeBuild, resolve } from './build';
import { estimatePower, psuFromLoad, upsEstimate } from './power';
import { checkCompat } from './compat';
import { USAGE, suggestBuilds } from './budget';
import { createSaved, findSaved, normalizeSaved, removeSaved, savedParts } from './saved-builds';
import { costByStore, offersFor } from './offers';
import { bestOffer, buyUrl, cartGroups, offerFor, planCheapest, planSingleStore, storeById } from './cart';
import { shortSpec, specRows } from './specs';

export * from './types';
export {
  CATS, CAT_KEYS, VERDICT, USAGE, STORES, PARTS, MARKETS, NOTICE, SAMPLE_DATE,
  catInfo, getPart, partsOf, priceOf,
  resolve, cleanBuild, buildTotal, encodeBuild, decodeBuild,
  estimatePower, psuFromLoad, upsEstimate, checkCompat, suggestBuilds,
  offersFor, costByStore, storeById, offerFor, bestOffer, cartGroups, planCheapest, planSingleStore, buyUrl,
  normalizeSaved, createSaved, findSaved, removeSaved, savedParts, specRows, shortSpec
};

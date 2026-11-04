'use strict';
/* RigLab core: the framework-free business logic (compatibility, power, budget, offers, cart).
 * Browser: window.RigLabCore (bundled by scripts/build.js). Node/tests: require('../src/core'). */
var D = require('../data');
var shared = require('./shared'), build = require('./build'), power = require('./power'), compat = require('./compat'),
  budget = require('./budget'), saved = require('./saved-builds'), offers = require('./offers'), cart = require('./cart'), specs = require('./specs');

module.exports = {
  CATS: shared.CATS, CAT_KEYS: shared.CAT_KEYS, VERDICT: shared.VERDICT, USAGE: budget.USAGE,
  STORES: D.STORES, PARTS: D.PARTS, MARKETS: D.MARKETS, NOTICE: D.NOTICE, SAMPLE_DATE: D.SAMPLE_DATE,
  catInfo: shared.catInfo, getPart: shared.getPart, partsOf: shared.partsOf, priceOf: shared.priceOf,
  resolve: build.resolve, cleanBuild: build.cleanBuild, buildTotal: build.buildTotal, encodeBuild: build.encodeBuild, decodeBuild: build.decodeBuild,
  estimatePower: power.estimatePower, psuFromLoad: power.psuFromLoad, upsEstimate: power.upsEstimate,
  checkCompat: compat.checkCompat, suggestBuilds: budget.suggestBuilds,
  offersFor: offers.offersFor, costByStore: offers.costByStore,
  storeById: cart.storeById, offerFor: cart.offerFor, bestOffer: cart.bestOffer,
  cartGroups: cart.cartGroups, planCheapest: cart.planCheapest, planSingleStore: cart.planSingleStore, buyUrl: cart.buyUrl,
  normalizeSaved: saved.normalizeSaved, createSaved: saved.createSaved, findSaved: saved.findSaved, removeSaved: saved.removeSaved, savedParts: saved.savedParts,
  specRows: specs.specRows, shortSpec: specs.shortSpec
};

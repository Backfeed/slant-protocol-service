var Immutable = require('immutable');
var _ = require('underscore');
var math = require('mathjs');

var STAKE = 0.05;
var ALPHA = 0.5;
var BETA = 1;
var ROUND_TO = 6;
var TOKEN_REWARD_FACTOR = 15;
var REP_REWARD_FACTOR = 5;

module.exports = {
  evaluate: evaluate,
  calcReward: calcReward,
  burnStakeForCurrentUser: burnStakeForCurrentUser,
  getSameEvaluatorsAddValue: getSameEvaluatorsAddValue,
  updateSameEvaluatorsRep: updateSameEvaluatorsRep,
  updateEvaluatorsRep: updateEvaluatorsRep
};

function evaluate(uid, value, evaluators, evaluations, cachedRep) {

  var iMap = Immutable.Map({
    newRep: 0,
    voteRep: 0,
    cachedRep: cachedRep
  });

  evaluators = addVoteValueToEvaluators(evaluators, evaluations);
  iMap = iMap.set('newRep', getCurrentUserFrom(evaluators, uid).reputation);
  iMap = iMap.set('voteRep', getVoteRep(evaluators, value));


  evaluators = updateSameEvaluatorsRep(evaluators, iMap.get('newRep'), iMap.get('cachedRep'), iMap.get('voteRep'), value, uid);

  evaluators = updateEvaluatorsRep(evaluators, iMap.get('newRep'), iMap.get('cachedRep'));

  evaluators = cleanupEvaluators(evaluators);

  return evaluators;
}

function addVoteValueToEvaluators(evaluators, evaluations) {
  return _.map(evaluators, function(evaluator) {
    evaluator.value = _.find(evaluations, function(evaluation) {
      return evaluation.userId === evaluator.id;
    }).value;

    return evaluator;
  });
}

function getVoteRep(evaluators, value) {
  var toAdd = 0;
  return _.reduce(evaluators, function(memo, evaluator) {
    toAdd = evaluator.value === value ? evaluator.reputation : 0;
    return memo + toAdd;
  }, 0);
}

function getCurrentUserFrom(evaluators, currentUserId) {
  return _.find(evaluators, function(evaluator) {
    return evaluator.id === currentUserId;
  });
}

function burnStakeForCurrentUser(currentUserRep) {
  var toMultiply = math.subtract(1, STAKE);
  return math.multiply(currentUserRep, toMultiply);
}

function getSameEvaluatorsAddValue(newRep, factor, evaluatorRep, voteRep) {
  return math.chain(newRep)
                .multiply(STAKE)
                .multiply(factor)
                .multiply(evaluatorRep)
                .divide(voteRep)
                .done();
}

function updateSameEvaluatorsRep(evaluators, newRep, cachedRep, voteRep, currentEvaluationValue, currentUserId) {
  var toAdd;
  var factor = math.pow(math.divide(voteRep, cachedRep), ALPHA);
  return _.map(evaluators, function(evaluator) {

    if ( evaluator.id === currentUserId ) {
      toAdd = getSameEvaluatorsAddValue(newRep, factor, newRep, voteRep);
      evaluator.reputation = math.add(burnStakeForCurrentUser(newRep), toAdd);
    }

    else if ( evaluator.value === currentEvaluationValue ) {
      toAdd = getSameEvaluatorsAddValue(newRep, factor, evaluator.reputation, voteRep);
      evaluator.reputation = math.add(evaluator.reputation, toAdd);
    }

    return evaluator;
  });
}

function updateEvaluatorsRep(evaluators, currentUserRep, cachedRep) {
  var factor = math.pow(math.divide(currentUserRep, cachedRep), BETA);
  var toDivide = math.chain(1)
                        .subtract(math.multiply(STAKE, factor))
                        .done();

  return _.map(evaluators, function(evaluator) {
    evaluator.reputation = math.divide(evaluator.reputation, toDivide);
    return evaluator;
  });

}

function cleanupEvaluators(evaluators) {
  return _.map(evaluators, function(evaluator) {
    evaluator.reputation = round(evaluator.reputation);
    evaluator = _.omit(evaluator, 'value');
    return evaluator;
  });
}

function round(n) {
  return math.round(n, ROUND_TO);
}

function calcReward(winningContributionScore, cachedRep) {
  return {
    reputation: REP_REWARD_FACTOR * winningContributionScore / cachedRep,
    tokens: TOKEN_REWARD_FACTOR * winningContributionScore / cachedRep
  }
}

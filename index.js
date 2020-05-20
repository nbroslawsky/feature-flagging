const crypto = require('crypto')
const assert = require('assert').strict


function isInRollout(keyName, userString, rolloutPercentage) {
	let uniqueKey = '' + keyName + userString
	let hash = crypto.createHash('md5').update(uniqueKey).digest("hex")
	let total = 0;

	let md5HashLength = 32
	let minHashValue = '0'.charCodeAt(0) * md5HashLength // md5 hash length
	let maxHashValue = 'z'.charCodeAt(0) * md5HashLength // md5 hash length

	for(let i=0; i<hash.length; i++) {
		total += hash.charCodeAt(i)
	}

	let pct = (total-minHashValue)/(maxHashValue-minHashValue)
	return (pct<rolloutPercentage)
}

const operators = {
	'is': (uv, tv) => { return uv.toLowerCase() == tv.toLowerCase() },
	'is one of': (uv, tv) => { return tv.indexOf(uv) > -1 },
	// ... more operators could go here
}

function evaluateFlags(keyName, userString, rules, userContext) {

	console.debug('DEBUG:','Feature Flag Name', keyName)
	console.debug('DEBUG:','Unique User String', userString)
	console.debug('DEBUG:','Targeting Rules', rules)
	console.debug('DEBUG:','User Context', userContext)

	// first loop through all the constraints
	// if any of them fail, bail out by returning false
	// no need to continue
	if(rules.constraints && rules.constraints.length) {
		for(let i=0; i<rules.constraints.length; i++) {
			let constraint = rules.constraints[i] || {}
			console.debug('DEBUG:','Evaluating Constraint', constraint.field, constraint.operator, constraint.value)

			let f = operators[constraint.operator]
			if(!f) {
				console.error(constraint.operator + ' is not a valid operator')
				return false
			}

			let userValue = userContext[constraint.field]
			let targetValue = constraint.value
			if(!f(userValue, targetValue)) {
				return false
			}
		}
	}

	// assuming all the constraints passed (if there were any)
	// check the percentage rollout, if there is one
	if(rules.rolloutPercentage) {
		console.debug('DEBUG:','Evaluating Rollout Percentage', (rules.rolloutPercentage*100)+'%')
		return isInRollout(keyName, userString, rules.rolloutPercentage)
	}

	// if there was no percentage rollout, and we got through all the constraints
	// it must have been true
	return true;
}

const userContext = {
	name: 'Nathan Broslawsky',
	email: 'nbroslawsky@gmail.com',
	utm_campaign: 'my_fancy_campaign',
	utm_source: 'facebook',
	utm_medium: 'organic'
}


// this one will be true
assert.strictEqual(true, evaluateFlags("my feature flag", "abc1238", {
	constraints: [
		{ field: "utm_source", operator: "is one of", value: ['facebook', 'google'] },
		{ field: "utm_medium", operator: "is", value: 'organic' }
	],
	rolloutPercentage: .15
}, userContext))

// this one will be false, because 'abc123' doesn't match the rollout group
assert.strictEqual(false, evaluateFlags("my feature flag", "abc123", {
	constraints: [
		{ field: "utm_source", operator: "is one of", value: ['facebook', 'google'] },
		{ field: "utm_medium", operator: "is", value: 'organic' }
	],
	rolloutPercentage: .15
}, userContext))

// this one will be false because the utm_source is facebookm, not pinterest or google
assert.strictEqual(false, evaluateFlags("my feature flag", "abc1238", {
	constraints: [
		{ field: "utm_source", operator: "is one of", value: ['pinterest', 'google'] },
		{ field: "utm_medium", operator: "is", value: 'organic' }
	],
	rolloutPercentage: .15
}, userContext))
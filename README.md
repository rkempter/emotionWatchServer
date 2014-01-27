# socialemotioneye-server
=======================

## Introduction

SocialEmotionEye Server is a server that handles request made from the socialemotioneye application. It's main purpose is reading and process the >40 millions of tweets collected during the Olympic Games 2012 in London.

## Installation

## API

SocialEmotionEye Server has an RESTful API interface with the following possible actions.

### GET `/emotionTweets`

Given a date and time for the start and end, a step size, network, a keyword and a keyword type, the method returns aggregated emotion values occuring during the requested timespan.

Returns a JSON object with timestamps as keys. The response has the following format, where emotions contains the value for each category and frequency the total amount of tweets during this particular frame.

Example:

```javascript
$.get('http://localhost:8124/emotionTweets', { 
	keyword: [ '513' ],
	startDateTime: 'Mon Aug 06 2012 13:49:35 GMT+0200 (CEST)',
	endDateTime: 'Mon Aug 06 2012 14:22:35 GMT+0200 (CEST)',
	timeStep: '5',
	network: 'twitter',
	keywordType: 'event' 
}, function(data) { 
	console.log(data); 
});
```

```json
{
	"Mon Aug 06 2012 13:49:35 GMT+0200 (CEST)": {
		"emotions": {
			"amusement": 0.06131834440470107,
			"anger": 0.0383239652529382,
			"awe": 0.6435871231476752,
			"contempt": 0,
			"disgust": 0,
			"envy": 0.003065917220235056,
			"guilt": 0,
			"happiness": 0.7345426673479813,
			"involvement": 0.6287685232498729,
			"love": 0.11037301992846194,
			"nostalgia": 0.015329586101175257,
			"pity": 0.03679100664282072,
			"pleasure": 0.42846193152784906,
			"pride": 1,
			"regret": 0.13030148185998972,
			"relief": 0.12416964741951968,
			"sadness": 0,
			"shame": 0.03679100664282066,
			"surprise": 0.32192130812468084,
			"worry": 0.04292284108329076
		},
		frequency: "5"
	},
	"Mon Aug 06 2012 13:49:40 GMT+0200 (CEST)": {
		emotions: {
			amusement: 0.11432743720812566,
			anger: 0.20261838198525606,
			awe: 0.3522589283648747,
			contempt: 0.06662608684412946,
			disgust: 0.0026299771122682697,
			envy: 0.0011104347807354932,
			guilt: 0,
			"happiness": 0.3774734592881325,
			"involvement": 1,
			"love": 0.13565792839287896,
			"nostalgia": 0.02521167428857385,
			"pity": 0.07591867264081081,
			"pleasure": 0.4767284489625687,
			"pride": 0.9685221336270013,
			"regret": 0.11754199416890604,
			"relief": 0.04010377919656257,
			"sadness": 0,
			"shame": 0.013325217368825911,
			"surprise": 0.15909717793527886,
			"worry": 0.015546086930296894
		},
		frequency: "13"
	}
}
```

### GET `/tweets`

returns




### GET `/frequency`

### GET `/frontPage`

### GET `/getEventInfo`

### GET `/getEventVideo`

### GET `/getEventList`

### GET `/videos/:video`

### GET `/events`

### GET `/event/:id`

### GET `/specEvents`

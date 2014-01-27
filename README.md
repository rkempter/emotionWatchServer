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
		"emotions": {
			"amusement": 0.11432743720812566,
			"anger": 0.20261838198525606,
			"awe": 0.3522589283648747,
			"contempt": 0.06662608684412946,
			"disgust": 0.0026299771122682697,
			"envy": 0.0011104347807354932,
			"guilt": 0,
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
		"frequency": "13"
	}
}
```

### GET `/tweets`
Returns tweets for a specific timespan (defined by start date time and the window size).

Example for a request:
```javascript
$.get( 'http://localhost:8124/tweets', { 
	datetime: 'Mon Aug 06 2012 13:49:45 GMT+0200 (CEST)',
	hashtag: [ '513' ],
	windowsize: '5',
	network: 'twitter',
	keywordType: 'event' 
}, function(data) {
	console.log(data); 
});
```

Response:
```javascript
[ 
{
	datetime: "2012-08-06 13:49:47",
	emotion: "involvement",
	id: 30786665,
	tweet: "Good Luck Beth Tweddle #London2012 #TeamGB",
	user: "Oliviaa_Mariee_"
}, 
{
	datetime: "2012-08-06 13:49:49",
	emotion: "pride",
	id: 30786724,
	tweet: "New #leotard for my future #Olympic #athlete (Kamiyah's) #gymnastics class brought by the best friend @kgj26 http://t.co/Yl1yIxOm",
	user: "iamshaddyshad"
}
]
```

### GET `/frequency`

For each time slot between a start datetime and end datetime, the most frequent emotion and the tweet frequency value is given.

Request
```javascript
$.get( 'http://localhost:8124/frequency', { 
	network: 'twitter',
	windowsize: '5',
	startDateTime: 'Mon Aug 06 2012 13:49:35 GMT+0200 (CEST)',
	endDateTime: 'Mon Aug 06 2012 14:22:35 GMT+0200 (CEST)',
	keyword: [ '513' ],
	keywordType: 'event' 
}, function(data) {
	console.log(data); 
});
```

Response
```javascript
{
	"1344253775000": {
		"emotion": "Pride",
		"frequency": "5"
	},
	"1344253780000": {
		"emotion": "Involvement",
		"frequency": "13"
	},
	"1344253785000": {
		"emotion": "Pride",
		"frequency": "12"
	}
}
```

### GET `/getEventInfo`

```javascript
$.get( 'http://localhost:8124/getEventInfo', { 
	id: '513' 
}, function(data) {
	console.log(data); 
});
```

Response:

```javascript
[
	{
		event: "Uneven Bars: final, victory ceremony"
		gender: "Women"
		sport: "Gymnastics"
	}
]
```

### GET `/getEventVideo`

```javascript
$.get( 'http://localhost:8124/getEventVideo', { 
	id: '513' 
}, function(data) {
	console.log(data); 
});
```
Response:

```javascript
[{
	video: "gymnastics-unevenbars.mp4"
}]
```


### GET `/getEventList`

```javascript
$.get( 'http://localhost:8124/getEventList', function(data) {
	console.log(data); 
});
```

Response

```javascript
[
	"513": {
		"desc": null,
		"endDateTime": "2012-08-06T12:22:35.000Z",
		"event": "Uneven Bars: final, victory ceremony",
		"gender": "Women",
		"id": 513,
		"sport": "Gymnastics",
		"startDateTime": "2012-08-06T11:49:35.000Z",
		"twitter": "gymnastics,bars,uneven,ArtisticGymnastics,barFinals,MUSTAFINA Aliya,TWEDDLE Elizabeth,KOMOVA Victoria,Kexin He,YAO Jinnan,DOUGLAS Gabrielle,SEITZ Elisabeth,TSURUMI Koko",
		"weibo": null
	},
	"901": {
		"desc": null,
		"endDateTime": "2012-08-05T12:55:00.000Z",
		"event": "Singles: gold medal match, victory ceremony",
		"gender": "Men",
		"id": 901,
		"sport": "Tennis",
		"startDateTime": "2012-08-05T10:45:00.000Z",
		"twitter": "tennis,MURRAY Andy,FEDERER Roger,GoRoger,,TeamFederer,@wimbledon,wimbledon,TeamMurray",
		"weibo": null
	}
]
```

### GET `/videos/:video`

Re

### GET `/event/:id`
```javascript
$.get( 'http://localhost:8124/event/513', function(data) {
	console.log(data); 
});
```

```javascript
{
	"endDateTime": "2012-08-06T12:22:35.000Z",
	"startDateTime": "2012-08-06T11:49:35.000Z",
	"topics": "gymnastics,bars,uneven,ArtisticGymnastics,barFinals,MUSTAFINA Aliya,TWEDDLE Elizabeth,KOMOVA Victoria,Kexin He,YAO Jinnan,DOUGLAS Gabrielle,SEITZ Elisabeth,TSURUMI Koko"
}
```


### GET `/specEvents`

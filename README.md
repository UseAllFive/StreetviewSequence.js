StreetviewSequence.js
=====================

StreetviewSequence allows you to create Street View panorama and route-stepped image sequences.

* [Demo](http://useallfive.github.io/StreetviewSequence.js/demo.html)
* [Docs](http://useallfive.github.io/StreetviewSequence.js/parentScope.StreetviewSequence.html)

### Stationary panorama looking up
```javascript
var panorama = StreetviewSequence('#panorama', {
    duration: 1500,
    location: new google.maps.LatLng(40.720032, -73.988354),
    pitchSkewEnd: 90,
    width: 585,
    height: 325,
    loop: true
});

panorama.done(function (player) {
    player.play();
});
```

### Route
```javascript
var directionsService = new google.maps.DirectionsService();
var directionsRoute = directionsService.route({
    destination: new google.maps.LatLng(33.8974391098385,-116.6136966801696),
    origin: new google.maps.LatLng(33.9063,-116.56344000000001),
    travelMode: google.maps.TravelMode.DRIVING
}, function (DirectionsResult, DirectionsStatus) {
    var routeSequence = StreetviewSequence('#route', {
        route: DirectionsResult,
        duration: 5000,
        loop: true,
        width: 585,
        height: 325
    });

    routeSequence.done(function(player) {
        player.play();
    });
});
```

### Reporting load progress
```javascript
var panorama = StreetviewSequence('#panorama', {
    duration: 1500,
    location: new google.maps.LatLng(40.720032, -73.988354),
    pitchSkewEnd: 90,
    width: 585,
    height: 325,
    loop: true
});

panorama.progress(function (p) {
    console.log('%f% loaded', p);
});

panorama.done(function (player) {
    player.play();
});
```

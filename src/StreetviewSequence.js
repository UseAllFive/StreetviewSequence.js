/*globals $, _, Power0, google, TweenLite, __scope__, jQuery */

(function(parentScope) {
    'use strict';

    parentScope.StreetviewSequence =  function (container, options) {
        var $canvas;
        var $container;
        var canvas;
        var ctx;
        var defaults = {
            duration: 1,
            easeHeading: Power0.easeIn,
            easePitch: Power0.easeIn,
            easeRoute: Power0.easeIn,
            headingSkewStart: 0,
            height: 150,
            loop: false,
            pitchSkewStart: 0,
            sensor: false,
            totalFrames: 75,
            width: 300
        };
        var headingCache = {};
        var images;
        var imagesLoadedCount;
        var publicMethods;
        var streetViewPanoramaDfd;
        var streetViewService;
        var tween;

        function _init() {
            _.defaults(options, defaults);
            $canvas = $('<canvas />');
            $container = (container instanceof jQuery) ? container : $(container);
            $container.append($canvas);
            canvas = $canvas.get(0);
            ctx = canvas.getContext('2d');
            images = [];
            imagesLoadedCount = 0;
            streetViewPanoramaDfd = $.Deferred();
            streetViewService = new google.maps.StreetViewService();

            canvas.height = options.height;
            canvas.width = options.width;

            if ('undefined' === typeof options.headingSkewEnd) {
                options.headingSkewEnd = options.headingSkewStart;
            }

            if ('undefined' === typeof options.pitchSkewEnd) {
                options.pitchSkewEnd = options.pitchSkewStart;
            }

            tween = TweenLite.to(
                { currentTime: 0 },
                options.duration / 1000,
                {
                    currentTime: options.duration,
                    onComplete: ended,
                    onReverseComplete: ended,
                    onUpdate: draw,
                    paused: true
                }
            );

            loadImages();
        }

        function calcScalar(p, ease, start, end) {
            var delta;

            delta = end - start;

            return start + delta * ease.getRatio(p);
        }

        function draw() {
            var p = tween.progress();
            var idx = Math.round(p * (options.totalFrames - 1));
            images[idx].done(function (img) {
                ctx.drawImage(img, 0, 0);
            });
        }

        function ended() {
            if (!options.loop) {
                $canvas.trigger('ended');
                return;
            }

            if (tween.reversed()) {
                tween.restart();
            } else {
                tween.reverse();
            }
        }

        function getLng(latLng) {
            return ('function' === typeof latLng.lng) ? latLng.lng() : latLng.lng;
        }

        function getLat(latLng) {
            return ('function' === typeof latLng.lat) ? latLng.lat() : latLng.lat;
        }

        function getPanoramaData() {
            var key;

            key = options.location;
            if ('undefined' === typeof headingCache[key]) {
                headingCache[key] = getStreetHeading(options.location)
                    .then(function (heading) {
                        return {
                            location: options.location,
                            heading: heading,
                            pitch: 0
                        };
                    })
                ;
            }

            return headingCache[key];
        }

        function getRouteData(p) {
            var location;
            var locationDfd;
            var panoResponseHandler;
            var pathIndex;
            var path;

            path = options.route.routes[0].overview_path;

            locationDfd = $.Deferred();
            pathIndex = calcScalar(p, options.easeRoute, 0, path.length - 1);
            location = path[Math.round(pathIndex)];

            panoResponseHandler = function (result, status) {
                if (google.maps.StreetViewStatus.OK !== status) {
                    locationDfd.reject({
                        error: new Error('Unable to get location panorama'),
                        status: status
                    });
                    return;
                }
                locationDfd.resolve({
                    location: result.location.latLng,
                    heading: result.tiles.centerHeading,
                    pitch: result.tiles.originPitch
                });
            };

            streetViewService.getPanoramaByLocation(location, 50, panoResponseHandler);
            return locationDfd.promise();
        }

        function getStreetHeading(location) {
            var dfd = new $.Deferred();

            streetViewService.getPanoramaByLocation(location, 50, function (data, status) {
                if (google.maps.StreetViewStatus.OK !== status) {
                    dfd.reject({
                        error: new Error('StreetViewStatus is not OK'),
                        status: status
                    });
                    return;
                }

                if (0 === data.links.length) {
                    dfd.reject({
                        error: new Error('Nearby panorama not found')
                    });
                    return;
                }

                dfd.resolve(data.links[0].heading, '' === data.links[0].description);
            });

            return dfd.promise();
        }

        function getStreetViewImageURL(options) {
            var PATH = '/maps/api/streetview';
            var domain;
            var parameters = {};
            var resource;

            domain = ('undefined' !== typeof options.domain) ? options.domain : window.location.protocol + '//maps.googleapis.com';

            if ('undefined' !== typeof options.key) {
                parameters.key = options.key;
            }
            parameters.sensor = options.sensor;
            parameters.size = options.width + 'x' + options.height;
            parameters.location = getLat(options.location) + ',' + getLng(options.location);
            if ('undefined' !== typeof options.heading) {
                parameters.heading = options.heading;
            }
            if ('undefined' !== typeof options.pitch) {
                parameters.pitch = options.pitch;
            }
            if ('undefined' !== typeof options.client) {
                parameters.client = options.client;
            }

            resource = domain + PATH + '?' + $.param(parameters);

            return resource;
        }

        function imageOnLoad() {
            imagesLoadedCount += 1;
            streetViewPanoramaDfd.notify(imagesLoadedCount / options.totalFrames);
            if (imagesLoadedCount === options.totalFrames) {
                streetViewPanoramaDfd.resolve(publicMethods);
            }
        }

        function loadImages() {
            var i;
            var locationDataRetriever;
            var locationOnDataHandlerGenerator;
            var locationOnFailHandlerGenerator;
            var locationPromise;
            var p;

            locationOnDataHandlerGenerator = function (p) {
                return function (locationData) {
                    var currentLocationData = _.clone(locationData);
                    var image;

                    currentLocationData.heading += calcScalar(p, options.easeHeading, options.headingSkewStart, options.headingSkewEnd);
                    currentLocationData.pitch += calcScalar(p, options.easePitch, options.pitchSkewStart, options.pitchSkewEnd);
                    currentLocationData.sensor = options.sensor;
                    currentLocationData.key = options.key;
                    currentLocationData.height = options.height;
                    currentLocationData.width = options.width;
                    currentLocationData.client = options.client;
                    currentLocationData.domain = options.domain;

                    image = new Image();
                    image.onload = imageOnLoad;
                    image.src = getStreetViewImageURL(currentLocationData);
                    return image;
                };
            };

            locationOnFailHandlerGenerator = function () {
                return function () {
                    imageOnLoad();
                    return new Image();
                };
            };

            locationDataRetriever = ('undefined' === typeof options.route) ? getPanoramaData : getRouteData;

            for (i = 0; i < options.totalFrames; i += 1) {
                p = (i / (options.totalFrames - 1));
                locationPromise = locationDataRetriever(p)
                    .then(locationOnDataHandlerGenerator(p), locationOnFailHandlerGenerator(p))
                ;
                images.push(locationPromise);
            }
        }

        function pause() {
            tween.pause();
        }

        function play() {
            tween.resume();
        }

        _init();

        //-- Expose:
        publicMethods = {
            getStreetHeading: getStreetHeading,
            getStreetViewImageURL: getStreetViewImageURL,
            pause: pause,
            play: play
        };

        return streetViewPanoramaDfd.promise();
    };
}('undefined' !== typeof __scope__ ? __scope__ : window));

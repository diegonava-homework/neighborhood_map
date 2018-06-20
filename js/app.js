// this is the locations array used to place markers on the map as well as filter them
var locations = [{
        name: "Starbucks La Minerva",
        category: "Cafe",
        lat: 20.674496, 
        lng: -103.387030,
        address: "Av. Ignacio L. Vallarta, Vallarta, 44690 Guadalajara, Jal.",
        details: "As you may know the coffe of Starbucks is delicious, I like to drink their Frapucinos"
    },
    {
        name: "Hot Dogs y Hamburguesas",
        category: "Hot Dog",
        lat: 20.674855,   
        lng: -103.386912,
        address: "Vallarta Nte., 44690 Guadalajara, Jalisco",
        details: "This is a cheap and delicious place to eat a burguer, they have a lot of options for you, I go there twice per month"
    },
    {
        name: "Pizzas La Caneva",
        category: "Pizza",
        lat: 20.674343,  
        lng: -103.386363,
        address: "Av. Ignacio L. Vallarta 2405, Arcos Vallarta, 44130 Guadalajara, Jal.",
        details: "One of the best places in Guadalajara to eat pizza, they have a good variety of pizzas there"
    },
    {
        name: "Gasolinera Pemex",
        category: "Gasolinera",
        lat: 20.674544,  
        lng: -103.386614,
        address: "Av. Ignacio L. Vallarta 2605, Arcos Vallarta, 44130 Guadalajara, Jal.",
        details: "This is the gas station that I recharge fuel almost every time that I need"
    },
    {
        name: "Dulceria Strawberry",
        category: "Dulceria",  
        lat: 20.673837,
        lng: -103.387029,
        address: "Av. Arcos #31 int. 5, Arcos Vallarta, 44130 Guadalajara, Jal.",
        details: "It's a home based business, they have delicious things, I go there once a month"
    },
];

// generateWindowContent function used to create each individual locations infoWindow based on the locations array above
function generateWindowContent(location) {
    return ('<div class="info_content">' +
        '<h2>' + location.name + '</h2>' +
        '<h3>' + location.address + '</h3>' +
        '<p>' + location.details + '</p>' +
        '</div>'
    );
}

// declare map globally
var map;

// declare isMapLoaded varaible globally that's used to determine whether the map has finished loading or not
var isMapLoaded = false;

// makeHandler function that sets each markers infoWindow and Animation based on whether map is loaded or not
function makeHandler(marker, i) {
    return function() {
        if (!isMapLoaded) {
            return;
        }
        infoWindow.setContent(generateWindowContent(locations[i]));
        infoWindow.open(map, marker);
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function() {
            marker.setAnimation(null);
        }, 1000);
        viewModel.loadData(locations[i]);

    };
}

// initialize map function
function initMap() {
    var bounds = new google.maps.LatLngBounds();
    var mapOptions = {
        mapTypeId: 'roadmap',
        zoom: 90
    };

    // Display a map on the page
    map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);
    map.setTilt(45);

    setMarkers(locations);

    function setMarkers() {
        // Loop through array of locations & place each one on the map
        for (i = 0; i < locations.length; i++) {
            var location = locations[i];
            var position = new google.maps.LatLng(location.lat, location.lng);
            bounds.extend(position);
            var marker = new google.maps.Marker({
                position: position,
                map: map,
                animation: google.maps.Animation.DROP,
                icon: './images/map-marker.png', 
                title: location.name,
                id: i
            });

            location.marker = marker;

            map.fitBounds(bounds);

            google.maps.event.addListener(marker, 'click', makeHandler(marker, i));

        }

        infoWindow = new google.maps.InfoWindow();

        // Override map zoom level once fitBounds function runs
        var boundsListener = google.maps.event.addListener((map), 'bounds_changed', function(event) {
            this.setZoom(90);
            google.maps.event.removeListener(boundsListener);
        });

    }

    // isMapLoaded variable declared true after google maps has been loaded
    isMapLoaded = true;

}

var ViewModel = function() {
    var self = this;

    self.locations = ko.observableArray(locations);
    self.query = ko.observable('');
    self.wikiLinks = ko.observableArray([]);
    self.visibleLists = ko.observable(false);

    // toggleShow triggered when the hamburger icon is clicked to hide/show the location results
    self.toggleShow = function() {
        self.visibleLists(!self.visibleLists());
    };

    /* this function, searchResults, is what allows the locations
     * to filter as the name is typed in the search box.
     */
    self.searchResults = ko.computed(function() {
        var q = self.query().toLowerCase();

        var filteredLocations = self.locations().filter(function(location) {
            return location.name.toLowerCase().indexOf(q) >= 0;
        });

        /* Once google maps has finished loading loop through the locations array
         * and set each marker's visibility to false, then loop through the filteredLocations
         * and set each marker's visibility to true if it meets the specifications of filteredLocations
         */
        if (isMapLoaded) {
            for (var i = 0; i < locations.length; i++) {
                locations[i].marker.setVisible(false);
            }
            for (i = 0; i < filteredLocations.length; i++) {
                filteredLocations[i].marker.setVisible(true);
            }
        }

        return filteredLocations;

    });

    //Clicking a location on the list displays unique information about the location, and animates its associated map marker
    self.clickAbility = function(location) {
        if (!isMapLoaded) {
            return;
        }
        infoWindow.setContent(generateWindowContent(location));
        infoWindow.open(map, location.marker);
        location.marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function() {
            location.marker.setAnimation(null);
        }, 1000);
        self.loadData(location);
    };

    self.loadData = function(location) {
        console.log(self.wikiLinks.length);

        // clear out old data before new request
        self.wikiLinks([]);

        var wikiUrl = 'http://en.wikipedia.org/w/api.php?action=opensearch&search=' + location.category +
            '&format=json&callback=wikiCallback';

        // if the wikipedia links fail to load after 8 seconds the user will get the message 'failed to get wikipedia resources'.
        var wikiRequestTimeout = setTimeout(function() {
            self.wikiLinks.push("failed to get wikipedia resources");
        }, 8000);

        $.ajax({
            url: wikiUrl,
            dataType: "jsonp",
            success: function(response) {
                self.wikiLinks([]);
                var articleList = response[1];
                for (var i = 0; i < articleList.length; i++) {
                    articleStr = articleList[i];
                    var url = 'http://en.wikipedia.org/wiki/' + articleStr;
                    self.wikiLinks.push('<a href="' + url + '">' + articleStr + '</a>');
                }
                clearTimeout(wikiRequestTimeout);
            }
        });
        return false;
    };
};

var viewModel = new ViewModel();
ko.applyBindings(viewModel);

// If Google Maps cannot load, display this alert
function mapError() {
    alert("Google Maps failed. Check the internet connection and try again");
}

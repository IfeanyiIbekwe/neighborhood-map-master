// Global variables
var map;
var infoWindow;
var bounds;



/*--Initialize map with default location (Victoria Island Lagos)
https://developers.google.com/maps/documentation/javascript/tutorial */

function initMap() {


    map = new google.maps.Map(document.getElementById('map'), { //Creates new map object as per Google API documentation 
            center: {
                lat: 6.4281,
                lng: 3.4219
            },
            zoom: 16



        }),




        infoWindow = new google.maps.InfoWindow();
    bounds = new google.maps.LatLngBounds();


    ko.applyBindings(new ViewModel());

}
/* Location Model 
Holds all the data for creating locations including markers, foursquare API URL, & data
*/

var LocationMarker = function(data) {
    var self = this;

    this.title = data.title;
    this.position = data.location;
    this.street = '',
        this.city = '',


        this.visible = ko.observable(true); //set markers to visible by default using a ko observable variable set to true (when this is false, markers are hidden)


    //Foursquare Client Id & Secret
    var clientID = 'P5GXS5LAXJCY2JEGMZIYYJ3IKAILWU2XM5EVXXHQQEQLQKPP';
    var clientSecret = 'ZRTVOGAI4UTSEUDBFOYAZ01PHJLQGFSWX3AHUMFAGUNYDMYR';

    // get JSON request of foursquare data
    //Userless Authentication: https://developer.foursquare.com/docs/api/configuration/authentication
    var reqURL = 'https://api.foursquare.com/v2/venues/search?ll=' + this.position.lat + ',' + this.position.lng + '&client_id=' + clientID + '&client_secret=' + clientSecret + '&v=20180606' + '&query=' + this.title;

    $.getJSON(reqURL).done(function(data) {
        var results = data.response.venues[0];
        self.street = results.location.formattedAddress[0] ? results.location.formattedAddress[0] : 'N/A';
        self.city = results.location.formattedAddress[1] ? results.location.formattedAddress[1] : 'N/A';
    }).fail(function() {
        alert('Something went wrong with foursquare');
    });
    /* Create a marker function ( creates a marker for each location)
    https://developers.google.com/maps/documentation/javascript/markers */

    this.marker = new google.maps.Marker({
        position: this.position,
        title: this.title,
        animation: google.maps.Animation.DROP,

    });

    self.filterMarkers = ko.computed(function() {


        // set marker and extend bounds (showListings)
        if (self.visible() === true) {

            self.marker.setMap(map);
            bounds.extend(self.marker.position);
        } else {
            self.marker.setMap(null);
        }
    });

    // Create an onclick even to open an indowindow at each marker
    this.marker.addListener('click', function() {
        populateInfoWindow(this, self.street, self.city, infoWindow);
        toggleBounce(this);
        map.panTo(this.getPosition());
    });


    // show item info when selected from list
    this.show = function(location) {
        google.maps.event.trigger(self.marker, 'click');
    };

    // creates bounce effect when item selected
    this.bounce = function(place) {
        google.maps.event.trigger(self.marker, 'click');
    };




}


/* View Model */
var ViewModel = function() {
    var self = this;

    this.searchMap = ko.observable(''); //observable array tied to search field in the html , as this value changes, the value in the list is changes too

    this.mapListItems = ko.observableArray([]); // creates an obserable array

    // add location markers for each location
    locations.forEach(function(location) {
        self.mapListItems.push(new LocationMarker(location)); // pushes a new instance of the locationmarker function 
    });

    /* Search functionality using ko computed function
    https://stackoverflow.com/questions/32343306/live-table-search-in-knockout-calling-function-on-keyup */

    this.locationList = ko.computed(function() {
        var searchFilter = self.searchMap().toLowerCase(); //-- Ensure text in the search field is converted to lower case
        if (searchFilter) {
            return ko.utils.arrayFilter(self.mapListItems(), function(location) {
                return location.title.toLowerCase().indexOf(searchFilter) !== -1;

            });
        }
        self.mapListItems().forEach(function(location) {
            location.visible(true);
        });
        return self.mapListItems();
    }, self);

};
/* Create info window and populate with marker details for each location
Use StreetViewService to get closest street view image */

function populateInfoWindow(marker, street, city, infowindow) {
    // Check to make sure the infowindow is not already opened on this marker.
    if (infowindow.marker != marker) {
        // Clear the infowindow content to give the streetview time to load.
        infowindow.setContent('');
        infowindow.marker = marker;

        // Make sure the marker property is cleared if the infowindow is closed.
        infowindow.addListener('closeclick', function() {
            infowindow.marker = null;
        });
        var streetViewService = new google.maps.StreetViewService();
        var radius = 60;

        var windowContent = '<h4>' + marker.title + '</h4>' +
            '<p>' + street + "<br>" + city + '<br>' + "</p>";


        /* Use Google API to get the closest street image
        //https://developers.google.com/maps/documentation/javascript/examples/streetview-service
        //https://community.esri.com/thread/172167 */
        var getStreetView = function(data, status) {
            if (status === 'OK') {
                var panViewLocation = data.location.latLng;
                var heading = google.maps.geometry.spherical.computeHeading(
                    panViewLocation, marker.position);
                infowindow.setContent(windowContent + '<div id="pano"></div>'); //create a div for the pano and place the street view image in it
                var panoramaOptions = { //object to hold details of the panaroma
                    position: panViewLocation,
                    pov: {
                        heading: heading,
                        pitch: 5,
                        zoom: 2
                    }
                };
                var panorama = new google.maps.StreetViewPanorama(
                    document.getElementById('pano'), panoramaOptions); //insert pano details in the pano div, get DOM element and tie to panorama
            } else {
                infowindow.setContent(windowContent + '<div style="color: red">Street View data not found for this location.</div>');
            }
        };

        streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
        infowindow.open(map, marker);
    }
}
/* Make marker bounce
https://developers.google.com/maps/documentation/javascript/markers#complex_icons
 

*/
function toggleBounce(marker) {
    if (marker.getAnimation() !== null) {
        marker.setAnimation(null);
    } else {
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function() {
            marker.setAnimation(null);
        }, 1400);
    }
}
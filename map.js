(function($){

    "use strict";

    let map;
    let markers = [];
    let infowindow;
    let carousel;
    let allOffices;

    let userLocation;

    let defaultLat = '34.0522';
    let defaultLng = '-118.2437';

    let input = document.getElementById('zipcode');

    $(document).ready(function() {
        carousel = $('.carousel').carousel({
            interval: false
        });

        // Map initialization
        initMap();


        // New address submitting 
        $('#new-zip').click(function(event) {
            event.preventDefault();

            // Get coordinates from address
            getZipCoordinates( $( '#zipcode' ).val(), function( position ){

                // set map center
                map.setCenter(new google.maps.LatLng( position.lat, position.lng ) );

                // get offices around 20 miles
                getOffices( position.lat, position.lng, function( offices ){
                    allOffices = offices
                    
                    // render offiles list
                    renderOffices( offices );

                    // add offices on the map
                    showOfficesOnMap( map, offices );
                });


            } )
        });

        // Set cookie and swap buttons
        $( document ).on('click', '.find-a-dentist .content .office .office-content a.select-dentist', function(event) {
            event.preventDefault();

            var officeId = $(this).closest('.office').data('number');
            var officeAPINumber = $(this).closest('.office').data('office-number');

            // Show all "select" buttons
            $('.find-a-dentist .content .office .office-content a.select-dentist').show();

            // hide buttons for current office
            $(this).hide();

            // hide all Appointment buttons
            $('.find-a-dentist .content .office .office-content a.make-appointment').hide();

            // show current Appointment buttons
            $(this).next().css('display', 'inline-block');

            setCookie( 'officeNumber', officeAPINumber, 365 );

        });

        // Set cookie and swap buttons
        $( document ).on('click', '.gm-style-iw a.select-dentist', function(event) {
            event.preventDefault();

            var officeAPINumber = $(this).closest('.office-box').data('office-number');

            $('.gm-style-iw a.select-dentist').show();
            $(this).hide();

            $('.gm-style-iw a.make-appointment').hide();
            $(this).next().css('display', 'inline-block');

            setCookie( 'officeNumber', officeAPINumber, 365 );

        });
    });


    //====================================
    //              MAP
    //====================================
    function initMap() {
        map = new google.maps.Map(document.getElementById('map'), {
          center: {lat: parseFloat(defaultLat), lng: parseFloat(defaultLng) },
          zoom: 11,
          disableDefaultUI: true,
          //gestureHandling: 'greedy'
        });

        // Detect location
        let urlParams = new URLSearchParams(window.location.search);
        if ( urlParams.get('place') !== null ) {
            
            // Get coordinates from address
            getZipCoordinates( urlParams.get('place'), function( position ){

                // set map center
                map.setCenter( new google.maps.LatLng( position.lat, position.lng ) );

                // get offices around 20 miles
                getOffices( position.lat, position.lng, function( offices ){
                    allOffices = offices
                    
                    // render offiles list
                    renderOffices( offices );

                    // add offices on the map
                    showOfficesOnMap( map, offices );
                });

            } )

        } else {

            // get user location
            getUserIP( function( IP ){
                let lat = defaultLat
                let lng = defaultLng

                if ( typeof IP === "object" ) {
                    lat = IP.location.latitude
                    lng = IP.location.longitude 
                }
                
                // set map center
                map.setCenter( new google.maps.LatLng( lat, lng ) );

                // get offices around 20 miles
                getOffices( lat, lng, function( offices ){
                    allOffices = offices

                    // render offiles list
                    renderOffices( offices );

                    // add offices on the map
                    showOfficesOnMap( map, offices );
                });
            });

        }

        // Autocomplete initialization
        autocompleteInit();

        // close any infowindow after click to map
        google.maps.event.addListener(map, 'click', function() {
            infowindow.close();
        });

    }

    /**
    *   Autocomplete function
    */
    function autocompleteInit(){
        let autocomplete = new google.maps.places.Autocomplete(input);
        autocomplete.bindTo('bounds', map);

        // Necessary fields
        autocomplete.setFields(
            ['address_components', 'geometry' ]);

        autocomplete.addListener('place_changed', function() {

            let place = autocomplete.getPlace();

            // Get place coordinates
            let position = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
            }

            // Set map center
            map.setCenter(new google.maps.LatLng( position.lat, position.lng ) );

            // get offices around 20 miles
            getOffices( position.lat, position.lng, function( offices ){
                allOffices = offices

                // Render offices content
                renderOffices( offices );

                // Show offices on the map
                showOfficesOnMap( map, offices );
            });

        });
    }


    /**
    *   Get coordinates from zip/address
    */
    function getZipCoordinates( zip, callback ){
        let lat = '';
        let lng = '';
        let address = zip;

        let geocoder = new google.maps.Geocoder();
        geocoder.geocode( { 'address': address}, function(results, status) {

            if ( status == google.maps.GeocoderStatus.OK ) {
                let position = {
                    lat: results[0].geometry.location.lat(),
                    lng: results[0].geometry.location.lng()
                }

                return callback( position );
          } else {
            console.log("Geocode was not successful for the following reason: " + status);
          }

        });
    }


    /**
    *   Render offices markers on the map
    */ 
    function showOfficesOnMap( map, offices ){
        
        // Delete current markers
        deleteMarkers();

        // Add new markers
        for ( let office in offices ) {
            let location = { lat: parseFloat(offices[office].Latitude), lng: parseFloat(offices[office].Longitude) };
            addMarker( (parseInt(office) + 1) + '', offices[office], location, map );
        }
    }


    /**
    *   Add office marker
    */
    function addMarker( label, office, location, map ) {

        // Marker image
        let image = {
            url: '/wp-content/themes/bb-theme-child/classes/bb-modules/find-a-dentist/images/map-marker.png',
            labelOrigin: new google.maps.Point( 17, 18 )
        };

        // Infowindow content
        let contentString = '<div class="office-box" data-office-id="'+label+'" data-office-number="' + office.OfficeNumber + '">';
        contentString += '<h3>' + office.Name + '</h3>';
        contentString += '<p class="address">' + office.AddressLine1 + ', ' + office.AddressLine2 + '<br>'+ office.City + ', ' + office.State + ' ' + office.ZipCode + '<br>' + office.PrimaryPhoneNumber + '</p>';
        contentString += '<a class="select-dentist" href="#">Select Dentist</a>';
        contentString += '<a class="make-appointment" href="http://' + office.PrimaryDomainName + '/contact/dentist-appointment.html?sc_cid=sg_search_result" target="_blank">Make an Appointment</a>';
        contentString += '</div>';

        // New infowindow object
        infowindow = new google.maps.InfoWindow({
          content: contentString
        });

        // New marker object
        let marker = new google.maps.Marker({
            position: location,
            label: {
                text: label,
                color: "#39757f",
                fontSize: "13px",
                fontWeight: "bold"
              },
            map: map,
            icon: image
        });

        // Add "click" listener to marker
        marker.addListener('click', function() {

            // Show infowindow
            infowindow.setContent(contentString);
            infowindow.open(map, marker);

            // Move current office to top of the list
            moveOfficeToTop( ( marker.label.text - 1 ) );

            // Infowindow customization
            google.maps.event.addListener(infowindow, 'domready', function() {

                // Reference to the DIV that wraps the bottom of infowindow
                var iwOuter = $('.gm-style-iw');

                var iwBackground = iwOuter.prev();

                // Removes background shadow DIV
                iwBackground.children(':nth-child(2)').css({'display' : 'none'});

                // Removes white background DIV
                iwBackground.children(':nth-child(4)').css({'display' : 'none'});

                // Moves the infowindow 115px to the right.
                iwOuter.css({bottom: '0px', left: '0px'});

                // Reference to the div that groups the close button elements.
                var iwCloseBtn = iwOuter.next();

                // Apply the desired effect to the close button
                iwCloseBtn.css({opacity: '0'});
            });

        })

        // Push marker to global array with markers
        markers.push(marker);

    }

    // Sets the map on all markers in the array.
    function setMapOnAll( map ) {
        for ( var i = 0; i < markers.length; i++ ) {
            markers[i].setMap(map);
        }
    }

    // Removes the markers from the map, but keeps them in the array.
    function clearMarkers() {
        setMapOnAll(null);
    }

    // Deletes all markers in the array by removing references to them.
    function deleteMarkers() {
        clearMarkers();
        markers = [];
    }


    //====================================
    //         Offices API
    //====================================
    /**
    *   Get offices around 20 miles of location
    */
    function getOffices( lat = defaultLat, lon = defaultLng, callback ){

        let offices = '';
        let position = ( parseFloat(lat).toFixed(4) + '') + ( parseFloat(lon).toFixed(4) + '');

        $.getJSON('https://sp10050fd5.guided.ss-omtrdc.net/?dist=20&loc=%2B'+position, function( json_data ){


            //console.log(json_data);
            //console.log( json_data.resultsets["0"].results );
            return callback( json_data.resultsets["0"].results );
        });

    }


    /**
    *   Render offices list
    */
    function renderOffices( offices = '', firsrOffice = null ){
        let response = offices;
        let totalItems = response.length;

        // Bullets
        let html = '<li data-target="#officesCarousel" data-slide-to="0" class="active"></li>';
        for ( let i = 1; i <= totalItems; i++ ) {

            if( i%5 == 0 ){
                html += '<li data-target="#officesCarousel" data-slide-to="'+ (i/5) +'"></li>';
            }
        }
        $('#officesCarousel .carousel-indicators').html( html );

        // Slides
        html = '<div class="item active">';

        let i = 0;
        let firstShowed = false;
        let firstSkipped = false;

        for ( let office in response ) {

            if ( firsrOffice != null && i == 0 && !firstShowed ) {
                if ( response.hasOwnProperty(firsrOffice) ) {

                    html += '<div class="office featured" data-number="' + (parseInt(firsrOffice) + 1) + '" data-office-number="' + response[firsrOffice].OfficeNumber + '">';
                    html += '<div class="office-number">' + ( parseInt(firsrOffice) + 1 ) + '.</div>';
                    html += '<div class="office-content">';
                    html += '<div class="col-1">';
                    html += '<h3>' + response[firsrOffice].Name + '</h3>';
                    html += '<p class="address">' + response[firsrOffice].AddressLine1 + ', ' + response[firsrOffice].AddressLine2 + '<br>'+ response[firsrOffice].City + ', ' + response[firsrOffice].State + ' ' + response[firsrOffice].ZipCode + '<br>' + response[firsrOffice].PrimaryPhoneNumber + '</p>';
                    html += '</div>';
                    html += '<div class="col-2">';
                    html += '<p class="reviews">' + response[firsrOffice].ReviewNumber + ' reviews</p>'
                    html += '<a class="select-dentist" href="#">Select Dentist</a>';
                    html += '<a class="make-appointment" href="http://' + response[office].PrimaryDomainName + '/contact/dentist-appointment.html?sc_cid=sg_search_result" target="_blank">Make an Appointment</a>';
                    html += '</div>';
                    html += '</div>';
                    html += '</div>';

                }

                //if ( firsrOffice > 4) {
                    i++;
                //}

                firstShowed = true;
            }
    
            if ( response.hasOwnProperty(office) && office != firsrOffice  ) {
                let domain = 'http://' + response[office].PrimaryDomainName + '/contact/dentist-appointment.html?sc_cid=sg_search_result';

                html += '<div class="office" data-number="' + (parseInt(office) + 1) + '" data-office-number="' + response[office].OfficeNumber + '">';
                html += '<div class="office-number">' + ( parseInt(office) + 1 ) + '.</div>';
                html += '<div class="office-content">';
                html += '<div class="col-1">';
                html += '<h3>' + response[office].Name + '</h3>';
                html += '<p class="address">' + response[office].AddressLine1 + ', ' + response[office].AddressLine2 + '<br>'+ response[office].City + ', ' + response[office].State + ' ' + response[office].ZipCode + '<br>' + response[office].PrimaryPhoneNumber + '</p>';
                html += '</div>';
                html += '<div class="col-2">';
                html += '<p class="reviews">' + response[office].ReviewNumber + ' reviews</p>'
                html += '<a class="select-dentist" href="#">Select Dentist</a>';
                html += '<a class="make-appointment" href="' + domain + '" target="_blank">Make an Appointment</a>';
                html += '</div>';
                html += '</div>';
                html += '</div>';

                if ( (i+1)%5 == 0 ) {
                    html += '</div>';
                    html += '<div class="item">';
                };

                i++;
            }

        }

        html += '</div>';

        $('#officesCarousel .carousel-inner').html( html );
    }


    /**
    *   Move active affice to tio of the list
    */
    function moveOfficeToTop( firsrOfficeId ){

        renderOffices( allOffices, firsrOfficeId );

        carousel = $('.carousel').carousel({
            interval: false
        });

    }


    /**
    *   Get user location using IP address
    */
    function getUserIP( callback ){

        $.getJSON("https://api.ipify.org?format=jsonp&callback=?",
            function(json) {
                $.getJSON("https://geoip.nekudo.com/api/" + json.ip,
                    function(location) {
                        return callback(location);
                    }
                )
            }
        );
    }


    function setCookie( name, value, days ){
        let expires;
        if (days) {
            let date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toGMTString();
        }
        else {
            expires = "";
        }
 
        document.cookie = name + "=" + value + expires + ";path=/;domain=" + getDomainName( window.location.hostname );
    }


    function getDomainName(hostName){

       return '.' + hostName.substring(hostName.lastIndexOf(".", hostName.lastIndexOf(".") - 1) + 1);
       
    }


})(jQuery);
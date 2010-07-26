/*
	anythingSlider v1.3.2
	
	By Chris Coyier: http://css-tricks.com
	with major improvements by Doug Neiner: http://pixelgraphics.us/
	based on work by Remy Sharp: http://jqueryfordesigners.com/


	To use the navigationFormatter function, you must have a function that
	accepts two paramaters, and returns a string of HTML text.
	
	index = integer index (1 based);
	panel = jQuery wrapped LI item this tab references
	@return = Must return a string of HTML/Text
	
	navigationFormatter: function(index, panel){
		return index + " Panel"; // This would have each tab with the text 'X Panel' where X = index
	}
*/

(function($) {
	
	__anythingSliderRunTimes = 0; 
	
	$.anythingSlider = function(el, options) {
		
		// To avoid scope issues, use 'base' instead of 'this'
		// to reference this class from internal events and functions.
		var base = this;
	  
    	// Keeps track of the index of the current instance
		__anythingSliderRunTimes++;
		base.runTimes = __anythingSliderRunTimes;
			
		// Wraps the ul in the necessary divs and then gives Access to jQuery element
		base.$el = $(el).wrap('<div class="anythingSlider"><div class="anythingWindow" /></div>').closest('div.anythingSlider');
		
		// Set up a few defaults
		base.currentPage = 1;
		base.timer = null;
		base.playing = false;
	
		// Add a reverse reference to the DOM object
		base.$el.data("AnythingSlider", base);
		  
		base.init = function() {
		 			
			base.options = $.extend({},$.anythingSlider.defaults, options);
				
			// Cache existing DOM elements for later 
			base.$wrapper = base.$el.find('> div');
			base.$slider  = base.$wrapper.find('> ul');
			base.$items   = base.$slider.find('> li');
			base.$single  = base.$items.filter(':first');
			
			// Set the dimensions
			if (base.options.width) {
				base.$el.css('width', base.options.width);
				base.$wrapper.css('width', base.options.width);
				base.$items.css('width', base.options.width);
			}
			if (base.options.height) {
				base.$el.css('height', base.options.height);
				base.$wrapper.css('height', base.options.height);
				base.$items.css('height', base.options.height);
			}
	
			// Get the details
			base.singleWidth = base.$single.outerWidth();
			base.pages = base.$items.length;
	
			// Remove navigation & player if there is only one page
			if (base.pages === 1) {
				base.options.autoPlay = false;
				base.options.buildNavigation = false;
			}
	
			// Build the navigation if needed
			if (base.options.buildNavigation) base.buildNavigation();
		
			// Top and tail the list with 'visible' number of items, top has the last section, and tail has the first
			// This supports the "infinite" scrolling
			// Ensures any cloned elements with ID's have unique ID's
			var $itemClone = base.$items.filter(':last').clone().addClass('cloned');
			if ($itemClone.attr("id") != "") {
			  base.$items.filter(':first').before($itemClone.attr('id', ($itemClone.attr('id') + "-cloned")));
			} else {
			  base.$items.filter(':first').before($itemClone);
			}
	
			$itemClone = base.$items.filter(':first').clone().addClass('cloned');
			if ($itemClone.attr("id") != '') {
			  base.$items.filter(':last' ).after($itemClone.attr('id', ($itemClone.attr('id') + "-cloned")));
			} else {
			  base.$items.filter(':last' ).after($itemClone);
			}
	
			// We just added two items, time to re-cache the list
			base.$items = base.$slider.find('> li'); // reselect
				
			// Setup our forward/backward navigation - if more than one page exists
			if (base.pages > 1) {
			  base.buildNextBackButtons();
			}
			
			// If autoPlay functionality is included, then initialize the settings
			if (base.options.autoPlay) {
				base.playing = !base.options.startStopped; // Sets the playing variable to false if startStopped is true
				base.buildAutoPlay();
			};
			
			// If pauseOnHover then add hover effects
			if (base.options.pauseOnHover) {
				base.$el.hover(function() {
					base.clearTimer();
				}, function() {
					base.startStop(base.playing);
				});
			}
			
			// If a hash can not be used to trigger the plugin, then go to page 1
			if ((base.options.hashTags == true && !base.gotoHash()) || base.options.hashTags == false) {
				base.setCurrentPage(1);
			};
		}
	
		base.gotoPage = function(page, autoplay) {
			// When autoplay isn't passed, we stop the timer
			if (autoplay !== true) autoplay = false;
			if (!autoplay) base.startStop(false);
			
			if (typeof(page) == "undefined" || page == null) {
				page = 1;
				base.setCurrentPage(1);
			};
			
			// Stop the slider when we reach the last page, if the option stopAtEnd is set to true
			if(base.options.stopAtEnd){
				if(page == base.pages) base.startStop(false);
			}
			
			// Just check for bounds
			if (page > base.pages + 1) page = base.pages;
			if (page < 0 ) page = 1;
	
			var dir = page < base.currentPage ? -1 : 1,
				n = Math.abs(base.currentPage - page),
				left = base.singleWidth * dir * n;
			
			base.$wrapper.filter(':not(:animated)').animate({
				scrollLeft : '+=' + left
			}, base.options.animationTime, base.options.easing, function () {
				if (page == 0) {
					base.$wrapper.scrollLeft(base.singleWidth * base.pages);
					page = base.pages;
				} else if (page > base.pages) {
					base.$wrapper.scrollLeft(base.singleWidth);
					// reset back to start position
					page = 1;
				}
	  
				base.setCurrentPage(page);
			});
		};
			
		base.setCurrentPage = function(page, move) {
			// Set visual
			if (base.options.buildNavigation){
				base.$nav.find('.cur').removeClass('cur');
				$(base.$navLinks[page - 1]).addClass('cur');
			};
			
			// Only change left if move does not equal false
			if (move !== false) base.$wrapper.scrollLeft(base.singleWidth * page);
	
			// Update local variable
			base.currentPage = page;
		};
		
		base.goForward = function(autoplay) {
			if(autoplay !== true) autoplay = false;
			base.gotoPage(base.currentPage + 1, autoplay);
		};
		
		base.goBack = function() {
			base.gotoPage(base.currentPage - 1);
		};
			
		// This method tries to find a hash that matches panel-X
		// If found, it tries to find a matching item
		// If that is found as well, then that item starts visible
		base.gotoHash = function(){
			var hash = window.location.hash.match(/^#?panel(\d+)-(\d+)$/);
			if (hash) {
				var panel = parseInt(hash[1]);
				if (panel == base.runTimes) {
					var slide = parseInt(hash[2]);
					var $item = base.$items.filter(':eq(' + slide + ')');
					if ($item.length != 0) {
						base.setCurrentPage(slide);
						return true;
					}
				}
			}
			return false; // A item wasn't found;
		};
			
		// Creates the numbered navigation links
		base.buildNavigation = function() {
			base.$nav = $('<ul class="thumbNav" />').appendTo(base.$el);
			
			if (base.options.buildNavigation && (base.pages > 1)) {
				base.$items.each(function(i,el) {
					var index = i + 1;
					var $a = $("<a href='#'></a>");
					
					// If a formatter function is present, use it
					if (typeof(base.options.navigationFormatter) == "function") {
						$a.html(base.options.navigationFormatter(index, $(this)));
					} else {
						$a.text(index);
					}
					
					$a.click(function(e) {
						base.gotoPage(index);
						if (base.options.hashTags) base.setHash('panel' + base.runTimes + '-' + index);
						e.preventDefault();
					});
					
					$(base.$nav).append($a);
					$a.wrap("<li />");
				});
				base.$navLinks = base.$nav.find('li > a');
				
			}
		};
		
		// Creates the Forward/Backward buttons
		base.buildNextBackButtons = function() {
			var $forward = $('<span class="arrow forward"><a href="#">' + base.options.forwardText + '</a></span>'),
				$back    = $('<span class="arrow back"><a href="#">' + base.options.backText + '</a></span>');
					
			// Bind to the forward and back buttons
			$back.click(function(e) {
				base.goBack();
				e.preventDefault();
			});
			$forward.click(function(e) {
				base.goForward();
				e.preventDefault();
			});
	
			// Append elements to page
			$(base.$el).prepend($forward).prepend($back);
		};
		
		// Creates the Start/Stop button
		base.buildAutoPlay = function(){

			base.$startStop = $("<a href='#' class='start-stop'></a>").html(base.playing ? base.options.stopText :  base.options.startText);
			base.$el.append(base.$startStop);            
			base.$startStop.click(function(e) {
				base.startStop(!base.playing);
				e.preventDefault();
			});

			// Use the same setting, but trigger the start;
			base.startStop(base.playing);
		};
		
		// Handles stopping and playing the slideshow
		// Pass startStop(false) to stop and startStop(true) to play
		base.startStop = function(playing) {
			if (playing !== true) playing = false; // Default if not supplied is false
			
			// Update variable
			base.playing = playing;
			
			// Toggle playing and text
			if (base.options.autoPlay) base.$startStop.toggleClass("playing", playing).html( playing ? base.options.stopText : base.options.startText );
			
			if (playing){
				base.clearTimer(); // Just in case this was triggered twice in a row
				base.timer = window.setInterval(function() {
					base.goForward(true);
				}, base.options.delay);
			} else {
				base.clearTimer();
			};
		};
		
		base.clearTimer = function(){
			// Clear the timer only if it is set
			if(base.timer) window.clearInterval(base.timer);
		};
		
		// Taken from AJAXY jquery.history Plugin
		base.setHash = function (hash) {
			// Write hash
			if ( typeof window.location.hash !== 'undefined' ) {
				if ( window.location.hash !== hash ) {
					window.location.hash = hash;
				};
			} else if ( location.hash !== hash ) {
				location.hash = hash;
			};
			
			// Done
			return hash;
		};
		// <-- End AJAXY code

		// Trigger the initialization
		base.init();
	};

	$.anythingSlider.defaults = {
		easing: "swing",                // Anything other than "linear" or "swing" requires the easing plugin
		autoPlay: true,                 // This turns off the entire FUNCTIONALY, not just if it starts running or not
		startStopped: false,            // If autoPlay is on, this can force it to start stopped
		delay: 3000,                    // How long between slide transitions in AutoPlay mode
		animationTime: 600,             // How long the slide transition takes
		hashTags: true,                 // Should links change the hashtag in the URL?
		buildNavigation: true,          // If true, builds and list of anchor links to link to each slide
		pauseOnHover: true,             // If true, and autoPlay is enabled, the show will pause on hover
		startText: "Start",             // Start text
		stopText: "Stop",               // Stop text
		navigationFormatter: null,      // Details at the top of the file on this use (advanced use)
		forwardText: "&raquo;",			// Link text used to move the slider forward
		backText: "&laquo;",			// Link text used to move the slider back
		width: null,					// Override the default CSS width
		height: null,					// Override the default CSS height
	};
	
	$.fn.anythingSlider = function(options) {
	  
		if (typeof(options) == "object"){
			return this.each(function(i){			
				(new $.anythingSlider(this, options));
			});	
		
		} else if (typeof(options) == "number") {

			return this.each(function(i) {
				var anySlide = $(this).data('AnythingSlider');
				if (anySlide) {
					anySlide.gotoPage(options);
				}
			});
			
		}
		
  };
	
})(jQuery);
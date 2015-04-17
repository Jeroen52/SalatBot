// Create SalatBot User Interface
function createSalatBotUI(settingsHTML, eventHTML, inputValues, inputChangeCallback)
{
	"use strict";

	var SalatBotUI = {};

	// Setup variables
	var settingsBox = null;
	var eventBox = null;

	// Setup user interface
	function setupUserInterface(settingsHTML, eventHTML)
	{
		// Parse html files
		settingsBox = $.parseHTML(settingsHTML)[0];
		eventBox = $.parseHTML(eventHTML)[0];

		// Fold menus by default
		$(settingsBox).find('.chat-menu-container').addClass('folded');
		$(settingsBox).find('.chat-menu-content2').css({'display': 'none'});
	};

	// Setup input values
	function setInputValues(values)
	{
		for (var id in values)
		{
			var input = $(settingsBox).children('.chat-menu-content').find('#'+ id)[0];
			if (input.tagName == 'INPUT' && input.type == 'checkbox')
			{
				input.checked = values[id];
			}
			else
			{
				input.value = values[id];
			}
		}
	}

	// Setup functionality
	function setupFunctionality(changeCallback)
	{
		// Enable / Disable
		$(settingsBox).find('#SBEnableCheck').change(function() {
			if (this.checked) 	{ SalatBot.start();	}
			else				{ SalatBot.stop();	}
		});

		// Setup input change callback
		$(settingsBox).children('.chat-menu-content').find('input,textarea').change(changeCallback);

		// Slide menus on header click
		$(settingsBox).find('.list-header2').click(function(evt) {
			// Get menu container
			var container = $(this).parent();
			
			// Fold or unfold
			if (container.hasClass('folded'))
			{
				// Unfold
				container.children('.chat-menu-content2').stop().slideDown('fast');
				container.removeClass('folded');
			}
			else
			{
				// Fold
				container.children('.chat-menu-content2').stop().slideUp('fast');
				container.addClass('folded');
			}
		});

		// Viewer events
		$(settingsBox).find('#SBEventStartButton').click(function() {
			if (SalatBot.viewerEvent.isActive())
			{
				// Stop poll
				if (SalatBot.viewerEvent.stop())
				{
					// Set button value
					this.innerHTML = 'Start Event';
					this.disabled = true;
				}
			}
			else
			{
				var command = $(settingsBox).find('#SBEventCommandInput').val();
				if (SalatBot.viewerEvent.start(command))
				{
					// Set button value
					this.innerHTML = 'Stop Event';
				}
			}
		});

		$(eventBox).find('#SBEventCloseLink').click(function() {
			hideEventBox();
			SalatBot.viewerEvent.reset();
			$(settingsBox).find('#SBEventStartButton').attr('disabled', false);
		});

		$(eventBox).find('#SBRandomSubscriberButton').click(function() {
			var count = $(eventBox).find('#SBRandomSubscriberInput').val();
			for (var c = 0; c < count; ++c)
			{
				// Get unchecked viewer boxes and break if none exist
				var subBoxes = $(eventBox).find('#SBEventSubscriberBox input:not(:checked)');
				if (subBoxes.length == 0) { break; }

				// Select random one
				var selectIndex = Math.floor(Math.random() * subBoxes.length);
				subBoxes[selectIndex].checked = true;
			}
		});

		$(eventBox).find('#SBRandomViewerButton').click(function() {
			var count = $(eventBox).find('#SBRandomViewerInput').val();
			for (var c = 0; c < count; ++c)
			{
				// Get unchecked viewer boxes and break if none exist
				var viewerBoxes = $(eventBox).find('#SBEventViewerBox input:not(:checked)');
				if (viewerBoxes.length == 0) { break; }

				// Select random one
				var selectIndex = Math.floor(Math.random() * viewerBoxes.length);
				viewerBoxes[selectIndex].checked = true;
			}
		});

		$(eventBox).find('#SBAnnounceButton').click(function() {
			// Get selected names
			var selectedNames = [];
			$(eventBox).find('input:checked').each(function() {
				selectedNames.push(this.id.substring(19));
			});

			// Announce names in chat
			SalatBot.viewerEvent.announce(selectedNames);
		});

		$(eventBox).find('#SBInviteButton').click(function() {
			// Get selected names
			var selectedNames = [];
			$(eventBox).find('input:checked').each(function() {
				selectedNames.push(this.id.substring(19));
			});

			// Get chat room name
			var roomName = $(eventBox).find('#SBInviteRoomInput').val();

			// Invite names to chat room
			SalatBot.viewerEvent.invite(selectedNames, roomName);
		});

		// Poll
		$(settingsBox).find('#SBPollStartButton').click(function() {
			if (SalatBot.poll.isActive())
			{
				// Stop poll
				if (SalatBot.poll.stop())
				{
					// Set button value
					this.innerHTML = 'Reset poll';
				}
			}
			else if ($(settingsBox).find('#SBPollOptionsInput').is(':visible'))
			{
				// Start poll and hide input
				if (SalatBot.poll.start($(settingsBox).find('#SBPollOptionsInput').val()))
				{
					$(settingsBox).find('#SBPollOptionsInput').slideUp()
					// Show result button
					$(settingsBox).find('#SBPollResultButton').slideDown();

					// Set button value
					this.innerHTML = 'Stop poll';
				}
			}
			else
			{
				if (SalatBot.poll.reset())
				{
					// Show input and hide result button
					$(settingsBox).find('#SBPollOptionsInput').slideDown();
					$(settingsBox).find('#SBPollResultButton').slideUp();

					// Set button value
					this.innerHTML = 'Start poll';
				}
			}
		});

		$(settingsBox).find('#SBPollResultButton').hide().click(function() {
			SalatBot.poll.printResult();
		});

		/* = Filters = */
		// User commands
		$(settingsBox).find('#SBCommandsArea').change(function() {
			SalatBot.userCommands.update(this.value);
		});

		// Symbols change
		$(settingsBox).find('#SBFilterSymbMinInput, #SBFilterSymbAllowInput, #SBFilterSymbTimeInput').change(function() {
			SalatBot.filters.symbols.update(
				$(settingsBox).find('#SBFilterSymbMinInput').val(),
				$(settingsBox).find('#SBFilterSymbAllowInput').val(),
				$(settingsBox).find('#SBFilterSymbTimeInput').val()
			);
		});

		// Caps change
		$(settingsBox).find('#SBFilterCapsMinInput, #SBFilterCapsAllowInput, #SBFilterCapsTimeInput').change(function() {
			SalatBot.filters.caps.update(
				$(settingsBox).find('#SBFilterCapsMinInput').val(),
				$(settingsBox).find('#SBFilterCapsAllowInput').val(),
				$(settingsBox).find('#SBFilterCapsTimeInput').val()
			);
		});

		// Spam change
		$(settingsBox).find('#SBFilterFancySpamCheck').change(function() {
			SalatBot.filters.spam.setActive('fancyspam', this.checked);
		});

		$(settingsBox).find('#SBFilterAmenoCheck').change(function() {
			SalatBot.filters.spam.setActive('ameno', this.checked);
		});

		$(settingsBox).find('#SBFilterSwastikaCheck').change(function() {
			SalatBot.filters.spam.setActive('swastika', this.checked);
		});

		$(settingsBox).find('#SBFilterSpamTimeInput').change(function() {
			SalatBot.filters.spam.update(
				$(settingsBox).find('#SBFilterSpamTimeInput').val()
			);
		});

		// Custom change
		$(settingsBox).find('#SBFilterCustomInput').change(function() {
			SalatBot.filters.custom.setExpression(this.value);
		});

		$(settingsBox).find('#SBFilterCustomTimeInput').change(function() {
			SalatBot.filters.custom.setTimeout(this.value);
		});

		// Trigger changes to setup defaults
		// User commands
		$(settingsBox).find('#SBCommandsArea').change();

		// Chat filters
		$(settingsBox).find(
			'#SBFilterSymbMinInput, #SBFilterCapsMinInput, '+
			'#SBFilterFancySpamCheck, #SBFilterAmenoCheck, #SBFilterSwastikaCheck, #SBFilterSpamTimeInput, '+
			'#SBFilterCustomInput, #SBFilterCustomTimeInput'
		).change();
	}

	function hideEventBox()
	{
		$(eventBox).stop().animate({'left': '-'+ eventBox.clientWidth +'px'}, function() { $(this).hide(); });
	}

	// Initialize
	setupUserInterface(settingsHTML, eventHTML);
	setInputValues(inputValues);
	setupFunctionality(inputChangeCallback);

	SalatBotUI.show = function()
	{
		$('.chat-settings').append(settingsBox);
		$(settingsBox).hide().slideDown();

		$('body').append(eventBox);
		$(eventBox).hide();
	}

	SalatBotUI.hide = function()
	{
		$(settingsBox).slideUp(function() { $(this).remove(); });
		$(eventBox).remove();
	}

	// Show event box
	SalatBotUI.showEventBox = function(participants, chatNames)
	{
		// Clear and get participant boxes
		var boxResult = $(eventBox).find('#SBEventSubscriberBox, #SBEventViewerBox').empty();

		var subBox = boxResult[0];
		var viewerBox = boxResult[1];

		// Insert subscribers
		for (var s = 0; s < participants.subscribers.length; ++s)
		{
			// Get current subscriber
			var sub = participants.subscribers[s];

			// Create elements
			var checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.id = 'SBParticipantCheck_'+ sub;

			var label = document.createElement('label');
			label.htmlFor = checkbox.id;
			label.innerHTML = sub;

			var linebreak = document.createElement('br');

			// Append elements
			subBox.appendChild(checkbox);
			subBox.appendChild(label);
			subBox.appendChild(linebreak);
		}

		// Insert viewers
		for (var v = 0; v < participants.viewers.length; ++v)
		{
			// Get current subscriber
			var viewer = participants.viewers[v];

			// Create elements
			var checkbox = document.createElement('input');
			checkbox.type = 'checkbox';
			checkbox.id = 'SBParticipantCheck_'+ viewer;

			var label = document.createElement('label');
			label.htmlFor = checkbox.id;
			label.innerHTML = viewer;

			var linebreak = document.createElement('br');

			// Append elements
			viewerBox.appendChild(checkbox);
			viewerBox.appendChild(label);
			viewerBox.appendChild(linebreak);
		}

		// Insert chat room names
		var chatNameList = $(eventBox).find('#SBExistingRooms').empty();
		for (var n = 0; n < chatNames.length; ++n)
		{
			// Create new option
			var option = document.createElement('option');
			option.value = chatNames[n];

			// Append option
			chatNameList.append(option);
		}

		// Show box
		$(eventBox).stop().show().css({'left': '-'+ eventBox.clientWidth +'px'}).animate({'left': '0px'});
	}

	// Return constructed SalatBot UI
	return SalatBotUI;
}
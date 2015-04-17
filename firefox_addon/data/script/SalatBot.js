function createSalatBot(rawSettings, username, roomModel, channelName, chatController)
{
	"use strict";

	var SalatBot = {};

	// Setup settings
	var Settings = {};

	// Setup variables
	var chatSession = roomModel.instances[channelName];
	var chatRoom = chatSession.tmiRoom;

	// Update certain settings
	SalatBot.updateSettings = function(rawSettings)
	{
		for (var setting in rawSettings)
		{
			var insert = Settings;
			var settingPath = setting.split('.');
			
			// Create sub settings
			var p;
			for (p = 0; p < settingPath.length - 1; ++p)
			{
				insert[settingPath[p]] = insert[settingPath[p]] || {};
				insert = insert[settingPath[p]];
			}

			// Insert value
			insert[settingPath[p]] = rawSettings[setting];
		}
	}
	
	// Update initial settings
	SalatBot.updateSettings(rawSettings);

	// Starts with string expression
	SalatBot.StartsWithExpression = function() {
		function StartsWithListener(start)
		{
			this.start = start;
		}

		StartsWithListener.prototype.test = function(message)
		{
			return message.startsWith(this.start);
		};

		return StartsWithListener;
	}();

	// Parse expression
	SalatBot.parseExpression = function(rawExpression)
	{
		var match = rawExpression.match(/^\/(.+)\/(i?)|([^\s]+)/);

		// Get expression
		if (match[1] !== undefined)
		{
			return new RegExp(match[1], match[2]);
		}
		else
		{
			return new SalatBot.StartsWithExpression(match[3]);
		}
	};

	// Listener
	SalatBot.listener = function() {
		var Listener = {};

		// Setup variables
		var active = false;
		var listeners = [];

		Listener.getListeners = function() {return listeners;}

		// Check message and call matching listeners
		function handleMessage(message)
		{
			// Check if user message
			if (typeof message.from == 'string')
			{
				// Loop through listeners
				for (var l = 0; l < listeners.length; ++l)
				{
					// Check whether to ignore
					if (!Settings.debug)
					{
						if (message.from == username && listeners[l].ignore.indexOf('self') != -1)
						{ return; }

						for (var i = 0; i < listeners[l].ignore.length; ++i)
						{
							if (message.labels.indexOf(listeners[l].ignore[i]) != -1)
							{
								return;
							}
						}
					}

					if (listeners[l].expression.test(message.message))
					{
						listeners[l].callback(listeners[l].expression, message);
					}
				}
			}
		}

		/* = Interface = */

		// Start listening to chat
		Listener.start = function()
		{
			// Check if currently active
			if (!active)
			{
				// Start listening
				chatRoom.on('message', handleMessage);
				active = true;
				return true;
			}
			return false;
		};

		// Stop listening to chat
		Listener.stop = function()
		{
			// Check if currently active
			if (active)
			{
				// Stop listening
				chatRoom.off('message', handleMessage);
				active = false;
				return true;
			}
			return false;
		};

		// Get state
		Listener.isActive = function()
		{
			return active;
		};

		// Add new listener
		Listener.addListener = function(expression, callback, ignore)
		{
			// Default ignored tags
			ignore = ignore || [];

			// Add add listener
			listeners.push({'expression': expression, 'callback': callback, 'ignore': ignore});
		};

		// Remove listener
		Listener.removeListener = function(expression, callback)
		{
			// Loop through listeners
			for (var i = 0; i < listeners.length; ++i)
			{
				// Check for matches and remove
				var listener = listeners[i];
				if (listener.expression == expression &&
					(typeof callback == 'undefined' || callback === listener.callback))
				{
					listeners.splice(i--, 1);
					return true;
				}
			}
			return false;
		};

		// Return constructed Listener
		return Listener;
	}();

	/* == Secific Modules == */

	// Viewer event module
	SalatBot.viewerEvent = function() {
		var ViewerEvent = {};

		// Setup variables
		var active = false;
		var expression = null;
		var participants = {
			'subscribers': [],
			'viewers': []
		};

		function getAvaillableRoomNames()
		{
			// Get room names
			var roomNames = [];
			for (var r in roomModel.instances)
			{
				if (r.startsWith('_'))
				{
					roomNames.push(roomModel.instances[r].tmiRoom.displayName);
				}
			}

			// Return names
			return roomNames;
		}

		function getRoom(roomName, callback)
		{
			// Search for existing rooms
			for (var r in roomModel.instances)
			{
				var tmiRoom = roomModel.instances[r].tmiRoom;
				if (r.startsWith('_') && tmiRoom.displayName.toLowerCase() == roomName.toLowerCase())
				{
					// Focus room
					chatController.focusRoom(roomModel.findOne(tmiRoom.name));

					// Check if already entered and call back
					if (tmiRoom._roomConn._hasEntered)
					{
						callback(tmiRoom);
					}
					else
					{
						tmiRoom._events.entered.push(function() { callback(roomModel.findOne(tmiRoom.name).tmiRoom); }, undefined);
					}
					return;
				}
			}

			// Create if not found
			roomModel.createNewTmiRoom({'name': roomName, 'publicInvitesEnabled': false}).then(function (tmiRoom)
			{
			    // Focus room
			    chatController.focusRoom(roomModel.findOne(tmiRoom.name));

			    // Check if already entered and call back
				if (tmiRoom._roomConn._hasEntered)
				{
					callback(tmiRoom);
				}
				else
				{
					tmiRoom._events.entered.push(function() { callback(roomModel.findOne(tmiRoom.name).tmiRoom); }, undefined);
				}
				return;
			});
		}

		function handler(expression, message)
		{
			// Check whether subsriber or not
			if (message.labels.indexOf('subscriber') != -1)
			{
				// Add to subscribers
				participants.subscribers.push(message.from);
			}
			else
			{
				// Add to non subscribers
				participants.viewers.push(message.from);
			}
		}

		ViewerEvent.start = function(commandString)
		{
			if (SalatBot.listener.isActive() && !active && commandString.length > 0)
			{
				// Trim command string
				commandString = commandString.trim();

				try
				{
					// Parse expression
					expression = SalatBot.parseExpression(commandString);

					// Add listener
					SalatBot.listener.addListener(expression, handler);

					// Send message
					if (Settings.messages.event.start.length > 0 && expression instanceof SalatBot.StartsWithExpression)
					{
						chatRoom.sendMessage(Settings.messages.event.start.replace('${command}', commandString));
					}

					// Set active
					active = true;

					return true;
				}
				catch(e)
				{
					if (!(e instanceof SyntaxError)) { throw e; }
				}
			}
			return false;
		};

		ViewerEvent.stop = function()
		{
			if (SalatBot.listener.isActive() && active)
			{
				// Add listener
				SalatBot.listener.removeListener(expression, handler);

				// Send message
				if (Settings.messages.event.stop.length > 0 && expression instanceof SalatBot.StartsWithExpression)
				{
					chatRoom.sendMessage(Settings.messages.event.stop);
				}

				// Show event box
				SalatBotUI.showEventBox(participants, getAvaillableRoomNames());

				// Set inactive
				active = false;

				return true;
			}
			return false;
		};

		ViewerEvent.announce = function(names)
		{
			if (SalatBot.listener.isActive())
			{
				if (Settings.messages.event.result.length > 0)
				{
					chatRoom.sendMessage(Settings.messages.event.result.replace('${selected}', names.join(', ')));
				}
				return true;
			}
			return false;
		};

		ViewerEvent.invite = function(names, roomName)
		{
			if (SalatBot.listener.isActive())
			{
				getRoom(roomName, function(room) {
					for (var n = 0; n < names.length; ++n)
					{
						try
						{
							room.invite(names[n]);	
						}
						catch(e) { console.log(e); }
					}
				});
				return true;
			}
			return false;
		};

		ViewerEvent.isActive = function()
		{
			return active;
		}

		ViewerEvent.reset = function()
		{
			if (!active)
			{
				participants.subscribers = [];
				participants.viewers = [];
				return true;
			}
			return false;
		};

		// Return constructed ViewerEvent
		return ViewerEvent;
	}();

	// Poll module
	SalatBot.poll = function() {
		var Poll = {};

		// Setup variables
		var active = false;
		var expression = /^!vote\s([\w\s]+)/i;
		var options = [];
		var votes = {};

		function handler(expression, message)
		{
			// Get votes
			var rawVotes = message.message.match(expression)[1].toLowerCase().split(' ');
			var selection = [];
			var group = null;

			// Loop through raw votes
			for (var v = 0; v < rawVotes.length; ++v)
			{
				// Check if group already found
				if (group == null)
				{
					// Find right group
					for (var g = 0; g < options.length; ++g)
					{
						// Set group and vote if in group
						if (options[g].indexOf(rawVotes[v]) >= 0)
						{
							group = options[g];
							selection.push(rawVotes[v]);
							break;
						}
					}
				}
				else
				{
					// Add vote if in group
					if (group.indexOf(rawVotes[v]) >= 0)
					{
						selection.push(rawVotes[v]);
					}
				}
			}

			// Add votes
			if (selection.length > 0)
			{
				votes[message.from] = selection;
			}
		}

		function extractOptions(optionString)
		{
			// Create options array
			var options = [];

			// Split into groups
			var groups = optionString.split('|');
			for (var g = 0; g < groups.length; ++g)
			{
				var group = [];
				// Split up single options
				var opts = groups[g].split(',');
				for (var o = 0; o < opts.length; ++o)
				{
					if (opts[o].length > 0)
					{
						group.push(opts[o].toLowerCase());
					}
				}
				// Add option group if not empty
				if (group.length > 0)
				{
					options.push(group);
				}
			}
			return options;
		}

		function getResult()
		{
			// Get flat array of options
			var flatOptions = [].concat.apply([], options);

			// Setup result counter
			var results = {};
			for (var f = 0; f < flatOptions.length; ++f)
			{
				results[flatOptions[f]] = 0;
			}

			// Count votes
			for (var v in votes)
			{
				var selection = votes[v];
				for (var s = 0; s < selection.length; ++s)
				{
					results[selection[s]] += 1;
				}
			}

			return results;
		}

		// Interface
		Poll.start = function(optionString)
		{
			if (SalatBot.listener.isActive() && !active)
			{
				// Remove illegal charactars
				optionString = optionString.replace(/[^\w,|]/g, '');

				// Setup options
				options = extractOptions(optionString);

				if (options.length > 0)
				{
					// Add listener
					SalatBot.listener.addListener(expression, handler);

					// Send message
					if (Settings.messages.poll.start.length > 0)
					{
						var formattedOptions = optionString.replace(/,/g, ', ').replace(/\|/g, ' or ');
						chatRoom.sendMessage(Settings.messages.poll.start.replace('${options}', formattedOptions));
					}

					// Set active
					active = true;

					return true;
				}
			}
			return false;
		};

		Poll.stop = function()
		{
			if (SalatBot.listener.isActive() && active)
			{
				// Remove listener
				SalatBot.listener.removeListener(expression, handler);

				// Send message
				if (Settings.messages.poll.stop.length > 0)
				{
					chatRoom.sendMessage(Settings.messages.poll.stop);
				}

				// Set inactive
				active = false;

				return true;
			}
			return false;
		};

		Poll.reset = function()
		{
			if (!active)
			{
				// Reset poll data
				options = [];
				votes = {};

				return true;
			}
			return false;
		};

		Poll.printResult = function()
		{
			if (SalatBot.listener.isActive())
			{
				// Get result
				var result = getResult();

				// Generate result string
				var resultString = "";
				for (var r in result)
				{
					if (resultString != "") { resultString += ', '; }
					resultString += r +': '+ result[r];
				}

				// Print appropriate result message
				if (active)
				{
					if (Settings.messages.poll.result.length > 0)
					{
						chatRoom.sendMessage(Settings.messages.poll.interim.replace('${result}', resultString));
					}
				}
				else
				{
					if (Settings.messages.poll.result.length > 0)
					{
						chatRoom.sendMessage(Settings.messages.poll.result.replace('${result}', resultString));
					}
				}
				return true;
			}
			return false;
		};

		Poll.isActive = function()
		{
			return active;
		};

		// Return constructed Poll
		return Poll;
	}();

	// User command module
	SalatBot.userCommands = function() {
		var UserCommands = {};

		// Setup command variables
		Settings.commandvars.channel = function() {
			return chatRoom.displayName || chatRoom.name;
		};

		Settings.commandvars.time = function() {
			return new Date().toLocaleFormat('%H:%M');
		};

		Settings.commandvars.daytime = function() {
			// Get current hour
			var hour = new Date().getHours();

			// Return corresponding time of the day
			switch(true)
			{
				case (hour >= 4 && 11 > hour):
					return 'morning';
				case (hour >= 11 && 15 > hour):
					return 'noon';
				case (hour >= 15 && 18 > hour):
					return 'afternoon';
				case (hour >= 18 && 22 > hour):
					return 'evening';
				default:
					return 'night';
			}
		}

		Settings.commandvars.weekday = function() {
			return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
				[new Date().getDay()];
		};

		Settings.commandvars.date = function() {
			return new Date().toLocaleFormat("%m/%d/%y");
		};

		Settings.commandvars.year = function() {
			return new Date().getFullYear();
		};

		// Setup variables
		var commandMatcher = /^(\/.+\/i?|[^\s]+)(?:\s([0-9]+))?\s(.+)/;
		var listeners = [];

		function findListener(expression)
		{
			for (var l = 0; l < listeners.length; ++l)
			{
				if (listeners[l].expression == expression)
				{
					return listeners[l];
				}
			}
		}
		
		// Replace variables in commands
		function insertVariables(listener, message)
		{
			var answer = listener.answer;

			// Replace command variables
			for (var cv in Settings.commandvars)
			{
				// Get the current variable
				var currentVar = Settings.commandvars[cv];

				// Check if variable included
				var splitParts = answer.split('${'+ cv +'}');
				if (splitParts.length > 0)
				{
					// Get the replacement
					var replacement = null;
					if (typeof currentVar == 'string')
					{
						var options = currentVar.split('    ');
						var randIndex = Math.floor(Math.random() * options.length);
						replacement = options[randIndex];
					}
					else if (typeof currentVar == 'function')
					{
						replacement = currentVar();
					}

					// Insert replacement for variable
					answer = splitParts.join(replacement);
				}
			}

			// Replace name
			answer = answer.split('${name}').join(message.from);

			// Replace regexp variables
			if (listener.expression instanceof RegExp)
			{
				// Get expression match
				var match = message.message.match(listener.expression);

				// Loop through match groups
				for (var g = 1; g < match.length; ++g)
				{
					answer = answer.split('${'+ g +'}').join(match[g]);
				}
			}

			return answer;
		}

		function handle(expression, message)
		{
			// Get listener
			var listener = findListener(expression);

			// Get current time
			var now = new Date();

			// Check if cooldown over
			if ((now - listener.lastPost)/1000 >= listener.cooldown)
			{
				// Update last post time
				listener.lastPost = now;

				// Get and send answer
				var answer = insertVariables(listener, message);
				chatRoom.sendMessage(answer);
			}
		}

		// Interface
		UserCommands.update = function(commands)
		{
			// Remove existing listeners
			for (var l = 0; l < listeners.length; ++l)
			{
				SalatBot.listener.removeListener(listeners[l].expression);
			}
			listeners = [];

			// Get new command lines
			var lines = commands.split('\n');

			for (var l = 0; l < lines.length; ++l)
			{
				var line = lines[l].trim();

				// Check if matching command format
				var commandMatch = line.match(commandMatcher);

				if (commandMatch != null)
				{
					// Parse expression
					try
					{
						var expression = SalatBot.parseExpression(commandMatch[1]);

						// Get cooldown and answer
						var cooldown = parseInt(commandMatch[2]) || 0;
						var answer = commandMatch[3];

						// Add listener
						listeners.push({'expression': expression, 'answer': new String(answer), 'cooldown': cooldown, 'lastPost': new Date(0)});
						SalatBot.listener.addListener(expression, handle, ['self']);
					}
					catch(e)
					{
						if (!(e instanceof SyntaxError)) { throw e; }
					}
				}
			}
		}

		// Return constructed UserCommands
		return UserCommands;
	}();

	// Spam filter module
	SalatBot.filters = function() {
		var Filters = {};

		function createSimpleFilter(matchCounter)
		{
			var SimpleFilter = {};

			// Setup variables
			var listening = false;
			var min = 0, allow = 0, timeout = 1;

			// Setup listener values
			var expression = {
				'test': function (message)
				{
					if (message.length >= min)
					{
						var percentage = 100.0 * matchCounter(message) / message.length;
						return percentage > allow;
					}
					return false;
				}
			};

			function handler(expression, message)
			{
				chatRoom.sendMessage('/timeout '+ message.from +' '+ timeout);
			}

			// Interface
			SimpleFilter.update = function(newMin, newAllow, newTimeout)
			{
				// Update if valid values
				if (newMin >= 0) { min = newMin; }
				if (newAllow >= 0 && newAllow <= 100) { allow = newAllow; }
				if (newTimeout >= 1) { timeout = newTimeout; }

				// Start / stop listening
				if (allow < 100 && !listening)
				{
					SalatBot.listener.addListener(expression, handler, ['self', 'mod']);
					listening = true;
				}
				else if (allow == 100 && listening)
				{
					SalatBot.listener.removeListener(expression, handler);
					listening = false;
				}
			};

			SimpleFilter.isActive = function()
			{
				return listening;
			};

			// Return constructed SimpleFilter
			return SimpleFilter;
		}

		Filters.symbols = createSimpleFilter(function(message) {
			var matches = message.match(/([^\w\s])/g);
			return (matches == null) ? 0 : matches.length;
		});

		Filters.caps = createSimpleFilter(function(message) {
			var matches = message.match(/([A-Z])/g);
			return (matches == null) ? 0 : matches.length;
		});

		Filters.spam = function() {
			var Spam = {};

			// Setup variables
			var timeout = 1;
			var items = {
				'fancyspam': {
					'active': false,
					'expression': /ＳＰＡＭ|ＦＡＮＣＹ/
				},
				'ameno': {
					'active': false,
					'expression': /༼\s?つ\s?◕_◕\s?༽つ/
				},
				'swastika': {
					'active': false,
					'expression': /卐|卍/
				}
			};

			function handler(expression, message)
			{
				chatRoom.sendMessage('/timeout '+ message.from +' '+ timeout);
			}

			Spam.update = function(newTimeout)
			{
				if (newTimeout >= 1) { timeout = newTimeout; };
			};

			Spam.setActive = function(item, active)
			{
				if (items.hasOwnProperty(item))
				{
					if (active && !items[item].active)
					{
						SalatBot.listener.addListener(items[item].expression, handler, ['self', 'mod']);
						items[item].active = true;
						return true;
					}
					else if (!active && items[item].active)
					{
						SalatBot.listener.removeListener(items[item].expression, handler);
						items[item].active = false;
						return true;
					}
				}
				return false;
			};

			// Return constructed spam
			return Spam;
		}();

		Filters.custom = function() {
			var Custom = {};

			// Setup variables
			var timeout = 1;
			var expression = null;
			var regExpMatcher = /^\/(.*)\/(i?)$/i;

			function handler(expression, message)
			{
				chatRoom.sendMessage('/timeout '+ message.from +' '+ timeout);
			}

			Custom.setTimeout = function(newTimeout)
			{
				if (newTimeout >= 1) { timeout = newTimeout; };
			};

			Custom.setExpression = function(newExpression)
			{
				// Remove existing listener
				SalatBot.listener.removeListener(expression, handler);

				newExpression = newExpression.trim();

				// Check if not empty
				if (!newExpression.length == 0)
				{
					try
					{
						// Try to interpret as regular expression
						var regExpMatch = newExpression.match(regExpMatcher);
						if (regExpMatch != null)
						{
							// Parse regular expression
							expression = new RegExp(regExpMatch[1], regExpMatch[2]);
						}
						// Interpret as string match else
						else
						{
							expression = {
								'test': function(message) {
									return (message.indexOf(newExpression) != -1);
								}
							}
						}

						// Add listener
						SalatBot.listener.addListener(expression, handler, ['self', 'mod']);
					}
					catch(e) 
					{
						if (!(e instanceof SyntaxError)) { throw e; }
					}
				}
			};


			// Return constructed Custom
			return Custom;
		}();

		// Return constructed Filters
		return Filters;
	}();

	/* == Functionality == */

	// Start and stop
	SalatBot.start = function() { return this.listener.start(); }
	SalatBot.stop = function() { return this.listener.stop(); }

	// Return constructed SalatBot
	return SalatBot;
}


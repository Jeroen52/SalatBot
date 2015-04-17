// Verify document
if (document.body.innerHTML && unsafeWindow.Twitch.user.isLoggedIn())
{
	// Obtain the chat API
	function getSessionInfo(callback)
	{
		// Get channel name
		var channelName = window.location.pathname.match(/\/(\w+)(?:\/chat)?$/)[1];

		// Get chat session
		var roomModel = unsafeWindow.require('web-client/models/room').default;

		// Check if channel instance existing
		if (roomModel.instances.hasOwnProperty(channelName))
		{
			callback(roomModel, channelName);
		}
		else
		{
			roomModel.instances.watch(channelName, function(chan, prev, inst) {
				roomModel.instances.unwatch(channelName);
				callback(roomModel, channelName);
			});
		}
	}

	// Initialize SalatBot
	function initialize(settingsHTML, eventHTML, inputValues, settings, roomModel, channelName)
	{
		// Create SalatBot
		var controller = unsafeWindow.App.__container__.lookup('controller:chat');
		window.SalatBot = createSalatBot(settings, unsafeWindow.Twitch.user.login(), roomModel, channelName, controller);

		// Create user interface
		window.SalatBotUI = createSalatBotUI(settingsHTML, eventHTML, inputValues, function() {
			self.port.emit('setInputValue', { 'id': this.id, 'value': (this.type == 'checkbox') ? this.checked : this.value });
		});

		// Setup settings change listener
		self.port.on('updateSettings', function(settings) {
			SalatBot.updateSettings(settings);
		});

		// Show user interface
		SalatBotUI.show();
	}

	// Listen for settings box html code
	self.port.once('createSettingsBox', function(settingsHTML) {
	self.port.once('createEventBox', function(eventHTML) {
		// Listen for input values
		self.port.once('setInputValues', function(inputValues) {
			// Listen for settings
			self.port.once('setSettings', function(settings) {
				// Get room model and chat room objects and initialize the bot
				getSessionInfo(function(roomModel, channelName) {
					initialize(settingsHTML, eventHTML, inputValues, settings, roomModel, channelName);
				});
			});
		});
	});
	});
}

// Import page modification and data access API
var pageMod = require('sdk/page-mod');
var prefs = require('sdk/simple-prefs');
var stor = require('sdk/simple-storage');
var self = require('sdk/self');

// Initialize default settings
if (!prefs.prefs['initialized'])
{
	var settings = JSON.parse(self.data.load('lib/default_settings.json'));

	for (var setting in settings)
	{
		prefs.prefs[setting] = settings[setting];
	}
}

// Setup input value storage
if (!stor.storage.hasOwnProperty('inputValues'))
{
	stor.storage.inputValues = {};
}

// Create twitch chat modification
var modification = function() {
	var modification = {};

	// Specify matched URLs
	modification.include = /^http:\/\/www\.twitch\.tv\/(\w+)(?:\/chat)?$/;

	// Load script files
	modification.contentScriptFile = [
		self.data.url('lib/jquery.js'),
		self.data.url('script/SalatBot.js'),
		self.data.url('script/SalatBotUI.js'),
		self.data.url('extension.js')
	];

	// Load style files
	modification.contentStyleFile = [
		self.data.url('ui/settingsBox.css'),
		self.data.url('ui/eventBox.css')
	];

	// Setup worker script interaction
	modification.onAttach = function(worker)
	{
		// Send html settings box to worker
		worker.port.emit('createSettingsBox', self.data.load('ui/settingsBox.html'));
		worker.port.emit('createEventBox', self.data.load('ui/eventBox.html'));

		// Send input values to worker
		worker.port.emit('setInputValues', stor.storage.inputValues || {});

		// Send settings to worker
		worker.port.emit('setSettings', prefs.prefs);

		// Send settings updates to worker
		prefs.on('', function(setting) {
			worker.port.emit('updateSettings', {[setting]: prefs.prefs[setting]});
		});

		// Listen to input value changes
		worker.port.on('setInputValue', function(change) {
			stor.storage.inputValues[change.id] = change.value;
		});
	};

	// Return constructed modification
	return modification;
}();

// Add modification
pageMod.PageMod(modification);